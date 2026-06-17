import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];

const files = {
  page: 'src/app/(main)/page.js',
  scriptsPage: 'src/components/ScriptsPage.js',
};

for (const [label, path] of Object.entries(files)) {
  if (!existsSync(join(root, path))) failures.push(`${label}: missing ${path}`);
}

const page = existsSync(join(root, files.page)) ? read(files.page) : '';
const scriptsPage = existsSync(join(root, files.scriptsPage)) ? read(files.scriptsPage) : '';

const expectations = [
  ['ScriptsPage renders saved history list', scriptsPage, 'const scriptLibrary = scripts || [];'],
  ['ScriptsPage maps saved history list', scriptsPage, 'scriptLibrary.map((script, index)'],
  ['ScriptsPage computes overflow from plan slots', scriptsPage, 'const locked = index >= slotLimit;'],
  ['ScriptsPage counts used slots from saved scripts', scriptsPage, 'Math.min(scriptLibrary.length, slotLimit)'],
  ['ScriptsPage does not read local device cloud ids', scriptsPage, 'getCloudScriptIds'],
  ['ScriptsPage does not filter by local cloud ids', scriptsPage, 'cloudScriptIds.includes'],
  ['Chats does not use local cloud import state', page, 'getCloudScriptIds'],
  ['Chats does not render device-only cloud import button', page, 'chatItemImport'],
];

for (const [label, source, token] of expectations) {
  const shouldBeAbsent = label.includes('does not');
  const hasToken = source.includes(token);
  if (shouldBeAbsent ? hasToken : !hasToken) failures.push(`${label}: ${shouldBeAbsent ? 'must not include' : 'missing'} "${token}"`);
}

if (failures.length) {
  console.error('Mobile scripts history-source verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Mobile scripts history-source verification passed.');
