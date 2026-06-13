import {
  getAllowedFrameworks,
  getPlanConfig,
  getPlanLimit,
  isFrameworkAllowedForPlan,
} from './plans';

export const GENERATION_EVENT_TYPE = 'generation_requested';
export const QUOTA_LIMIT_REACHED_MESSAGE = 'Monthly generation limit reached. Please upgrade your plan to continue.';

export function getMonthStartIso(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export function isBillingExpired(profile, now = new Date()) {
  if (!profile?.billing_period_ends_at) return false;
  const expiresAt = new Date(profile.billing_period_ends_at).getTime();
  return Number.isFinite(expiresAt) && expiresAt <= now.getTime();
}

export function resolveActivePlanId(profile, now = new Date()) {
  if (isBillingExpired(profile, now)) return 'free';
  return getPlanConfig(profile?.plan)?.id || 'free';
}

export function resolveGenerationLimit(profile, now = new Date()) {
  const planId = resolveActivePlanId(profile, now);
  const profileLimit = Number(profile?.monthly_generation_limit || 0);
  return profileLimit > 0 && planId !== 'free' ? profileLimit : getPlanLimit(planId);
}

export async function getUserBillingProfile(supabase, userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('plan, monthly_generation_limit, billing_period_ends_at')
    .eq('id', userId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function countMonthlyGenerationUsage(supabase, userId, now = new Date()) {
  const { data, error } = await supabase
    .from('usage_events')
    .select('quantity')
    .eq('owner_id', userId)
    .eq('event_type', GENERATION_EVENT_TYPE)
    .gte('created_at', getMonthStartIso(now))
    .gt('quantity', 0);

  if (error) throw new Error(error.message);
  return (data || []).reduce((sum, event) => {
    const quantity = Number(event.quantity);
    return Number.isFinite(quantity) && quantity > 0 ? sum + quantity : sum;
  }, 0);
}

export async function getGenerationQuotaStatus(auth, now = new Date()) {
  const profile = await getUserBillingProfile(auth.supabase, auth.user.id);
  const planId = resolveActivePlanId(profile, now);
  const plan = getPlanConfig(planId) || getPlanConfig('free');
  const limit = resolveGenerationLimit(profile, now);
  const used = await countMonthlyGenerationUsage(auth.supabase, auth.user.id, now);
  const remaining = Math.max(limit - used, 0);

  return {
    planId,
    planLabel: plan.label,
    used,
    limit,
    remaining,
    exhausted: used >= limit,
    allowedFrameworks: getAllowedFrameworks(planId),
    billingExpired: isBillingExpired(profile, now),
  };
}

export async function assertCanGenerate(auth, framework, now = new Date()) {
  const status = await getGenerationQuotaStatus(auth, now);

  if (!isFrameworkAllowedForPlan(status.planId, framework)) {
    return {
      allowed: false,
      status: 403,
      error: `${status.planLabel} plan does not include this framework. Please upgrade your plan to continue.`,
      quota: status,
    };
  }

  if (status.exhausted) {
    return { allowed: false, status: 402, error: QUOTA_LIMIT_REACHED_MESSAGE, quota: status };
  }

  return { allowed: true, quota: status };
}

export async function recordGenerationRequested(auth) {
  if (!auth?.supabase || !auth?.user?.id) return;
  const { error } = await auth.supabase.from('usage_events').insert({
    owner_id: auth.user.id,
    event_type: GENERATION_EVENT_TYPE,
    quantity: 1,
    metadata: { source: 'generate_api' },
  });

  if (error) throw new Error(error.message);
}
