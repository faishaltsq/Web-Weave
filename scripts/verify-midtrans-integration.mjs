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
  ['Midtrans webhook looks up trusted order', 'src/app/api/billing/midtrans/webhook/route.js', ".from('billing_orders')"],
  ['Midtrans webhook handles terminal inactive status', 'src/app/api/billing/midtrans/webhook/route.js', 'entitlement.terminalInactive'],
  ['Midtrans webhook allows refund revocation', 'src/app/api/billing/midtrans/webhook/route.js', 'entitlement.revokesEntitlement'],
  ['Midtrans webhook preserves settled replay expiry', 'src/app/api/billing/midtrans/webhook/route.js', 'existingActiveOrder'],
  ['Midtrans webhook treats revoked order as terminal', 'src/app/api/billing/midtrans/webhook/route.js', 'existingRevokedOrder'],
  ['Midtrans webhook ignores terminal revoked order', 'src/app/api/billing/midtrans/webhook/route.js', 'revoked_order_terminal'],
  ['Midtrans webhook compares current order recency', 'src/app/api/billing/midtrans/webhook/route.js', 'currentOrderCreatedAt'],
  ['Midtrans webhook uses compare-and-set profile update', 'src/app/api/billing/midtrans/webhook/route.js', 'applyProfileUpdate'],
  ['Midtrans webhook CAS checks current status', 'src/app/api/billing/midtrans/webhook/route.js', 'expectedStatus'],
  ['Midtrans webhook handles concurrent profile change', 'src/app/api/billing/midtrans/webhook/route.js', 'concurrent_profile_change'],
  ['Midtrans webhook ignores stale active order', 'src/app/api/billing/midtrans/webhook/route.js', 'stale_active_order'],
  ['Midtrans webhook ignores non-terminal status for profile', 'src/app/api/billing/midtrans/webhook/route.js', 'ignored: true'],
  ['Checkout route stores billing order', 'src/app/api/billing/checkout/route.js', ".from('billing_orders')"],
  ['Checkout route stores order amount', 'src/app/api/billing/checkout/route.js', 'amount: checkout.amount'],
  ['Midtrans helper recognizes refund status', 'src/lib/billing/midtrans.js', 'partial_refund'],
  ['Midtrans helper recognizes chargeback status', 'src/lib/billing/midtrans.js', 'partial_chargeback'],
  ['Migration adds billing provider', 'supabase/migrations/003_midtrans_billing_profiles.sql', 'billing_provider text'],
  ['Migration adds billing expiry', 'supabase/migrations/003_midtrans_billing_profiles.sql', 'billing_period_ends_at timestamptz'],
  ['Migration adds Midtrans order ID', 'supabase/migrations/003_midtrans_billing_profiles.sql', 'midtrans_order_id text'],
  ['Migration adds Midtrans transaction ID', 'supabase/migrations/003_midtrans_billing_profiles.sql', 'midtrans_transaction_id text'],
  ['Migration adds Midtrans status', 'supabase/migrations/003_midtrans_billing_profiles.sql', 'midtrans_status text'],
  ['Migration creates billing orders table', 'supabase/migrations/004_midtrans_billing_orders.sql', 'create table if not exists public.billing_orders'],
  ['Migration stores order owner', 'supabase/migrations/004_midtrans_billing_orders.sql', 'owner_id uuid not null references auth.users(id)'],
  ['Migration stores order amount', 'supabase/migrations/004_midtrans_billing_orders.sql', 'amount integer not null'],
  ['Migration protects billing orders from client writes', 'supabase/migrations/004_midtrans_billing_orders.sql', 'revoke insert, update, delete on public.billing_orders from anon, authenticated'],
  ['Env has Midtrans server key', '.env.local.example', 'MIDTRANS_SERVER_KEY='],
  ['Env has Midtrans client key', '.env.local.example', 'NEXT_PUBLIC_MIDTRANS_CLIENT_KEY='],
  ['Env has Midtrans sandbox flag', '.env.local.example', 'MIDTRANS_IS_PRODUCTION=false'],
  ['Generate route imports quota helper', 'src/app/api/generate/route.js', "@/lib/billing/quota'"],
  ['Quota helper reads billing expiry', 'src/lib/billing/quota.js', 'billing_period_ends_at'],
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
