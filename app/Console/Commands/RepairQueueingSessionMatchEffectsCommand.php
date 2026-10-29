<?php

namespace App\Console\Commands;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\MemberPointWallet;
use App\Models\QueueingSessionMatch;
use App\Models\Ranking;
use App\Models\RatingHistory;
use App\Services\RebuildQueueingSessionMatchEffects;
use Illuminate\Console\Command;

/**
 * Production recovery after a finished-match switch that zeroed session stats /
 * warped ELO because result_breakdown still had draft player ids.
 *
 * Examples:
 *   php artisan queueing:repair-match-effects 62 --undo-switch-match=15 --dry-run
 *   php artisan queueing:repair-match-effects 62 --undo-switch-match=15
 *   php artisan queueing:repair-match-effects 62
 */
class RepairQueueingSessionMatchEffectsCommand extends Command
{
    protected $signature = 'queueing:repair-match-effects
        {session : Game session id}
        {--undo-switch-match= : Finished match id to flip winner/scores back}
        {--undo-switch-match-no= : Finished match_no to flip (alternative to id)}
        {--dry-run : Show what would change without writing}
        {--force : Run without confirmation prompt}';

    protected $description = 'Remap finished match breakdown player ids and rebuild session W–L / ELO / wallets; optionally undo a switch-result';

    public function handle(RebuildQueueingSessionMatchEffects $rebuild): int
    {
        $sessionId = (int) $this->argument('session');
        /** @var GameSession|null $session */
        $session = GameSession::query()->find($sessionId);

        if (! $session || ! $session->isQueueing()) {
            $this->error("Queueing session {$sessionId} not found.");

            return self::FAILURE;
        }

        if ($session->isDraft()) {
            $this->error('Session is still a draft. Repair is for persisted (ended) sessions.');

            return self::FAILURE;
        }

        $undoMatchId = $this->option('undo-switch-match') !== null
            ? (int) $this->option('undo-switch-match')
            : null;
        $undoMatchNo = $this->option('undo-switch-match-no') !== null
            ? (int) $this->option('undo-switch-match-no')
            : null;

        if ($undoMatchId === null && $undoMatchNo !== null) {
            $match = QueueingSessionMatch::query()
                ->where('game_session_id', $session->id)
                ->where('match_no', $undoMatchNo)
                ->where('status', 'finished')
                ->first();
            if (! $match) {
                $this->error("No finished match_no={$undoMatchNo} on session {$sessionId}.");

                return self::FAILURE;
            }
            $undoMatchId = (int) $match->id;
        }

        $finished = QueueingSessionMatch::query()
            ->where('game_session_id', $session->id)
            ->where('status', 'finished')
            ->orderBy('match_no')
            ->get();

        $this->info("Session #{$session->id} «{$session->queue_name}» sport={$session->sport_id} matches={$finished->count()}");

        if ($undoMatchId !== null) {
            $target = $finished->first(fn (QueueingSessionMatch $m): bool => (int) $m->id === $undoMatchId);
            if (! $target) {
                $this->error("Finished match id={$undoMatchId} not on this session.");

                return self::FAILURE;
            }
            $this->warn(sprintf(
                'Will flip match #%s (id=%s): winning_team %s → %s; scores %s-%s → swapped if present',
                $target->match_no,
                $target->id,
                $target->winning_team,
                ((int) $target->winning_team) === 1 ? 2 : 1,
                $target->team1_score ?? 'null',
                $target->team2_score ?? 'null',
            ));
        }

        $playersBefore = GameSessionPlayer::query()
            ->where('game_session_id', $session->id)
            ->get(['id', 'user_id', 'guest_name', 'wins_count', 'losses_count', 'session_points']);

        $this->table(
            ['player_id', 'user/guest', 'W', 'L', 'pts'],
            $playersBefore->map(fn (GameSessionPlayer $p): array => [
                $p->id,
                $p->user_id ? "user:{$p->user_id}" : ($p->guest_name ?? 'guest'),
                $p->wins_count,
                $p->losses_count,
                $p->session_points,
            ])->all(),
        );

        $memberIds = $playersBefore->pluck('user_id')->filter()->map(fn ($id): int => (int) $id)->unique()->values();
        $histories = RatingHistory::query()->where('game_session_id', $session->id)->count();
        $this->line("Current rating_histories for session: {$histories}");

        if ($this->option('dry-run')) {
            $this->comment('Dry run only — no writes.');

            return self::SUCCESS;
        }

        if (! $this->option('force') && ! $this->confirm('Apply remap + rebuild (and undo switch if requested)?', true)) {
            $this->warn('Aborted.');

            return self::SUCCESS;
        }

        $result = $rebuild->repairPersistedSession($session->fresh(), $undoMatchId);

        $this->info(sprintf(
            'Done. Remapped %d match breakdown(s). Undone match id: %s',
            $result['remapped_matches'],
            $result['undone_match_id'] ?? 'none',
        ));

        $playersAfter = GameSessionPlayer::query()
            ->where('game_session_id', $session->id)
            ->get(['id', 'user_id', 'guest_name', 'wins_count', 'losses_count', 'session_points']);

        $this->table(
            ['player_id', 'user/guest', 'W', 'L', 'pts'],
            $playersAfter->map(fn (GameSessionPlayer $p): array => [
                $p->id,
                $p->user_id ? "user:{$p->user_id}" : ($p->guest_name ?? 'guest'),
                $p->wins_count,
                $p->losses_count,
                $p->session_points,
            ])->all(),
        );

        foreach ($memberIds as $uid) {
            $rating = Ranking::query()
                ->where('user_id', $uid)
                ->where('sport_id', $session->sport_id)
                ->value('rating');
            $wallet = MemberPointWallet::query()
                ->where('user_id', $uid)
                ->where('sport_id', $session->sport_id)
                ->value('balance');
            $this->line("user {$uid}: rating=".($rating ?? 'null').' wallet='.($wallet ?? 'null'));
        }

        $this->info('Rebuild complete. Ask affected players to refresh the dashboard.');

        return self::SUCCESS;
    }
}
