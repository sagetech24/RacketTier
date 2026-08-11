<?php

namespace App\Actions;

use App\Data\AutoMatchCriteria;
use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Services\QueueingSessionDraftHydrator;
use App\Services\QueueingSessionDraftLineup;
use App\Services\QueueingSessionDraftStore;
use App\Services\QueueingSessionMatchLineup;
use Illuminate\Support\Collection;

class AutoGenerateQueueingSessionMatches
{
    /** @var array<int, string> */
    private const SKILL_LEVEL_NAMES = [
        1 => 'Starter',
        2 => 'Beginner',
        3 => 'Intermediate',
        4 => 'Advance',
        5 => 'Pro Elite',
    ];

    private const SCORE_WINNER_VS_WINNER = 30;

    private const SCORE_MIXED_FORM = 10;

    private const SCORE_LOSER_VS_LOSER = -20;

    private const SCORE_ALL_LOSERS_DIFF_MATCH = -10;

    public function __construct(
        private QueueingSessionMatchLineup $lineup,
        private QueueingSessionDraftStore $draftStore,
        private QueueingSessionDraftLineup $draftLineup,
        private QueueingSessionDraftHydrator $hydrator,
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
     *   eligibility_breakdown: array{
     *     total_roster: int,
     *     playing: int,
     *     queued_in_matches: int,
     *     waiting_available: int,
     *     not_in_queue: int,
     *   },
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

        if ($session->isDraft()) {
            $draft = $this->draftStore->load((int) $session->id);
            $reserved = $this->draftLineup->reservedPlayerIds($draft);
            $hydrated = $this->hydrator->hydrate($session);
            /** @var Collection<int, GameSessionPlayer> $roster */
            $roster = $hydrated->players->values();
        } else {
            $reserved = $this->lineup->reservedPlayerIds((int) $session->id);

            /** @var Collection<int, GameSessionPlayer> $roster */
            $roster = GameSessionPlayer::query()
                ->with('user:id,name')
                ->where('game_session_id', $session->id)
                ->orderBy('queue_position')
                ->get();
        }

        /** @var Collection<int, GameSessionPlayer> $eligible */
        $eligible = $roster
            ->filter(fn (GameSessionPlayer $p): bool => $p->is_waiting
                && ! $p->is_playing
                && ! (bool) $p->getAttribute('is_removed'))
            ->when($reserved !== [], fn (Collection $c): Collection => $c->reject(
                fn (GameSessionPlayer $p): bool => in_array((int) $p->id, $reserved, true),
            ))
            ->sortBy('queue_position')
            ->values();

        $totalEligible = $eligible->count();
        $eligibilityBreakdown = $this->eligibilityBreakdown($roster, $reserved, $totalEligible);

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
                'eligibility_breakdown' => $eligibilityBreakdown,
            ];
        }

        /** @var Collection<int, GameSessionPlayer> $pool */
        $pool = $eligible->values();
        $proposals = [];
        $proposalIndex = 0;

        while ($pool->count() >= $required) {
            $selected = $this->selectPlayersForMatch($pool, $required, $matchType, $criteria, $hasStats);

            if ($selected->count() < $required) {
                break;
            }

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
            'eligibility_breakdown' => $eligibilityBreakdown,
        ];
    }

    /**
     * @param  Collection<int, GameSessionPlayer>  $roster
     * @param  list<int>  $reserved
     * @return array{
     *   total_roster: int,
     *   playing: int,
     *   queued_in_matches: int,
     *   waiting_available: int,
     *   not_in_queue: int,
     * }
     */
    private function eligibilityBreakdown(Collection $roster, array $reserved, int $waitingAvailable): array
    {
        $active = $roster->filter(
            fn (GameSessionPlayer $p): bool => ! (bool) $p->getAttribute('is_removed'),
        );

        $reservedLookup = array_flip($reserved);

        $playing = $active->filter(fn (GameSessionPlayer $p): bool => $p->is_playing)->count();

        $queuedInMatches = $active->filter(
            fn (GameSessionPlayer $p): bool => ! $p->is_playing && isset($reservedLookup[(int) $p->id]),
        )->count();

        $notInQueue = $active->filter(
            fn (GameSessionPlayer $p): bool => ! $p->is_waiting && ! $p->is_playing,
        )->count();

        return [
            'total_roster' => $active->count(),
            'playing' => $playing,
            'queued_in_matches' => $queuedInMatches,
            'waiting_available' => $waitingAvailable,
            'not_in_queue' => $notInQueue,
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
        $pool = $this->narrowPoolByFairness($pool, $required);

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
        $ordered = $this->fairnessSort($pool, $criteria);

        if ($criteria->wlStatistics && $hasStats && $this->poolHasLastMatchResults($pool)) {
            $ordered = $this->selectByLastMatchBracket($ordered, $required, $criteria);
        } elseif ($criteria->wlStatistics && $hasStats) {
            $ordered = $ordered
                ->sortBy([
                    fn (GameSessionPlayer $p): int => $this->matchesPlayed($p),
                    fn (GameSessionPlayer $p): int => $this->sequenceSortKey($p, $criteria),
                ])
                ->values()
                ->sortByDesc(fn (GameSessionPlayer $p): int => $this->winRateBand($p))
                ->values();
            $ordered = $this->applyRefreshTieBreak($ordered, $criteria);
        }

        return $ordered->take($required)->values();
    }

    /**
     * Prefer winner-bracket groupings; deprioritize all-loser pairings when alternatives exist.
     *
     * @param  Collection<int, GameSessionPlayer>  $ordered
     * @return Collection<int, GameSessionPlayer>
     */
    private function selectByLastMatchBracket(
        Collection $ordered,
        int $required,
        AutoMatchCriteria $criteria,
    ): Collection {
        $winners = $ordered->filter(fn (GameSessionPlayer $p): bool => $this->lastMatchResult($p) === 'win')->values();
        $losers = $ordered->filter(fn (GameSessionPlayer $p): bool => $this->lastMatchResult($p) === 'loss')->values();
        $fresh = $ordered->filter(fn (GameSessionPlayer $p): bool => $this->lastMatchResult($p) === null)->values();

        if ($winners->count() >= $required) {
            return $this->applyRefreshTieBreak($this->fairnessSort($winners, $criteria), $criteria)->take($required)->values();
        }

        if ($winners->count() + $fresh->count() >= $required) {
            return $this->applyRefreshTieBreak(
                $this->fairnessSort($winners->merge($fresh), $criteria),
                $criteria,
            )->take($required)->values();
        }

        if ($losers->count() >= $required) {
            return $this->applyRefreshTieBreak($this->fairnessSort($losers, $criteria), $criteria)->take($required)->values();
        }

        return $this->applyRefreshTieBreak($ordered, $criteria)->take($required)->values();
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
        $winners = $pool->filter(fn (GameSessionPlayer $p): bool => $this->lastMatchResult($p) === 'win')->values();
        if ($winners->count() >= 2 && $this->poolHasLastMatchResults($pool)) {
            $anchor = $this->bestBySkillWlSequence($winners, $criteria, $hasStats);
            if ($anchor === null) {
                return $pool->take(2)->values();
            }
            $candidates = $winners->reject(fn (GameSessionPlayer $p): bool => $p->id === $anchor->id)->values();
            $anchorLevel = $this->normalizedSkillLevel($anchor);
            $differentTier = $candidates->filter(
                fn (GameSessionPlayer $p): bool => $this->normalizedSkillLevel($p) !== $anchorLevel,
            );
            $opponentPool = $differentTier->isNotEmpty() ? $differentTier : $candidates;
            $opponent = $this->pickSinglesOpponent($opponentPool, $anchor, $criteria, $hasStats);

            return collect([$anchor, $opponent])->filter()->values();
        }

        $anchor = $this->bestBySkillWlSequence($pool, $criteria, $hasStats);
        if ($anchor === null) {
            return $pool->take(2)->values();
        }
        $anchorLevel = $this->normalizedSkillLevel($anchor);

        $candidates = $pool->reject(fn (GameSessionPlayer $p): bool => $p->id === $anchor->id)->values();

        $differentTier = $candidates->filter(
            fn (GameSessionPlayer $p): bool => $this->normalizedSkillLevel($p) !== $anchorLevel,
        );

        $opponentPool = $differentTier->isNotEmpty() ? $differentTier : $candidates;

        $opponent = $this->pickSinglesOpponent($opponentPool, $anchor, $criteria, $hasStats);

        return collect([$anchor, $opponent])->filter()->values();
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
        $winners = $pool->filter(fn (GameSessionPlayer $p): bool => $this->lastMatchResult($p) === 'win')->values();
        if ($winners->count() >= $required && $this->poolHasLastMatchResults($pool)) {
            return $this->buildBalancedDoublesFromPool($winners, $criteria, $hasStats);
        }

        return $this->buildBalancedDoublesFromPool($pool, $criteria, $hasStats);
    }

    /**
     * @param  Collection<int, GameSessionPlayer>  $pool
     * @return Collection<int, GameSessionPlayer>
     */
    private function buildBalancedDoublesFromPool(
        Collection $pool,
        AutoMatchCriteria $criteria,
        bool $hasStats,
    ): Collection {
        $sorted = $this->sortBySkillWlSequence($pool, $criteria, $hasStats);

        if ($sorted->count() < 4) {
            return $sorted->take(4)->values();
        }

        $p0 = $sorted->first();
        $remaining = $sorted->slice(1)->values();

        $p3 = $this->pickLowestDifferentSkill($remaining, $p0, $criteria, $hasStats)
            ?? $remaining->last();

        $remaining = $remaining->reject(fn (GameSessionPlayer $p): bool => $p->id === $p3?->id)->values();

        $p1 = $this->bestBySkillWlSequence($remaining, $criteria, $hasStats);
        if ($p1 === null) {
            return $sorted->take(4)->values();
        }

        $remaining = $remaining->reject(fn (GameSessionPlayer $p): bool => $p->id === $p1->id)->values();

        $p2 = $this->worstBySkillWlSequence($remaining, $criteria, $hasStats);
        if ($p2 === null) {
            return $sorted->take(4)->values();
        }

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
            if ($next === null) {
                break;
            }
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
    ): ?GameSessionPlayer {
        if ($pool->isEmpty()) {
            return null;
        }

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
    ): ?GameSessionPlayer {
        if ($pool->isEmpty()) {
            return null;
        }

        $sortKeys = [
            fn (GameSessionPlayer $p): int => $this->matchesPlayed($p),
            fn (GameSessionPlayer $p): int => $this->normalizedSkillLevel($p),
        ];

        if ($criteria->wlStatistics && $hasStats) {
            $sortKeys[] = fn (GameSessionPlayer $p): int => $this->winRateBand($p);
        }

        $sortKeys[] = fn (GameSessionPlayer $p): int => $this->sequenceSortKey($p, $criteria);

        $sorted = $pool->sortBy($sortKeys)->values();

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
        $sortKeys = [
            fn (GameSessionPlayer $p): int => $this->matchesPlayed($p),
        ];

        if ($this->poolHasLastMatchResults($pool)) {
            $sortKeys[] = fn (GameSessionPlayer $p): int => -$this->lastMatchResultScore($p);
        }

        if ($criteria->wlStatistics && $hasStats) {
            $sortKeys[] = fn (GameSessionPlayer $p): int => -$this->winRateBand($p);
        }

        $sortKeys[] = fn (GameSessionPlayer $p): int => -$this->normalizedSkillLevel($p);
        $sortKeys[] = fn (GameSessionPlayer $p): int => $this->sequenceSortKey($p, $criteria);

        return $this->applyRefreshTieBreak(
            $pool->sortBy($sortKeys)->values(),
            $criteria,
        );
    }

    /**
     * @param  Collection<int, GameSessionPlayer>  $pool
     */
    private function pickSinglesOpponent(
        Collection $pool,
        GameSessionPlayer $anchor,
        AutoMatchCriteria $criteria,
        bool $hasStats,
    ): ?GameSessionPlayer {
        if ($pool->isEmpty()) {
            return null;
        }

        if ($pool->count() === 1) {
            return $pool->first();
        }

        $hasAlternatives = $pool->contains(
            fn (GameSessionPlayer $p): bool => in_array($this->lastMatchResult($p), ['win', null], true),
        );

        $scored = $pool->map(function (GameSessionPlayer $p) use ($anchor, $criteria, $hasStats, $hasAlternatives): array {
            $score = $this->scoreSinglesOpponent($p, $anchor, $hasAlternatives);
            $score += $this->skillBalanceBonus($anchor, $p);
            $score -= $this->matchesPlayed($p) * 5;
            $score -= $this->sequenceSortKey($p, $criteria);

            if ($criteria->wlStatistics && $hasStats) {
                $score += $this->winRateBand($p);
            }

            return ['player' => $p, 'score' => $score];
        })->sortByDesc('score')->values();

        $topScore = $scored->first()['score'] ?? 0;
        $topTier = $scored->filter(fn (array $row): bool => $row['score'] === $topScore)->pluck('player');

        return $this->applyRefreshTieBreak($topTier, $criteria)->first();
    }

    private function scoreSinglesOpponent(
        GameSessionPlayer $opponent,
        GameSessionPlayer $anchor,
        bool $hasAlternatives,
    ): int {
        $anchorResult = $this->lastMatchResult($anchor);
        $opponentResult = $this->lastMatchResult($opponent);

        if ($anchorResult === null || $opponentResult === null) {
            return 0;
        }

        if ($anchorResult === 'win' && $opponentResult === 'win') {
            return self::SCORE_WINNER_VS_WINNER;
        }

        if ($anchorResult !== $opponentResult) {
            return self::SCORE_MIXED_FORM;
        }

        if ($anchorResult === 'loss' && $opponentResult === 'loss') {
            if (! $hasAlternatives) {
                return self::SCORE_LOSER_VS_LOSER;
            }

            $score = self::SCORE_LOSER_VS_LOSER;
            if ($this->lastMatchId($anchor) !== null
                && $this->lastMatchId($opponent) !== null
                && $this->lastMatchId($anchor) !== $this->lastMatchId($opponent)) {
                $score += self::SCORE_ALL_LOSERS_DIFF_MATCH;
            }

            return $score;
        }

        return 0;
    }

    private function skillBalanceBonus(GameSessionPlayer $a, GameSessionPlayer $b): int
    {
        $diff = abs($this->normalizedSkillLevel($a) - $this->normalizedSkillLevel($b));

        return $diff > 0 ? min(10, $diff * 3) : 0;
    }

    /**
     * @param  Collection<int, GameSessionPlayer>  $pool
     * @return Collection<int, GameSessionPlayer>
     */
    private function narrowPoolByFairness(Collection $pool, int $required): Collection
    {
        if ($pool->isEmpty()) {
            return $pool;
        }

        if ($pool->count() <= $required) {
            return $pool->values();
        }

        $min = (int) $pool->min(fn (GameSessionPlayer $p): int => $this->matchesPlayed($p));
        $max = (int) $pool->max(fn (GameSessionPlayer $p): int => $this->matchesPlayed($p));

        for ($band = 0; $band <= ($max - $min); $band++) {
            $narrowed = $pool
                ->filter(fn (GameSessionPlayer $p): bool => $this->matchesPlayed($p) <= $min + $band)
                ->values();

            if ($narrowed->count() >= $required) {
                return $narrowed;
            }
        }

        return $pool->values();
    }

    /**
     * @param  Collection<int, GameSessionPlayer>  $pool
     * @return Collection<int, GameSessionPlayer>
     */
    private function fairnessSort(Collection $pool, AutoMatchCriteria $criteria): Collection
    {
        return $pool->sortBy([
            fn (GameSessionPlayer $p): int => $this->matchesPlayed($p),
            fn (GameSessionPlayer $p): int => $this->sequenceSortKey($p, $criteria),
        ])->values();
    }

    /**
     * @param  Collection<int, GameSessionPlayer>  $pool
     */
    private function poolHasLastMatchResults(Collection $pool): bool
    {
        return $pool->contains(
            fn (GameSessionPlayer $p): bool => $this->lastMatchResult($p) !== null,
        );
    }

    private function matchesPlayed(GameSessionPlayer $p): int
    {
        return (int) $p->wins_count + (int) $p->losses_count;
    }

    private function lastMatchResult(GameSessionPlayer $p): ?string
    {
        $result = $p->last_match_result;

        return in_array($result, ['win', 'loss'], true) ? $result : null;
    }

    private function lastMatchId(GameSessionPlayer $p): ?int
    {
        return $p->last_match_id !== null ? (int) $p->last_match_id : null;
    }

    private function lastMatchResultScore(GameSessionPlayer $p): int
    {
        return match ($this->lastMatchResult($p)) {
            'win' => 2,
            'loss' => 0,
            default => 1,
        };
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
        if ($this->poolHasLastMatchResults($chunk)) {
            $results = $chunk
                ->map(fn (GameSessionPlayer $p): ?string => $this->lastMatchResult($p))
                ->filter()
                ->unique()
                ->values()
                ->all();

            if ($results === ['win']) {
                return 'Winner bracket';
            }

            if ($results === ['loss']) {
                return 'Loser pool';
            }

            if (count($results) > 1) {
                return 'Mixed form';
            }
        }

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
            'last_match_result' => $this->lastMatchResult($p),
            'team' => $team,
        ];
    }
}
