import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPublicStats } from '../api/publicStats.js';
import { LegalDocumentModal } from '../components/auth/LegalDocumentModal.jsx';
import { PRIVACY_POLICY_TEXT } from '../components/auth/privacyPolicyContent.js';
import { TERMS_OF_SERVICE_TEXT } from '../components/auth/termsOfServiceContent.js';
import { AutoMatchQueueDemo } from '../components/landing/AutoMatchQueueDemo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import '../../css/landing-v3.css';
// Score tap demo kept for future reference: ../components/landing/MatchScoreSimulator.jsx

/** @typedef {'terms' | 'privacy'} LegalModalKind */
function formatStatCount(n) {
    if (n == null) return '—';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M+`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}k+`;
    return n.toLocaleString();
}

const SPORTS = [
    { id: 'badminton', name: 'Badminton', icon: 'badminton', img: '/images/badminton.png', accent: '#c2c1ff', glow: 'rgba(194,193,255,0.55)', tagline: 'Smash. Rotate. Climb.' },
    { id: 'pickleball', name: 'Pickleball', icon: 'pickleball', img: '/images/pickleball.png', accent: '#4ce081', glow: 'rgba(76,224,129,0.55)', tagline: 'Dink. Drive. Rank.' },
    { id: 'tennis', name: 'Tennis', icon: 'sports_tennis', img: '/images/tennis.png', accent: '#a5a3ff', glow: 'rgba(165,163,255,0.55)', tagline: 'Serve. Score. Rise.' },
    { id: 'table-tennis', name: 'Table Tennis', icon: 'table_tennis', img: '/images/table-tennis.png', accent: '#7877c6', glow: 'rgba(120,119,198,0.55)', tagline: 'Spin. Point. Progress.' },
];

const FEATURES = [
    {
        icon: 'queue',
        title: 'Fair queue rotation',
        body: 'FIFO court time with Queue Master control — auto-match or build by hand.',
    },
    {
        icon: 'bolt',
        title: 'Instant matchmaking',
        body: 'Balance by skill, sequence, win/loss, or mixed teams. Singles or doubles.',
    },
    {
        icon: 'trending_up',
        title: 'Live ratings per sport',
        body: 'Every finished match moves your rating. Transparent history, real podium.',
    },
    {
        icon: 'military_tech',
        title: 'Points & five tiers',
        body: 'Wallet balances climb Starter → Level 5 - Pro Elite while ratings tracks pure skill.',
    },
];

const STEPS = [
    { title: 'Create a Session', body: 'Pick a sport, singles or doubles, and set win/loss point rewards.' },
    { title: 'Build the Queue', body: 'Invite members or drop in guests. FIFO keeps court time fair.' },
    { title: 'Play & Record', body: 'Auto-generate from the top of the queue, then submit results.' },
    { title: 'Climb the Ranks', body: 'Ratings updates, points credit, and your tier label evolves.' },
];

const TIERS = [
    { name: 'Starter', pts: '0–499', fill: 18 },
    { name: 'Beginner', pts: '500–1.4k', fill: 34 },
    { name: 'Intermediate', pts: '1.5k–4.9k', fill: 52 },
    { name: 'Level 4 - Advance', pts: '5k–14.9k', fill: 72 },
    { name: 'Level 5 - Pro Elite', pts: '15k+', fill: 94 },
];

const PODIUM = [
    { place: 2, name: 'Maya K.', rating: 1284, h: 56 },
    { place: 1, name: 'Jordan R.', rating: 1412, h: 88 },
    { place: 3, name: 'Alex P.', rating: 1198, h: 40 },
];

const TICKER = [
    'Jordan R. +18 ratings · Badminton',
    'Queue #7 started · Pickleball doubles',
    'Maya K. reached Intermediate',
    'Facility match finished · +30 pts',
    'Casey N. joined the waiting list',
    'Level 4 - Advance unlocked · Tennis wallet',
];

function Icon({ name, className = '' }) {
    return (
        <span className={`material-symbols-outlined ${className}`} aria-hidden>
            {name}
        </span>
    );
}

