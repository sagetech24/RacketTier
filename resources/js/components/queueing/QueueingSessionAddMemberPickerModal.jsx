import { useEffect, useMemo, useState } from 'react';
import { fetchFacilityPlayers } from '../../api/gameSession.js';
import { isOfflineStatus, markNetworkFailure } from '../../lib/connection.js';
import { isNetworkError } from '../../lib/networkError.js';
import {
    getMemberCache,
    memberCacheKey,
    putMemberCache,
} from '../../offline/queueingDraftDb.js';
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
 * @param {unknown[]} rows
 * @param {string} needle
 */
function filterMembers(rows, needle) {
    const q = needle.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => String(row?.name ?? '').toLowerCase().includes(q));
}

/**
 * @param {{
 *   open: boolean,
 *   sportId?: number | null,
 *   sportName?: string | null,
 *   rosterUserIds: Set<number>,
 *   busy?: boolean,
 *   showSkillLevel?: boolean,
 *   embedded?: boolean,
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
    embedded = false,
    onClose,
    onSelectMember,
}) {
    const [playerSearch, setPlayerSearch] = useState('');
    const [searchRows, setSearchRows] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [fromCache, setFromCache] = useState(false);

    useEffect(() => {
        if (!open) return;
        setPlayerSearch('');
        setSearchRows([]);
        setSearchLoading(true);
        setFromCache(false);
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;

        let cancelled = false;
        setSearchLoading(true);

        const t = window.setTimeout(() => {
            (async () => {
                const cacheKey = memberCacheKey(sportId);
                const preferLocal =
                    isOfflineStatus() ||
                    (typeof navigator !== 'undefined' && navigator.onLine === false);

                try {
                    if (preferLocal) {
                        const cached = await getMemberCache(cacheKey);
                        if (!cancelled) {
                            setSearchRows(filterMembers(cached, playerSearch));
                            setFromCache(true);
                        }
                        return;
                    }

                    const rows = await fetchFacilityPlayers(playerSearch, {
                        includeMe: true,
                        sportId: sportId ?? undefined,
                    });
                    // Keep a full directory snapshot for offline adds (unfiltered list).
                    if (!playerSearch.trim()) {
                        void putMemberCache(cacheKey, rows);
                    } else {
                        // Merge search hits into existing cache so late lookups still work offline.
                        const existing = await getMemberCache(cacheKey);
                        const byId = new Map(existing.map((row) => [Number(row.id), row]));
                        for (const row of rows) byId.set(Number(row.id), row);
                        void putMemberCache(cacheKey, [...byId.values()]);
                    }
                    if (!cancelled) {
                        setSearchRows(rows);
                        setFromCache(false);
                    }
                } catch (err) {
                    const cached = await getMemberCache(cacheKey);
                    if (isNetworkError(err)) markNetworkFailure();
                    if (!cancelled) {
                        setSearchRows(filterMembers(cached, playerSearch));
                        setFromCache(true);
                    }
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
        () => searchRows.filter((row) => !rosterUserIds.has(Number(row.id))),
        [searchRows, rosterUserIds],
    );

    if (!open) return null;

    const emptyMessage = (() => {
        if (playerSearch.trim()) {
            return fromCache
                ? 'No cached members match your search. Connect once to refresh the member list.'
                : 'No members match your search.';
        }
        if (fromCache && searchRows.length === 0) {
            return 'No cached members on this device. Open Add Member while online first, then try again offline.';
        }
        return fromCache
            ? 'Showing members saved on this device.'
            : 'No members available to add.';
    })();

    const listBody = (
        <>
            {embedded ? (
                <div className="shrink-0 px-5 pb-3">
                    <div className="relative">
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
                            id="rt-add-players-member-search"
                            className="w-full rounded-lg border border-[#3c3c3e] bg-[#131316] py-3 pl-11 pr-3 text-md text-[#e4e1e6] outline-none focus:ring-1 focus:ring-[#4ce081] disabled:opacity-60"
                        />
                    </div>
                    {fromCache ? (
                        <p className="mt-2 text-[11px] text-[#bab9c0]">
                            Offline — using members cached on this device.
                        </p>
                    ) : null}
                </div>
            ) : null}

            <div className={`min-h-0 flex-1 overflow-y-auto ${embedded ? 'px-5 pb-4' : 'px-5 py-4'}`}>
                {searchLoading ? (
                    <PlayerListSkeleton />
                ) : addablePlayers.length === 0 ? (
                    <p className="rounded-lg border border-[#3c3c3e] bg-[#131316]/60 px-3 py-8 text-center text-sm text-[#918f9c]">
                        {emptyMessage}
                    </p>
                ) : (
                    <div className="space-y-2" aria-live="polite">
                        {fromCache && !embedded ? (
                            <p className="px-1 text-[11px] text-[#bab9c0]">
                                Offline — using members cached on this device.
                            </p>
                        ) : null}
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
                                        skill_level: showSkillLevel ? skillLevel : null,
                                    });
                                }}
                                className="flex w-full items-center justify-between gap-2 rounded-lg border border-[#3c3c3e]/80 bg-[#131316]/60 px-3 py-3 text-left transition hover:border-[#4ce081]/50 hover:bg-[#1b1b1e] disabled:opacity-60"
                            >
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-[#e4e1e6]">
                                        {r.name}
                                    </div>
                                    <MemberSportStats stats={r.stats} sportName={sportName} />
                                </div>
                                <MaterialIcon name="chevron_right" className="text-[#918f9c] text-xl!" />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </>
    );

    if (embedded) {
        return listBody;
    }

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
                <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl border border-[#3c3c3e] bg-[#1b1b1e] sm:rounded-2xl">
                    <div className="flex items-center justify-between gap-3 border-b border-[#3c3c3e] px-5 py-4">
                        <h2 className="text-lg font-bold text-[#e4e1e6]">Add member</h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg p-1 text-[#918f9c] hover:bg-white/5 hover:text-[#e4e1e6]"
                            aria-label="Close"
                        >
                            <MaterialIcon name="close" />
                        </button>
                    </div>
                    <div className="shrink-0 px-5 pt-4">
                        <div className="relative">
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
                    {listBody}
                </div>
            </div>
        </ModalPortal>
    );
}
