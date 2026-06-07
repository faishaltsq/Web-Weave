import { NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import dns from 'dns/promises';
import net from 'net';

const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_URL_LENGTH = 2048;
const MAX_PROMPT_LENGTH = 4000;
const MAX_DOM_CONTEXT_LENGTH = 14000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const rateLimitStore = new Map();

function getClientId(req) {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

function checkRateLimit(clientId) {
  const now = Date.now();
  const current = rateLimitStore.get(clientId);

  if (!current || now > current.resetAt) {
    rateLimitStore.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }

  current.count += 1;
  if (current.count > RATE_LIMIT_MAX_REQUESTS) {
    return Math.ceil((current.resetAt - now) / 1000);
  }

  return null;
}

function isPrivateIPv4(address) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some(part => Number.isNaN(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIPv6(address) {
  const normalized = address.toLowerCase();
  return (
    normalized === '::1' ||
    normalized === '::' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80') ||
    normalized.startsWith('::ffff:127.') ||
    normalized.startsWith('::ffff:10.') ||
    normalized.startsWith('::ffff:192.168.') ||
    normalized.startsWith('::ffff:169.254.')
  );
}

function isBlockedIPAddress(address) {
  const ipVersion = net.isIP(address);
  if (ipVersion === 4) return isPrivateIPv4(address);
  if (ipVersion === 6) return isPrivateIPv6(address);
  return true;
}

async function validateTargetUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('URL is required.');
  }

  const normalizedUrl = rawUrl.trim();
  const urlWithProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(normalizedUrl)
    ? normalizedUrl
    : `https://${normalizedUrl}`;

  if (urlWithProtocol.length > MAX_URL_LENGTH) {
    throw new Error(`URL is too long. Max ${MAX_URL_LENGTH} characters.`);
  }

  let parsed;
  try {
    parsed = new URL(urlWithProtocol);
  } catch {
    throw new Error('URL is invalid. Use a domain like example.com or a full URL like https://example.com.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https URLs are allowed.');
  }

  if (parsed.username || parsed.password) {
    throw new Error('URLs with embedded credentials are not allowed.');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new Error('Local or private hostnames are not allowed.');
  }

  if (hostname === 'metadata.google.internal') {
    throw new Error('Cloud metadata hosts are not allowed.');
  }

  if (net.isIP(hostname)) {
    if (isBlockedIPAddress(hostname)) {
      throw new Error('Private, local, or reserved IP addresses are not allowed.');
    }
    return parsed.toString();
  }

  let records;
  try {
    records = await dns.lookup(hostname, { all: true });
  } catch {
    throw new Error('Target hostname could not be resolved.');
  }

  if (!records.length || records.some(record => isBlockedIPAddress(record.address))) {
    throw new Error('Target resolves to a private, local, or reserved IP address.');
  }

  return parsed.toString();
}

function validatePrompt(prompt) {
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('Automation goal/prompt is required.');
  }

  const trimmed = prompt.trim();
  if (trimmed.length > MAX_PROMPT_LENGTH) {
    throw new Error(`Prompt is too long. Max ${MAX_PROMPT_LENGTH} characters.`);
  }

  return trimmed;
}

function limitText(value, maxLength) {
  if (!value || value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}\n\n[Truncated for safety and token limits]`;
}

// ============================================================
// DOM Extraction Script — runs inside the headless browser
// ============================================================
function getInteractiveElementsJS() {
  return `(() => {
    const elements = [];
    
    function findLabel(el) {
      if (el.id) {
        const label = document.querySelector('label[for="' + el.id + '"]');
        if (label) return label.innerText.trim();
      }
      const parentLabel = el.closest('label');
      if (parentLabel) return parentLabel.innerText.trim();
      return el.getAttribute('aria-label') || el.getAttribute('placeholder') || '';
    }

    const selectors = 'input, select, textarea, button, a, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [tabindex="0"]';
    const rawElements = document.querySelectorAll(selectors);
    
    rawElements.forEach((el, index) => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || el.offsetWidth === 0 || el.offsetHeight === 0) {
        return;
      }
      
      const tag = el.tagName.toLowerCase();
      const type = el.getAttribute('type') || '';
      const id = el.getAttribute('id') || '';
      const name = el.getAttribute('name') || '';
      const placeholder = el.getAttribute('placeholder') || '';
      const text = el.innerText ? el.innerText.trim().substring(0, 100) : '';
      const role = el.getAttribute('role') || '';
      const ariaLabel = el.getAttribute('aria-label') || '';
      const href = tag === 'a' ? (el.getAttribute('href') || '') : '';
      const testAttrNames = ['data-testid', 'data-test-id', 'data-test', 'data-cy'];
      const dataTestAttrName = testAttrNames.find(attr => el.getAttribute(attr));
      const dataTestId = dataTestAttrName ? el.getAttribute(dataTestAttrName) : '';
      const className = el.getAttribute('class') || '';
      
      const form = el.closest('form');
      const formId = form ? (form.getAttribute('id') || form.getAttribute('name') || form.getAttribute('action') || 'form') : '';
      
      const elementInfo = {
        index,
        tag,
        attributes: {}
      };

      if (text) elementInfo.text = text;
      if (type) elementInfo.attributes.type = type;
      if (id) elementInfo.attributes.id = id;
      if (name) elementInfo.attributes.name = name;
      if (placeholder) elementInfo.attributes.placeholder = placeholder;
      if (role) elementInfo.attributes.role = role;
      if (ariaLabel) elementInfo.attributes.ariaLabel = ariaLabel;
      if (href) elementInfo.attributes.href = href;
      if (dataTestId) {
        elementInfo.attributes.dataTestId = dataTestId;
        elementInfo.attributes.dataTestAttrName = dataTestAttrName;
      }
      if (className) elementInfo.attributes.className = className.substring(0, 120);
      if (formId) elementInfo.formContext = formId;

      if (['input', 'textarea', 'select'].includes(tag)) {
        const labelText = findLabel(el);
        if (labelText) elementInfo.labelText = labelText;
        
        if (tag === 'select') {
          const options = Array.from(el.options).slice(0, 10).map(o => ({
            value: o.value,
            text: o.text.trim()
          }));
          elementInfo.options = options;
        }
      }

      elements.push(elementInfo);
    });

    // Also capture page structure info
    const headings = Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 10).map(h => ({
      tag: h.tagName.toLowerCase(),
      text: h.innerText.trim().substring(0, 100)
    }));

    return {
      title: document.title,
      url: window.location.href,
      headings,
      elements: elements.slice(0, 150)
    };
  })()`;
}

// ============================================================
// AI Provider Implementations
// ============================================================

async function callGemini(systemPrompt, userPrompt, apiKey, modelId) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: modelId || 'gemini-2.0-flash',
    systemInstruction: systemPrompt
  });
  const result = await model.generateContent(userPrompt);
  return result.response.text();
}

async function callOpenAI(systemPrompt, userPrompt, apiKey, modelId) {
  const openai = new OpenAI({ apiKey });
  const modelName = modelId || 'gpt-5.4';
  const isReasoning = modelName.startsWith('o1') || modelName.startsWith('o3') || modelName.startsWith('o4');
  
  const payload = {
    model: modelName,
    messages: [
      { role: isReasoning ? 'developer' : 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  };
  
  if (isReasoning) {
    payload.max_completion_tokens = 4096;
  } else {
    payload.temperature = 0.2;
    payload.max_tokens = 4096;
  }
  
  const response = await openai.chat.completions.create(payload);
  return response.choices[0].message.content;
}

async function callAnthropic(systemPrompt, userPrompt, apiKey, modelId) {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: modelId || 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt }
    ]
  });
  return response.content[0].text;
}

async function callOpenRouter(systemPrompt, userPrompt, apiKey, modelId) {
  const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': 'https://webweave.app',
      'X-Title': 'WebWeave'
    }
  });
  const response = await openai.chat.completions.create({
    model: modelId || 'google/gemini-2.0-flash-001',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.2,
    max_tokens: 4096
  });
  return response.choices[0].message.content;
}

async function callOpenCodeGo(systemPrompt, userPrompt, apiKey, modelId) {
  const openai = new OpenAI({
    baseURL: 'https://opencode.ai/zen/go/v1',
    apiKey
  });
  const response = await openai.chat.completions.create({
    model: modelId || 'deepseek-v4-flash',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.2,
    max_tokens: 4096
  });
  return response.choices[0].message.content;
}

// Provider router — dispatches to the correct AI provider
async function callAIProvider(provider, systemPrompt, userPrompt, apiKey, modelId) {
  switch (provider) {
    case 'gemini':
      return callGemini(systemPrompt, userPrompt, apiKey, modelId);
    case 'openai':
      return callOpenAI(systemPrompt, userPrompt, apiKey, modelId);
    case 'anthropic':
      return callAnthropic(systemPrompt, userPrompt, apiKey, modelId);
    case 'openrouter':
      return callOpenRouter(systemPrompt, userPrompt, apiKey, modelId);
    case 'opencode':
      return callOpenCodeGo(systemPrompt, userPrompt, apiKey, modelId);
    default:
      throw new Error(`Provider "${provider}" tidak didukung. Gunakan: gemini, openai, anthropic, openrouter, atau opencode.`);
  }
}

// Resolve API key: user-provided > env variable
function resolveApiKey(provider, userKey) {
  if (userKey) return userKey;
  
  const envMapping = {
    gemini: process.env.GEMINI_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
    opencode: process.env.OPENCODE_API_KEY
  };
  
  return envMapping[provider] || null;
}

// Auto-detect provider based on configured env keys (priority order)
function autoDetectProvider() {
  if (process.env.OPENCODE_API_KEY) return 'opencode';
  if (process.env.OPENROUTER_API_KEY) return 'openrouter';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  return null;
}

const PROVIDER_DEFAULTS = {
  gemini: { provider: 'gemini', modelId: 'gemini-2.0-flash' },
  openai: { provider: 'openai', modelId: 'gpt-5.4' },
  anthropic: { provider: 'anthropic', modelId: 'claude-opus-4-8' },
  openrouter: { provider: 'openrouter', modelId: 'google/gemini-2.0-flash-001' },
  opencode: { provider: 'opencode', modelId: 'deepseek-v4-flash' }
};

// ============================================================
// Prompt Engineering
// ============================================================

function getFrameworkDetails(framework) {
  const frameworks = {
    playwright_js: {
      name: 'Playwright (JavaScript)',
      ext: 'js',
      details: `Playwright in JavaScript — standalone script (NOT @playwright/test runner).
