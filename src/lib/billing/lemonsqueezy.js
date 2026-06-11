import crypto from 'node:crypto';
import { getPlanConfig, getVariantEnvName, normalizeBillingCycle, resolvePlanFromVariantId } from './plans';

const LEMON_API_URL = 'https://api.lemonsqueezy.com/v1/checkouts';

export function getLemonSqueezyConfig(env = process.env) {
  const apiKey = env.LEMONSQUEEZY_API_KEY || '';
  const storeId = env.LEMONSQUEEZY_STORE_ID || '';
  const webhookSecret = env.LEMONSQUEEZY_WEBHOOK_SECRET || '';
  const appUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const testMode = env.LEMONSQUEEZY_TEST_MODE !== 'false';

  return {
    apiKey,
    storeId,
    webhookSecret,
    appUrl,
    testMode,
    checkoutConfigured: Boolean(apiKey && storeId),
    webhookConfigured: Boolean(webhookSecret),
  };
}

export function getCheckoutVariantId(planId, billingCycle, env = process.env) {
  const envName = getVariantEnvName(planId, billingCycle);
  return envName ? env[envName] || '' : '';
}

export async function createLemonSqueezyCheckout({ planId, billingCycle, user, env = process.env }) {
  const plan = getPlanConfig(planId);
  const cycle = normalizeBillingCycle(billingCycle);
  const config = getLemonSqueezyConfig(env);

  if (!plan?.checkoutEnabled) {
    return { success: false, configured: config.checkoutConfigured, error: 'This plan is not available for checkout.' };
  }

  const variantId = getCheckoutVariantId(planId, cycle, env);
  if (!config.checkoutConfigured || !variantId) {
    return { success: false, configured: false, error: 'Payment gateway is not configured yet.' };
  }

  const response = await fetch(LEMON_API_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          test_mode: config.testMode,
          product_options: {
            redirect_url: config.appUrl,
            enabled_variants: [Number(variantId)],
          },
          checkout_options: {
            embed: false,
            media: false,
            logo: true,
            desc: true,
            discount: true,
            locale: 'id',
            button_color: '#3b82f6',
            button_text_color: '#ffffff',
          },
          checkout_data: {
            email: user.email || '',
            custom: {
              user_id: user.id,
              plan: plan.id,
              billing_cycle: cycle,
            },
          },
        },
        relationships: {
          store: { data: { type: 'stores', id: String(config.storeId) } },
          variant: { data: { type: 'variants', id: String(variantId) } },
        },
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { success: false, configured: true, error: payload?.errors?.[0]?.detail || 'Failed to create checkout.' };
  }

  const checkoutUrl = payload?.data?.attributes?.url;
  if (!checkoutUrl) return { success: false, configured: true, error: 'Checkout URL was not returned.' };

  return { success: true, configured: true, checkoutUrl };
}

export function verifyLemonSqueezySignature(rawBody, signature, secret) {
  if (!rawBody || !signature || !secret) return false;

  const digest = Buffer.from(crypto.createHmac('sha256', secret).update(rawBody).digest('hex'), 'utf8');
  const received = Buffer.from(signature, 'utf8');

  if (digest.length !== received.length) return false;
  return crypto.timingSafeEqual(digest, received);
}

export function mapWebhookToEntitlement(payload, env = process.env) {
  const meta = payload?.meta || {};
  const attributes = payload?.data?.attributes || {};
  const customData = meta.custom_data || {};
  const variantId = attributes.variant_id || attributes.first_subscription_item?.variant_id || attributes.product_id;
  const fallback = resolvePlanFromVariantId(variantId, env);
  const planId = customData.plan || fallback.planId;
  const billingCycle = customData.billing_cycle || fallback.billingCycle;
  const plan = getPlanConfig(planId) || getPlanConfig('free');
  const status = attributes.status || meta.event_name || 'unknown';
  const inactiveStatuses = ['expired', 'paused', 'past_due', 'unpaid'];
  const active = !inactiveStatuses.includes(status);

  return {
    userId: customData.user_id || '',
    planId: active ? plan.id : 'free',
    monthlyGenerationLimit: active ? plan.monthlyGenerationLimit : getPlanConfig('free').monthlyGenerationLimit,
    billingCycle: active ? billingCycle : 'monthly',
    lemonCustomerId: attributes.customer_id ? String(attributes.customer_id) : null,
    lemonSubscriptionId: payload?.data?.id ? String(payload.data.id) : null,
    lemonVariantId: variantId ? String(variantId) : null,
    lemonStatus: status,
  };
}
