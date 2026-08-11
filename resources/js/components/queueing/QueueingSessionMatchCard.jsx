import { useEffect, useState } from 'react';
import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';
import { playerInitials } from '../ranking/rankingUtils.js';
import {
    formatDuration,
    formatTimeOnly,
    lineupDisplayNamesByTeam,
    liveDurationSeconds,
    formatSecondsDuration,
    matchStatusLabel,
    matchStatusPillClass,
} from '../../lib/queueingMatchDisplay.js';

/** @param {{ startedAt: string | null | undefined }} props */
function LiveMatchDuration({ startedAt }) {
    const [seconds, setSeconds] = useState(() => liveDurationSeconds(startedAt));

    useEffect(() => {
        if (!startedAt) return undefined;
        const tick = () => setSeconds(liveDurationSeconds(startedAt));
        tick();
        const id = window.setInterval(tick, 1000);
        return () => window.clearInterval(id);
    }, [startedAt]);

    return (
        <span className="rt-match-live-duration tabular-nums" aria-live="polite">
            {formatSecondsDuration(seconds)}
        </span>
    );
}

/** @param {{ names: string[], teamNo: 1 | 2, status?: string, winningTeam?: number | null }} props */
function MatchTeamBlock({ names, teamNo, status, winningTeam }) {
    const isWinner = status === 'finished' && winningTeam === teamNo;
    const isLoser = status === 'finished' && winningTeam != null && winningTeam !== teamNo;

    const teamClass = [
        'rt-match-team',
        isWinner ? 'rt-match-team--winner' : '',
        isLoser ? 'rt-match-team--loser' : '',
        teamNo === 1 ? 'rt-match-team--1' : 'rt-match-team--2',
    ]
        .filter(Boolean)
        .join(' ');

    const trophyClass = [
        'rt-match-team-trophy text-[18px]!',
        teamNo === 1 ? 'rt-match-team-trophy--left' : 'rt-match-team-trophy--right',
    ].join(' ');

    return (
        <div className={teamClass}>
            {isWinner ? (
                <MaterialIcon name="trophy" className={trophyClass} filled />
            ) : null}
            <div className="rt-match-team-avatars" aria-hidden>
                {names.length > 0 ? (
                    names.map((name, i) => (
                        <span key={`${name}-${i}`} className="rt-match-team-avatar">
                            {playerInitials(name)}
                        </span>
                    ))
                ) : (
                    <span className="rt-match-team-avatar">?</span>
                )}
            </div>
            <div className="rt-match-team-names">
                {names.length > 0 ? (
                    <span className="rt-match-team-name capitalize" title={names.join(' & ')}>
                        {names.join(' & ')}
                    </span>
                ) : (
                    <span className="rt-match-team-name text-[#918f9c]">—</span>
                )}
            </div>
        </div>
    );
}

/**
 * @param {{
 *   row: Record<string, unknown>;
 *   index?: number;
 *   canManageMatches?: boolean;
 *   canEndMatch?: boolean;
 *   busy?: boolean;
 *   onStartQueuedMatch?: (matchId: number) => void;
 *   onEditMatch?: (row: Record<string, unknown>) => void;
 *   onRemoveMatch?: (row: Record<string, unknown>) => void;
 *   onEndMatch?: (row: Record<string, unknown>) => void;
 * }} props
 */
