# Security Review Agent Design

## Context

Global opencode config lives at `C:\Users\faishaltsq\.config\opencode`. Current global `opencode.json` defines plugins and MCP servers only. There are no existing global agents.

## Goal

Add a global `security-review` subagent for read-only security review across projects. The agent should identify actionable security risks and report findings without modifying code.

## Non-Goals

- Do not edit source code or config.
- Do not auto-run shell commands.
- Do not replace full penetration testing, SAST, dependency scanning, or threat modeling.
- Do not produce generic security advice without concrete project evidence.

## Approach

Use a global file-based agent at `C:\Users\faishaltsq\.config\opencode\agent\security-review.md`. File-based agent is easier to maintain than inline JSON because prompt content is non-trivial.

## Agent Configuration

The agent uses `mode: subagent` so it is invoked for focused review tasks, not as the default primary agent.

Permissions:

- `edit: deny` to enforce review-only behavior.
- `bash: ask` so any command requires explicit approval.

No model override is required; the agent inherits current model selection.

## Review Scope

The prompt should direct the agent to inspect security-sensitive areas first:

- Authentication, authorization, and session handling.
- Secret handling, env files, tokens, and credential leaks.
- Injection risks: SQL, command, HTML, template, and prompt injection.
- XSS, CSRF, SSRF, unsafe redirects, and CORS misconfiguration.
- Data isolation, RLS policies, tenant boundaries, and direct object reference risks.
- File upload, download, parsing, and path traversal risks.
- Dependency, build, CI, deployment, and runtime config exposure.
- Logging, telemetry, error reporting, and user data leakage.

## Output Contract

Security review output should prioritize findings over summary:

- Findings first, ordered by severity.
- Include file and line references when available.
- Explain exploit path and impact.
- Recommend minimal concrete fix.
- Mention missing tests or verification gaps.
- State explicitly when no findings are found.

The agent should avoid noisy best-practice lists and only report risks grounded in inspected code or config.

## Verification

After creating the agent file:

- Confirm the file exists under global opencode agent directory.
- Confirm frontmatter uses only supported agent fields.
- Confirm no edits were made to project code.
- User must quit and restart opencode before the new global agent is available.
