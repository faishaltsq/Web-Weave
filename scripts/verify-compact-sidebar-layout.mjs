import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync(join(process.cwd(), 'src/app/(main)/page.module.css'), 'utf8');

const failures = [];

if (!css.includes('--collapsed-rail-width: 64px;')) {
  failures.push('Missing collapsed rail width variable for expand button spacing.');
}

if (/\.sidebarCompact\s*{[^}]*grid-template-columns:\s*0\s+minmax\(0,\s*1fr\)/s.test(css)) {
  failures.push('Collapsed sidebar uses 0px first column, so fixed expand button overlays page content.');
}

if (!/\.sidebarCompact\s*{[^}]*grid-template-columns:\s*var\(--collapsed-rail-width\)\s+minmax\(0,\s*1fr\)/s.test(css)) {
  failures.push('Collapsed sidebar must reserve a rail column before app content.');
}

if (!/\.sidebarCompact\s+\.expandButton\s*{[^}]*left:\s*calc\(\(var\(--collapsed-rail-width\)\s*-\s*38px\)\s*\/\s*2\)/s.test(css)) {
  failures.push('Expand button must be centered inside collapsed rail.');
}

if (failures.length) {
  console.error('Compact sidebar layout verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Compact sidebar layout verification passed.');
