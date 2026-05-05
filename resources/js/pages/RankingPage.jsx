import { useEffect, useMemo, useState } from 'react';
import '../../css/dashboard-v2.css';
import { fetchRankings } from '../api/ranking.js';
import { fetchSports } from '../api/gameSession.js';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav.jsx';
import { DashboardV2Header } from '../components/dashboard/DashboardV2Header.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const GLOBAL_FILTER_ID = 'all';

export function RankingPage() {
    const { user } = useAuth();
    const [sports, setSports] = useState([]);
    const [activeFilter, setActiveFilter] = useState(GLOBAL_FILTER_ID);
    const [search, setSearch] = useState('');
    const [rankings, setRankings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const filterOptions = useMemo(() => {
        return [{ id: GLOBAL_FILTER_ID, label: 'Global' }].concat(
            sports.map((sport) => ({
                id: String(sport.id),
                label: sport.name,
            }))
        );
    }, [sports]);

    useEffect(() => {
        let cancelled = false;

        async function loadSports() {
            try {
                const rows = await fetchSports();
                if (!cancelled) {
                    setSports(rows);
                }
            } catch {
                // Ranking page still works without sports filter options.
            }
        }

        loadSports();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function loadRankings() {
            setLoading(true);
            setError('');
            try {
                const data = await fetchRankings({
                    sportId: activeFilter === GLOBAL_FILTER_ID ? null : Number(activeFilter),
                    search,
                    limit: 100,
                });
                if (!cancelled) {
                    setRankings(data);
                }
            } catch {
                if (!cancelled) {
                    setError('Could not load ranking data right now.');
                    setRankings([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadRankings();
        return () => {
            cancelled = true;
        };
    }, [activeFilter, search]);

    const topThree = rankings.slice(0, 3);
    const rest = rankings.slice(3);

    return (
        <div className="min-h-[max(884px,100dvh)] bg-[#131316] pb-24 text-[#e4e1e6] selection:bg-[#c2c1ff] selection:text-[#282671]">
            <DashboardV2Header user={user} profileLoading={false} />

            <main className="mx-auto max-w-md px-6 pt-20">
                <section className="mb-10 mt-8">
                    <h2 className="text-4xl font-extrabold tracking-tighter text-[#e4e1e6]">Rankings</h2>
                    <p className="mt-4 max-w-[80%] text-sm leading-relaxed text-[#c8c5d2]">
                        Live leaderboard from recorded match ratings.
                    </p>
                </section>

                <div className="mb-8 flex flex-col gap-4">
                    <div className="group relative">
                        <div className="pointer-events-none absolute inset-y-0 left-4 z-10 flex items-center text-[#918f9c]">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="1.5"
                                stroke="currentColor"
                                className="size-6"
                                aria-hidden
                            >
                                <path d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                        </div>
                        <input
                            type="search"
                            placeholder="Search players..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-xl border border-[#353438] bg-[#0e0e11] py-4 pl-12 pr-4 text-sm text-[#e4e1e6] transition-all placeholder:text-[#918f9c] focus:ring-1 focus:ring-[#c2c1ff]/20"
                            aria-label="Search players"
                        />
                    </div>
                    <div className="rt-scroll-inline flex gap-2 overflow-x-auto pb-2">
                        {filterOptions.map((filter) => {
                            const isActive = activeFilter === filter.id;
                            return (
                                <button
                                    key={filter.id}
                                    type="button"
                                    onClick={() => setActiveFilter(filter.id)}
                                    className={
                                        isActive
                                            ? 'shrink-0 rounded-full bg-[#4ce081] px-5 py-2 text-xs font-bold whitespace-nowrap text-[#003919]'
                                            : 'shrink-0 cursor-pointer rounded-full bg-[#353438] px-5 py-2 text-xs font-medium whitespace-nowrap text-[#e4e1e6] transition-colors hover:bg-[#1f1f22]'
                                    }
                                >
                                    {filter.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    {error ? (
                        <div className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                            {error}
                        </div>
                    ) : null}

                    {loading ? (
                        Array.from({ length: 4 }).map((_, idx) => (
                            <div key={`ranking-skeleton-${idx}`} className="rounded-xl bg-[#1f1f22] p-4">
                                <div className="h-12 animate-pulse rounded-lg bg-[#2a2a2d]" />
                            </div>
                        ))
                    ) : null}

                    {!loading && rankings.length === 0 ? (
                        <div className="rounded-xl bg-[#1f1f22] px-4 py-6 text-center text-sm text-[#c8c5d2]">
                            No ranking data yet for this filter.
                        </div>
                    ) : null}

                    {!loading && topThree.map((row, idx) => (
                        <div
                            key={`${row.user.id}-${row.sport.id}-${row.rank}`}
                            className={
                                idx === 0
                                    ? 'overflow-hidden rounded-xl bg-linear-to-br from-[#c2c1ff]/10 to-transparent p-px'
                                    : idx === 1
                                      ? 'overflow-hidden rounded-xl bg-linear-to-br from-[#4ce081]/5 to-transparent p-px'
                                      : ''
                            }
                        >
                            <div className="relative flex items-center gap-4 rounded-xl bg-[#1f1f22] p-4">
                                <div className="flex flex-col items-start">
                                    <p className="text-[10px] font-medium text-[#c8c5d2]">Ratings:</p>
                                    <div
                                        className={
                                            idx === 0
                                                ? 'min-w-12 text-2xl font-extrabold italic text-[#c2c1ff]/40'
                                                : idx === 1
                                                ? 'min-w-12 text-2xl font-extrabold italic text-[#c8c5d2]/20'
                                                : 'min-w-12 text-xl font-extrabold italic text-[#c8c5d2]/20'
                                        }
                                    >
                                        {(row.rating / 100)?.toLocaleString?.(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        }) ?? '0.00'}
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-bold text-[#e4e1e6]">{row.user.name}</h3>
                                    <p className="text-[10px] uppercase tracking-widest text-[#c8c5d2]">
                                        {row.sport.name ?? 'Unknown Sport'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-extrabold text-[#c2c1ff] italic">
                                        {`Tier ${row.tier?.tier_no ?? '0'}`}
                                    </div>
                                    <div className="text-[10px] font-medium text-[#c8c5d2]">
                                        {`${row.tier?.name ?? 'Zero'} Level`}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className="mt-4 flex flex-col">
                        {!loading && rest.map((row) => (
                            <div
                                key={`${row.user.id}-${row.sport.id}-${row.rank}`}
                                className="group flex items-center gap-4 rounded-xl px-2 py-4 transition-colors hover:bg-[#1b1b1e]"
                            >
                                <div className="w-14 shrink-0 text-center font-bold text-[#c8c5d2] transition-colors group-hover:text-[#c2c1ff]">
                                    <span className="font-extrabold italic text-[#c8c5d2]/20 text-xl">
                                        {/* {row.rank} */}
                                        {(row.rating / 100)?.toLocaleString?.(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        }) ?? '0.00'}
                                    </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-semibold text-[#e4e1e6]">{row.user.name}</h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-[#c8c5d2]">{row.sport.name ?? 'Unknown Sport'}</span>
                                        <span className="h-1 w-1 shrink-0 rounded-full bg-[#474651]" />
                                        <span className="text-[10px] text-[#c8c5d2]">{row.sport.code ?? '--'}</span>
                                    </div>
                                </div>
                                {/* <div className="pr-2 text-right">
                                    <div className="text-sm font-bold text-[#e4e1e6]">{row.tier?.name ?? 'Unranked'}</div>
                                    <div className="text-[10px] text-[#c8c5d2]">{row.wallet_balance.toLocaleString()} pts</div>
                                </div> */}
                                <div className="text-right">
                                    <div className="text-sm font-extrabold text-[#c2c1ff] italic">
                                        {`Tier ${row.tier?.tier_no ?? '0'}`}
                                    </div>
                                    <div className="text-[10px] font-medium text-[#c8c5d2]">
                                        {`${row.tier?.name ?? 'Zero'} Level`}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        className="mt-8 mb-12 w-full rounded-xl bg-[#353438] py-4 text-xs font-bold tracking-widest text-[#e4e1e6] uppercase transition-all hover:bg-[#353438]/90"
                        onClick={() => setSearch('')}
                    >
                        Reset Search
                    </button>
                </div>
            </main>

            <DashboardMobileNav />
        </div>
    );
}
