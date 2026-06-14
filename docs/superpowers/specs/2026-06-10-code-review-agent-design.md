# Global Code Review Agent Design

## Goal

Create a global OpenCode subagent named `code-review` for reusable read-only code review across projects.

## Scope

- Install the agent globally under `~/.config/opencode/agents/`.
- Keep the agent read-only by denying edit permission.
- Allow shell commands only with permission prompts.
- Focus on full-quality review: correctness, security, regressions, tests, maintainability, performance, and architecture.
- Output findings first, ordered by severity, with file and line references.

## Non-Goals

- Do not make automatic code edits.
- Do not replace implementation agents.
- Do not change existing project code or project-level OpenCode config.

## Agent Configuration

File path:

```text
C:\Users\faishaltsq\.config\opencode\agents\code-review.md
```

Frontmatter:

```yaml
description: Reviews code changes for bugs, security risks, regressions, tests, maintainability, and architecture issues.
mode: subagent
permission:
  edit: deny
  bash: ask
```

## Review Behavior

The agent should inspect diffs, changed files, and related code paths before reporting. It should prioritize actionable issues over summaries and avoid praise-first responses.

Finding format:

- Severity and title.
- File and line reference.
- Why it matters.
- Suggested fix direction.

If no findings are discovered, the agent should state that explicitly and list remaining risks or verification gaps.

## Verification

- Ensure the global agents directory exists.
- Create `code-review.md` in the global agents directory.
- Validate the file content is readable and has valid YAML frontmatter shape.
- Remind user to restart OpenCode because agent files load at startup.
