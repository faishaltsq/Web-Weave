import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { createLemonSqueezyCheckout } from '@/lib/billing/lemonsqueezy';
import { getPlanConfig, normalizeBillingCycle } from '@/lib/billing/plans';

export async function POST(req) {
  const auth = await getAuthenticatedUser(req);
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const planId = String(body.plan || '').trim().toLowerCase();
  const billingCycle = normalizeBillingCycle(String(body.billingCycle || '').trim().toLowerCase());
  const plan = getPlanConfig(planId);

  if (!plan) return NextResponse.json({ success: false, error: 'Unknown billing plan.' }, { status: 400 });
  if (!plan.checkoutEnabled) return NextResponse.json({ success: false, error: 'This plan is not available for checkout.' }, { status: 400 });

  const checkout = await createLemonSqueezyCheckout({ planId, billingCycle, user: auth.user });
  if (!checkout.success) {
    return NextResponse.json(checkout, { status: checkout.configured === false ? 503 : 400 });
  }

  return NextResponse.json({ success: true, checkoutUrl: checkout.checkoutUrl });
}
