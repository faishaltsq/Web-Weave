const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // ---------- Helper Functions ----------
  // Wait for element by CSS or XPath (xpath= prefix) to be visible
  async function waitVisible(selector, label, timeout = 10000) {
    await page.waitForSelector(selector, { state: 'visible', timeout });
  }

  // Try an array of candidate selectors and return the first visible one
  async function resolveSelector(candidates, label, timeoutEach = 5000) {
    for (const sel of candidates) {
      try {
        await page.waitForSelector(sel, { state: 'visible', timeout: timeoutEach });
        return sel;
      } catch {
        // continue to next candidate
      }
    }
    throw new Error(
      `Could not find '${label}' using any of: ${candidates.join(', ')}`
    );
  }

  // Click the first matching visible element from candidates
  async function clickSafe(candidates, label) {
    const sel = await resolveSelector(candidates, label);
    await page.click(sel);
  }

  // Fill a text field matched by the first visible candidate
  async function fillSafe(candidates, value, label) {
    const sel = await resolveSelector(candidates, label);
    await page.fill(sel, value);
  }

  // ---------- Main Test Flow ----------
  try {
    // 1. Navigate to the site
    console.log('Navigating to https://otakudesu.blog/ ...');
    await page.goto('https://otakudesu.blog/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    // 2. Wait for search input to be visible
    console.log('Waiting for search input...');
    await resolveSelector(
      [
        '#search',
        '#s',
        'input[name="s"]',
        'input[placeholder*="Search"]',
        'input[type="search"]',
      ],
      'Search Input'
    );

    // 3. Fill the search box with "Kill Ao"
    console.log('Filling search box with "Kill Ao"...');
    await fillSafe(
      [
        '#search',
        '#s',
        'input[name="s"]',
        'input[placeholder*="Search"]',
        'input[type="search"]',
      ],
      'Kill Ao',
      'Search Input'
    );

    // 4. Submit the search (press Enter)
    console.log('Submitting search...');
    await page.keyboard.press('Enter');

    // 5. Wait for a search result link that contains "Kill Ao"
    console.log('Waiting for search results and clicking on "Kill Ao"...');
    await clickSafe(
      [
        'a:has-text("Kill Ao")',
        'xpath=//a[contains(text(),"Kill Ao")]',
        '.search-results a',
        '.post a',
        'article a',
        '#searchresults a',
        '.search-item',
      ],
      'Search Result Link'
    );

    // 6. Wait for the video/detail page to appear (look for a common video placeholder)
    console.log('Waiting for video page to load...');
    await resolveSelector(
      [
        '#video-player',
        '#player',
        '.video',
        '.embed',
        'h1:has-text("Kill Ao")',
        'div[class*="video"]',
      ],
      'Video Page Indicator'
    );

    // 7. Assert final URL contains "kill-ao" or page title includes it (optional proof)
    const finalUrl = page.url();
    const pageTitle = await page.title();
    console.log(`Current URL: ${finalUrl}`);
    console.log(`Page title: ${pageTitle}`);

    if (
      finalUrl.toLowerCase().includes('kill-ao') ||
      pageTitle.toLowerCase().includes('kill ao')
    ) {
      console.log('SUCCESS: Successfully navigated to the Kill Ao video page.');
    } else {
      console.warn('WARNING: Final page may not be exactly "Kill Ao". Check screenshot.');
    }
  } catch (error) {
    console.error('TEST FAILED:', error.message);
    // Save error screenshot
    await page.screenshot({ path: 'error-screenshot.png' });
    console.error('Screenshot saved to error-screenshot.png');
    process.exit(1);
  } finally {
    await browser.close();
  }
})();