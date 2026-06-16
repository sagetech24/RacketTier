<?php

namespace App\Actions;

use App\Data\AutoMatchCriteria;
use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Services\QueueingSessionMatchLineup;
use Illuminate\Support\Collection;

class AutoGenerateQueueingSessionMatches
{
    /** @var array<int, string> */
    private const SKILL_LEVEL_NAMES = [
        1 => 'Starter',
        2 => 'Beginner',
        3 => 'Intermediate',
        4 => 'Sempai',
        5 => 'Sensie',
    ];

    public function __construct(
        private QueueingSessionMatchLineup $lineup,
    ) {}

    /**
     * @return array{
     *   criteria: array<string, bool|string>,
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
    public function execute(GameSession $session, ?AutoMatchCriteria $criteria = null): array
    {
        $criteria ??= new AutoMatchCriteria;

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

        $hasStats = $eligible->contains(
            fn (GameSessionPlayer $p): bool => ((int) $p->wins_count + (int) $p->losses_count) > 0,
        );

        if ($totalEligible < $required) {
            return [
                'criteria' => $criteria->toArray(),
                'proposals' => [],
                'total_eligible' => $totalEligible,
                'required_per_match' => $required,
                'has_stats' => $hasStats,
                'match_type' => $matchType,
            ];
        }

        /** @var Collection<int, GameSessionPlayer> $pool */
        $pool = $eligible->values();
        $proposals = [];
        $proposalIndex = 0;

        while ($pool->count() >= $required) {
            $selected = $this->selectPlayersForMatch($pool, $required, $matchType, $criteria, $hasStats);
            $matchPlayers = $this->orderSelectedForTeams($selected, $criteria, $hasStats);
            $teamAssignments = $this->assignTeams($matchPlayers, $matchType, $criteria);

            if ($criteria->genderlessMixed) {
                $teamAssignments = $this->applyGenderlessMixed($matchPlayers, $teamAssignments, $matchType);
            }

            $playersOut = [];
            $lineupOut = [];
            foreach ($matchPlayers as $index => $p) {
                $team = $teamAssignments[$index];
                $playersOut[] = $this->playerSummary($p, $team);
                $lineupOut[] = ['id' => (int) $p->id, 'team' => $team];
            }

            $proposalIndex++;
            $seedSuffix = $criteria->refreshSeed ?? 0;
            $proposals[] = [
                'proposal_id' => 'auto-'.$seedSuffix.'-'.$proposalIndex,
                'match_type' => $matchType,
                'bracket_label' => $this->bracketLabelForChunk($matchPlayers, $hasStats, $criteria),
                'players' => $playersOut,
                'lineup' => $lineupOut,
            ];

            $selectedIds = $selected->pluck('id')->all();
            $pool = $pool->reject(fn (GameSessionPlayer $p): bool => in_array($p->id, $selectedIds, true))->values();
        }