function prefersReducedMotion() {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function useReveal() {
    const ref = useRef(/** @type {HTMLElement | null} */ (null));
    useEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        if (prefersReducedMotion()) {
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
            { threshold: 0.14, rootMargin: '0px 0px -6% 0px' },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);
    return ref;
}

function Reveal({ children, className = '' }) {
    const ref = useReveal();
    return (
        <div ref={ref} className={`rt-landing-v3-reveal ${className}`}>
            {children}
        </div>
    );
}

function useCountUp(target, active, duration = 1100) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        if (!active || target == null) {
            setValue(target ?? 0);
            return undefined;
        }
        if (prefersReducedMotion()) {
            setValue(target);
            return undefined;
        }
        let frame = 0;
        const start = performance.now();
        const tick = (now) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - (1 - t) ** 3;
            setValue(Math.round(target * eased));
            if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [target, active, duration]);
    return value;
}

function KineticHeadline({ text, className = '' }) {
    const words = text.split(' ');
    return (
        <span className={className}>
            {words.map((word, i) => (
                <span key={`${word}-${i}`} className="rt-landing-v3-word" style={{ animationDelay: `${80 + i * 70}ms` }}>
                    {word}
                    {i < words.length - 1 ? '\u00A0' : ''}
                </span>
            ))}
        </span>
    );
}

function SpotlightCard({ children, className = '' }) {
    const ref = useRef(/** @type {HTMLElement | null} */ (null));
    const onMove = (e) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
        el.style.setProperty('--my', `${e.clientY - rect.top}px`);
    };
    return (
        <article ref={ref} onMouseMove={onMove} className={`rt-landing-v3-spotlight ${className}`}>
            {children}
        </article>
    );
}

function StatBlock({ label, target, accent, active }) {
    const n = useCountUp(target ?? 0, active);
    return (
        <div className="bg-[#121216] px-4 py-7 text-center tab:py-9">
            <dd className={`rt-display text-3xl font-extrabold tracking-tight tab:text-4xl ${accent}`}>
                {formatStatCount(n)}
            </dd>
            <dt className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#918f9c]">{label}</dt>
        </div>
    );
}

/**
 * Landing v3 — sporty kinetic arena with interactive demos. Main landing at `/`.
 */
