import { readFileSync } from 'node:fs';

const css = readFileSync('src/app/(main)/page.module.css', 'utf8');

const requiredSnippets = [
  '.darkMode {',
  '.lightMode {',
  '--output-bg:',
  '--output-text:',
  '--output-log-text:',
  '--output-prompt:',
  'background: var(--output-bg);',
  'color: var(--output-text);',
  'color: var(--output-log-text);',
  'color: var(--output-prompt);',
];

const missing = requiredSnippets.filter((snippet) => !css.includes(snippet));

if (missing.length > 0) {
  console.error(`Missing themed output panel CSS snippets:\n${missing.join('\n')}`);
  process.exit(1);
}

const selectorPatterns = [
  /\.console\s*{[^}]*background:\s*#050505/i,
  /\.consoleLine\s*{[^}]*color:\s*#93c5fd/i,
  /\.codeBlock\s*{[^}]*background:\s*#050505/i,
  /\.code\s*{[^}]*color:\s*#dbeafe/i,
];

const hardcodedMatches = selectorPatterns.filter((pattern) => pattern.test(css));

if (hardcodedMatches.length > 0) {
  console.error('Output panels still contain hardcoded dark-only colors.');
  process.exit(1);
}

console.log('Themed output panel CSS verified.');
