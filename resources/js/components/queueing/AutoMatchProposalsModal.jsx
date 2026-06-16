import { useCallback, useEffect, useRef, useState } from 'react';
import {
    fetchQueueingSessionAutoProposals,
    postCreateQueueingSessionMatch,
} from '../../api/queueingSession.js';
import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';

/**
 * @typedef {import('../../api/queueingSession.js').AutoMatchCriteria} AutoMatchCriteria
 * @typedef {import('../../api/queueingSession.js').AutoMatchProposal} AutoMatchProposal
 * @typedef {import('../../api/queueingSession.js').AutoProposalsResponse} AutoProposalsResponse
 */

/** @param {AutoMatchCriteria | undefined} criteria */
function criteriaSummaryChips(criteria) {
    if (!criteria) return [];
    /** @type {string[]} */
    const chips = [];
    if (criteria.skill_level) {
        chips.push(
            criteria.skill_match_mode === 'same_level' ? 'Same skill level' : 'Balanced skill',
        );
    }
    if (criteria.wl_statistics) chips.push('W/L stats');
    if (criteria.sequence) chips.push('Sequence');
    if (criteria.genderless_mixed) chips.push('Genderless (mixed)');
    return chips;
}

/** @param {AutoMatchProposal['players']} players */
function groupByTeam(players) {
    /** @type {AutoMatchProposal['players']} */
    const team1 = [];
    /** @type {AutoMatchProposal['players']} */
    const team2 = [];
    for (const p of players) {
        if (p.team === 1) team1.push(p);
        else if (p.team === 2) team2.push(p);
    }
    return { team1, team2 };
}

/** @param {number | null | undefined} skillLevel */
function skillLevelLabel(skillLevel) {
    if (skillLevel == null) return null;
    const names = {
        1: 'Starter',
        2: 'Beginner',
        3: 'Intermediate',
        4: 'Sempai',
        5: 'Sensie',
    };
    const level = Math.min(5, Math.max(1, skillLevel));
    return `L${level} — ${names[level] ?? 'Skill'}`;
}

