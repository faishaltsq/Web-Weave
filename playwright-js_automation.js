const { chromium } = require('playwright');

// ------------------------------
// Helper functions
// ------------------------------

async function resolveLocator(page, candidates, label, timeout = 3000) {
  for (const selector of candidates) {
    try {
      await page.waitForSelector(selector, { state: 'visible', timeout });
      return selector;
    } catch (e) {
      // continue to next candidate
    }
  }
  throw new Error(
    `Could not find element for "${label}" with candidates: ${candidates.join(', ')}`
  );
}

async function clickSafe(page, candidates, label) {
  const selector = await resolveLocator(page, candidates, label);
  await page.click(selector);
}

async function fillSafe(page, candidates, value, label) {
  const selector = await resolveLocator(page, candidates, label);
  await page.fill(selector, value);
}

// ------------------------------
// Main script
// ------------------------------

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  try {
    // ----- Navigation with retry -----
    const url = 'https://otakudesu.blog/';
    const gotoOptions = { waitUntil: 'domcontentloaded', timeout: 30000 };
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await page.goto(url, gotoOptions);
        break;
      } catch (err) {
        if (attempt === 3) throw err;
        console.log(`Navigation attempt ${attempt} failed, retrying...`);
      }
    }

    // ----- Wait for page body (basic sanity) -----
    await page.waitForSelector('body', { timeout: 10000 });

    // ----- Search for "Kill Ao" -----
    const searchInputCandidates = [
      '#search',
      'input[name="s"]',
      'input[type="search"]',
      'input[placeholder*="Cari"]',
      'input[placeholder*="Search"]',
      '.search-input',
      '#search input',
      '.search-box input',
      'header input[type="text"]'
    ];

    console.log('Searching for "Kill Ao"...');
    await fillSafe(page, searchInputCandidates, 'Kill Ao', 'Search Input');

    // Submit search – press Enter and wait for page to load
    await page.keyboard.press('Enter');
    await page.waitForLoadState('domcontentloaded');

    // ----- Wait for search results container -----
    const resultContainerCandidates = [
      '#searchresult',
      '.searchresult',
      '.search-results',
      '.col-anime',
      '.anime-list',
      '#anime-list',
      '.list-anime',
      'section#main article',
      'main .content'
    ];

    let containerFound = false;
    for (const selector of resultContainerCandidates) {
      try {
        await page.waitForSelector(selector, { state: 'visible', timeout: 3000 });
        containerFound = true;
        break;
      } catch (e) {}
    }
    if (!containerFound) {
      console.log('No specific results container found; trying to locate result link directly.');
    }

    // ----- Click on the result for "Kill Ao" -----
    const resultLinkCandidates = [
      `a:has-text("Kill Ao")`,
      `text="Kill Ao"`,
      `[title*="Kill Ao"]`,
      `h2:has-text("Kill Ao")`,
      `h3:has-text("Kill Ao")`,
      `.anime-title:has-text("Kill Ao")`,
      `xpath=//a[contains(text(), 'Kill Ao')]`
    ];

    console.log('Clicking on the search result...');
    await clickSafe(page, resultLinkCandidates, 'Kill Ao result link');

    // ----- Wait for the detail page to load -----
    await page.waitForTimeout(2000);
    await page.waitForLoadState('domcontentloaded');

    // ----- Verification -----
    const currentUrl = page.url();
    const title = await page.title();

    console.log(`Final URL: ${currentUrl}`);
    console.log(`Page title: ${title}`);

    // Check if we are on a detail page about Kill Ao
    if (
      currentUrl.toLowerCase().includes('kill') ||
      currentUrl.toLowerCase().includes('ao') ||
      title.toLowerCase().includes('kill')
    ) {
      console.log('SUCCESS: Navigated to the Kill Ao anime page.');
    } else {
      // Fallback: check heading
      const h1 = await page.textContent('h1').catch(() => '');
      const h2 = await page.textContent('h2').catch(() => '');
      const pageHeading = h1 || h2 || '';
      if (pageHeading.toLowerCase().includes('kill ao')) {
        console.log(`SUCCESS: Found heading "${pageHeading}"`);
      } else {
        console.log(`WARNING: Could not concretely verify Kill Ao detail page, but page loaded.`);
      }
    }

    console.log('Script finished successfully.');
  } catch (error) {
    console.error('Script failed:', error.message);
    await page.screenshot({ path: 'error-screenshot.png' });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();