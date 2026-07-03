# RacketTier v2

Session-based queue, matchmaking, results, and ELO rankings for racket sports—built on **Laravel 13**, **React** (Vite), and **Tailwind CSS**.

## What RacketTier is

RacketTier is a **mobile-first PWA** that turns casual racket-sports play into ranked, recordable progress for clubs and communities. It supports four sports out of the box—**badminton, pickleball, tennis, and table tennis**—each with its own independent ELO rating, session-point wallet, and tier ladder.

Tagline: *"Every smash counts. Track it, rank it, own it."*

Who it serves:

- **Members** — registered users who earn ELO, session points (wallet balance), and tier progression per sport.
- **Guests** — quick-added, account-less players in a session; tracked for wins/losses but excluded from ELO and wallets.
- **Queue Master (QM)** — the member who creates and runs a queueing session (roster, matches, results, end + summary).
- **Facility** — a partner venue where facility game sessions are hosted.
- **Admin** (`users.is_admin`) — manages facilities and can view/force-manage any queueing session.

## Tech stack

- **Backend:** Laravel 13, Eloquent, Form Requests, Actions/Services, API Resources. Session-based (web guard) SPA auth (same-origin, CSRF), email verification. MySQL.
- **Frontend:** React 19 + Vite, React Router 7, TanStack Query 5, Tailwind CSS v4, PWA. Source under `resources/js/`.
- **No `routes/api.php` surface** — all JSON endpoints live in `routes/web.php` behind the `auth`/`guest` middleware.

## End-to-end product flow

RacketTier is built around the lifecycle **Session → Queue → Match → Result → Ranking → repeat**. Two session types share the `game_sessions` table (distinguished by `session_context`):

### 1. Facility game session (finish-match / single-match flow)

Facility-owned. One scored match, then the session ends.

1. **Browse facilities** (`/facilities`) → pick a venue.
2. **Create match** (`/facility/:id/create-match`): choose sport, singles/doubles, game type, court preference, invite members (1 for singles, 3 for doubles; host auto-included), assign teams → `POST /auth/game-sessions`.
3. **Game room** (`/facility/:id/game-room`): host **Start Game** (`start-match`, status → `ongoing`), then **Finish Game** with a score (or winner-only if scores are skipped) → `finish-match`.
4. **Post-match processing** runs once: ELO update, `rating_histories`, session points → `member_point_wallets` + `point_wallet_transactions`, and player stats. The session then **ends immediately** (`is_active = false`, `status = finished`, `ended_at`).

### 2. Queueing session (Queue Master flow)

Member-organized, multi-match, with a live leaderboard.

1. **Create session** (`/queueing-session/new`): creator becomes **Queue Master**; set sport, queue name, singles/doubles, **win/loss points**, "skip scores", and **auto-match criteria**. The session is created as a **draft** (JSON snapshot) until it ends.
2. **Manage roster** (`/queueing-session/:id/players`): add members (with per-sport tier + stats) or guests, set skill level (1–5: Starter → Sensie) and pronoun.
3. **Build matches** (`/queueing-session/:id/matches`): **auto-generate** proposals (by skill level balanced/same-level, FIFO sequence, W/L statistics, genderless-mixed teams) or build manually. Matches flow `queueing → ongoing → finished`.
4. **Record results**: enter scores or pick the winner (skip-scores). Finished players rotate to the **end of the queue** (FIFO); the session **stays active** across many matches.
5. **Live leaderboard** (`/queueing-session/:id`): wins, losses, matches played, points earned, win %.
6. **End session**: QM stops the session → the draft is **persisted** to real rows and every finished match is **replayed** to commit ELO/wallets atomically → a **summary report** (ranked players + totals) is generated.

### Ranking & progression model

