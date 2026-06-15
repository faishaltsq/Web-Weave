import { readFileSync } from 'node:fs';

const css = readFileSync('src/app/(main)/page.module.css', 'utf8');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getBlock = (selector) => {
  const match = css.match(new RegExp(`${escapeRegex(selector)}\\s*{[^}]*}`, 'i'));
  return match?.[0] ?? '';
};

const hasProperty = (block, property) =>
  new RegExp(`${escapeRegex(property)}\\s*:`, 'i').test(block);

const hasDeclaration = (block, property, value) =>
  new RegExp(`${escapeRegex(property)}\\s*:\\s*${escapeRegex(value)}\\s*;`, 'i').test(block);

const themeVariables = ['--output-bg', '--output-text', '--output-log-text', '--output-prompt'];

const missingThemeVariables = ['.darkMode', '.lightMode'].flatMap((selector) => {
  const block = getBlock(selector);

  if (!block) {
    return [`${selector} block`];
  }

  return themeVariables
    .filter((property) => !hasProperty(block, property))
    .map((property) => `${selector} ${property}`);
});

const selectorDeclarations = [
  ['.console', 'background', 'var(--output-bg)'],
  ['.consoleLine', 'color', 'var(--output-log-text)'],
  ['.consolePrompt', 'color', 'var(--output-prompt)'],
  ['.codeBlock', 'background', 'var(--output-bg)'],
  ['.code', 'color', 'var(--output-text)'],
  ['.codeEmptyState', 'background', 'var(--output-bg)'],
];

const missingSelectorDeclarations = selectorDeclarations.flatMap(([selector, property, value]) => {
  const block = getBlock(selector);

  if (!block) {
    return [`${selector} block`];
  }

  return hasDeclaration(block, property, value) ? [] : [`${selector} ${property}: ${value};`];
});

const missing = [...missingThemeVariables, ...missingSelectorDeclarations];

if (missing.length > 0) {
  console.error(`Missing themed output panel CSS declarations:\n${missing.join('\n')}`);
  process.exit(1);
}

const forbiddenDeclarations = [
  ['.console', 'background', '#050505'],
  ['.consoleLine', 'color', '#93c5fd'],
  ['.codeBlock', 'background', '#050505'],
  ['.code', 'color', '#dbeafe'],
];

const hardcodedMatches = forbiddenDeclarations.filter(([selector, property, value]) =>
  hasDeclaration(getBlock(selector), property, value),
);

if (hardcodedMatches.length > 0) {
  console.error('Output panels still contain hardcoded dark-only colors.');
  process.exit(1);
}

console.log('Themed output panel CSS verified.');
