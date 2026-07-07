import { useEffect, useMemo, useState } from 'react';
import { fetchRankings } from '../api/ranking.js';
import { AppShell } from '../components/app/AppShell.jsx';
import { EmptyState } from '../components/app/EmptyState.jsx';
import { PageHeader } from '../components/app/PageHeader.jsx';
import { MaterialIcon } from '../components/dashboard/MaterialIcon.jsx';
import { RankingListRow } from '../components/ranking/RankingListRow.jsx';
import { RankingPageLoading } from '../components/ranking/RankingPageLoading.jsx';
import { RankingPodiumCard } from '../components/ranking/RankingPodiumCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { useSportsQuery } from '../hooks/queries/useSportsQuery.js';

const DEFAULT_SPORT_SLUG = 'pickleball';
const REST_VISIBLE_COUNT = 10;

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

    const activeSportLabel = useMemo(() => {
        return filterOptions.find((option) => option.id === activeFilter)?.label ?? 'Sport';
    }, [activeFilter, filterOptions]);

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

    const isInitialLoading = loading && rankings.length === 0 && !error;
    const isRefreshing = loading && rankings.length > 0;
    const contentKey = `${activeFilter}-${debouncedSearch}`;

    return (
        <AppShell user={user}>
            <PageHeader
                eyebrow="Leaderboard"
                title="Rankings"
                subtitle="Live skill ratings from recorded matches. Climb the board by winning against stronger opponents."
                action={
                    !isInitialLoading && rankings.length > 0 ? (
                        <span className="rt-ranking-stats">
                            <MaterialIcon name="groups" className="text-sm!" />
                            <span>
                                <strong>{rankings.length}</strong> ranked
                            </span>
                        </span>
                    ) : null
                }
            />

            {isInitialLoading ? <RankingPageLoading /> : null}

            {!isInitialLoading ? (
                <>
                    <div className="rt-ranking-toolbar mb-8 md:mb-6">
                        <div className="rt-ranking-toolbar-search group relative">
                            <div className="pointer-events-none absolute inset-y-0 left-4 z-10 flex items-center text-[#918f9c]">
                                <MaterialIcon name="search" className="text-xl!" />
                            </div>
                            <input
                                type="search"
                                placeholder="Search players…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="rt-input"
                                aria-label="Search players"
                            />
                        </div>
                        <div
                            className="rt-ranking-toolbar-filters rt-scroll-inline flex sm:flex-wrap gap-2 overflow-x-auto pb-2 md:overflow-visible md:pb-0"
                            role="tablist"
                            aria-label="Filter by sport"
                        >
                            {filterOptions.map((filter) => {
                                const isActive = activeFilter === filter.id;
                                return (
                                    <button
                                        key={filter.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={isActive}
                                        onClick={() => setActiveFilter(filter.id)}
                                        className={['rt-chip md:text-sm text-xs px-3 py-1', isActive ? 'rt-chip-active' : 'rt-chip-idle'].join(
                                            ' ',
                                        )}
                                    >
                                        {filter.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        {error ? <div className="rt-alert-error">{error}</div> : null}

                        {!loading && rankings.length === 0 ? (
                            <EmptyState
                                icon="leaderboard"
                                title="No rankings yet"
                                description={`No players ranked for ${activeSportLabel} yet. Rankings appear after members finish recorded matches.`}
                                actionLabel="Join a queue"
                                actionTo="/queueing-session"
                            />
                        ) : null}

                        {rankings.length > 0 ? (
                            <div
                                key={contentKey}
                                className={['rt-ranking-content', isRefreshing ? 'rt-ranking-content--refreshing' : '']
                                    .filter(Boolean)
                                    .join(' ')}
                                aria-busy={isRefreshing}
                            >
                                {topThree.length > 0 ? (
                                    <section className="mb-6" aria-label="Top three players">
                                        <p className="rt-section-eyebrow">Podium</p>
                                        <div className="rt-ranking-podium">
                                            {topThree.map((row, idx) => (
                                                <RankingPodiumCard
                                                    key={`${row.user.id}-${row.sport.id}-${row.rank}`}
                                                    row={row}
                                                    place={idx}
                                                    isYou={isCurrentUserRow(row, user?.id)}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                ) : null}

                                {restTopTen.length > 0 ? (
                                    <section aria-label="Rankings list">
                                        <p className="rt-section-eyebrow">Top players</p>
                                        <div className="rt-ranking-list flex flex-col gap-2 md:gap-3">
                                            {restTopTen.map((row) => (
                                                <RankingListRow
                                                    key={`${row.user.id}-${row.sport.id}-${row.rank}`}
                                                    row={row}
                                                    isYou={isCurrentUserRow(row, user?.id)}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                ) : null}

                                {appendCurrentUser ? (
                                    <>
                                        <div className="rt-ranking-divider my-3">
                                            <span>Your rank</span>
                                        </div>
                                        <RankingListRow
                                            row={appendCurrentUser}
                                            isYou
                                            variant="viewer"
                                        />
                                    </>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </>
            ) : null}
        </AppShell>
    );
}
