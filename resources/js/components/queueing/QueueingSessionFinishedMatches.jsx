import { useMemo, useState } from 'react';
import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';
import { finishedMatchIncludesPlayerQuery } from '../../lib/queueingMatchDisplay.js';
import { QueueingSessionMatchCard } from './QueueingSessionMatchCard.jsx';

/**
 * @param {{
 *   rows: Array<Record<string, unknown>>,
 *   canOverrideFinished?: boolean,
 *   busy?: boolean,
 *   onSwitchFinishedResult?: (row: Record<string, unknown>) => void,
 *   onUpdateFinishedPairing?: (row: Record<string, unknown>) => void,
 * }} props
 */
export function QueueingSessionFinishedMatches({
    rows,
    canOverrideFinished = false,
    busy = false,
    onSwitchFinishedResult,
    onUpdateFinishedPairing,
}) {
    const [playerSearch, setPlayerSearch] = useState('');

    const filteredRows = useMemo(() => {
        const q = playerSearch.trim();
        if (!q) return rows;
        return rows.filter((row) => finishedMatchIncludesPlayerQuery(row, q));
    }, [rows, playerSearch]);

    if (rows.length === 0) {
        return null;
    }

    const hasActiveSearch = playerSearch.trim().length > 0;

    return (
        <div className="space-y-4">
            <div className="rt-ranking-toolbar-search group relative max-w-md">
                <div className="pointer-events-none absolute inset-y-0 left-4 z-10 flex items-center text-[#918f9c]">
                    <MaterialIcon name="search" className="text-xl!" />
                </div>
                <input
                    type="search"
                    placeholder="Filter by player name…"
                    value={playerSearch}
                    onChange={(e) => setPlayerSearch(e.target.value)}
                    className="rt-input border border-white/10"
                    aria-label="Filter finished matches by player name"
                />
            </div>

            {filteredRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#45454a] bg-[#1b1b1e]/60 px-4 py-10 text-center">
                    <MaterialIcon name="search_off" className="mx-auto mb-2 text-[28px]! text-[#918f9c]" />
                    <p className="text-sm font-semibold text-[#e4e1e6]">No matches for that player</p>
                    <p className="mt-1 text-sm text-[#918f9c]">
                        {hasActiveSearch
                            ? `None of the finished matches include “${playerSearch.trim()}”.`
                            : 'Try a different name.'}
                    </p>
                </div>
            ) : (
                <>
                    {hasActiveSearch ? (
                        <p className="text-sm text-[#918f9c]">
                            Showing {filteredRows.length} of {rows.length}{' '}
                            {rows.length === 1 ? 'match' : 'matches'}
                        </p>
                    ) : null}

                    <ul className="rt-match-cards-grid space-y-3 md:space-y-0">
                        {filteredRows.map((row, index) => (
                            <li key={row.id}>
                                <QueueingSessionMatchCard
                                    row={row}
                                    index={index}
                                    busy={busy}
                                    canOverrideFinished={canOverrideFinished}
                                    onSwitchFinishedResult={onSwitchFinishedResult}
                                    onUpdateFinishedPairing={onUpdateFinishedPairing}
                                />
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}
