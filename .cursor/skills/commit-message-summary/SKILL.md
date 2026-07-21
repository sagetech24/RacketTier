---
name: commit-message-summary
description: >-
  Summarizes agent work and drafts a Git commit message from session changes.
  On normal implementation turns, only output a copy-paste commit footer — do
  not run git. When the user explicitly invokes this skill (e.g.
  /commit-message-summary), stage, commit, and push in one go.
---

# Commit Message Summary

## Purpose

Two modes:

1. **Default (end of implementation responses)** — produce a short **change summary** and a **recommended commit message** the user can copy. **Do not** run `git add`, `git commit`, or `git push`.
2. **Skill invocation** — when the user explicitly calls this skill (e.g. `/commit-message-summary`), inventory changes, draft the message(s), then **stage, commit, and push** in the same turn.

## When to apply

### Footer only (no git)

- After creating, updating, or deleting project files
- At the end of any implementation or fix task (paired with the project rule)

Skip the footer when:
- The turn was question-only or review-only with **no** file changes
- The user explicitly said not to include a commit message

### Execute git (skill call only)

Run add → commit → push **only** when the user invokes this skill by name or slash command (e.g. `/commit-message-summary`, “run commit-message-summary”).

Do **not** execute git when:
- The turn only finished ordinary implementation work (footer only)
- The user opted out of commit/push
- There is nothing to commit (clean working tree)

## Workflow A — end-of-response footer (default)

1. Summarize changes (2–5 bullets): what changed and why
2. Draft the commit message using this repo’s style
3. Present the **Recommended commit message** footer below
4. **Stop** — do not stage, commit, or push

## Workflow B — skill invocation (git actions)

1. **Inventory changes** (run in parallel):
   - `git status`
   - `git diff` / `git diff --staged`
   - `git log -8 --oneline`
2. **Summarize** (2–5 bullets) and **draft** commit message(s)
3. **Present** the commit message footer
4. **Stage, commit, and push**:
   - Do not commit secrets (`.env`, credentials, private keys)
   - Stage only relevant files
   - Prefer separate commits when unrelated concerns are mixed, then one push
   - Commit with a HEREDOC; then `git push` (or `git push -u origin HEAD` if needed)
   - Confirm with `git status` and report the short SHA / remote

### Commit command (skill invocation only)

```bash
git add <relevant-files>
git commit -m "$(cat <<'EOF'
<type>: <concise subject in imperative mood>

<optional body>
EOF
)"
git push
```

Request unrestricted permissions for commit/push when the environment requires it (hooks, network, credential helpers).

## Commit message format

Match recent RacketTier history: short **type** prefix, imperative mood, focus on **why**.

**Types** (pick one): `feat`, `fix`, `style`, `refactor`, `test`, `docs`, `chore`

**Structure:**

```text
<type>: <concise subject in imperative mood>

<optional body — 1–3 sentences on why, not a file manifest>
```

**Examples from this repo:**

```text
feat: redesign queueing session leaderboard and unify match actions FAB
```

```text
style: make the queue session history responsive to tablet
```

```text
fix: correct queue rotation when a player leaves mid-match

Return finished players to the end of the queue per queue-system rules.
```

**Rules:**
- Subject line ~50–72 characters when possible; body only if it adds context
- One logical change per message; if the session mixed unrelated work, use **separate** commits (on skill invocation) or suggest separate messages in the footer (default mode)
- Do not include secrets, `.env`, or credentials in the message or summary
- Do not stage or commit files that should stay local (e.g. `.env`)

## Response footer

### Default (no git)

```markdown
---

## Recommended commit message

\`\`\`
<paste-ready commit message here>
\`\`\`

**Changed:** <one-line roll-up>

_Manual commit only — not executed by the agent. Invoke /commit-message-summary to add, commit, and push._
```

### After skill invocation (git ran)

```markdown
---

## Commit message

\`\`\`
<commit message that was used>
\`\`\`

**Changed:** <one-line roll-up>

**Git:** committed and pushed to `<remote>/<branch>` (`<short-sha>`)
```

If commit or push failed, keep the message block and report the failure clearly.

If multiple commits were created on skill invocation:

```markdown
### Commit 1
\`\`\`
feat: ...
\`\`\`

### Commit 2
\`\`\`
style: ...
\`\`\`

**Git:** pushed N commits to `<remote>/<branch>`
```

## What not to do

- Do **not** auto-run add/commit/push at the end of ordinary implementation turns
- Do **not** skip add/commit/push when the user explicitly invoked this skill and there are changes to commit
- Do not amend or force-push unless the user’s commit rules allow it and they asked
- Do not invent changes — only describe what was actually done in the session or diff
- Do not bury the commit block inside long prose; keep it as the **last** section of the response
- Never update git config
- Never use `--no-verify` or skip hooks unless the user explicitly asks
