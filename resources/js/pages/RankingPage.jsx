import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../components/app/AppShell.jsx';
import { EmptyState } from '../components/app/EmptyState.jsx';
import { PageHeader } from '../components/app/PageHeader.jsx';
import { MaterialIcon } from '../components/dashboard/MaterialIcon.jsx';
import { RankingListRow } from '../components/ranking/RankingListRow.jsx';
import { RankingListLoading, RankingPageLoading } from '../components/ranking/RankingPageLoading.jsx';
import { RankingPodiumCard } from '../components/ranking/RankingPodiumCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import {
    RANKINGS_DEFAULT_LIMIT,
    usePrefetchRankings,
    useRankingsQuery,
} from '../hooks/queries/useRankingsQuery.js';
import { useSportsQuery } from '../hooks/queries/useSportsQuery.js';

const DEFAULT_SPORT_SLUG = 'pickleball';
const REST_VISIBLE_COUNT = 10;

function isCurrentUserRow(row, userId) {
    return userId != null && row.user?.id === userId;
}

export function RankingPage() {
    const { user } = useAuth();
    const { data: sports = [] } = useSportsQuery();
    const prefetchRankings = usePrefetchRankings();
    const [activeFilter, setActiveFilter] = useState(null);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 350);

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

    const {
        data: rankingsResponse,
        isPending,
        isError,
    } = useRankingsQuery({
        sportId: activeFilter ? Number(activeFilter) : null,
        search: debouncedSearch,
        limit: RANKINGS_DEFAULT_LIMIT,
        enabled: Boolean(activeFilter),
    });

    const rankings = rankingsResponse?.data ?? [];
    const viewerRanking = rankingsResponse?.viewerRanking ?? null;

    // Prefetch other sports while idle so chip switches hit cache.
    useEffect(() => {
        if (!activeFilter || sports.length === 0) {
            return undefined;
        }

        const run = () => {
            for (const sport of sports) {
                if (String(sport.id) === activeFilter) {
                    continue;
                }
                prefetchRankings(sport.id);
            }
        };

        if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
            const idleId = window.requestIdleCallback(run, { timeout: 2500 });
            return () => window.cancelIdleCallback(idleId);
        }

        const timeoutId = window.setTimeout(run, 400);
        return () => window.clearTimeout(timeoutId);
    }, [activeFilter, sports, prefetchRankings]);

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

    const showInitialSkeleton = activeFilter == null;
    const showListSkeleton = Boolean(activeFilter) && isPending;
    const contentKey = `${activeFilter}-${debouncedSearch}`;

    return (
        <AppShell user={user}>
            <PageHeader
                eyebrow="Leaderboard"
                title="Global Rankings"
                subtitle="Live skill ratings from recorded matches. Climb the board by winning against stronger opponents."
                action={
                    !showInitialSkeleton && !showListSkeleton && rankings.length > 0 ? (
                        <span className="rt-ranking-stats rt-ranking-stats--enter">
                            <MaterialIcon name="groups" className="text-sm!" />
                            <span>
                                <strong>{rankings.length}</strong> ranked
                            </span>
                        </span>
                    ) : null
                }
            />

            {showInitialSkeleton ? <RankingPageLoading /> : null}

            {!showInitialSkeleton ? (
                <>
                    <div className="rt-ranking-toolbar rt-ranking-toolbar--enter mb-8 md:mb-6">
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
                                        onMouseEnter={() => prefetchRankings(Number(filter.id))}
                                        onFocus={() => prefetchRankings(Number(filter.id))}
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
                        {isError ? <div className="rt-alert-error">Could not load ranking data right now.</div> : null}

                        {showListSkeleton ? <RankingListLoading /> : null}

                        {!isPending && !isError && rankings.length === 0 ? (
                            <EmptyState
                                icon="leaderboard"
                                title="No rankings yet"
                                description={`No players ranked for ${activeSportLabel} yet. Rankings appear after members finish recorded matches.`}
                                actionLabel="Join a queue"
                                actionTo="/queueing-session"
                            />
                        ) : null}

                        {!showListSkeleton && rankings.length > 0 ? (
                            <div key={contentKey} className="rt-ranking-content">
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
