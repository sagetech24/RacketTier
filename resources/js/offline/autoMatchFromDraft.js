/**
 * Offline port of App\Actions\AutoGenerateQueueingSessionMatches (draft-local inputs only).
 */

import { lineupPlayerIds, reservedQueueingPlayerIds } from '../lib/queueingMatchLineup.js';

const SKILL_MODE_BALANCED = 'balanced';
const SKILL_MODE_SAME_LEVEL = 'same_level';
const SKILL_MODE_ROTATION = 'rotation';

const SCORE_WINNER_VS_WINNER = 30;
const SCORE_MIXED_FORM = 10;
const SCORE_LOSER_VS_LOSER = -20;
const SCORE_ALL_LOSERS_DIFF_MATCH = -10;

const ROTATION_MAX_PARTNERSHIPS = 2;
const ROTATION_CANDIDATE_WINDOW = 10;
const ROTATION_PARTNER_WEIGHT = 100;
const ROTATION_REPEAT_PENALTY = 500;
const ROTATION_OVER_MAX_PENALTY = 2000;
const ROTATION_OPPONENT_NOVELTY_BONUS = 15;

const SKILL_LEVEL_NAMES = {
    1: 'Starter',
    2: 'Beginner',
    3: 'Intermediate',
    4: 'Advance',
    5: 'Pro Elite',
};

/** @type {{ partners: Record<string, number>, opponents: Record<string, number> }} */
let pairHistory = { partners: {}, opponents: {} };

/** @param {unknown} value */
function parseBool(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (['1', 'true', 'yes', 'on'].includes(lower)) return true;
        if (['0', 'false', 'no', 'off'].includes(lower)) return false;
    }
    return Boolean(value);
}

/** @param {unknown} value */
function parseSkillMatchMode(value) {
    const mode = typeof value === 'string' ? value.toLowerCase().trim() : SKILL_MODE_BALANCED;
    return [SKILL_MODE_BALANCED, SKILL_MODE_SAME_LEVEL, SKILL_MODE_ROTATION].includes(mode)
        ? mode
        : SKILL_MODE_BALANCED;
}

/**
 * @param {Record<string, unknown> | null | undefined} stored
 * @param {string} matchType
 */
function resolveCriteria(stored, matchType) {
    const base = stored && typeof stored === 'object' ? stored : {};
    /** @type {AutoMatchCriteriaObj} */
    let criteria = {
        skillLevel: parseBool(base.skill_level ?? true),
        skillMatchMode: parseSkillMatchMode(base.skill_match_mode ?? SKILL_MODE_BALANCED),
        wlStatistics: parseBool(base.wl_statistics ?? true),
        sequence: parseBool(base.sequence ?? true),
        genderlessMixed: parseBool(base.genderless_mixed ?? true),
        includeLobby: parseBool(base.include_lobby ?? true),
        refreshSeed: null,
    };
    if (matchType !== 'doubles' && criteria.skillMatchMode === SKILL_MODE_ROTATION) {
        criteria = { ...criteria, skillMatchMode: SKILL_MODE_BALANCED };
    }
    return criteria;
}

/**
 * @param {AutoMatchCriteriaObj} criteria
 */
function criteriaToArray(criteria) {
    return {
        skill_level: criteria.skillLevel,
        skill_match_mode: criteria.skillMatchMode,
        wl_statistics: criteria.wlStatistics,
        sequence: criteria.sequence,
        genderless_mixed: criteria.genderlessMixed,
        include_lobby: criteria.includeLobby,
        refresh_seed: criteria.refreshSeed,
    };
}

/** @param {Record<string, unknown>} session @param {Record<string, unknown> | null | undefined} passed */
function mergeCriteria(session, passed) {
    const stored = passed ?? session.auto_match_criteria;
    const matchType = session.match_type === 'doubles' ? 'doubles' : 'singles';
    const criteria = resolveCriteria(
        stored && typeof stored === 'object' ? /** @type {Record<string, unknown>} */ (stored) : null,
        matchType,
    );
    if (passed && typeof passed.refresh_seed === 'number' && passed.refresh_seed > 0) {
        criteria.refreshSeed = passed.refresh_seed;
    }
    return criteria;
}

/** @typedef {{ skillLevel: boolean, skillMatchMode: string, wlStatistics: boolean, sequence: boolean, genderlessMixed: boolean, includeLobby: boolean, refreshSeed: number | null }} AutoMatchCriteriaObj */

/** @param {unknown} p */
function playerId(p) {
    return Number(/** @type {{ id?: number, game_session_player_id?: number }} */ (p).id
        ?? /** @type {{ game_session_player_id?: number }} */ (p).game_session_player_id
        ?? 0);
}

/** @param {unknown} p */
function matchesPlayed(p) {
    const row = /** @type {{ wins_count?: number, losses_count?: number }} */ (p);
    return Number(row.wins_count ?? 0) + Number(row.losses_count ?? 0);
}

/** @param {unknown} p */
function normalizedSkillLevel(p) {
    const raw = /** @type {{ skill_level?: number | null }} */ (p).skill_level;
    if (raw === null || raw === undefined) return 3;
    return Math.max(1, Math.min(5, Number(raw)));
}

/** @param {unknown} p */
function lastMatchResult(p) {
    const r = /** @type {{ last_match_result?: string | null }} */ (p).last_match_result;
    return r === 'win' || r === 'loss' ? r : null;
}

/** @param {unknown} p */
function lastMatchId(p) {
    const id = /** @type {{ last_match_id?: number | null }} */ (p).last_match_id;
    return id != null ? Number(id) : null;
}

/** @param {AutoMatchCriteriaObj} criteria @param {unknown} p */
function sequenceSortKey(criteria, p) {
    return criteria.sequence ? Number(/** @type {{ queue_position?: number }} */ (p).queue_position ?? 0) : 0;
}

/** @param {unknown} p */
function winRateBand(p) {
    const wins = Number(/** @type {{ wins_count?: number }} */ (p).wins_count ?? 0);
    const losses = Number(/** @type {{ losses_count?: number }} */ (p).losses_count ?? 0);
    const games = wins + losses;
    if (games <= 0) return 1;
    const rate = wins / games;
    if (rate >= 0.75) return 3;
    if (rate >= 0.5) return 2;
    if (rate >= 0.25) return 1;
    return 0;
}

/** @param {unknown} p */
function lastMatchResultScore(p) {
    const r = lastMatchResult(p);
    if (r === 'win') return 2;
    if (r === 'loss') return 0;
    return 1;
}

/** @param {unknown} p @param {AutoMatchCriteriaObj} criteria */
function refreshTieBreak(p, criteria) {
    const seed = criteria.refreshSeed ?? 0;
    return crc32(`${playerId(p)}:${seed}`) & 0x7fffffff;
}