Use: const { chromium } = require('playwright'); browser = await chromium.launch(); page = await browser.newPage();
Selectors: USE ID/name from DOM FIRST. page.fill('#exactId', val) > page.locator('#id') > page.getByRole() > page.getByPlaceholder().
Validation: Create helper functions like waitVisible(selector, label), clickSafe(selector, label), fillSafe(selector, value, label). Each helper MUST check count/visibility before action and throw a clear error if not found.
Fallbacks: For important actions, define candidate selectors array and validate in order before using. Never click an unvalidated selector.
Navigation: page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }). Never use 'networkidle'.
Wait: await page.waitForSelector('#id', { state: 'visible' }) then interact. Avoid page.waitForTimeout() when possible.
Assert: use if/throw for assertions (not expect from @playwright/test).
Structure: (async () => { try { ... } catch(e) { console.error(e); } finally { await browser.close(); } })();`
    },
    playwright_python: {
      name: 'Playwright (Python)',
      ext: 'py',
      details: `Playwright in Python — standalone script (NOT pytest).
Use: from playwright.sync_api import sync_playwright; with sync_playwright() as p: browser = p.chromium.launch()
Selectors: USE ID/name from DOM FIRST. page.fill('#exactId', val) > page.locator('#id') > page.get_by_role() > page.get_by_placeholder().
Python API syntax: locator.first is a property, NOT a function. Use locator.first.click(), locator.first.fill(), locator.first.wait_for(). Never write locator.first().
Validation: Create helper functions like wait_visible(page, selector, label), click_safe(page, selector, label), fill_safe(page, selector, value, label). Each helper MUST check count/visibility before action and raise a clear error if not found.
Fallbacks: For important actions, define candidate selectors list and validate in order before using. Never click an unvalidated selector.
Navigation: page.goto(url, timeout=120000). Never use wait_until='networkidle'. Use wait_until='commit' or omit it.
Wait: page.wait_for_selector('#id', state='visible') then page.fill('#id', val). Avoid page.wait_for_timeout().
Assert: use assert or if/raise for assertions.
Structure: def main(): try: ... except Exception as e: print(e) finally: browser.close()`
    },
    puppeteer_js: {
      name: 'Puppeteer (JavaScript)',
      ext: 'js',
      details: `Puppeteer in JavaScript.
