export const BILLING_CYCLES = ['monthly', 'annual'];

export const SUPPORTED_FRAMEWORKS = [
  'playwright_js',
  'playwright_python',
  'puppeteer_js',
  'selenium_python',
  'cypress_js',
];

const STARTER_FRAMEWORKS = ['playwright_js', 'playwright_python', 'selenium_python', 'cypress_js'];

export const WEBWEAVE_PLANS = {
  free: {
    id: 'free',
    label: 'Free',
    monthlyGenerationLimit: 5,
    projectLimit: 1,
    allowedFrameworks: ['playwright_js'],
    checkoutEnabled: false,
    publicEnabled: true,
    prices: {
      monthly: 0,
      annual: 0,
    },
  },
  starter: {
    id: 'starter',
    label: 'Starter',
    monthlyGenerationLimit: 75,
    projectLimit: 5,
    allowedFrameworks: STARTER_FRAMEWORKS,
    checkoutEnabled: true,
    publicEnabled: true,
    prices: {
      monthly: 49000,
      annual: 470000,
    },
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    monthlyGenerationLimit: 300,
    projectLimit: 25,
    allowedFrameworks: SUPPORTED_FRAMEWORKS,
    checkoutEnabled: true,
    publicEnabled: true,
    prices: {
      monthly: 129000,
      annual: 1238000,
    },
  },
  team: {
    id: 'team',
    label: 'Team',
    monthlyGenerationLimit: 1000,
    projectLimit: 50,
    allowedFrameworks: SUPPORTED_FRAMEWORKS,
    checkoutEnabled: false,
    publicEnabled: false,
    prices: {
      monthly: 299000,
      annual: 2870000,
    },
  },
};

export function normalizeBillingCycle(value) {
  return BILLING_CYCLES.includes(value) ? value : 'monthly';
}

export function getPlanConfig(planId) {
  return WEBWEAVE_PLANS[planId] || null;
}

export function getPlanLimit(planId) {
  return getPlanConfig(planId)?.monthlyGenerationLimit ?? WEBWEAVE_PLANS.free.monthlyGenerationLimit;
}

export function getProjectLimit(planId) {
  return getPlanConfig(planId)?.projectLimit ?? WEBWEAVE_PLANS.free.projectLimit;
}

export function getAllowedFrameworks(planId) {
  return getPlanConfig(planId)?.allowedFrameworks ?? WEBWEAVE_PLANS.free.allowedFrameworks;
}

export function isFrameworkAllowedForPlan(planId, framework) {
  return getAllowedFrameworks(planId).includes(framework);
}

export function getPlanPrice(planId, billingCycle) {
  const plan = getPlanConfig(planId);
  const cycle = normalizeBillingCycle(billingCycle);
  return Number(plan?.prices?.[cycle] || 0);
}
