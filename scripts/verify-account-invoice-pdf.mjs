import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];

const files = {
  pkg: 'package.json',
  route: 'src/app/api/account/invoices/[orderId]/route.js',
  settings: 'src/components/SettingsModal.js',
  css: 'src/components/SettingsModal.module.css',
  translations: 'src/lib/i18n/translations.js',
};

for (const [label, path] of Object.entries(files)) {
  if (!existsSync(join(root, path))) failures.push(`${label}: missing ${path}`);
}

const pkg = existsSync(join(root, files.pkg)) ? read(files.pkg) : '';
const route = existsSync(join(root, files.route)) ? read(files.route) : '';
const settings = existsSync(join(root, files.settings)) ? read(files.settings) : '';
const css = existsSync(join(root, files.css)) ? read(files.css) : '';
const translations = existsSync(join(root, files.translations)) ? read(files.translations) : '';

const expectations = [
  ['pdf-lib dependency exists', pkg, '"pdf-lib"'],
  ['invoice route imports PDFDocument', route, 'import { PDFDocument'],
  ['invoice route authenticates user', route, 'getAuthenticatedUser'],
  ['invoice route queries billing orders', route, ".from('billing_orders')"],
  ['invoice route scopes owner', route, ".eq('owner_id', auth.user.id)"],
  ['invoice route scopes order id', route, ".eq('order_id', orderId)"],
  ['invoice route returns PDF content type', route, "'Content-Type': 'application/pdf'"],
  ['invoice route returns attachment filename', route, 'Content-Disposition'],
  ['settings has download handler', settings, 'handleDownloadInvoice'],
  ['settings fetches invoice route', settings, '/api/account/invoices/'],
  ['settings downloads blob', settings, 'response.blob()'],
  ['settings invoice rows are buttons', settings, 'className={styles.invoiceItem}'],
  ['settings has download error text', translations, 'invoiceDownloadError'],
  ['css plan value has spacing class', css, '.planValue'],
  ['css invoice row cursor pointer', css, 'cursor: pointer'],
];

for (const [label, source, token] of expectations) {
  if (!source.includes(token)) failures.push(`${label}: missing "${token}"`);
}

if (failures.length) {
  console.error('Account invoice PDF verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Account invoice PDF verification passed.');
