import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];

const files = {
  page: 'src/app/(main)/page.js',
  plans: 'src/lib/billing/plans.js',
  translations: 'src/lib/i18n/translations.js',
  scriptsPage: 'src/components/ScriptsPage.js',
  scriptsCss: 'src/components/ScriptsPage.module.css',
};

for (const [label, path] of Object.entries(files)) {
  if (!existsSync(join(root, path))) failures.push(`${label}: missing ${path}`);
}

const page = existsSync(join(root, files.page)) ? read(files.page) : '';
const plans = existsSync(join(root, files.plans)) ? read(files.plans) : '';
const translations = existsSync(join(root, files.translations)) ? read(files.translations) : '';
const scriptsPage = existsSync(join(root, files.scriptsPage)) ? read(files.scriptsPage) : '';
const scriptsCss = existsSync(join(root, files.scriptsCss)) ? read(files.scriptsCss) : '';

const expectations = [
  ['sidebar has Scripts nav item', page, '<span>Automation Scripts</span>'],
  ['scripts route maps to view', page, "path === '/scripts'"],
  ['scripts view renders component', page, '<ScriptsPage'],
  ['Starter has 5 script slots', plans, 'scriptSlotLimit: 5'],
  ['Pro has 12 script slots', plans, 'scriptSlotLimit: 12'],
  ['script slot helper exported', plans, 'export function getScriptSlotLimit'],
  ['English scripts copy exists', translations, 'Cloud execution engine is in development'],
  ['Indonesian scripts copy exists', translations, 'Cloud execution engine sedang dikembangkan'],
  ['ScriptsPage exports component', scriptsPage, 'export default function ScriptsPage'],
  ['free users are locked', scriptsPage, "planId === 'free'"],
  ['Run in Cloud disabled', scriptsPage, 'disabled'],
  ['Coming soon label exists', scriptsPage, "t('scripts.comingSoon')"],
  ['ScriptsPage uses plan helper', scriptsPage, 'getScriptSlotLimit(planId)'],
  ['No runner API call', scriptsPage, "fetch('/api/scripts/run'"],
  ['Scripts card styles exist', scriptsCss, '.scriptCard'],
];

for (const [label, source, token] of expectations) {
  const shouldBeAbsent = label === 'No runner API call';
  const hasToken = source.includes(token);
  if (shouldBeAbsent ? hasToken : !hasToken) failures.push(`${label}: ${shouldBeAbsent ? 'must not include' : 'missing'} "${token}"`);
}

if (failures.length) {
  console.error('Scripts UI-first verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Scripts UI-first verification passed.');
