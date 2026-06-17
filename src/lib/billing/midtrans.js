import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import { getPlanConfig, getPlanPrice, normalizeBillingCycle } from './plans';

const MIDTRANS_SANDBOX_SNAP_URL = 'https://app.sandbox.midtrans.com/snap/v1/transactions';
const MIDTRANS_PRODUCTION_SNAP_URL = 'https://app.midtrans.com/snap/v1/transactions';

export function generateOrderId(userId, planId, cycle) {
  const prefix = String(userId || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'user';
  const payload = `${planId}_${cycle}_${Date.now()}_${crypto.randomBytes(4).toString('base64url')}`;
  const hash = crypto.createHash('sha256').update(payload).digest('base64url').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 10);
  return `ww_${prefix}_${hash}`;
}

function getMidtransErrorMessage(payload) {
  if (Array.isArray(payload?.error_messages)) return payload.error_messages[0] || null;
  if (typeof payload?.error_messages === 'string') return payload.error_messages;
  return payload?.errors?.[0]?.message || payload?.errors?.[0]?.detail || payload?.message || null;
}

export function getMidtransConfig(env = process.env) {
  const serverKey = env.MIDTRANS_SERVER_KEY || '';
  const clientKey = env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '';
  const appUrl = env.NEXT_PUBLIC_APP_URL || env.VERCEL_URL || 'http://localhost:3000';
  const isProduction = env.MIDTRANS_IS_PRODUCTION === 'true';
  const snapUrl = isProduction ? MIDTRANS_PRODUCTION_SNAP_URL : MIDTRANS_SANDBOX_SNAP_URL;

  return {
    serverKey,
    clientKey,
    appUrl,
    isProduction,
    snapUrl,
    checkoutConfigured: Boolean(serverKey),
  };
}

export function buildMidtransInvoiceUrl(invoiceId, config) {
  const baseUrl = config.isProduction
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com';
  return `${baseUrl}/v1/invoices/${encodeURIComponent(invoiceId)}`;
}

function getMerchantOrigin(env = process.env) {
  const rawUrl = env.NEXT_PUBLIC_APP_URL || env.VERCEL_URL || 'http://localhost:3000';
  try {
    const normalized = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    return new URL(normalized).origin;
  } catch {
    return 'http://localhost:3000';
  }
}

export function buildMidtransReturnUrl(orderId, env = process.env) {
  const merchantOrigin = getMerchantOrigin(env);
  const url = new URL('/', merchantOrigin);
  url.searchParams.set('order_id', orderId);
  return url.toString();
}

export async function createMidtransSnapCheckout({ planId, billingCycle, user, env = process.env, orderId = null }) {
  const plan = getPlanConfig(planId);
  const cycle = normalizeBillingCycle(billingCycle);
  const config = getMidtransConfig(env);
  const price = getPlanPrice(planId, cycle);

  if (!plan?.checkoutEnabled) {
    return { success: false, configured: config.checkoutConfigured, error: 'This plan is not available for checkout.' };
  }

  if (!config.serverKey || price <= 0) {
    return { success: false, configured: false, error: 'Payment gateway is not configured yet.' };
  }

  const id = orderId || generateOrderId(user?.id, plan.id, cycle);
  const authToken = Buffer.from(`${config.serverKey}:`).toString('base64');

  try {
    const response = await fetch(config.snapUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${authToken}`,
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: id,
          gross_amount: price,
        },
        customer_details: {
          email: user?.email || '',
        },
        item_details: [
          {
            id: `${plan.id}_${cycle}`,
            price,
            quantity: 1,
            name: `WebWeave ${plan.label} ${cycle}`,
          },
        ],
        callbacks: {
          finish: buildMidtransReturnUrl(id, env),
        },
        custom_field1: user?.id || '',
        custom_field2: plan.id,
        custom_field3: cycle,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Midtrans Snap checkout failed', {
        status: response.status,
        statusText: response.statusText,
        error: getMidtransErrorMessage(payload),
      });
      return { success: false, configured: true, error: 'Failed to create checkout.' };
    }

    if (!payload?.redirect_url || !payload?.token) {
      console.error('Midtrans Snap checkout returned incomplete payload', { orderId: id });
      return { success: false, configured: true, error: 'Failed to create checkout.' };
    }

    return { success: true, configured: true, checkoutUrl: payload.redirect_url, orderId: id, token: payload.token, amount: price };
  } catch (error) {
    console.error('Midtrans Snap checkout request failed', { error: error?.message || String(error) });
    return { success: false, configured: true, error: 'Failed to create checkout.' };
  }
}

export async function createMidtransInvoice({ orderId, planId, billingCycle, user, env = process.env }) {
  const plan = getPlanConfig(planId);
  const cycle = normalizeBillingCycle(billingCycle);
  const config = getMidtransConfig(env);
  const price = getPlanPrice(planId, cycle);
  const merchantOrigin = getMerchantOrigin(env);
  const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

  if (!plan) {
    return { success: false, error: 'Unknown billing plan.' };
  }

  if (!plan.checkoutEnabled) {
    return { success: false, error: 'This plan is not available for checkout.' };
  }

  if (!config.serverKey || price <= 0) {
    return { success: false, error: 'Payment gateway is not configured.' };
  }

  const baseUrl = config.isProduction
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com';
  const authToken = Buffer.from(`${config.serverKey}:`).toString('base64');

  try {
    const response = await fetch(`${baseUrl}/v1/invoices`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${authToken}`,
      },
      body: JSON.stringify({
        order_id: orderId,
        invoice_number: invoiceNumber,
        invoice_title: `WebWeave ${plan.label} ${cycle}`,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' +0700'),
        invoice_date: new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' +0700'),
        customer_details: {
          name: user?.email?.split('@')[0] || 'Customer',
          email: user?.email || '',
        },
        payment_type: 'payment_link',
        item_details: [
          {
            item_id: `${plan.id}_${cycle}`,
            description: `WebWeave ${plan.label} - ${cycle === 'annual' ? 'Annual' : 'Monthly'} Plan`,
            quantity: 1,
            price,
          },
        ],
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Midtrans Invoice creation failed', {
        status: response.status,
        statusText: response.statusText,
        error: getMidtransErrorMessage(payload),
        body: payload,
        requestOrderId: orderId,
        requestPlan: planId,
        requestPrice: price,
      });
      return { success: false, error: 'Failed to create invoice.' };
    }

    return {
      success: true,
      invoice_id: payload.id || payload.invoice_id || '',
      invoice_number: payload.invoice_number || payload.number || '',
      pdf_url: payload.pdf_url || '',
      payment_link_url: payload.payment_link_url || '',
    };
  } catch (error) {
    console.error('Midtrans Invoice creation request failed', { error: error?.message || String(error) });
    return { success: false, error: 'Failed to create invoice.' };
  }
}