        return [
            'criteria' => $criteria->toArray(),
            'proposals' => $proposals,
            'total_eligible' => $totalEligible,
            'required_per_match' => $required,
            'has_stats' => $hasStats,
            'match_type' => $matchType,
        ];
    }

    /**
     * @param  Collection<int, GameSessionPlayer>  $pool
     * @return Collection<int, GameSessionPlayer>
     */
    private function selectPlayersForMatch(
        Collection $pool,
        int $required,
        string $matchType,
        AutoMatchCriteria $criteria,
        bool $hasStats,
    ): Collection {
        if (! $criteria->usesSkillMatching()) {
            return $this->selectByWlAndSequence($pool, $required, $criteria, $hasStats);
        }

        if ($criteria->isBalancedSkillMode()) {
            return $matchType === 'doubles'
                ? $this->selectBalancedDoubles($pool, $required, $criteria, $hasStats)
                : $this->selectBalancedSingles($pool, $criteria, $hasStats);
        }

        return $matchType === 'doubles'
            ? $this->selectSameLevelDoubles($pool, $required, $criteria, $hasStats)
            : $this->selectSameLevelSingles($pool, $criteria, $hasStats);
    }

    /**
     * @param  Collection<int, GameSessionPlayer>  $pool
     * @return Collection<int, GameSessionPlayer>
     */
    private function selectByWlAndSequence(
        Collection $pool,
        int $required,
        AutoMatchCriteria $criteria,
        bool $hasStats,
    ): Collection {
        $ordered = $pool->values();

        if ($criteria->wlStatistics && $hasStats) {
            $ordered = $ordered
                ->sortBy(fn (GameSessionPlayer $p): int => $this->sequenceSortKey($p, $criteria))
                ->values()
                ->sortByDesc(fn (GameSessionPlayer $p): int => $this->winRateBand($p))
                ->values();
        } elseif ($criteria->sequence) {
            $ordered = $this->applyRefreshTieBreak(
                $ordered->sortBy(fn (GameSessionPlayer $p): int => (int) $p->queue_position)->values(),
                $criteria,
            );
        }

        return $ordered->take($required)->values();
    }

    /**
     * @param  Collection<int, GameSessionPlayer>  $pool
     * @return Collection<int, GameSessionPlayer>
     */
    private function selectBalancedSingles(
        Collection $pool,
        AutoMatchCriteria $criteria,
        bool $hasStats,
    ): Collection {
        $anchor = $this->bestBySkillWlSequence($pool, $criteria, $hasStats);
        $anchorLevel = $this->normalizedSkillLevel($anchor);

        $candidates = $pool->reject(fn (GameSessionPlayer $p): bool => $p->id === $anchor->id)->values();

        $differentTier = $candidates->filter(
            fn (GameSessionPlayer $p): bool => $this->normalizedSkillLevel($p) !== $anchorLevel,
        );

        $opponentPool = $differentTier->isNotEmpty() ? $differentTier : $candidates;

        $opponent = $this->worstBySkillWlSequence($opponentPool, $criteria, $hasStats, $anchor);

        return collect([$anchor, $opponent]);
    }

    /**
     * @param  Collection<int, GameSessionPlayer>  $pool
     * @return Collection<int, GameSessionPlayer>
     */
    private function selectBalancedDoubles(
        Collection $pool,
        int $required,
        AutoMatchCriteria $criteria,
        bool $hasStats,
    ): Collection {
        $sorted = $this->sortBySkillWlSequence($pool, $criteria, $hasStats);

        $p0 = $sorted->first();
        $remaining = $sorted->slice(1)->values();

        $p3 = $this->pickLowestDifferentSkill($remaining, $p0, $criteria, $hasStats)
            ?? $remaining->last();

        $remaining = $remaining->reject(fn (GameSessionPlayer $p): bool => $p->id === $p3?->id)->values();

        $p1 = $this->bestBySkillWlSequence($remaining, $criteria, $hasStats);
        $remaining = $remaining->reject(fn (GameSessionPlayer $p): bool => $p->id === $p1->id)->values();

        $p2 = $this->worstBySkillWlSequence($remaining, $criteria, $hasStats);

        return collect([$p0, $p1, $p2, $p3])->filter()->values();
    }

    /**
     * @param  Collection<int, GameSessionPlayer>  $pool
     * @return Collection<int, GameSessionPlayer>
     */
    private function selectSameLevelSingles(
        Collection $pool,
        AutoMatchCriteria $criteria,
        bool $hasStats,
    ): Collection {
        $groups = $pool->groupBy(fn (GameSessionPlayer $p): int => $this->normalizedSkillLevel($p));

        /** @var Collection<int, GameSessionPlayer>|null $bestGroup */
        $bestGroup = null;
        foreach ($groups->keys()->sortDesc() as $level) {
            $group = $groups->get($level);
            if ($group !== null && $group->count() >= 2) {
                $bestGroup = $group;
                break;
            }
        }

        if ($bestGroup === null) {
            return $this->selectBalancedSingles($pool, $criteria, $hasStats);
        }

        $ordered = $this->sortBySkillWlSequence($bestGroup, $criteria, $hasStats);

        return collect([$ordered[0], $ordered[1]]);
    }

    /**
     * @param  Collection<int, GameSessionPlayer>  $pool
     * @return Collection<int, GameSessionPlayer>
     */
    private function selectSameLevelDoubles(
        Collection $pool,
        int $required,
        AutoMatchCriteria $criteria,
        bool $hasStats,
    ): Collection {
        $groups = $pool->groupBy(fn (GameSessionPlayer $p): int => $this->normalizedSkillLevel($p));

        foreach ($groups->keys()->sortDesc() as $level) {
            $group = $groups->get($level);
            if ($group !== null && $group->count() >= $required) {
                return $this->sortBySkillWlSequence($group, $criteria, $hasStats)->take($required)->values();
            }
        }

        /** @var Collection<int, GameSessionPlayer>|null $largestGroup */
        $largestGroup = $groups->sortByDesc(fn (Collection $g, int $level): int => ($g->count() * 10) + $level)->first();

        if ($largestGroup === null || $largestGroup->count() < 2) {
            return $this->selectBalancedDoubles($pool, $required, $criteria, $hasStats);
        }

        $selected = $this->sortBySkillWlSequence($largestGroup, $criteria, $hasStats)->values();
        $remaining = $pool->reject(fn (GameSessionPlayer $p): bool => $selected->contains('id', $p->id))->values();

        while ($selected->count() < $required && $remaining->isNotEmpty()) {
            $next = $this->bestBySkillWlSequence($remaining, $criteria, $hasStats);
            $selected->push($next);
            $remaining = $remaining->reject(fn (GameSessionPlayer $p): bool => $p->id === $next->id)->values();
        }

        return $selected->take($required)->values();
    }

    /**
     * @param  Collection<int, GameSessionPlayer>  $selected
     * @return Collection<int, GameSessionPlayer>
     */
    private function orderSelectedForTeams(
        Collection $selected,
        AutoMatchCriteria $criteria,
        bool $hasStats,
    ): Collection {
        if ($selected->count() <= 1) {
            return $selected->values();
        }

        if ($criteria->usesSkillMatching()) {
            return $selected
                ->sortBy(fn (GameSessionPlayer $p): int => $this->sequenceSortKey($p, $criteria))
                ->values()
                ->sortByDesc(fn (GameSessionPlayer $p): int => $this->normalizedSkillLevel($p))
                ->values();
        }

        return $selected
            ->sortBy(fn (GameSessionPlayer $p): int => $this->sequenceSortKey($p, $criteria))
            ->values()
            ->sortByDesc(fn (GameSessionPlayer $p): int => $this->strengthScore($p, $hasStats, $criteria))
            ->values();
    }

    /**
     * @param  Collection<int, GameSessionPlayer>  $players
     * @return array<int, int>
     */
    private function assignTeams(Collection $players, string $matchType, AutoMatchCriteria $criteria): array
    {
        if ($matchType === 'singles') {
            return [0 => 1, 1 => 2];
        }

        if ($criteria->usesSkillMatching() && ! $criteria->isBalancedSkillMode()) {
            $levels = $players->map(fn (GameSessionPlayer $p): int => $this->normalizedSkillLevel($p))->unique()->count();
            if ($levels === 1) {
                return [0 => 1, 1 => 1, 2 => 2, 3 => 2];
            }

            return [0 => 1, 1 => 1, 2 => 2, 3 => 2];
        }

        return [0 => 1, 1 => 2, 2 => 2, 3 => 1];
    }

    /**
     * @param  Collection<int, GameSessionPlayer>  $players
     * @param  array<int, int>  $teamAssignments
     * @return array<int, int>
     */
    private function applyGenderlessMixed(
        Collection $players,
        array $teamAssignments,
        string $matchType,
    ): array {
        if ($matchType === 'singles') {
            return $teamAssignments;
        }

        if ($players->count() !== 4) {
            return $teamAssignments;
        }

        $best = $teamAssignments;
        $bestScore = $this->doublesGenderlessScore($players, $teamAssignments);

        $team1Indices = array_keys(array_filter($teamAssignments, fn (int $t): bool => $t === 1));
        $team2Indices = array_keys(array_filter($teamAssignments, fn (int $t): bool => $t === 2));

        foreach ($team1Indices as $i1) {
            foreach ($team2Indices as $i2) {
                $candidate = $teamAssignments;
                $candidate[$i1] = 2;
                $candidate[$i2] = 1;
                $candidateScore = $this->doublesGenderlessScore($players, $candidate);
                if ($candidateScore > $bestScore) {
                    $bestScore = $candidateScore;
                    $best = $candidate;
                }
            }
        }

        return $best;
    }

    /**
     * @param  array<int, int>  $teamAssignments
     */
    private function doublesGenderlessScore(Collection $players, array $teamAssignments): int
    {
        $score = 0;

        foreach ([1, 2] as $team) {
            $indices = array_keys(array_filter($teamAssignments, fn (int $t): bool => $t === $team));
            if (count($indices) !== 2) {
                continue;
            }

            $pronouns = [];
            foreach ($indices as $index) {
                $group = $this->strictPronounGroup($players[$index]);
                if ($group !== null) {
                    $pronouns[] = $group;
                }
            }

            if (count($pronouns) === 2) {
                $score += $pronouns[0] !== $pronouns[1] ? 2 : -2;
            }
        }

        return $score;
    }

    private function strictPronounGroup(GameSessionPlayer $p): ?string
    {
        $pronoun = trim((string) ($p->pronoun ?? ''));

        return match ($pronoun) {
            'He/Him' => 'he',
            'She/Her' => 'she',
            default => null,
        };
    }

    /**
     * @param  Collection<int, GameSessionPlayer>  $pool
     */
    private function bestBySkillWlSequence(
        Collection $pool,
        AutoMatchCriteria $criteria,
        bool $hasStats,
    ): GameSessionPlayer {
        return $this->sortBySkillWlSequence($pool, $criteria, $hasStats)->first();
    }

    /**
     * @param  Collection<int, GameSessionPlayer>  $pool
     */
    private function worstBySkillWlSequence(
        Collection $pool,
        AutoMatchCriteria $criteria,
        bool $hasStats,
        ?GameSessionPlayer $preferDifferentPronounFrom = null,
    ): GameSessionPlayer {
        $sorted = $pool
            ->sortBy(fn (GameSessionPlayer $p): int => $this->sequenceSortKey($p, $criteria))
            ->values()
            ->sortBy(fn (GameSessionPlayer $p): int => $this->normalizedSkillLevel($p))
            ->values();

        if ($criteria->wlStatistics && $hasStats) {
            $sorted = $sorted->sortBy(fn (GameSessionPlayer $p): int => $this->winRateBand($p))->values();
        }

        if ($preferDifferentPronounFrom !== null) {
            $anchorGroup = $this->strictPronounGroup($preferDifferentPronounFrom);
            if ($anchorGroup !== null) {
                $mixed = $this->applyRefreshTieBreak($sorted, $criteria)->first(
                    fn (GameSessionPlayer $p): bool => $this->strictPronounGroup($p) !== null
                        && $this->strictPronounGroup($p) !== $anchorGroup,
                );
                if ($mixed !== null) {
                    return $mixed;
                }
            }
        }

        return $this->applyRefreshTieBreak($sorted, $criteria)->first();
    }

    /**
     * @param  Collection<int, GameSessionPlayer>  $pool
     */
    private function pickLowestDifferentSkill(
        Collection $pool,
        GameSessionPlayer $reference,
        AutoMatchCriteria $criteria,
        bool $hasStats,
    ): ?GameSessionPlayer {
        $refLevel = $this->normalizedSkillLevel($reference);
        $candidates = $pool->filter(
            fn (GameSessionPlayer $p): bool => $this->normalizedSkillLevel($p) !== $refLevel,
        );

        if ($candidates->isEmpty()) {
            return null;
        }

        return $this->worstBySkillWlSequence($candidates, $criteria, $hasStats);
    }

    /**
     * @param  Collection<int, GameSessionPlayer>  $pool
     * @return Collection<int, GameSessionPlayer>
     */
    private function sortBySkillWlSequence(Collection $pool, AutoMatchCriteria $criteria, bool $hasStats): Collection
    {
        $ordered = $pool->values();

        if ($criteria->sequence) {
            $ordered = $ordered->sortBy(fn (GameSessionPlayer $p): int => (int) $p->queue_position)->values();
        }

        if ($criteria->wlStatistics && $hasStats) {
            $ordered = $ordered->sortByDesc(fn (GameSessionPlayer $p): int => $this->winRateBand($p))->values();
        }

        return $this->applyRefreshTieBreak(
            $ordered->sortByDesc(fn (GameSessionPlayer $p): int => $this->normalizedSkillLevel($p))->values(),
            $criteria,
        );
    }

    /**
     * @param  Collection<int, GameSessionPlayer>  $ordered
     * @return Collection<int, GameSessionPlayer>
     */
    private function applyRefreshTieBreak(Collection $ordered, AutoMatchCriteria $criteria): Collection
    {
        if (! $criteria->isRefresh()) {
            return $ordered;
        }

        return $ordered
            ->sortBy(fn (GameSessionPlayer $p): int => $this->refreshTieBreak($p, $criteria))
            ->values();
    }

    private function refreshTieBreak(GameSessionPlayer $player, AutoMatchCriteria $criteria): int
    {
        $seed = $criteria->refreshSeed ?? 0;

        return crc32($player->id.':'.$seed) & 0x7FFFFFFF;
    }

    private function sequenceSortKey(GameSessionPlayer $p, AutoMatchCriteria $criteria): int
    {
        return $criteria->sequence ? (int) $p->queue_position : 0;
    }

    private function normalizedSkillLevel(GameSessionPlayer $p): int
    {
        if ($p->skill_level === null) {
            return 3;
        }

        return max(1, min(5, (int) $p->skill_level));
    }

    private function strengthScore(GameSessionPlayer $p, bool $hasStats, AutoMatchCriteria $criteria): int
    {
        $skill = $this->normalizedSkillLevel($p);

        if ($criteria->wlStatistics && $hasStats) {
            return ($this->winRateBand($p) * 10) + $skill;
        }

        return $skill;
    }

    private function winRateBand(GameSessionPlayer $p): int
    {
        $wins = (int) $p->wins_count;
        $losses = (int) $p->losses_count;
        $games = $wins + $losses;
        if ($games <= 0) {
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
    private function bracketLabelForChunk(Collection $chunk, bool $hasStats, AutoMatchCriteria $criteria): string
    {
        if ($criteria->usesSkillMatching() && $criteria->isBalancedSkillMode()) {
            $levels = $chunk
                ->map(fn (GameSessionPlayer $p): int => $this->normalizedSkillLevel($p))
                ->unique()
                ->values()
                ->all();

            if (count($levels) > 1) {
                return 'Balanced skill';
            }
        }

        if ($hasStats && $criteria->wlStatistics) {
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

        $levels = $chunk
            ->map(fn (GameSessionPlayer $p): int => $this->normalizedSkillLevel($p))
            ->unique()
            ->values()
            ->all();

        if (count($levels) === 1) {
            $level = $levels[0];

            return 'Level '.$level.' — '.(self::SKILL_LEVEL_NAMES[$level] ?? 'Skill');
        }

        return 'Mixed skill levels';
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
            'skill_level' => $p->skill_level !== null ? (int) $p->skill_level : null,
            'wins_count' => $wins,
            'losses_count' => $losses,
            'matches_played' => $wins + $losses,
            'team' => $team,
        ];
    }
}