Selectors: USE ID from DOM FIRST. page.type('#id', val) > page.$('#id').
Navigation: page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }). Never use 'networkidle'.
Wait: await page.waitForSelector('#id') before interacting.`
    },
    selenium_python: {
      name: 'Selenium (Python)',
      ext: 'py',
      details: `Selenium WebDriver in Python.
Selectors: USE ID from DOM FIRST. driver.find_element(By.ID, 'exactId').
Navigation: driver.get(url). driver.set_page_load_timeout(60).
Wait: WebDriverWait(driver, 30).until(EC.presence_of_element_located((By.ID, 'id'))).
Always use explicit waits (WebDriverWait) over time.sleep().`
    },
    cypress_js: {
      name: 'Cypress (JavaScript)',
      ext: 'cy.js',
      details: `Cypress in JavaScript.
Selectors: USE ID from DOM FIRST. cy.get('#id') > cy.contains().
Navigation: cy.visit(url, { timeout: 60000 }).
Wait: cy.get('#id', { timeout: 30000 }).should('be.visible').`
    }
  };
  
  return frameworks[framework] || frameworks.playwright_js;
}

function buildSystemPrompt() {
  return `You are a world-class QA Automation Engineer. Write clean, robust automation scripts.

CRITICAL RULES — failure to follow = broken script:

