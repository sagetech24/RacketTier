# Finished match overrides & repair

Queue Master (QM) can correct finished matches on the **Finished** tab of a queueing session — both while the session is **active** and after it has **ended**. This document covers the product behavior, the production bug that wiped rankings/points, the code fixes, and the artisan recovery command.

---

## Feature overview

| Action | What it does | Same players? |
|--------|----------------|---------------|
| **Switch results** | Flips winning team `1 ↔ 2`. If scores exist, swaps `team1_score` / `team2_score`. | Yes |
| **Update pairing** | Re-assign teams via drag UI (same lineup as Edit match). Winner team number stays; who wins/loses changes. | Same 2/4 only — no substitutions |

### Who can use it

- QM (`can_manage`) on **active or ended** sessions.
- Create / start / end match actions stay active-session only.
- Public summary page has no override controls.

### Recalculation rules

| Session state | Session W–L / points | ELO + wallets |
|---------------|----------------------|---------------|
| **Active (draft)** | Rebuilt from finished `result_breakdown`s immediately | Deferred until session end (existing persist/replay) |
| **Ended (persisted)** | Rebuilt from finished breakdowns | Session-scoped **unwind** then **chronological replay** of all finished matches |

**Caveat:** If members played *other* ranked sessions after this one, later `rating_histories` are not rewritten. Repair only corrects this session’s net contribution on current ratings/wallets.

---

## API

| Method | Path | Body |
|--------|------|------|
| `POST` | `/auth/queueing-sessions/{gameSession}/matches/{match}/switch-result` | (none) |
| `PATCH` | `/auth/queueing-sessions/{gameSession}/matches/{match}/finished-lineup` | `{ lineup: [{ id, team }, ...] }` |

Auth: queueing session + `userCanManage`. Match must be `finished`. Session need **not** be active.

### Key code

| Layer | Path |
|-------|------|
| Switch action | `app/Actions/SwitchQueueingSessionMatchResult.php` |
| Pairing action | `app/Actions/OverrideQueueingSessionMatchLineup.php` |
| Rebuild / unwind / replay | `app/Services/RebuildQueueingSessionMatchEffects.php` |
| Breakdown id remap | `app/Services/RemapFinishedMatchBreakdown.php` |
| UI | Finished tab → `QueueingSessionFinishedMatches` / `FinishedMatchPairingModal` |
| Tests | `tests/Feature/QueueingSessionFinishedMatchOverrideTest.php` |

---

## Production bug (stale `result_breakdown` player ids)

### What went wrong

When a **draft** queueing session is ended, `PersistQueueingSession`:

1. Inserts new `game_session_players` with **new** DB ids.
2. Rewrites each match **lineup** `game_session_player_id` to those new ids.
3. Historically **did not** rewrite `result_breakdown.players[].game_session_player_id` — those stayed as **draft** ids.

Switch-result on an **ended** session then:

1. Zeroed all roster `wins_count` / `losses_count` / `session_points`.
2. Tried to rebuild stats from `result_breakdown` using draft ids → **no rows matched** → session board stayed empty.
3. Unwound this session’s ELO histories + wallet txs, then replayed from lineups (lineups were fine, but the overall dashboard looked “wrecked” alongside the wiped session board).

### Fixes (shipped)

1. **Persist** remaps `result_breakdown` player ids with the same draft→persisted id map as the lineup (`RemapFinishedMatchBreakdown::remapWithIdMap`).
2. **Every persisted rebuild** remaps breakdown ids by matching lineup `user_id` / `guest_name` before applying stats (`normalizePersistedBreakdownIds`).
3. **Artisan repair command** for production recovery (see below).

---

## Artisan: `queueing:repair-match-effects`

Recover a **persisted (ended)** queueing session after a bad switch-result (or any session still carrying stale breakdown ids).

### Signature

```bash
php artisan queueing:repair-match-effects {session}
    [--undo-switch-match=]
    [--undo-switch-match-no=]
    [--dry-run]
    [--force]
```

