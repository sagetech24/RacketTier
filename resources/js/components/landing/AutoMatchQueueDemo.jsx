/**
 * Landing hero demo: interactive auto-match from a waiting queue (doubles).
 * Tap “Auto-match” to scan top-of-queue players into Team 1 / Team 2.
 *
 * @param {{ accent: string }} props
 */
import { useEffect, useRef, useState } from 'react';

const INITIAL_QUEUE = [
    { id: 'p1', name: 'Sam L.', elo: 1180, initial: 'S' },
    { id: 'p2', name: 'Riley C.', elo: 1245, initial: 'R' },
    { id: 'p3', name: 'Casey N.', elo: 1098, initial: 'C' },
    { id: 'p4', name: 'Jordan R.', elo: 1312, initial: 'J' },
    { id: 'p5', name: 'Maya K.', elo: 1270, initial: 'M' },
    { id: 'p6', name: 'Alex P.', elo: 1156, initial: 'A' },
    { id: 'p7', name: 'Taylor B.', elo: 1210, initial: 'T' },
    { id: 'p8', name: 'Drew H.', elo: 1134, initial: 'D' },
];

/**
 * @typedef {'idle' | 'scanning' | 'assigning' | 'matched'} DemoPhase
 */

function prefersReducedMotion() {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function Icon({ name, className = '' }) {
    return (
        <span className={`material-symbols-outlined ${className}`} aria-hidden>
            {name}
        </span>
    );
}

/**
 * @param {{
 *   player: (typeof INITIAL_QUEUE)[number] | null;
 *   label: string;
 *   accent: string;
 *   slotIndex: number;
 *   filled: boolean;
 * }} props
 */
function TeamSlot({ player, label, accent, slotIndex, filled }) {
    return (
        <div
            className={`rt-landing-v3-match-slot flex min-h-[3.25rem] items-center gap-2.5 rounded-xl border px-3 py-2 ${
                filled ? 'rt-landing-v3-match-slot-in border-white/10 bg-[#121216]/90' : 'border-dashed border-white/10 bg-transparent'
            }`}
            style={filled ? { borderColor: `color-mix(in srgb, ${accent} 45%, transparent)` } : undefined}
        >
            {player ? (
                <>
                    <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                        style={{
                            background: `color-mix(in srgb, ${accent} 18%, transparent)`,
                            color: accent,
                        }}
                    >
                        {player.initial}
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#e4e1e6]">{player.name}</p>
                        <p className="text-[10px] text-[#918f9c]">{player.elo} ELO</p>
                    </div>
                </>
            ) : (
                <p className="text-xs text-[#918f9c]">
                    {label} · slot {slotIndex}
                </p>
            )}
        </div>
    );
}

export function AutoMatchQueueDemo({ accent }) {
    const [queue, setQueue] = useState(() => [...INITIAL_QUEUE]);
    const [phase, setPhase] = useState(/** @type {DemoPhase} */ ('idle'));
    const [scanIndex, setScanIndex] = useState(-1);
    const [pickedIds, setPickedIds] = useState(/** @type {string[]} */ ([]));
    /** @type {[(typeof INITIAL_QUEUE)[number] | null, (typeof INITIAL_QUEUE)[number] | null]} */
    const emptyTeam = [null, null];
    const [team1, setTeam1] = useState(emptyTeam);
    const [team2, setTeam2] = useState(emptyTeam);
    const [status, setStatus] = useState('Top of queue ready — tap Auto-match');
    const [statusKey, setStatusKey] = useState(0);
    const timers = useRef(/** @type {number[]} */ ([]));
    const busy = useRef(false);

    const clearTimers = () => {
        timers.current.forEach((id) => window.clearTimeout(id));
        timers.current = [];
    };

    useEffect(() => () => clearTimers(), []);

    const setStatusMsg = (msg) => {
        setStatus(msg);
        setStatusKey((k) => k + 1);
    };

    const reset = () => {
        clearTimers();
        busy.current = false;
        setQueue([...INITIAL_QUEUE]);
        setPhase('idle');
        setScanIndex(-1);
        setPickedIds([]);
        setTeam1([null, null]);
        setTeam2([null, null]);
        setStatusMsg('Top of queue ready — tap Auto-match');
    };

    const runAutoMatch = () => {
        if (busy.current) return;
        if (queue.length < 4) {
            setStatusMsg('Need 4 waiting players — reset the demo');
            return;
        }

        busy.current = true;
        clearTimers();
        setTeam1([null, null]);
        setTeam2([null, null]);
        setPickedIds([]);
        setScanIndex(-1);
        setPhase('scanning');
        setStatusMsg('Scanning top of queue…');

        const selected = queue.slice(0, 4);
        const reduced = prefersReducedMotion();

        if (reduced) {
            setPickedIds(selected.map((p) => p.id));
            setTeam1([selected[0], selected[1]]);
            setTeam2([selected[2], selected[3]]);
            setQueue((q) => q.slice(4));
            setPhase('matched');
            setStatusMsg('Match queued — Team 1 vs Team 2');
            busy.current = false;
            return;
        }

        // Scan highlight top 4, one-by-one
        selected.forEach((_, i) => {
            const id = window.setTimeout(() => {
                setScanIndex(i);
                setPickedIds((ids) => [...ids, selected[i].id]);
                setStatusMsg(`Selecting #${i + 1} · ${selected[i].name}`);
            }, 280 + i * 320);
            timers.current.push(id);
        });

        // Assign into teams
        const assignAt = 280 + 4 * 320 + 120;
        timers.current.push(
            window.setTimeout(() => {
                setPhase('assigning');
                setScanIndex(-1);
                setStatusMsg('Building doubles match…');
            }, assignAt),
        );

        timers.current.push(
            window.setTimeout(() => {
                setTeam1([selected[0], selected[1]]);
            }, assignAt + 180),
        );

        timers.current.push(
            window.setTimeout(() => {
                setTeam2([selected[2], selected[3]]);
            }, assignAt + 420),
        );

        timers.current.push(
            window.setTimeout(() => {
                setQueue((q) => q.slice(4));
                setPickedIds([]);
                setPhase('matched');
                setStatusMsg('Match queued — next four wait in line');
                busy.current = false;
            }, assignAt + 720),
        );
    };

    const canMatch = queue.length >= 4 && phase !== 'scanning' && phase !== 'assigning';
    const team1Filled = team1[0] != null;
    const team2Filled = team2[0] != null;

    return (
        <div className="rt-landing-v3-scoreboard relative overflow-hidden rounded-[1.75rem] p-5 tab:p-6">
            <div
                className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-40 blur-3xl"
                style={{ background: accent }}
            />

            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#4ce081]">
                        <span className="rt-landing-v3-pulse-dot h-1.5 w-1.5 rounded-full bg-[#4ce081]" />
                        Interactive demo
                    </p>
                    <p className="rt-display mt-1 text-lg font-bold tracking-tight text-[#e4e1e6]">Auto-match queue</p>
                </div>
                <button
                    type="button"
                    onClick={reset}
                    className="min-h-10 cursor-pointer touch-manipulation rounded-xl border border-white/10 bg-[#121216]/80 px-3 text-xs font-semibold text-[#c8c5d2] transition-colors duration-200 hover:border-[#c2c1ff]/40 hover:text-[#e4e1e6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/50"
                >
                    Reset
                </button>
            </div>

            <p key={statusKey} className="rt-landing-v3-rally mt-3 text-sm text-[#c8c5d2]" aria-live="polite">
                {status}
            </p>

            {/* Match slots */}
            <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/5 bg-[#121216]/50 p-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#918f9c]">Team 1</p>
                    <div className="space-y-2">
                        <TeamSlot player={team1[0]} label="Team 1" accent={accent} slotIndex={1} filled={team1Filled} />
                        <TeamSlot player={team1[1]} label="Team 1" accent={accent} slotIndex={2} filled={Boolean(team1[1])} />
                    </div>
                </div>
                <div className="rounded-2xl border border-white/5 bg-[#121216]/50 p-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#918f9c]">Team 2</p>
                    <div className="space-y-2">
                        <TeamSlot player={team2[0]} label="Team 2" accent={accent} slotIndex={1} filled={team2Filled} />
                        <TeamSlot player={team2[1]} label="Team 2" accent={accent} slotIndex={2} filled={Boolean(team2[1])} />
                    </div>
                </div>
            </div>

            {phase === 'matched' && team1[0] && team2[0] && (
                <div
                    className="rt-landing-v3-match-ready mt-3 flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.14em]"
                    style={{
                        color: accent,
                        borderColor: `color-mix(in srgb, ${accent} 35%, transparent)`,
                        background: `color-mix(in srgb, ${accent} 10%, transparent)`,
                    }}
                >
                    <Icon name="bolt" className="text-sm" />
                    Doubles match ready
                </div>
            )}

            {/* Waiting queue */}
            <div className="mt-4 border-t border-white/5 pt-4">
                <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#918f9c]">Waiting queue</p>
                    <p className="text-[10px] font-semibold text-[#918f9c]">{queue.length} waiting</p>
                </div>
                <ul className="max-h-[11.5rem] space-y-1.5 overflow-hidden" aria-label="Players waiting in queue">
                    {queue.length === 0 ? (
                        <li className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-[#918f9c]">
                            Queue empty — reset to refill
                        </li>
                    ) : (
                        queue.map((player, i) => {
                            const isScanning = phase === 'scanning' && scanIndex === i;
                            const isPicked = pickedIds.includes(player.id);
                            const isTopFour = i < 4 && (phase === 'scanning' || phase === 'assigning');
                            return (
                                <li
                                    key={player.id}
                                    className={`rt-landing-v3-queue-row flex items-center justify-between rounded-xl border px-3 py-2 transition-[border-color,background-color,transform,opacity] duration-300 ${
                                        isScanning ? 'rt-landing-v3-queue-scan' : ''
                                    } ${isPicked ? 'rt-landing-v3-queue-picked' : ''} ${
                                        isTopFour && !isPicked ? 'border-white/10 bg-[#1b1b1e]/80' : 'border-white/5 bg-[#121216]/70'
                                    }`}
                                    style={
                                        isScanning || isPicked
                                            ? {
                                                  borderColor: `color-mix(in srgb, ${accent} 55%, transparent)`,
                                                  background: `color-mix(in srgb, ${accent} 14%, transparent)`,
                                                  boxShadow: isScanning ? `0 0 20px -6px ${accent}` : undefined,
                                              }
                                            : undefined
                                    }
                                >
                                    <div className="flex min-w-0 items-center gap-2.5">
                                        <span
                                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                                                i < 4 ? 'text-[#211e6a]' : 'text-[#c8c5d2]'
                                            }`}
                                            style={{
                                                background: i < 4 ? accent : 'rgba(255,255,255,0.06)',
                                            }}
                                        >
                                            {i + 1}
                                        </span>
                                        <span className="truncate text-sm font-medium text-[#e4e1e6]">{player.name}</span>
                                    </div>
                                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-[#918f9c]">
                                        {isPicked ? 'Picked' : i < 4 ? 'Next' : 'Waiting'}
                                    </span>
                                </li>
                            );
                        })
                    )}
                </ul>
            </div>

            <button
                type="button"
                onClick={runAutoMatch}
                disabled={!canMatch}
                className="mt-4 flex min-h-12 w-full cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-2xl text-sm font-bold transition-opacity duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/60 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
                style={{
                    background: accent,
                    color: accent === '#4ce081' ? '#003919' : '#211e6a',
                    boxShadow: `0 16px 32px -12px color-mix(in srgb, ${accent} 45%, transparent)`,
                }}
            >
                <Icon name="auto_awesome" className="text-base" />
                {phase === 'scanning' || phase === 'assigning'
                    ? 'Matching…'
                    : queue.length < 4
                      ? 'Need 4 players'
                      : 'Tap to auto-match'}
            </button>

            <p className="mt-3 text-center text-[11px] text-[#918f9c]">
                Pulls the top 4 from the FIFO queue into a doubles match — just like Queue Master auto-match.
            </p>
        </div>
    );
}
