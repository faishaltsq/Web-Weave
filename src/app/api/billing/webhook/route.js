import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { getLemonSqueezyConfig, mapWebhookToEntitlement, verifyLemonSqueezySignature } from '@/lib/billing/lemonsqueezy';

const SUPPORTED_EVENTS = new Set([
  'subscription_created',
  'subscription_updated',
  'subscription_payment_success',
  'subscription_cancelled',
  'subscription_resumed',
  'subscription_expired',
]);

export async function POST(req) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-signature') || '';
  const config = getLemonSqueezyConfig();

  if (!config.webhookConfigured) {
    return NextResponse.json({ success: false, error: 'Webhook is not configured.' }, { status: 503 });
  }

  if (!verifyLemonSqueezySignature(rawBody, signature, config.webhookSecret)) {
    return NextResponse.json({ success: false, error: 'Invalid signature.' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const eventName = payload?.meta?.event_name || '';
  if (!SUPPORTED_EVENTS.has(eventName)) {
    return NextResponse.json({ success: true, ignored: true, eventName });
  }

  const entitlement = mapWebhookToEntitlement(payload);
  if (!entitlement.userId) {
    return NextResponse.json({ success: false, error: 'Webhook missing user_id custom data.' }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ success: false, error: 'Supabase is not configured.' }, { status: 503 });

  const { error } = await supabase
    .from('profiles')
    .update({
      plan: entitlement.planId,
      monthly_generation_limit: entitlement.monthlyGenerationLimit,
      lemon_customer_id: entitlement.lemonCustomerId,
      lemon_subscription_id: entitlement.lemonSubscriptionId,
      lemon_variant_id: entitlement.lemonVariantId,
      lemon_status: entitlement.lemonStatus,
      billing_cycle: entitlement.billingCycle,
      billing_updated_at: new Date().toISOString(),
    })
    .eq('id', entitlement.userId);

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, eventName, plan: entitlement.planId });
}