/** @param {string} str */
function crc32(str) {
    let crc = 0 ^ -1;
    for (let i = 0; i < str.length; i++) {
        crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ str.charCodeAt(i)) & 0xff];
    }
    return (crc ^ -1) >>> 0;
}

const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        table[i] = c;
    }
    return table;
})();

/**
 * @param {unknown[]} pool
 * @param {Array<(p: unknown) => number | string>} keyFns
 */
function sortByPlayerKeys(pool, keyFns) {
    if (pool.length <= 1 || keyFns.length === 0) return [...pool];
    return [...pool].sort((a, b) => {
        for (const keyFn of keyFns) {
            const av = keyFn(a);
            const bv = keyFn(b);
            if (av < bv) return -1;
            if (av > bv) return 1;
        }
        return playerId(a) - playerId(b);
    });
}

/** @param {unknown[]} pool @param {AutoMatchCriteriaObj} criteria */
function fairnessSort(pool, criteria) {
    return sortByPlayerKeys(pool, [
        (p) => matchesPlayed(p),
        (p) => sequenceSortKey(criteria, p),
    ]);
}

/** @param {unknown[]} ordered @param {AutoMatchCriteriaObj} criteria */
function applyRefreshTieBreak(ordered, criteria) {
    if (!criteria.refreshSeed || criteria.refreshSeed <= 0) return ordered;
    return [...ordered].sort((a, b) => refreshTieBreak(a, criteria) - refreshTieBreak(b, criteria));
}

/** @param {unknown[]} pool */
function poolHasLastMatchResults(pool) {
    return pool.some((p) => lastMatchResult(p) !== null);
}

/** @param {number} a @param {number} b */
function pairKey(a, b) {
    return a < b ? `${a}:${b}` : `${b}:${a}`;
}

/** @param {number} a @param {number} b */
function partnerCount(a, b) {
    return pairHistory.partners[pairKey(a, b)] ?? 0;
}

/** @param {number} a @param {number} b */
function opponentCount(a, b) {
    return pairHistory.opponents[pairKey(a, b)] ?? 0;
}

/** @param {number} a @param {number} b */
function partnershipCost(a, b) {
    const count = partnerCount(a, b);
    let cost = count * ROTATION_PARTNER_WEIGHT;
    if (count >= 1) cost += ROTATION_REPEAT_PENALTY;
    if (count >= ROTATION_MAX_PARTNERSHIPS) {
        cost += ROTATION_OVER_MAX_PENALTY * (1 + (count - ROTATION_MAX_PARTNERSHIPS));
    }
    return cost;
}

/**
 * @param {'partners' | 'opponents'} bucket
 * @param {number[]} ids
 */
function incrementPairCounts(bucket, ids) {
    const unique = [...new Set(ids)];
    for (let i = 0; i < unique.length; i++) {
        for (let j = i + 1; j < unique.length; j++) {
            const key = pairKey(unique[i], unique[j]);
            pairHistory[bucket][key] = (pairHistory[bucket][key] ?? 0) + 1;
        }
    }
}

/** @param {number[]} team1 @param {number[]} team2 */
function ingestTeamIdGroups(team1, team2) {
    incrementPairCounts('partners', team1);
    incrementPairCounts('partners', team2);
    for (const a of team1) {
        for (const b of team2) {
            const key = pairKey(a, b);
            pairHistory.opponents[key] = (pairHistory.opponents[key] ?? 0) + 1;
        }
    }
}

/** @param {unknown} lineup */
function ingestStoredLineup(lineup) {
    if (!Array.isArray(lineup)) return;
    /** @type {number[]} */
    const team1 = [];
    /** @type {number[]} */
    const team2 = [];
    for (const row of lineup) {
        if (!row || typeof row !== 'object') continue;
        const pid = Number(row.game_session_player_id ?? row.id ?? 0);
        const team = Number(row.team ?? 0);
        if (pid <= 0 || (team !== 1 && team !== 2)) continue;
        if (team === 1) team1.push(pid);
        else team2.push(pid);
    }
    ingestTeamIdGroups(team1, team2);
}

/** @param {unknown[]} matches */
function ingestLineupsFromMatches(matches) {
    for (const match of matches) {
        if (!match || typeof match !== 'object') continue;
        ingestStoredLineup(match.lineup);
    }
}

/** @param {unknown[]} matches */
function buildReleaseQueueFromMatches(matches) {
    /** @type {Array<{ sort: number[], entry: { availability: 'playing' | 'queued', player_ids: number[] } }>} */
    const ongoing = [];
    /** @type {typeof ongoing} */
    const queueing = [];
    for (const match of matches) {
        if (!match || typeof match !== 'object') continue;
        const status = String(match.status ?? '');
        const playerIds = lineupPlayerIds(match.lineup);
        if (playerIds.length === 0) continue;
        const sortKey = [Number(match.match_no ?? 0), Number(match.id ?? 0)];
        const entry = {
            availability: /** @type {'playing' | 'queued'} */ (status === 'ongoing' ? 'playing' : 'queued'),
            player_ids: playerIds,
        };
        if (status === 'ongoing') ongoing.push({ sort: sortKey, entry });
        else if (status === 'queueing') queueing.push({ sort: sortKey, entry });
    }
    const bySort = (a, b) => (a.sort[0] !== b.sort[0] ? a.sort[0] - b.sort[0] : a.sort[1] - b.sort[1]);
    ongoing.sort(bySort);
    queueing.sort(bySort);
    return [...ongoing.map((r) => r.entry), ...queueing.map((r) => r.entry)];
}

/** @param {unknown} p */
function lobbySortKey(p) {
    const row = /** @type {{ checked_in_at?: string, created_at?: string }} */ (p);
    const ts = row.checked_in_at ? Date.parse(row.checked_in_at) : row.created_at ? Date.parse(row.created_at) : 0;
    return Number.isFinite(ts) ? ts : 0;
}

/** @param {unknown[]} roster @param {Set<number>} reserved */
function eligibilityBreakdown(roster, reserved, waitingAvailable, checkInExcluded = 0) {
    const active = roster.filter((p) => !/** @type {{ is_removed?: boolean }} */ (p).is_removed);
    const playing = active.filter((p) => /** @type {{ is_playing?: boolean }} */ (p).is_playing).length;
    const queuedInMatches = active.filter(
        (p) => !/** @type {{ is_playing?: boolean }} */ (p).is_playing && reserved.has(playerId(p)),
    ).length;
    const notInQueue = active.filter(
        (p) => !/** @type {{ is_waiting?: boolean }} */ (p).is_waiting
            && !/** @type {{ is_playing?: boolean }} */ (p).is_playing,
    ).length;
    /** @type {Record<string, number>} */
    const breakdown = {
        total_roster: active.length,
        playing,
        queued_in_matches: queuedInMatches,
        waiting_available: waitingAvailable,
        not_in_queue: notInQueue,
    };
    if (checkInExcluded > 0) breakdown.check_in_excluded = checkInExcluded;
    return breakdown;
}

