import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { createMidtransSnapCheckout, createMidtransInvoice, generateOrderId } from '@/lib/billing/midtrans';
import { getPlanConfig, normalizeBillingCycle } from '@/lib/billing/plans';
import { getRequestOrigin, validateOrigin } from '@/lib/server/security';

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const rateLimitStore = new Map();

function getClientId(req) {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

function checkRateLimit(clientId) {
  const now = Date.now();
  const current = rateLimitStore.get(clientId);
  if (!current || now > current.resetAt) {
    rateLimitStore.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }
  current.count += 1;
  if (current.count > RATE_LIMIT_MAX_REQUESTS) {
    return Math.ceil((current.resetAt - now) / 1000);
  }
  return null;
}

export async function POST(req) {
  const retryAfter = checkRateLimit(getClientId(req));
  if (retryAfter) {
    return NextResponse.json({ success: false, error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(retryAfter) } });
  }

  if (!validateOrigin(req)) {
    return NextResponse.json({ success: false, error: 'Invalid request origin.' }, { status: 403 });
  }

  const auth = await getAuthenticatedUser(req);
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const planId = String(body.plan || '').trim().toLowerCase();
  const billingCycle = normalizeBillingCycle(String(body.billingCycle || '').trim().toLowerCase());
  const plan = getPlanConfig(planId);

  if (!plan) return NextResponse.json({ success: false, error: 'Unknown billing plan.' }, { status: 400 });
  if (!plan.checkoutEnabled) return NextResponse.json({ success: false, error: 'This plan is not available for checkout.' }, { status: 400 });

  const orderId = generateOrderId(auth.user.id, planId, billingCycle);

  const requestOrigin = getRequestOrigin(req);
  const checkoutEnv = requestOrigin
    ? { ...process.env, NEXT_PUBLIC_APP_URL: requestOrigin }
    : process.env;
  const checkout = await createMidtransSnapCheckout({ planId, billingCycle, user: auth.user, env: checkoutEnv, orderId });
  if (!checkout.success) {
    return NextResponse.json({ success: false, error: checkout.error || 'Failed to create checkout.' }, { status: checkout.configured === false ? 503 : 400 });
  }

  const orderRecord = {
    order_id: orderId,
    owner_id: auth.user.id,
    plan: plan.id,
    billing_cycle: billingCycle,
    amount: checkout.amount,
    status: 'checkout_created',
    midtrans_redirect_url: checkout.checkoutUrl,
    midtrans_snap_token: checkout.token,
  };

  const invoice = await createMidtransInvoice({ orderId, planId, billingCycle, user: auth.user, env: checkoutEnv });
  if (invoice.success) {
    orderRecord.midtrans_invoice_id = invoice.invoice_id;
    orderRecord.midtrans_invoice_pdf_url = invoice.pdf_url;
    orderRecord.midtrans_invoice_payment_link_url = invoice.payment_link_url;
  }

  let { error: orderError } = await auth.supabase.from('billing_orders').insert(orderRecord);

  if (orderError && /midtrans_(?:redirect_url|snap_token|invoice_)/i.test(orderError.message || '')) {
    const { midtrans_redirect_url, midtrans_snap_token, midtrans_invoice_id, midtrans_invoice_pdf_url, midtrans_invoice_payment_link_url, ...legacyOrderRecord } = orderRecord;
    ({ error: orderError } = await auth.supabase.from('billing_orders').insert(legacyOrderRecord));
  }

  if (orderError) {
    console.error('Failed to store Midtrans billing order', { orderId, error: orderError.message });
    return NextResponse.json({ success: false, error: 'Failed to create checkout.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, checkoutUrl: checkout.checkoutUrl });
}
