import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { getMidtransConfig, mapMidtransNotificationToEntitlement, verifyMidtransSignature } from '@/lib/billing/midtrans';

export async function POST(req) {
  const notification = await req.json().catch(() => null);
  const config = getMidtransConfig();

  if (!notification) {
    return NextResponse.json({ success: false, error: 'Invalid notification payload.' }, { status: 400 });
  }

  if (!config.checkoutConfigured) {
    return NextResponse.json({ success: false, error: 'Payment gateway is not configured yet.' }, { status: 503 });
  }

  if (!verifyMidtransSignature(notification, config.serverKey)) {
    return NextResponse.json({ success: false, error: 'Invalid signature.' }, { status: 401 });
  }

  const entitlement = mapMidtransNotificationToEntitlement(notification);
  if (!entitlement.userId) {
    return NextResponse.json({ success: false, error: 'Webhook missing user_id custom data.' }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ success: false, error: 'Supabase is not configured.' }, { status: 503 });

  const active = entitlement.planId !== 'free';

  const update = active
    ? {
        plan: entitlement.planId,
        monthly_generation_limit: entitlement.monthlyGenerationLimit,
        billing_cycle: entitlement.billingCycle,
        billing_provider: entitlement.billingProvider,
        billing_period_ends_at: entitlement.billingPeriodEndsAt,
        midtrans_order_id: entitlement.midtransOrderId,
        midtrans_transaction_id: entitlement.midtransTransactionId,
        midtrans_status: entitlement.midtransStatus,
        billing_updated_at: new Date().toISOString(),
      }
    : {
        plan: 'free',
        monthly_generation_limit: entitlement.monthlyGenerationLimit,
        billing_cycle: null,
        billing_provider: null,
        billing_period_ends_at: null,
        midtrans_order_id: entitlement.midtransOrderId,
        midtrans_transaction_id: entitlement.midtransTransactionId,
        midtrans_status: entitlement.midtransStatus,
        billing_updated_at: new Date().toISOString(),
      };

  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', entitlement.userId);

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, status: entitlement.midtransStatus, plan: active ? entitlement.planId : undefined });
}