/** @param {unknown[]} pool @param {number} required */
function narrowPoolByFairness(pool, required) {
    if (pool.length <= required) return pool;
    const played = pool.map(matchesPlayed);
    const min = Math.min(...played);
    const max = Math.max(...played);
    for (let band = 0; band <= max - min; band++) {
        const narrowed = pool.filter((p) => matchesPlayed(p) <= min + band);
        if (narrowed.length >= required) return narrowed;
    }
    return pool;
}

/** @param {AutoMatchCriteriaObj} c */
function usesSkillMatching(c) {
    return c.skillLevel;
}

/** @param {AutoMatchCriteriaObj} c */
function isBalancedSkillMode(c) {
    return c.skillMatchMode === SKILL_MODE_BALANCED;
}

/** @param {AutoMatchCriteriaObj} c */
function isRotationMode(c) {
    return c.skillMatchMode === SKILL_MODE_ROTATION;
}

/** @param {unknown[]} pool @param {AutoMatchCriteriaObj} criteria @param {boolean} hasStats */
function sortBySkillWlSequence(pool, criteria, hasStats) {
    /** @type {Array<(p: unknown) => number>} */
    const keys = [(p) => matchesPlayed(p)];
    if (poolHasLastMatchResults(pool)) {
        keys.push((p) => -lastMatchResultScore(p));
    }
    if (criteria.wlStatistics && hasStats) {
        keys.push((p) => -winRateBand(p));
    }
    keys.push((p) => -normalizedSkillLevel(p));
    keys.push((p) => sequenceSortKey(criteria, p));
    return applyRefreshTieBreak(sortByPlayerKeys(pool, keys), criteria);
}

/** @param {unknown[]} pool @param {AutoMatchCriteriaObj} criteria @param {boolean} hasStats */
function bestBySkillWlSequence(pool, criteria, hasStats) {
    return sortBySkillWlSequence(pool, criteria, hasStats)[0] ?? null;
}

/** @param {unknown[]} pool @param {AutoMatchCriteriaObj} criteria @param {boolean} hasStats */
function worstBySkillWlSequence(pool, criteria, hasStats) {
    const keys = [
        (p) => matchesPlayed(p),
        (p) => normalizedSkillLevel(p),
    ];
    if (criteria.wlStatistics && hasStats) keys.push((p) => winRateBand(p));
    keys.push((p) => sequenceSortKey(criteria, p));
    return applyRefreshTieBreak(sortByPlayerKeys(pool, keys), criteria)[0] ?? null;
}

/** @param {unknown[]} pool @param {unknown} reference @param {AutoMatchCriteriaObj} criteria @param {boolean} hasStats */
function pickLowestDifferentSkill(pool, reference, criteria, hasStats) {
    const refLevel = normalizedSkillLevel(reference);
    const candidates = pool.filter((p) => normalizedSkillLevel(p) !== refLevel);
    if (candidates.length === 0) return null;
    return worstBySkillWlSequence(candidates, criteria, hasStats);
}

/** @param {unknown} opponent @param {unknown} anchor @param {boolean} hasAlternatives */
function scoreSinglesOpponent(opponent, anchor, hasAlternatives) {
    const anchorResult = lastMatchResult(anchor);
    const opponentResult = lastMatchResult(opponent);
    if (anchorResult === null || opponentResult === null) return 0;
    if (anchorResult === 'win' && opponentResult === 'win') return SCORE_WINNER_VS_WINNER;
    if (anchorResult !== opponentResult) return SCORE_MIXED_FORM;
    if (anchorResult === 'loss' && opponentResult === 'loss') {
        if (!hasAlternatives) return SCORE_LOSER_VS_LOSER;
        let score = SCORE_LOSER_VS_LOSER;
        const aId = lastMatchId(anchor);
        const oId = lastMatchId(opponent);
        if (aId !== null && oId !== null && aId !== oId) score += SCORE_ALL_LOSERS_DIFF_MATCH;
        return score;
    }
    return 0;
}

/** @param {unknown} a @param {unknown} b */
function skillBalanceBonus(a, b) {
    const diff = Math.abs(normalizedSkillLevel(a) - normalizedSkillLevel(b));
    return diff > 0 ? Math.min(10, diff * 3) : 0;
}

/** @param {unknown[]} pool @param {unknown} anchor @param {AutoMatchCriteriaObj} criteria @param {boolean} hasStats */
function pickSinglesOpponent(pool, anchor, criteria, hasStats) {
    if (pool.length === 0) return null;
    if (pool.length === 1) return pool[0];
    const hasAlternatives = pool.some((p) => {
        const r = lastMatchResult(p);
        return r === 'win' || r === null;
    });
    const scored = pool
        .map((p) => {
            let score = scoreSinglesOpponent(p, anchor, hasAlternatives);
            score += skillBalanceBonus(anchor, p);
            score -= matchesPlayed(p) * 5;
            score -= sequenceSortKey(criteria, p);
            if (criteria.wlStatistics && hasStats) score += winRateBand(p);
            return { player: p, score };
        })
        .sort((a, b) => b.score - a.score);
    const topScore = scored[0]?.score ?? 0;
    const topTier = scored.filter((r) => r.score === topScore).map((r) => r.player);
    return applyRefreshTieBreak(topTier, criteria)[0] ?? null;
}

/** @param {unknown[]} ordered @param {number} required @param {AutoMatchCriteriaObj} criteria */
function selectByLastMatchBracket(ordered, required, criteria) {
    const winners = ordered.filter((p) => lastMatchResult(p) === 'win');
    const losers = ordered.filter((p) => lastMatchResult(p) === 'loss');
    const fresh = ordered.filter((p) => lastMatchResult(p) === null);
    if (winners.length >= required) {
        return applyRefreshTieBreak(fairnessSort(winners, criteria), criteria).slice(0, required);
    }
    if (winners.length + fresh.length >= required) {
        return applyRefreshTieBreak(fairnessSort([...winners, ...fresh], criteria), criteria).slice(0, required);
    }
    if (
        fresh.length > 0
        && fresh.length < required
        && winners.length + fresh.length + losers.length >= required
    ) {
        const preferred = fairnessSort([...winners, ...fresh], criteria);
        const fill = fairnessSort(losers, criteria);
        return applyRefreshTieBreak([...preferred, ...fill], criteria).slice(0, required);
    }
    if (losers.length >= required) {
        return applyRefreshTieBreak(fairnessSort(losers, criteria), criteria).slice(0, required);
    }
    return applyRefreshTieBreak(ordered, criteria).slice(0, required);
}

