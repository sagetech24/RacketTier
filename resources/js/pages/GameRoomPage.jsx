import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import '../../css/dashboard-v2.css';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav.jsx';
import { DashboardV2Header } from '../components/dashboard/DashboardV2Header.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const COURT_BG =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCcNm6e9LXXjtc5jcT-ghsNkK9q8hjmxzNvrRg1H3D1pMGtmyfNOCiQYDljR2p48bIDcX84peZBIee_F4XgW3X0YybcmJvJwuD3YI5hOxFHTjYQu8o8nicOhWn3zUBpM_i6k_JhfclYhalVsHJX20zONHpKVnYT-7JtnfSCBSYUc1Yqu55qhm9n-MnJ1USAnIvk79jXD9lfaLwHKBm43Az0enw4SmavKyq4yIWrl-8fFwyTArAKQbcVxKj9brvWrupqgBzpJwfOQFc';

const COURTS = [
    { id: 'COURT 01', status: 'MATCH ACTIVE', active: true },
    { id: 'COURT 02', status: 'OPENING SOON', active: false },
    { id: 'COURT 03', status: 'MATCH ACTIVE', active: true },
    { id: 'COURT 04', status: 'MAINTENANCE', active: false },
];

const PLAYERS = [
    {
        initials: 'MR',
        name: 'MARCUS REED',
        tier: 'Tier 1',
        status: 'Available',
        detail: 'WR  SJ',
        statusColor: 'text-[#4ce081]',
    },
    {
        initials: 'EV',
        name: 'ELENA VOGEL',
        tier: 'Tier 2',
        status: 'Playing',
        detail: 'Currently on Court 03',
        statusColor: 'text-[#c2c1ff]',
    },
    {
        initials: 'JL',
        name: 'JORDAN LI',
        tier: 'Tier 2',
        status: 'Waiting for Confirmation',
        detail: 'Invited by Coach Sam',
        statusColor: 'text-[#ffb4ab]',
    },
];

function filterButtonClass(active) {
    return active
        ? 'rounded-full bg-[#4ce081] px-4 py-2 text-xs font-bold text-[#003919]'
        : 'rounded-full bg-[#353438] px-4 py-2 text-xs font-semibold text-[#e4e1e6]';
}

function TrophyIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M6 9H4.5a2 2 0 00-2 2v1c0 4 3 7 7 7s7-3 7-7v-1a2 2 0 00-2-2H6z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 21h8M12 17v4M9 3h6l1 3H8l1-3z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export function GameRoomPage() {
    const { user } = useAuth();
    const [playerSearch, setPlayerSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [fastMatchmaking, setFastMatchmaking] = useState(false);

    const q = playerSearch.trim().toLowerCase();
    const filteredPlayers = useMemo(() => {
        const searched = q
            ? PLAYERS.filter(
                  (p) =>
                      p.name.toLowerCase().includes(q) ||
                      p.tier.toLowerCase().includes(q) ||
                      p.status.toLowerCase().includes(q) ||
                      p.detail.toLowerCase().includes(q),
              )
            : [...PLAYERS];

        if (statusFilter === 'playing') {
            return searched.filter((p) => p.status === 'Playing');
        }
        if (statusFilter === 'available') {
            return searched.filter((p) => p.status === 'Available');
        }
        return searched;
    }, [q, statusFilter]);

    return (
        <div className="min-h-screen bg-[#131316] text-[#e4e1e6] selection:bg-[#c2c1ff] selection:text-[#282671]">
            <DashboardV2Header user={user} profileLoading={false} />

            <main className="mx-auto min-h-screen max-w-md px-6 pb-32 pt-28">
                <section className="mb-8">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4ce081]">
                        Ground Zero Fitness Hub
                    </p>
                    <h1 className="text-5xl font-extrabold tracking-tight">GAME ROOM</h1>
                    <p className="mt-4 text-sm leading-relaxed text-[#c8c5d2]">
                        Connect with 24 active players currently on-site.
                        <br />
                        The court is waiting for your next move.
                    </p>
                </section>

                <Link
                    to="/create-match"
                    className="mb-8 inline-flex items-center gap-2 rounded-full bg-linear-to-br from-[#c2c1ff] to-[#8a89d9] px-5 py-3 text-xs font-bold tracking-wider text-[#282671] uppercase"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-5 text-[#282671]"
                        aria-hidden
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Create Match
                </Link>

                <section
                    className="relative mb-8 min-h-[450px] overflow-hidden bg-cover bg-center p-4"
                    style={{ backgroundImage: `url(${COURT_BG})` }}
                >
                    <div className="pointer-events-none absolute inset-0 bg-black/60" />
                    <div className="relative z-10">
                        <h2 className="text-3xl font-bold text-[#e4e1e6]">Active Games</h2>
                        <p className="mb-4 text-base text-[#c8c5d2]">Real-time ongoing matches</p>

                        <div className="grid grid-cols-1 gap-3">
                            {COURTS.map((court) => (
                                <div
                                    key={court.id}
                                    className="rounded-md bg-[#131316]/80 p-3"
                                    aria-label={`${court.id} ${court.status}`}
                                >
                                    <p className="text-[10px] font-semibold tracking-widest text-[#c8c5d2]">{court.id}</p>
                                    <p
                                        className={`mt-1 text-[10px] font-bold tracking-[0.12em] ${
                                            court.active ? 'text-[#4ce081]' : 'text-[#c8c5d2]'
                                        }`}
                                    >
                                        {court.status}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="mb-6">
                    <h2 className="mb-3 text-base font-bold text-[#e4e1e6]">Who&apos;s on the court</h2>
                    <label className="mb-4 flex items-center gap-3 rounded-xl bg-[#0e0e11] px-4 py-3 ring-1 ring-white/5 focus-within:ring-[#c2c1ff]/40">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="size-4 shrink-0 stroke-[#918f9c]"
                            aria-hidden
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                            />
                        </svg>
                        <input
                            type="search"
                            value={playerSearch}
                            onChange={(e) => setPlayerSearch(e.target.value)}
                            placeholder="Search players by name, tier, or status…"
                            autoComplete="off"
                            spellCheck={false}
                            className="min-w-0 flex-1 bg-transparent text-sm text-[#e4e1e6] placeholder:text-[#918f9c] outline-none"
                            aria-label="Search players"
                        />
                    </label>

                    <h3 className="mb-3 text-xs font-semibold text-[#e4e1e6]">Status Filters</h3>
                    <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter players by status">
                        <button
                            type="button"
                            className={filterButtonClass(statusFilter === 'all')}
                            aria-pressed={statusFilter === 'all'}
                            onClick={() => setStatusFilter('all')}
                        >
                            All Players
                        </button>
                        <button
                            type="button"
                            className={filterButtonClass(statusFilter === 'playing')}
                            aria-pressed={statusFilter === 'playing'}
                            onClick={() => setStatusFilter('playing')}
                        >
                            Playing
                        </button>
                        <button
                            type="button"
                            className={filterButtonClass(statusFilter === 'available')}
                            aria-pressed={statusFilter === 'available'}
                            onClick={() => setStatusFilter('available')}
                        >
                            Available
                        </button>
                    </div>

                    <p className="mt-4 mb-2 text-xs tracking-wide text-[#c8c5d2]">
                        Enable AI-integrated matchmaking to find your next match faster. (coming soon)
                    </p>
                    <label className="mb-5 flex cursor-pointer items-center justify-between gap-3 rounded-full bg-[#c2c1ff]/10 px-3 py-2 text-[10px] font-bold tracking-widest text-[#c2c1ff] uppercase opacity-70">
                        <span className="flex min-w-0 items-center gap-2">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="size-5 shrink-0 stroke-[#4ce081]"
                                aria-hidden
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
                                />
                            </svg>
                            <span>AI-integrated matchmaking</span>
                        </span>
                        <span className="relative inline-flex shrink-0 items-center">
                            <input
                                type="checkbox"
                                disabled
                                role="switch"
                                checked={fastMatchmaking}
                                onChange={(e) => setFastMatchmaking(e.target.checked)}
                                className="peer sr-only"
                                aria-label="Fast matchmaking"
                            />
                            <span
                                className="relative flex h-7 w-12 items-center rounded-full bg-[#6b696f] p-0.5 transition-colors peer-checked:bg-[#4ce081]/85 peer-checked:[&>.thumb]:translate-x-[22px] peer-focus-visible:ring-2 peer-focus-visible:ring-[#c2c1ff]/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#131316]"
                                aria-hidden
                            >
                                <span className="thumb block h-6 w-6 translate-x-0 rounded-full bg-white shadow transition-transform duration-200 ease-out" />
                            </span>
                        </span>
                    </label>

                    <div className="space-y-3">
                        {filteredPlayers.map((player) => (
                            <article
                                key={player.name}
                                className="flex items-center justify-between rounded-2xl bg-[#1b1b1e] p-4 transition-colors hover:bg-[#1f1f22]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#353438] text-sm font-bold text-[#e4e1e6]">
                                        {player.initials}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="truncate text-sm font-extrabold tracking-wide text-[#e4e1e6]">
                                            {player.name}
                                        </h4>
                                        <p className="flex items-center">
                                            <TrophyIcon className="mr-1 inline-block size-3 shrink-0 text-[#c8c5d2]" />
                                            <span className="text-sm text-[#c8c5d2]">{player.tier}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-1 text-right">
                                    <p className={`text-xs font-bold ${player.statusColor}`}>{player.status}</p>
                                    <p className="text-xs text-[#c8c5d2]">{player.detail}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            </main>

            <DashboardMobileNav />
        </div>
    );
}
