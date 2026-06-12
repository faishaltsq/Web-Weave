export const BILLING_CYCLES = ['monthly', 'annual'];

export const WEBWEAVE_PLANS = {
  free: {
    id: 'free',
    label: 'Free',
    monthlyGenerationLimit: 30,
    checkoutEnabled: false,
    variants: {},
  },
  starter: {
    id: 'starter',
    label: 'Starter',
    monthlyGenerationLimit: 500,
    checkoutEnabled: true,
    variants: {
      monthly: 'LEMONSQUEEZY_STARTER_MONTHLY_VARIANT_ID',
      annual: 'LEMONSQUEEZY_STARTER_ANNUAL_VARIANT_ID',
    },
    midtransPrices: {
      monthly: 49000,
      annual: 470000,
    },
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    monthlyGenerationLimit: 2000,
    checkoutEnabled: true,
    variants: {
      monthly: 'LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID',
      annual: 'LEMONSQUEEZY_PRO_ANNUAL_VARIANT_ID',
    },
    midtransPrices: {
      monthly: 129000,
      annual: 1238000,
    },
  },
  team: {
    id: 'team',
    label: 'Team',
    monthlyGenerationLimit: 8000,
    checkoutEnabled: false,
    variants: {},
  },
};

export function normalizeBillingCycle(value) {
  return BILLING_CYCLES.includes(value) ? value : 'monthly';
}

export function getPlanConfig(planId) {
  return WEBWEAVE_PLANS[planId] || null;
}

export function getVariantEnvName(planId, billingCycle) {
  const plan = getPlanConfig(planId);
  if (!plan?.checkoutEnabled) return null;
  return plan.variants[normalizeBillingCycle(billingCycle)] || null;
}

export function getPlanLimit(planId) {
  return getPlanConfig(planId)?.monthlyGenerationLimit || WEBWEAVE_PLANS.free.monthlyGenerationLimit;
}

export function resolvePlanFromVariantId(variantId, env = process.env) {
  const variantIdString = String(variantId || '');
  for (const plan of Object.values(WEBWEAVE_PLANS)) {
    for (const [billingCycle, envName] of Object.entries(plan.variants || {})) {
      if (env[envName] && String(env[envName]) === variantIdString) {
        return { planId: plan.id, billingCycle, limit: plan.monthlyGenerationLimit };
      }
    }
  }
  return { planId: 'free', billingCycle: 'monthly', limit: WEBWEAVE_PLANS.free.monthlyGenerationLimit };
}

export function getPlanPrice(planId, billingCycle) {
  const plan = getPlanConfig(planId);
  const cycle = normalizeBillingCycle(billingCycle);
  return Number(plan?.midtransPrices?.[cycle] || 0);
}
