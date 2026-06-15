import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const srcDir = join(process.cwd(), 'src');
const files = [];

function collectFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      collectFiles(fullPath);
      continue;
    }

    if (/\.(js|jsx|ts|tsx)$/.test(entry)) files.push(fullPath);
  }
}

collectFiles(srcDir);

const browserPopupPattern = /\b(confirm|alert|prompt)\s*\(/;
const offenders = files.filter((file) => browserPopupPattern.test(readFileSync(file, 'utf8')));

if (offenders.length) {
  console.error('Browser popup verification failed:');
  for (const file of offenders) console.error(`- ${file}`);
  process.exit(1);
}

const expectations = [
  ['ConfirmDialog component exists', 'src/components/ConfirmDialog.js', 'export default function ConfirmDialog'],
  ['ConfirmDialog styles exist', 'src/components/ConfirmDialog.module.css', '.dialog'],
  ['Pricing uses ConfirmDialog', 'src/components/PricingPage.js', '<ConfirmDialog'],
  ['Projects uses ConfirmDialog', 'src/components/ProjectsPage.js', '<ConfirmDialog'],
  ['Main app uses ConfirmDialog for chat delete', 'src/app/(main)/page.js', '<ConfirmDialog'],
  ['English confirm copy exists', 'src/lib/i18n/translations.js', 'deleteChatTitle'],
  ['Indonesian confirm copy exists', 'src/lib/i18n/translations.js', 'Hapus chat ini?'],
];

const missing = expectations.filter(([, file, token]) => !readFileSync(join(process.cwd(), file), 'utf8').includes(token));

if (missing.length) {
  console.error('Confirmation dialog verification failed:');
  for (const [label, file, token] of missing) console.error(`- ${label}: ${file} missing "${token}"`);
  process.exit(1);
}

console.log('Confirmation dialog verification passed.');
