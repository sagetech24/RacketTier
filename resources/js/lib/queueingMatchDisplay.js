/** @param {string | null | undefined} iso */
export function formatTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
}

/** @param {string | null | undefined} iso */
export function formatTimeOnly(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

/** @param {string | null | undefined} start @param {string | null | undefined} end */
export function durationInSeconds(start, end) {
    if (!start || !end) return null;
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;
    return Math.max(0, Math.round((endMs - startMs) / 1000));
}

/** @param {number} totalSeconds */
export function formatSecondsDuration(totalSeconds) {
    if (totalSeconds == null || !Number.isFinite(totalSeconds)) return '—';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
    if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
    return `${seconds}s`;
}

/** @param {string | null | undefined} start @param {string | null | undefined} end */
export function formatDuration(start, end) {
    return formatSecondsDuration(durationInSeconds(start, end));
}

/** @param {string | null | undefined} startedAt @param {number} [nowMs] */
export function liveDurationSeconds(startedAt, nowMs = Date.now()) {
    if (!startedAt) return null;
    const startMs = new Date(startedAt).getTime();
    if (Number.isNaN(startMs)) return null;
    return Math.max(0, Math.floor((nowMs - startMs) / 1000));
}

/** @param {unknown} lineup */
export function lineupDisplayNamesByTeam(lineup) {
    const rows = Array.isArray(lineup) ? lineup : [];
    const label = (p) => p.name || p.guest_name || 'Player';
    const team1 = rows.filter((p) => p.team === 1).map(label);
    const team2 = rows.filter((p) => p.team === 2).map(label);
    if (team1.length === 0 && team2.length === 0 && rows.length === 2) {
        return { team1: [label(rows[0])], team2: [label(rows[1])] };
    }
    return { team1, team2 };
}

/** @param {'finished' | 'ongoing' | 'queueing' | string | undefined} status */
export function matchStatusLabel(status) {
    if (status === 'queueing') return 'Queued';
    if (status === 'ongoing') return 'Playing';
    if (status === 'finished') return 'Finished';
    return status ?? 'Match';
}

/** @param {'finished' | 'ongoing' | 'queueing' | string | undefined} status */
export function matchStatusPillClass(status) {
    if (status === 'ongoing') return 'rt-match-status-pill rt-match-status-pill--ongoing';
    if (status === 'finished') return 'rt-match-status-pill rt-match-status-pill--finished';
    return 'rt-match-status-pill rt-match-status-pill--queueing';
}

/** @param {number | null | undefined} winningTeam @param {1 | 2} teamNo */
export function finishedTeamBadgeClass(winningTeam, teamNo) {
    const base =
        'inline-flex max-w-full items-center truncate rounded-full border px-2.5 py-0.5 text-[10px] font-semibold capitalize';
    if (winningTeam !== 1 && winningTeam !== 2) {
        return `${base} border-[#45454a] bg-[#2a2a2d] text-[#c8c5d2]`;
    }
    return winningTeam === teamNo
        ? `${base} border-[#4ce081]/40 bg-[#4ce081]/15 text-[#4ce081]`
        : `${base} border-red-400/40 bg-red-400/10 text-red-400`;
}
