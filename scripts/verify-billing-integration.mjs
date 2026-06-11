import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const read = (path) => readFileSync(join(root, path), 'utf8');

const expectations = [
  ['billing plan helper exists', 'src/lib/billing/plans.js', null],
  ['billing plan helper exports BILLING_CYCLES', 'src/lib/billing/plans.js', 'export const BILLING_CYCLES'],
  ['billing plan helper exports WEBWEAVE_PLANS', 'src/lib/billing/plans.js', 'export const WEBWEAVE_PLANS'],
  ['billing plan helper exports normalizeBillingCycle', 'src/lib/billing/plans.js', 'export function normalizeBillingCycle'],
  ['billing plan helper exports getPlanConfig', 'src/lib/billing/plans.js', 'export function getPlanConfig'],
  ['billing plan helper exports getVariantEnvName', 'src/lib/billing/plans.js', 'export function getVariantEnvName'],
  ['billing plan helper exports getPlanLimit', 'src/lib/billing/plans.js', 'export function getPlanLimit'],
  ['billing plan helper exports resolvePlanFromVariantId', 'src/lib/billing/plans.js', 'export function resolvePlanFromVariantId'],
  ['Starter limit 500', 'src/lib/billing/plans.js', 'monthlyGenerationLimit: 500'],
  ['Pro limit 2000', 'src/lib/billing/plans.js', 'monthlyGenerationLimit: 2000'],
  ['Team checkout disabled', 'src/lib/billing/plans.js', 'checkoutEnabled: false'],
  ['Starter monthly variant env mapping', 'src/lib/billing/plans.js', 'LEMONSQUEEZY_STARTER_MONTHLY_VARIANT_ID'],
  ['Starter annual variant env mapping', 'src/lib/billing/plans.js', 'LEMONSQUEEZY_STARTER_ANNUAL_VARIANT_ID'],
  ['Pro monthly variant env mapping', 'src/lib/billing/plans.js', 'LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID'],
  ['Pro annual variant env mapping', 'src/lib/billing/plans.js', 'LEMONSQUEEZY_PRO_ANNUAL_VARIANT_ID'],
  ['env has API key blank entry', '.env.local.example', 'LEMONSQUEEZY_API_KEY='],
  ['env has webhook secret blank entry', '.env.local.example', 'LEMONSQUEEZY_WEBHOOK_SECRET='],
  ['migration file exists', 'supabase/migrations/002_billing_profiles.sql', null],
  ['migration adds Lemon customer ID', 'supabase/migrations/002_billing_profiles.sql', 'lemon_customer_id text'],
  ['migration adds Lemon subscription ID', 'supabase/migrations/002_billing_profiles.sql', 'lemon_subscription_id text'],
  ['migration adds billing timestamp', 'supabase/migrations/002_billing_profiles.sql', 'billing_updated_at timestamptz'],
];

const missing = expectations.filter(([, path, token]) => {
  const fullPath = join(root, path);
  if (!existsSync(fullPath)) return true;
  if (!token) return false;
  return !read(path).includes(token);
});

if (missing.length) {
  console.error('Billing integration verification failed:');
  for (const [label, path, token] of missing) {
    console.error(`- ${label}: ${path}${token ? ` missing "${token}"` : ' missing file'}`);
  }
  process.exit(1);
}

console.log('Billing integration verification passed.');
