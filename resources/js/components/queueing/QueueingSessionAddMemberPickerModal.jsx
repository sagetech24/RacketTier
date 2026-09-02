import { useEffect, useMemo, useState } from 'react';
import { fetchFacilityPlayers } from '../../api/gameSession.js';
import { ModalPortal } from '../app/ModalPortal.jsx';
import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';

/**
 * @param {{
 *   stats?: { wins: number, losses: number, total_matches: number } | null,
 *   sportName?: string | null,
 * }} props
 */
function MemberSportStats({ stats, sportName }) {
    const wins = stats?.wins ?? 0;
    const losses = stats?.losses ?? 0;
    const total = stats?.total_matches ?? wins + losses;
    const label = sportName ? `${sportName} stats` : 'Sport stats';

    return (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[#918f9c]" title={label}>
            <span className="inline-flex items-center gap-0.5">
                <MaterialIcon name="arrow_upward" className="text-[13px]! text-[#4ce081]" />
                <span className="tabular-nums font-medium text-[#e4e1e6]">{wins}</span>
            </span>
            <span className="inline-flex items-center gap-0.5">
                <MaterialIcon name="arrow_downward" className="text-[13px]! text-red-300/90" />
                <span className="tabular-nums font-medium text-[#e4e1e6]">{losses}</span>
            </span>
            <span className="inline-flex items-center gap-0.5">
                Total:
                <span className="tabular-nums font-medium text-[#e4e1e6]">{total} games</span>
            </span>
        </div>
    );
}

function PlayerListSkeleton() {
    return (
        <div
            className="space-y-2"
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Loading members"
        >
            {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                    key={n}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[#3c3c3e]/80 bg-[#131316]/60 px-3 py-3"
                >
                    <div className="min-w-0 flex-1 space-y-2">
                        <div className="rt-skeleton h-4 w-36 max-w-[70%] rounded" />
                        <div className="rt-skeleton h-3 w-48 max-w-full rounded" />
                    </div>
                    <div className="rt-skeleton size-5 shrink-0 rounded" />
                </div>
            ))}
            <span className="sr-only">Loading members…</span>
        </div>
    );
}

/**
 * @param {{
 *   open: boolean,
 *   sportId?: number | null,
 *   sportName?: string | null,
 *   rosterUserIds: Set<number>,
 *   busy?: boolean,
 *   showSkillLevel?: boolean,
 *   onClose: () => void,
 *   onSelectMember: (member: {
 *     id: number,
 *     name: string,
 *     pronoun?: string | null,
 *     skill_level?: number | null,
 *   }) => void,
 * }} props
 */
