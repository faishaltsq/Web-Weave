# Themed Output Panels Design

## Summary

Logs and generated-code output panels must follow the active WebWeave theme. In light mode, their backgrounds should become light surfaces instead of staying black. In dark mode, they should keep the existing dark terminal-like feel.

## Scope

Update styling only in `src/app/(main)/page.module.css` for the generation output area:

- Run logs panel (`.console`, `.consoleLine`, `.consolePrompt`).
- Generated code panel (`.codePanel`, `.codeBlock`, `.code`).
- Empty code state (`.codeEmptyState`) uses theme surface/text colors.
- Existing quality/status colors stay unchanged because they already use theme variables.

No component behavior, generation logic, API flow, billing, auth, routing, or data storage changes are included.

## Approach

Use theme variables rather than hardcoded terminal colors. Add small output-specific CSS variables under `.darkMode` and `.lightMode`, then replace hardcoded panel colors with those variables.

Dark mode values should preserve current contrast:

- Panel background close to `#050505`.
- Code/log text in pale blue.
- Prompt accent remains green.

Light mode values should match existing app surfaces:

- Panel background uses a light surface tone.
- Code/log text uses dark slate text.
- Prompt accent remains green but readable.

## UI Behavior

When user switches theme:

- Logs panel background changes with theme.
- Generated code background changes with theme.
- Text remains readable in both modes.
- Existing borders, shadows, spacing, rounded corners, and animations remain unchanged.

## Verification

Run `npm run build` after implementation. If practical, inspect light mode manually to confirm Logs and Generated Code no longer show black backgrounds.
