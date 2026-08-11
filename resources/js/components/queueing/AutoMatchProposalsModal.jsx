import { useCallback, useEffect, useRef, useState } from 'react';
import {
    fetchQueueingSessionAutoProposals,
    postCreateQueueingSessionMatch,
    postStartQueueingSessionMatch,
} from '../../api/queueingSession.js';
import { MODAL_OVERLAY_SHEET_CLASS, ModalPortal } from '../app/ModalPortal.jsx';
import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';
import { AutoMatchWizardSteps } from './AutoMatchWizardSteps.jsx';
import { DraggableMatchLineup } from './DraggableMatchLineup.jsx';

/**
 * @typedef {import('../../api/queueingSession.js').AutoMatchCriteria} AutoMatchCriteria
 * @typedef {import('../../api/queueingSession.js').AutoMatchProposal} AutoMatchProposal
 * @typedef {import('../../api/queueingSession.js').AutoProposalsResponse} AutoProposalsResponse
 * @typedef {import('../../api/queueingSession.js').AutoMatchEligibilityBreakdown} AutoMatchEligibilityBreakdown
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

/**
 * @param {AutoMatchEligibilityBreakdown | undefined} breakdown
 */
function eligibilitySummaryLine(breakdown) {
    if (!breakdown || breakdown.total_roster <= 0) {
        return null;
    }

    /** @type {string[]} */
    const parts = [`${breakdown.waiting_available} available`];
    if (breakdown.playing > 0) {
        parts.push(`${breakdown.playing} on court`);
    }
    if (breakdown.queued_in_matches > 0) {
        parts.push(`${breakdown.queued_in_matches} queued`);
    }
    if (breakdown.not_in_queue > 0) {
        parts.push(`${breakdown.not_in_queue} not in queue`);
    }

    return `${parts.join(' · ')} · ${breakdown.total_roster} on roster`;
}

/**
 * @param {{
 *   breakdown?: AutoMatchEligibilityBreakdown,
 *   totalEligible: number,
 *   required: number,
 *   matchType: 'singles' | 'doubles',
 *   allSkipped: boolean,
 * }} params
 */
