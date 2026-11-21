# Offline queueing sessions — QA matrix

## Preconditions

- Create the queueing session **while online**.
- Prefer installing the PWA / visiting the session page once so the shell can cache.

## Core flows

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Airplane mode after create; add guests; manual match; finish | UI updates locally; offline banner shows outbox count |
| 2 | Restore network | Banner shows syncing; outbox drains; server draft matches device |
| 3 | End while offline | Banner: pending end; on reconnect sync then end + ELO/wallets |
| 4 | Auto-match offline | Proposals from draft skill/W–L only; approve creates local match |
| 5 | Auto-suggest offline | Suggestions recompute from local draft; approve/dismiss work |
| 6 | Member add offline without cache | Empty/search miss; guest still works |
| 7 | Member add offline after online picker open | Cached members appear |
| 8 | Phone create → sync → tablet open → tablet offline | Tablet runs session; phone should not edit offline |
| 9 | Two devices offline conflict | 409 / conflict banner; Refresh from server discards outbox |
| 10 | Draft version header on mutations | Stale `draft_version` returns 409 JSON with current version |

## Non-goals (should still require network)

- Create session from cold start offline
- Public summary share for unfinished/unsynced session
- Facility finish-match path

## Automated checks

```bash
php artisan test --filter=QueueingSessionOfflineSyncTest
node --test resources/js/offline/__tests__/autoMatchFromDraft.test.mjs
node --test resources/js/offline/__tests__/applyOfflineMutation.test.mjs
```
