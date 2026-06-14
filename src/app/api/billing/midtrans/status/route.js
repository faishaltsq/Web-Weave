import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { getMidtransConfig, mapMidtransNotificationToEntitlement } from '@/lib/billing/midtrans';

const ACTIVE_MIDTRANS_STATUSES = new Set(['settlement', 'capture']);
const REVOKED_MIDTRANS_STATUSES = new Set(['refund', 'partial_refund', 'chargeback', 'partial_chargeback']);

async function fetchMidtransStatus(orderId, config) {
  const baseUrl = config.isProduction
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com';
  const authToken = Buffer.from(`${config.serverKey}:`).toString('base64');

  const response = await fetch(`${baseUrl}/v2/${orderId}/status`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Basic ${authToken}`,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('Midtrans status check failed', {
      status: response.status,
      orderId,
      error: data.status_message || data.message || 'Unknown error',
    });
    return null;
  }

  return data;
}

async function applyEntitlementUpdate(supabase, order, entitlement) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('midtrans_order_id, midtrans_status')
    .eq('id', entitlement.userId)
    .single();

  const existingActiveOrder = ACTIVE_MIDTRANS_STATUSES.has(String(order.status || '').toLowerCase()) && order.billing_period_ends_at;
  const periodEnd = entitlement.active && existingActiveOrder
    ? order.billing_period_ends_at
    : entitlement.billingPeriodEndsAt;

  const active = entitlement.active;
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

  await supabase.from('profiles').update(update).eq('id', entitlement.userId);

  await supabase
    .from('billing_orders')
    .update({
      status: entitlement.midtransStatus,
      midtrans_transaction_id: entitlement.midtransTransactionId,
      billing_period_ends_at: periodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq('order_id', order.order_id);

  return { active, planId: entitlement.planId, status: entitlement.midtransStatus };
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('order_id');
  const userId = searchParams.get('user_id');

  if (!orderId) {
    return NextResponse.json({ success: false, error: 'Missing order_id.' }, { status: 400 });
  }

  const config = getMidtransConfig();
  if (!config.checkoutConfigured) {
    return NextResponse.json({ success: false, error: 'Payment gateway is not configured yet.' }, { status: 503 });
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ success: false, error: 'Supabase is not configured.' }, { status: 503 });

  const { data: order, error: orderError } = await supabase
    .from('billing_orders')
    .select('order_id, owner_id, plan, billing_cycle, amount, status, billing_period_ends_at, created_at')
    .eq('order_id', orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ success: false, error: 'Unknown payment order.' }, { status: 400 });
  }

  if (userId && order.owner_id !== userId) {
    return NextResponse.json({ success: false, error: 'Order does not belong to this user.' }, { status: 403 });
  }

  if (order.status === 'settlement' || order.status === 'capture') {
    const { data: profileCheck } = await supabase
      .from('profiles')
      .select('plan, monthly_generation_limit')
      .eq('id', order.owner_id)
      .single();

    return NextResponse.json({
      success: true,
      alreadyProcessed: true,
      plan: profileCheck?.plan || 'free',
      limit: profileCheck?.monthly_generation_limit || 5,
    });
  }

  const notification = await fetchMidtransStatus(orderId, config);
  if (!notification) {
    return NextResponse.json({ success: false, error: 'Failed to check transaction status with Midtrans.' }, { status: 502 });
  }

  const entitlement = mapMidtransNotificationToEntitlement(notification, order);
  if (!entitlement.userId) {
    return NextResponse.json({ success: false, error: 'Unable to resolve user from transaction.' }, { status: 400 });
  }

  if (!entitlement.active && !entitlement.terminalInactive) {
    return NextResponse.json({
      success: true,
      pending: true,
      status: entitlement.midtransStatus,
      message: 'Payment is still being processed.',
    });
  }

  const result = await applyEntitlementUpdate(supabase, order, entitlement);

  return NextResponse.json({
    success: true,
    active: result.active,
    plan: result.planId,
    status: result.status,
  });
}