1. SELECTOR STRATEGY (strict priority):
   a) MANDATORY: Use EXACT id/name values from the provided DOM context when they exist
      Example: DOM shows id="email" -> use page.fill('#email', val) NOT page.getByPlaceholder()
   b) If no id/name exists: use data-testid/data-test or aria-label from DOM
   c) Last resort ONLY: use placeholder/text matching

2. LOCATOR VALIDATION (mandatory):
   - Every locator used for click/fill/assert MUST be validated before action.
   - Add reusable helper functions in the generated script:
     JS: resolveLocator(page, candidates, label), clickSafe(...), fillSafe(...)
     Python: resolve_locator(page, candidates, label), click_safe(...), fill_safe(...)
   - Each helper must try candidate selectors in order, check count > 0, wait until visible, then act.
   - If no candidate works, throw/raise clear error listing the label and candidates.
   - Do NOT use raw page.click/page.fill directly outside helper functions.
   - For assertions, validate expected element/text/URL and print proof.

3. REPEATED ACTIONS / DYNAMIC LISTS:
   - If action repeats over a changing list (example: click all "Add to cart" buttons where clicked buttons become "Remove"), DO NOT use for i in range(initial_count) with nth(i).
   - Use a while loop that repeatedly clicks the first currently visible matching button until none remain, or collect stable selectors from data-test/id before clicking.
   - After repeated actions, validate result count or state (cart badge count, selected items count, row count, etc.).

