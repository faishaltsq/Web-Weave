import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];

const files = {
  pkg: 'package.json',
  route: 'src/app/api/account/invoices/[orderId]/route.js',
  checkout: 'src/app/api/billing/checkout/route.js',
  settings: 'src/components/SettingsModal.js',
  css: 'src/components/SettingsModal.module.css',
  translations: 'src/lib/i18n/translations.js',
  midtrans: 'src/lib/billing/midtrans.js',
  migration005: 'supabase/migrations/005_midtrans_order_links.sql',
  migration006: 'supabase/migrations/006_midtrans_invoice_fields.sql',
};

for (const [label, path] of Object.entries(files)) {
  if (!existsSync(join(root, path))) failures.push(`${label}: missing ${path}`);
}

const pkg = existsSync(join(root, files.pkg)) ? read(files.pkg) : '';
const route = existsSync(join(root, files.route)) ? read(files.route) : '';
const checkout = existsSync(join(root, files.checkout)) ? read(files.checkout) : '';
const settings = existsSync(join(root, files.settings)) ? read(files.settings) : '';
const css = existsSync(join(root, files.css)) ? read(files.css) : '';
const translations = existsSync(join(root, files.translations)) ? read(files.translations) : '';
const midtrans = existsSync(join(root, files.midtrans)) ? read(files.midtrans) : '';
const migration005 = existsSync(join(root, files.migration005)) ? read(files.migration005) : '';
const migration006 = existsSync(join(root, files.migration006)) ? read(files.migration006) : '';

const expectations = [
  ['pdf-lib dependency removed', pkg, '"pdf-lib"', false],
  ['invoice route does not import PDFDocument', route, 'PDFDocument', false],
  ['invoice route imports getMidtransConfig', route, 'getMidtransConfig'],
  ['invoice route imports fetchMidtransInvoice', route, 'fetchMidtransInvoice'],
  ['invoice route authenticates user', route, 'getAuthenticatedUser'],
  ['invoice route queries billing orders', route, ".from('billing_orders')"],
  ['invoice route ownership query uses legacy-safe columns', route, ".select('order_id, owner_id')"],
  ['invoice route reads invoice ID from orderLinks', route, "midtrans_redirect_url, midtrans_snap_token, midtrans_invoice_id"],
  ['invoice route scopes owner', route, ".eq('owner_id', auth.user.id)"],
  ['invoice route scopes order id', route, ".eq('order_id', orderId)"],
  ['invoice route calls fetchMidtransInvoice', route, 'fetchMidtransInvoice'],
  ['invoice route picks pdf_url from invoice', route, 'pdf_url'],
  ['invoice route falls back to Snap status', route, '/v2/${orderId}/status'],
  ['invoice route returns Midtrans URL JSON', route, 'midtransUrl'],
  ['invoice route no-url response is JSON error', route, "return NextResponse.json({ success: false, error: 'Midtrans receipt page is not available for this order.' });"],
  ['checkout imports generateOrderId', checkout, 'generateOrderId'],
  ['checkout imports createMidtransInvoice', checkout, 'createMidtransInvoice'],
  ['checkout calls generateOrderId', checkout, 'generateOrderId(auth.user.id, planId, billingCycle)'],
  ['checkout stores Midtrans redirect URL', checkout, 'midtrans_redirect_url: checkout.checkoutUrl'],
  ['checkout stores Midtrans token', checkout, 'midtrans_snap_token: checkout.token'],
  ['checkout stores invoice fields', checkout, 'orderRecord.midtrans_invoice_id = invoice.invoice_id'],
  ['checkout stores invoice PDF URL', checkout, 'orderRecord.midtrans_invoice_pdf_url = invoice.pdf_url'],
  ['checkout stores invoice payment link URL', checkout, 'orderRecord.midtrans_invoice_payment_link_url = invoice.payment_link_url'],
  ['checkout fallback regex includes invoice fields', checkout, 'midtrans_(?:redirect_url|snap_token|invoice_)'],
  ['checkout fallback destructures invoice fields', checkout, 'midtrans_invoice_id, midtrans_invoice_pdf_url, midtrans_invoice_payment_link_url'],
  ['migration005 adds redirect URL column', migration005, 'midtrans_redirect_url'],
  ['migration005 adds snap token column', migration005, 'midtrans_snap_token'],
  ['migration006 adds invoice ID column', migration006, 'midtrans_invoice_id'],
  ['migration006 adds invoice PDF URL column', migration006, 'midtrans_invoice_pdf_url'],
  ['migration006 adds invoice payment link URL column', migration006, 'midtrans_invoice_payment_link_url'],
  ['midtrans.js exports generateOrderId', midtrans, 'export function generateOrderId'],
  ['midtrans.js exports createMidtransInvoice', midtrans, 'export async function createMidtransInvoice'],
  ['midtrans.js exports fetchMidtransInvoice', midtrans, 'export async function fetchMidtransInvoice'],
  ['midtrans.js exports buildMidtransInvoiceUrl', midtrans, 'export function buildMidtransInvoiceUrl'],
  ['midtrans.js Snap checkout accepts optional orderId', midtrans, 'orderId = null'],
  ['settings has download handler', settings, 'handleDownloadInvoice'],
  ['settings fetches invoice route', settings, '/api/account/invoices/'],
  ['settings opens Midtrans URL', settings, "invoiceWindow.location.href = data.midtransUrl"],
  ['settings handles success false JSON', settings, '!data.success || !data.midtransUrl'],
  ['settings does not download blob', settings, 'response.blob()', false],
  ['settings invoice rows are buttons', settings, 'className={styles.invoiceItem}'],
  ['settings has download error text', translations, 'invoiceDownloadError'],
  ['css plan value has spacing class', css, '.planValue'],
  ['css invoice row cursor pointer', css, 'cursor: pointer'],
];

for (const [label, source, token, shouldExist = true] of expectations) {
  const hasToken = source.includes(token);
  if (shouldExist ? !hasToken : hasToken) failures.push(`${label}: ${shouldExist ? 'missing' : 'must not include'} "${token}"`);
}

if (failures.length) {
  console.error('Account invoice PDF verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Account invoice PDF verification passed.');