/** @param {unknown[]} pool @param {number} required @param {AutoMatchCriteriaObj} criteria @param {boolean} hasStats */
function selectByWlAndSequence(pool, required, criteria, hasStats) {
    let ordered = fairnessSort(pool, criteria);
    if (criteria.wlStatistics && hasStats && poolHasLastMatchResults(pool)) {
        ordered = selectByLastMatchBracket(ordered, required, criteria);
    } else if (criteria.wlStatistics && hasStats) {
        ordered = applyRefreshTieBreak(
            sortByPlayerKeys(pool, [
                (p) => matchesPlayed(p),
                (p) => -winRateBand(p),
                (p) => sequenceSortKey(criteria, p),
            ]),
            criteria,
        );
    }
    return ordered.slice(0, required);
}

/** @param {unknown[]} pool @param {AutoMatchCriteriaObj} criteria @param {boolean} hasStats */
function selectBalancedSingles(pool, criteria, hasStats) {
    const winners = pool.filter((p) => lastMatchResult(p) === 'win');
    if (winners.length >= 2 && poolHasLastMatchResults(pool)) {
        const anchor = bestBySkillWlSequence(winners, criteria, hasStats);
        if (!anchor) return pool.slice(0, 2);
        const candidates = winners.filter((p) => playerId(p) !== playerId(anchor));
        const anchorLevel = normalizedSkillLevel(anchor);
        const different = candidates.filter((p) => normalizedSkillLevel(p) !== anchorLevel);
        const opponent = pickSinglesOpponent(different.length ? different : candidates, anchor, criteria, hasStats);
        return [anchor, opponent].filter(Boolean);
    }
    const anchor = bestBySkillWlSequence(pool, criteria, hasStats);
    if (!anchor) return pool.slice(0, 2);
    const anchorLevel = normalizedSkillLevel(anchor);
    const candidates = pool.filter((p) => playerId(p) !== playerId(anchor));
    const different = candidates.filter((p) => normalizedSkillLevel(p) !== anchorLevel);
    const opponent = pickSinglesOpponent(different.length ? different : candidates, anchor, criteria, hasStats);
    return [anchor, opponent].filter(Boolean);
}

/** @param {unknown[]} pool @param {AutoMatchCriteriaObj} criteria @param {boolean} hasStats */
function buildBalancedDoublesFromPool(pool, criteria, hasStats) {
    const sorted = sortBySkillWlSequence(pool, criteria, hasStats);
    if (sorted.length < 4) return sorted.slice(0, 4);
    const p0 = sorted[0];
    let remaining = sorted.slice(1);
    const p3 = pickLowestDifferentSkill(remaining, p0, criteria, hasStats) ?? remaining[remaining.length - 1];
    remaining = remaining.filter((p) => playerId(p) !== playerId(p3));
    const p1 = bestBySkillWlSequence(remaining, criteria, hasStats);
    if (!p1) return sorted.slice(0, 4);
    remaining = remaining.filter((p) => playerId(p) !== playerId(p1));
    const p2 = worstBySkillWlSequence(remaining, criteria, hasStats);
    if (!p2) return sorted.slice(0, 4);
    return [p0, p1, p2, p3];
}

/** @param {unknown[]} pool @param {number} required @param {AutoMatchCriteriaObj} criteria @param {boolean} hasStats */
function selectBalancedDoubles(pool, required, criteria, hasStats) {
    const winners = pool.filter((p) => lastMatchResult(p) === 'win');
    if (winners.length >= required && poolHasLastMatchResults(pool)) {
        return buildBalancedDoublesFromPool(winners, criteria, hasStats);
    }
    return buildBalancedDoublesFromPool(pool, criteria, hasStats);
}

/** @param {unknown[]} pool @param {AutoMatchCriteriaObj} criteria @param {boolean} hasStats */
function selectSameLevelSingles(pool, criteria, hasStats) {
    /** @type {Map<number, unknown[]>} */
    const groups = new Map();
    for (const p of pool) {
        const level = normalizedSkillLevel(p);
        if (!groups.has(level)) groups.set(level, []);
        groups.get(level).push(p);
    }
    const levels = [...groups.keys()].sort((a, b) => b - a);
    for (const level of levels) {
        const group = groups.get(level) ?? [];
        if (group.length >= 2) {
            const ordered = sortBySkillWlSequence(group, criteria, hasStats);
            return [ordered[0], ordered[1]];
        }
    }
    return selectBalancedSingles(pool, criteria, hasStats);
}

/** @param {unknown[]} pool @param {number} required @param {AutoMatchCriteriaObj} criteria @param {boolean} hasStats */
function selectSameLevelDoubles(pool, required, criteria, hasStats) {
    /** @type {Map<number, unknown[]>} */
    const groups = new Map();
    for (const p of pool) {
        const level = normalizedSkillLevel(p);
        if (!groups.has(level)) groups.set(level, []);
        groups.get(level).push(p);
    }
    const levels = [...groups.keys()].sort((a, b) => b - a);
    for (const level of levels) {
        const group = groups.get(level) ?? [];
        if (group.length >= required) {
            return sortBySkillWlSequence(group, criteria, hasStats).slice(0, required);
        }
    }
    let largest = [];
    let largestLevel = 0;
    for (const [level, group] of groups) {
        if (group.length > largest.length || (group.length === largest.length && level > largestLevel)) {
            largest = group;
            largestLevel = level;
        }
    }
    if (largest.length < 2) return selectBalancedDoubles(pool, required, criteria, hasStats);
    let selected = sortBySkillWlSequence(largest, criteria, hasStats);
    const selectedIds = new Set(selected.map(playerId));
    let remaining = pool.filter((p) => !selectedIds.has(playerId(p)));
    while (selected.length < required && remaining.length) {
        const next = bestBySkillWlSequence(remaining, criteria, hasStats);
        if (!next) break;
        selected.push(next);
        remaining = remaining.filter((p) => playerId(p) !== playerId(next));
    }
    return selected.slice(0, required);
}

/** @param {unknown[]} items @param {number} k */
function combinations(items, k) {
    if (k <= 0 || k > items.length) return [];
    if (k === items.length) return [items];
    if (k === 1) return items.map((item) => [item]);
    /** @type {unknown[][]} */
    const result = [];
    /** @param {number} start @param {unknown[]} chosen */
    function recurse(start, chosen) {
        if (chosen.length === k) {
            result.push([...chosen]);
            return;
        }
        const need = k - chosen.length;
        for (let i = start; i <= items.length - need; i++) {
            chosen.push(items[i]);
            recurse(i + 1, chosen);
            chosen.pop();
        }
    }
    recurse(0, []);
    return result;
}

