import { NextResponse } from 'next/server';

const LEMONSQUEEZY_BILLING_DISABLED = 'LemonSqueezy billing is disabled. Use Midtrans instead.';

export async function POST() {
  return NextResponse.json({ success: false, error: LEMONSQUEEZY_BILLING_DISABLED }, { status: 410 });
}
