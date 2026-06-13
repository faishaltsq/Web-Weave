import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');
const plansPath = 'src/lib/billing/plans.js';
const quotaPath = 'src/lib/billing/quota.js';

const planRequirements = {
  free: {
    monthlyGenerationLimit: 5,
    projectLimit: 1,
    midtransPrices: { monthly: 0, annual: 0 },
    checkoutEnabled: false,
    publicEnabled: true,
    allowedFrameworks: ['playwright_js'],
  },
  starter: {
    monthlyGenerationLimit: 75,
    projectLimit: 5,
    midtransPrices: { monthly: 49000, annual: 470000 },
    checkoutEnabled: true,
    publicEnabled: true,
    allowedFrameworks: ['playwright_js', 'playwright_python', 'selenium_python', 'cypress_js'],
  },
  pro: {
    monthlyGenerationLimit: 300,
    projectLimit: 25,
    midtransPrices: { monthly: 129000, annual: 1238000 },
    checkoutEnabled: true,
    publicEnabled: true,
    allowedFrameworks: ['playwright_js', 'playwright_python', 'puppeteer_js', 'selenium_python', 'cypress_js'],
  },
  team: {
    monthlyGenerationLimit: 1000,
    projectLimit: 50,
    midtransPrices: { monthly: 299000, annual: 2870000 },
    checkoutEnabled: false,
    publicEnabled: false,
    allowedFrameworks: ['playwright_js', 'playwright_python', 'puppeteer_js', 'selenium_python', 'cypress_js'],
  },
};

const helperChecks = [
  ['project limit helper exported', 'export function getProjectLimit'],
  ['allowed frameworks helper exported', 'export function getAllowedFrameworks'],
  ['framework helper exported', 'export function isFrameworkAllowedForPlan'],
];

const quotaChecks = [
  ['quota exact error exported', 'Monthly generation limit reached. Please upgrade your plan to continue.'],
  ['quota status helper exported', 'export async function getGenerationQuotaStatus'],
  ['quota assertion helper exported', 'export async function assertCanGenerate'],
  ['usage recording helper exported', 'export async function recordGenerationRequested'],
  ['usage event type centralized', "GENERATION_EVENT_TYPE = 'generation_requested'"],
  ['usage query filters positive quantities', ".gt('quantity', 0)"],
  ['usage sum ignores non-positive quantities', 'Number.isFinite(quantity) && quantity > 0'],
];

const usageRecordingChecks = [
  ['usage insert fails closed', 'if (error) throw new Error(error.message);'],
];

const generateRoutePath = 'src/app/api/generate/route.js';
const generateRouteChecks = [
  ['generate imports quota helper', "from '@/lib/billing/quota'"],
  ['generate requires auth when Supabase configured', 'Sign in required to generate automations.'],
  ['generate checks quota after validation', 'assertCanGenerate(auth, framework)'],
  ['generate records success after quality gate', 'recordGenerationRequested(auth)'],
];

const usageRoutePath = 'src/app/api/account/usage/route.js';
const usageRouteChecks = [
  ['usage route returns quota status', 'getGenerationQuotaStatus'],
];

const projectsRoutePath = 'src/app/api/projects/route.js';
const projectsRouteChecks = [
  ['projects route imports project limit helper', 'getProjectLimit'],
  ['projects route counts existing projects', ".from('projects')"],
  ['projects route returns project limit error', 'Project limit reached. Please upgrade your plan to create more projects.'],
];

const pagePath = 'src/app/page.js';
const pageCssPath = 'src/app/page.module.css';

const pageFrontendChecks = [
  ['page loads account usage API', "fetch('/api/account/usage'"],
  ['page sends auth headers to generate', "fetch('/api/generate'"],
  ['page has usage status state', 'usageStatus'],
  ['page disables exhausted generate', 'quotaExhausted'],
  ['page disables unsupported framework options', 'isFrameworkAllowed'],
];

const pageCssChecks = [
  ['page includes quota styles', '.quotaPill'],
];

const failures = [];

function findObjectBlock(text, label) {
  const match = new RegExp(`\\b${label}\\s*:\\s*{`).exec(text);
  if (!match) return null;

  const start = text.indexOf('{', match.index);
  let depth = 0;

  for (let index = start; index < text.length; index += 1) {
    if (text[index] === '{') depth += 1;
    if (text[index] === '}') depth -= 1;
    if (depth === 0) return text.slice(start, index + 1);
  }

  return null;
}

