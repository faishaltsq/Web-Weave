import { readFileSync } from 'node:fs';

const files = {
  mainCss: 'src/app/(main)/page.module.css',
  mainJs: 'src/app/(main)/page.js',
  projectsCss: 'src/components/ProjectsPage.module.css',
  scriptsCss: 'src/components/ScriptsPage.module.css',
  pricingCss: 'src/components/PricingPage.module.css',
  confirmCss: 'src/components/ConfirmDialog.module.css',
  settingsCss: 'src/components/SettingsModal.module.css',
};

const read = (path) => readFileSync(path, 'utf8');
const source = Object.fromEntries(Object.entries(files).map(([key, path]) => [key, read(path)]));

function fail(message) {
  console.error(message);
  process.exit(1);
}

function getMediaBlock(css, query) {
  const start = css.indexOf(`@media ${query}`);
  if (start === -1) return '';
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    if (css[index] === '}') depth -= 1;
    if (depth === 0) return css.slice(open + 1, index);
  }
  return '';
}

function requireMatch(name, text, pattern) {
  if (!pattern.test(text)) fail(`Missing responsive guardrail: ${name}`);
}

const mainMobile = getMediaBlock(source.mainCss, '(max-width: 760px)');

requireMatch('main CSS defines mobile rail width', source.mainCss, /--mobile-rail-width:\s*64px/);
requireMatch('mobile media exists', source.mainCss, /@media\s*\(max-width:\s*760px\)/);
requireMatch('mobile sidebar stays visible', mainMobile, /\.sidebar\s*{[^}]*display:\s*flex[^}]*position:\s*fixed[^}]*width:\s*var\(--mobile-rail-width\)/s);
requireMatch('mobile sidebar not hidden', mainMobile, /\.sidebar\s*{(?![^}]*display:\s*none)/s);
requireMatch('mobile app surface assigned to rail column', mainMobile, /\.appSurface\s*{[^}]*grid-column:\s*2[^}]*overflow-y:\s*auto/s);
requireMatch('mobile uses dvh in shell', mainMobile, /100dvh/);
requireMatch('mobile nav labels hidden through spans', mainMobile, /\.navList\s+button\s+span[^}]*display:\s*none/s);
requireMatch('new automation button has icon', source.mainJs, /className=\{styles\.newChatButton\}[^>]*>[\s\S]*<Sparkles\s+size=\{16\}/);
requireMatch('home nav label wrapped', source.mainJs, /<Home\s+size=\{18\}\s*\/?>\s*<span>Home<\/span>/);
requireMatch('projects nav label wrapped', source.mainJs, /<Folder\s+size=\{18\}\s*\/?>\s*<span>Projects<\/span>/);
requireMatch('chats nav label wrapped', source.mainJs, /<MessageSquare\s+size=\{18\}\s*\/?>\s*<span>Chats<\/span>/);
requireMatch('scripts nav label wrapped', source.mainJs, /<FileCode2\s+size=\{18\}\s*\/?>\s*<span>Automation Scripts<\/span>/);
requireMatch('workspace mobile natural scroll', mainMobile, /\.workspaceLayout\s*{[^}]*height:\s*auto[^}]*overflow:\s*visible/s);
requireMatch('prompt rail mobile max-height removed', mainMobile, /\.promptRail\s*{[^}]*max-height:\s*none/s);
requireMatch('workspace panel mobile auto height', mainMobile, /\.workspacePanel\s*{[^}]*height:\s*auto[^}]*max-height:\s*none/s);
requireMatch('mobile composer stacks controls', mainMobile, /\.composerMeta\s*{[^}]*grid-template-columns:\s*1fr/s);

requireMatch('projects mobile one column', source.projectsCss, /@media\s*\(max-width:\s*760px\)[\s\S]*\.grid\s*{[^}]*grid-template-columns:\s*1fr/s);
requireMatch('scripts tablet or mobile grid guardrail', source.scriptsCss, /@media\s*\(max-width:\s*1024px\)[\s\S]*\.summaryGrid\s*{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
requireMatch('scripts mobile one column', source.scriptsCss, /@media\s*\(max-width:\s*760px\)[\s\S]*\.summaryGrid\s*{[^}]*grid-template-columns:\s*1fr/s);
requireMatch('pricing mobile one column', source.pricingCss, /@media\s*\(max-width:\s*760px\)[\s\S]*\.cardsGrid\s*{[^}]*grid-template-columns:\s*1fr/s);
requireMatch('confirm dialog mobile actions stack', source.confirmCss, /@media\s*\(max-width:\s*520px\)[\s\S]*\.actions\s*{[^}]*flex-direction:\s*column/s);
requireMatch('settings modal mobile query', source.settingsCss, /@media\s*\(max-width:\s*520px\)/);
requireMatch('settings language buttons stack', source.settingsCss, /@media\s*\(max-width:\s*520px\)[\s\S]*\.langOptions\s*{[^}]*flex-direction:\s*column/s);

console.log('Mobile/tablet responsive CSS verified.');
