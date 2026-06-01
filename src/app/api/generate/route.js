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

// ============================================================
// Prompt Engineering
// ============================================================

function getFrameworkDetails(framework) {
  const frameworks = {
    playwright_js: {
      name: 'Playwright (JavaScript)',
      ext: 'js',
      details: `Playwright in JavaScript (Node.js, ES modules with import syntax).
Use modern locators: page.getByRole(), page.getByPlaceholder(), page.getByLabel(), page.getByText(), page.locator().
Use expect() from @playwright/test for assertions.
Structure: import { test, expect } from '@playwright/test'; test('description', async ({ page }) => { ... });`
    },
    playwright_python: {
      name: 'Playwright (Python)',
      ext: 'py',
      details: `Playwright in Python (Sync API preferred).
Use modern selectors: page.get_by_role(), page.get_by_placeholder(), page.get_by_label(), page.get_by_text(), page.locator().
Structure: from playwright.sync_api import sync_playwright; with sync_playwright() as p: browser = p.chromium.launch(); ...`
    },
    puppeteer_js: {
      name: 'Puppeteer (JavaScript)',
      ext: 'js',
      details: `Puppeteer in JavaScript (Node.js).
Use page.waitForSelector(), page.$(), page.$$(), page.evaluate(), page.type(), page.click().
Structure: import puppeteer from 'puppeteer'; const browser = await puppeteer.launch(); ...`
    },
    selenium_python: {
      name: 'Selenium (Python)',
      ext: 'py',
      details: `Selenium WebDriver in Python.
Use: from selenium import webdriver; from selenium.webdriver.common.by import By; from selenium.webdriver.support.ui import WebDriverWait; from selenium.webdriver.support import expected_conditions as EC.
Use WebDriverWait for explicit waits instead of time.sleep().`
    },
    cypress_js: {
      name: 'Cypress (JavaScript)',
      ext: 'cy.js',
      details: `Cypress in JavaScript.
Structure: describe('Test Suite', () => { it('test case', () => { cy.visit(); cy.get(); ... }); });
Use cy.get(), cy.contains(), cy.find() for selectors. Use .should() for assertions.`
    }
  };
  
  return frameworks[framework] || frameworks.playwright_js;
}

function buildSystemPrompt() {
  return `You are a world-class QA Automation Engineer. Your job is to write clean, robust, production-quality web automation scripts.

CRITICAL RULES:
1. Output ONLY the code inside a single markdown code block. No intro, no explanation, no outro.
2. Write COMPLETE, RUNNABLE scripts — include all imports, setup, actions, assertions, and teardown.
3. Choose the BEST selector strategy based on the DOM context provided:
   - Priority order: data-testid > id > name > aria-label > role+text > placeholder > CSS selector
   - NEVER use fragile selectors like long CSS class chains or XPath with positional indexes
4. Add brief inline comments explaining each step.
5. Include proper wait strategies — wait for elements to be visible/clickable before interacting.
6. Add meaningful assertions to verify the automation goal was achieved.
7. Handle common edge cases: page load waits, element visibility, popup/overlay dismissal.
8. Use try-catch or equivalent error handling for the main flow.`;
}

function buildUserPrompt(url, prompt, framework, domContext) {
  const fw = getFrameworkDetails(framework);
  
  return `## Task
Write a ${fw.name} automation script for the following:

**Target URL:** ${url}
**Automation Goal:** ${prompt}

## Framework Requirements
${fw.details}

## DOM Context
${domContext}

## Output
Provide ONLY the complete, runnable code inside a single markdown code block.`;
}

function buildDomContext(url, scrapeSuccess, interactiveData) {
  if (!scrapeSuccess || !interactiveData || !interactiveData.elements) {
    return `Note: Live DOM scraping was not possible for ${url} (bot protection or network issue).
Generate the script using common, expected selectors based on the URL and typical page structure.
Use resilient selectors and add comments noting where selectors may need adjustment.`;
  }

  const { title, headings, elements } = interactiveData;
  
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

  return `**Page Title:** "${title}"
**Page Headings:**
${headingsText}

**Interactive Elements Found (${(elements || []).length} total):**
\`\`\`
${compactElements}
\`\`\``;
}

// ============================================================
// Main API Route Handler
// ============================================================

export async function POST(req) {
  let browser = null;
  try {
    const { url, prompt, framework, apiKey, provider = 'gemini', modelId } = await req.json();

    // Validation
    if (!url) {
      return NextResponse.json({ error: 'URL is required.' }, { status: 400 });
    }
    if (!prompt) {
      return NextResponse.json({ error: 'Automation goal/prompt is required.' }, { status: 400 });
    }

    // Resolve API Key
    const activeApiKey = resolveApiKey(provider, apiKey);
    if (!activeApiKey) {
      const providerNames = { gemini: 'Gemini', openai: 'OpenAI', anthropic: 'Anthropic', openrouter: 'OpenRouter', opencode: 'OpenCode Go' };
      return NextResponse.json({ 
        error: `API Key untuk ${providerNames[provider] || provider} tidak ditemukan. Masukkan API Key di formulir atau konfigurasi .env.local di server.` 
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
    scrapeLogs.push(`Sending request to ${providerLabel[provider] || provider} API...`);
    
    const textResponse = await callAIProvider(provider, systemPrompt, userPrompt, activeApiKey, modelId);
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
      provider
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