/** @param {Record<string, number>} a @param {Record<string, number>} b */
function rotationScoreBetter(a, b) {
    if (a.cost !== b.cost) return a.cost < b.cost;
    if (a.novelty !== b.novelty) return a.novelty > b.novelty;
    return a.sequence < b.sequence;
}

/** @param {unknown[]} quartet @param {AutoMatchCriteriaObj} criteria @param {boolean} hasStats */
function scoreBestPartition(quartet, criteria, hasStats) {
    if (quartet.length !== 4) return null;
    const partitions = [
        [
            [0, 1],
            [2, 3],
        ],
        [
            [0, 2],
            [1, 3],
        ],
        [
            [0, 3],
            [1, 2],
        ],
    ];
    let best = null;
    for (const pairs of partitions) {
        const [a, b] = pairs[0];
        const [c, d] = pairs[1];
        const p0 = quartet[a];
        const p1 = quartet[b];
        const p2 = quartet[c];
        const p3 = quartet[d];
        const partnerCost =
            partnershipCost(playerId(p0), playerId(p1)) + partnershipCost(playerId(p2), playerId(p3));
        let novelty = 0;
        for (const sideA of [p0, p1]) {
            for (const sideB of [p2, p3]) {
                if (opponentCount(playerId(sideA), playerId(sideB)) === 0) {
                    novelty += ROTATION_OPPONENT_NOVELTY_BONUS;
                }
            }
        }
        let sequence = 0;
        for (const p of [p0, p1, p2, p3]) {
            sequence += sequenceSortKey(criteria, p);
            if (criteria.wlStatistics && hasStats) sequence -= winRateBand(p);
        }
        const score = { cost: partnerCost, novelty, sequence };
        if (!best || rotationScoreBetter(score, best.score)) {
            best = { ordered: [p0, p1, p2, p3], score };
        }
    }
    return best;
}

/** @param {unknown[]} window @param {AutoMatchCriteriaObj} criteria @param {boolean} hasStats */
function bestRotationQuartet(window, criteria, hasStats) {
    if (window.length < 4) return null;
    let bestOrdered = null;
    let bestScore = null;
    for (const quartet of combinations(window, 4)) {
        const scored = scoreBestPartition(quartet, criteria, hasStats);
        if (!scored) continue;
        if (!bestScore || rotationScoreBetter(scored.score, bestScore)) {
            bestScore = scored.score;
            bestOrdered = scored.ordered;
        }
    }
    return bestOrdered;
}

/** @param {unknown[]} pool @param {AutoMatchCriteriaObj} criteria @param {boolean} hasStats */
function selectRotationDoubles(pool, criteria, hasStats) {
    let ordered = fairnessSort(pool, criteria);
    if (criteria.wlStatistics && hasStats) {
        ordered = applyRefreshTieBreak(
            sortByPlayerKeys(ordered, [
                (p) => matchesPlayed(p),
                (p) => -winRateBand(p),
                (p) => sequenceSortKey(criteria, p),
            ]),
            criteria,
        );
    } else {
        ordered = applyRefreshTieBreak(ordered, criteria);
    }
    if (ordered.length < 4) return ordered.slice(0, 4);
    const window = ordered.slice(0, Math.min(ROTATION_CANDIDATE_WINDOW, ordered.length));
    return bestRotationQuartet(window, criteria, hasStats) ?? ordered.slice(0, 4);
}

/** @param {unknown[]} pool @param {number} required @param {string} matchType @param {AutoMatchCriteriaObj} criteria @param {boolean} hasStats */
function selectPlayersForMatch(pool, required, matchType, criteria, hasStats) {
    let narrowed = narrowPoolByFairness(pool, required);
    if (!usesSkillMatching(criteria)) {
        return selectByWlAndSequence(narrowed, required, criteria, hasStats);
    }
    if (isRotationMode(criteria)) {
        if (matchType === 'doubles') return selectRotationDoubles(narrowed, criteria, hasStats);
        return selectBalancedSingles(narrowed, criteria, hasStats);
    }
    if (isBalancedSkillMode(criteria)) {
        return matchType === 'doubles'
            ? selectBalancedDoubles(narrowed, required, criteria, hasStats)
            : selectBalancedSingles(narrowed, criteria, hasStats);
    }
    return matchType === 'doubles'
        ? selectSameLevelDoubles(narrowed, required, criteria, hasStats)
        : selectSameLevelSingles(narrowed, criteria, hasStats);
}

/** @param {unknown} anchor @param {unknown[]} rest @param {number} required @param {AutoMatchCriteriaObj} criteria */
function fillLobbySameLevelAroundAnchor(anchor, rest, required) {
    const anchorLevel = normalizedSkillLevel(anchor);
    const selected = [anchor];
    for (const maxDiff of [0, 1]) {
        const candidates = rest
            .filter((p) => Math.abs(normalizedSkillLevel(p) - anchorLevel) <= maxDiff)
            .sort((a, b) => {
                const aDiff = Math.abs(normalizedSkillLevel(a) - anchorLevel);
                const bDiff = Math.abs(normalizedSkillLevel(b) - anchorLevel);
                if (aDiff !== bDiff) return aDiff - bDiff;
                return lobbySortKey(a) - lobbySortKey(b);
            });
        for (const candidate of candidates) {
            if (selected.some((p) => playerId(p) === playerId(candidate))) continue;
            selected.push(candidate);
            if (selected.length >= required) return selected.slice(0, required);
        }
    }
    return selected.length >= required ? selected.slice(0, required) : [];
}

/** @param {unknown} anchor @param {unknown[]} rest @param {number} required @param {string} matchType @param {AutoMatchCriteriaObj} criteria @param {boolean} hasStats */
function fillLobbyBalancedAroundAnchor(anchor, rest, required, matchType, criteria, hasStats) {
    if (matchType === 'singles') {
        const anchorLevel = normalizedSkillLevel(anchor);
        const different = rest.filter((p) => normalizedSkillLevel(p) !== anchorLevel);
        const opponent = pickSinglesOpponent(different.length ? different : rest, anchor, criteria, hasStats);
        return [anchor, opponent].filter(Boolean);
    }
    const selected = [anchor];
    let remaining = [...rest];
    while (selected.length < required && remaining.length) {
        let next = null;
        if (selected.length === 1 || selected.length === 3) {
            next =
                pickLowestDifferentSkill(remaining, anchor, criteria, hasStats)
                ?? [...remaining].sort((a, b) => normalizedSkillLevel(a) - normalizedSkillLevel(b))[0];
        } else {
            next = bestBySkillWlSequence(remaining, criteria, hasStats) ?? remaining[0];
        }
        if (!next) break;
        selected.push(next);
        remaining = remaining.filter((p) => playerId(p) !== playerId(next));
    }
    return selected.length >= required ? selected.slice(0, required) : [];
}

