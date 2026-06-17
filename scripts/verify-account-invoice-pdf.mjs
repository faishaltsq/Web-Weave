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
  migration: 'supabase/migrations/005_midtrans_order_links.sql',
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
const migration = existsSync(join(root, files.migration)) ? read(files.migration) : '';

const expectations = [
  ['pdf-lib dependency removed', pkg, '"pdf-lib"', false],
  ['invoice route does not import PDFDocument', route, 'PDFDocument', false],
  ['invoice route authenticates user', route, 'getAuthenticatedUser'],
  ['invoice route queries billing orders', route, ".from('billing_orders')"],
  ['invoice route ownership query uses legacy-safe columns', route, ".select('order_id, owner_id')"],
  ['invoice route reads optional Midtrans link columns separately', route, ".select('midtrans_redirect_url, midtrans_snap_token')"],
  ['invoice route scopes owner', route, ".eq('owner_id', auth.user.id)"],
  ['invoice route scopes order id', route, ".eq('order_id', orderId)"],
  ['invoice route fetches Midtrans status', route, '/v2/${orderId}/status'],
  ['invoice route returns Midtrans URL JSON', route, 'midtransUrl'],
  ['invoice route no-url response is not HTTP 404', route, "return NextResponse.json({ success: false, error: 'Midtrans receipt page is not available for this order.' });"],
  ['checkout stores Midtrans redirect URL', checkout, 'midtrans_redirect_url: checkout.checkoutUrl'],
  ['checkout stores Midtrans token', checkout, 'midtrans_snap_token: checkout.token'],
  ['migration adds redirect URL column', migration, 'midtrans_redirect_url'],
  ['migration adds snap token column', migration, 'midtrans_snap_token'],
  ['settings has download handler', settings, 'handleDownloadInvoice'],
  ['settings fetches invoice route', settings, '/api/account/invoices/'],
  ['settings opens Midtrans URL', settings, 'window.open(data.midtransUrl'],
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