export async function fetchMidtransInvoice(invoiceId, config) {
  if (!invoiceId || !config?.serverKey) return null;
  const url = buildMidtransInvoiceUrl(invoiceId, config);
  const authToken = Buffer.from(`${config.serverKey}:`).toString('base64');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${authToken}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      console.error('Midtrans Invoice fetch non-ok response', { status: response.status, error: getMidtransErrorMessage(data) });
      return null;
    }
    return data;
  } catch (error) {
    clearTimeout(timeout);
    console.error('Midtrans Invoice fetch failed', { invoiceId, error: error?.message || String(error) });
    return null;
  }
}

export function verifyMidtransSignature(notification, serverKey) {
  if (!notification || !serverKey) return false;
  if (typeof notification?.signature_key !== 'string') return false;

  const orderId = notification.order_id || '';
  const statusCode = notification.status_code || '';
  const grossAmount = notification.gross_amount || '';
  const received = notification.signature_key;
  if (!/^[a-f0-9]{128}$/i.test(received)) return false;

  const digest = crypto.createHash('sha512').update(`${orderId}${statusCode}${grossAmount}${serverKey}`).digest('hex');
  const digestBuffer = Buffer.from(digest, 'hex');
  const receivedBuffer = Buffer.from(received, 'hex');

  if (digestBuffer.length !== receivedBuffer.length) return false;
  return crypto.timingSafeEqual(digestBuffer, receivedBuffer);
}

export function getBillingPeriodEndIso(billingCycle, now = new Date()) {
  const cycle = normalizeBillingCycle(billingCycle);
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + (cycle === 'annual' ? 365 : 30));
  return periodEnd.toISOString();
}

export function mapMidtransNotificationToEntitlement(notification, trustedOrder = null) {
  const status = String(notification?.transaction_status || '').toLowerCase();
  const fraudStatus = String(notification?.fraud_status || '').toLowerCase();
  const userId = trustedOrder?.owner_id || notification?.custom_field1 || '';
  const planId = trustedOrder?.plan || notification?.custom_field2 || 'free';
  const cycle = normalizeBillingCycle(trustedOrder?.billing_cycle || notification?.custom_field3);
  const plan = getPlanConfig(planId) || getPlanConfig('free');
  const freePlan = getPlanConfig('free');
  const grossAmount = Number(notification?.gross_amount);
  const trustedAmount = Number(trustedOrder?.amount || 0);
  const expectedAmount = trustedAmount || getPlanPrice(planId, cycle);
  const amountMatches = expectedAmount > 0 && (Number.isNaN(grossAmount) ? true : grossAmount === expectedAmount);
  const transactionActive = status === 'settlement' || (status === 'capture' && fraudStatus === 'accept');
  const inactiveStatuses = new Set(['expire', 'cancel', 'deny', 'failure']);
  const revokingStatuses = new Set(['refund', 'partial_refund', 'chargeback', 'partial_chargeback']);
  const revokesEntitlement = revokingStatuses.has(status);
  const terminalInactive = inactiveStatuses.has(status) || revokesEntitlement;
  const active = transactionActive && amountMatches;

  if (active) {
    return {
      active,
      terminalInactive,
      revokesEntitlement,
      userId,
      planId: plan.id,
      monthlyGenerationLimit: plan.monthlyGenerationLimit,
      billingCycle: cycle,
      billingPeriodEndsAt: getBillingPeriodEndIso(cycle),
      billingProvider: 'midtrans',
      midtransOrderId: notification?.order_id || null,
      midtransTransactionId: notification?.transaction_id || null,
      midtransStatus: status,
    };
  }

  return {
    active: false,
    terminalInactive,
    revokesEntitlement,
    userId,
    planId: 'free',
    monthlyGenerationLimit: freePlan.monthlyGenerationLimit,
    billingCycle: 'monthly',
    billingPeriodEndsAt: null,
    billingProvider: 'midtrans',
    midtransOrderId: notification?.order_id || null,
    midtransTransactionId: notification?.transaction_id || null,
    midtransStatus: inactiveStatuses.has(status) ? status : status || 'unknown',
  };
}