/** @param {unknown[]} lobby @param {number} required @param {AutoMatchCriteriaObj} criteria @param {boolean} hasStats */
function fillLobbyRotationAroundAnchor(lobby, required, criteria, hasStats) {
    if (lobby.length < required) return [];
    const window = lobby.slice(0, Math.min(ROTATION_CANDIDATE_WINDOW, lobby.length));
    return bestRotationQuartet(window, criteria, hasStats) ?? lobby.slice(0, required);
}

/** @param {unknown[]} lobby @param {number} required @param {string} matchType @param {AutoMatchCriteriaObj} criteria @param {boolean} hasStats */
function selectFromLobbyOnly(lobby, required, matchType, criteria, hasStats) {
    const anchor = lobby[0];
    if (!anchor) return [];
    if (!usesSkillMatching(criteria)) return lobby.slice(0, required);
    const rest = lobby.slice(1);
    if (isRotationMode(criteria)) {
        if (matchType !== 'doubles') {
            return fillLobbyBalancedAroundAnchor(anchor, rest, required, matchType, criteria, hasStats);
        }
        return fillLobbyRotationAroundAnchor(lobby, required, criteria, hasStats);
    }
    if (isBalancedSkillMode(criteria)) {
        return fillLobbyBalancedAroundAnchor(anchor, rest, required, matchType, criteria, hasStats);
    }
    return fillLobbySameLevelAroundAnchor(anchor, rest, required);
}

/** @param {unknown[]} rotation @param {unknown[]} seeds @param {number} need @param {string} matchType @param {AutoMatchCriteriaObj} criteria @param {boolean} hasStats */
function selectRotationFillForSeeds(rotation, seeds, need, matchType, criteria, hasStats) {
    if (need <= 0) return [];
    const anchor = seeds[0];
    let pool = [...rotation];
    if (usesSkillMatching(criteria) && anchor && !isRotationMode(criteria)) {
        const anchorLevel = normalizedSkillLevel(anchor);
        if (isBalancedSkillMode(criteria)) {
            const different = pool.filter((p) => normalizedSkillLevel(p) !== anchorLevel);
            if (different.length >= need) pool = different;
        } else {
            const same = pool.filter((p) => normalizedSkillLevel(p) === anchorLevel);
            const near = pool.filter((p) => Math.abs(normalizedSkillLevel(p) - anchorLevel) <= 1);
            if (same.length >= need) pool = same;
            else if (near.length >= need) pool = near;
        }
    }
    if (isRotationMode(criteria) && matchType === 'doubles') {
        return selectRotationFillPreferringNovelty(pool, seeds, need, criteria, hasStats);
    }
    const rotationHasStats = pool.some((p) => matchesPlayed(p) > 0);
    return selectPlayersForMatch(pool, need, matchType, criteria, rotationHasStats).slice(0, need);
}

/** @param {unknown[]} pool @param {unknown[]} seeds @param {number} need @param {AutoMatchCriteriaObj} criteria @param {boolean} hasStats */
function selectRotationFillPreferringNovelty(pool, seeds, need, criteria, hasStats) {
    if (need <= 0) return [];
    let ordered = applyRefreshTieBreak(fairnessSort(pool, criteria), criteria);
    if (ordered.length < need) return [];
    if (seeds.length + need < 4) return ordered.slice(0, need);
    const window = ordered.slice(0, Math.min(ROTATION_CANDIDATE_WINDOW, ordered.length));
    const seedList = [...seeds];
    let bestFill = null;
    let bestScore = null;
    for (const fill of combinations(window, need)) {
        const quartet = [...seedList, ...fill];
        if (quartet.length !== 4) continue;
        const scored = scoreBestPartition(quartet, criteria, hasStats);
        if (!scored) continue;
        if (!bestScore || rotationScoreBetter(scored.score, bestScore)) {
            bestScore = scored.score;
            bestFill = fill;
        }
    }
    return bestFill ?? ordered.slice(0, need);
}

/** @param {unknown[]} lobby @param {unknown[]} rotation @param {number} required @param {string} matchType @param {AutoMatchCriteriaObj} criteria @param {boolean} hasStats */
function selectLobbyAnchoredMatch(lobby, rotation, required, matchType, criteria, hasStats) {
    if (lobby.length === 0) return [];
    if (lobby.length >= required) {
        const lobbyOnly = selectFromLobbyOnly(lobby, required, matchType, criteria, hasStats);
        if (lobbyOnly.length >= required) return lobbyOnly.slice(0, required);
    }
    const seedCount = Math.min(lobby.length, required);
    const seeds = lobby.slice(0, seedCount);
    const need = required - seeds.length;
    if (need <= 0) return seeds.slice(0, required);
    if (rotation.length < need) {
        if (lobby.length >= required) return lobby.slice(0, required);
        return [];
    }
    const fill = selectRotationFillForSeeds(rotation, seeds, need, matchType, criteria, hasStats);
    if (fill.length < need) return [];
    return [...seeds, ...fill];
}

/** @param {unknown[]} selected @param {AutoMatchCriteriaObj} criteria @param {boolean} hasStats */
function orderSelectedForTeams(selected, criteria, hasStats) {
    if (selected.length <= 1) return selected;
    if (isRotationMode(criteria) && selected.length === 4) {
        const scored = scoreBestPartition(selected, criteria, hasStats);
        if (scored) return scored.ordered;
    }
    if (usesSkillMatching(criteria)) {
        return [...selected]
            .sort((a, b) => sequenceSortKey(criteria, a) - sequenceSortKey(criteria, b))
            .sort((a, b) => normalizedSkillLevel(b) - normalizedSkillLevel(a));
    }
    return [...selected]
        .sort((a, b) => sequenceSortKey(criteria, a) - sequenceSortKey(criteria, b))
        .sort(
            (a, b) =>
                strengthScore(b, hasStats, criteria) - strengthScore(a, hasStats, criteria),
        );
}

/** @param {unknown} p @param {boolean} hasStats @param {AutoMatchCriteriaObj} criteria */
function strengthScore(p, hasStats, criteria) {
    const skill = normalizedSkillLevel(p);
    if (criteria.wlStatistics && hasStats) return winRateBand(p) * 10 + skill;
    return skill;
}

/** @param {unknown[]} players @param {string} matchType @param {AutoMatchCriteriaObj} criteria */
function assignTeams(players, matchType, criteria) {
    if (matchType === 'singles') return [1, 2];
    if (isRotationMode(criteria)) return [1, 1, 2, 2];
    if (usesSkillMatching(criteria) && !isBalancedSkillMode(criteria)) return [1, 1, 2, 2];
    return [1, 2, 2, 1];
}

