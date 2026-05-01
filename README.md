# RacketTier v2

Session-based queue, matchmaking, results, and ELO rankings for racket sports—built on **Laravel 13**, **React** (Vite), and **Tailwind CSS**.

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
| `ranking-system.mdc` | ELO for registered users only (initial 1000, K default 32), `rankings` + `rating_histories`; guests excluded. |

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