export function QueueingSessionMatchCard({
    row,
    index = 0,
    canManageMatches = false,
    canEndMatch = false,
    busy = false,
    onStartQueuedMatch,
    onEditMatch,
    onRemoveMatch,
    onEndMatch,
}) {
    const status = typeof row.status === 'string' ? row.status : 'queueing';
    const { team1, team2 } = lineupDisplayNamesByTeam(row.lineup);
    const winningTeam = row.winning_team === 1 || row.winning_team === 2 ? row.winning_team : null;
    const hasScore = row.team1_score != null && row.team2_score != null;
    const matchNo = row.match_no;

    const cardClass = [
        'rt-match-card',
        status === 'ongoing' ? 'rt-match-card--ongoing' : '',
        status === 'finished' ? 'rt-match-card--finished' : '',
        status === 'queueing' ? 'rt-match-card--queueing' : '',
    ]
        .filter(Boolean)
        .join(' ');

    const staggerClass = `rt-match-card-stagger--${Math.min(index + 1, 12)}`;

    return (
        <article className={[cardClass, staggerClass].join(' ')}>
            <div className="rt-match-card-inner">
                <header className="rt-match-card-head">
                    <div className="flex min-w-0 items-center gap-2">
                        {matchNo != null ? (
                            <span className="rt-match-no" title={`Match ${matchNo}`}>
                                #{matchNo}
                            </span>
                        ) : null}
                        {status === 'finished' && row.finished_at ? (
                            <span className="flex items-center gap-1 text-xs">
                                <MaterialIcon name="timer" className="text-[14px]! text-slate-300" />
                                {formatDuration(row.started_at, row.finished_at)}
                            </span>
                        ) : null}
                    </div>
                    <span className={matchStatusPillClass(status)}>
                        <span className="rt-match-status-dot" aria-hidden />
                        {matchStatusLabel(status)}
                    </span>
                </header>

                <div className="rt-match-lineup">
                    <MatchTeamBlock
                        names={team1}
                        teamNo={1}
                        status={status}
                        winningTeam={winningTeam}
                    />
                    <div className="rt-match-vs" aria-hidden>
                        <span className="text-[#918f9c]">VS</span>
                    </div>
                    <MatchTeamBlock
                        names={team2}
                        teamNo={2}
                        status={status}
                        winningTeam={winningTeam}
                    />
                </div>

                <div
                    className={[
                        'rt-match-meta',
                        status === 'ongoing' || status === 'finished' ? 'rt-match-meta--split' : '',
                    ]
                        .filter(Boolean)
                        .join(' ')}
                >
                    {status === 'queueing' ? (
                        <span className="rt-match-meta-item text-[#c8c5d2]">
                            <MaterialIcon name="hourglass_top" className="text-[14px]! text-[#fbbf24]" />
                            Waiting to start
                        </span>
                    ) : null}

                    {(status === 'ongoing' || status === 'finished') && row.started_at ? (
                        <span className="rt-match-meta-item">
                            <MaterialIcon name="play_circle" className="text-[14px]! text-[#918f9c]" />
                            <span>
                                <span className="font-semibold">Started</span>
                                {' '}
                                <span className="tabular-nums">{formatTimeOnly(row.started_at)}</span>
                            </span>
                        </span>
                    ) : null}

                    {status === 'ongoing' && row.started_at ? (
                        <span className="rt-match-meta-item rt-match-meta-item--end">
                            <MaterialIcon name="timer" className="text-[14px]! text-[#4ce081]" />
                            <LiveMatchDuration startedAt={row.started_at} />
                        </span>
                    ) : null}

                    {status === 'finished' && row.finished_at ? (
                        <span className="rt-match-meta-item rt-match-meta-item--end">
                            <MaterialIcon name="flag" className="text-[14px]! text-[#918f9c]" />
                            <span>
                                <span className="font-semibold">Ended</span>
                                {' '}
                                <span className="tabular-nums">{formatTimeOnly(row.finished_at)}</span>
                            </span>
                        </span>
                    ) : null}
                </div>

                {hasScore || winningTeam ? (
                    <div>
                        {hasScore ? (
                            <span className="rt-match-score-value tabular-nums">
                                {row.team1_score}
                                <span className="mx-1.5 text-[#918f9c]">–</span>
                                {row.team2_score}
                            </span>
                        ) : null}
                    </div>
                ) : null}

                {canManageMatches && status === 'queueing' ? (
                    <div className="rt-match-actions">
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => onStartQueuedMatch?.(row.id)}
                            className="rt-match-action rt-match-action--primary"
                        >
                            <MaterialIcon name="play_arrow" className="text-[16px]!" />
                            Start
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => onEditMatch?.(row)}
                            className="rt-match-action rt-match-action--secondary"
                            aria-label="Edit match lineup"
                        >
                            <MaterialIcon name="edit" className="text-[16px]!" />
                            Edit
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => onRemoveMatch?.(row)}
                            className="rt-match-action rt-match-action--danger"
                            aria-label="Remove match"
                        >
                            <MaterialIcon name="delete" className="text-[16px]!" />
                            Remove
                        </button>
                    </div>
                ) : null}

                {canManageMatches && status === 'ongoing' ? (
                    <div className="rt-match-actions">
                        {canEndMatch ? (
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => onEndMatch?.(row)}
                                className="rt-match-action rt-match-action--end"
                            >
                                <MaterialIcon name="sports_score" className="text-[16px]!" />
                                End match
                            </button>
                        ) : null}
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => onEditMatch?.(row)}
                            className="rt-match-action rt-match-action--secondary"
                            aria-label="Change match players"
                        >
                            <MaterialIcon name="edit" className="text-[16px]!" />
                            Edit
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => onRemoveMatch?.(row)}
                            className="rt-match-action rt-match-action--danger"
                            aria-label="Cancel match"
                        >
                            <MaterialIcon name="close" className="text-[16px]!" />
                            Cancel
                        </button>
                    </div>
                ) : null}
            </div>
        </article>
    );
}
