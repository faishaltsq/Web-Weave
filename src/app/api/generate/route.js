import { NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

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
      const dataTestId = el.getAttribute('data-testid') || el.getAttribute('data-test-id') || el.getAttribute('data-cy') || '';
      
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
      if (dataTestId) elementInfo.attributes.dataTestId = dataTestId;
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
   b) If no id/name exists: use aria-label or data-testid from DOM
   c) Last resort ONLY: use placeholder/text matching

2. NAVIGATION STRATEGY:
   - NEVER use wait_until='networkidle' — it will timeout on production sites
   - Use wait_until='domcontentloaded' or omit it entirely
   - Add retry loop (2-3 attempts) for page.goto() timeouts on slow sites
   - After navigation: wait for a SPECIFIC element from DOM context, not generic selectors

3. CODE STRUCTURE:
   - Output ONLY a single markdown code block ```. No explanations.
   - Write COMPLETE standalone scripts with imports, setup, actions, teardown
   - Include try/catch error handling + error screenshot
   - Use headless browser (headless=True/true)

4. INTERACTIONS:
   - Wait for element to be visible/clickable BEFORE interacting
   - Use element-specific waits (waitForSelector) over time.sleep()
   - After form submission: wait for URL change or next page element

5. ASSERTIONS:
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
    let key = `<${el.tag}${a.id ? ' id="'+a.id+'"' : ''}${a.type ? ' type="'+a.type+'"' : ''}${a.name ? ' name="'+a.name+'"' : ''}${a.placeholder ? ' placeholder="'+a.placeholder+'"' : ''}>`;
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
    if (attrs.dataTestId) parts.push(`data-testid="${attrs.dataTestId}"`);
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
    const { url, prompt, framework, provider: userProvider, modelId: userModelId } = await req.json();

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

    // Validation
    if (!url) {
      return NextResponse.json({ error: 'URL is required.' }, { status: 400 });
    }
    if (!prompt) {
      return NextResponse.json({ error: 'Automation goal/prompt is required.' }, { status: 400 });
    }

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
      
      scrapeLogs.push(`Navigating to: ${url}...`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Wait a bit for dynamic content to render
      await page.waitForTimeout(1500);
      scrapeLogs.push('Page loaded. Extracting interactive DOM elements...');
      
      interactiveData = await page.evaluate(getInteractiveElementsJS());
      
      if (interactiveData && interactiveData.elements) {
        pageTitle = interactiveData.title || '';
        scrapeLogs.push(`Scraped successfully! Found ${interactiveData.elements.length} interactive elements.`);
        scrapeSuccess = true;
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
    const domContext = buildDomContext(url, scrapeSuccess, interactiveData);
    const userPrompt = buildUserPrompt(url, prompt, framework, domContext);

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
      provider: activeProvider
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
