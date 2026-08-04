import { useRef, useState } from 'react';

/**
 * Landing score tap demo — preserved for future reference / reuse.
 * Not mounted on the live landing hero (see AutoMatchQueueDemo).
 *
 * @param {{ accent: string }} props
 */
export function MatchScoreSimulator({ accent }) {
    const [scoreA, setScoreA] = useState(11);
    const [scoreB, setScoreB] = useState(9);
    const [serving, setServing] = useState('A');
    const [status, setStatus] = useState('Rally ready');
    const [bump, setBump] = useState(/** @type {null | 'A' | 'B'} */ (null));
    const [rallyKey, setRallyKey] = useState(0);
    const busy = useRef(false);

    const playPoint = (side) => {
        if (busy.current) return;
        busy.current = true;
        setStatus(side === 'A' ? 'Team A scores!' : 'Team B scores!');
        setRallyKey((k) => k + 1);
        setBump(side);
        if (side === 'A') setScoreA((s) => s + 1);
        else setScoreB((s) => s + 1);
        setServing(side);
        window.setTimeout(() => {
            setBump(null);
            setStatus('Waiting for next rally…');
            busy.current = false;
        }, 480);
    };

    const reset = () => {
        setScoreA(0);
        setScoreB(0);
        setServing('A');
        setStatus('New game — tap a side to score');
        setBump(null);
        setRallyKey((k) => k + 1);
    };

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
                    <p className="rt-display mt-1 text-lg font-bold tracking-tight text-[#e4e1e6]">Match simulator</p>
                </div>
                <button
                    type="button"
                    onClick={reset}
                    className="min-h-10 cursor-pointer touch-manipulation rounded-xl border border-white/10 bg-[#121216]/80 px-3 text-xs font-semibold text-[#c8c5d2] transition-colors duration-200 hover:border-[#c2c1ff]/40 hover:text-[#e4e1e6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/50"
                >
                    Reset
                </button>
            </div>

            <p key={rallyKey} className="rt-landing-v3-rally mt-4 text-sm text-[#c8c5d2]">
                {status}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                    { side: /** @type {'A'} */ ('A'), label: 'Team A', score: scoreA, names: 'You + Partner' },
                    { side: /** @type {'B'} */ ('B'), label: 'Team B', score: scoreB, names: 'Opponents' },
                ].map((team) => (
                    <button
                        key={team.side}
                        type="button"
                        onClick={() => playPoint(team.side)}
                        className={`group cursor-pointer touch-manipulation rounded-2xl border p-4 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/50 active:scale-[0.98] ${
                            serving === team.side
                                ? 'border-[color:var(--rt-sport)] bg-[color-mix(in_srgb,var(--rt-sport)_12%,transparent)]'
                                : 'border-white/8 bg-[#121216]/70 hover:border-white/15'
                        }`}
                        style={
                            serving === team.side
                                ? { borderColor: accent, background: `color-mix(in srgb, ${accent} 12%, transparent)` }
                                : undefined
                        }
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#918f9c]">{team.label}</span>
                            {serving === team.side && (
                                <span
                                    className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                                    style={{
                                        color: accent,
                                        background: `color-mix(in srgb, ${accent} 15%, transparent)`,
                                    }}
                                >
                                    Serving
                                </span>
                            )}
                        </div>
                        <p
                            className={`rt-display rt-landing-v3-digit mt-2 text-5xl font-extrabold tracking-tighter text-[#e4e1e6] ${
                                bump === team.side ? 'is-bump' : ''
                            }`}
                        >
                            {team.score}
                        </p>
                        <p className="mt-1 text-xs text-[#918f9c]">{team.names}</p>
                        <p className="mt-3 text-[11px] font-semibold" style={{ color: accent }}>
                            Tap to score →
                        </p>
                    </button>
                ))}
            </div>

            <p className="mt-4 text-center text-[11px] text-[#918f9c]">
                Feel the live scoreboard energy — same vibe as recording a real match.
            </p>
        </div>
    );
}
