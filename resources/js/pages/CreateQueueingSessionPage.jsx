import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../css/dashboard-v2.css';
import { fetchSports } from '../api/gameSession.js';
import { postCreateQueueingSession } from '../api/queueingSession.js';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav.jsx';
import { SportCard } from '../components/dashboard/SportCard.jsx';
import { DashboardV2Header } from '../components/dashboard/DashboardV2Header.jsx';
import { QueueingSessionSkipScoresField } from '../components/queueing/QueueingSessionSkipScoresField.jsx';
import {
    DEFAULT_AUTO_MATCH_CRITERIA,
    QueueingSessionAutoMatchCriteriaField,
    autoMatchCriteriaHasAny,
    normalizeAutoMatchCriteria,
} from '../components/queueing/QueueingSessionAutoMatchCriteriaField.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function CreateQueueingSessionPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [sports, setSports] = useState(/** @type {import('../api/gameSession.js').SportRow[]} */ ([]));
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [queueName, setQueueName] = useState('');
    const [sportSlug, setSportSlug] = useState('');
    const [matchType, setMatchType] = useState(/** @type {'singles' | 'doubles'} */ ('singles'));
    const [winPoints, setWinPoints] = useState('30');
    const [lossPoints, setLossPoints] = useState('8');
    const [skipScores, setSkipScores] = useState(false);
    const [autoMatchCriteria, setAutoMatchCriteria] = useState(DEFAULT_AUTO_MATCH_CRITERIA);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoadError('');
            setLoading(true);
            try {
                const rows = await fetchSports();
                if (!cancelled) {
                    setSports(rows);
                    if (rows.length > 0) {
                        setSportSlug((prev) => (rows.some((s) => s.slug === prev) ? prev : rows[0].slug));
                    }
                }
            } catch {
                if (!cancelled) setLoadError('Could not load sports.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitError('');
        const w = Number.parseInt(winPoints, 10);
        const l = Number.parseInt(lossPoints, 10);
        if (!Number.isFinite(w) || w < 0 || !Number.isFinite(l) || l < 0) {
            setSubmitError('Enter valid point numbers.');
            return;
        }
        const name = queueName.trim();
        if (!name) {
            setSubmitError('Enter a name for this queue.');
            return;
        }
        if (!autoMatchCriteriaHasAny(autoMatchCriteria)) {
            setSubmitError('Select at least one auto-match criterion.');
            return;
        }
        setSubmitting(true);
        try {
            const normalizedCriteria = normalizeAutoMatchCriteria(autoMatchCriteria);
            const data = await postCreateQueueingSession({
                queue_name: name,
                sport_slug: sportSlug,
                match_type: matchType,
                win_points: w,
                loss_points: l,
                skip_scores: skipScores,
                ...normalizedCriteria,
            });
            navigate(`/queueing-session/${data.id}`, { replace: true });
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'Could not create session.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="dashboard-v2-shell bg-[#131316] font-sans text-[#e4e1e6] selection:bg-[#c2c1ff] selection:text-[#282671]">
            <DashboardV2Header user={user} profileLoading={false} />
            <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-32 pt-24 md:max-w-3xl md:px-8 md:pb-20 lg:max-w-5xl">
                <h1 className="mb-2 text-2xl font-extrabold tracking-tight md:text-3xl lg:text-4xl">
                    Create <span className="text-[#c2c1ff]">New Queue</span>
                </h1>
                <p className="mb-8 text-sm text-[#c8c5d2]/80 md:max-w-2xl md:text-base">
                    You will be the queue master. After creating the session, you can add players and start matches when the players are ready.
                </p>

                {loadError ? (
                    <p className="mb-4 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">{loadError}</p>
                ) : null}

                {loading ? (
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-[120px] animate-pulse rounded-xl bg-[#1b1b1e]"
                                aria-hidden
                            />
                        ))}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4 space-y-6">
                            <div>
                                <label className="mb-4 block text-xs font-bold uppercase tracking-wide text-[#918f9c]">Sport</label>
                                {sports.length === 0 ? (
                                    <p className="text-sm text-[#918f9c]">No sports configured. Run database migrations.</p>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                        {sports.map((s) => (
                                            <SportCard
                                                key={s.id}
                                                name={s.name}
                                                icon={s.icon}
                                                symbol={s.code}
                                                selected={sportSlug === s.slug}
                                                onClick={() => setSportSlug(s.slug)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label htmlFor="queue-name" className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#918f9c]">
                                    Queue Name
                                </label>
                                <input
                                    id="queue-name"
                                    type="text"
                                    value={queueName}
                                    onChange={(e) => setQueueName(e.target.value)}
                                    maxLength={120}
                                    placeholder="e.g. Friday night doubles"
                                    autoComplete="off"
                                    className="w-full rounded-lg border border-[#484848] bg-[#131316] outline-none focus:ring-1 focus:ring-green-400 px-3 py-2.5 text-sm placeholder:text-[#918f9c]/60 md:py-3 md:text-base"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#918f9c]">Match type</label>
                                <div className="flex">
                                    {(['singles', 'doubles']).map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setMatchType(/** @type {'singles' | 'doubles'} */ (t))}
                                            className={
                                                matchType === t
                                                    ? 'flex-1 rounded-full rounded-l-none bg-[#4ce081] py-2.5 text-sm font-bold text-[#003919]'
                                                    : 'flex-1 rounded-full rounded-r-none border border-[#484848] bg-[#131316] py-2.5 text-sm font-semibold text-[#e4e1e6]'
                                            }
                                            style={{
                                                borderRadius: t === 'singles' ? '10px 0 0 10px' : '0 10px 10px 0',
                                                borderLeft: t === 'singles' ? 'none' : '1px solid #2a2a2d',
                                                borderRight: t === 'singles' ? '1px solid #2a2a2d' : 'none',
                                            }}
                                        >
                                            {t === 'singles' ? 'Singles' : 'Doubles'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#918f9c]">Win points</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={30}
                                        value={winPoints}
                                        onChange={(e) => setWinPoints(e.target.value)}
                                        className="w-full rounded-lg border border-[#484848] bg-[#131316] px-3 py-2.5 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#918f9c]">Loss points</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={15}
                                        value={lossPoints}
                                        onChange={(e) => setLossPoints(e.target.value)}
                                        className="w-full rounded-lg border border-[#484848] bg-[#131316] px-3 py-2.5 text-sm"
                                    />
                                </div>
                            </div>
                            <QueueingSessionSkipScoresField checked={skipScores} onChange={setSkipScores} disabled={submitting} />
                            <QueueingSessionAutoMatchCriteriaField
                                value={autoMatchCriteria}
                                onChange={setAutoMatchCriteria}
                                disabled={submitting}
                            />
                            {submitError ? (
                                <p className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">{submitError}</p>
                            ) : null}
                        </div>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="rt-kinetic-gradient w-full shrink-0 rounded-xl px-12 py-5 text-xl font-black italic tracking-tight text-[#211e6a] shadow-2xl transition-transform enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {submitting ? 'Creating…' : 'Create Queue'}
                        </button>
                    </form>
                )}
            </main>
            <DashboardMobileNav />
        </div>
    );
}
