import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pricingSource = readFileSync(join(process.cwd(), 'src/components/PricingPage.js'), 'utf8');
const pricingStyles = readFileSync(join(process.cwd(), 'src/components/PricingPage.module.css'), 'utf8');
const pageSource = readFileSync(join(process.cwd(), 'src/app/page.js'), 'utf8');
const pageStyles = readFileSync(join(process.cwd(), 'src/app/page.module.css'), 'utf8');

const expectations = [
  ['monthly/annual state exists', pricingSource, 'billingCycle'],
  ['CTA mock feedback exists', pricingSource, 'actionMessage'],
  ['CTA plan buttons call mock checkout', pricingSource, 'handlePlanClick(plan)'],
  ['CTA final section calls starter mock', pricingSource, 'handlePrimaryCta'],
  ['Free plan remains available', pricingSource, 'Rp0'],
  ['Starter recommendation is affordable', pricingSource, 'Rp49.000'],
  ['Pro recommendation is affordable', pricingSource, 'Rp129.000'],
  ['Team recommendation is affordable', pricingSource, 'Rp299.000'],
  ['Free quota is generous enough to try', pricingSource, '30 generations/bulan'],
  ['Starter quota is increased for cheap token usage', pricingSource, '500 generations/bulan'],
  ['Pro quota is increased for sprint usage', pricingSource, '2.000 generations/bulan'],
  ['Team quota is increased for small-team usage', pricingSource, '8.000 generations/bulan'],
  ['Team plan is temporarily disabled', pricingSource, 'disabled: true'],
  ['Team CTA uses disabled label', pricingSource, 'Coming soon'],
  ['Team plan button has disabled attribute', pricingSource, 'disabled={plan.disabled}'],
  ['Team card has disabled styling hook', pricingSource, 'disabledCard'],
  ['Disabled Team button has disabled styling hook', pricingSource, 'disabledButton'],
  ['Disabled Team card hover is neutralized', pricingStyles, 'disabledCard:hover'],
  ['Disabled Team button cannot be clicked', pricingStyles, 'cursor: not-allowed'],
  ['Generous quota rationale exists', pricingSource, 'quota longgar'],
  ['Indonesian/localized pricing copy exists', pricingSource, 'Harga masuk akal'],
  ['Annual savings are calculated/displayed', pricingSource, 'hemat 20%'],
  ['close animation state exists', pageSource, 'pricingClosing'],
  ['close animation handler exists', pageSource, 'handleClosePricing'],
  ['pricing modal uses animated close handler', pageSource, 'onClose={handleClosePricing}'],
  ['close animation class exists', pageStyles, 'pricingModalClosing'],
];

const missing = expectations.filter(([, source, token]) => !source.includes(token));

if (missing.length) {
  console.error('Pricing page verification failed:');
  for (const [label, , token] of missing) {
    console.error(`- ${label}: missing "${token}"`);
  }
  process.exit(1);
}

console.log('Pricing page verification passed.');
