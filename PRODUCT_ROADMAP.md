# WebWeave Product Roadmap

WebWeave is an AI-assisted QA automation builder. Current base is a safer V1 MVP: URL safety validation, DOM extraction, Chromium locator preview, AI script generation, and multi-framework output. Next direction should make output more reliable, add validation loops, and prepare for controlled private beta.

## Product Positioning

Build WebWeave as a QA automation assistant for testers and small engineering teams.

Core promise:

> Turn a web page and test objective into a runnable automation starter script, with selectors grounded in real DOM context.

Best first market:

- QA engineers who need faster starter scripts.
- Manual testers learning automation.
- Small teams without dedicated automation engineers.
- Internal tools teams that need quick regression scripts.

Avoid positioning it as:

- Fully autonomous tester.
- Scraper for any website.
- Bot builder.
- Credential-stealing browser automation tool.

## Current State

Current version is `v1.0 Safety MVP + UI Refresh`. It is suitable for local use and trusted private beta testing, not public paid SaaS yet.

Already good:

- Next.js app with vibrant browser-lab UI.
- Server-side AI provider keys.
- Playwright headless DOM scraping.
- Interactive element extraction.
- Chromium screenshot preview with highlighted locator candidates.
- Prompt engineering for robust selectors.
- Generated script prompt now requires locator validation helpers and dynamic-list handling.
- Multi-framework script generation.
- Copy and download generated code.
- URL safety validation, request limits, and basic rate limiting.
- Generated credential examples removed.

Current blockers:

- No authentication.
- No persistent user quota system.
- No paid billing guard.
- Browser still runs server-side and needs stronger isolation before public launch.
- No automated generated-script execution/validation loop inside WebWeave yet.
- No privacy policy or data retention rules.

## Version Plan

### Version 1: Safety First MVP - Completed

Goal: make current prototype safe enough for private beta.

Scope:

- Done: removed `/api/debug` from production.
- Done: added URL validation for `http` and `https` only.
- Done: blocked private targets: `localhost`, private IP ranges, link-local IPs, reserved IPs, and cloud metadata hosts.
- Done: added max request body size.
- Done: added prompt length limit.
- Done: added DOM context length limit.
- Done: added basic per-client rate limit.
- Done: removed hardcoded credentials and generated example scripts.
- Done: added clear UI warning to use placeholders instead of real credentials.
- Done: added browser-style Chromium locator preview.
- Done: refreshed UI with solid vibrant dark/light mode.
- Done: improved generated-script rules for locator validation and changing lists.

Deliverable:

- Private beta build usable by owner and trusted testers.

Do not:

- Do not launch as public paid service.
- Do not allow anonymous unlimited usage.
- Do not scrape internal/private network targets.
- Do not store user credentials in logs.
- Do not claim production-ready generated scripts.

### Version 2: Reliable Generation - In Progress

Goal: improve output quality and reduce flaky scripts.

Scope:

- Done: add static script quality checks before returning code.
- Generate only one primary framework: Playwright JavaScript.
- Done: add selector confidence scoring: id, name, data-test/data-testid, aria-label, text fallback.
- Add page summary before generation.
- Done: improve locator preview metadata: selector type and top candidate list.
- Add placeholder secret support: `{{USERNAME}}`, `{{PASSWORD}}`, `{{OTP}}`.
- Add generated file naming and metadata.
- Done: add regeneration with feedback so user can say what failed.
- Done: add post-generation static scan for common framework API mistakes.
- Done: add cross-framework locator/safe-action contract for Playwright, Puppeteer, Selenium, and Cypress.
- Done: improve markdown-fence extraction and incomplete-output detection.

Deliverable:

- More consistent generated scripts for common QA flows.

Do not:

- Do not expand frameworks too early.
- Do not overbuild complex project system yet.
- Do not generate scripts that include real user secrets.

### Version 3: Run And Validate

Goal: make WebWeave more valuable than normal AI chat by proving scripts can run.

Scope:

- Add sandboxed script runner.
- Execute generated Playwright script in isolated environment.
- Capture result: pass, fail, error, screenshot, console logs.
- Add auto-fix loop: failure logs go back to AI for one repair attempt.
- Add safe timeout limits.
- Add per-run cost and time tracking.
- Upgrade screenshot preview into run validation evidence.

Deliverable:

- User can generate and validate starter automation from one flow.

Do not:

- Do not run user code on main app server.
- Do not allow generated code to access filesystem freely.
- Do not allow network access to private IPs.
- Do not support arbitrary custom code execution without sandbox.

### Version 4: User Projects

Goal: make it feel like product, not demo.

Scope:

- Add authentication.
- Add saved projects.
- Add saved target domains.
- Add generated script history.
- Add versioned scripts.
- Add tags: login, smoke, regression, form, menu.
- Add export to zip.
- Add simple team workspace later, not first.

Deliverable:

- Users can return, manage scripts, and improve them.

Do not:

- Do not build enterprise team features before solo user flow works.
- Do not store sensitive prompts forever by default.
- Do not store DOM snapshots unless user explicitly saves them.

### Version 5: Paid Beta

Goal: start charging small amount with controlled usage.

Scope:

- Add billing provider.
- Add plan limits: generations per month, runs per month, projects count.
- Add rate limits per user and IP.
- Add provider cost tracking.
- Add terms of service.
- Add privacy policy.
- Add data retention setting.
- Add domain ownership confirmation or allowlist for paid customers.

Suggested pricing test:

- Free: 5 generations/month, no run validation.
- Starter: $9/month, 100 generations, 20 validations.
- Pro: $29/month, 500 generations, 100 validations, project history.

Deliverable:

- Small paid beta with safe guardrails.

Do not:

- Do not promise unlimited AI usage.
- Do not sell before billing quota works.
- Do not expose provider keys through client or logs.
- Do not ignore abuse reports.

### Version 6: Public Release

Goal: public SaaS release with trust, safety, and reliability.

Scope:

- Public landing page.
- Use case pages for QA automation, Playwright generation, regression starter scripts.
- Documentation.
- Security page.
- Privacy page.
- Status page or incident contact.
- Better onboarding.
- Support contact.
- Product analytics.
- Error monitoring.
- CI export: GitHub Actions example.
- Page Object Model export.

Deliverable:

- Public paid WebWeave launch.

Do not:

- Do not market as bypassing CAPTCHA or bot protection.
- Do not support credential theft or unauthorized automation.
- Do not scrape sites without permission.
- Do not keep weak sandboxing.

## Security Requirements

Must-have before paid public:

- Authentication.
- Rate limiting.
- Quotas.
- URL validation.
- SSRF protection.
- Sandboxed browser execution.
- Sandboxed script execution.
- Secret redaction in logs.
- No debug endpoint in production.
- No committed credentials.
- Privacy policy.
- Terms of service.
- Data retention controls.

## Product Rules

Build:

- Playwright-first workflow.
- Script validation loop.
- Secret placeholders.
- Project history.
- Clear trust messaging.
- Small reliable features.

Avoid:

- Too many frameworks too early.
- Anonymous public generation.
- Arbitrary URL crawling without protection.
- Generated code execution without sandbox.
- Overclaiming output quality.
- Keeping customer DOM/prompt data longer than needed.

## Success Metrics

Prototype metrics:

- Generated script copied or downloaded.
- User regenerates less than 2 times for same flow.
- Common login/form scripts run with minimal edits.

Paid beta metrics:

- Cost per generation below target margin.
- At least 30 percent of beta users generate more than 3 scripts.
- At least 10 percent convert from free to paid.
- Less than 5 percent abuse or blocked URL attempts.

Release metrics:

- Retention after 30 days.
- Number of saved projects per user.
- Number of validated script runs.
- Support tickets per 100 generations.

## Recommended Next Action

Start with Version 2.

Immediate checklist:

1. Regenerate and run real sample scripts for each framework after latest extractor/token fixes.
2. Draft privacy/data-retention text for private beta.
3. Add optional stricter static validation mode that can block risky output.
