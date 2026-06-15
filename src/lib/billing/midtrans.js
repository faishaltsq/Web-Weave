import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import { getPlanConfig, getPlanPrice, normalizeBillingCycle } from './plans';

const MIDTRANS_SANDBOX_SNAP_URL = 'https://app.sandbox.midtrans.com/snap/v1/transactions';
const MIDTRANS_PRODUCTION_SNAP_URL = 'https://app.midtrans.com/snap/v1/transactions';

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

export async function createMidtransSnapCheckout({ planId, billingCycle, user, env = process.env }) {
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

  const timestamp = Date.now();
  const userPrefix = String(user?.id || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 12) || 'user';
  const orderId = `ww_${userPrefix}_${plan.id}_${cycle}_${timestamp}`;
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
          order_id: orderId,
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
          finish: buildMidtransReturnUrl(orderId, env),
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
      console.error('Midtrans Snap checkout returned incomplete payload', { orderId });
      return { success: false, configured: true, error: 'Failed to create checkout.' };
    }

    return { success: true, configured: true, checkoutUrl: payload.redirect_url, orderId, token: payload.token, amount: price };
  } catch (error) {
    console.error('Midtrans Snap checkout request failed', { error: error?.message || String(error) });
    return { success: false, configured: true, error: 'Failed to create checkout.' };
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
  const amountMatches = expectedAmount > 0 && grossAmount === expectedAmount;
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
