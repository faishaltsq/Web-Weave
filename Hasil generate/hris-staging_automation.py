import time
from playwright.sync_api import sync_playwright, expect

def main():
    with sync_playwright() as p:
        # Launch browser (headless=False to see interaction)
        browser = p.chromium.launch(headless=False, slow_mo=500)
        page = browser.new_page()

        try:
            # Navigate to target URL
            page.goto("https://hris-staging.kantorku.id/", wait_until="networkidle")
            page.set_viewport_size({"width": 1366, "height": 768})

            # --- LOGIN ---
            # Wait for email input (expected placeholder or label)
            email_input = page.get_by_placeholder("Email")  # adjust selector if needed
            email_input.wait_for(state="visible", timeout=15000)
            email_input.fill("risa.stagingtest@gmail.com")

            password_input = page.get_by_placeholder("Password")  # adjust selector if needed
            password_input.fill("stgtest123!")

            # Click login button (expected role "button", name "Login")
            login_button = page.get_by_role("button", name="Login")
            login_button.click()

            # Wait for dashboard to load (e.g., presence of sidebar menu)
            page.wait_for_timeout(3000)  # fallback wait
            # Better: wait for a specific element after successful login, e.g., a user avatar or sidebar
            page.wait_for_selector("text=Dashboard", timeout=20000)  # adjust expected text

            # --- NAVIGATE TO KPI ---
            # Click on "KPI" menu in sidebar/navbar
            # Use text matcher, could also be role="link" with name "KPI"
            page.get_by_text("KPI").first.click()
            page.wait_for_timeout(2000)

            # --- ADD KPI ---
            # Click "Add KPI" button (expected text)
            page.get_by_role("button", name="Add KPI").first.click()
            # Or use: page.get_by_text("Add KPI").click()

            # Wait for KPI form modal to appear
            kpi_form = page.locator(".modal-content")  # adjust modal container
            kpi_form.wait_for(state="visible", timeout=10000)

            # Fill KPI Name field (placeholder like "Enter KPI Name")
            page.get_by_placeholder("Enter KPI Name").fill("Test KPI from Automation")

            # Select Target Type: "Basic" (assume dropdown)
            # Locate dropdown by label or aria-label or placeholder
            target_type_dropdown = page.get_by_label("Target Type")  # adjust selector
            target_type_dropdown.select_option("Basic")  # the value might be "basic"

            # If there are other required fields (e.g., target value, period), fill them as needed
            # Example: target value input
            # page.get_by_placeholder("Target Value").fill("100")

            # Submit the form (button might be "Save", "Submit", "Create")
            submit_button = page.get_by_role("button", name="Submit")
            submit_button.click()

            # Wait for success notification
            page.wait_for_timeout(2000)
            success_toast = page.locator(".toast-success")  # adjust toast class
            expect(success_toast).to_be_visible()

            print("KPI added successfully!")

        except Exception as e:
            print(f"An error occurred: {e}")
            # Take screenshot for debugging
            page.screenshot(path="debug_screenshot.png")
        finally:
            browser.close()

if __name__ == "__main__":
    main()