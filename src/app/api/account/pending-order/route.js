import { Buffer } from 'node:buffer';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser, hasSupabaseServerConfig } from '@/lib/supabase/server';
import { getMidtransConfig } from '@/lib/billing/midtrans';

async function fetchSnapStatus(orderId, config) {
  const baseUrl = config.isProduction
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com';
  const authToken = Buffer.from(`${config.serverKey}:`).toString('base64');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${baseUrl}/v2/${orderId}/status`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${authToken}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return null;
    return await response.json().catch(() => null);
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

const TERMINAL_STATUSES = new Set(['expire', 'cancel', 'deny', 'failure']);

export async function GET(req) {
  if (!hasSupabaseServerConfig()) {
    return NextResponse.json({ success: false, error: 'Supabase not configured.' }, { status: 503 });
  }

  const auth = await getAuthenticatedUser(req);
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const { data: orders, error } = await auth.supabase
    .from('billing_orders')
    .select('order_id, plan, billing_cycle, amount, midtrans_redirect_url, midtrans_snap_token, midtrans_invoice_payment_link_url, created_at')
    .eq('owner_id', auth.user.id)
    .eq('status', 'checkout_created')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !orders?.length) {
    return NextResponse.json({ success: true, pending: null });
  }

  const order = orders[0];
  const config = getMidtransConfig();

  if (config.checkoutConfigured) {
    const status = await fetchSnapStatus(order.order_id, config);
    const transactionStatus = String(status?.transaction_status || '').toLowerCase();
    if (TERMINAL_STATUSES.has(transactionStatus)) {
      await auth.supabase
        .from('billing_orders')
        .update({ status: 'cancel' })
        .eq('order_id', order.order_id)
        .eq('owner_id', auth.user.id);
      return NextResponse.json({ success: true, pending: null });
    }
  }

  const resumeUrl = order.midtrans_redirect_url
    || order.midtrans_invoice_payment_link_url
    || (order.midtrans_snap_token
      ? `${config.isProduction ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com'}/snap/v2/vtweb/${encodeURIComponent(order.midtrans_snap_token)}`
      : null);

  return NextResponse.json({
    success: true,
    pending: {
      orderId: order.order_id,
      plan: order.plan,
      billingCycle: order.billing_cycle,
      amount: order.amount,
      createdAt: order.created_at,
      resumeUrl,
    },
  });
}
