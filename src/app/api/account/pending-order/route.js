import { NextResponse } from 'next/server';
import { getAuthenticatedUser, hasSupabaseServerConfig } from '@/lib/supabase/server';

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
  const resumeUrl = order.midtrans_redirect_url
    || order.midtrans_invoice_payment_link_url
    || (order.midtrans_snap_token
      ? `https://app.sandbox.midtrans.com/snap/v2/vtweb/${encodeURIComponent(order.midtrans_snap_token)}`
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