export function QueueingSessionAddMemberPickerModal({
    open,
    sportId = null,
    sportName = null,
    rosterUserIds,
    busy = false,
    showSkillLevel = true,
    onClose,
    onSelectMember,
}) {
    const [playerSearch, setPlayerSearch] = useState('');
    const [searchRows, setSearchRows] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        setPlayerSearch('');
        setSearchRows([]);
        setSearchLoading(true);
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;

        let cancelled = false;
        setSearchLoading(true);

        const t = window.setTimeout(() => {
            (async () => {
                try {
                    const rows = await fetchFacilityPlayers(playerSearch, {
                        includeMe: true,
                        sportId: sportId ?? undefined,
                    });
                    if (!cancelled) setSearchRows(rows);
                } catch {
                    if (!cancelled) setSearchRows([]);
                } finally {
                    if (!cancelled) setSearchLoading(false);
                }
            })();
        }, 200);

        return () => {
            cancelled = true;
            window.clearTimeout(t);
        };
    }, [open, playerSearch, sportId]);

    const addablePlayers = useMemo(
        () => searchRows.filter((row) => !rosterUserIds.has(row.id)),
        [searchRows, rosterUserIds],
    );

    if (!open) return null;

    return (
        <ModalPortal open={open}>
            <div className="rt-end-match-modal-overlay fixed inset-0 z-200 flex items-stretch justify-center sm:items-center sm:p-6">
                <button
                    type="button"
                    className="absolute inset-0"
                    aria-label="Close add players"
                    onClick={() => {
                        if (!busy) onClose();
                    }}
                />
                <div
                    className="rt-end-match-modal-sheet relative flex h-[100dvh] max-h-[100dvh] w-full max-w-md flex-col rounded-none border-0 border-[#2a2a2d] bg-[#1b1b1e] shadow-xl sm:h-[min(92dvh,44rem)] sm:max-h-[min(92dvh,44rem)] sm:rounded-2xl sm:border"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="rt-add-players-title"
                >
                    <div className="shrink-0 border-b border-white/5 px-5 pb-4 pt-5">
                        <h3 id="rt-add-players-title" className="text-lg font-bold text-[#e4e1e6]">
                            Add players
                        </h3>
                        <p className="mt-1 text-sm text-[#918f9c]">
                            Search members to add to this session.
                        </p>

                        <div className="relative mt-4">
                            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#918f9c]">
                                <MaterialIcon name="search" className="text-xl!" />
                            </div>
                            <input
                                value={playerSearch}
                                onChange={(e) => setPlayerSearch(e.target.value)}
                                type="search"
                                placeholder="Search members…"
                                disabled={busy}
                                aria-label="Search members"
                                className="w-full rounded-lg border border-[#3c3c3e] bg-[#131316] py-3 pl-11 pr-3 text-md text-[#e4e1e6] outline-none focus:ring-1 focus:ring-[#4ce081] disabled:opacity-60"
                            />
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                        {searchLoading ? (
                            <PlayerListSkeleton />
                        ) : addablePlayers.length === 0 ? (
                            <p className="rounded-lg border border-[#3c3c3e] bg-[#131316]/60 px-3 py-8 text-center text-sm text-[#918f9c]">
                                {playerSearch.trim()
                                    ? 'No members match your search.'
                                    : 'No members available to add.'}
                            </p>
                        ) : (
                            <div className="space-y-2" aria-live="polite">
                                {addablePlayers.map((r) => (
                                    <button
                                        key={r.id}
                                        type="button"
                                        disabled={busy}
                                        onClick={() => {
                                            const tierNo = r.tier?.tier_no;
                                            const skillLevel =
                                                typeof tierNo === 'number' && tierNo >= 1 && tierNo <= 5
                                                    ? tierNo
                                                    : null;

                                            onSelectMember({
                                                id: r.id,
                                                name: r.name,
                                                pronoun: r.pronoun ?? null,
                                                skill_level: skillLevel,
                                            });
                                        }}
                                        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-[#514c53] bg-white/10 px-3 py-2.5 text-left text-md transition-colors duration-200 hover:border-[#4ce081]/50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <span className="flex min-w-0 flex-1 flex-col">
                                            <span className="flex min-w-0 items-center gap-2">
                                                <span className="truncate">{r.name}</span>
                                                {showSkillLevel && sportId != null ? (
                                                    <span
                                                        className="shrink-0 rounded-full border border-[#514c53] bg-[#c2c1ff]/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#c8c5d2]"
                                                        title="Tier for this session's sport (lifetime session points)"
                                                    >
                                                        {r.tier?.name ?? '—'}
                                                    </span>
                                                ) : null}
                                            </span>
                                            {sportId != null ? (
                                                <MemberSportStats stats={r.stats} sportName={sportName} />
                                            ) : null}
                                        </span>
                                        <span className="shrink-0 text-xs text-[#c2c1ff]/70">
                                            <MaterialIcon name="add" className="text-xs text-[#c2c1ff]/70" />
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="shrink-0 border-t border-white/5 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4">
                        <button
                            type="button"
                            disabled={busy}
                            onClick={onClose}
                            className="w-full cursor-pointer rounded-lg border border-white/50 py-2.5 text-sm font-bold text-white/70 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}
