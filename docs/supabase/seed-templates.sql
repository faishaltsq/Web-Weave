ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS category text;

INSERT INTO public.templates (owner_id, name, prompt, framework, visibility, category) VALUES
(
  '00000000-0000-0000-0000-000000000000',
  'Login Test',
  'Generate a login automation script that tests both valid and invalid credentials. Verify success redirect after valid login, and error message display for invalid credentials. Include checks for password visibility toggle and "remember me" checkbox if present.',
  'playwright_js', 'public', 'login'
),
(
  '00000000-0000-0000-0000-000000000000',
  'Login Test',
  'Generate a Cypress login test that validates email/password fields, tests invalid credentials show error, and verifies successful login redirects to dashboard. Use data-cy attributes for selectors.',
  'cypress_js', 'public', 'login'
),
(
  '00000000-0000-0000-0000-000000000000',
  'Form Fill & Validation',
  'Generate a Playwright script that fills all input fields in a form, checks required field validation messages, tests email format validation, and verifies successful form submission with a success toast.',
  'playwright_js', 'public', 'forms'
),
(
  '00000000-0000-0000-0000-000000000000',
  'Form Fill & Validation',
  'Generate a Selenium Python script that fills a multi-step registration form, validates each step, and confirms successful account creation. Handle dynamic dropdowns and date pickers.',
  'selenium_python', 'public', 'forms'
),
(
  '00000000-0000-0000-0000-000000000000',
  'E2E Checkout Flow',
  'Generate an end-to-end Playwright test for an e-commerce checkout: add item to cart, proceed to checkout, fill shipping details, select payment method, and verify order confirmation page with order number.',
  'playwright_js', 'public', 'e2e'
),
(
  '00000000-0000-0000-0000-000000000000',
  'E2E Registration Flow',
  'Generate a Cypress end-to-end test for user registration: visit signup page, fill all fields, verify email confirmation message, and test that duplicate email is rejected.',
  'cypress_js', 'public', 'e2e'
),
(
  '00000000-0000-0000-0000-000000000000',
  'API Smoke Test',
  'Generate a Playwright script that tests critical API endpoints: GET health check returns 200, POST login returns auth token, authenticated GET returns user data. Use request context.',
  'playwright_js', 'public', 'api'
),
(
  '00000000-0000-0000-0000-000000000000',
  'API CRUD Test',
  'Generate a Selenium Python script with API calls to test full CRUD: create resource via POST, verify with GET, update with PUT, delete with DELETE. Verify each response status and body.',
  'selenium_python', 'public', 'api'
),
(
  '00000000-0000-0000-0000-000000000000',
  'Navigation & Links Check',
  'Generate a Playwright script that crawls all navigation links on the page, clicks each, and verifies no broken links (non-200 or error pages). Skip external links or test them as HEAD requests.',
  'playwright_js', 'public', 'navigation'
),
(
  '00000000-0000-0000-0000-000000000000',
  'Navigation & Links Check',
  'Generate a Cypress test that verifies all main navigation items are clickable, check breadcrumb trail updates on navigation, and confirm active page indicators highlight correctly.',
  'cypress_js', 'public', 'navigation'
),
(
  '00000000-0000-0000-0000-000000000000',
  'Table / Data Grid Validation',
  'Generate a Playwright script that validates a data table: check column headers exist, verify row count matches pagination, test sorting on each sortable column, and validate search/filter functionality.',
  'playwright_js', 'public', 'forms'
),
(
  '00000000-0000-0000-0000-000000000000',
  'File Upload Test',
  'Generate a Puppeteer script that tests file upload: open upload dialog, select a file, verify file name appears, check upload progress indicator, and confirm success message after upload completes.',
  'puppeteer_js', 'public', 'forms'
);
