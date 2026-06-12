import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = dirname(scriptDir);
const read = (path) => readFileSync(join(root, path), 'utf8');

const expectations = [
  ['Midtrans helper exists', 'src/lib/billing/midtrans.js', null],
  ['Midtrans helper exports getMidtransConfig', 'src/lib/billing/midtrans.js', 'export function getMidtransConfig'],
  ['Midtrans helper exports createMidtransSnapCheckout', 'src/lib/billing/midtrans.js', 'export async function createMidtransSnapCheckout'],
  ['Midtrans helper exports verifyMidtransSignature', 'src/lib/billing/midtrans.js', 'export function verifyMidtransSignature'],
  ['Midtrans helper exports mapMidtransNotificationToEntitlement', 'src/lib/billing/midtrans.js', 'export function mapMidtransNotificationToEntitlement'],
  ['Midtrans sandbox endpoint exists', 'src/lib/billing/midtrans.js', 'https://app.sandbox.midtrans.com/snap/v1/transactions'],
  ['Midtrans production endpoint exists', 'src/lib/billing/midtrans.js', 'https://app.midtrans.com/snap/v1/transactions'],
  ['Midtrans helper uses Basic auth', 'src/lib/billing/midtrans.js', 'Authorization: `Basic ${authToken}`'],
  ['Midtrans signature uses sha512', 'src/lib/billing/midtrans.js', "createHash('sha512')"],
  ['Midtrans signature uses order id', 'src/lib/billing/midtrans.js', 'order_id'],
  ['Midtrans signature uses status code', 'src/lib/billing/midtrans.js', 'status_code'],
  ['Midtrans signature uses gross amount', 'src/lib/billing/midtrans.js', 'gross_amount'],
  ['Midtrans signature uses canonical formula', 'src/lib/billing/midtrans.js', '`${orderId}${statusCode}${grossAmount}${serverKey}`'],
  ['Midtrans signature uses signature key', 'src/lib/billing/midtrans.js', 'signature_key'],
  ['Midtrans signature uses server key', 'src/lib/billing/midtrans.js', 'serverKey'],
  ['Midtrans signature uses timing-safe comparison', 'src/lib/billing/midtrans.js', 'timingSafeEqual'],
  ['Plans expose price helper', 'src/lib/billing/plans.js', 'export function getPlanPrice'],
  ['Starter monthly Midtrans price', 'src/lib/billing/plans.js', 'monthly: 49000'],
  ['Starter annual Midtrans price', 'src/lib/billing/plans.js', 'annual: 470000'],
  ['Pro monthly Midtrans price', 'src/lib/billing/plans.js', 'monthly: 129000'],
  ['Pro annual Midtrans price', 'src/lib/billing/plans.js', 'annual: 1238000'],
  ['Checkout route imports Midtrans helper', 'src/app/api/billing/checkout/route.js', '@/lib/billing/midtrans'],
  ['Checkout route awaits Midtrans checkout', 'src/app/api/billing/checkout/route.js', 'await createMidtransSnapCheckout('],
  ['Midtrans webhook route exists', 'src/app/api/billing/midtrans/webhook/route.js', null],
  ['Midtrans webhook verifies signature', 'src/app/api/billing/midtrans/webhook/route.js', 'verifyMidtransSignature'],
  ['Midtrans webhook updates profiles', 'src/app/api/billing/midtrans/webhook/route.js', ".from('profiles')"],
  ['Migration adds billing provider', 'supabase/migrations/003_midtrans_billing_profiles.sql', 'billing_provider text'],
  ['Migration adds billing expiry', 'supabase/migrations/003_midtrans_billing_profiles.sql', 'billing_period_ends_at timestamptz'],
  ['Migration adds Midtrans order ID', 'supabase/migrations/003_midtrans_billing_profiles.sql', 'midtrans_order_id text'],
  ['Migration adds Midtrans transaction ID', 'supabase/migrations/003_midtrans_billing_profiles.sql', 'midtrans_transaction_id text'],
  ['Migration adds Midtrans status', 'supabase/migrations/003_midtrans_billing_profiles.sql', 'midtrans_status text'],
  ['Env has Midtrans server key', '.env.local.example', 'MIDTRANS_SERVER_KEY='],
  ['Env has Midtrans client key', '.env.local.example', 'NEXT_PUBLIC_MIDTRANS_CLIENT_KEY='],
  ['Env has Midtrans sandbox flag', '.env.local.example', 'MIDTRANS_IS_PRODUCTION=false'],
  ['Generate route reads billing expiry', 'src/app/api/generate/route.js', 'billing_period_ends_at'],
  ['Pricing copy mentions Midtrans', 'src/components/PricingPage.js', 'Redirecting to Midtrans checkout...'],
];

const missing = expectations.filter(([, path, token]) => {
  const fullPath = join(root, path);
  if (!existsSync(fullPath)) return true;
  if (!token) return false;
  return !read(path).includes(token);
});

if (missing.length) {
  console.error('Midtrans integration verification failed:');
  for (const [label, path, token] of missing) {
    console.error(`- ${label}: ${path}${token ? ` missing "${token}"` : ' missing file'}`);
  }
  process.exit(1);
}

console.log('Midtrans integration verification passed.');
