import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const route = readFileSync(join(process.cwd(), 'src/app/api/generate/route.js'), 'utf8');

const requiredTokens = [
  ['prompt rejects generic USERNAME env var', 'Do not read credentials from generic OS environment variables such as USERNAME'],
  ['prompt recommends TEST_USERNAME', 'Use explicit test-scoped names such as TEST_USERNAME and TEST_PASSWORD'],
  ['static check labels generic credential env vars', 'Credential env vars'],
  ['static check detects Python USERNAME getenv', String.raw`os\.getenv\(\s*['"]USERNAME`],
  ['static check detects JS USERNAME env', String.raw`process\.env\.USERNAME`]
];

const missing = requiredTokens.filter(([, token]) => !route.includes(token));

if (missing.length) {
  console.error('Generate guardrail verification failed:');
  for (const [label, token] of missing) {
    console.error(`- ${label}: missing "${token}"`);
  }
  process.exit(1);
}

console.log('Generate guardrail verification passed.');
