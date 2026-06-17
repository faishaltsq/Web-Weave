import { Buffer } from 'node:buffer';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser, hasSupabaseServerConfig } from '@/lib/supabase/server';
import { getMidtransConfig, fetchMidtransInvoice, buildMidtransInvoiceUrl } from '@/lib/billing/midtrans';

function pickMidtransUrl(payload) {
  const direct = payload?.invoice_url || payload?.receipt_url || payload?.redirect_url || payload?.payment_url;
  if (typeof direct === 'string' && direct.startsWith('http')) return direct;

  const actions = Array.isArray(payload?.actions) ? payload.actions : [];
  const action = actions.find((item) => typeof item?.url === 'string' && item.url.startsWith('http'));
  return action?.url || '';
}

function buildSnapUrl(token, config) {
  if (!token) return '';
  const baseUrl = config.isProduction
    ? 'https://app.midtrans.com'
    : 'https://app.sandbox.midtrans.com';
  return `${baseUrl}/snap/v2/vtweb/${encodeURIComponent(token)}`;
}

function pickInvoiceUrl(invoiceData) {
  if (!invoiceData) return '';
  return invoiceData.pdf_url
    || invoiceData.paid_pdf_url
    || invoiceData.quotation_pdf_url
    || invoiceData.payment_link_url
    || '';
}

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
  if (!response.ok) return null;
  return data;
}

export async function GET(req, { params }) {
  if (!hasSupabaseServerConfig()) {
    return NextResponse.json({ success: false, error: 'Supabase not configured.' }, { status: 503 });
  }

  const auth = await getAuthenticatedUser(req);
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const orderId = String(params?.orderId || '').trim();
  if (!orderId) return NextResponse.json({ success: false, error: 'Invoice order ID is required.' }, { status: 400 });

  const { data: order, error: orderError } = await auth.supabase
    .from('billing_orders')
    .select('order_id, owner_id')
    .eq('owner_id', auth.user.id)
    .eq('order_id', orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ success: false, error: 'Invoice not found.' }, { status: 404 });
  }

  const { data: orderLinks } = await auth.supabase
    .from('billing_orders')
    .select('midtrans_redirect_url, midtrans_snap_token, midtrans_invoice_id')
    .eq('owner_id', auth.user.id)
    .eq('order_id', orderId)
    .single();

  const config = getMidtransConfig();

  if (orderLinks?.midtrans_invoice_id && config.checkoutConfigured) {
    const invoiceData = await fetchMidtransInvoice(orderLinks.midtrans_invoice_id, config);
    const invoiceUrl = pickInvoiceUrl(invoiceData);
    if (invoiceUrl) {
      return NextResponse.json({ success: true, midtransUrl: invoiceUrl, source: 'midtrans_invoice' });
    }
  }

  if (config.checkoutConfigured) {
    const status = await fetchMidtransStatus(orderId, config);
    const statusUrl = status ? pickMidtransUrl(status) : '';
    if (statusUrl) return NextResponse.json({ success: true, midtransUrl: statusUrl, source: 'midtrans_status' });
  }

  if (orderLinks?.midtrans_redirect_url) {
    return NextResponse.json({ success: true, midtransUrl: orderLinks.midtrans_redirect_url, source: 'snap_redirect' });
  }

  const snapUrl = buildSnapUrl(orderLinks?.midtrans_snap_token, config);
  if (snapUrl) return NextResponse.json({ success: true, midtransUrl: snapUrl, source: 'snap_token' });

  return NextResponse.json({ success: false, error: 'Midtrans receipt page is not available for this order.' });
}
