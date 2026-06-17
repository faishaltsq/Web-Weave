import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getAuthenticatedUser, hasSupabaseServerConfig } from '@/lib/supabase/server';

const formatRupiah = (value) => `Rp${new Intl.NumberFormat('id-ID').format(Number(value || 0))}`;

function sanitizeFilename(value) {
  return String(value || 'invoice').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getCycleLabel(value) {
  if (value === 'annual') return 'Annual';
  if (value === 'monthly') return 'Monthly';
  return value || '-';
}

async function buildInvoicePdf({ order, provider }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const blue = rgb(0.15, 0.39, 0.92);
  const dark = rgb(0.08, 0.1, 0.18);
  const muted = rgb(0.38, 0.43, 0.52);

  page.drawText('WebWeave Invoice', { x: 48, y: 780, size: 24, font: bold, color: dark });
  page.drawText('AI web automation billing receipt', { x: 48, y: 754, size: 11, font, color: muted });
  page.drawText(formatRupiah(order.amount), { x: 390, y: 775, size: 22, font: bold, color: blue });

  const rows = [
    ['Order ID', order.order_id],
    ['Plan', order.plan],
    ['Billing cycle', getCycleLabel(order.billing_cycle)],
    ['Amount', formatRupiah(order.amount)],
    ['Status', order.status || '-'],
    ['Payment provider', provider || '-'],
    ['Created date', formatDate(order.created_at)],
  ];

  let y = 690;
  for (const [label, value] of rows) {
    page.drawText(label, { x: 56, y, size: 10, font: bold, color: muted });
    page.drawText(String(value || '-'), { x: 190, y, size: 11, font, color: dark });
    y -= 34;
  }

  page.drawLine({ start: { x: 48, y: 720 }, end: { x: 547, y: 720 }, thickness: 1, color: rgb(0.86, 0.89, 0.94) });
  page.drawLine({ start: { x: 48, y: 180 }, end: { x: 547, y: 180 }, thickness: 1, color: rgb(0.86, 0.89, 0.94) });
  page.drawText('This receipt is generated from WebWeave billing records.', { x: 48, y: 150, size: 10, font, color: muted });
  page.drawText('WebWeave does not store card details. Payments are processed by Midtrans.', { x: 48, y: 132, size: 10, font, color: muted });

  return pdfDoc.save();
}

export async function GET(req, { params }) {
  if (!hasSupabaseServerConfig()) {
    return NextResponse.json({ success: false, error: 'Supabase not configured.' }, { status: 503 });
  }

  const auth = await getAuthenticatedUser(req);
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const orderId = String(params?.orderId || '').trim();
  if (!orderId) return NextResponse.json({ success: false, error: 'Invoice order ID is required.' }, { status: 400 });

  try {
    const { data: order, error: orderError } = await auth.supabase
      .from('billing_orders')
      .select('order_id, plan, billing_cycle, amount, status, created_at')
      .eq('owner_id', auth.user.id)
      .eq('order_id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ success: false, error: 'Invoice not found.' }, { status: 404 });
    }

    const { data: profile } = await auth.supabase
      .from('profiles')
      .select('billing_provider')
      .eq('id', auth.user.id)
      .single();

    const bytes = await buildInvoicePdf({ order, provider: profile?.billing_provider || 'midtrans' });
    const filename = `webweave-invoice-${sanitizeFilename(order.order_id)}.pdf`;

    return new NextResponse(bytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