/** @param {unknown} p */
function strictPronounGroup(p) {
    const pronoun = String(/** @type {{ pronoun?: string }} */ (p).pronoun ?? '').trim();
    if (pronoun === 'He/Him') return 'he';
    if (pronoun === 'She/Her') return 'she';
    return null;
}

/** @param {unknown[]} players @param {number[]} teamAssignments */
function doublesGenderlessScore(players, teamAssignments) {
    let score = 0;
    for (const team of [1, 2]) {
        const indices = teamAssignments.map((t, i) => (t === team ? i : -1)).filter((i) => i >= 0);
        if (indices.length !== 2) continue;
        const pronouns = indices.map((i) => strictPronounGroup(players[i])).filter(Boolean);
        if (pronouns.length === 2) score += pronouns[0] !== pronouns[1] ? 2 : -2;
    }
    return score;
}

/** @param {unknown[]} players @param {number[]} teamAssignments @param {string} matchType */
function applyGenderlessMixed(players, teamAssignments, matchType) {
    if (matchType === 'singles' || players.length !== 4) return teamAssignments;
    let best = teamAssignments;
    let bestScore = doublesGenderlessScore(players, teamAssignments);
    const team1Indices = teamAssignments.map((t, i) => (t === 1 ? i : -1)).filter((i) => i >= 0);
    const team2Indices = teamAssignments.map((t, i) => (t === 2 ? i : -1)).filter((i) => i >= 0);
    for (const i1 of team1Indices) {
        for (const i2 of team2Indices) {
            const candidate = [...teamAssignments];
            candidate[i1] = 2;
            candidate[i2] = 1;
            const candidateScore = doublesGenderlessScore(players, candidate);
            if (candidateScore > bestScore) {
                bestScore = candidateScore;
                best = candidate;
            }
        }
    }
    return best;
}

/** @param {unknown[]} chunk @param {boolean} hasStats @param {AutoMatchCriteriaObj} criteria */
function bracketLabelForChunk(chunk, hasStats, criteria) {
    if (isRotationMode(criteria)) return 'Partner rotation';
    if (poolHasLastMatchResults(chunk)) {
        const results = [...new Set(chunk.map(lastMatchResult).filter(Boolean))];
        if (results.length === 1 && results[0] === 'win') return 'Winner bracket';
        if (results.length === 1 && results[0] === 'loss') return 'Loser pool';
        if (results.length > 1) return 'Mixed form';
    }
    if (usesSkillMatching(criteria) && isBalancedSkillMode(criteria)) {
        const levels = [...new Set(chunk.map(normalizedSkillLevel))];
        if (levels.length > 1) return 'Balanced skill';
    }
    if (hasStats && criteria.wlStatistics) {
        const bands = [...new Set(chunk.map(winRateBand))];
        const names = {
            0: 'Low win-rate',
            1: 'Mid-low win-rate',
            2: 'Mid-high win-rate',
            3: 'High win-rate',
        };
        if (bands.length === 1) return names[/** @type {keyof typeof names} */ (bands[0])] ?? 'Mixed bracket';
        return 'Mixed bracket';
    }
    const levels = [...new Set(chunk.map(normalizedSkillLevel))];
    if (levels.length === 1) {
        const level = levels[0];
        return `Level ${level} — ${SKILL_LEVEL_NAMES[level] ?? 'Skill'}`;
    }
    return 'Mixed skill levels';
}

/** @param {unknown} p @param {number} team */
function playerSummary(p, team) {
    const id = playerId(p);
    const row = /** @type {Record<string, unknown>} */ (p);
    const wins = Number(row.wins_count ?? 0);
    const losses = Number(row.losses_count ?? 0);
    const name =
        (typeof row.name === 'string' && row.name.trim())
        || (typeof row.guest_name === 'string' && row.guest_name.trim())
        || (row.user && typeof row.user === 'object' && typeof row.user.name === 'string' ? row.user.name : '')
        || 'Player';
    return {
        game_session_player_id: id,
        user_id: row.user_id != null ? Number(row.user_id) : null,
        guest_name: row.guest_name ?? null,
        name,
        is_guest: row.user_id == null,
        queue_position: Number(row.queue_position ?? 0),
        skill_level: row.skill_level != null ? Number(row.skill_level) : null,
        wins_count: wins,
        losses_count: losses,
        matches_played: wins + losses,
        last_match_result: lastMatchResult(p),
        team,
    };
}

/** @param {unknown[]} players @param {number[]} teamAssignments */
function ingestTeamAssignments(players, teamAssignments) {
    const team1 = [];
    const team2 = [];
    players.forEach((player, index) => {
        const team = teamAssignments[index];
        const id = playerId(player);
        if (team === 1) team1.push(id);
        else if (team === 2) team2.push(id);
    });
    ingestTeamIdGroups(team1, team2);
}

/** @param {number[]} playerIds @param {Map<number, unknown>} byId @param {unknown[]} lobby @param {unknown[]} rotation */
function admitReleasedPlayersToPools(playerIds, byId, lobby, rotation) {
    const present = new Set([...lobby, ...rotation].map(playerId));
    for (const playerIdVal of playerIds) {
        if (present.has(playerIdVal)) continue;
        const player = byId.get(playerIdVal);
        if (!player || /** @type {{ is_removed?: boolean }} */ (player).is_removed) continue;
        if (matchesPlayed(player) === 0) {
            /** @type {{ losses_count?: number }} */ (player).losses_count =
                Number(/** @type {{ losses_count?: number }} */ (player).losses_count ?? 0) + 1;
        }
        rotation.push(player);
        present.add(playerIdVal);
    }
}

/** @param {unknown[]} roster @param {Set<number>} reserved */
function availabilityMapFromRoster(roster, reserved) {
    /** @type {Record<number, 'ready' | 'playing' | 'queued'>} */
    const map = {};
    for (const player of roster) {
        if (/** @type {{ is_removed?: boolean }} */ (player).is_removed) continue;
        const id = playerId(player);
        if (/** @type {{ is_playing?: boolean }} */ (player).is_playing) map[id] = 'playing';
        else if (reserved.has(id)) map[id] = 'queued';
        else if (/** @type {{ is_waiting?: boolean }} */ (player).is_waiting) map[id] = 'ready';
    }
    return map;
}

/**
 * @param {{
 *   session: Record<string, unknown>,
 *   players: unknown[],
 *   matches: unknown[],
 *   criteria?: Record<string, unknown>,
 *   limit?: number | null,
 *   lookahead?: boolean,
 *   proposal_id_prefix?: string,
 * }} params
 */
