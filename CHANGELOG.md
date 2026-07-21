# Changelog

All notable changes to RacketTier v2 are documented in this file.

Format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

## [2026-07-21] — Queueing session power-up

Large Queue Master (QM) release focused on faster session setup, fairer auto-matching, and richer match-building UX.

### Highlights

- **Duplicate finished sessions** — recreate a queue with the same settings and roster in one action.
- **Fairness-first auto-match** — prioritize players by games played and last-match win/loss brackets.
- **Draggable lineups** — swap teams/partners before queueing or starting a match.
- **Leaner guest onboarding** — optional skill/gender per session; Skip Score Entry on by default.

### New flows

#### Duplicate a finished queueing session

From **History** or **Finished today** on the session list, the QM (or admin) can **Duplicate** a finished queueing session.

1. Confirm duplicate on a finished session.
2. Backend creates a new **active draft** with copied settings (`queue_name`, sport, match type, win/loss points, skip scores, optional guest fields, auto-match criteria) and roster (members + guests, same queue order).
3. Matches and stats are **not** copied; players start waiting with zero wins/losses/points.
4. User lands on the new session’s **Players** page to tweak before playing.

`POST /auth/queueing-sessions/{id}/duplicate`

#### Fairness-first auto-matching

Auto-generate proposals now track and use **last match result** (`last_match_result` on session players) when finishing matches:

1. Prefer players with fewer **matches played** (spread court time).
2. Prefer **winner-bracket** pairing when both sides recently won.
3. Deprioritize stacking recent losers together when better options exist.
4. Existing criteria (skill balanced/same-level, FIFO, W/L stats, gender mix) still apply as configured.

#### Match lineup: propose → adjust → queue or start

1. **Auto-match** or **manual create** opens a shared lineup board.
2. QM can **drag players** between teams (or partners in doubles) via `@dnd-kit`.
3. On auto-match suggestions, choose **Queue** (pending) or **Start** (ongoing) per proposal.
4. Manual create match UI is aligned with the auto-match modal.

### Features

- **Duplicate finished queueing sessions** with settings + roster (no matches).
- **Last-match tracking** migration and fairness-oriented auto-match ranking.
- **Default member skill level** from the member’s sport **tier** when adding to a queue.
- **Draggable match lineup** shared by create-match and auto-match (`DraggableMatchLineup`).
- **Queue** and **Start** actions on auto-match proposal cards.
- **Optional guest skill & gender** toggles per queueing session (defaults keep add-guest frictionless).
- **Skip Score Entry** defaults **on** for new queueing sessions.
- **Roster sort** by games, wins, or losses on the Players page.
- **Player/match counts** on queue session card nav (including draft hydration so counts show before persist).

### UI / UX

- Match cards: stacked avatars, winner trophy placement, simplified live duration.
- Match tabs: indicator and count pill colors; yellow active state for session detail tabs.
- Leaderboard podium and stats polish; larger detail nav labels/icons.
- Roster toolbar and create-queue toggle sizing.
- Dashboard live badge renamed **Playing → Active**.
- Create-match and auto-match modals visually aligned.

### Fixes

- Remove nested anchors from dashboard wordmark (invalid HTML / a11y).
- Drop artificial ~2s skeleton loading delay across dashboard and queueing pages.
- Align require-guest toggles with the Add Guest form fields.
- Show draft roster and match counts correctly on queueing session list cards.

### Chore

- Commit-message-summary skill: git add/commit/push only when the skill is explicitly invoked.
