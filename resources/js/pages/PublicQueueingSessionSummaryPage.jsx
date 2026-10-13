import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchPublicQueueingSessionSummary } from '../api/publicQueueingSession.js';
import { AppShell } from '../components/app/AppShell.jsx';
import { EmptyState } from '../components/app/EmptyState.jsx';
import { MaterialIcon } from '../components/dashboard/MaterialIcon.jsx';
import { SportIcon } from '../components/dashboard/SportIcon.jsx';
import { QueueingSessionDashboardLoading } from '../components/queueing/QueueingSessionDashboardLoading.jsx';
import { QueueingSessionFinishedMatches } from '../components/queueing/QueueingSessionFinishedMatches.jsx';
import { QueueingSessionListRow } from '../components/queueing/QueueingSessionListRow.jsx';
import { QueueingSessionPodiumCard } from '../components/queueing/QueueingSessionPodiumCard.jsx';
import { sessionRequiresSkillLevel } from '../components/queueing/skillLevelUtils.js';
import { useAuth } from '../context/AuthContext.jsx';
import { sortFinishedMatchesRecentFirst } from '../lib/queueingMatchDisplay.js';

/**
 * @param {{ label: string, value: number | string }} props
 */
function SummaryStatCard({ label, value }) {
    return (
        <div className="rt-qs-dash-summary-stat rounded-xl border border-white/5 bg-[#1b1b1e] px-3 py-3 md:px-4 md:py-3.5">
            <dt className="md:text-[10px] text-[7px] font-bold uppercase tracking-widest text-[#918f9c]">{label}</dt>
            <dd className="mt-1 text-2xl font-extrabold tabular-nums text-[#e4e1e6]">{value}</dd>
        </div>
    );
}

/**
 * @param {string | null | undefined} value
 */
function formatWhen(value) {
    if (!value) return 'N/A';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
}

