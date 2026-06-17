import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];

const files = {
  settings: 'src/components/SettingsModal.js',
  css: 'src/components/SettingsModal.module.css',
  translations: 'src/lib/i18n/translations.js',
  page: 'src/app/(main)/page.js',
};

for (const [label, path] of Object.entries(files)) {
  if (!existsSync(join(root, path))) failures.push(`${label}: missing ${path}`);
}
if (failures.length) {
  console.error('Account Settings billing verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const settings = read(files.settings);
const css = read(files.css);
const translations = read(files.translations);
const page = read(files.page);

const expectations = [
  ['SettingsModal accepts pricing handler', settings, 'onOpenPricing'],
  ['SettingsModal reads WebWeave auth context', settings, 'useWebWeave'],
  ['SettingsModal fetches billing endpoint', settings, "fetch('/api/account/billing'"],
  ['SettingsModal renders billing section', settings, "t('settings.billing')"],
  ['SettingsModal renders current plan', settings, "t('settings.currentPlan')"],
  ['SettingsModal renders expiration date', settings, "t('settings.expirationDate')"],
  ['SettingsModal renders payment method', settings, "t('settings.paymentMethod')"],
  ['SettingsModal renders invoices', settings, "t('settings.invoices')"],
  ['Main page passes pricing handler', page, 'onOpenPricing={handleOpenPricing}'],
  ['English billing copy exists', translations, "billing: 'Billing'"],
  ['Indonesian billing copy exists', translations, 'Lihat paket'],
  ['CSS uses themed surface variable', css, 'var(--surface)'],
  ['CSS uses themed surface-2 variable', css, 'var(--surface-2)'],
  ['CSS uses themed text', css, 'color: var(--text)'],
  ['CSS uses themed muted text', css, 'color: var(--muted)'],
  ['CSS uses themed borders', css, 'var(--border)'],
  ['CSS removed old dark modal background', css, 'rgba(10, 10, 10, 0.96)'],
  ['CSS removed old dark section background', css, 'rgba(20, 20, 20, 0.6)'],
];

for (const [label, source, token] of expectations) {
  const shouldBeAbsent = label.includes('removed');
  const hasToken = source.includes(token);
  if (shouldBeAbsent ? hasToken : !hasToken) failures.push(`${label}: ${shouldBeAbsent ? 'must not include' : 'missing'} "${token}"`);
}

if (failures.length) {
  console.error('Account Settings billing verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Account Settings billing verification passed.');
