import { useCallback, useEffect, useRef, useState } from 'react';
import {
    fetchQueueingSessionAutoProposals,
    postCreateQueueingSessionMatch,
    postStartQueueingSessionMatch,
} from '../../api/queueingSession.js';
import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';
import { DraggableMatchLineup } from './DraggableMatchLineup.jsx';

/**
 * @typedef {import('../../api/queueingSession.js').AutoMatchCriteria} AutoMatchCriteria
 * @typedef {import('../../api/queueingSession.js').AutoMatchProposal} AutoMatchProposal
 * @typedef {import('../../api/queueingSession.js').AutoProposalsResponse} AutoProposalsResponse
 * @typedef {{ team1: number[], team2: number[] }} LineupDraft
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

/**
 * @param {AutoMatchProposal[]} proposals
 * @returns {Record<string, LineupDraft>}
 */
function draftsFromProposals(proposals) {
    /** @type {Record<string, LineupDraft>} */
    const drafts = {};
    for (const proposal of proposals) {
        const { team1, team2 } = groupByTeam(proposal.players);
        drafts[proposal.proposal_id] = {
            team1: team1.map((p) => p.game_session_player_id),
            team2: team2.map((p) => p.game_session_player_id),
        };
    }
    return drafts;
}

/**
 * @param {AutoMatchProposal} proposal
 * @param {LineupDraft | undefined} draft
 */
function lineupFromDraft(proposal, draft) {
    if (!draft) {
        return proposal.lineup.map((row) => ({ id: row.id, team: row.team }));
    }
    return [
        ...draft.team1.map((id) => ({ id, team: /** @type {1} */ (1) })),
        ...draft.team2.map((id) => ({ id, team: /** @type {2} */ (2) })),
    ];
}

/**
 * @param {AutoMatchProposal} proposal
 * @param {number[]} ids
 */
function playersForIds(proposal, ids) {
    return ids
        .map((id) => proposal.players.find((p) => p.game_session_player_id === id))
        .filter(Boolean)
        .map((p) => ({
            id: p.game_session_player_id,
            name: p.name,
            skill_level: p.skill_level,
            wins_count: p.wins_count,
            losses_count: p.losses_count,
            is_guest: p.is_guest,
        }));
}

/**
 * @param {{
 *   proposal: AutoMatchProposal,
 *   index: number,
 *   busy: boolean,
 *   matchType: 'singles' | 'doubles',
 *   draft: LineupDraft,
 *   onDraftChange: (proposalId: string, next: LineupDraft) => void,
 *   onApproveAndQueue: (proposal: AutoMatchProposal) => void,
 *   onApproveAndStart: (proposal: AutoMatchProposal) => void,
 *   onSkip: (proposalId: string) => void,
 * }} props
 */
