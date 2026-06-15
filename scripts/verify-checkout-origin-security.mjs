import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];

const securityPath = 'src/lib/server/security.js';
const checkoutPath = 'src/app/api/billing/checkout/route.js';

if (!existsSync(join(root, securityPath))) failures.push(`${securityPath} missing file`);
if (!existsSync(join(root, checkoutPath))) failures.push(`${checkoutPath} missing file`);

const security = failures.length ? '' : read(securityPath);
const checkout = failures.length ? '' : read(checkoutPath);

const expectations = [
  ['security normalizes URL origin', security, 'function getUrlOrigin'],
  ['security reads request URL origin', security, 'getUrlOrigin(req.url)'],
  ['security accepts VERCEL_URL host', security, 'process.env.VERCEL_URL'],
  ['security compares exact origins', security, 'allowedOrigins.includes(headerOrigin)'],
  ['security does not use raw startsWith', security, '.startsWith(appUrl)'],
  ['checkout imports shared validateOrigin', checkout, 'validateOrigin'],
  ['checkout does not define inline validateOrigin', checkout, 'function validateOrigin'],
];

for (const [label, source, token] of expectations) {
  const shouldBeAbsent = label.includes('does not');
  const hasToken = source.includes(token);
  if (shouldBeAbsent ? hasToken : !hasToken) {
    failures.push(`${label}: ${shouldBeAbsent ? 'must not include' : 'missing'} "${token}"`);
  }
}

if (failures.length) {
  console.error('Checkout origin security verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Checkout origin security verification passed.');
