# Code Review Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable global OpenCode `code-review` subagent that performs read-only full-quality code reviews.

**Architecture:** Use one global agent Markdown file with YAML frontmatter and a focused prompt body. OpenCode loads the agent at startup from `~/.config/opencode/agents/`, so no project config changes are needed.

**Tech Stack:** OpenCode global agent file, Markdown, YAML frontmatter, Windows PowerShell 5.1 for verification.

---

## File Structure

- Create: `C:\Users\faishaltsq\.config\opencode\agents\code-review.md` defines the global read-only review subagent.
- Modify: none.
- Test: no automated test file; verification uses existence and content checks because this is OpenCode runtime configuration.

## Task 1: Global Code Review Agent

**Files:**
- Create: `C:\Users\faishaltsq\.config\opencode\agents\code-review.md`

- [ ] **Step 1: Verify the agent file does not already exist**

Run:

```powershell
Test-Path -LiteralPath "$HOME\.config\opencode\agents\code-review.md"
```

Expected:

```text
False
```

If output is `True`, read the existing file before changing it and preserve any user-authored content unless the user approves replacement.

- [ ] **Step 2: Ensure the global agents directory exists**

Run:

```powershell
if (Test-Path -LiteralPath "$HOME\.config\opencode") { New-Item -ItemType Directory -Path "$HOME\.config\opencode\agents" -Force | Out-Null; Test-Path -LiteralPath "$HOME\.config\opencode\agents" }
```

Expected:

```text
True
```

- [ ] **Step 3: Create the global agent file**

Write exactly this content to `C:\Users\faishaltsq\.config\opencode\agents\code-review.md`:

```markdown
---
description: Reviews code changes for bugs, security risks, regressions, tests, maintainability, and architecture issues.
mode: subagent
permission:
  edit: deny
  bash: ask
---

You are a read-only code review specialist.

Review goals:

- Find real defects, regressions, security risks, data-loss risks, missing tests, maintainability issues, performance problems, and architecture problems.
- Prioritize actionable issues over style preferences.
- Avoid praise-first responses and broad summaries before findings.
- Do not edit files, apply patches, stage changes, commit changes, or rewrite code.
- Ask before running shell commands. Prefer read-only commands such as `git status`, `git diff`, `git diff --stat`, tests, linters, and targeted file inspection.
- Do not run deploy, network mutation, secret-reading, destructive, or long-running commands unless the user explicitly approves that exact command.

Review process:

1. Identify review target from the user request, current branch diff, explicit files, PR description, or pasted patch.
2. Inspect changed files and nearby code paths enough to verify behavior and integration risk.
3. Check tests or verification evidence when available.
4. Report only issues you can support with concrete code evidence.
5. If information is insufficient, state the assumption and the residual risk.

Response format:

1. Findings first, ordered by severity: Critical, High, Medium, Low.
2. Each finding must include `path:line`, issue, impact, and fix direction.
3. If no findings are discovered, state `No findings.` and mention residual risks or testing gaps.
4. After findings, include verification performed.
5. Keep summaries brief and secondary.
```

- [ ] **Step 4: Verify agent file content**

Run:

```powershell
$p = "$HOME\.config\opencode\agents\code-review.md"; $c = Get-Content -LiteralPath $p -Raw; @($c.Contains("mode: subagent"), $c.Contains("edit: deny"), $c.Contains("bash: ask"), $c.Contains("Do not edit files")) -join "`n"
```

Expected:

```text
True
True
True
True
```

- [ ] **Step 5: Report restart requirement**

Tell the user:

```text
Restart OpenCode so the new global agent loads. Then invoke the agent as code-review for code review tasks.
```

No git commit is included because the target agent file is global user configuration outside the project repository, and commits require explicit user request.

## Plan Self-Review

- Spec coverage: The plan creates the requested global read-only full-quality `code-review` subagent and includes restart guidance.
- Placeholder scan: The plan contains exact path, exact file content, exact commands, and expected outputs.
- Type consistency: Agent name, path, mode, permissions, and review behavior match the approved design.
