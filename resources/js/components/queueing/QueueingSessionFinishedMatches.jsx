import { useMemo, useState } from 'react';
import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';
import {
    durationInSeconds,
    finishedMatchIncludesPlayerQuery,
    finishedTeamBadgeClass,
    formatDuration,
    formatTimeOnly,
    lineupDisplayNamesByTeam,
} from '../../lib/queueingMatchDisplay.js';
import { QueueingSessionMatchCard } from './QueueingSessionMatchCard.jsx';

/** @param {{ rows: Array<Record<string, unknown>> }} props */
export function QueueingSessionFinishedMatches({ rows }) {
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

                    <div className="rt-finished-matches-mobile">
                        <ul className="rt-match-cards-grid space-y-3">
                            {filteredRows.map((row, index) => (
                                <li key={row.id}>
                                    <QueueingSessionMatchCard row={row} index={index} />
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="rt-finished-matches-table">
                        <div className="rt-scroll-inline overflow-x-auto rounded-xl border border-[#45454a] bg-[#1b1b1e]">
                            <table className="w-full min-w-[720px] border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-[#45454a] text-[11px] font-bold uppercase tracking-wide text-[#918f9c]">
                                        <th scope="col" className="px-3 py-3">
                                            Match
                                        </th>
                                        <th scope="col" className="px-3 py-3">
                                            Team 1
                                        </th>
                                        <th scope="col" className="px-3 py-3">
                                            Team 2
                                        </th>
                                        <th scope="col" className="px-3 py-3">
                                            Result
                                        </th>
                                        <th scope="col" className="px-3 py-3">
                                            Times
                                        </th>
                                        <th scope="col" className="px-3 py-3">
                                            Duration
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRows.map((row, index) => {
                                        const { team1, team2 } = lineupDisplayNamesByTeam(row.lineup);
                                        const winningTeam =
                                            row.winning_team === 1 || row.winning_team === 2
                                                ? row.winning_team
                                                : null;
                                        const durationSeconds = durationInSeconds(
                                            row.started_at,
                                            row.finished_at,
                                        );
                                        const passedValidation =
                                            durationSeconds != null && durationSeconds > 8 * 60;
                                        const hasScore =
                                            row.team1_score != null && row.team2_score != null;
                                        const staggerClass = `rt-finished-row-stagger--${Math.min(index + 1, 12)}`;

                                        return (
                                            <tr
                                                key={row.id}
                                                className={[
                                                    'rt-finished-match-row border-b border-[#2a2a2d] last:border-b-0',
                                                    passedValidation
                                                        ? 'rt-finished-match-row--validated'
                                                        : '',
                                                    staggerClass,
                                                ]
                                                    .filter(Boolean)
                                                    .join(' ')}
                                            >
                                                <td className="px-3 py-3 align-middle">
                                                    {row.match_no != null ? (
                                                        <span className="rt-match-no rt-match-no--table">
                                                            #{row.match_no}
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-[#918f9c]">—</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 align-middle md:whitespace-nowrap">
                                                    {team1.length > 0 ? (
                                                        <span className="flex flex-col items-start gap-1 md:flex-row md:flex-wrap">
                                                            {team1.map((name, i) => (
                                                                <span
                                                                    key={i}
                                                                    className={finishedTeamBadgeClass(
                                                                        winningTeam,
                                                                        1,
                                                                    )}
                                                                >
                                                                    {name}
                                                                </span>
                                                            ))}
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-[#918f9c]">—</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 align-middle md:whitespace-nowrap">
                                                    {team2.length > 0 ? (
                                                        <span className="flex flex-col items-start gap-1 md:flex-row md:flex-wrap">
                                                            {team2.map((name, i) => (
                                                                <span
                                                                    key={i}
                                                                    className={finishedTeamBadgeClass(
                                                                        winningTeam,
                                                                        2,
                                                                    )}
                                                                >
                                                                    {name}
                                                                </span>
                                                            ))}
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-[#918f9c]">—</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 align-middle">
                                                    <div className="flex flex-col gap-1">
                                                        {hasScore ? (
                                                            <span className="text-sm font-bold tabular-nums text-[#e4e1e6]">
                                                                {row.team1_score} – {row.team2_score}
                                                            </span>
                                                        ) : null}
                                                        {winningTeam ? (
                                                            <span className="flex flex-col items-center justify-center text-xs font-semibold text-[#4ce081]">
                                                                <MaterialIcon
                                                                    name="emoji_events"
                                                                    className="text-[15px]!"
                                                                />
                                                                Team {winningTeam}
                                                            </span>
                                                        ) : (
                                                            <span className="text-sm text-[#918f9c]">—</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-3 align-middle text-sm text-[#c8c5d2]">
                                                    <span className="block">
                                                        <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-[#918f9c]">
                                                            Start
                                                        </span>
                                                        <span className="tabular-nums">
                                                            {formatTimeOnly(row.started_at)}
                                                        </span>
                                                    </span>
                                                    <span className="mt-0.5 block">
                                                        <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-[#918f9c]">
                                                            End
                                                        </span>
                                                        <span className="tabular-nums">
                                                            {formatTimeOnly(row.finished_at)}
                                                        </span>
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-3 align-middle text-sm tabular-nums text-[#c8c5d2]">
                                                    {formatDuration(row.started_at, row.finished_at)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
