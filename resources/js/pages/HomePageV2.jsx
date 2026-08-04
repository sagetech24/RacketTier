import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPublicStats } from '../api/publicStats.js';
import { useAuth } from '../context/AuthContext.jsx';
import '../../css/landing-v2.css';

function formatStatCount(n) {
    if (n == null) return '—';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M+`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}k+`;
    return n.toLocaleString();
}

const SPORTS = [
    { name: 'Badminton', icon: 'sports_tennis' },
    { name: 'Pickleball', icon: 'sports' },
    { name: 'Tennis', icon: 'sports_tennis' },
    { name: 'Table Tennis', icon: 'sports' },
];

const FEATURES = [
    {
        icon: 'queue',
        title: 'Smart Queueing',
        description:
            'Queue Masters run fair FIFO sessions — auto-generate matches or build them by hand. Everyone gets court time.',
        span: 'lg',
    },
    {
        icon: 'bolt',
        title: 'Auto-Matchmaking',
        description: 'Balance by skill, FIFO, win/loss, or mixed teams. Singles or doubles.',
        span: 'sm',
    },
    {
        icon: 'trending_up',
        title: 'Live ELO Ranking',
        description: 'Per-sport ratings from a 1000 base, with transparent history and a live podium.',
        span: 'sm',
    },
    {
        icon: 'military_tech',
        title: 'Session Points & Tiers',
        description: 'Win and loss points fill a per-sport wallet. Climb Starter → Sensie across five brackets.',
        span: 'md',
    },
    {
        icon: 'groups',
        title: 'Members & Guests',
        description: 'Drop guests in without accounts. Only members earn ranking and wallet points.',
        span: 'md',
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

const TIERS = [
    { name: 'Starter', range: '0–499', width: '18%' },
    { name: 'Beginner', range: '500–1.4k', width: '32%' },
    { name: 'Intermediate', range: '1.5k–4.9k', width: '48%' },
    { name: 'Sempai', range: '5k–14.9k', width: '68%' },
    { name: 'Sensie', range: '15k+', width: '92%' },
];

const PODIUM = [
    { place: 2, name: 'Maya K.', rating: 1284, height: 'h-24', delay: 'rt-landing-v2-podium-2' },
    { place: 1, name: 'Jordan R.', rating: 1412, height: 'h-32', delay: 'rt-landing-v2-podium-1' },
    { place: 3, name: 'Alex P.', rating: 1198, height: 'h-20', delay: 'rt-landing-v2-podium-3' },
];

const PLAY_MODES = [
    {
        eyebrow: 'Facility session',
        title: 'One match. Done.',
        description:
            'Venue-hosted play: score the match, apply rankings and points, then the session wraps automatically.',
        icon: 'stadium',
    },
    {
        eyebrow: 'Queueing session',
        title: 'Many matches. One ladder.',
        description:
            'Member-run multi-match nights with live leaderboard, fair rotation, and a summary report when you end.',
        icon: 'sports_score',
    },
];

function Icon({ name, className = '' }) {
    return (
        <span className={`material-symbols-outlined ${className}`} aria-hidden>
            {name}
        </span>
    );
}

function useReveal() {
    const ref = useRef(/** @type {HTMLElement | null} */ (null));

    useEffect(() => {
        const el = ref.current;
        if (!el) return undefined;

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            el.classList.add('is-in');
            return undefined;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry?.isIntersecting) {
                    el.classList.add('is-in');
                    observer.disconnect();
                }
            },
            { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return ref;
}

function Reveal({ children, className = '' }) {
    const ref = useReveal();
    return (
        <div ref={ref} className={`rt-landing-v2-reveal ${className}`}>
            {children}
        </div>
    );
}

function HeroStage() {
    return (
        <div
            className="rt-landing-v2-stage relative overflow-hidden rounded-[1.75rem] p-4 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] tab:p-6"
            aria-hidden
        >
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4ce081]">Live session</p>
                    <p className="rt-display mt-0.5 text-base font-bold tracking-tight text-[#e4e1e6] tab:text-lg">
                        Badminton · Doubles
                    </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4ce081]/25 bg-[#4ce081]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#4ce081]">
                    <span className="rt-landing-v2-pulse h-1.5 w-1.5 rounded-full bg-[#4ce081]" />
                    Ongoing
                </span>
            </div>

            <div className="mt-4 flex items-end justify-center gap-2.5 px-1">
                {PODIUM.map((p) => (
                    <div key={p.place} className={`flex w-full max-w-[6rem] flex-col items-center ${p.delay}`}>
                        <div
                            className={`mb-1.5 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-extrabold ${
                                p.place === 1
                                    ? 'bg-[#c2c1ff] text-[#211e6a]'
                                    : 'border border-white/10 bg-[#2a2a2d] text-[#c8c5d2]'
                            }`}
                        >
                            {p.place}
                        </div>
                        <p className="truncate text-center text-[11px] font-semibold text-[#e4e1e6]">{p.name}</p>
                        <p className="text-[10px] text-[#918f9c]">{p.rating}</p>
                        <div
                            className={`mt-1.5 w-full rounded-t-xl border border-white/5 ${
                                p.place === 1 ? 'h-24' : p.place === 2 ? 'h-16' : 'h-12'
                            } ${
                                p.place === 1
                                    ? 'bg-gradient-to-t from-[#211e6a]/80 to-[#c2c1ff]/35'
                                    : p.place === 2
                                      ? 'bg-[#1f1f22]'
                                      : 'bg-[#1b1b1e]'
                            }`}
                        />
                    </div>
                ))}
            </div>

            <div className="mt-4 space-y-1.5 border-t border-white/5 pt-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#918f9c]">Next in queue</p>
                {['Sam L.', 'Riley C.', 'Casey N.'].map((name, i) => (
                    <div
                        key={name}
                        className="flex items-center justify-between rounded-xl border border-white/5 bg-[#121216]/70 px-3 py-2"
                    >
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#c2c1ff]/15 text-[10px] font-bold text-[#c2c1ff]">
                                {i + 1}
                            </span>
                            <span className="text-sm font-medium text-[#e4e1e6]">{name}</span>
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#918f9c]">Waiting</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Marketing landing v2 — preview at `/v2`. Keeps DESIGN.md tokens; asymmetric arena layout.
 */
export function HomePageV2() {
    const { user, refreshUser } = useAuth();
    const [checkedSession, setCheckedSession] = useState(!!user);
    const [navScrolled, setNavScrolled] = useState(false);
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
            if (!cancelled) setCheckedSession(true);
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
                // Landing falls back to dash.
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const onScroll = () => setNavScrolled(window.scrollY > 24);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const primaryCta = checkedSession && user
        ? { to: '/dashboard', label: 'Open your dashboard' }
        : { to: '/register', label: 'Create your account' };

    const secondaryCta = checkedSession && user
        ? { to: '/queueing-session', label: 'Start a queueing session' }
        : { to: '/login', label: 'Sign in' };

    return (
        <div className="rt-landing-v2 relative min-h-screen overflow-x-clip bg-[#121216] text-[#e4e1e6]">
            <div className="rt-landing-v2-glow -left-40 top-[-8%] h-[30rem] w-[30rem] bg-[#c2c1ff]/12" />
            <div className="rt-landing-v2-glow -right-32 top-[12%] h-[34rem] w-[34rem] bg-[#4ce081]/[0.09]" />
            <div className="rt-landing-v2-glow left-[40%] top-[48%] h-[22rem] w-[22rem] -translate-x-1/2 bg-[#7877c6]/10" />

            <a
                href="#main"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-[#c2c1ff] focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-[#211e6a]"
            >
                Skip to content
            </a>

            <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 tab:px-6">
                <nav
                    className={`rt-landing-v2-nav mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-2xl border border-transparent px-4 py-3 tab:px-5 ${
                        navScrolled ? 'is-scrolled' : ''
                    }`}
                    aria-label="Primary"
                >
                    <Link to="/v2" className="flex min-h-11 items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121216]">
                        <img src="/images/rt-logo.png" alt="" className="h-7 w-7" />
                        <span className="rt-display text-xl font-extrabold tracking-tighter text-[#c2c1ff]">
                            Racket<span className="ml-[0.1rem] italic">Tier</span>
                        </span>
                    </Link>

                    <div className="hidden items-center gap-6 md:flex">
                        <a href="#features" className="text-sm font-medium text-[#c8c5d2] transition-colors duration-200 hover:text-[#e4e1e6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/50">
                            Features
                        </a>
                        <a href="#how-it-works" className="text-sm font-medium text-[#c8c5d2] transition-colors duration-200 hover:text-[#e4e1e6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/50">
                            How it works
                        </a>
                        <a href="#tiers" className="text-sm font-medium text-[#c8c5d2] transition-colors duration-200 hover:text-[#e4e1e6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/50">
                            Tiers
                        </a>
                    </div>

                    <div className="flex items-center gap-2">
                        {checkedSession && user ? (
                            <Link
                                to="/dashboard"
                                className="inline-flex min-h-11 touch-manipulation items-center rounded-xl bg-[#c2c1ff] px-4 text-sm font-bold text-[#211e6a] transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/60 active:scale-[0.98]"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="hidden min-h-11 touch-manipulation items-center px-3 text-sm font-semibold text-[#c8c5d2] transition-colors duration-200 hover:text-[#e4e1e6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/50 sm:inline-flex"
                                >
                                    Sign in
                                </Link>
                                <Link
                                    to="/register"
                                    className="inline-flex min-h-11 touch-manipulation items-center rounded-xl bg-[#c2c1ff] px-4 text-sm font-bold text-[#211e6a] shadow-[0_16px_32px_-12px_rgba(194,193,255,0.4)] transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/60 active:scale-[0.98]"
                                >
                                    Get started
                                </Link>
                            </>
                        )}
                    </div>
                </nav>
            </header>

            <main id="main">
                {/* Hero — brand-first, asymmetric */}
                <section className="relative z-10 pt-24 tab:pt-28">
                    <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 pb-12 tab:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] tab:items-center tab:gap-12 tab:pb-16 lg:gap-14">
                        <div>
                            <p className="rt-display text-[clamp(2.25rem,6.5vw,4.25rem)] font-extrabold leading-[0.92] tracking-tighter text-[#c2c1ff]">
                                Racket<span className="italic">Tier</span>
                            </p>
                            <h1 className="rt-display mt-4 max-w-xl text-balance text-[clamp(1.5rem,3.6vw,2.35rem)] font-extrabold leading-[1.1] tracking-tight text-[#e4e1e6]">
                                Every smash counts.{' '}
                                <span className="rt-landing-v2-gradient-text">Track it, rank it, own it.</span>
                            </h1>
                            <p className="mt-4 max-w-lg text-base leading-relaxed text-[#c8c5d2] tab:text-[1.05rem]">
                                Live ranking, fair queueing, and match tracking for badminton, pickleball, tennis, and
                                table tennis communities.
                            </p>

                            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                                <Link
                                    to={primaryCta.to}
                                    className="inline-flex min-h-12 touch-manipulation items-center justify-center rounded-2xl bg-[#c2c1ff] px-7 text-base font-bold text-[#211e6a] shadow-[0_20px_40px_-10px_rgba(194,193,255,0.35)] transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/60 active:scale-[0.98]"
                                >
                                    {primaryCta.label}
                                </Link>
                                <Link
                                    to={secondaryCta.to}
                                    className="inline-flex min-h-12 touch-manipulation items-center justify-center rounded-2xl border border-[#c2c1ff]/25 bg-transparent px-7 text-base font-semibold text-[#e4e1e6] transition-colors duration-200 hover:border-[#c2c1ff]/50 hover:bg-[#1b1b1e]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/50"
                                >
                                    {secondaryCta.label}
                                </Link>
                            </div>
                        </div>

                        <div className="relative">
                            <HeroStage />
                        </div>
                    </div>

                    <dl className="mx-auto grid w-full max-w-6xl grid-cols-3 gap-px border-y border-white/5 bg-white/5 px-0">
                        {[
                            { label: 'Members', value: formatStatCount(totalMembers), accent: 'text-[#c2c1ff]' },
                            {
                                label: 'Total Queue',
                                value: formatStatCount(totalQueueingSessions),
                                accent: 'text-[#4ce081]',
                            },
                            { label: 'Points', value: formatStatCount(totalPointsAwarded), accent: 'text-[#e4e1e6]' },
                        ].map((stat) => (
                            <div key={stat.label} className="bg-[#121216] px-4 py-6 text-center tab:py-8">
                                <dd className={`rt-display text-2xl font-extrabold tracking-tight tab:text-4xl ${stat.accent}`}>
                                    {stat.value}
                                </dd>
                                <dt className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#918f9c]">
                                    {stat.label}
                                </dt>
                            </div>
                        ))}
                    </dl>
                </section>

                {/* Sports band */}
                <section className="relative z-10 border-b border-white/5 bg-[#0f0f12]/60 py-10" aria-label="Supported sports">
                    <p className="mx-auto mb-6 max-w-6xl px-6 text-center text-sm text-[#c8c5d2]">
                        One platform. Four sports. Independent ratings, wallets, and tiers for each.
                    </p>
                    <div className="rt-landing-v2-marquee">
                        <div className="rt-landing-v2-marquee-track">
                            {[...SPORTS, ...SPORTS, ...SPORTS, ...SPORTS].map((sport, i) => (
                                <div
                                    key={`${sport.name}-${i}`}
                                    className="flex items-center gap-3 rounded-full border border-white/5 bg-[#1b1b1e]/80 px-5 py-2.5"
                                >
                                    <Icon name={sport.icon} className="text-[#c2c1ff]" />
                                    <span className="whitespace-nowrap text-sm font-semibold text-[#e4e1e6]">{sport.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features bento */}
                <section id="features" className="relative z-10 scroll-mt-28">
                    <div className="mx-auto w-full max-w-6xl px-6 py-16 tab:py-24">
                        <Reveal>
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#4ce081]">What you get</span>
                            <h2 className="rt-display mt-3 max-w-xl text-balance text-3xl font-extrabold tracking-tight text-[#e4e1e6] tab:text-4xl">
                                Everything a thriving club needs
                            </h2>
                            <p className="mt-3 max-w-2xl text-sm text-[#c8c5d2] tab:text-base">
                                From the first serve to the season-end leaderboard, RacketTier keeps your community fair,
                                fast, and engaged.
                            </p>
                        </Reveal>

                        <div className="mt-10 grid grid-cols-1 gap-4 tab:mt-14 tab:grid-cols-6 tab:gap-5">
                            {FEATURES.map((feature) => {
                                const span =
                                    feature.span === 'lg'
                                        ? 'tab:col-span-4 tab:row-span-2'
                                        : feature.span === 'md'
                                          ? 'tab:col-span-3'
                                          : 'tab:col-span-2';
                                const pad = feature.span === 'lg' ? 'tab:p-8' : 'tab:p-6';
                                return (
                                    <Reveal key={feature.title} className={span}>
                                        <article
                                            className={`h-full rounded-2xl border border-white/5 bg-[#1b1b1e]/70 p-6 transition-colors duration-200 hover:border-[#c2c1ff]/25 ${pad}`}
                                        >
                                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#c2c1ff]/10 text-[#c2c1ff]">
                                                <Icon name={feature.icon} />
                                            </div>
                                            <h3 className="rt-display mt-4 text-lg font-bold tracking-tight text-[#e4e1e6]">
                                                {feature.title}
                                            </h3>
                                            <p className="mt-2 text-sm leading-relaxed text-[#c8c5d2]">{feature.description}</p>
                                        </article>
                                    </Reveal>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Two ways to play */}
                <section className="relative z-10 border-y border-white/5 bg-[#0f0f12]/50">
                    <div className="mx-auto w-full max-w-6xl px-6 py-16 tab:py-20">
                        <Reveal>
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#c2c1ff]">Two ways to play</span>
                            <h2 className="rt-display mt-3 text-3xl font-extrabold tracking-tight text-[#e4e1e6] tab:text-4xl">
                                Facility nights or member-run queues
                            </h2>
                        </Reveal>
                        <div className="mt-10 grid gap-4 tab:grid-cols-2 tab:gap-6">
                            {PLAY_MODES.map((mode) => (
                                <Reveal key={mode.title}>
                                    <article className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#1b1b1e]/80 p-7">
                                        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[#c2c1ff]/5 blur-2xl" />
                                        <Icon name={mode.icon} className="text-2xl text-[#4ce081]" />
                                        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#4ce081]">
                                            {mode.eyebrow}
                                        </p>
                                        <h3 className="rt-display mt-2 text-xl font-bold tracking-tight text-[#e4e1e6]">
                                            {mode.title}
                                        </h3>
                                        <p className="mt-3 text-sm leading-relaxed text-[#c8c5d2]">{mode.description}</p>
                                    </article>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>

                {/* How it works */}
                <section id="how-it-works" className="relative z-10 scroll-mt-28">
                    <div className="mx-auto w-full max-w-6xl px-6 py-16 tab:py-24">
                        <Reveal>
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#c2c1ff]">How it works</span>
                            <h2 className="rt-display mt-3 text-3xl font-extrabold tracking-tight text-[#e4e1e6] tab:text-4xl">
                                From queue to ranking in four steps
                            </h2>
                        </Reveal>

                        <ol className="mt-12 grid gap-6 tab:grid-cols-4 tab:gap-4">
                            {STEPS.map((item, index) => (
                                <Reveal key={item.step}>
                                    <li className="relative">
                                        {index < STEPS.length - 1 && (
                                            <span
                                                className="pointer-events-none absolute left-[calc(50%+1.5rem)] top-5 hidden h-px w-[calc(100%-1rem)] bg-gradient-to-r from-[#c2c1ff]/40 to-transparent tab:block"
                                                aria-hidden
                                            />
                                        )}
                                        <span className="rt-display inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#c2c1ff]/30 bg-[#c2c1ff]/10 text-sm font-extrabold text-[#c2c1ff]">
                                            {item.step}
                                        </span>
                                        <h3 className="rt-display mt-4 text-base font-bold tracking-tight text-[#e4e1e6]">
                                            {item.title}
                                        </h3>
                                        <p className="mt-2 text-sm leading-relaxed text-[#c8c5d2]">{item.description}</p>
                                    </li>
                                </Reveal>
                            ))}
                        </ol>
                    </div>
                </section>

                {/* Tiers + ranking showcase */}
                <section id="tiers" className="relative z-10 scroll-mt-28 border-t border-white/5 bg-[#0f0f12]/40">
                    <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 tab:grid-cols-2 tab:items-center tab:gap-16 tab:py-24">
                        <Reveal>
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#4ce081]">Climb the ladder</span>
                            <h2 className="rt-display mt-3 text-3xl font-extrabold tracking-tight text-[#e4e1e6] tab:text-4xl">
                                Five tiers. One sport wallet each.
                            </h2>
                            <p className="mt-3 text-sm leading-relaxed text-[#c8c5d2] tab:text-base">
                                Session points fill your per-sport wallet. Your tier label moves with you — from Starter
                                through Sensie — while ELO tracks pure skill separately.
                            </p>
                            <ul className="mt-8 space-y-4">
                                {TIERS.map((tier) => (
                                    <li key={tier.name}>
                                        <div className="mb-1.5 flex items-baseline justify-between gap-3">
                                            <span className="text-sm font-semibold text-[#e4e1e6]">{tier.name}</span>
                                            <span className="text-xs text-[#918f9c]">{tier.range} pts</span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-[#1b1b1e]">
                                            <div
                                                className="rt-landing-v2-tier-bar h-full rounded-full bg-gradient-to-r from-[#c2c1ff] to-[#4ce081]"
                                                style={{ width: tier.width }}
                                            />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </Reveal>

                        <Reveal>
                            <div className="rt-landing-v2-stage rounded-[1.75rem] p-6 tab:p-8">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#918f9c]">Sample podium</p>
                                <p className="rt-display mt-1 text-xl font-bold tracking-tight text-[#e4e1e6]">
                                    Club leaderboard
                                </p>
                                <div className="mt-8 flex items-end justify-center gap-3">
                                    {PODIUM.map((p) => (
                                        <div key={p.place} className={`flex w-full max-w-[7rem] flex-col items-center ${p.delay}`}>
                                            <span
                                                className={`mb-2 flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold ${
                                                    p.place === 1
                                                        ? 'bg-[#c2c1ff] text-[#211e6a]'
                                                        : 'border border-white/10 bg-[#2a2a2d] text-[#c8c5d2]'
                                                }`}
                                            >
                                                {p.place}
                                            </span>
                                            <p className="text-center text-sm font-semibold text-[#e4e1e6]">{p.name}</p>
                                            <p className="text-[11px] text-[#4ce081]">{p.rating}</p>
                                            <div
                                                className={`mt-3 w-full rounded-t-2xl border border-white/5 ${p.height} ${
                                                    p.place === 1
                                                        ? 'bg-gradient-to-t from-[#211e6a] to-[#c2c1ff]/40'
                                                        : 'bg-[#1f1f22]'
                                                }`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Reveal>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="relative z-10">
                    <div className="mx-auto w-full max-w-5xl px-6 pb-20 pt-8 tab:pb-28 tab:pt-12">
                        <Reveal>
                            <div className="relative overflow-hidden rounded-3xl border border-[#c2c1ff]/20 bg-gradient-to-br from-[#1b1b1e] via-[#1b1b1e] to-[#211e6a]/55 px-8 py-12 text-center tab:px-14 tab:py-16">
                                <div className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-[#c2c1ff]/10 blur-3xl" />
                                <div className="pointer-events-none absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-[#4ce081]/10 blur-3xl" />
                                <h2 className="rt-display relative text-3xl font-extrabold tracking-tight text-[#e4e1e6] tab:text-4xl">
                                    Ready to start your tier journey?
                                </h2>
                                <p className="relative mx-auto mt-4 max-w-xl text-sm text-[#c8c5d2] tab:text-base">
                                    Join RacketTier and turn every casual rally into ranked, recordable progress.
                                </p>
                                <div className="relative mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                                    <Link
                                        to={checkedSession && user ? '/queueing-session' : '/register'}
                                        className="inline-flex min-h-12 touch-manipulation items-center justify-center rounded-2xl bg-[#c2c1ff] px-7 text-base font-bold text-[#211e6a] shadow-[0_20px_40px_-10px_rgba(194,193,255,0.35)] transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/60 active:scale-[0.98]"
                                    >
                                        {checkedSession && user ? 'Start a queueing session' : 'Create your account'}
                                    </Link>
                                    {!user && (
                                        <Link
                                            to="/login"
                                            className="inline-flex min-h-12 touch-manipulation items-center justify-center rounded-2xl border border-[#c2c1ff]/25 px-7 text-base font-semibold text-[#e4e1e6] transition-colors duration-200 hover:border-[#c2c1ff]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/50"
                                        >
                                            I already have an account
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </Reveal>
                    </div>
                </section>
            </main>

            <footer className="relative z-10 border-t border-white/5">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 tab:flex-row tab:items-center tab:justify-between">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <img src="/images/rt-logo.png" alt="" className="h-6 w-6 opacity-80" />
                            <span className="rt-display text-sm font-bold tracking-tight text-[#c2c1ff]">
                                Racket<span className="italic">Tier</span>
                            </span>
                        </div>
                        <p className="mt-2 text-xs text-[#918f9c]">The kinetic world of racket sports.</p>
                    </div>
                    <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#c8c5d2]" aria-label="Footer">
                        <a href="#features" className="transition-colors hover:text-[#e4e1e6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/50">
                            Features
                        </a>
                        <Link to="/login" className="transition-colors hover:text-[#e4e1e6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/50">
                            Sign in
                        </Link>
                        <span className="text-[#918f9c]">Terms</span>
                        <span className="text-[#918f9c]">Privacy</span>
                        <span className="text-[#918f9c]">Contact</span>
                    </nav>
                    <p className="text-[10px] uppercase tracking-[0.08em] text-[#918f9c]">
                        © {new Date().getFullYear()} RacketTier
                    </p>
                </div>
            </footer>
        </div>
    );
}