function autoMatchEmptyMessage({ breakdown, totalEligible, required, matchType, allSkipped }) {
    if (allSkipped) {
        return 'All suggestions were skipped. Use Refresh to try again.';
    }

    if (totalEligible >= required) {
        return 'No suggestions matched your criteria. Try Refresh or edit criteria.';
    }

    let message = `Need at least ${required} available waiting players for a ${matchType} match. Only ${totalEligible} right now.`;

    if (!breakdown || breakdown.total_roster <= 0) {
        return message;
    }

    /** @type {string[]} */
    const busyParts = [];
    if (breakdown.playing > 0) {
        busyParts.push(`${breakdown.playing} on court`);
    }
    if (breakdown.queued_in_matches > 0) {
        busyParts.push(`${breakdown.queued_in_matches} already queued in a match`);
    }
    if (breakdown.not_in_queue > 0) {
        busyParts.push(`${breakdown.not_in_queue} not in the waiting queue`);
    }

    if (busyParts.length > 0) {
        message += ` Of ${breakdown.total_roster} on the roster: ${busyParts.join(', ')}.`;
    }

    return message;
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

function ProposalsSkeleton() {
    return (
        <div className="space-y-3" role="status" aria-live="polite" aria-busy="true" aria-label="Loading suggestions">
            {[1, 2].map((n) => (
                <div key={n} className="rounded-xl border border-[#2a2a2d] bg-[#131316] p-4">
                    <div className="rt-skeleton mb-3 h-5 w-40 rounded" />
                    <div className="rt-skeleton mb-2 h-24 w-full rounded-lg" />
                    <div className="grid grid-cols-3 gap-2">
                        <div className="rt-skeleton h-11 rounded-full" />
                        <div className="rt-skeleton h-11 rounded-full" />
                        <div className="rt-skeleton h-11 rounded-full" />
                    </div>
                </div>
            ))}
            <span className="sr-only">Loading match suggestions…</span>
        </div>
    );
}

/**
 * @param {{
 *   proposal: AutoMatchProposal,
 *   index: number,
 *   total: number,
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
    total,
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
        <li className="rounded-xl border border-[#c2c1ff]/35 bg-[#1b1b1e] p-4 shadow-lg transition-colors duration-200">
            <div className="mb-3 flex items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#bab9c0]">Match Suggestion Type:</p>
                {proposal.bracket_label ? (
                    <span
                        className="shrink-0 rounded-full border border-[#c2c1ff]/40 bg-[#c2c1ff]/15 px-3 py-1 text-[10px] font-semibold capitalize tracking-wide text-[#c2c1ff] md:text-xs"
                        title="Match grouping bracket"
                    >{proposal.bracket_label}
                    </span>
                ) : null}
            </div>

            <DraggableMatchLineup
                matchType={matchType}
                team1={team1Players}
                team2={team2Players}
                disabled={busy}
                title={null}
                framed={false}
                onChange={(next) => onDraftChange(proposal.proposal_id, next)}
            />

            <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => onApproveAndQueue(proposal)}
                    className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-1 rounded-full bg-[#4ce081] px-3 py-2 text-xs font-bold text-[#003919] transition-opacity duration-200 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ce081]/70"
                >
                    <MaterialIcon name="playlist_add" className="text-lg!" />
                    <span className="text-sm md:text-base">Queue</span>
                </button>
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => onApproveAndStart(proposal)}
                    className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-1 rounded-full border border-[#c2c1ff]/50 bg-[#c2c1ff]/20 px-3 py-2 text-xs font-bold text-[#c2c1ff] transition-colors duration-200 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/60"
                >
                    <MaterialIcon name="play_arrow" className="text-[16px]!" />
                    <span className="text-sm md:text-base">Start</span>
                </button>
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => onSkip(proposal.proposal_id)}
                    className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-1 rounded-full border border-white/25 bg-transparent px-3 py-2 text-xs font-bold text-white/70 transition-colors duration-200 hover:bg-white/5 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                    <MaterialIcon name="skip_next" className="text-[16px]!" />
                    <span className="text-sm md:text-base">Skip</span>
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
    const [statusMessage, setStatusMessage] = useState('');
    const [skippedIds, setSkippedIds] = useState(/** @type {Set<string>} */ (new Set()));
    /** @type {[Record<string, LineupDraft>, (v: Record<string, LineupDraft>) => void]} */
    const [draftById, setDraftById] = useState({});
    const [focusIndex, setFocusIndex] = useState(0);
    const [eligibilityOpen, setEligibilityOpen] = useState(false);
    const refreshSeedRef = useRef(0);
    const statusClearRef = useRef(/** @type {number | null} */ (null));

    const showStatus = useCallback((message) => {
        setStatusMessage(message);
        if (statusClearRef.current != null) {
            window.clearTimeout(statusClearRef.current);
        }
        statusClearRef.current = window.setTimeout(() => {
            setStatusMessage('');
            statusClearRef.current = null;
        }, 2800);
    }, []);

    useEffect(() => {
        return () => {
            if (statusClearRef.current != null) {
                window.clearTimeout(statusClearRef.current);
            }
        };
    }, []);

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
                setFocusIndex(0);
            } catch (e) {
                setData({
                    criteria: criteria ?? undefined,
                    proposals: [],
                    total_eligible: 0,
                    required_per_match: 2,
                    has_stats: false,
                    match_type: 'singles',
                    eligibility_breakdown: {
                        total_roster: 0,
                        playing: 0,
                        queued_in_matches: 0,
                        waiting_available: 0,
                        not_in_queue: 0,
                    },
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
            setStatusMessage('');
            setSkippedIds(new Set());
            setDraftById({});
            setFocusIndex(0);
            setEligibilityOpen(false);
            refreshSeedRef.current = 0;
            return;
        }
        reload();
    }, [open, reload]);

    useEffect(() => {
        if (!open) return undefined;

        function onKeyDown(event) {
            if (event.key === 'Escape' && !busy) {
                event.preventDefault();
                onClose();
            }
        }

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [open, busy, onClose]);

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
            showStatus('Match queued.');
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
            showStatus('Match started.');
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
            showStatus(
                proposals.length === 1
                    ? '1 match queued.'
                    : `${proposals.length} matches queued.`,
            );
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
        setFocusIndex((i) => Math.max(0, i));
        showStatus('Suggestion skipped.');
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
        showStatus('Refreshing suggestions…');
        void reload({ bumpRefreshSeed: true });
    }

    const visibleProposals = (data?.proposals ?? []).filter((p) => !skippedIds.has(p.proposal_id));
    const matchType = data?.match_type === 'doubles' ? 'doubles' : 'singles';
    const required = data?.required_per_match ?? (matchType === 'doubles' ? 4 : 2);
    const totalEligible = data?.total_eligible ?? 0;
    const breakdown = data?.eligibility_breakdown;
    const eligibilityLine = eligibilitySummaryLine(breakdown);
    const allProposalsSkipped =
        !loading && (data?.proposals?.length ?? 0) > 0 && visibleProposals.length === 0;
    const emptyMessage = autoMatchEmptyMessage({
        breakdown,
        totalEligible,
        required,
        matchType,
        allSkipped: allProposalsSkipped,
    });
    const activeCriteria = data?.criteria ?? criteria ?? undefined;
    const chips = criteriaSummaryChips(activeCriteria);
    const safeFocusIndex =
        visibleProposals.length === 0
            ? 0
            : Math.min(focusIndex, visibleProposals.length - 1);
    const focusedProposal = visibleProposals[safeFocusIndex] ?? null;

    useEffect(() => {
        if (!open) return;
        if (focusIndex > visibleProposals.length - 1 && visibleProposals.length > 0) {
            setFocusIndex(visibleProposals.length - 1);
        }
    }, [open, focusIndex, visibleProposals.length]);

    if (!open) return null;

    return (
        <ModalPortal open={open}>
            <div className={MODAL_OVERLAY_SHEET_CLASS} role="presentation">
                <button
                    type="button"
                    className="absolute inset-0 cursor-pointer"
                    aria-label="Close auto-generate matches"
                    disabled={busy}
                    onClick={() => {
                        if (!busy) onClose();
                    }}
                />
                <div
                    className="rt-end-match-modal-sheet relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-t-2xl border border-[#2a2a2d] bg-[#1b1b1e] shadow-xl sm:rounded-2xl"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="rt-auto-match-proposals-title"
                >
                    <div className="shrink-0 border-b border-white/5 px-5 pb-4 pt-5">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-[#4ce081]">
                                    Step 2 of 2
                                </p>
                                <h3
                                    id="rt-auto-match-proposals-title"
                                    className="mt-1 text-lg font-bold tracking-tight text-[#e4e1e6]"
                                >
                                    Review suggestions
                                </h3>
                            </div>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={onClose}
                                className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/10 text-[#c8c5d2] transition-colors duration-200 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/60"
                                aria-label="Close"
                            >
                                <MaterialIcon name="close" className="text-xl!" />
                            </button>
                        </div>

                        <div className="mt-4">
                            <AutoMatchWizardSteps
                                active="proposals"
                                onCriteriaClick={onEditCriteria}
                                criteriaDisabled={busy || loading}
                            />
                        </div>

                        <p className="mt-1 text-sm text-[#918f9c]">
                            Drag players to rearrange teams, then queue or start. Skip any suggestion you don’t
                            want.
                        </p>

                        {chips.length > 0 ? (
                            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                {chips.map((chip) => (
                                    <span
                                        key={chip}
                                        className="rounded-full border border-[#45454a] bg-[#c2c1ff] px-2.5 py-1 text-xs font-semibold text-[#131316]"
                                    >
                                        {chip}
                                    </span>
                                ))}
                                {onEditCriteria ? (
                                    <button
                                        type="button"
                                        disabled={busy || loading}
                                        onClick={onEditCriteria}
                                        className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-full border border-[#c2c1ff]/40 bg-[#c2c1ff]/10 px-2.5 py-1 text-[11px] font-bold text-[#c2c1ff] transition-colors duration-200 hover:bg-[#c2c1ff]/20 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/60"
                                    >
                                        <MaterialIcon name="tune" className="text-sm!" />
                                        Edit
                                    </button>
                                ) : null}
                            </div>
                        ) : null}
                        {eligibilityOpen ? (
                            <div className="mt-2 rounded-xl border border-[#2a2a2d] bg-[#131316]/80 px-3 py-2.5 text-xs text-[#c8c5d2]">
                                <p>
                                    Needs {required} waiting player{required === 1 ? '' : 's'} for each{' '}
                                    {matchType} match.
                                </p>
                                {breakdown ? (
                                    <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 tabular-nums">
                                        <li>Available: {breakdown.waiting_available}</li>
                                        <li>On court: {breakdown.playing}</li>
                                        <li>Already queued: {breakdown.queued_in_matches}</li>
                                        <li>Not in queue: {breakdown.not_in_queue}</li>
                                    </ul>
                                ) : null}
                            </div>
                        ) : null}

                        {!loading && visibleProposals.length > 1 ? (
                            <div className="mt-3 flex items-center justify-between gap-2">
                                <button
                                    type="button"
                                    disabled={busy || safeFocusIndex <= 0}
                                    onClick={() => setFocusIndex((i) => Math.max(0, i - 1))}
                                    className="inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-full border border-white/15 text-[#c8c5d2] transition-colors duration-200 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/60"
                                    aria-label="Previous suggestion"
                                >
                                    <MaterialIcon name="chevron_left" className="text-2xl!" />
                                </button>
                                <div className="flex items-center gap-1.5" role="tablist" aria-label="Suggestions">
                                    {visibleProposals.map((p, i) => (
                                        <button
                                            key={p.proposal_id}
                                            type="button"
                                            role="tab"
                                            aria-selected={i === safeFocusIndex}
                                            disabled={busy}
                                            onClick={() => setFocusIndex(i)}
                                            className={[
                                                'h-2.5 cursor-pointer rounded-full transition-all duration-200',
                                                i === safeFocusIndex
                                                    ? 'w-6 bg-[#c2c1ff]'
                                                    : 'w-2.5 bg-[#45454a] hover:bg-[#918f9c]',
                                            ].join(' ')}
                                            aria-label={`Suggestion ${i + 1}`}
                                        />
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    disabled={busy || safeFocusIndex >= visibleProposals.length - 1}
                                    onClick={() =>
                                        setFocusIndex((i) =>
                                            Math.min(visibleProposals.length - 1, i + 1),
                                        )
                                    }
                                    className="inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-full border border-white/15 text-[#c8c5d2] transition-colors duration-200 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/60"
                                    aria-label="Next suggestion"
                                >
                                    <MaterialIcon name="chevron_right" className="text-2xl!" />
                                </button>
                            </div>
                        ) : null}
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4" aria-live="polite">
                        {statusMessage ? (
                            <div
                                className="mb-3 flex items-center gap-2 rounded-lg border border-[#4ce081]/35 bg-[#4ce081]/12 px-3 py-2 text-sm font-semibold text-[#4ce081]"
                                role="status"
                            >
                                <MaterialIcon name="check_circle" className="text-lg!" />
                                {statusMessage}
                            </div>
                        ) : null}

                        {error ? (
                            <p
                                className="mb-3 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200"
                                role="alert"
                            >
                                {error}
                            </p>
                        ) : null}

                        {loading ? (
                            <ProposalsSkeleton />
                        ) : visibleProposals.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-[#45454a] bg-[#131316] p-6 text-center">
                                <MaterialIcon
                                    name={allProposalsSkipped ? 'skip_next' : 'search_off'}
                                    className="mb-2 text-3xl! text-[#918f9c]"
                                />
                                <p className="text-sm font-semibold text-[#e4e1e6]">No suggestions available</p>
                                <p className="mt-1 text-xs text-[#918f9c]">{emptyMessage}</p>
                                <div className="mt-4 flex flex-wrap justify-center gap-2">
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={onRefreshClick}
                                        className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-lg border border-[#c2c1ff]/40 bg-[#c2c1ff]/15 px-4 py-2 text-sm font-bold text-[#c2c1ff] disabled:opacity-50"
                                    >
                                        <MaterialIcon name="refresh" className="text-lg!" />
                                        Refresh
                                    </button>
                                    {onEditCriteria ? (
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={onEditCriteria}
                                            className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-lg border border-white/20 px-4 py-2 text-sm font-bold text-[#c8c5d2] disabled:opacity-50"
                                        >
                                            <MaterialIcon name="tune" className="text-lg!" />
                                            Edit criteria
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        ) : (
                            <>
                                <ul className="space-y-3">
                                    {focusedProposal ? (
                                        <ProposalCard
                                            key={focusedProposal.proposal_id}
                                            proposal={focusedProposal}
                                            index={safeFocusIndex}
                                            total={visibleProposals.length}
                                            busy={busy}
                                            matchType={matchType}
                                            draft={
                                                draftById[focusedProposal.proposal_id] ??
                                                draftsFromProposals([focusedProposal])[
                                                    focusedProposal.proposal_id
                                                ]
                                            }
                                            onDraftChange={onDraftChange}
                                            onApproveAndQueue={onApproveAndQueue}
                                            onApproveAndStart={onApproveAndStart}
                                            onSkip={onSkip}
                                        />
                                    ) : null}
                                </ul>
                            </>
                        )}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 border-t border-[#2a2a2d] p-5 pt-4">
                        <button
                            type="button"
                            disabled={busy || loading}
                            onClick={onRefreshClick}
                            className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border border-[#c2c1ff]/40 bg-[#c2c1ff]/15 py-2.5 text-sm font-bold text-[#c2c1ff] transition-colors duration-200 hover:bg-[#c2c1ff]/25 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/60"
                        >
                            <MaterialIcon name="refresh" className="text-[16px]! md:text-xl!" />
                            <span>Refresh</span>
                        </button>
                        <button
                            type="button"
                            disabled={busy || loading || visibleProposals.length === 0}
                            onClick={() => void onApproveAll(visibleProposals)}
                            className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg bg-[#4ce081] py-2.5 text-sm font-bold text-[#003919] transition-opacity duration-200 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ce081]/70"
                        >
                            <MaterialIcon name="playlist_add" className="text-[16px]! md:text-xl!" />
                            <span>
                                Queue all
                                {visibleProposals.length > 0 ? ` (${visibleProposals.length})` : ''}
                            </span>
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={onClose}
                            className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border border-white/20 bg-transparent py-2.5 text-sm font-bold text-[#c8c5d2] transition-colors duration-200 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                        >
                            <MaterialIcon name="done" className="text-[16px]! md:text-xl!" />
                            <span>Done</span>
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}
