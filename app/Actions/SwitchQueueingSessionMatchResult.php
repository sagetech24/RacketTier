<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\QueueingSessionMatch;
use App\Services\QueueingSessionDraftHydrator;
use App\Services\QueueingSessionDraftStore;
use App\Services\RebuildQueueingSessionMatchEffects;
use Illuminate\Support\Facades\DB;

class SwitchQueueingSessionMatchResult
{
    public function __construct(
        private QueueingSessionDraftStore $draftStore,
        private QueueingSessionDraftHydrator $hydrator,
        private RebuildQueueingSessionMatchEffects $rebuild,
    ) {}

    public function execute(GameSession $session, QueueingSessionMatch $match): QueueingSessionMatch
    {
        if (! $session->isQueueing()) {
            abort(422, 'This action only applies to queueing sessions.');
        }

        if ((int) $match->game_session_id !== (int) $session->id) {
            abort(422, 'Match does not belong to this session.');
        }

        if ($session->isDraft()) {
            $hydrated = $this->draftStore->mutate($session, function ($draft) use ($session, $match) {
                $matchRow = $draft->findMatch((int) $match->id);
                if ($matchRow === null || ($matchRow['status'] ?? '') !== 'finished') {
                    abort(422, 'Only finished matches can switch results.');
                }

                $winningTeam = (int) ($matchRow['winning_team'] ?? 0);
                if (! in_array($winningTeam, [1, 2], true)) {
                    abort(422, 'Finished match is missing a winning team.');
                }

                $switched = $winningTeam === 1 ? 2 : 1;
                $team1Score = $matchRow['team1_score'] ?? null;
                $team2Score = $matchRow['team2_score'] ?? null;
                if ($team1Score !== null && $team2Score !== null) {
                    $tmp = $team1Score;
                    $team1Score = $team2Score;
                    $team2Score = $tmp;
                }

                $matchRow['winning_team'] = $switched;
                $matchRow['team1_score'] = $team1Score;
                $matchRow['team2_score'] = $team2Score;
                $matchRow['result_breakdown'] = $this->rebuild->recomputeBreakdown($session, $matchRow);

                foreach ($draft->matches as $i => $row) {
                    if ((int) ($row['id'] ?? 0) === (int) $match->id) {
                        $draft->matches[$i] = array_merge($row, [
                            'winning_team' => $matchRow['winning_team'],
                            'team1_score' => $matchRow['team1_score'],
                            'team2_score' => $matchRow['team2_score'],
                            'result_breakdown' => $matchRow['result_breakdown'],
                        ]);
                        break;
                    }
                }

                $this->rebuild->rebuildDraft($session, $draft);

                return $draft;
            });

            return $this->hydrator->hydrateMatch($hydrated, (int) $match->id);
        }

        return DB::transaction(function () use ($session, $match): QueueingSessionMatch {
            /** @var GameSession $locked */
            $locked = GameSession::query()
                ->whereKey($session->id)
                ->lockForUpdate()
                ->firstOrFail();

            /** @var QueueingSessionMatch|null $lockedMatch */
            $lockedMatch = QueueingSessionMatch::query()
                ->where('game_session_id', $locked->id)
                ->whereKey($match->id)
                ->lockForUpdate()
                ->first();

            if (! $lockedMatch || $lockedMatch->status !== 'finished') {
                abort(422, 'Only finished matches can switch results.');
            }

            $winningTeam = (int) ($lockedMatch->winning_team ?? 0);
            if (! in_array($winningTeam, [1, 2], true)) {
                abort(422, 'Finished match is missing a winning team.');
            }

            $switched = $winningTeam === 1 ? 2 : 1;
            $team1Score = $lockedMatch->team1_score;
            $team2Score = $lockedMatch->team2_score;
            if ($team1Score !== null && $team2Score !== null) {
                $tmp = $team1Score;
                $team1Score = $team2Score;
                $team2Score = $tmp;
            }

            $row = [
                'lineup' => is_array($lockedMatch->lineup) ? $lockedMatch->lineup : [],
                'winning_team' => $switched,
                'team1_score' => $team1Score,
                'team2_score' => $team2Score,
            ];
            $breakdown = $this->rebuild->recomputeBreakdown($locked, $row);

            $lockedMatch->update([
                'winning_team' => $switched,
                'team1_score' => $team1Score,
                'team2_score' => $team2Score,
                'result_breakdown' => $breakdown,
            ]);

            $this->rebuild->rebuildPersisted($locked);

            return $lockedMatch->fresh();
        });
    }
}