/** @param {AutoMatchProposal['players'][number]} p */
function PlayerRow({ p }) {
    const skillLabel = skillLevelLabel(p.skill_level);

    return (
        <div className="flex items-start justify-between gap-2 rounded-lg border border-[#2a2a2d] bg-[#131316] px-2.5 py-2 text-xs">
            <div className="min-w-0 flex-1">
                <p className="truncate font-semibold capitalize text-[#e4e1e6]">{p.name}</p>
                {skillLabel ? (
                    <p className="inline-flex items-center gap-0.5" title="Skill level">
                        <span className="text-[#c2c1ff] text-[10px]">Skill:</span>
                        <MaterialIcon name="military_tech" className="text-[12px]! text-[#c2c1ff]" />
                        <span className="font-medium text-[#c2c1ff] truncate">{skillLabel}</span>
                    </p>
                ) : null}
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-[#918f9c]">
                    <span className="text-[#c2c1ff] text-[10px]">Stats</span>
                    <span className="inline-flex items-center gap-0.5" title="Wins">
                        <MaterialIcon name="arrow_upward" className="text-[12px]! text-[#4ce081]" />
                        <span className="tabular-nums font-medium text-[#e4e1e6]">{p.wins_count}</span>
                    </span>
                    <span className="inline-flex items-center gap-0.5" title="Losses">
                        <MaterialIcon name="arrow_downward" className="text-[12px]! text-red-300/90" />
                        <span className="tabular-nums font-medium text-[#e4e1e6]">{p.losses_count}</span>
                    </span>
                </div>
            </div>
            {p.is_guest ? (
                <span
                    className="shrink-0 rounded-full border border-[#514c53] bg-[#c2c1ff]/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#c8c5d2]"
                    title="Guest player"
                >
                    Guest
                </span>
            ) : null}
        </div>
    );
}

/**
 * @param {{
 *   proposal: AutoMatchProposal,
 *   index: number,
 *   busy: boolean,
 *   matchType: 'singles' | 'doubles',
 *   onApprove: (proposal: AutoMatchProposal) => void,
 *   onSkip: (proposalId: string) => void,
 * }} props
 */
function ProposalCard({ proposal, index, busy, matchType, onApprove, onSkip }) {
    const { team1, team2 } = groupByTeam(proposal.players);

    return (
        <li className="rounded-xl border border-[#45454a] bg-[#1b1b1e] p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-semibold text-[#e4e1e6]">Suggested match #{index + 1}</p>
                {proposal.bracket_label ? (
                    <span
                        className="shrink-0 rounded-full border border-[#c2c1ff]/40 bg-[#c2c1ff]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#c2c1ff]"
                        title="Match grouping bracket"
                    >
                        {proposal.bracket_label}
                    </span>
                ) : null}
            </div>

            {matchType === 'doubles' ? (
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[#4ce081]">Team 1</p>
                        <div className="space-y-1.5">
                            {team1.map((p) => (
                                <PlayerRow key={p.game_session_player_id} p={p} />
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[#c8c5d2]">Team 2</p>
                        <div className="space-y-1.5">
                            {team2.map((p) => (
                                <PlayerRow key={p.game_session_player_id} p={p} />
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 items-stretch gap-2">
                    <div>
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[#4ce081]">Player 1</p>
                        {team1.map((p) => (
                            <PlayerRow key={p.game_session_player_id} p={p} />
                        ))}
                    </div>
                    <div>
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[#c8c5d2]">Player 2</p>
                        {team2.map((p) => (
                            <PlayerRow key={p.game_session_player_id} p={p} />
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => onApprove(proposal)}
                    className="flex-1 rounded-full bg-[#4ce081] px-3 py-2 text-xs font-bold text-[#003919] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Approve
                </button>
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => onSkip(proposal.proposal_id)}
                    className="flex-1 rounded-full border border-white/30 bg-transparent px-3 py-2 text-xs font-bold text-white/70 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Skip
                </button>
            </div>
        </li>
    );
}

/**
 * @param {{
 *   open: boolean,
 *   sessionId: number | string | null,
 *   criteria: AutoMatchCriteria | null,
 *   onClose: () => void,
 *   onEditCriteria?: () => void,
 *   onApproved?: () => void | Promise<void>,
 * }} props
 */
export function AutoMatchProposalsModal({ open, sessionId, criteria, onClose, onEditCriteria, onApproved }) {
    /** @type {[AutoProposalsResponse | null, (v: AutoProposalsResponse | null) => void]} */
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [skippedIds, setSkippedIds] = useState(/** @type {Set<string>} */ (new Set()));
    const refreshSeedRef = useRef(0);

    const reload = useCallback(
        async ({ bumpRefreshSeed = false } = {}) => {
            if (sessionId == null || criteria == null) return;
            if (bumpRefreshSeed) {
                refreshSeedRef.current += 1;
            }
            setLoading(true);
            setError('');
            try {
                const res = await fetchQueueingSessionAutoProposals(sessionId, {
                    ...criteria,
                    refresh_seed:
                        refreshSeedRef.current > 0 ? refreshSeedRef.current : undefined,
                });
                setData(res);
            } catch (e) {
                setData({
                    criteria: criteria ?? undefined,
                    proposals: [],
                    total_eligible: 0,
                    required_per_match: 2,
                    has_stats: false,
                    match_type: 'singles',
                });
                setError(e instanceof Error ? e.message : 'Could not load match suggestions.');
            } finally {
                setLoading(false);
            }
        },
        [sessionId, criteria],
    );

    useEffect(() => {
        if (!open) {
            setData(null);
            setError('');
            setSkippedIds(new Set());
            refreshSeedRef.current = 0;
            return;
        }
        reload();
    }, [open, reload]);

    /** @param {AutoMatchProposal} proposal */
    async function createMatchFromProposal(proposal) {
        if (sessionId == null) return;
        await postCreateQueueingSessionMatch(sessionId, {
            lineup: proposal.lineup.map((row) => ({ id: row.id, team: row.team })),
        });
    }

    /** @param {AutoMatchProposal} proposal */
    async function onApprove(proposal) {
        setBusy(true);
        setError('');
        try {
            await createMatchFromProposal(proposal);
            if (onApproved) {
                await onApproved();
            }
            await reload();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not create match.');
        } finally {
            setBusy(false);
        }
    }

    /** @param {AutoMatchProposal[]} proposals */
    async function onApproveAll(proposals) {
        if (sessionId == null || proposals.length === 0) return;
        setBusy(true);
        setError('');
        try {
            for (const proposal of proposals) {
                await createMatchFromProposal(proposal);
            }
            if (onApproved) {
                await onApproved();
            }
            await reload();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not create all matches.');
            if (onApproved) {
                await onApproved();
            }
            await reload();
        } finally {
            setBusy(false);
        }
    }

    /** @param {string} proposalId */
    function onSkip(proposalId) {
        setSkippedIds((prev) => {
            const next = new Set(prev);
            next.add(proposalId);
            return next;
        });
    }

    function onRefreshClick() {
        setSkippedIds(new Set());
        void reload({ bumpRefreshSeed: true });
    }

    if (!open) return null;

    const visibleProposals = (data?.proposals ?? []).filter((p) => !skippedIds.has(p.proposal_id));
    const matchType = data?.match_type === 'doubles' ? 'doubles' : 'singles';
    const required = data?.required_per_match ?? (matchType === 'doubles' ? 4 : 2);
    const totalEligible = data?.total_eligible ?? 0;
    const activeCriteria = data?.criteria ?? criteria ?? undefined;
    const chips = criteriaSummaryChips(activeCriteria);

    return (
        <div className="rt-end-match-modal-overlay fixed inset-0 z-99 flex items-end justify-center pt-10 sm:items-center">
            <div className="rt-end-match-modal-sheet flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl border border-[#2a2a2d] bg-[#1b1b1e] shadow-xl sm:rounded-2xl">
                <div className="border-b border-[#2a2a2d] p-5 pb-4">
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="text-lg font-bold">Auto-Generate Matches</h3>
                        {onEditCriteria ? (
                            <button
                                type="button"
                                disabled={busy || loading}
                                onClick={onEditCriteria}
                                className="shrink-0 rounded-full border border-[#c2c1ff]/40 bg-[#c2c1ff]/15 px-2.5 py-1 text-[10px] font-bold text-[#c2c1ff] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Edit criteria
                            </button>
                        ) : null}
                    </div>
                    <p className="mt-1 text-xs text-[#918f9c]">
                        Approve a match to add it to the queue, or skip to dismiss. Priority: Skill → W/L → Sequence.
                    </p>
                    {chips.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {chips.map((chip) => (
                                <span
                                    key={chip}
                                    className="rounded-full border border-[#45454a] bg-[#131316] px-2 py-0.5 text-[10px] font-semibold text-[#c8c5d2]"
                                >
                                    {chip}
                                </span>
                            ))}
                        </div>
                    ) : null}
                    <p className="mt-2 text-[11px] text-[#918f9c]">
                        {totalEligible} eligible · {required} player(s) per {matchType} match
                    </p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    {error ? (
                        <p className="mb-3 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">
                            {error}
                        </p>
                    ) : null}

                    {loading ? (
                        <div className="h-32 animate-pulse rounded-xl bg-[#2a2a2d]" />
                    ) : visibleProposals.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-[#45454a] bg-[#131316] p-6 text-center">
                            <p className="text-sm font-semibold text-[#e4e1e6]">No suggestions available</p>
                            <p className="mt-1 text-xs text-[#918f9c]">
                                {totalEligible < required
                                    ? `Need at least ${required} waiting players to form a ${matchType} match. ${totalEligible} eligible right now.`
                                    : 'All suggestions were skipped. Use Refresh to try again.'}
                            </p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {visibleProposals.map((proposal, index) => (
                                <ProposalCard
                                    key={proposal.proposal_id}
                                    proposal={proposal}
                                    index={index}
                                    busy={busy}
                                    matchType={matchType}
                                    onApprove={onApprove}
                                    onSkip={onSkip}
                                />
                            ))}
                        </ul>
                    )}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 border-t border-[#2a2a2d] p-5 pt-4">
                    <button
                        type="button"
                        disabled={busy || loading}
                        onClick={onRefreshClick}
                        className="flex-1 rounded-lg border border-[#c2c1ff]/40 bg-[#c2c1ff]/15 py-2.5 text-sm font-bold text-[#c2c1ff] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Refresh
                    </button>
                    <button
                        type="button"
                        disabled={busy || loading || visibleProposals.length === 0}
                        onClick={() => void onApproveAll(visibleProposals)}
                        className="flex-1 rounded-lg bg-[#4ce081] py-2.5 text-sm font-bold text-[#003919] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Approve All
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={onClose}
                        className="flex-1 rounded-lg border border-white/50 py-2.5 text-sm font-bold text-white/70 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