4. NAVIGATION STRATEGY:
   - NEVER use wait_until='networkidle' — it will timeout on production sites
   - Use wait_until='domcontentloaded' or omit it entirely
   - Add retry loop (2-3 attempts) for page.goto() timeouts on slow sites
   - After navigation: wait for a SPECIFIC element from DOM context, not generic selectors

5. CODE STRUCTURE:
   - Output ONLY a single markdown code block \`\`\`. No explanations.
   - Write COMPLETE standalone scripts with imports, setup, actions, teardown
   - Include try/catch error handling + error screenshot
   - Use headless browser (headless=True/true)

6. INTERACTIONS:
   - Wait for element to be visible/clickable BEFORE interacting
   - Use element-specific waits (waitForSelector) over time.sleep()
   - After form submission: wait for URL change or next page element

7. ASSERTIONS:
   - Verify each step succeeded (element found, page loaded correctly)
   - After login: verify user reached the expected page (URL contains /home, /dashboard, etc.)
   - Extract and display relevant page data as proof the script worked`;
}

function buildUserPrompt(url, prompt, framework, domContext) {
  const fw = getFrameworkDetails(framework);
  
  return `## Task
Write a ${fw.name} automation script.

**Target URL:** ${url}
**Automation Goal:** ${prompt}

## Critical Navigation Notes
- Use EXACT id/name selectors from the DOM context below
- Validate every locator before click/fill/assert; include helper functions and candidate selector fallback lists
- For repeated buttons/items that change state after click, click the first current match until no matches remain, then validate count/state
- Add retry for page.goto() (sites may be slow)
- After login/submit: wait for URL change, not just time.sleep()
- Watch for redirects to intermediate pages (e.g. /select-company, /choose-role)

## Framework Requirements
${fw.details}

## DOM Context
${domContext}

## Output
Provide ONLY the complete, runnable code inside a single markdown code block.`;
}

function buildDomContext(url, scrapeSuccess, interactiveData) {
  if (!scrapeSuccess || !interactiveData || !interactiveData.elements) {
    return `Note: Live DOM scraping was not possible for ${url}.
Generate using resilient selectors. Prefer id/name-based selectors. Add comments where selectors may need adjustment.`;
  }

  const { title, headings, elements } = interactiveData;

  // Extract KEY elements (inputs with id, submit buttons, forms)
  const keyElements = (elements || []).filter(el => {
    const attrs = el.attributes || {};
    const isInput = ['input', 'textarea', 'select'].includes(el.tag);
    const isButton = el.tag === 'button' || (el.attributes || {}).role === 'button';
    const hasId = attrs.id;
    return (isInput && hasId) || (isButton && (attrs.type === 'submit' || (el.text && /sign|login|submit|continue/i.test(el.text))));
  }).map(el => {
    const a = el.attributes || {};
    let key = `<${el.tag}${a.id ? ' id="'+a.id+'"' : ''}${a.type ? ' type="'+a.type+'"' : ''}${a.name ? ' name="'+a.name+'"' : ''}${a.placeholder ? ' placeholder="'+a.placeholder+'"' : ''}${a.dataTestId ? ' '+(a.dataTestAttrName || 'data-testid')+'="'+a.dataTestId+'"' : ''}>`;
    if (el.text) key += ` "${el.text}"`;
    if (el.labelText) key += ` [label: ${el.labelText}]`;
    return key;
  });

  // Compact element representation to save tokens
  const compactElements = (elements || []).map(el => {
    const parts = [`<${el.tag}`];
    const attrs = el.attributes || {};
    if (attrs.type) parts.push(`type="${attrs.type}"`);
    if (attrs.id) parts.push(`id="${attrs.id}"`);
    if (attrs.name) parts.push(`name="${attrs.name}"`);
    if (attrs.placeholder) parts.push(`placeholder="${attrs.placeholder}"`);
    if (attrs.role) parts.push(`role="${attrs.role}"`);
    if (attrs.ariaLabel) parts.push(`aria-label="${attrs.ariaLabel}"`);
    if (attrs.dataTestId) parts.push(`${attrs.dataTestAttrName || 'data-testid'}="${attrs.dataTestId}"`);
    if (attrs.className) parts.push(`class="${attrs.className}"`);
    if (attrs.href) parts.push(`href="${attrs.href}"`);
    parts.push('>');
    if (el.text) parts.push(el.text);
    if (el.labelText) parts.push(`[label: ${el.labelText}]`);
    if (el.formContext) parts.push(`[form: ${el.formContext}]`);
    if (el.options) parts.push(`[options: ${el.options.map(o => o.text).join(', ')}]`);
    return parts.join(' ');
  }).join('\n');

  const headingsText = headings && headings.length > 0
    ? headings.map(h => `${h.tag}: ${h.text}`).join('\n')
    : 'No headings found';

  let result = `**Page Title:** "${title}"\n`;
  if (headingsText) result += `**Headings:**\n${headingsText}\n\n`;
  if (keyElements.length > 0) {
    result += `**KEY ELEMENTS (use these exact selectors):**\n`;
    keyElements.forEach(ke => { result += `- ${ke}\n`; });
    result += '\n';
  }
  result += `**All Interactive Elements (${(elements || []).length}):**\n\`\`\`\n${compactElements}\n\`\`\``;
  return result;
}

