const { chromium } = require('playwright');
const path = require('path');

async function main() {
  const htmlPath = path.join(__dirname, '..', 'docs', 'midtrans', 'onboarding-content.html');
  const pdfPath = path.join(__dirname, '..', 'docs', 'midtrans', 'webweave-midtrans-onboarding-process.pdf');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`;
  await page.goto(fileUrl, { waitUntil: 'networkidle' });

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    margin: { top: '40px', right: '50px', bottom: '40px', left: '50px' },
    printBackground: true,
  });

  await browser.close();
  console.log('PDF saved to', pdfPath);
}

main().catch((err) => {
  console.error('PDF generation failed:', err);
  process.exit(1);
});
