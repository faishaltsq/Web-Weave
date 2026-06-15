import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pageSource = readFileSync(join(process.cwd(), 'src/app/(main)/page.js'), 'utf8');

const failures = [];

if (/usageStatus\?\.exhausted\s*&&\s*user\s*&&\s*!loading\s*&&\s*!showPricing/.test(pageSource)) {
  failures.push('Pricing modal auto-opens when usage status reaches exhausted. It should open only after user clicks Generate at 5/5.');
}

const disabledAttributes = [...pageSource.matchAll(/disabled=\{([^}]+)\}/g)].map((match) => match[1]);
const generateButtonDisabledByQuota = disabledAttributes.filter((value) => value.includes('loading') && value.includes('quotaExhausted'));

if (generateButtonDisabledByQuota.length) {
  failures.push('Generate/regenerate buttons are disabled by quotaExhausted, preventing 5/5 click from opening pricing.');
}

if (!pageSource.includes('if (quotaExhausted)')) {
  failures.push('handleGenerate must still open pricing when user clicks Generate at 5/5.');
}

if (failures.length) {
  console.error('Quota popup trigger verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Quota popup trigger verification passed.');