function ProposalCard({
    proposal,
    index,
    busy,
    matchType,
    draft,
    onDraftChange,
    onApproveAndQueue,
    onApproveAndStart,
    onSkip,
}) {
    const team1Players = playersForIds(proposal, draft.team1);
    const team2Players = playersForIds(proposal, draft.team2);

    return (
        <li className="rounded-xl border border-[#c2c1ff]/50 bg-[#1b1b1e] p-4 shadow-lg">
            <div className="mb-2 flex items-center justify-between gap-2">
                <p className="mb-2 text-xl font-semibold text-[#e4e1e6]">
                    Suggested Match #{index + 1}
                </p>
                {proposal.bracket_label ? (
                    <span
                        className="shrink-0 rounded-full border border-[#c2c1ff]/40 bg-[#c2c1ff]/15 px-3 py-1 text-[10px] md:text-[16px] font-semibold capitalize tracking-wide text-[#c2c1ff]"
                        title="Match grouping bracket"
                    >
                        {proposal.bracket_label}
                    </span>
                ) : null}
            </div>

            <DraggableMatchLineup
                matchType={matchType}
                team1={team1Players}
                team2={team2Players}
                disabled={busy}
                title={null}
                showHint
                framed={false}
                onChange={(next) => onDraftChange(proposal.proposal_id, next)}
            />

            <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => onApproveAndQueue(proposal)}
                    className="inline-flex items-center justify-center gap-1 rounded-full bg-[#4ce081] px-3 py-1 text-xs font-bold text-[#003919] disabled:cursor-not-allowed disabled:opacity-50 md:py-2"
                >
                    <MaterialIcon name="playlist_add" className="text-lg! md:text-xl!" />
                    <span className="text-sm! md:text-base! md:inline">Queue</span>
                </button>
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => onApproveAndStart(proposal)}
                    className="inline-flex items-center justify-center gap-1 rounded-full border border-[#c2c1ff]/50 bg-[#c2c1ff]/20 px-3 py-1 text-xs font-bold text-[#c2c1ff] disabled:cursor-not-allowed disabled:opacity-50 md:py-2"
                >
                    <MaterialIcon name="play_arrow" className="text-[16px]!" />
                    <span className="text-xs! md:text-base! md:inline">Start</span>
                </button>
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => onSkip(proposal.proposal_id)}
                    className="inline-flex items-center justify-center gap-1 rounded-full border border-white/30 bg-transparent px-3 py-1 text-xs font-bold text-white/70 disabled:cursor-not-allowed disabled:opacity-50 md:py-2"
                >
                    <MaterialIcon name="skip_next" className="text-[16px]!" />
                    <span className="text-xs! md:text-base! md:inline">Skip</span>
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
    /** @type {[Record<string, LineupDraft>, (v: Record<string, LineupDraft>) => void]} */
    const [draftById, setDraftById] = useState({});
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
                setDraftById(draftsFromProposals(res.proposals ?? []));
            } catch (e) {
                setData({
                    criteria: criteria ?? undefined,
                    proposals: [],
                    total_eligible: 0,
                    required_per_match: 2,
                    has_stats: false,
                    match_type: 'singles',
                });
                setDraftById({});
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
            setDraftById({});
            refreshSeedRef.current = 0;
            return;
        }
        reload();
    }, [open, reload]);

    /**
     * @param {AutoMatchProposal} proposal
     */
    async function createMatchFromProposal(proposal) {
        if (sessionId == null) return null;
        const draft = draftById[proposal.proposal_id];
        return postCreateQueueingSessionMatch(sessionId, {
            lineup: lineupFromDraft(proposal, draft),
        });
    }

    /** @param {AutoMatchProposal} proposal */
    async function onApproveAndQueue(proposal) {
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

    /** @param {AutoMatchProposal} proposal */
    async function onApproveAndStart(proposal) {
        if (sessionId == null) return;
        setBusy(true);
        setError('');
        try {
            const created = await createMatchFromProposal(proposal);
            const matchId = created?.id;
            if (matchId == null) {
                throw new Error('Could not start match.');
            }
            await postStartQueueingSessionMatch(sessionId, matchId);
            if (onApproved) {
                await onApproved();
            }
            await reload();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not create and start match.');
            if (onApproved) {
                try {
                    await onApproved();
                } catch {
                    /* ignore refresh errors after partial success */
                }
            }
            await reload();
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

    /**
     * @param {string} proposalId
     * @param {LineupDraft} next
     */
    function onDraftChange(proposalId, next) {
        setDraftById((prev) => ({ ...prev, [proposalId]: next }));
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
            <div className="rt-end-match-modal-sheet flex max-h-[90vh] w-full max-w-2xl flex-col rounded-t-2xl border border-[#747474] bg-[#1b1b1e] shadow-xl sm:rounded-2xl">
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
                    <p className="my-2 text-base! text-[#918f9c] md:text-lg!">
                        Drag to rearrange, then queue or start. Priority: Skill → W/L → Sequence.
                    </p>
                    {chips.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {chips.map((chip) => (
                                <span
                                    key={chip}
                                    className="rounded-full border border-[#45454a] bg-[#c2c1ff] px-2 py-1 text-xs font-semibold text-[#131316]"
                                >
                                    {chip}
                                </span>
                            ))}
                        </div>
                    ) : null}
                    <p className="mt-2 text-base! text-[#918f9c] md:text-lg!">
                        {totalEligible} eligible · {required} player(s) per {matchType} match
                    </p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 pb-12">
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
                            {visibleProposals.map((proposal, index) => {
                                const draft =
                                    draftById[proposal.proposal_id] ??
                                    draftsFromProposals([proposal])[proposal.proposal_id];
                                return (
                                    <ProposalCard
                                        key={proposal.proposal_id}
                                        proposal={proposal}
                                        index={index}
                                        busy={busy}
                                        matchType={matchType}
                                        draft={draft}
                                        onDraftChange={onDraftChange}
                                        onApproveAndQueue={onApproveAndQueue}
                                        onApproveAndStart={onApproveAndStart}
                                        onSkip={onSkip}
                                    />
                                );
                            })}
                        </ul>
                    )}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 border-t border-[#747474] p-5 pt-4">
                    <button
                        type="button"
                        disabled={busy || loading}
                        onClick={onRefreshClick}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[#c2c1ff]/40 bg-[#c2c1ff]/15 py-2.5 text-sm font-bold text-[#c2c1ff] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <MaterialIcon name="refresh" className="text-[16px]! md:text-xl!" />
                        <span className="text-sm! md:text-lg! md:inline">Refresh</span>
                    </button>
                    <button
                        type="button"
                        disabled={busy || loading || visibleProposals.length === 0}
                        onClick={() => void onApproveAll(visibleProposals)}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#4ce081] py-2.5 text-sm font-bold text-[#003919] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <MaterialIcon name="playlist_add" className="text-[16px]! md:text-xl!" />
                        <span className="text-sm! md:text-lg! md:inline">Queue All</span>
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={onClose}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-red-300/50 bg-red-100/10 py-2.5 text-sm font-bold text-red-300/70 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <MaterialIcon name="close" className="text-[16px]! md:text-xl!" />
                        <span className="text-sm! md:text-lg! md:inline">Exit</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