function findFunctionBlock(text, name) {
  const match = new RegExp(`export\\s+(?:async\\s+)?function\\s+${name}\\s*\\(`).exec(text);
  if (!match) return null;

  const start = text.indexOf('{', match.index);
  let depth = 0;

  for (let index = start; index < text.length; index += 1) {
    if (text[index] === '{') depth += 1;
    if (text[index] === '}') depth -= 1;
    if (depth === 0) return text.slice(start, index + 1);
  }

  return null;
}

function propertyMatchesNumber(block, property, expected) {
  return new RegExp(`\\b${property}\\s*:\\s*${expected}\\s*(?:,|})`).test(block);
}

function propertyMatchesBoolean(block, property, expected) {
  return new RegExp(`\\b${property}\\s*:\\s*${expected}\\s*(?:,|})`).test(block);
}

function extractArrayLiteral(text, name) {
  const match = new RegExp(`\\b${name}\\s*=\\s*\\[`).exec(text);
  if (!match) return null;

  const start = text.indexOf('[', match.index);
  let depth = 0;

  for (let index = start; index < text.length; index += 1) {
    if (text[index] === '[') depth += 1;
    if (text[index] === ']') depth -= 1;
    if (depth === 0) return text.slice(start, index + 1);
  }

  return null;
}

function extractPropertyValue(block, property) {
  const match = new RegExp(`\\b${property}\\s*:`).exec(block);
  if (!match) return null;

  let index = match.index + match[0].length;
  while (/\s/.test(block[index])) index += 1;

  if (block[index] === '[') {
    const start = index;
    let depth = 0;
    for (; index < block.length; index += 1) {
      if (block[index] === '[') depth += 1;
      if (block[index] === ']') depth -= 1;
      if (depth === 0) return block.slice(start, index + 1);
    }
    return null;
  }

  const identifier = /[A-Z_][A-Z0-9_]*/.exec(block.slice(index));
  return identifier?.index === 0 ? identifier[0] : null;
}

function stringTokens(value) {
  return [...value.matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]);
}

function sameTokens(actual, expected) {
  return actual.length === expected.length && expected.every((token) => actual.includes(token));
}

function resolvedFrameworkTokens(plansText, block) {
  const value = extractPropertyValue(block, 'allowedFrameworks');
  if (!value) return null;
  if (value.startsWith('[')) return stringTokens(value);

  const arrayLiteral = extractArrayLiteral(plansText, value);
  return arrayLiteral ? stringTokens(arrayLiteral) : null;
}

if (!existsSync(join(root, plansPath))) {
  failures.push(`${plansPath} missing file`);
}

const plansText = failures.length ? '' : read(plansPath);

for (const [label, token] of helperChecks) {
  if (!plansText.includes(token)) failures.push(`${label}: ${plansPath} missing "${token}"`);
}

if (!existsSync(join(root, quotaPath))) {
  failures.push(`${quotaPath} missing file`);
} else {
  const quotaText = read(quotaPath);
  for (const [label, token] of quotaChecks) {
    if (!quotaText.includes(token)) failures.push(`${label}: ${quotaPath} missing "${token}"`);
  }

  const usageRecordingBlock = findFunctionBlock(quotaText, 'recordGenerationRequested');
  if (!usageRecordingBlock) {
    failures.push(`recordGenerationRequested function missing in ${quotaPath}`);
  } else {
    for (const [label, token] of usageRecordingChecks) {
      if (!usageRecordingBlock.includes(token)) failures.push(`${label}: ${quotaPath} missing "${token}"`);
    }
  }
}

if (!existsSync(join(root, generateRoutePath))) {
  failures.push(`${generateRoutePath} missing file`);
} else {
  const routeText = read(generateRoutePath);
  for (const [label, token] of generateRouteChecks) {
    if (!routeText.includes(token)) failures.push(`${label}: ${generateRoutePath} missing "${token}"`);
  }
}

if (!existsSync(join(root, usageRoutePath))) {
  failures.push(`${usageRoutePath} missing file`);
} else {
  const usageRouteText = read(usageRoutePath);
  for (const [label, token] of usageRouteChecks) {
    if (!usageRouteText.includes(token)) failures.push(`${label}: ${usageRoutePath} missing "${token}"`);
  }
}

if (!existsSync(join(root, projectsRoutePath))) {
  failures.push(`${projectsRoutePath} missing file`);
} else {
  const projectsRouteText = read(projectsRoutePath);
  for (const [label, token] of projectsRouteChecks) {
    if (!projectsRouteText.includes(token)) failures.push(`${label}: ${projectsRoutePath} missing "${token}"`);
  }
}

