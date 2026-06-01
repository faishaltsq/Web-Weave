import { test, expect } from '@playwright/test';

test('Login and select company PT Risa Staging', async ({ page }) => {
  // Step 1: Navigate to the target URL
  await page.goto('https://hris-staging.kantorku.id/');
  
  // Wait for the page to fully load (network idle)
  await page.waitForLoadState('networkidle');

  // Step 2: Login form - fill in email/username
  // Using placeholder text as a best guess; adjust if actual placeholder differs
  const emailField = page.getByPlaceholder(/email|username|e-mail/i).first();
  await emailField.waitFor({ state: 'visible' });
  await emailField.fill('risa.stagingtest@gmail.com');

  // Step 3: Fill in password
  const passwordField = page.getByPlaceholder(/password|kata sandi/i).first();
  await passwordField.fill('stgtest123!');

  // Step 4: Click login button
  // Trying common roles/text for login button; adjust if needed
  const loginButton = page.getByRole('button', { name: /login|masuk|sign in/i }).first();
  await loginButton.click();

  // Step 5: Wait for navigation to main page / dashboard
  // Assert that we have moved away from the login page
  await expect(page).not.toHaveURL(/login|auth/i, { timeout: 10000 });
  // Optionally wait for the main menu container to appear
  const mainMenu = page.getByRole('navigation').or(page.locator('[data-testid="main-menu"]')).or(page.locator('.main-menu, .sidebar'));
  await mainMenu.waitFor({ state: 'visible', timeout: 15000 });

  // Step 6: Select company "PT Risa Staging"
  // This might be a dropdown, a list item, or a card. Use text matcher.
  // First, check if there is a company selector or if we are already on the selection page.
  // Often after login, HRIS systems show a list of companies to choose from.
  const companyItem = page.getByText('PT Risa Staging', { exact: true })
                         .or(page.getByRole('button', { name: /PT Risa Staging/i }))
                         .or(page.getByRole('option', { name: /PT Risa Staging/i }));
  
  // Wait for the company element to be visible and click it
  await companyItem.first().waitFor({ state: 'visible', timeout: 10000 });
  await companyItem.first().click();

  // Step 7: After selecting company, wait for next page/dashboard to load
  await page.waitForLoadState('networkidle');
  
  // Assert that the user is now on a dashboard or main page (adjust URL as necessary)
  await expect(page).toHaveURL(/dashboard|home|main|company/, { timeout: 10000 });
  
  // Additional check: verify that the selected company name is displayed somewhere on the page
  await expect(page.getByText('PT Risa Staging').first()).toBeVisible({ timeout: 5000 });
});