- **ELO** (`rankings`, `rating_histories`): skill rating per user+sport, default **1000**, K-factor **32**. Members only; guests excluded.
- **Session points / wallets** (`member_point_wallets`, `point_wallet_transactions`): per-sport balance credited on match finish (queueing uses the session's win/loss points; facility uses win `25 + min(10, margin)`, loss `8`).
- **Tiers** (`tier_ranks`): 5 brackets per sport resolved from wallet balance — **1 Starter, 2 Beginner, 3 Intermediate, 4 Sempai, 5 Sensie**.

### Supporting screens

Dashboard (`/dashboard`), Rankings/leaderboard (`/ranking`), Activity feed (`/activity`), Profile (`/profile`), plus auth flow (`/login`, `/register`, `/verify-email`, `/forgot-password`, `/password/reset/:token`) and the marketing landing page (`/`).

### Branding & theme

- **Wordmark:** "Racket*Tier*" ("Tier" italic), logo `/images/rt-logo.png`.
- **Dark theme.** Base background `#121216`; surfaces `#1b1b1e`/`#1f1f22`; primary lavender **`#c2c1ff`** (deep `#211e6a`/`#7877c6`); accent green **`#4ce081`**; text `#e4e1e6`/`#c8c5d2`, muted `#918f9c`.
- **Fonts:** Geist (700, display) + Instrument Sans (body, `--font-sans`); Material Symbols icons.
- **Style:** extrabold tracking-tight headings, rounded-xl cards, pill badges, gradient CTAs, radial "glow" backgrounds, mobile bottom nav + match FAB.

> A copy-paste-ready brief for building a new landing page from this product is maintained at [`docs/landing-page-prompt.md`](docs/landing-page-prompt.md).

## Requirements

- PHP ^8.3
- Composer
- Node.js and npm (for frontend assets)

## Getting started

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
npm install && npm run build
php artisan serve
```

See the [Laravel documentation](https://laravel.com/docs) for routing, configuration, and deployment.

## Cursor: `.cursor` directory

This project ships Cursor-oriented rules, skills, and agent briefs so AI assistants stay aligned with RacketTier’s domain and stack. Paths are relative to the repository root.

### Rules (`.cursor/rules/`)

These `.mdc` files use Cursor’s `alwaysApply: true` front matter so they are injected into agent context automatically.

| File | Purpose |
|------|---------|
| `tech-stack.mdc` | Enforces Laravel 13 JSON API + **React** (Vite, `resources/js/`), Tailwind, thin API controllers, Actions/Services, MySQL migrations, Sanctum when the SPA needs auth, no Livewire for product UI. |
| `rackettier-flow.mdc` | End-to-end flow: Session → Queue → Match → Result → Ranking → repeat; required **React** feature areas; session fields; `session_players`; match lifecycle; post-match stats, ELO, `rating_histories`; session end and leaderboard. |
| `queue-system.mdc` | Sequential `queue_position`, `is_waiting` / `is_playing`, FIFO v1, reorder on leave, players return to end of queue after matches. |
| `matchmaking.mdc` | Singles (2) / doubles (4), top-of-queue selection, team layout, validation, `matches` / `match_players`, mark selected players `is_playing`. |
| `ranking-system.mdc` | ELO for registered users only (initial 1000, K default 32), `rankings` + `rating_histories`; guests excluded; links session-point wallets. |
| `tier-ranking.mdc` | **`tier_ranks`** brackets per sport; **`member_point_wallets`** + **`point_wallet_transactions`**; resolved via wallet balance vs ELO. |

### Skills (`.cursor/skills/`)

Markdown references for deeper, task-specific guidance (invoked when relevant to the work at hand).

| File | Focus |
|------|--------|
| `react-patterns.md` | React + Laravel JSON API: folder layout, thin client, API Resources, Sanctum/session notes, anti-patterns. |
| `react-ui.md` | Component-driven UI, state and data fetching guidance, Tailwind, post-mutation refresh. |
| `component-map.md` | Planned React areas (session, queue, match creator, match board, scoreboard) and high-level data flow. |
| `session-management.md` | Create / start / end session; session prerequisite for queue and matches. |
| `queue-handling.md` | Add player, positions, reorder; sequential positions, no gaps. |
| `elo-ranking.md` | ELO steps and storage tables summary. |

### Agents (`.cursor/agents/`)

Role descriptions for splitting backend vs matchmaking concerns in agent workflows.

| File | Role |
|------|------|
| `backend-agent.md` | Sessions, players, queue, matches, results; thin API controllers; Eloquent; JSON contracts for the React app. |
| `matchmaking-agent.md` | FIFO selection from `session_players`, Service/Action implementation, invoked from React via HTTP API; v2 ideas noted separately. |

### For contributors

When changing product or stack conventions, update the matching files under `.cursor/rules/` and, if needed, the skills or agent briefs so tooling and humans stay in sync.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
