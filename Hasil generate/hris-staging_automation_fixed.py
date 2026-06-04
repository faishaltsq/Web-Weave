import time
from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        page.set_default_timeout(120000)

        try:
            # STEP 1: Navigate (no wait_until to avoid timeout on slow sites)
            print("[1/6] Navigating to HRIS KantorKu...")
            for attempt in range(1, 4):
                try:
                    page.goto("https://hris-staging.kantorku.id/", timeout=120000)
                    break
                except Exception as e:
                    print(f"    Attempt {attempt}/3 failed, retrying...")
                    time.sleep(5)

            # Wait for login form to be ready
            page.wait_for_selector("#email", state="visible", timeout=120000)
            print("    Login form loaded")

            # STEP 2: Fill credentials with CORRECT selectors
            print("[2/6] Filling credentials...")
            page.fill("#email", "risa.stagingtest@gmail.com")
            page.fill("#password", "stgtest123!")
            print("    Email & password filled")

            # STEP 3: Click Sign In
            print("[3/6] Submitting login...")
            page.click("button[type='submit']")

            # STEP 4: Handle Select Company page
            print("[4/6] Handling Select Company...")
            page.wait_for_url("**/select-company**", timeout=120000)
            time.sleep(2)

            # Click Continue to Dashboard (force if disabled)
            continue_btn = page.locator("button:has-text('Continue to Dashboard')")
            continue_btn.wait_for(state="visible", timeout=30000)

            if continue_btn.is_disabled():
                print("    Selecting first company...")
                radio = page.locator(".ant-radio-wrapper").first
                if radio.count() > 0:
                    radio.click()
                    time.sleep(1)
            continue_btn.first.click(force=True)
            print("    Continued to Dashboard")

            # STEP 5: Wait for dashboard to load
            print("[5/6] Loading dashboard...")
            time.sleep(5)
            print(f"    URL: {page.url}")
            print(f"    Title: {page.title}")

            # STEP 6: Extract main menu items
            print("[6/6] Extracting main menu...")
            menu_items = page.evaluate("""() => {
                const items = [];
                const seen = new Set();
                const selectors = [
                    'nav a', '.ant-menu-item a', '.ant-menu-item',
                    '.sidebar a', '[role="menuitem"]', '[role="navigation"] a',
                    'a[href*="/dashboard"]', 'a[href*="/employee"]',
                    'a[href*="/attendance"]', 'a[href*="/payroll"]',
                    'a[href*="/leave"]', 'a[href*="/reimbursement"]',
                    'a[href*="/settings"]', 'a[href*="/kpi"]'
                ];
                for (const sel of selectors) {
                    try {
                        document.querySelectorAll(sel).forEach(el => {
                            const style = window.getComputedStyle(el);
                            if (style.display === 'none' || style.visibility === 'hidden') return;
                            const text = el.innerText ? el.innerText.trim() : '';
                            const href = el.getAttribute('href') || '';
                            if (text && text.length > 0 && text.length < 100) {
                                const key = text + '|' + href;
                                if (!seen.has(key)) { seen.add(key); items.push({text, href}); }
                            }
                        });
                    } catch(e) {}
                }
                return items;
            }""")

            print(f"\n    === MAIN MENU ({len(menu_items)} items) ===")
            for item in menu_items[:30]:
                h = item.get("href", "")
                print(f"    - {item['text']}{' -> ' + h if h else ''}")

            page.screenshot(path="hris_dashboard.png")
            print("\nScreenshot saved: hris_dashboard.png")
            print("Script completed successfully")

        except Exception as e:
            print(f"\nError: {e}")
            try:
                page.screenshot(path="hris_error.png")
                print("Error screenshot saved: hris_error.png")
            except:
                pass
        finally:
            browser.close()

if __name__ == "__main__":
    main()
