import { NextResponse } from 'next/server';
import { getAuthenticatedUser, hasSupabaseServerConfig } from '@/lib/supabase/server';
import { getGenerationQuotaStatus, isBillingExpired } from '@/lib/billing/quota';
import { getPlanConfig } from '@/lib/billing/plans';

export async function GET(req) {
  if (!hasSupabaseServerConfig()) {
    return NextResponse.json({ success: true, configured: false, billing: null });
  }

  const auth = await getAuthenticatedUser(req);
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  try {
    const { data: profile, error: profileError } = await auth.supabase
      .from('profiles')
      .select('plan, monthly_generation_limit, billing_cycle, billing_provider, billing_period_ends_at, midtrans_order_id, midtrans_status, billing_updated_at, created_at')
      .eq('id', auth.user.id)
      .single();

    if (profileError) throw new Error(profileError.message);

    const quota = await getGenerationQuotaStatus(auth);
    const plan = getPlanConfig(profile?.plan) || getPlanConfig('free');
    const expired = isBillingExpired(profile);

    const now = new Date();
    const expiresAt = profile?.billing_period_ends_at ? new Date(profile.billing_period_ends_at) : null;
    const daysUntilExpiry = expiresAt && !expired
      ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : null;

    // Fetch recent billing orders for payment history
    const { data: orders } = await auth.supabase
      .from('billing_orders')
      .select('order_id, plan, billing_cycle, amount, status, created_at')
      .eq('owner_id', auth.user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      configured: true,
      billing: {
        planId: plan.id,
        planLabel: plan.label,
        billingCycle: profile?.billing_cycle || null,
        billingProvider: profile?.billing_provider || null,
        billingPeriodEndsAt: profile?.billing_period_ends_at || null,
        expired,
        daysUntilExpiry,
        midtransStatus: profile?.midtrans_status || null,
        quota: {
          used: quota.used,
          limit: quota.limit,
          remaining: quota.remaining,
          exhausted: quota.exhausted,
        },
        allowedFrameworks: quota.allowedFrameworks,
        projectLimit: plan.projectLimit,
        orders: (orders || []).map((order) => ({
          orderId: order.order_id,
          plan: order.plan,
          cycle: order.billing_cycle,
          amount: order.amount,
          status: order.status,
          createdAt: order.created_at,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
