import { NextResponse } from 'next/server';
import { getAuthenticatedUser, hasSupabaseServerConfig } from '@/lib/supabase/server';

export async function POST(req) {
  if (!hasSupabaseServerConfig()) {
    return NextResponse.json({ success: false, error: 'Supabase not configured.' }, { status: 503 });
  }

  const auth = await getAuthenticatedUser(req);
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const orderId = String(body.orderId || '').trim();
  if (!orderId) return NextResponse.json({ success: false, error: 'Order ID is required.' }, { status: 400 });

  const { data: order, error: orderError } = await auth.supabase
    .from('billing_orders')
    .select('order_id, status')
    .eq('owner_id', auth.user.id)
    .eq('order_id', orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ success: false, error: 'Order not found.' }, { status: 404 });
  }

  if (order.status !== 'checkout_created') {
    return NextResponse.json({ success: false, error: 'Only pending checkouts can be cancelled.' }, { status: 400 });
  }

  const { error: updateError } = await auth.supabase
    .from('billing_orders')
    .update({ status: 'cancel' })
    .eq('order_id', orderId)
    .eq('owner_id', auth.user.id);

  if (updateError) {
    return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
