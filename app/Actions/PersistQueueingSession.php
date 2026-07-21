<?php

namespace App\Actions;

use App\Data\QueueingSessionDraft;
use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\QueueingSessionMatch;
use App\Models\Ranking;
use App\Models\User;
use App\Services\MatchResultProcessor;
use App\Services\QueueingSessionDraftLineup;
use App\Services\QueueingSessionDraftStore;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class PersistQueueingSession
{
    public function __construct(
        private QueueingSessionDraftStore $draftStore,
        private QueueingSessionDraftLineup $draftLineup,
        private MatchResultProcessor $matchResultProcessor,
    ) {}

    public function execute(GameSession $session): GameSession
    {
        if (! $session->isQueueing() || ! $session->isDraft()) {
            abort(422, 'Only active draft queueing sessions can be persisted.');
        }

        return DB::transaction(function () use ($session): GameSession {
            /** @var GameSession $locked */
            $locked = GameSession::query()
                ->whereKey($session->id)
                ->lockForUpdate()
                ->firstOrFail();

            $draft = $this->draftStore->load((int) $locked->id);
            $playerIdMap = $this->insertPlayers($locked, $draft);
            $this->insertMatches($locked, $draft, $playerIdMap);
            $this->replayFinishedMatches($locked, $draft);

            $locked->update([
                'persistence_state' => 'persisted',
                'is_active' => false,
                'status' => 'finished',
                'ended_at' => now(),
                'draft_snapshot' => null,
                'draft_participant_user_ids' => $draft->participantUserIds(),
            ]);

            GameSessionPlayer::query()
                ->where('game_session_id', $locked->id)
                ->update([
                    'is_playing' => false,
                    'is_waiting' => false,
                    'team' => null,
                ]);

            $this->draftStore->delete((int) $locked->id);

            return $locked->fresh();
        });
    }

    /**
     * @return array<int, int> draft_player_id => db_player_id
     */
    private function insertPlayers(GameSession $session, QueueingSessionDraft $draft): array
    {
        $map = [];

        foreach ($draft->players as $row) {
            $player = GameSessionPlayer::query()->create([
                'game_session_id' => $session->id,
                'user_id' => $row['user_id'] ?? null,
                'guest_name' => $row['guest_name'] ?? null,
                'pronoun' => $row['pronoun'] ?? null,
                'skill_level' => $row['skill_level'] ?? null,
                'queue_position' => (int) ($row['queue_position'] ?? 0),
                'is_waiting' => false,
                'is_playing' => false,
                'team' => null,
                'wins_count' => (int) ($row['wins_count'] ?? 0),
                'losses_count' => (int) ($row['losses_count'] ?? 0),
                'last_match_result' => $row['last_match_result'] ?? null,
                'last_match_id' => isset($row['last_match_id']) ? (int) $row['last_match_id'] : null,
                'session_points' => (int) ($row['session_points'] ?? 0),
            ]);
            $map[(int) $row['id']] = (int) $player->id;
        }

        return $map;
    }

    /**
     * @param  array<int, int>  $playerIdMap
     */
    private function insertMatches(GameSession $session, QueueingSessionDraft $draft, array $playerIdMap): void
    {
        foreach ($draft->matches as $row) {
            $lineup = is_array($row['lineup'] ?? null) ? $row['lineup'] : [];
            $rewrittenLineup = collect($lineup)->map(function (array $entry) use ($playerIdMap): array {
                $draftPid = (int) ($entry['game_session_player_id'] ?? 0);
                $entry['game_session_player_id'] = $playerIdMap[$draftPid] ?? $draftPid;

                return $entry;
            })->all();

            QueueingSessionMatch::query()->create([
                'game_session_id' => $session->id,
                'match_no' => (int) ($row['match_no'] ?? 0),
                'status' => (string) ($row['status'] ?? 'finished'),
                'lineup' => $rewrittenLineup,
                'team1_score' => $row['team1_score'] ?? null,
                'team2_score' => $row['team2_score'] ?? null,
                'winning_team' => $row['winning_team'] ?? null,
                'started_at' => $row['started_at'] ?? null,
                'finished_at' => $row['finished_at'] ?? null,
                'result_breakdown' => is_array($row['result_breakdown'] ?? null) ? $row['result_breakdown'] : null,
            ]);
        }
    }

    private function replayFinishedMatches(
        GameSession $session,
        QueueingSessionDraft $draft,
    ): void {
        $finished = collect($draft->matches)
            ->filter(fn (array $m): bool => ($m['status'] ?? '') === 'finished')
            ->sortBy('match_no')
            ->values();

        if ($finished->isEmpty()) {
            return;
        }

        $sportId = (int) $session->sport_id;
        $required = $session->match_type === 'doubles' ? 4 : 2;

        // Resolve each finished match straight from its stored snapshot so that
        // players removed from the roster mid-session no longer block the replay.
        $replayable = $finished
            ->map(fn (array $matchRow): array => [
                'row' => $matchRow,
                'players' => $this->draftLineup->playersFromFinishedSnapshot($session, $matchRow, $required),
            ])
            ->values();

        // Members who actually played (includes players later removed from the
        // roster) so their ELO/wallet history stays correct on end-session.
        $memberUserIds = $replayable
            ->flatMap(fn (array $entry): array => $entry['players'])
            ->pluck('user_id')
            ->filter()
            ->map(fn ($id): int => (int) $id)
            ->unique()
            ->values()
            ->all();

        $ratingsBefore = Ranking::query()
            ->where('sport_id', $sportId)
            ->whereIn('user_id', $memberUserIds)
            ->lockForUpdate()
            ->get()
            ->mapWithKeys(fn (Ranking $r): array => [(int) $r->user_id => (int) $r->rating])
            ->all();

        foreach ($replayable as $entry) {
            $matchRow = $entry['row'];
            $playing = $this->toPlayerModels($entry['players']);
            $teamMap = $playing->mapWithKeys(
                fn (GameSessionPlayer $p): array => [(int) $p->id => (int) $p->team],
            )->all();

            $winningTeam = (int) ($matchRow['winning_team'] ?? 0);
            $team1Score = $matchRow['team1_score'] ?? null;
            $team2Score = $matchRow['team2_score'] ?? null;
            $margin = ($team1Score !== null && $team2Score !== null)
                ? abs((int) $team1Score - (int) $team2Score)
                : 0;

            $this->matchResultProcessor->processMatch(
                $session,
                $playing,
                $teamMap,
                $winningTeam,
                $margin,
                $team1Score !== null ? (int) $team1Score : null,
                $team2Score !== null ? (int) $team2Score : null,
                persistGlobalEffects: true,
                ratingsBefore: $ratingsBefore,
                persistSessionPlayerStats: false,
            );
        }
    }

    /**
     * Build in-memory player models from a finished match snapshot. These are
     * used only to recompute global effects (ELO, rating history, wallets),
     * which key off user_id + sport_id and never require a live roster row.
     *
     * @param  list<array<string, mixed>>  $pickedArrays
     * @return Collection<int, GameSessionPlayer>
     */
    private function toPlayerModels(array $pickedArrays): Collection
    {
        $memberIds = collect($pickedArrays)
            ->pluck('user_id')
            ->filter()
            ->map(fn ($id): int => (int) $id)
            ->unique()
            ->values()
            ->all();

        $memberNames = $memberIds === []
            ? collect()
            : User::query()->whereIn('id', $memberIds)->pluck('name', 'id');

        return collect($pickedArrays)->map(function (array $row) use ($memberNames): GameSessionPlayer {
            $player = new GameSessionPlayer;
            $player->id = (int) $row['id'];
            $player->user_id = $row['user_id'] !== null ? (int) $row['user_id'] : null;
            $player->guest_name = $row['guest_name'] ?? null;
            $player->team = $row['team'] ?? null;

            if ($player->user_id !== null) {
                $user = new User;
                $user->id = $player->user_id;
                $user->name = (string) ($memberNames[$player->user_id] ?? ($row['name'] ?? 'Player'));
                $player->setRelation('user', $user);
            }

            return $player;
        });
    }
}
