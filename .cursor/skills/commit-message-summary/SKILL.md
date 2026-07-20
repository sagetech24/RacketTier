---
name: commit-message-summary
description: >-
  Summarizes agent work, drafts a Git commit message from session changes, then
  stages, commits, and pushes. Use when finishing implementation tasks, after
  creating or updating files, or when the user asks for a commit message.
---

# Commit Message Summary

## Purpose

At the end of work that changed the repository, produce a short **change summary** and a **commit message**, then **stage, commit, and push** those changes.

## When to apply

- After creating, updating, or deleting project files
- When the user asks for a commit message or change summary
- At the end of any implementation or fix task (paired with the project rule)

Skip the summary **and** do not commit/push when:
- The turn was question-only or review-only with **no** file changes
- The user explicitly said not to commit, push, or include a commit message
- There is nothing to commit (clean working tree)

## Workflow

1. **Inventory changes** (run in parallel):
   - `git status` — untracked and modified files
   - `git diff` — unstaged changes
   - `git diff --staged` — staged changes
   - `git log -8 --oneline` — match repo commit style
   - If git is unavailable, use the files you edited in the session

2. **Summarize for the user** (2–5 bullets):
   - What was created, updated, or removed
   - Why it matters (behavior, bug fix, UX), not a raw file list
   - Group related files; omit noise (formatting-only unless that was the task)

3. **Draft the commit message** using this repo's style (see below)

4. **Present the summary and commit message** in the footer format below

5. **Stage, commit, and push** (required unless the user opted out):
   - Do **not** commit secrets (`.env`, credentials, private keys)
   - Stage only relevant files for this logical change
   - Commit with a HEREDOC message (see below)
   - Push the current branch to its remote (`git push` or `git push -u origin HEAD` if needed)
   - After push, run `git status` and confirm success in the response
   - If the working tree mixes unrelated concerns, prefer **separate commits** (one message each), then a single push

### Commit command

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
- One logical change per message; if the session mixed unrelated work, use **separate** commits
- Do not include secrets, `.env`, or credentials in the message or summary
- Do not stage or commit files that should stay local (e.g. `.env`)

## Response footer (required when there are changes)

End the user-facing response with this block. Run add/commit/push **after** drafting it (same turn), then update the status line to reflect the result:

```markdown
---

## Commit message

\`\`\`
<commit message that was used>
\`\`\`

**Changed:** <one-line roll-up, e.g. "3 files — React leaderboard, session API resource">

**Git:** committed and pushed to `<remote>/<branch>` (`<short-sha>`)
```

If commit or push failed, keep the message block and report the failure clearly instead of claiming success.

If multiple commits were created:

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

- Do not skip add/commit/push after a successful summary unless the user opted out or there is nothing to commit
- Do not amend or force-push unless the user's commit rules allow it and they asked
- Do not invent changes — only describe what was actually done in the session or diff
- Do not bury the commit block inside long prose; keep it as the **last** section of the response
- Never update git config
- Never use `--no-verify` or skip hooks unless the user explicitly asks
