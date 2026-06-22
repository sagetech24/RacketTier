import { useEffect, useMemo, useState } from 'react';
import '../../css/dashboard-v2.css';
import { fetchRankings } from '../api/ranking.js';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav.jsx';
import { DashboardV2Header } from '../components/dashboard/DashboardV2Header.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { useSportsQuery } from '../hooks/queries/useSportsQuery.js';

const DEFAULT_SPORT_SLUG = 'pickleball';
const REST_VISIBLE_COUNT = 10;

function formatRating(rating) {
    return (rating / 100)?.toLocaleString?.(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }) ?? '0.00';
}

function isCurrentUserRow(row, userId) {
    return userId != null && row.user?.id === userId;
}

export function RankingPage() {
    const { user } = useAuth();
    const { data: sports = [] } = useSportsQuery();
    const [activeFilter, setActiveFilter] = useState(null);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 350);
    const [rankings, setRankings] = useState([]);
    const [viewerRanking, setViewerRanking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const filterOptions = useMemo(() => {
        return sports.map((sport) => ({
            id: String(sport.id),
            label: sport.name,
        }));
    }, [sports]);

    useEffect(() => {
        if (sports.length === 0) {
            return;
        }
        const defaultSport =
            sports.find((sport) => sport.slug === DEFAULT_SPORT_SLUG) ?? sports[0];
        if (defaultSport) {
            setActiveFilter((current) => current ?? String(defaultSport.id));
        }
    }, [sports]);

    useEffect(() => {
        if (!activeFilter) {
            return undefined;
        }

        let cancelled = false;

        async function loadRankings() {
            setLoading(true);
            setError('');
            try {
                const { data, viewerRanking: viewerRow } = await fetchRankings({
                    sportId: Number(activeFilter),
                    search: debouncedSearch,
                    limit: 100,
                });
                if (!cancelled) {
                    setRankings(data);
                    setViewerRanking(viewerRow);
                }
            } catch {
                if (!cancelled) {
                    setError('Could not load ranking data right now.');
                    setRankings([]);
                    setViewerRanking(null);
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
    }, [activeFilter, debouncedSearch]);

    const topThree = useMemo(() => rankings.slice(0, 3), [rankings]);
    const restTopTen = useMemo(() => rankings.slice(3, 3 + REST_VISIBLE_COUNT), [rankings]);

    const displayedUserIds = useMemo(() => {
        const ids = new Set();
        for (const row of topThree) {
            ids.add(row.user.id);
        }
        for (const row of restTopTen) {
            ids.add(row.user.id);
        }
        return ids;
    }, [topThree, restTopTen]);

    const appendCurrentUser = useMemo(() => {
        if (!user?.id || search.trim() !== '') {
            return null;
        }

        const fromList = rankings.find((row) => row.user.id === user.id);
        const candidate = fromList ?? viewerRanking;
        if (!candidate || displayedUserIds.has(candidate.user.id)) {
            return null;
        }

        return candidate;
    }, [user?.id, search, rankings, viewerRanking, displayedUserIds]);

    const currentUserHighlight =
        'ring-2 ring-[#c2c1ff]/60 bg-linear-to-br from-[#c2c1ff]/30 to-[#c2c1ff]/10';

    return (
        <div className="dashboard-v2-shell bg-[#131316] font-sans text-[#e4e1e6] selection:bg-[#c2c1ff] selection:text-[#282671]">
            <DashboardV2Header user={user} profileLoading={false} />

            <main className="mx-auto min-h-screen max-w-md px-6 pb-32 pt-36">
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
                                            ? 'shrink-0 rounded-full bg-[#4ce081] px-4 py-2 text-xs font-bold whitespace-nowrap text-[#003919]'
                                            : 'shrink-0 cursor-pointer rounded-full bg-[#353438] px-4 py-2 text-xs font-medium whitespace-nowrap text-[#e4e1e6] transition-colors hover:bg-[#1f1f22]'
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

                    {!loading && topThree.map((row, idx) => {
                        const isYou = isCurrentUserRow(row, user?.id);
                        return (
                        <div
                            key={`${row.user.id}-${row.sport.id}-${row.rank}`}
                            className={
                                idx === 0
                                    ? 'overflow-hidden rounded-xl bg-linear-to-br from-[#c2c1ff]/10 to-transparent p-px'
                                    : idx === 1
                                      ? 'overflow-hidden rounded-xl bg-linear-to-br from-[#4ce081]/5 to-transparent p-px'
                                      : isYou
                                        ? 'overflow-hidden rounded-xl bg-linear-to-br from-[#c2c1ff]/20 to-transparent p-px'
                                        : ''
                            }
                        >
                            <div
                                className={`relative flex items-center gap-4 rounded-xl bg-[#1f1f22] p-4${isYou ? ` ${currentUserHighlight}` : ''}`}
                            >
                                <div className="flex flex-col items-start">
                                    <div className='min-w-6 text-2xl font-extrabold'>
                                        <svg className="opacity-70" fill={idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : '#cd7f32'} height="20" width="20" viewBox="0 0 246.001 246.001" aria-hidden="true">
                                            <path d="M211.667,238.5c0,4.142-3.358,7.5-7.5,7.5h-163c-4.142,0-7.5-3.358-7.5-7.5v-16c0-4.142,3.358-7.5,7.5-7.5h163 c4.142,0,7.5,3.358,7.5,7.5V238.5z M241.748,0.74c-3.043-1.458-6.683-0.71-8.899,1.83l-59.492,68.199l-44.08-67.375 C127.891,1.277,125.53,0,123,0s-4.891,1.276-6.276,3.394L72.627,70.795L13.137,3.012C10.914,0.481,7.277-0.26,4.24,1.204 c-3.034,1.465-4.72,4.773-4.12,8.089l33,182.541c0.645,3.57,3.752,6.166,7.38,6.166h165c3.629,0,6.737-2.598,7.381-6.169l33-183 C246.48,5.512,244.788,2.2,241.748,0.74z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-bold text-[#e4e1e6]">
                                        {row.user.name}
                                        {isYou ? (
                                            <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-[#c2c1ff]">
                                                You
                                            </span>
                                        ) : null}
                                    </h3>
                                    <p className="text-[10px] uppercase tracking-widest text-[#c8c5d2]">
                                        {`${row.tier?.name ?? 'Zero'} Level`}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-extrabold text-[#c2c1ff] italic">
                                        {formatRating(row.rating)}
                                    </div>
                                    <div className="text-sm font-bold text-[#c8c5d2]">
                                        {`Tier ${row.tier?.tier_no ?? '0'}`}
                                    </div>
                                </div>
                            </div>
                        </div>
                        );
                    })}

                    <div className="flex flex-col gap-2">
                        {!loading && restTopTen.map((row) => {
                            const isYou = isCurrentUserRow(row, user?.id);
                            return (
                            <div
                                key={`${row.user.id}-${row.sport.id}-${row.rank}`}
                                className={`group flex items-center gap-4 rounded-xl p-4 transition-colors hover:bg-[#1b1b1e]${isYou ? ` ${currentUserHighlight}` : ''}`}
                            >
                                <div className="w-6 shrink-0 text-center font-bold text-[#c8c5d2] transition-colors group-hover:text-[#c2c1ff]">
                                    <span className="font-extrabold italic text-[#c8c5d2] text-2xl">
                                        {row.rank}
                                    </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-semibold text-[#e4e1e6]">
                                        {row.user.name}
                                        {isYou ? (
                                            <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-[#c2c1ff]">
                                                You
                                            </span>
                                        ) : null}
                                    </h4>
                                    <div className="flex items-center gap-2">
                                         <span className="text-[10px] uppercase tracking-widest text-[#c8c5d2]">
                                            {`${row.tier?.name ?? 'Zero'} Level`}
                                        </span>
                                    </div>
                                </div>
                                {/* <div className="pr-2 text-right">
                                    <div className="text-sm font-bold text-[#e4e1e6]">{row.tier?.name ?? 'Unranked'}</div>
                                    <div className="text-[10px] text-[#c8c5d2]">{row.wallet_balance.toLocaleString()} pts</div>
                                </div> */}
                                <div className="text-right">
                                    <div className="text-xl font-extrabold text-[#c2c1ff] italic">
                                        {formatRating(row.rating)}
                                    </div>
                                    <div className="text-sm font-bold text-[#c8c5d2]">
                                        {`Tier ${row.tier?.tier_no ?? '0'}`}
                                    </div>
                                </div>
                            </div>
                            );
                        })}

                        {!loading && appendCurrentUser ? (
                            <>
                                <div className="my-2 flex items-center gap-3 px-1">
                                    <div className="h-px flex-1 bg-[#353438]" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#918f9c]">
                                        Your rank
                                    </span>
                                    <div className="h-px flex-1 bg-[#353438]" />
                                </div>
                                <div
                                    key={`${appendCurrentUser.user.id}-${appendCurrentUser.sport.id}-${appendCurrentUser.rank}-you`}
                                    className={`group flex items-center gap-4 rounded-xl p-4 ${currentUserHighlight}`}
                                >
                                    <div className="w-6 shrink-0 text-center font-bold text-[#c2c1ff]">
                                        <span className="text-2xl font-extrabold italic">
                                            {appendCurrentUser.rank}
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-sm font-semibold text-[#e4e1e6]">
                                            {appendCurrentUser.user.name}
                                            <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-[#c2c1ff]">
                                                You
                                            </span>
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-[#c8c5d2]">
                                                {appendCurrentUser.sport.name ?? 'Unknown Sport'}
                                            </span>
                                            <span className="h-1 w-1 shrink-0 rounded-full bg-[#474651]" />
                                            <span className="text-[10px] text-[#c8c5d2]">
                                                {appendCurrentUser.sport.code ?? '--'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-extrabold text-[#c2c1ff] italic">
                                            {formatRating(appendCurrentUser.rating)}
                                        </div>
                                        <div className="text-sm font-bold text-[#c8c5d2]">
                                            {`Tier ${appendCurrentUser.tier?.tier_no ?? '0'}`}
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>
            </main>

            <DashboardMobileNav />
        </div>
    );
}