| Argument / option | Meaning |
|-------------------|---------|
| `session` | `game_sessions.id` |
| `--undo-switch-match=` | Finished match **id** to flip winner/scores back (undo one Switch results) |
| `--undo-switch-match-no=` | Same as above, but by **match_no** (easier from the Finished tab UI) |
| `--dry-run` | Print current session board + plan; **no writes** |
| `--force` | Skip the confirmation prompt (use in non-interactive deploys) |

Implementation: `app/Console/Commands/RepairQueueingSessionMatchEffectsCommand.php`  
Calls: `RebuildQueueingSessionMatchEffects::repairPersistedSession()`.

### What the command does

1. Loads the ended queueing session (fails if draft/active-only draft).
2. Optionally resolves `--undo-switch-match-no` → match id.
3. Prints current per-player W / L / session points.
4. Unless `--dry-run`:
   - Remaps all finished matches’ `result_breakdown` player ids to live lineup ids.
   - If undo requested: flips that match’s `winning_team` (and swaps scores if present), recomputes its breakdown.
   - Rebuilds session W–L / points from all finished breakdowns.
   - Unwinds this session’s `rating_histories` + `point_wallet_transactions`, then replays finished matches in `match_no` order.
5. Prints restored board + member rating/wallet snapshots.

### Recommended production workflow

1. Deploy code that includes this command (`19b05f6` / later).
2. Identify:
   - Session id (URL: `/queueing-session/{id}/matches?tab=finished`)
   - Match number that was switched (Finished tab `#N`)
3. **Dry-run first:**

```bash
php artisan queueing:repair-match-effects 62 --undo-switch-match-no=3 --dry-run
```

4. **Apply** (interactive confirm):

```bash
php artisan queueing:repair-match-effects 62 --undo-switch-match-no=3
```

Or non-interactive:

```bash
php artisan queueing:repair-match-effects 62 --undo-switch-match-no=3 --force
```

5. Ask affected players to hard-refresh the dashboard / public summary.

### When **not** to pass `--undo-switch-*`

Use remap + rebuild **only** (no flip) when:

- The switched winner is already correct, but session points / rankings still look wrong; or
- You only need to heal stale breakdown ids without changing results.

```bash
php artisan queueing:repair-match-effects 62 --force
```

### When to pass `--undo-switch-*`

Use when QM switched the wrong match and you want the **pre-switch** winner/scores restored, then a full rebuild.

```bash
php artisan queueing:repair-match-effects 62 --undo-switch-match-no=3 --force
```

Equivalent by match id:

```bash
php artisan queueing:repair-match-effects 62 --undo-switch-match=154 --force
```

### Finding match id / match_no

From tinker / DB:

```sql
SELECT id, match_no, winning_team, team1_score, team2_score, status
FROM queueing_session_matches
WHERE game_session_id = 62 AND status = 'finished'
ORDER BY match_no;
```

Or read `#N` from the Finished tab / public summary.

### Limitations

- Only **persisted** (ended) sessions — not live drafts.
- Does not rewrite ELO history for *later* sessions played after this one.
- Undoing switch assumes the current DB winner is the *post-switch* state (flip once). If someone already switched twice, do **not** undo again without checking `winning_team`.
- Always prefer `--dry-run` before `--force` on production.

---

## Smoke checks after repair

- Session leaderboard: wins / losses / earned points look right for all players.
- Finished tab: switched match shows the intended winner (and scores if used).
- Public summary link: same results.
- Affected members’ sport ranking + wallet balance (dashboard) are restored for this session’s contribution.
- `rating_histories` count for `game_session_id` matches members who played ranking-eligible matches.

```sql
SELECT COUNT(*) FROM rating_histories WHERE game_session_id = 62;
SELECT user_id, SUM(amount) FROM point_wallet_transactions
  WHERE game_session_id = 62 GROUP BY user_id;
```

---

## Related commits

| Commit | Summary |
|--------|---------|
| `24177d2` | feat: let QM override finished match results and pairings |
| `19b05f6` | fix: repair switch-result wipe from stale breakdown player ids |