for (const [planId, expected] of Object.entries(planRequirements)) {
  const block = findObjectBlock(plansText, planId);
  if (!block) {
    failures.push(`${planId} plan block missing`);
    continue;
  }

  for (const property of ['monthlyGenerationLimit', 'projectLimit']) {
    if (!propertyMatchesNumber(block, property, expected[property])) {
      failures.push(`${planId}.${property} must equal ${expected[property]}`);
    }
  }

  for (const property of ['checkoutEnabled', 'publicEnabled']) {
    if (!propertyMatchesBoolean(block, property, expected[property])) {
      failures.push(`${planId}.${property} must equal ${expected[property]}`);
    }
  }

  const priceBlock = findObjectBlock(block, 'midtransPrices');
  if (!priceBlock) {
    failures.push(`${planId}.midtransPrices block missing`);
  } else {
    for (const [cycle, price] of Object.entries(expected.midtransPrices)) {
      if (!propertyMatchesNumber(priceBlock, cycle, price)) {
        failures.push(`${planId}.midtransPrices.${cycle} must equal ${price}`);
      }
    }
  }

  const frameworks = resolvedFrameworkTokens(plansText, block);
  if (!frameworks) {
    failures.push(`${planId}.allowedFrameworks missing or unresolved`);
  } else if (!sameTokens(frameworks, expected.allowedFrameworks)) {
    failures.push(`${planId}.allowedFrameworks must equal ${expected.allowedFrameworks.join(', ')}`);
  }
}

const unlimitedGeneration = /monthlyGenerationLimit:\s*(Infinity|null|undefined)|unlimited generations/i.test(plansText);
if (unlimitedGeneration) failures.push('monthly generation must not be unlimited');

if (!existsSync(join(root, pagePath))) {
  failures.push(`${pagePath} missing file`);
} else {
  const pageText = read(pagePath);
  for (const [label, token] of pageFrontendChecks) {
    if (!pageText.includes(token)) failures.push(`${label}: ${pagePath} missing "${token}"`);
  }
}

if (!existsSync(join(root, pageCssPath))) {
  failures.push(`${pageCssPath} missing file`);
} else {
  const pageCssText = read(pageCssPath);
  for (const [label, token] of pageCssChecks) {
    if (!pageCssText.includes(token)) failures.push(`${label}: ${pageCssPath} missing "${token}"`);
  }
}

const pricingPagePath = 'src/components/PricingPage.js';
const pricingPageChecks = [
  ['pricing free quota', "5 generations/bulan"],
  ['pricing starter quota', "75 generations/bulan"],
  ['pricing pro quota', "300 generations/bulan"],
  ['pricing team quota', "1.000 generations/bulan"],
  ['pricing pro projects not unlimited', "25 project"],
];

const readmePath = 'README.md';
const readmeChecks = [
  ['readme pricing quota section', "Pricing and Quota"],
  ['readme mentions Midtrans active', "Midtrans"],
];

const billingVerifierPath = 'scripts/verify-billing-integration.mjs';
const billingVerifierChecks = [
  ['billing verification starter updated', "Starter limit 75"],
  ['billing verification pro updated', "Pro limit 300"],
];

if (!existsSync(join(root, pricingPagePath))) {
  failures.push(`${pricingPagePath} missing file`);
} else {
  const pricingPageText = read(pricingPagePath);
  for (const [label, token] of pricingPageChecks) {
    if (!pricingPageText.includes(token)) failures.push(`${label}: ${pricingPagePath} missing "${token}"`);
  }
}

if (!existsSync(join(root, readmePath))) {
  failures.push(`${readmePath} missing file`);
} else {
  const readmeText = read(readmePath);
  for (const [label, token] of readmeChecks) {
    if (!readmeText.includes(token)) failures.push(`${label}: ${readmePath} missing "${token}"`);
  }
}

if (!existsSync(join(root, billingVerifierPath))) {
  failures.push(`${billingVerifierPath} missing file`);
} else {
  const billingVerifierText = read(billingVerifierPath);
  for (const [label, token] of billingVerifierChecks) {
    if (!billingVerifierText.includes(token)) failures.push(`${label}: ${billingVerifierPath} missing "${token}"`);
  }
}

if (failures.length) {
  console.error('SaaS pricing/quota verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('SaaS pricing/quota verification passed.');