export function PublicQueueingSessionSummaryPage() {
    const { publicKey } = useParams();
    const { user } = useAuth();
    const [payload, setPayload] = useState(
        /** @type {import('../api/publicQueueingSession.js').PublicQueueingSessionSummary | null} */ (null),
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tab, setTab] = useState(/** @type {'players' | 'matches'} */ ('players'));

    useEffect(() => {
        if (!publicKey) {
            setError('This summary is not available.');
            setLoading(false);
            return undefined;
        }

        let cancelled = false;
        (async () => {
            setLoading(true);
            setError('');
            try {
                const data = await fetchPublicQueueingSessionSummary(publicKey);
                if (!cancelled) setPayload(data);
            } catch (err) {
                if (!cancelled) {
                    setPayload(null);
                    setError(err instanceof Error ? err.message : 'Could not load this summary.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [publicKey]);

    const session = payload?.session ?? null;
    const players = payload?.summary?.players ?? [];
    const totals = payload?.summary?.totals;
    const matches = useMemo(
        () => sortFinishedMatchesRecentFirst(payload?.matches ?? []),
        [payload?.matches],
    );
    const topThree = players.slice(0, 3);
    const rest = players.slice(3);
    const showSkillLevel = sessionRequiresSkillLevel(session);
    const title = session?.queue_name?.trim() || `${session?.sport?.name ?? 'Queue'} summary`;

    const summaryItems = totals
        ? [
              { label: 'Matches', value: totals.matches ?? 0 },
              { label: 'Players', value: totals.players ?? 0 },
              { label: 'Points awarded', value: totals.points_awarded ?? 0 },
          ]
        : [];

    return (
        <AppShell user={user}>
            {loading ? <QueueingSessionDashboardLoading /> : null}

            {!loading && error ? (
                <EmptyState
                    icon="link_off"
                    title="Summary unavailable"
                    description="This link only opens after the Queue Master ends the session, and the name in the link has to match."
                />
            ) : null}

            {!loading && session ? (
                <div className="rt-qs-dash-content space-y-8">
                    <header className="rt-qs-dash-header--enter">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                                <SportIcon icon={session.sport?.icon} className="text-[#4ce081]" />
                                <h1 className="text-3xl font-extrabold leading-none tracking-tighter capitalize md:text-4xl">
                                    {title}
                                </h1>
                            </div>
                            <span className="shrink-0 rounded-full bg-[#4ce081] px-2 py-0.5 text-sm font-bold text-[#1f753d]">
                                Finished
                            </span>
                        </div>
                        <div className="mb-2 grid gap-2 md:grid-cols-2 md:gap-6">
                            <div className="space-y-1">
                                <p className="text-sm capitalize text-[#c8c5d2]/90">
                                    <span className="font-bold">Game Type:</span> {session.match_type}
                                </p>
                                <p className="text-sm capitalize text-[#c8c5d2]/90">
                                    <span className="font-bold">Queue Master:</span> {session.queue_master_name || 'Unknown'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-[#c8c5d2]/90">
                                    <span className="font-bold">Started:</span> {formatWhen(session.started_at)}
                                </p>
                                <p className="text-sm text-[#c8c5d2]/90">
                                    <span className="font-bold">Ended:</span> {formatWhen(session.ended_at)}
                                </p>
                            </div>
                        </div>
                    </header>

                    <section className="rt-qs-dash-summary--enter" aria-label="Session summary">
                        <h2 className="mb-1 text-2xl font-extrabold leading-none tracking-tighter md:text-3xl">
                            Session <span className="text-[#c2c1ff]">Summary</span>
                        </h2>
                        <p className="mb-4 text-sm text-[#918f9c]">Final totals from this queue.</p>
                        {summaryItems.length > 0 ? (
                            <dl className="grid grid-cols-3 gap-3 md:gap-4">
                                {summaryItems.map((item) => (
                                    <SummaryStatCard key={item.label} label={item.label} value={item.value} />
                                ))}
                            </dl>
                        ) : (
                            <p className="text-sm text-[#918f9c]">Summary stats are unavailable.</p>
                        )}
                    </section>

                    <div>
                        <div className="rt-qs-session-nav" >
                            <div className="rt-qs-session-nav__tabs" role="tablist" aria-label="Session details">
                                <button
                                    type="button"
                                    role="tab"
                                    id="public-summary-tab-players"
                                    aria-selected={tab === 'players'}
                                    aria-controls="public-summary-panel-players"
                                    className={[
                                        'rt-qs-session-nav__tab cursor-pointer',
                                        tab === 'players' ? 'rt-qs-session-nav__tab--active' : '',
                                    ].filter(Boolean).join(' ')}
                                    onClick={() => setTab('players')}
                                >
                                    <MaterialIcon name="groups" className="rt-qs-session-nav__icon" />
                                    <span className="rt-qs-session-nav__label">Players ({players.length})</span>
                                </button>
                                <button
                                    type="button"
                                    role="tab"
                                    id="public-summary-tab-matches"
                                    aria-selected={tab === 'matches'}
                                    aria-controls="public-summary-panel-matches"
                                    className={[
                                        'rt-qs-session-nav__tab cursor-pointer',
                                        tab === 'matches' ? 'rt-qs-session-nav__tab--active' : '',
                                    ].filter(Boolean).join(' ')}
                                    onClick={() => setTab('matches')}
                                >
                                    <MaterialIcon name="sports_score" className="rt-qs-session-nav__icon" />
                                    <span className="rt-qs-session-nav__label">Matches ({matches.length})</span>
                                </button>
                            </div>
                        </div>

                        {tab === 'players' ? (
                            <section
                                id="public-summary-panel-players"
                                role="tabpanel"
                                aria-labelledby="public-summary-tab-players"
                                className="mt-6"
                            >
                                <div className="mb-5 flex items-end justify-between gap-3">
                                    <div>
                                        <h2 className="text-2xl font-extrabold leading-none tracking-tighter md:text-4xl">
                                            Leader<span className="text-[#c2c1ff]">board</span>
                                        </h2>
                                        <p className="mt-2 text-sm text-[#918f9c] md:text-lg">
                                            Final standings after the session ended.
                                        </p>
                                    </div>
                                </div>

                                {players.length === 0 ? (
                                    <EmptyState
                                        icon="groups"
                                        title="No players"
                                        description="This session ended without a roster."
                                    />
                                ) : null}

                                {topThree.length > 0 ? (
                                    <div className="mb-6">
                                        <div className="rt-ranking-podium">
                                            {topThree.map((player, idx) => (
                                                <QueueingSessionPodiumCard
                                                    key={`${player.rank}-${player.name}`}
                                                    player={player}
                                                    place={idx}
                                                    showSkillLevel={showSkillLevel}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ) : null}

                                {rest.length > 0 ? (
                                    <div className="rt-ranking-list flex flex-col gap-2 md:gap-3">
                                        {rest.map((player) => (
                                            <QueueingSessionListRow
                                                key={`${player.rank}-${player.name}`}
                                                player={player}
                                                showSkillLevel={showSkillLevel}
                                            />
                                        ))}
                                    </div>
                                ) : null}
                            </section>
                        ) : (
                            <section
                                id="public-summary-panel-matches"
                                role="tabpanel"
                                aria-labelledby="public-summary-tab-matches"
                                className="mt-6"
                                aria-label="Match history"
                            >
                                <h2 className="mb-1 text-2xl font-extrabold leading-none tracking-tighter md:text-3xl">
                                    Match <span className="text-[#c2c1ff]">history</span>
                                </h2>
                                <p className="mb-4 text-sm text-[#918f9c]">
                                    {matches.length === 0
                                        ? 'No matches were recorded in this session.'
                                        : `${matches.length} finished ${matches.length === 1 ? 'match' : 'matches'}.`}
                                </p>
                                <QueueingSessionFinishedMatches rows={matches} />
                            </section>
                        )}
                    </div>
                </div>
            ) : null}
        </AppShell>
    );
}
