<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\QueueingSessionMatch;
use App\Services\QueueingSessionDraftHydrator;
use App\Services\QueueingSessionDraftLineup;
use App\Services\QueueingSessionDraftStore;
use App\Services\QueueingSessionMatchLineup;
use Illuminate\Support\Facades\DB;

class CreateQueueingSessionReserveMatch
{
    public const MAX_RESERVE_MATCHES = 4;

    public function __construct(
        private QueueingSessionMatchLineup $lineup,
        private QueueingSessionDraftStore $draftStore,
        private QueueingSessionDraftLineup $draftLineup,
        private QueueingSessionDraftHydrator $hydrator,
    ) {}

    /**
     * @param  list<array{id: int, team?: int|null}>  $manualLineup
     */
    public function execute(GameSession $session, array $manualLineup): QueueingSessionMatch
    {
        if (! $session->is_active) {
            abort(422, 'This session is not active.');
        }

        if (! $session->isQueueing()) {
            abort(422, 'This action only applies to queueing sessions.');
        }

        $required = $session->match_type === 'doubles' ? 4 : 2;

        if ($session->isDraft()) {
            $matchId = null;
            $hydrated = $this->draftStore->mutate($session, function ($draft) use ($session, $manualLineup, $required, &$matchId) {
                $reservedCount = collect($draft->matches)
                    ->filter(fn (array $m): bool => ($m['status'] ?? '') === 'reserved')
                    ->count();
                if ($reservedCount >= self::MAX_RESERVE_MATCHES) {
                    abort(422, 'You can reserve at most '.self::MAX_RESERVE_MATCHES.' matches at a time.');
                }

                $picked = $this->draftLineup->resolveReserveLineup($session, $draft, $manualLineup, $required);
                $matchId = $draft->allocateMatchId();
                $draft->matches[] = [
                    'id' => $matchId,
                    'match_no' => $draft->nextMatchNo(),
                    'status' => 'reserved',
                    'lineup' => $this->draftLineup->buildSnapshot($picked),
                    'team1_score' => null,
                    'team2_score' => null,
                    'winning_team' => null,
                    'started_at' => null,
                    'finished_at' => null,
                    'result_breakdown' => null,
                ];

                return $draft;
            });

            return $this->hydrator->hydrateMatch($hydrated, (int) $matchId);
        }

        $created = DB::transaction(function () use ($session, $manualLineup, $required): QueueingSessionMatch {
            /** @var GameSession $locked */
            $locked = GameSession::query()
                ->whereKey($session->id)
                ->lockForUpdate()
                ->firstOrFail();

            $reservedCount = QueueingSessionMatch::query()
                ->where('game_session_id', $locked->id)
                ->where('status', 'reserved')
                ->count();
            if ($reservedCount >= self::MAX_RESERVE_MATCHES) {
                abort(422, 'You can reserve at most '.self::MAX_RESERVE_MATCHES.' matches at a time.');
            }

            $players = GameSessionPlayer::query()
                ->where('game_session_id', $locked->id)
                ->orderBy('queue_position')
                ->lockForUpdate()
                ->get();

            $picked = $this->lineup->resolveReserveLineup($locked, $players, $manualLineup, $required);

            $nextMatchNo = (int) QueueingSessionMatch::query()
                ->where('game_session_id', $locked->id)
                ->max('match_no') + 1;

            return QueueingSessionMatch::query()->create([
                'game_session_id' => $locked->id,
                'match_no' => $nextMatchNo,
                'status' => 'reserved',
                'lineup' => $this->lineup->buildSnapshot($picked),
                'started_at' => null,
            ]);
        });

        app(RefreshQueueingSessionAutoSuggestMatches::class)->execute($session->fresh() ?? $session);

        return $created;
    }
}
