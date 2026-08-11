import { useEffect, useMemo, useState } from 'react';
import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';
import { formatRatingChange, playerInitials } from '../ranking/rankingUtils.js';
import { formatGameTypeLabel } from '../../lib/facilityGameRoomUi.js';
import {
    formatSecondsDuration,
    formatTimeOnly,
    liveDurationSeconds,
    matchStatusLabel,
    matchStatusPillClass,
} from '../../lib/queueingMatchDisplay.js';

/**
 * @param {import('../../api/gameSession.js').GameSessionDetail} session
 */
export function facilityCourtStatus(session) {
    if (!session.is_active || session.status === 'finished') {
        return 'finished';
    }
    if (session.status === 'ongoing') {
        return 'ongoing';
    }
    return 'queueing';
}

/**
 * @param {NonNullable<import('../../api/gameSession.js').GameSessionDetail['players']>[number]} row
 */
function rosterPlayerName(row) {
    return row.user?.name?.trim() || row.guest_name?.trim() || 'Player';
}

/**
 * @param {import('../../api/gameSession.js').GameSessionDetail} session
 * @returns {{ team1: string[], team2: string[] }}
 */
export function facilitySessionLineup(session) {
    const last = session.last_match;
    if (last?.players?.length) {
        const team1 = last.players.filter((p) => p.team === 1).map((p) => p.name).filter(Boolean);
        const team2 = last.players.filter((p) => p.team === 2).map((p) => p.name).filter(Boolean);
        if (team1.length > 0 || team2.length > 0) {
            return { team1, team2 };
        }
    }

    const players = session.players ?? [];
    const playing = players.filter((p) => p.is_playing);
    const withTeam = players.filter((p) => p.team === 1 || p.team === 2);
    const source = playing.length > 0 ? playing : withTeam;

    return {
        team1: source.filter((p) => p.team === 1).map(rosterPlayerName),
        team2: source.filter((p) => p.team === 2).map(rosterPlayerName),
    };
}

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

/** @param {{ names: string[], teamNo: 1 | 2, status: string, winningTeam: number | null }} props */
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

    return (
        <div className={teamClass}>
            {isWinner ? (
                <MaterialIcon
                    name="trophy"
                    filled
                    className={[
                        'rt-match-team-trophy text-[18px]!',
                        teamNo === 1 ? 'rt-match-team-trophy--left' : 'rt-match-team-trophy--right',
                    ].join(' ')}
                />
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
                    <span className="rt-match-team-name text-[#918f9c]">Unassigned</span>
                )}
            </div>
        </div>
    );
}

/**
 * @param {{
 *   session: import('../../api/gameSession.js').GameSessionDetail;
 *   canStartMatch: boolean;
 *   anyPlaying: boolean;
 *   requiredPlayers: number;
 *   waitingForMatchCount: number;
 *   showFinishMatch: boolean;
 *   startBusy: boolean;
 *   startError: string;
 *   onStart: () => void;
 *   onFinish: () => void;
 * }} props
 */