export function HomePageV3() {
    const { user, refreshUser } = useAuth();
    const [checkedSession, setCheckedSession] = useState(!!user);
    const [navScrolled, setNavScrolled] = useState(false);
    const [sportId, setSportId] = useState('badminton');
    const [step, setStep] = useState(0);
    const [selectedPlace, setSelectedPlace] = useState(1);
    const [tierIdx, setTierIdx] = useState(2);
    const [statsInView, setStatsInView] = useState(false);
    const [totalMembers, setTotalMembers] = useState(/** @type {number | null} */ (null));
    const [totalQueueingSessions, setTotalQueueingSessions] = useState(/** @type {number | null} */ (null));
    const [totalPointsAwarded, setTotalPointsAwarded] = useState(/** @type {number | null} */ (null));
    const [legalModal, setLegalModal] = useState(/** @type {LegalModalKind | null} */ (null));
    const statsRef = useRef(/** @type {HTMLElement | null} */ (null));

    const sport = SPORTS.find((s) => s.id === sportId) ?? SPORTS[0];

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
                // ignore
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const onScroll = () => setNavScrolled(window.scrollY > 20);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--rt-sport', sport.accent);
        root.style.setProperty('--rt-sport-glow', sport.glow);
        const page = document.querySelector('.rt-landing-v3');
        if (page instanceof HTMLElement) {
            page.style.setProperty('--rt-sport', sport.accent);
            page.style.setProperty('--rt-sport-glow', sport.glow);
        }
    }, [sport]);

    useEffect(() => {
        const el = statsRef.current;
        if (!el) return undefined;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry?.isIntersecting) {
                    setStatsInView(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.35 },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (prefersReducedMotion()) return undefined;
        const id = window.setInterval(() => {
            setStep((s) => (s + 1) % STEPS.length);
        }, 4200);
        return () => window.clearInterval(id);
    }, []);

    const primaryCta =
        checkedSession && user
            ? { to: '/dashboard', label: 'Open your dashboard' }
            : { to: '/register', label: 'Create your account' };
    const secondaryCta =
        checkedSession && user
            ? { to: '/queueing-session', label: 'Start a queueing session' }
            : { to: '/login', label: 'Sign in' };

    const selectedPodium = PODIUM.find((p) => p.place === selectedPlace) ?? PODIUM[1];

    return (
        <div
            className="rt-landing-v3 rt-landing-v3-court relative min-h-screen overflow-x-clip text-[#e4e1e6]"
            style={{ '--rt-sport': sport.accent, '--rt-sport-glow': sport.glow }}
        >
            <div className="rt-landing-v3-court-line hidden tab:block" aria-hidden />
            <div className="rt-landing-v3-orb left-[-8%] top-[8%] h-64 w-64 bg-[#c2c1ff]/20" style={{ animationDelay: '0s' }} />
            <div className="rt-landing-v3-orb right-[-6%] top-[28%] h-72 w-72 bg-[#4ce081]/15" style={{ animationDelay: '2s' }} />

            <a
                href="#main"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-[#c2c1ff] focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-[#211e6a]"
            >
                Skip to content
            </a>

            <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 tab:px-6">
                <nav
                    className={`rt-landing-v3-nav mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-2xl border border-transparent px-4 py-3 tab:px-5 ${
                        navScrolled ? 'is-scrolled' : ''
                    }`}
                    aria-label="Primary"
                >
                    <Link
                        to="/"
                        className="flex min-h-11 items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/60"
                    >
                        <img src="/images/rt-logo.png" alt="" className="h-7 w-7" />
                        <span className="rt-display text-xl font-extrabold tracking-tighter text-[#c2c1ff]">
                            Racket<span className="ml-[0.1rem] italic">Tier</span>
                        </span>
                    </Link>
                    <div className="hidden items-center gap-6 md:flex">
                        <a href="#demo" className="text-sm font-medium text-[#c8c5d2] transition-colors duration-200 hover:text-[#e4e1e6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/50">
                            Demo
                        </a>
                        <a href="#features" className="text-sm font-medium text-[#c8c5d2] transition-colors duration-200 hover:text-[#e4e1e6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/50">
                            Features
                        </a>
                        <a href="#play" className="text-sm font-medium text-[#c8c5d2] transition-colors duration-200 hover:text-[#e4e1e6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/50">
                            How it works
                        </a>
                    </div>
                    <div className="flex items-center gap-2">
                        {checkedSession && user ? (
                            <Link
                                to="/dashboard"
                                className="inline-flex min-h-11 cursor-pointer touch-manipulation items-center rounded-xl bg-[#c2c1ff] px-4 text-sm font-bold text-[#211e6a] transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/60 active:scale-[0.98]"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="hidden min-h-11 cursor-pointer items-center px-3 text-sm font-semibold text-[#c8c5d2] transition-colors duration-200 hover:text-[#e4e1e6] sm:inline-flex"
                                >
                                    Sign in
                                </Link>
                                <Link
                                    to="/register"
                                    className="inline-flex min-h-11 cursor-pointer touch-manipulation items-center rounded-xl bg-[#c2c1ff] px-4 text-sm font-bold text-[#211e6a] shadow-[0_16px_32px_-12px_rgba(194,193,255,0.4)] transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/60 active:scale-[0.98]"
                                >
                                    Get started
                                </Link>
                            </>
                        )}
                    </div>
                </nav>
            </header>

            <main id="main">
                {/* Hero */}
                <section className="relative z-10 pt-24 tab:pt-28">
                    <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 pb-10 tab:grid-cols-[1.05fr_0.95fr] tab:items-center tab:gap-12 tab:pb-14">
                        <div>
                            <p className="inline-flex items-center gap-2 rounded-full border border-[#4ce081]/25 bg-[#4ce081]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#4ce081]">
                                <span className="rt-landing-v3-pulse-dot h-1.5 w-1.5 rounded-full bg-[#4ce081]" />
                                Live on court
                            </p>
                            <h1 className="rt-display mt-5 text-balance text-[clamp(2.1rem,5.5vw,3.75rem)] font-extrabold leading-[1.02] tracking-tighter text-[#e4e1e6]">
                                <KineticHeadline text="Every smash counts." />
                                <br className="hidden sm:block" />
                                <span className="rt-landing-v3-gradient-text">
                                    <KineticHeadline text="Track it, rank it, own it." />
                                </span>
                            </h1>
                            <p className="mt-4 max-w-lg text-base leading-relaxed text-[#c8c5d2]">
                                The kinetic ranking arena for racket sports — fair queues, live ratings, and tier climbs that
                                feel as sharp as a winner&apos;s smash.
                            </p>

                            <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Choose a sport">
                                {SPORTS.map((s) => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => setSportId(s.id)}
                                        className={`rt-landing-v3-sport-chip inline-flex min-h-11 cursor-pointer touch-manipulation items-center gap-2 rounded-full border border-white/10 bg-[#1b1b1e]/80 px-3.5 text-sm font-semibold text-[#c8c5d2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/50 ${
                                            sportId === s.id ? 'is-active' : ''
                                        }`}
                                        style={sportId === s.id ? { '--rt-sport': s.accent, '--rt-sport-glow': s.glow } : undefined}
                                        aria-pressed={sportId === s.id}
                                    >
                                        <img src={s.img} alt="" className="h-4 w-4" aria-hidden />
                                        {s.name}
                                    </button>
                                ))}
                            </div>
                            <p className="mt-3 text-sm font-medium" style={{ color: sport.accent }}>
                                {sport.tagline}
                            </p>

                            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                                <div className="rt-landing-v3-cta-ring inline-flex">
                                    <Link
                                        to={primaryCta.to}
                                        className="inline-flex min-h-12 cursor-pointer touch-manipulation items-center justify-center rounded-2xl bg-[#c2c1ff] px-7 text-base font-bold text-[#211e6a] shadow-[0_20px_40px_-10px_rgba(194,193,255,0.35)] transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/60 active:scale-[0.98]"
                                    >
                                        {primaryCta.label}
                                    </Link>
                                </div>
                                <Link
                                    to={secondaryCta.to}
                                    className="inline-flex min-h-12 cursor-pointer touch-manipulation items-center justify-center rounded-2xl border border-white/15 px-7 text-base font-semibold text-[#e4e1e6] transition-colors duration-200 hover:border-[#c2c1ff]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/50"
                                >
                                    {secondaryCta.label}
                                </Link>
                            </div>
                        </div>

                        <div id="demo" className="scroll-mt-28">
                            <AutoMatchQueueDemo accent={sport.accent} />
                        </div>
                    </div>

                    {/* Live ticker */}
                    <div className="rt-landing-v3-ticker border-y border-white/5 bg-[#0f0f12]/70 py-3" aria-hidden>
                        <div className="rt-landing-v3-ticker-track">
                            {[...TICKER, ...TICKER].map((item, i) => (
                                <span key={`${item}-${i}`} className="flex items-center gap-2 whitespace-nowrap text-xs text-[#c8c5d2]">
                                    <span className="h-1 w-1 rounded-full bg-[#4ce081]" />
                                    {item}
                                </span>
                            ))}
                        </div>
                    </div>

                    <dl ref={statsRef} className="mx-auto grid w-full max-w-6xl grid-cols-3 gap-px bg-white/5">
                        <StatBlock label="Members" target={totalMembers} accent="text-[#c2c1ff]" active={statsInView} />
                        <StatBlock label="Total Queue" target={totalQueueingSessions} accent="text-[#4ce081]" active={statsInView} />
                        <StatBlock label="Points" target={totalPointsAwarded} accent="text-[#e4e1e6]" active={statsInView} />
                    </dl>
                </section>

                {/* Features */}
                <section id="features" className="relative z-10 scroll-mt-28 px-6 py-16 tab:py-24">
                    <div className="mx-auto max-w-6xl">
                        <Reveal>
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#4ce081]">Gear up</span>
                            <h2 className="rt-display mt-3 max-w-xl text-3xl font-extrabold tracking-tight tab:text-4xl">
                                Built for the heat of match night
                            </h2>
                        </Reveal>
                        <div className="mt-10 grid gap-4 tab:grid-cols-2 tab:gap-5">
                            {FEATURES.map((f) => (
                                <Reveal key={f.title}>
                                    <SpotlightCard className="h-full cursor-default rounded-2xl border border-white/5 bg-[#1b1b1e]/75 p-6 transition-colors duration-200 hover:border-white/10">
                                        <div
                                            className="relative z-[1] flex h-11 w-11 items-center justify-center rounded-xl"
                                            style={{ background: `color-mix(in srgb, ${sport.accent} 14%, transparent)`, color: sport.accent }}
                                        >
                                            <Icon name={f.icon} />
                                        </div>
                                        <h3 className="rt-display relative z-[1] mt-4 text-lg font-bold tracking-tight">{f.title}</h3>
                                        <p className="relative z-[1] mt-2 text-sm leading-relaxed text-[#c8c5d2]">{f.body}</p>
                                    </SpotlightCard>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Interactive how-it-works */}
                <section id="play" className="relative z-10 scroll-mt-28 border-y border-white/5 bg-[#0f0f12]/55">
                    <div className="mx-auto max-w-6xl px-6 py-16 tab:py-20">
                        <Reveal>
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#c2c1ff]">How it works</span>
                            <h2 className="rt-display mt-3 text-3xl font-extrabold tracking-tight tab:text-4xl">
                                Tap through the match night flow
                            </h2>
                        </Reveal>

                        <div className="mt-8">
                            <div className="rt-landing-v3-step-rail mb-6" aria-hidden>
                                <span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
                            </div>
                            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Session steps">
                                {STEPS.map((s, i) => (
                                    <button
                                        key={s.title}
                                        type="button"
                                        role="tab"
                                        aria-selected={step === i}
                                        onClick={() => setStep(i)}
                                        className={`inline-flex min-h-11 cursor-pointer touch-manipulation items-center rounded-full border px-4 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/50 ${
                                            step === i
                                                ? 'border-[#c2c1ff]/50 bg-[#c2c1ff]/15 text-[#c2c1ff]'
                                                : 'border-white/10 bg-transparent text-[#c8c5d2] hover:border-white/20'
                                        }`}
                                    >
                                        <span className="mr-2 font-extrabold opacity-60">{String(i + 1).padStart(2, '0')}</span>
                                        {s.title}
                                    </button>
                                ))}
                            </div>
                            <div role="tabpanel" className="mt-8 rounded-2xl border border-white/5 bg-[#1b1b1e]/80 p-7 tab:p-9">
                                <p className="rt-display text-2xl font-extrabold tracking-tight text-[#e4e1e6]">{STEPS[step].title}</p>
                                <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#c8c5d2]">{STEPS[step].body}</p>
                                <div className="mt-6 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setStep((s) => (s - 1 + STEPS.length) % STEPS.length)}
                                        className="min-h-11 cursor-pointer rounded-xl border border-white/10 px-4 text-sm font-semibold text-[#c8c5d2] transition-colors hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/50"
                                    >
                                        Prev
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStep((s) => (s + 1) % STEPS.length)}
                                        className="min-h-11 cursor-pointer rounded-xl bg-[#c2c1ff] px-4 text-sm font-bold text-[#211e6a] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/60 active:scale-[0.98]"
                                    >
                                        Next step
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Interactive ladder */}
                <section className="relative z-10 px-6 py-16 tab:py-24">
                    <div className="mx-auto grid max-w-6xl gap-12 tab:grid-cols-2 tab:items-center tab:gap-16">
                        <Reveal>
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#4ce081]">Climb</span>
                            <h2 className="rt-display mt-3 text-3xl font-extrabold tracking-tight tab:text-4xl">
                                Tap a tier. Inspect the podium.
                            </h2>
                            <p className="mt-3 text-sm leading-relaxed text-[#c8c5d2] tab:text-base">
                                Session points fill your per-sport wallet. Click a tier to preview the climb — ratings stays
                                separate for pure skill.
                            </p>
                            <ul className="mt-8 space-y-3">
                                {TIERS.map((tier, i) => (
                                    <li key={tier.name}>
                                        <button
                                            type="button"
                                            onClick={() => setTierIdx(i)}
                                            className={`w-full cursor-pointer rounded-xl border px-4 py-3 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/50 ${
                                                tierIdx === i
                                                    ? 'border-[#c2c1ff]/40 bg-[#c2c1ff]/10'
                                                    : 'border-white/5 bg-[#1b1b1e]/60 hover:border-white/10'
                                            }`}
                                            aria-pressed={tierIdx === i}
                                        >
                                            <div className="mb-2 flex items-baseline justify-between gap-2">
                                                <span className="text-sm font-semibold text-[#e4e1e6]">{tier.name}</span>
                                                <span className="text-xs text-[#918f9c]">{tier.pts}</span>
                                            </div>
                                            <div className="h-1.5 overflow-hidden rounded-full bg-[#121216]">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-[#c2c1ff] to-[#4ce081] transition-[width] duration-300 ease-out"
                                                    style={{ width: `${tierIdx === i ? tier.fill : Math.max(8, tier.fill * 0.45)}%` }}
                                                />
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <p className="mt-4 text-sm font-medium" style={{ color: sport.accent }}>
                                Selected: {TIERS[tierIdx].name} · {TIERS[tierIdx].pts} pts
                            </p>
                        </Reveal>

                        <Reveal>
                            <div className="rt-landing-v3-scoreboard rounded-[1.75rem] p-6 tab:p-8">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#918f9c]">Live podium</p>
                                <p className="rt-display mt-1 text-xl font-bold tracking-tight">
                                    {selectedPodium.name} · {selectedPodium.rating} rating
                                </p>
                                <div className="mt-8 flex items-end justify-center gap-3">
                                    {PODIUM.map((p) => (
                                        <button
                                            key={p.place}
                                            type="button"
                                            onClick={() => setSelectedPlace(p.place)}
                                            className="flex w-full max-w-[7rem] cursor-pointer flex-col items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/50"
                                            aria-pressed={selectedPlace === p.place}
                                        >
                                            <span
                                                className={`mb-2 flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold ${
                                                    p.place === 1 ? 'bg-[#c2c1ff] text-[#211e6a]' : 'border border-white/10 bg-[#2a2a2d] text-[#c8c5d2]'
                                                }`}
                                            >
                                                {p.place}
                                            </span>
                                            <span className="text-center text-xs font-semibold text-[#e4e1e6]">{p.name}</span>
                                            <span className="text-[10px] text-[#4ce081]">{p.rating}</span>
                                            <span
                                                className={`rt-landing-v3-podium-bar mt-2 w-full rounded-t-2xl border border-white/5 ${
                                                    selectedPlace === p.place ? 'is-selected' : 'bg-[#1f1f22]'
                                                }`}
                                                style={{ height: p.h, background: selectedPlace === p.place ? undefined : undefined }}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </Reveal>
                    </div>
                </section>

                {/* Two modes */}
                <section className="relative z-10 border-t border-white/5 bg-[#0f0f12]/45 px-6 py-16">
                    <div className="mx-auto grid max-w-6xl gap-4 tab:grid-cols-2 tab:gap-6">
                        {[
                            {
                                icon: 'stadium',
                                title: 'Facility session',
                                body: 'One scored match at a venue — finish and rankings + points apply immediately.',
                            },
                            {
                                icon: 'sports_score',
                                title: 'Queueing session',
                                body: 'Multi-match nights with live leaderboard, fair rotation, and a closing summary.',
                            },
                        ].map((mode) => (
                            <Reveal key={mode.title}>
                                <SpotlightCard className="rounded-2xl border border-white/5 bg-[#1b1b1e]/80 p-7">
                                    <Icon name={mode.icon} className="relative z-[1] text-2xl text-[#4ce081]" />
                                    <h3 className="rt-display relative z-[1] mt-4 text-xl font-bold tracking-tight">{mode.title}</h3>
                                    <p className="relative z-[1] mt-2 text-sm leading-relaxed text-[#c8c5d2]">{mode.body}</p>
                                </SpotlightCard>
                            </Reveal>
                        ))}
                    </div>
                </section>

                {/* Final CTA */}
                <section className="relative z-10 px-6 pb-20 pt-10 tab:pb-28">
                    <Reveal>
                        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-[#c2c1ff]/20 bg-gradient-to-br from-[#1b1b1e] via-[#1b1b1e] to-[#211e6a]/60 px-8 py-12 text-center tab:px-14 tab:py-16">
                            <div className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-[#c2c1ff]/15 blur-3xl" />
                            <div className="pointer-events-none absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-[#4ce081]/12 blur-3xl" />
                            <h2 className="rt-display relative text-3xl font-extrabold tracking-tight tab:text-4xl">
                                Ready to take the court?
                            </h2>
                            <p className="relative mx-auto mt-4 max-w-xl text-sm text-[#c8c5d2] tab:text-base">
                                Join RacketTier — turn every casual rally into ranked, recordable progress.
                            </p>
                            <div className="relative mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
                                <div className="rt-landing-v3-cta-ring inline-flex justify-center">
                                    <Link
                                        to={checkedSession && user ? '/queueing-session' : '/register'}
                                        className="inline-flex min-h-12 cursor-pointer touch-manipulation items-center justify-center rounded-2xl bg-[#c2c1ff] px-7 text-base font-bold text-[#211e6a] shadow-[0_20px_40px_-10px_rgba(194,193,255,0.35)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/60 active:scale-[0.98]"
                                    >
                                        {checkedSession && user ? 'Start a queueing session' : 'Create your account'}
                                    </Link>
                                </div>
                                {!user && (
                                    <Link
                                        to="/login"
                                        className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border border-white/15 px-7 text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/50"
                                    >
                                        I already have an account
                                    </Link>
                                )}
                            </div>
                        </div>
                    </Reveal>
                </section>
            </main>

            <footer className="relative z-10 border-t border-white/5">
                <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 tab:flex-row tab:items-center tab:justify-between">
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
                        <Link to="/login" className="transition-colors hover:text-[#e4e1e6]">
                            Sign in
                        </Link>
                        <button
                            type="button"
                            onClick={() => setLegalModal('terms')}
                            className="cursor-pointer font-medium text-[#918f9c] transition-colors hover:text-[#e4e1e6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/50"
                        >
                            Terms
                        </button>
                        <button
                            type="button"
                            onClick={() => setLegalModal('privacy')}
                            className="cursor-pointer font-medium text-[#918f9c] transition-colors hover:text-[#e4e1e6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/50"
                        >
                            Privacy
                        </button>
                    </nav>
                    <p className="text-[10px] uppercase tracking-[0.08em] text-[#918f9c]">© {new Date().getFullYear()} RacketTier</p>
                </div>
            </footer>

            <LegalDocumentModal
                open={legalModal === 'terms'}
                title="Terms of Service"
                content={TERMS_OF_SERVICE_TEXT}
                onClose={() => setLegalModal(null)}
            />
            <LegalDocumentModal
                open={legalModal === 'privacy'}
                title="Privacy Policy"
                content={PRIVACY_POLICY_TEXT}
                onClose={() => setLegalModal(null)}
            />
        </div>
    );
}
