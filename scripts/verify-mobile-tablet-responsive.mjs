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

function getMediaBlocks(css, query) {
  const blocks = [];
  const target = query.replace(/\s+/g, '');
  const mediaPattern = /@media\s*/g;
  let match;

  while ((match = mediaPattern.exec(css)) !== null) {
    const queryStart = mediaPattern.lastIndex;
    const open = css.indexOf('{', queryStart);
    if (open === -1) break;

    const current = css.slice(queryStart, open).replace(/\s+/g, '');
    let depth = 0;
    for (let index = open; index < css.length; index += 1) {
      if (css[index] === '{') depth += 1;
      if (css[index] === '}') depth -= 1;
      if (depth === 0) {
        if (current === target) blocks.push(css.slice(open + 1, index));
        mediaPattern.lastIndex = index + 1;
        break;
      }
    }
  }

  return blocks.join('\n');
}

function requireMatch(name, text, pattern) {
  if (!pattern.test(text)) fail(`Missing responsive guardrail: ${name}`);
}

function requireNoMatch(name, text, pattern) {
  if (pattern.test(text)) fail(`Unexpected responsive regression: ${name}`);
}

function verifyMediaExtraction() {
  const css = '.outside{color:black;} @media(max-width:760px){.first{color:red;}} @media (max-width: 760px) {.second{color:blue;}}';
  const mobile = getMediaBlocks(css, '(max-width: 760px)');

  if (!mobile.includes('.first') || !mobile.includes('.second') || mobile.includes('.outside')) {
    fail('Broken responsive verifier: media extraction does not collect all matching blocks');
  }
}

verifyMediaExtraction();

const mainMobile = getMediaBlocks(source.mainCss, '(max-width: 760px)');
const projectsMobile = getMediaBlocks(source.projectsCss, '(max-width: 760px)');
const scriptsTablet = getMediaBlocks(source.scriptsCss, '(max-width: 1024px)');
const scriptsMobile = getMediaBlocks(source.scriptsCss, '(max-width: 760px)');
const pricingMobile = getMediaBlocks(source.pricingCss, '(max-width: 760px)');
const confirmPhone = getMediaBlocks(source.confirmCss, '(max-width: 520px)');
const settingsPhone = getMediaBlocks(source.settingsCss, '(max-width: 520px)');

requireMatch('main CSS defines mobile rail width', source.mainCss, /--mobile-rail-width:\s*64px/);
requireMatch('mobile media exists', source.mainCss, /@media\s*\(max-width:\s*760px\)/);
requireMatch('mobile sidebar stays visible', mainMobile, /\.sidebar\s*{[^}]*display:\s*flex[^}]*position:\s*fixed[^}]*width:\s*var\(--mobile-rail-width\)/s);
requireNoMatch('mobile sidebar hidden', mainMobile, /\.sidebar\s*{[^}]*display:\s*none/s);
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

requireMatch('projects mobile one column', projectsMobile, /\.grid\s*{[^}]*grid-template-columns:\s*1fr/s);
requireMatch('scripts tablet or mobile grid guardrail', scriptsTablet, /\.summaryGrid\s*{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
requireMatch('scripts mobile one column', scriptsMobile, /\.summaryGrid\s*{[^}]*grid-template-columns:\s*1fr/s);
requireMatch('pricing mobile one column', pricingMobile, /\.cardsGrid\s*{[^}]*grid-template-columns:\s*1fr/s);
requireMatch('confirm dialog mobile actions stack', confirmPhone, /\.actions\s*{[^}]*flex-direction:\s*column/s);
requireMatch('settings modal mobile query', settingsPhone, /\S/);
requireMatch('settings language buttons stack', settingsPhone, /\.langOptions\s*{[^}]*flex-direction:\s*column/s);

console.log('Mobile/tablet responsive CSS verified.');