export function FacilitySessionMatchPanel({
    session,
    canStartMatch,
    anyPlaying,
    requiredPlayers,
    waitingForMatchCount,
    showFinishMatch,
    startBusy,
    startError,
    onStart,
    onFinish,
}) {
    const status = facilityCourtStatus(session);
    const lineup = useMemo(() => facilitySessionLineup(session), [session]);
    const winningTeam =
        session.last_match?.winning_team === 1 || session.last_match?.winning_team === 2
            ? session.last_match.winning_team
            : null;
    const hasScore =
        session.last_match?.team1_score != null && session.last_match?.team2_score != null;
    const breakdown = session.last_match?.players ?? [];
    const isHost = Boolean(session.is_host && session.is_active);

    const cardClass = [
        'rt-match-card',
        status === 'ongoing' ? 'rt-match-card--ongoing' : '',
        status === 'finished' ? 'rt-match-card--finished' : '',
        status === 'queueing' ? 'rt-match-card--queueing' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <section aria-labelledby="facility-court-heading" className="md:sticky md:top-36">
            <h2 id="facility-court-heading" className="mb-3 text-base font-bold text-[#e4e1e6]">
                On court
            </h2>
            <article className={cardClass}>
                <div className="rt-match-card-inner">
                    <header className="rt-match-card-head">
                        <p className="text-xs font-semibold text-[#c8c5d2]">
                            {session.match_type === 'doubles' ? 'Doubles' : 'Singles'}
                            {formatGameTypeLabel(session.game_type)
                                ? ` · ${formatGameTypeLabel(session.game_type)}`
                                : ''}
                        </p>
                        <span className={matchStatusPillClass(status)}>
                            <span className="rt-match-status-dot" aria-hidden />
                            {matchStatusLabel(status)}
                        </span>
                    </header>

                    <div className="rt-match-lineup">
                        <MatchTeamBlock
                            names={lineup.team1}
                            teamNo={1}
                            status={status}
                            winningTeam={winningTeam}
                        />
                        <div className="rt-match-vs" aria-hidden>
                            <span>VS</span>
                        </div>
                        <MatchTeamBlock
                            names={lineup.team2}
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
                        {(status === 'ongoing' || status === 'finished') && session.started_at ? (
                            <span className="rt-match-meta-item">
                                <MaterialIcon name="play_circle" className="text-[14px]! text-[#918f9c]" />
                                <span>
                                    <span className="font-semibold">Started</span>{' '}
                                    <span className="tabular-nums">{formatTimeOnly(session.started_at)}</span>
                                </span>
                            </span>
                        ) : null}
                        {status === 'ongoing' && session.started_at ? (
                            <span className="rt-match-meta-item rt-match-meta-item--end">
                                <MaterialIcon name="timer" className="text-[14px]! text-[#4ce081]" />
                                <LiveMatchDuration startedAt={session.started_at} />
                            </span>
                        ) : null}
                        {status === 'finished' && session.last_match?.finished_at ? (
                            <span className="rt-match-meta-item rt-match-meta-item--end">
                                <MaterialIcon name="flag" className="text-[14px]! text-[#918f9c]" />
                                <span>
                                    <span className="font-semibold">Ended</span>{' '}
                                    <span className="tabular-nums">
                                        {formatTimeOnly(session.last_match.finished_at)}
                                    </span>
                                </span>
                            </span>
                        ) : null}
                    </div>

                    {hasScore || winningTeam != null ? (
                        <div className="rt-match-score">
                            {hasScore ? (
                                <span className="rt-match-score-value tabular-nums">
                                    {session.last_match?.team1_score}
                                    <span className="mx-1.5 text-[#918f9c]">–</span>
                                    {session.last_match?.team2_score}
                                </span>
                            ) : null}
                            {winningTeam != null ? (
                                <span className="rt-match-score-winner">Winner · Team {winningTeam}</span>
                            ) : null}
                        </div>
                    ) : null}

                    {breakdown.length > 0 ? (
                        <ul className="space-y-2 border-t border-white/5 pt-3">
                            {breakdown.map((p) => (
                                <li key={p.user_id} className="flex items-baseline justify-between gap-3 text-xs">
                                    <span className="min-w-0 truncate font-medium text-[#e4e1e6]">
                                        {p.name}
                                        <span className={p.won ? 'ml-1.5 text-[#4ce081]' : 'ml-1.5 text-[#918f9c]'}>
                                            {p.won ? 'W' : 'L'}
                                        </span>
                                        <span
                                            className={
                                                p.rating_change >= 0
                                                    ? 'ml-1 text-[#4ce081]'
                                                    : 'ml-1 text-[#ffb4ab]'
                                            }
                                        >
                                            ({formatRatingChange(p.rating_change)})
                                        </span>
                                    </span>
                                    <span className="shrink-0 tabular-nums text-[#c2c1ff]">
                                        +{p.session_points_earned} pts
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : null}

                    {isHost ? (
                        <div className="rt-match-actions">
                            {showFinishMatch ? (
                                <button
                                    type="button"
                                    onClick={onFinish}
                                    className="min-h-12 w-full cursor-pointer rounded-xl border border-[#ffb4ab]/45 bg-[#ffb4ab]/12 px-6 text-base font-extrabold tracking-tight text-[#ffb4ab] transition-transform duration-150 enabled:active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffb4ab]/60"
                                >
                                    Finish match
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={onStart}
                                    disabled={!canStartMatch || startBusy}
                                    aria-busy={startBusy}
                                    className="rt-kinetic-gradient min-h-12 w-full cursor-pointer rounded-xl px-6 text-base font-extrabold tracking-tight text-[#211e6a] transition-transform duration-150 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c2c1ff]/70"
                                >
                                    {startBusy ? 'Starting…' : 'Start match'}
                                </button>
                            )}
                            {showFinishMatch ? (
                                <p className="w-full text-xs text-[#918f9c]">
                                    Enter a final score or pick the winning team to update rankings, credit points, and close this session.
                                </p>
                            ) : null}
                            {!showFinishMatch && !anyPlaying && waitingForMatchCount < requiredPlayers ? (
                                <p className="w-full text-xs text-[#918f9c]">
                                    Need {requiredPlayers} waiting players to start ({waitingForMatchCount} ready).
                                </p>
                            ) : null}
                            {!showFinishMatch && anyPlaying ? (
                                <p className="w-full text-xs text-[#918f9c]">A match is in progress.</p>
                            ) : null}
                            {startError ? (
                                <p className="w-full text-sm text-[#ffb4ab]" role="alert">
                                    {startError}
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </article>
        </section>
    );
}
