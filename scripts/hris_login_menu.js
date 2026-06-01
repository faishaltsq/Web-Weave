const { chromium } = require('playwright');

/**
 * HRIS KantorKu - Login & Display Main Menu
 * 
 * Target: https://hris-staging.kantorku.id/
 * Credentials: risa.stagingtest@gmail.com / stgtest123!
 * 
 * Flow:
 * 1. Navigate to login page
 * 2. Fill email & password
 * 3. Click Sign In
 * 4. Handle Select Company page (click Continue to Dashboard)
 * 5. Extract & display main menu items
 */

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  try {
    // ── STEP 1: Navigate to Login Page ──
    console.log('[1/5] Navigating to HRIS KantorKu...');
    
    let loaded = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`    Attempt ${attempt}/3...`);
        await page.goto('https://hris-staging.kantorku.id/', {
          waitUntil: 'domcontentloaded',
          timeout: 90000
        });
        loaded = true;
        break;
      } catch (e) {
        console.log(`    Attempt ${attempt} failed: ${e.message.substring(0, 80)}`);
        if (attempt < 3) {
          console.log('    Retrying in 5 seconds...');
          await page.waitForTimeout(5000);
        }
      }
    }
    
    if (!loaded) {
      throw new Error('Failed to load HRIS page after 3 attempts');
    }

    // Wait for login form to be visible
    await page.waitForSelector('#email', { state: 'visible', timeout: 60000 });
    console.log('    Login form loaded ✓');

    // ── STEP 2: Fill Credentials ──
    console.log('[2/5] Filling credentials...');
    await page.fill('#email', 'risa.stagingtest@gmail.com');
    await page.fill('#password', 'stgtest123!');
    console.log('    Email & password filled ✓');

    // ── STEP 3: Submit Login ──
    console.log('[3/5] Signing in...');
    await page.click('button[type="submit"]');

    // Wait for redirect to select-company or dashboard
    await page.waitForURL('**/select-company**', { timeout: 60000 });
    console.log('    Login successful, redirected to Select Company ✓');

    // ── STEP 4: Handle Select Company Page ──
    console.log('[4/5] Selecting company...');
    await page.waitForTimeout(2000); // Wait for page content to render

    // Click Continue to Dashboard button
    const continueBtn = page.locator('button:has-text("Continue to Dashboard")');
    await continueBtn.waitFor({ state: 'visible', timeout: 15000 });

    // If button is disabled, try selecting a company first
    const isDisabled = await continueBtn.first().getAttribute('disabled');
    if (isDisabled !== null) {
      console.log('    Button disabled, selecting company...');
      // Click the first company radio/option if available
      const companyOption = page.locator('.ant-radio-wrapper').first();
      if (await companyOption.count() > 0) {
        await companyOption.click();
        await page.waitForTimeout(1000);
      }
    }

    await continueBtn.first().click({ force: true });
    console.log('    Continue to Dashboard clicked ✓');

    // ── STEP 5: Extract Main Menu ──
    console.log('[5/5] Extracting main menu items...');
    
    // Wait for SPA hydration - try multiple strategies
    console.log('    Waiting for page content to render...');
    try {
      // Wait for any navigation/sidebar element to appear
      await page.waitForSelector('.ant-menu, nav, .sidebar, [role="navigation"], .ant-layout-sider', { timeout: 15000 });
      console.log('    Navigation element found ✓');
    } catch (e) {
      console.log('    Navigation selector not found, waiting longer...');
      await page.waitForTimeout(8000);
    }
    
    // Additional wait for SPA content
    await page.waitForTimeout(5000);
    
    // Debug: check if page has content
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log(`    Page body text length: ${bodyText.length} chars`);
    if (bodyText.length < 50) {
      console.log('    Page still empty, waiting more...');
      await page.waitForTimeout(10000);
    }

    console.log('\n' + '='.repeat(60));
    console.log(`  Current URL: ${page.url()}`);
    console.log(`  Page Title: ${await page.title()}`);
    console.log('='.repeat(60));

    // Extract all menu items from the sidebar/navigation
    const menuItems = await page.evaluate(() => {
      const items = [];
      const seen = new Set();

      // Strategy 1: Ant Design menu items (common in HRIS apps)
      const selectors = [
        '.ant-menu-item a',
        '.ant-menu-item',
        '.ant-menu-title a',
        '.ant-menu-title',
        'nav a',
        'nav button',
        '.sidebar a',
        '.sidebar button',
        '.menu-item a',
        '.nav-item a',
        '[role="menuitem"]',
        '[role="navigation"] a',
        'a[href*="/dashboard"]',
        'a[href*="/employee"]',
        'a[href*="/attendance"]',
        'a[href*="/payroll"]',
        'a[href*="/leave"]',
        'a[href*="/reimbursement"]',
        'a[href*="/settings"]',
        'a[href*="/report"]',
        'a[href*="/announcement"]',
        'a[href*="/approval"]',
        'a[href*="/overtime"]',
        'a[href*="/claim"]',
        'a[href*="/loan"]',
        'a[href*="/training"]',
        'a[href*="/document"]',
        'a[href*="/organization"]',
        'a[href*="/team"]',
        'a[href*="/schedule"]',
        'a[href* "/shift"]',
        'a[href* "/holiday"]',
        'a[href* "/payslip"]',
        'a[href* "/benefit"]',
        'a[href* "/asset"]',
        'a[href* "/letter"]',
        'a[href* "/form"]',
        'a[href* "/task"]',
        'a[href* "/calendar"]',
        'a[href* "/notification"]',
        'a[href* "/profile"]'
      ];

      for (const sel of selectors) {
        try {
          document.querySelectorAll(sel).forEach(el => {
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') return;

            const text = el.innerText ? el.innerText.trim() : '';
            const href = el.getAttribute('href') || '';
            const tag = el.tagName.toLowerCase();

            if (text && text.length > 0 && text.length < 100) {
              const key = `${text}|${href}`;
              if (!seen.has(key)) {
                seen.add(key);
                items.push({ text, href, tag });
              }
            }
          });
        } catch (e) { /* skip invalid selectors */ }
      }

      // Strategy 2: All visible links with meaningful text
      document.querySelectorAll('a').forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return;

        const text = el.innerText ? el.innerText.trim() : '';
        const href = el.getAttribute('href') || '';

        if (text && text.length > 1 && text.length < 80 && !href.startsWith('http')) {
          const key = `${text}|${href}`;
          if (!seen.has(key)) {
            seen.add(key);
            items.push({ text, href, tag: 'a' });
          }
        }
      });

      // Strategy 3: All visible buttons
      document.querySelectorAll('button').forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return;

        const text = el.innerText ? el.innerText.trim() : '';
        if (text && text.length > 1 && text.length < 80) {
          const key = `${text}|button`;
          if (!seen.has(key)) {
            seen.add(key);
            items.push({ text, href: '', tag: 'button' });
          }
        }
      });

      return items;
    });

    // Display menu items
    if (menuItems.length === 0) {
      console.log('\n  ⚠ No menu items found. Trying alternative extraction...');
      
      // Try to get all links/buttons regardless of visibility
      const allElements = await page.evaluate(() => {
        const results = [];
        // Get ALL elements with text
        document.querySelectorAll('*').forEach(el => {
          const text = el.innerText ? el.innerText.trim() : '';
          const tag = el.tagName.toLowerCase();
          const href = el.getAttribute('href') || '';
          if (text && text.length > 1 && text.length < 60 && ['a', 'button', 'li', 'span'].includes(tag)) {
            results.push({ tag, text, href });
          }
        });
        return results.slice(0, 50);
      });
      
      if (allElements.length > 0) {
        console.log(`\n  📋 FOUND ${allElements.length} TEXT ELEMENTS:`);
        allElements.forEach((el, i) => {
          console.log(`  • ${el.tag}: "${el.text}" ${el.href ? '→ ' + el.href : ''}`);
        });
      } else {
        console.log('  Page content preview:');
        const preview = await page.evaluate(() => document.body.innerHTML.substring(0, 2000));
        console.log(preview);
      }
    } else {
      console.log(`\n  📋 MAIN MENU ITEMS (${menuItems.length} found):`);
      console.log('  ' + '-'.repeat(50));
      menuItems.forEach((item, i) => {
        const href = item.href ? ` → ${item.href}` : '';
        const icon = item.tag === 'button' ? '🔘' : '🔗';
        console.log(`  ${icon} [${String(i + 1).padStart(2)}] ${item.text}${href}`);
      });
    }

    // Take screenshot of dashboard
    await page.screenshot({
      path: 'c:\\Users\\faishaltsq\\Documents\\Kerjaan\\Things that i want to build\\WebWeave\\dashboard_menu.png',
      fullPage: false
    });
    console.log('\n  📸 Screenshot saved: dashboard_menu.png');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({
      path: 'c:\\Users\\faishaltsq\\Documents\\Kerjaan\\Things that i want to build\\WebWeave\\error_screenshot.png',
      fullPage: false
    }).catch(() => {});
    console.log('  📸 Error screenshot saved: error_screenshot.png');
  } finally {
    await browser.close();
    console.log('\n✅ Browser closed.');
  }
})();
