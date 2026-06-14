const { chromium } = require('playwright');
const { setTimeout } = require('timers/promises');

const RESOLVE_TIMEOUT = 5000;
const BASE_URL = 'https://otakudesu.blog/';

// ---------- Helper Functions ----------

// Wait for an element with the given CSS selector to be visible
async function waitForElement(page, selector, label, timeout = RESOLVE_TIMEOUT) {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout });
  return element;
}

// Try multiple candidate selectors and return the first visible element
async function resolveElement(page, candidates, label) {
  for (const candidate of candidates) {
    try {
      const element = page.locator(candidate);
      await element.waitFor({ state: 'visible', timeout: 3000 });
      console.log(`[OK] ${label} found with selector: ${candidate}`);
      return element;
    } catch (e) {
      // continue to next candidate
    }
  }
  throw new Error(`[FAIL] ${label} not found with any of the candidates: ${JSON.stringify(candidates)}`);
}

// Click on an element resolved by candidate selectors
async function clickSafe(page, candidates, label) {
  const element = await resolveElement(page, candidates, label);
  await element.click();
  console.log(`[ACTION] Clicked ${label}`);
}

// Fill text into an element resolved by candidate selectors
async function fillSafe(page, candidates, value, label) {
  const element = await resolveElement(page, candidates, label);
  await element.fill(value);
  console.log(`[ACTION] Filled ${label} with "${value}"`);
}

// Press Enter on an already resolved element
async function pressEnterOnElement(page, candidates, label) {
  const element = await resolveElement(page, candidates, label);
  await element.press('Enter');
  console.log(`[ACTION] Pressed Enter on ${label}`);
}

// ---------- Main Script ----------

(async () => {
  let browser;
  try {
    // Launch browser
    browser = await chromium.launch({ headless: false, args: ['--no-sandbox'] });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();

    // Navigate to site
    console.log('[NAV] Opening site...');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Step 1: Search for "Kill Ao"
    const searchInputCandidates = [
      'input[type="search"]',
      'input[name="s"]',
      'input#search',
      'input[placeholder*="Cari"]',
      'input[name="q"]',
      '.search-form input[type="text"]',
      '#searchform input',
      'input[placeholder*="anime"]'
    ];
    await fillSafe(page, searchInputCandidates, 'Kill Ao', 'Search Input');
    await pressEnterOnElement(page, searchInputCandidates, 'Search Input');

    // Wait for search results to load
    await page.waitForTimeout(2000);

    // Step 2: Click on the anime "Kill Ao" in the results
    const animeLinkCandidates = [
      `a:has-text("Kill Ao")`,
      `a:has-text("Kill Ao") >> visible=true`,
      `.post-title a:has-text("Kill Ao")`,
      `h2 a:has-text("Kill Ao")`,
      `article a:has-text("Kill Ao")`,
      `a[title*="Kill Ao"]`
    ];
    await clickSafe(page, animeLinkCandidates, 'Anime Link');

    // Wait for the anime detail page to load (detect heading or episode list container)
    await page.waitForSelector('h1, .episodes, .episode-list, #episode-list, .batch-episode', {
      timeout: 15000
    }).catch(() => console.log('[WARN] Could not find typical anime page elements, proceeding anyway...'));

    // Step 3: Find and click Episode 10
    const episodeCandidates = [
      `a:has-text("Episode 10")`,
      `a.episode-link:has-text("10")`,
      `.episode-list a:has-text("10")`,
      `a[href*="/episode-10"]`,
      `a[href*="/episode/10"]`,
      `a[href*="-episode-10"]`,
      `.episode a:has-text("10")`,
      `a[data-episode="10"]`
    ];
    await clickSafe(page, episodeCandidates, 'Episode 10 Link');

    // Step 4: Wait for the video page to load
    await page.waitForTimeout(3000);

    // Wait for the URL to contain an episode/video indicator
    await page.waitForFunction(
      () => window.location.href.includes('episode') || window.location.href.includes('video') || window.location.href.includes('play'),
      { timeout: 20000 }
    ).catch(() => console.log('[WARN] URL did not change to expected pattern, but continuing...'));

    // Wait for a video player or player container
    const videoCandidates = [
      '#player',
      '.player',
      'video',
      'iframe[src*="player"]',
      '#video-player',
      '.video-container',
      '.embed-responsive'
    ];
    try {
      await resolveElement(page, videoCandidates, 'Video Player');
      console.log('[SUCCESS] Video player is visible on the page');
    } catch (e) {
      console.warn('[WARN] Could not detect a video player, but the page may have loaded correctly');
    }

    // Final verification: take screenshot and print URL
    await page.screenshot({ path: 'final_state.png' });
    console.log('[DONE] Script completed successfully!');
    console.log(`Final URL: ${page.url()}`);

    await browser.close();
    process.exit(0);

  } catch (error) {
    console.error('[ERROR]', error.message);
    if (browser) {
      try {
        const pages = await browser.contexts()[0]?.pages();
        if (pages && pages.length > 0) {
          await pages[0].screenshot({ path: 'error_state.png' });
          console.log('[INFO] Error screenshot saved as error_state.png');
        }
      } catch (e) {
        console.error('[EXTRA] Could not take screenshot:', e.message);
      }
      await browser.close();
    }
    process.exit(1);
  }
})();