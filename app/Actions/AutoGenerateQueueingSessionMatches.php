<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Services\QueueingSessionMatchLineup;
use Illuminate\Support\Collection;

class AutoGenerateQueueingSessionMatches
{
    public function __construct(
        private QueueingSessionMatchLineup $lineup,
    ) {}

    /**
     * Compute a batch of auto-generated match proposals for a queueing session.
     *
     * Read-only: no database writes. The QM approves each proposal one-by-one,
     * which goes through the existing CreateQueueingSessionMatch action.
     *
     * Algorithm:
     *   - Cold start (no eligible player has any wins/losses yet):
     *       pure FIFO by queue_position.
     *   - With stats:
     *       group by win-rate band (4 buckets); sort by band DESC, then by
     *       queue_position ASC so within each band FIFO breaks ties. Players
     *       in the same chunk share a bracket and play each other.
     *
     * Equal court time is implicit because the existing finish-match flow
     * pushes finished players to the back of the queue, so high-FIFO-position
     * players naturally have fewer matches played and get picked sooner.
     *
     * @return array{
     *   proposals: list<array{
     *     proposal_id: string,
     *     match_type: 'singles'|'doubles',
     *     bracket_label: ?string,
     *     players: list<array<string, mixed>>,
     *     lineup: list<array{id: int, team: int}>,
     *   }>,
     *   total_eligible: int,
     *   required_per_match: int,
     *   has_stats: bool,
     *   match_type: 'singles'|'doubles',
     * }
     */
    public function execute(GameSession $session): array
    {
        if (! $session->is_active) {
            abort(422, 'This session is not active.');
        }

        if (! $session->isQueueing()) {
            abort(422, 'This action only applies to queueing sessions.');
        }

        $matchType = $session->match_type === 'doubles' ? 'doubles' : 'singles';
        $required = $matchType === 'doubles' ? 4 : 2;

        $reserved = $this->lineup->reservedPlayerIds((int) $session->id);

        /** @var Collection<int, GameSessionPlayer> $eligible */
        $eligible = GameSessionPlayer::query()
            ->with('user:id,name')
            ->where('game_session_id', $session->id)
            ->where('is_waiting', true)
            ->where('is_playing', false)
            ->when($reserved !== [], fn ($q) => $q->whereNotIn('id', $reserved))
            ->orderBy('queue_position')
            ->get();

        $totalEligible = $eligible->count();
        $proposalCount = intdiv($totalEligible, $required);

        $hasStats = $eligible->contains(
            fn (GameSessionPlayer $p): bool => ((int) $p->wins_count + (int) $p->losses_count) > 0,
        );

        if ($proposalCount < 1) {
            return [
                'proposals' => [],
                'total_eligible' => $totalEligible,
                'required_per_match' => $required,
                'has_stats' => $hasStats,
                'match_type' => $matchType,
            ];
        }

        if ($hasStats) {
            // Sort by (win-rate band DESC, queue_position ASC). Stable
            // ordering ensures FIFO within a band.
            $ordered = $eligible
                ->sortBy(fn (GameSessionPlayer $p): int => (int) $p->queue_position)
                ->values()
                ->sortByDesc(fn (GameSessionPlayer $p): int => $this->winRateBand($p))
                ->values();
        } else {
            $ordered = $eligible->values();
        }

        $picked = $ordered->take($proposalCount * $required)->values();

        $proposals = [];
        $chunks = $picked->chunk($required)->values();

        foreach ($chunks as $i => $chunk) {
            /** @var Collection<int, GameSessionPlayer> $chunkPlayers */
            $chunkPlayers = $chunk->values();

            $bracketLabel = $hasStats ? $this->bracketLabelForChunk($chunkPlayers) : null;

            $teamAssignments = $this->assignTeams($chunkPlayers, $matchType);

            $playersOut = [];
            $lineupOut = [];
            foreach ($chunkPlayers as $index => $p) {
                $team = $teamAssignments[$index];
                $playersOut[] = $this->playerSummary($p, $team);
                $lineupOut[] = ['id' => (int) $p->id, 'team' => $team];
            }

            $proposals[] = [
                'proposal_id' => 'auto-'.($i + 1),
                'match_type' => $matchType,
                'bracket_label' => $bracketLabel,
                'players' => $playersOut,
                'lineup' => $lineupOut,
            ];
        }

        return [
            'proposals' => $proposals,
            'total_eligible' => $totalEligible,
            'required_per_match' => $required,
            'has_stats' => $hasStats,
            'match_type' => $matchType,
        ];
    }

    /**
     * Bucket a player's win-rate into one of 4 bands.
     * Higher band number = stronger bracket. Returns 0..3.
     */
    private function winRateBand(GameSessionPlayer $p): int
    {
        $wins = (int) $p->wins_count;
        $losses = (int) $p->losses_count;
        $games = $wins + $losses;
        if ($games <= 0) {
            // Treat unrated players as middle-band so they don't skew sorting
            // when mixed with rated players in the same session.
            return 1;
        }
        $rate = $wins / $games;
        if ($rate >= 0.75) {
            return 3;
        }
        if ($rate >= 0.5) {
            return 2;
        }
        if ($rate >= 0.25) {
            return 1;
        }

        return 0;
    }

    /** @param  Collection<int, GameSessionPlayer>  $chunk */
    private function bracketLabelForChunk(Collection $chunk): string
    {
        $bands = $chunk
            ->map(fn (GameSessionPlayer $p): int => $this->winRateBand($p))
            ->unique()
            ->values()
            ->all();

        $names = [
            0 => 'Low win-rate',
            1 => 'Mid-low win-rate',
            2 => 'Mid-high win-rate',
            3 => 'High win-rate',
        ];

        if (count($bands) === 1) {
            return $names[$bands[0]] ?? 'Mixed bracket';
        }

        return 'Mixed bracket';
    }

    /**
     * Assign team numbers to the players in a chunk.
     *
     * Singles: player 0 -> team 1, player 1 -> team 2.
     * Doubles: pair the strongest with the weakest (snake pairing) so both
     * teams are balanced within the bracket — team 1 = [0, 3], team 2 = [1, 2].
     *
     * @param  Collection<int, GameSessionPlayer>  $chunk
     * @return array<int, int>
     */
    private function assignTeams(Collection $chunk, string $matchType): array
    {
        if ($matchType === 'singles') {
            return [0 => 1, 1 => 2];
        }

        return [0 => 1, 1 => 2, 2 => 2, 3 => 1];
    }

    /**
     * @return array<string, mixed>
     */
    private function playerSummary(GameSessionPlayer $p, int $team): array
    {
        $wins = (int) $p->wins_count;
        $losses = (int) $p->losses_count;

        return [
            'game_session_player_id' => (int) $p->id,
            'user_id' => $p->user_id !== null ? (int) $p->user_id : null,
            'guest_name' => $p->guest_name,
            'name' => $p->displayName(),
            'is_guest' => $p->isGuest(),
            'queue_position' => (int) $p->queue_position,
            'wins_count' => $wins,
            'losses_count' => $losses,
            'matches_played' => $wins + $losses,
            'team' => $team,
        ];
    }
}
