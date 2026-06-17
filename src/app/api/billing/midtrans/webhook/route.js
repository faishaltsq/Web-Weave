import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { getMidtransConfig, mapMidtransNotificationToEntitlement, verifyMidtransSignature } from '@/lib/billing/midtrans';

const ACTIVE_MIDTRANS_STATUSES = new Set(['settlement', 'capture']);
const REVOKED_MIDTRANS_STATUSES = new Set(['refund', 'partial_refund', 'chargeback', 'partial_chargeback']);

export async function POST(req) {
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

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('midtrans_order_id, midtrans_status')
    .eq('id', entitlement.userId)
    .single();

  if (profileError) return NextResponse.json({ success: false, error: profileError.message }, { status: 500 });

  const existingActiveOrder = ACTIVE_MIDTRANS_STATUSES.has(String(order.status || '').toLowerCase()) && order.billing_period_ends_at;
  const existingRevokedOrder = REVOKED_MIDTRANS_STATUSES.has(String(order.status || '').toLowerCase());
   if (existingRevokedOrder && !entitlement.revokesEntitlement) {
    console.log('Webhook: ignoring revoked order', { order_id: orderId });
    return NextResponse.json({ success: true, ignored: true, status: entitlement.midtransStatus, reason: 'revoked_order_terminal' });
  }

  if (existingActiveOrder && !entitlement.active && !entitlement.revokesEntitlement) {
    console.log('Webhook: ignoring settled order not downgraded', { order_id: orderId });
    return NextResponse.json({ success: true, ignored: true, status: entitlement.midtransStatus, reason: 'settled_order_not_downgraded' });
  }

  if (entitlement.active && profile?.midtrans_order_id && profile.midtrans_order_id !== order.order_id) {
    const { data: currentOrder, error: currentOrderError } = await supabase
      .from('billing_orders')
      .select('order_id, created_at')
      .eq('order_id', profile.midtrans_order_id)
      .single();

    if (currentOrderError || !currentOrder) {
      return NextResponse.json({ success: false, error: 'Current billing order was not found.' }, { status: 500 });
    }

    const orderCreatedAt = new Date(order.created_at).getTime();
    const currentOrderCreatedAt = new Date(currentOrder.created_at).getTime();
    const staleActiveOrder = Number.isFinite(currentOrderCreatedAt) && Number.isFinite(orderCreatedAt) && orderCreatedAt <= currentOrderCreatedAt;
    if (staleActiveOrder) {
      console.log('Webhook: ignoring stale active order', { order_id: orderId, plan: order.plan });
      return NextResponse.json({ success: true, ignored: true, status: entitlement.midtransStatus, reason: 'stale_active_order' });
    }
  }

  const periodEnd = entitlement.active && existingActiveOrder
    ? order.billing_period_ends_at
    : entitlement.billingPeriodEndsAt;

  const orderUpdate = {
    status: entitlement.midtransStatus,
    midtrans_transaction_id: entitlement.midtransTransactionId,
    billing_period_ends_at: periodEnd,
    updated_at: new Date().toISOString(),
  };

  let orderUpdateQuery = supabase
    .from('billing_orders')
    .update(orderUpdate)
    .eq('order_id', order.order_id);

  if (entitlement.active) {
    orderUpdateQuery = orderUpdateQuery.not('status', 'in', '("refund","partial_refund","chargeback","partial_chargeback")');
  }

  const { data: updatedOrderRows, error: orderUpdateError } = await orderUpdateQuery.select('order_id');

  if (orderUpdateError) return NextResponse.json({ success: false, error: orderUpdateError.message }, { status: 500 });
   if (entitlement.active && !updatedOrderRows?.length) {
    console.log('Webhook: order update blocked (revoked or active)', { order_id: orderId });
    return NextResponse.json({ success: true, ignored: true, status: entitlement.midtransStatus, reason: 'revoked_order_not_reactivated' });
  }

  if (!entitlement.active && !entitlement.terminalInactive) {
    console.log('Webhook: ignoring non-terminal status', { order_id: orderId, status: entitlement.midtransStatus, active: entitlement.active, terminalInactive: entitlement.terminalInactive });
    return NextResponse.json({ success: true, ignored: true, status: entitlement.midtransStatus, reason: 'non_terminal_status' });
  }

  const active = entitlement.active;
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

  const applyProfileUpdate = async (expectedOrderId, expectedStatus) => {
    let profileUpdateQuery = supabase
      .from('profiles')
      .update(update)
      .eq('id', entitlement.userId);

    profileUpdateQuery = expectedOrderId
      ? profileUpdateQuery.eq('midtrans_order_id', expectedOrderId)
      : profileUpdateQuery.is('midtrans_order_id', null);

    profileUpdateQuery = expectedStatus
      ? profileUpdateQuery.eq('midtrans_status', expectedStatus)
      : profileUpdateQuery.is('midtrans_status', null);

    return profileUpdateQuery.select('id');
  };

  let expectedOrderId = active ? profile?.midtrans_order_id || null : order.order_id;
  let expectedStatus = profile?.midtrans_status || null;
  let { data: updatedProfiles, error } = await applyProfileUpdate(expectedOrderId, expectedStatus);

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  if (active && !updatedProfiles?.length) {
    const { data: latestProfile, error: latestProfileError } = await supabase
      .from('profiles')
      .select('midtrans_order_id, midtrans_status')
      .eq('id', entitlement.userId)
      .single();

    if (latestProfileError) return NextResponse.json({ success: false, error: latestProfileError.message }, { status: 500 });

    if (latestProfile?.midtrans_order_id && latestProfile.midtrans_order_id !== order.order_id) {
      const { data: latestCurrentOrder, error: latestCurrentOrderError } = await supabase
        .from('billing_orders')
        .select('created_at')
        .eq('order_id', latestProfile.midtrans_order_id)
        .single();

      if (latestCurrentOrderError || !latestCurrentOrder) {
        return NextResponse.json({ success: false, error: 'Current billing order was not found.' }, { status: 500 });
      }

      const orderCreatedAt = new Date(order.created_at).getTime();
      const latestCurrentOrderCreatedAt = new Date(latestCurrentOrder.created_at).getTime();
      if (Number.isFinite(latestCurrentOrderCreatedAt) && Number.isFinite(orderCreatedAt) && orderCreatedAt > latestCurrentOrderCreatedAt) {
        expectedOrderId = latestProfile.midtrans_order_id;
        expectedStatus = latestProfile.midtrans_status || null;
        ({ data: updatedProfiles, error } = await applyProfileUpdate(expectedOrderId, expectedStatus));
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
    }
  }

   if (!updatedProfiles?.length) {
    console.log('Webhook: profile update returned 0 rows', { order_id: orderId, active: entitlement.active, reason: 'concurrent_profile_change' });
    return NextResponse.json({ success: true, ignored: true, status: entitlement.midtransStatus, reason: 'concurrent_profile_change' });
  }

  console.log('Webhook: profile updated successfully', { order_id: orderId, plan: active ? entitlement.planId : 'free', status: entitlement.midtransStatus });
  return NextResponse.json({ success: true, status: entitlement.midtransStatus, plan: active ? entitlement.planId : undefined });
}
