import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { getMidtransConfig, mapMidtransNotificationToEntitlement, verifyMidtransSignature } from '@/lib/billing/midtrans';

export async function POST(req) {
  try {
  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > 64 * 1024) {
    return NextResponse.json({ success: false, error: 'Payload too large.' }, { status: 413 });
  }

  const notification = await req.json().catch(() => null);
  const config = getMidtransConfig();

  if (!notification) {
    console.error('Webhook: invalid JSON body');
    return NextResponse.json({ success: false, error: 'Invalid notification payload.' }, { status: 400 });
  }

  if (!config.checkoutConfigured) {
    console.error('Webhook: payment gateway not configured');
    return NextResponse.json({ success: false, error: 'Payment gateway is not configured yet.' }, { status: 503 });
  }

  if (!verifyMidtransSignature(notification, config.serverKey)) {
    console.error('Webhook: signature verification failed', {
      order_id: notification?.order_id,
      status_code: notification?.status_code,
      gross_amount: notification?.gross_amount,
      has_signature_key: typeof notification?.signature_key === 'string',
      sig_length: notification?.signature_key?.length,
      transaction_status: notification?.transaction_status,
      source_route: req.headers.get('x-midtrans-source') || 'unknown',
    });
    return NextResponse.json({ success: false, error: 'Invalid signature.' }, { status: 401 });
  }

  console.log('Webhook: signature OK, processing', { order_id: notification?.order_id, transaction_status: notification?.transaction_status });

  const supabase = createSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ success: false, error: 'Supabase is not configured.' }, { status: 503 });

  const orderId = notification?.order_id ? String(notification.order_id) : '';
  if (!orderId) return NextResponse.json({ success: false, error: 'Webhook missing order_id.' }, { status: 400 });

  let { data: order, error: orderError } = await supabase
    .from('billing_orders')
    .select('order_id, owner_id, plan, billing_cycle, amount, status, billing_period_ends_at, created_at')
    .eq('order_id', orderId)
    .single();

  if ((orderError || !order) && /-\d{10,13}$/.test(orderId)) {
    const strippedOrderId = orderId.replace(/-\d{10,13}$/, '');
    console.log('Webhook: retrying with stripped order_id', { original: orderId, stripped: strippedOrderId });
    ({ data: order, error: orderError } = await supabase
      .from('billing_orders')
      .select('order_id, owner_id, plan, billing_cycle, amount, status, billing_period_ends_at, created_at')
      .eq('order_id', strippedOrderId)
      .single());
  }

  if (orderError || !order) {
    return NextResponse.json({ success: false, error: 'Unknown payment order.' }, { status: 400 });
  }

  const entitlement = mapMidtransNotificationToEntitlement(notification, order);
  console.log('Webhook: entitlement result', {
    order_id: orderId,
    active: entitlement.active,
    terminalInactive: entitlement.terminalInactive,
    revokesEntitlement: entitlement.revokesEntitlement,
    planId: entitlement.planId,
    userId: Boolean(entitlement.userId),
    grossAmount: notification?.gross_amount,
    orderAmount: order?.amount,
  });
  if (!entitlement.userId) {
    console.error('Webhook: missing user_id');
    return NextResponse.json({ success: false, error: 'Webhook missing user_id custom data.' }, { status: 400 });
  }

  console.log('Webhook: fetching profile', { userId: entitlement.userId });
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('plan, midtrans_order_id, midtrans_status')
    .eq('id', entitlement.userId)
    .single();

  console.log('Webhook: profile fetched', { found: Boolean(profile), error: profileError?.message });
  if (profileError) {
    console.error('Webhook: profile fetch error', { userId: entitlement.userId, error: profileError.message });
    return NextResponse.json({ success: false, error: profileError.message }, { status: 500 });
  }

  const periodEnd = entitlement.billingPeriodEndsAt;

  const orderUpdate = {
    status: entitlement.midtransStatus,
    midtrans_transaction_id: entitlement.midtransTransactionId,
    billing_period_ends_at: periodEnd,
    updated_at: new Date().toISOString(),
  };

  console.log('Webhook: updating billing_orders', { order_id: order.order_id, status: entitlement.midtransStatus });
  const { error: orderUpdateErr } = await supabase
    .from('billing_orders')
    .update(orderUpdate)
    .eq('order_id', order.order_id);

  if (orderUpdateErr) console.error('Webhook: billing_orders update failed', { order_id: order.order_id, error: orderUpdateErr.message });

  if (!entitlement.active && !entitlement.terminalInactive) {
    console.log('Webhook: ignoring non-terminal status', { order_id: orderId, status: entitlement.midtransStatus });
    return NextResponse.json({ success: true, ignored: true, status: entitlement.midtransStatus, reason: 'non_terminal_status' });
  }

  const active = entitlement.active;

  if (active) {
    const PLAN_TIER = { free: 0, starter: 1, pro: 2, team: 3 };
    const currentPlan = (profile?.plan || 'free').toLowerCase();
    const currentTier = PLAN_TIER[currentPlan] ?? 0;
    const targetTier = PLAN_TIER[entitlement.planId] ?? -1;
    if (targetTier <= currentTier && profile?.midtrans_order_id !== order.order_id) {
      console.log('Webhook: skipping profile update - already on same or higher plan', { order_id: orderId, currentPlan, targetPlan: entitlement.planId });
      return NextResponse.json({ success: true, ignored: true, status: entitlement.midtransStatus, reason: 'already_on_higher_or_equal_plan' });
    }
  }

  if (!active && profile?.midtrans_order_id !== order.order_id) {
    console.log('Webhook: ignoring inactive order not current plan', { order_id: orderId });
    return NextResponse.json({ success: true, ignored: true, status: entitlement.midtransStatus, reason: 'inactive_order_not_current_plan' });
  }

  const update = active
    ? {
        plan: entitlement.planId,
        monthly_generation_limit: entitlement.monthlyGenerationLimit,
        billing_cycle: entitlement.billingCycle,
        billing_provider: entitlement.billingProvider,
        billing_period_ends_at: periodEnd,
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

  console.log('Webhook: updating profile', { userId: entitlement.userId, plan: update.plan });
  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', entitlement.userId);

  if (profileUpdateError) {
    console.error('Webhook: profile update failed', { userId: entitlement.userId, error: profileUpdateError.message });
    return NextResponse.json({ success: false, error: profileUpdateError.message }, { status: 500 });
  }

  if (active) {
    await supabase
      .from('billing_orders')
      .update({ status: 'cancel', updated_at: new Date().toISOString() })
      .eq('owner_id', entitlement.userId)
      .eq('status', 'checkout_created')
      .neq('order_id', order.order_id);
  }

  console.log('Webhook: profile updated successfully', { order_id: orderId, plan: active ? entitlement.planId : 'free', status: entitlement.midtransStatus });
  return NextResponse.json({ success: true, status: entitlement.midtransStatus, plan: active ? entitlement.planId : undefined });
  } catch (err) {
    console.error('Webhook: unhandled error', { error: err?.message || String(err), stack: err?.stack?.slice(0, 300) });
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