export function generateAutoMatchProposals({
    session,
    players,
    matches,
    criteria: passedCriteria,
    limit = null,
    lookahead = false,
    proposal_id_prefix = 'auto',
}) {
    pairHistory = { partners: {}, opponents: {} };
    ingestLineupsFromMatches(matches);

    const matchType = session.match_type === 'doubles' ? 'doubles' : 'singles';
    const required = matchType === 'doubles' ? 4 : 2;
    const criteria = mergeCriteria(session, passedCriteria);
    let proposalLimit = limit;
    if (proposalLimit != null && proposalLimit < 1) proposalLimit = null;

    const reservedSet = reservedQueueingPlayerIds(
        Array.isArray(matches) ? /** @type {Array<{ status?: string, lineup?: unknown, id?: number }>} */ (matches) : [],
    );

    const roster = [...(Array.isArray(players) ? players : [])];
    const byId = new Map(roster.map((p) => [playerId(p), p]));

    let releaseQueue = lookahead ? buildReleaseQueueFromMatches(matches) : [];
    const availabilityById = lookahead ? availabilityMapFromRoster(roster, reservedSet) : {};

    let eligible = roster
        .filter(
            (p) =>
                /** @type {{ is_waiting?: boolean }} */ (p).is_waiting
                && !/** @type {{ is_playing?: boolean }} */ (p).is_playing
                && !/** @type {{ is_removed?: boolean }} */ (p).is_removed,
        )
        .filter((p) => !reservedSet.has(playerId(p)))
        .sort((a, b) => Number(/** @type {{ queue_position?: number }} */ (a).queue_position ?? 0)
            - Number(/** @type {{ queue_position?: number }} */ (b).queue_position ?? 0));

    let hasStats = roster.some(
        (p) => !/** @type {{ is_removed?: boolean }} */ (p).is_removed && matchesPlayed(p) > 0,
    );

    let lobby = eligible
        .filter((p) => matchesPlayed(p) === 0)
        .sort((a, b) => {
            const diff = lobbySortKey(a) - lobbySortKey(b);
            return diff !== 0 ? diff : playerId(a) - playerId(b);
        });

    let rotation = eligible.filter((p) => matchesPlayed(p) > 0);

    let checkInExcluded = 0;
    if (!criteria.includeLobby) {
        checkInExcluded = lobby.length;
        lobby = [];
        eligible = rotation;
    }

    const totalEligible = eligible.length;
    const eligibility_breakdown = eligibilityBreakdown(roster, reservedSet, totalEligible, checkInExcluded);

    if (!lookahead && totalEligible < required) {
        return {
            criteria: criteriaToArray(criteria),
            proposals: [],
            total_eligible: totalEligible,
            required_per_match: required,
            has_stats: hasStats,
            match_type: matchType,
            eligibility_breakdown,
        };
    }

    /** @type {Array<Record<string, unknown>>} */
    const proposals = [];
    let proposalIndex = 0;

    while (proposalLimit === null || proposalIndex < proposalLimit) {
        let fromLobby = false;
        let selected = [];

        if (lobby.length > 0) {
            selected = selectLobbyAnchoredMatch(lobby, rotation, required, matchType, criteria, hasStats);
            fromLobby = selected.length > 0;
        } else if (rotation.length >= required) {
            selected = selectPlayersForMatch(rotation, required, matchType, criteria, hasStats);
        }

        if (selected.length < required) {
            if (!lookahead || releaseQueue.length === 0) break;
            const released = releaseQueue.shift();
            admitReleasedPlayersToPools(released.player_ids, byId, lobby, rotation);
            hasStats = hasStats || released.player_ids.length > 0;
            continue;
        }

        const matchPlayers = orderSelectedForTeams(selected, criteria, hasStats);
        let teamAssignments = assignTeams(matchPlayers, matchType, criteria);
        if (criteria.genderlessMixed) {
            teamAssignments = applyGenderlessMixed(matchPlayers, teamAssignments, matchType);
        }

        /** @type {Array<Record<string, unknown>>} */
        const playersOut = [];
        /** @type {Array<{ id: number, team: number }>} */
        const lineupOut = [];
        let playersReady = true;
        matchPlayers.forEach((p, index) => {
            const team = teamAssignments[index] ?? 1;
            const summary = playerSummary(p, team);
            if (lookahead) {
                const availability = availabilityById[playerId(p)] ?? 'ready';
                summary.availability = availability;
                if (availability !== 'ready') playersReady = false;
            }
            playersOut.push(summary);
            lineupOut.push({ id: playerId(p), team });
        });

        proposalIndex += 1;
        const seedSuffix = criteria.refreshSeed ?? 0;
        const bracketLabel = fromLobby
            ? 'Check-in'
            : bracketLabelForChunk(matchPlayers, hasStats, criteria);

        const proposal = {
            proposal_id: `${proposal_id_prefix}-${seedSuffix}-${proposalIndex}`,
            match_type: matchType,
            bracket_label: bracketLabel,
            from_lobby: fromLobby,
            players: playersOut,
            lineup: lineupOut,
        };
        if (lookahead) {
            proposal.wave = proposalIndex;
            proposal.players_ready = playersReady;
        }
        proposals.push(proposal);

        if (isRotationMode(criteria) && matchType === 'doubles') {
            ingestTeamAssignments(matchPlayers, teamAssignments);
        }

        const selectedIds = new Set(selected.map(playerId));
        lobby = lobby.filter((p) => !selectedIds.has(playerId(p)));
        rotation = rotation.filter((p) => !selectedIds.has(playerId(p)));
    }

    return {
        criteria: criteriaToArray(criteria),
        proposals,
        total_eligible: totalEligible,
        required_per_match: required,
        has_stats: hasStats,
        match_type: matchType,
        eligibility_breakdown,
    };
}

/**
 * @param {{
 *   session: Record<string, unknown>,
 *   players: unknown[],
 *   matches: unknown[],
 *   criteria?: Record<string, unknown>,
 * }} params
 */
export function generateAutoSuggestMatches({ session, players, matches, criteria }) {
    const result = generateAutoMatchProposals({
        session,
        players,
        matches,
        criteria,
        limit: 3,
        lookahead: true,
        proposal_id_prefix: 'suggest',
    });

    const draft_version = Number(session.draft_version ?? 0);
    const suggestions = result.proposals.map((proposal, index) => ({
        suggestion_id: String(proposal.proposal_id ?? `suggest-0-${index + 1}`),
        match_type: proposal.match_type,
        bracket_label: proposal.bracket_label ?? null,
        from_lobby: Boolean(proposal.from_lobby),
        wave: Number(proposal.wave ?? index + 1),
        players_ready: Boolean(proposal.players_ready),
        lineup: proposal.lineup ?? [],
        players: proposal.players ?? [],
    }));

    return {
        proposals: result.proposals,
        draft_version,
        generated_at: new Date().toISOString(),
        criteria: result.criteria,
        suggestions,
    };
}