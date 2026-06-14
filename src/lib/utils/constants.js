export const FRAMEWORKS = [
  { value: 'playwright_js', label: 'Playwright JavaScript' },
  { value: 'playwright_python', label: 'Playwright Python' },
  { value: 'puppeteer_js', label: 'Puppeteer JavaScript' },
  { value: 'selenium_python', label: 'Selenium Python' },
  { value: 'cypress_js', label: 'Cypress JavaScript' },
];

export function getFileExtension(frameworkValue) {
  const extMap = {
    playwright_js: 'js',
    playwright_python: 'py',
    puppeteer_js: 'js',
    selenium_python: 'py',
    cypress_js: 'cy.js',
  };
  return extMap[frameworkValue] || 'txt';
}

export function getScriptDisplayName(script) {
  if (!script?.target_url) return FRAMEWORKS.find((f) => f.value === script.framework)?.label || 'Script';
  try {
    const hostname = new URL(script.target_url).hostname.replace(/^www\./, '');
    const isRegeneration = (script.prompt || '').includes('Regeneration feedback');
    return isRegeneration ? `${hostname} (revisi)` : hostname;
  } catch {
    return script.target_url;
  }
}
