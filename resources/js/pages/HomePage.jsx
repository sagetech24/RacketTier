import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPublicStats } from '../api/publicStats.js';
import { useAuth } from '../context/AuthContext.jsx';

function formatStatCount(n) {
    if (n == null) return '—';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M+`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}k+`;
    return n.toLocaleString();
}

const SPORTS = [
    { name: 'Badminton', img: '/images/badminton.png' },
    { name: 'Pickleball', img: '/images/pickleball.png' },
    { name: 'Tennis', img: '/images/tennis.png' },
    { name: 'Table Tennis', img: '/images/table-tennis.png' },
];

const FEATURES = [
    {
        icon: 'M5 13l4 4L19 7',
        title: 'Smart Queueing',
        description:
            'Run member-organized sessions with a Queue Master, FIFO rotation, and automatic or manual match generation.',
    },
    {
        icon: 'M13 10V3L4 14h7v7l9-11h-7z',
        title: 'Live Ranking',
        description:
            'Every match updates your skill rating across sports. Watch your progression with a transparent rating history.',
    },
    {
        icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        title: 'Session Points & Tiers',
        description:
            'Earn points per win and loss, fill your wallet per sport, and climb tier brackets — from Starter to Legend.',
    },
    {
        icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a3 3 0 11-6 0 3 3 0 016 0z',
        title: 'Members & Guests',
        description:
            'Add registered members or quick-add guests to a session. Only members earn ranking and points — fair and frictionless.',
    },
];

const STEPS = [
    {
        step: '01',
        title: 'Create a Session',
        description: 'Pick a sport, choose singles or doubles, and set your win/loss point rewards.',
    },
    {
        step: '02',
        title: 'Build the Queue',
        description: 'Invite members or drop in guests. The queue auto-orders by FIFO so everyone gets fair court time.',
    },
    {
        step: '03',
        title: 'Play & Record',
        description: 'Auto-generate matches from the top of the queue, then submit results with optional scores.',
    },
    {
        step: '04',
        title: 'Climb the Ranks',
        description: 'ELO updates, session points credit to your wallet, and your tier label evolves match by match.',
    },
];

