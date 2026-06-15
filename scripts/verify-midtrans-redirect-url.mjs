import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const midtrans = readFileSync(join(process.cwd(), 'src/lib/billing/midtrans.js'), 'utf8');
const failures = [];

const expectations = [
  ['exports return URL builder', 'export function buildMidtransReturnUrl'],
  ['normalizes merchant origin', 'new URL(normalized).origin'],
  ['uses VERCEL_URL fallback', 'env.VERCEL_URL'],
  ['builds root return path', "new URL('/', merchantOrigin)"],
  ['adds order_id with URLSearchParams', "url.searchParams.set('order_id', orderId)"],
  ['Snap callback uses builder', 'finish: buildMidtransReturnUrl(orderId, env)'],
];

for (const [label, token] of expectations) {
  if (!midtrans.includes(token)) failures.push(`${label}: missing "${token}"`);
}

if (midtrans.includes('finish: `${config.appUrl}?order_id=${orderId}`')) {
  failures.push('Snap callback still uses raw config.appUrl string interpolation.');
}

if (failures.length) {
  console.error('Midtrans redirect URL verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Midtrans redirect URL verification passed.');