// ============================================================
// Main API Route Handler
// ============================================================

export async function POST(req) {
  let browser = null;
  try {
    const retryAfter = checkRateLimit(getClientId(req));
    if (retryAfter) {
      return NextResponse.json({
        error: `Rate limit reached. Try again in ${retryAfter} seconds.`
      }, {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) }
      });
    }

    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({
        error: `Request body is too large. Max ${MAX_REQUEST_BYTES} bytes.`
      }, { status: 413 });
    }

    const { url, prompt, framework, provider: userProvider, modelId: userModelId } = await req.json();

    let safeUrl;
    let safePrompt;
    try {
      safeUrl = await validateTargetUrl(url);
      safePrompt = validatePrompt(prompt);
    } catch (validationError) {
      return NextResponse.json({ error: validationError.message }, { status: 400 });
    }

    // Auto-detect provider from server env keys (user can override via request)
    const detected = autoDetectProvider();
    if (!detected && !userProvider) {
      return NextResponse.json({ 
        error: 'No AI provider configured. Set API keys in .env.local' 
      }, { status: 500 });
    }

    const activeProvider = userProvider || detected;
    const { modelId } = userModelId 
      ? { modelId: userModelId } 
      : (PROVIDER_DEFAULTS[activeProvider] || { modelId: null });
    const activeModelId = modelId;

    // Resolve API Key
    const activeApiKey = resolveApiKey(activeProvider, undefined);
    if (!activeApiKey) {
      const providerNames = { gemini: 'Gemini', openai: 'OpenAI', anthropic: 'Anthropic', openrouter: 'OpenRouter', opencode: 'OpenCode Go' };
      return NextResponse.json({ 
        error: `API Key untuk ${providerNames[activeProvider] || activeProvider} tidak dikonfigurasi di server. Hubungi administrator.` 
      }, { status: 400 });
    }

    let pageTitle = '';
    let interactiveData = null;
    let scrapeLogs = [];
    let scrapeSuccess = false;
    let browserPreview = null;

    // ── Phase 1: DOM Scraping with Playwright ──
    try {
      scrapeLogs.push('Launching headless browser...');
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
      });
      const page = await context.newPage();
      
      scrapeLogs.push(`Navigating to: ${safeUrl}...`);
      await page.goto(safeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Wait a bit for dynamic content to render
      await page.waitForTimeout(1500);
      scrapeLogs.push('Page loaded. Extracting interactive DOM elements...');
      
      interactiveData = await page.evaluate(getInteractiveElementsJS());
      
      if (interactiveData && interactiveData.elements) {
        pageTitle = interactiveData.title || '';
        scrapeLogs.push(`Scraped successfully! Found ${interactiveData.elements.length} interactive elements.`);
        scrapeSuccess = true;

        await page.evaluate(() => {
          const selectors = 'input, select, textarea, button, a, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [tabindex="0"]';
          document.querySelectorAll(selectors).forEach((el) => {
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || el.offsetWidth === 0 || el.offsetHeight === 0) return;
            el.style.outline = '2px solid #8b5cf6';
            el.style.outlineOffset = '2px';
            el.style.boxShadow = '0 0 0 4px rgba(139, 92, 246, 0.18)';
          });
        });

        const screenshot = await page.screenshot({ type: 'jpeg', quality: 72, fullPage: false });
        browserPreview = `data:image/jpeg;base64,${screenshot.toString('base64')}`;
        scrapeLogs.push('Browser preview captured with locator highlights.');
      } else {
        scrapeLogs.push('Warning: DOM extraction returned empty data. Falling back to generic generation.');
      }
    } catch (scrapeError) {
      console.error('Scrape error:', scrapeError);
      scrapeLogs.push(`Warning: Scraping failed (${scrapeError.message}). Falling back to generic code generation.`);
    } finally {
      if (browser) {
        await browser.close();
        browser = null;
      }
    }

    // ── Phase 2: AI Code Generation ──
    const systemPrompt = buildSystemPrompt();
    const domContext = limitText(buildDomContext(safeUrl, scrapeSuccess, interactiveData), MAX_DOM_CONTEXT_LENGTH);
    const userPrompt = buildUserPrompt(safeUrl, safePrompt, framework, domContext);

    const providerLabel = { gemini: 'Gemini', openai: 'OpenAI', anthropic: 'Claude', openrouter: 'OpenRouter', opencode: 'OpenCode Go' };
    scrapeLogs.push(`Sending request to ${providerLabel[activeProvider] || activeProvider} API...`);
    
    const textResponse = await callAIProvider(activeProvider, systemPrompt, userPrompt, activeApiKey, activeModelId);
    scrapeLogs.push('Code generated successfully!');

    // ── Phase 3: Extract code block from response ──
    let generatedCode = textResponse;
    const codeBlockRegex = /```[a-zA-Z0-9+#_-]*\n([\s\S]*?)```/g;
    const match = codeBlockRegex.exec(textResponse);
    if (match && match[1]) {
      generatedCode = match[1].trim();
    }

    const fw = getFrameworkDetails(framework);

    return NextResponse.json({
      success: true,
      title: pageTitle || 'Target Site',
      code: generatedCode,
      fileExtension: fw.ext,
      logs: scrapeLogs,
      provider: activeProvider,
      browserPreview
    });

  } catch (error) {
    console.error('API Router Error:', error);
    
    // Provide helpful error messages per provider
    let errorMessage = error.message;
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('invalid')) {
      errorMessage = 'API Key tidak valid atau telah expired. Periksa kembali API Key Anda.';
    } else if (errorMessage.includes('429') || errorMessage.includes('rate') || errorMessage.includes('quota')) {
      errorMessage = 'Rate limit/quota tercapai. Tunggu beberapa saat atau upgrade plan API Anda.';
    } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      errorMessage = 'Akses ditolak. Pastikan API Key memiliki permission yang benar.';
    }
    
    return NextResponse.json({ 
      error: `Gagal memproses request: ${errorMessage}` 
    }, { status: 500 });
  }
}