export function HomePage() {
    const { user, refreshUser } = useAuth();
    const [checkedSession, setCheckedSession] = useState(!!user);
    const [totalMembers, setTotalMembers] = useState(/** @type {number | null} */ (null));
    const [totalQueueingSessions, setTotalQueueingSessions] = useState(/** @type {number | null} */ (null));
    const [totalPointsAwarded, setTotalPointsAwarded] = useState(/** @type {number | null} */ (null));

    useEffect(() => {
        if (user) {
            setCheckedSession(true);
            return;
        }

        let cancelled = false;
        (async () => {
            await refreshUser();
            if (!cancelled) {
                setCheckedSession(true);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user, refreshUser]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const stats = await fetchPublicStats();
                if (!cancelled) {
                    setTotalMembers(stats.total_members ?? 0);
                    setTotalQueueingSessions(stats.total_queueing_sessions ?? 0);
                    setTotalPointsAwarded(stats.total_points_awarded ?? 0);
                }
            } catch {
                // Silently ignore — landing page will fall back to a dash.
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#121216] text-[#e4e1e6]">
            {/* Background gradients */}
            <div className="pointer-events-none absolute -left-32 top-[-10%] h-[28rem] w-[28rem] rounded-full bg-[#c2c1ff]/10 blur-[140px]" />
            <div className="pointer-events-none absolute -right-32 top-[20%] h-[32rem] w-[32rem] rounded-full bg-[#4ce081]/8 blur-[160px]" />
            <div className="pointer-events-none absolute left-1/2 top-[55%] h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-[#7877c6]/8 blur-[140px]" />

            {/* Nav */}
            <header className="relative z-10">
                <nav className="mx-auto mt-8 flex w-full max-w-6xl items-center justify-between px-6 py-6">
                    <Link to="/" className="flex items-center gap-2.5">
                        <img src="/images/rt-logo.png" alt="" className="h-6 w-6" />
                        <span className="text-xl font-extrabold tracking-tighter text-[#c2c1ff]">
                            Racket<span className="ml-[0.1rem] italic">Tier</span>
                        </span>
                    </Link>
                    <div className="flex items-center gap-2 tab:gap-3">
                        {checkedSession && user ? (
                            <Link
                                to="/dashboard"
                                className="rounded-full bg-[#c2c1ff] px-4 py-2 text-sm font-bold text-[#211e6a] transition-all hover:opacity-90 tab:px-5 tab:py-2.5"
                            >
                                Go to Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="rounded-full px-3 py-1.5 bg-[#c2c1ff] border border-[#c2c1ff]/30 text-sm font-semibold text-[#363636] transition-colors hover:text-[#646369] tab:px-5"
                                >
                                    Sign in
                                </Link>
                            </>
                        )}
                    </div>
                </nav>
            </header>

            {/* Hero */}
            <section className="relative z-10">
                <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 pb-16 pt-10 text-center tab:pb-24 tab:pt-20">
                    {/* <span className="inline-flex items-center gap-2 rounded-full border border-[#c2c1ff]/20 bg-[#1b1b1e]/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c2c1ff]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#4ce081]" />
                        Racket sports & ranked
                    </span> */}

                    <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tighter text-[#e4e1e6] tab:text-6xl">
                        Every smash counts.{' '}
                        <span className="bg-gradient-to-r from-[#c2c1ff] via-[#a5a3ff] to-[#4ce081] bg-clip-text text-transparent">
                            Track it, rank it, own it.
                        </span>
                    </h1>

                    <p className="mt-6 max-w-2xl text-base leading-relaxed text-[#c8c5d2] tab:text-lg">
                        RacketTier is the live ranking, queueing, and match-tracking platform for badminton, pickleball,
                        tennis, and table tennis communities. Start queueing sessions like a pro, play matches, earn points, and climb to the tier rank ladder.
                    </p>

                    <div className="mt-8 flex flex-col items-stretch gap-3 tab:flex-row tab:items-center">
                        {checkedSession && user ? (
                            <Link
                                to="/dashboard"
                                className="rounded-2xl bg-[#c2c1ff] px-7 py-3.5 text-center text-base font-bold text-[#211e6a] shadow-[0_20px_40px_-10px_rgba(194,193,255,0.35)] transition-all hover:opacity-90 active:scale-[0.98]"
                            >
                                Open your dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    to="/register"
                                    className="rounded-2xl bg-[#c2c1ff] px-7 py-3.5 text-center text-base font-bold text-[#211e6a] shadow-[0_20px_40px_-10px_rgba(194,193,255,0.35)] transition-all hover:opacity-90 active:scale-[0.98]"
                                >
                                    Create your account
                                </Link>
                                <Link
                                    to="/login"
                                    className="rounded-2xl border border-[#c2c1ff]/25 bg-[#1b1b1e]/70 px-7 py-3.5 text-center text-base font-semibold text-[#e4e1e6] transition-all hover:border-[#c2c1ff]/50 hover:bg-[#1b1b1e]"
                                >
                                    Sign in
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Trust strip */}
                    <dl className="mt-14 grid w-full max-w-3xl grid-cols-3 gap-4 rounded-2xl border border-white/5 bg-[#1b1b1e]/60 p-5 backdrop-blur tab:p-7">
                        <div className="text-center">
                            <dt className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#c8c5d2]/70">
                                Members
                            </dt>
                            <dd className="mt-1 text-2xl font-extrabold text-[#c2c1ff] tab:text-3xl">
                                {formatStatCount(totalMembers)}
                            </dd>
                        </div>
                        <div className="border-x border-white/5 text-center">
                            <dt className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#c8c5d2]/70">
                                Total Queue
                            </dt>
                            <dd className="mt-1 text-2xl font-extrabold text-[#4ce081] tab:text-3xl">
                                {formatStatCount(totalQueueingSessions)}
                            </dd>
                        </div>
                        <div className="text-center">
                            <dt className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#c8c5d2]/70">
                                Points
                            </dt>
                            <dd className="mt-1 text-2xl font-extrabold text-[#e4e1e6] tab:text-3xl">
                                {formatStatCount(totalPointsAwarded)}
                            </dd>
                        </div>
                    </dl>
                </div>
            </section>

            {/* Sports row */}
            {/* <section className="relative z-10">
                <div className="mx-auto w-full max-w-6xl px-6 pb-14 tab:pb-20">
                    <div className="text-center">
                        <h2 className="text-2xl font-extrabold tracking-tight text-[#e4e1e6] tab:text-3xl">
                            Built for racket sports
                        </h2>
                        <p className="mt-3 text-sm text-[#c8c5d2] tab:text-base">
                            One platform. Four sports. Independent ratings, wallets, and tiers for each.
                        </p>
                    </div>

                    <div className="mt-8 grid grid-cols-2 gap-3 tab:mt-12 tab:grid-cols-4 tab:gap-5">
                        {SPORTS.map((sport) => (
                            <div
                                key={sport.name}
                                className="group flex flex-col items-center gap-3 rounded-2xl border border-white/5 bg-[#1b1b1e]/70 p-5 transition-all hover:border-[#c2c1ff]/30 hover:bg-[#1b1b1e]"
                            >
                                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#121216]/80 transition-transform group-hover:scale-105 tab:h-24 tab:w-24">
                                    <img src={sport.img} alt="" className="h-14 w-14 object-contain tab:h-16 tab:w-16" />
                                </div>
                                <p className="text-sm font-semibold text-[#e4e1e6] tab:text-base">{sport.name}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section> */}

            {/* Features */}
            <section className="relative z-10 border-t border-white/5 bg-[#0f0f12]/40">
                <div className="mx-auto w-full max-w-6xl px-6 py-16 tab:py-24">
                    <div className="mx-auto max-w-2xl text-center">
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#4ce081]">
                            What you get
                        </span>
                        <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-[#e4e1e6] tab:text-4xl">
                            Everything a thriving club needs
                        </h2>
                        <p className="mt-3 text-sm text-[#c8c5d2] tab:text-base">
                            From the first serve to the season-end leaderboard, RacketTier keeps your community fair,
                            fast, and engaged.
                        </p>
                    </div>

                    <div className="mt-10 grid grid-cols-1 gap-4 tab:mt-14 tab:grid-cols-2 tab:gap-6">
                        {FEATURES.map((feature) => (
                            <div
                                key={feature.title}
                                className="rounded-2xl border border-white/5 bg-[#1b1b1e]/70 p-6 transition-all hover:border-[#c2c1ff]/25 tab:p-7"
                            >
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#c2c1ff]/10 text-[#c2c1ff]">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="h-5 w-5"
                                    >
                                        <path d={feature.icon} />
                                    </svg>
                                </div>
                                <h3 className="mt-4 text-lg font-bold text-[#e4e1e6]">{feature.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-[#c8c5d2]">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="relative z-10">
                <div className="mx-auto w-full max-w-6xl px-6 py-16 tab:py-24">
                    <div className="mx-auto max-w-2xl text-center">
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#c2c1ff]">
                            How it works
                        </span>
                        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#e4e1e6] tab:text-4xl">
                            From queue to ranking in four steps
                        </h2>
                    </div>

                    <ol className="mt-10 grid grid-cols-1 gap-4 tab:mt-14 tab:grid-cols-2 tab:gap-6">
                        {STEPS.map((item) => (
                            <li
                                key={item.step}
                                className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#1b1b1e]/70 p-6 tab:p-7"
                            >
                                <span className="absolute right-5 top-4 text-5xl font-extrabold tracking-tighter text-[#c2c1ff]/10 tab:text-6xl">
                                    {item.step}
                                </span>
                                <span className="inline-flex items-center rounded-full bg-[#4ce081]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#4ce081]">
                                    Step {item.step}
                                </span>
                                <h3 className="mt-4 text-lg font-bold text-[#e4e1e6]">{item.title}</h3>
                                <p className="mt-2 max-w-md text-sm leading-relaxed text-[#c8c5d2]">
                                    {item.description}
                                </p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* Final CTA */}
            <section className="relative z-10">
                <div className="mx-auto w-full max-w-5xl px-6 pb-20 tab:pb-28">
                    <div className="overflow-hidden rounded-3xl border border-[#c2c1ff]/20 bg-gradient-to-br from-[#1b1b1e] via-[#1b1b1e] to-[#211e6a]/50 p-8 text-center tab:p-14">
                        <h2 className="text-3xl font-extrabold tracking-tight text-[#e4e1e6] tab:text-4xl">
                            Ready to start your tier journey?
                        </h2>
                        <p className="mx-auto mt-4 max-w-xl text-sm text-[#c8c5d2] tab:text-base">
                            Join RacketTier and turn every casual rally into ranked, recordable progress.
                        </p>
                        <div className="mt-7 flex flex-col items-stretch justify-center gap-3 tab:flex-row tab:items-center">
                            {checkedSession && user ? (
                                <Link
                                    to="/queueing-session"
                                    className="rounded-2xl bg-[#c2c1ff] px-7 py-3.5 text-center text-base font-bold text-[#211e6a] shadow-[0_20px_40px_-10px_rgba(194,193,255,0.35)] transition-all hover:opacity-90 active:scale-[0.98]"
                                >
                                    Start a queueing session
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        to="/register"
                                        className="rounded-2xl bg-[#c2c1ff] px-7 py-3.5 text-center text-base font-bold text-[#211e6a] shadow-[0_20px_40px_-10px_rgba(194,193,255,0.35)] transition-all hover:opacity-90 active:scale-[0.98]"
                                    >
                                        Create your account
                                    </Link>
                                    <Link
                                        to="/login"
                                        className="rounded-2xl border border-[#c2c1ff]/25 bg-[#1b1b1e]/70 px-7 py-3.5 text-center text-base font-semibold text-[#e4e1e6] transition-all hover:border-[#c2c1ff]/50"
                                    >
                                        I already have an account
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/5">
                <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 tab:flex-row">
                    <div className="flex items-center gap-2.5">
                        <img src="/images/rt-logo.png" alt="" className="h-6 w-6 opacity-80" />
                        <span className="text-sm font-bold tracking-tight text-[#c8c5d2]">
                            Racket<span className="italic">Tier</span>
                        </span>
                    </div>
                    <p className="text-[10px] text-center uppercase tracking-[0.05em] text-[#918f9c]">
                        © {new Date().getFullYear()} RacketTier | The kinetic world of racket sports
                    </p>
                </div>
            </footer>
        </div>
    );
}
