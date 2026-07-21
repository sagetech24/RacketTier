import { useEffect, useMemo, useState } from 'react';
import { fetchFacilityPlayers } from '../../api/gameSession.js';
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

/**
 * @param {{
 *   open: boolean,
 *   sportId?: number | null,
 *   sportName?: string | null,
 *   rosterUserIds: Set<number>,
 *   busy?: boolean,
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
    onClose,
    onSelectMember,
}) {
    const [playerSearch, setPlayerSearch] = useState('');
    const [searchRows, setSearchRows] = useState([]);

    useEffect(() => {
        if (!open) return;
        setPlayerSearch('');
        setSearchRows([]);
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;

        let cancelled = false;
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
        <div className="rt-end-match-modal-overlay fixed inset-0 z-[99] flex items-end justify-center sm:items-center">
            <button
                type="button"
                className="absolute inset-0"
                aria-label="Close add players"
                onClick={() => {
                    if (!busy) onClose();
                }}
            />
            <div className="rt-end-match-modal-sheet relative w-full max-w-md rounded-2xl border border-[#2a2a2d] bg-[#1b1b1e] p-5 shadow-xl">
                <h3 className="text-lg font-bold text-[#e4e1e6]">Add players</h3>
                <p className="mt-1 text-sm text-[#918f9c]">Search members to add to this session.</p>

                <input
                    value={playerSearch}
                    onChange={(e) => setPlayerSearch(e.target.value)}
                    type="search"
                    placeholder="Search members…"
                    disabled={busy}
                    className="mt-4 mb-2 w-full rounded-lg border border-[#3c3c3e] bg-[#131316] p-3 text-md text-[#e4e1e6] outline-none focus:ring-1 focus:ring-[#4ce081] disabled:opacity-60"
                />

                <div className="max-h-60 space-y-2 overflow-y-auto md:max-h-[min(24rem,calc(100dvh-16rem))]">
                    {addablePlayers.length === 0 ? (
                        <p className="rounded-lg border border-[#3c3c3e] bg-[#131316]/60 px-3 py-4 text-center text-sm text-[#918f9c]">
                            {playerSearch.trim() ? 'No members match your search.' : 'Type to search for members.'}
                        </p>
                    ) : (
                        addablePlayers.map((r) => (
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
                                className="flex w-full items-center justify-between gap-2 rounded-lg border border-[#514c53] bg-white/10 px-3 py-2 text-left text-md transition-colors hover:border-[#4ce081]/50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <span className="flex min-w-0 flex-1 flex-col">
                                    <span className="flex min-w-0 items-center gap-2">
                                        <span className="truncate">{r.name}</span>
                                        {sportId != null ? (
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
                        ))
                    )}
                </div>

                <button
                    type="button"
                    disabled={busy}
                    onClick={onClose}
                    className="mt-4 w-full rounded-lg border border-white/50 py-2 text-sm font-bold text-white/70 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
