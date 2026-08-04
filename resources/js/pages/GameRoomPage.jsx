import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { fetchFacilityGameRoom } from '../api/facilityGameRoom.js';
import { fetchGameSession, postFinishGameSessionMatch, postStartGameSessionMatch } from '../api/gameSession.js';
import { AppShell } from '../components/app/AppShell.jsx';
import { PageHeader } from '../components/app/PageHeader.jsx';
import { MaterialIcon } from '../components/dashboard/MaterialIcon.jsx';
import { SportIcon } from '../components/dashboard/SportIcon.jsx';
import { formatRating, formatRatingChange } from '../components/ranking/rankingUtils.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useVisibilityPolling } from '../hooks/useVisibilityPolling.js';

/**
 * @param {string} name
 */
function initialsFromName(name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function filterButtonClass(active) {
    return ['rt-chip min-h-11 px-4 py-2 text-xs', active ? 'rt-chip-active' : 'rt-chip-idle'].join(' ');
}

const PLAYER_LIST_INITIAL_COUNT = 4;
const PLAYER_LIST_LOAD_STEP = 4;

/**
 * Display label, sort order (lower first), and pill styles for facility session list rows.
 * Sort: ongoing → queueing/pending → finished → ended.
 *
 * @param {{ is_active?: boolean, status?: string }} session
 */
function facilitySessionListStatus(session) {
    if (!session.is_active) {
        return {
            label: 'Ended',
            sortRank: 4,
            textClass: 'text-[#ffb4ab]',
            pillClass: 'border border-[#ffb4ab]/35 bg-[#ffb4ab]/10',
        };
    }
    const raw = session.status ?? 'queueing';
    if (raw === 'ongoing') {
        return {
            label: 'Live',
            sortRank: 0,
            textClass: 'text-[#ffb4ab]',
            pillClass: 'border border-[#ffb4ab]/35 bg-[#ffb4ab]/10',
        };
    }
    if (raw === 'finished') {
        return {
            label: 'Finished',
            sortRank: 2,
            textClass: 'text-[#c8c5d2]',
            pillClass: 'border border-white/15 bg-white/5',
        };
    }
    if (raw === 'queueing' || raw === 'pending') {
        return {
            label: 'Queueing',
            sortRank: 1,
            textClass: 'text-[#4ce081]',
            pillClass: 'border border-[#4ce081]/35 bg-[#4ce081]/12',
        };
    }
    return {
        label: raw ? String(raw) : 'Queueing',
        sortRank: 3,
        textClass: 'text-[#c8c5d2]',
        pillClass: 'border border-white/15 bg-white/5',
    };
}

/**
 * @param {import('../api/gameSession.js').GameSessionDetail} session
 * @param {NonNullable<import('../api/gameSession.js').GameSessionDetail['players']>[number]} row
 * @param {number | undefined} currentUserId
 */
function mapQueueRow(session, row, currentUserId) {
    const hostId = session.created_by?.id;
    const isHost = hostId != null && row.user.id === hostId;
    const playing = row.is_playing;
    const waiting = row.is_waiting && !row.is_playing;
    const statusLabel = playing ? 'Currently Playing...' : waiting ? 'Waiting...' : 'Idle';
    const statusColor = playing ? 'text-orange-300' : waiting ? 'text-[#4ce081]' : 'text-[#918f9c]';

    return {
        key: String(row.id),
        initials: initialsFromName(row.user.name),
        name: row.user.name,
        tier: isHost ? 'Host' : `Queue #${row.queue_position}`,
        status: statusLabel,
        statusColor,
        detail: [
            row.user.email,
            typeof row.session_points === 'number' ? `${row.session_points} session pts` : null,
            typeof row.elo_rating === 'number' ? `Rating ${formatRating(row.elo_rating)}` : null,
        ]
            .filter(Boolean)
            .join(' · '),
        isSelf: currentUserId != null && row.user.id === currentUserId,
        _playing: playing,
        _waiting: waiting,
    };
}

export function GameRoomPage() {
    const { user } = useAuth();
    const { facilityId: facilityIdParam } = useParams();
    const [searchParams] = useSearchParams();
    const sessionIdParam = searchParams.get('session');

    const facilityIdNum = useMemo(() => {
        const raw = facilityIdParam ?? '';
        if (!/^\d+$/.test(raw)) {
            return null;
        }
        const n = Number.parseInt(raw, 10);
        return Number.isFinite(n) && n > 0 ? n : null;
    }, [facilityIdParam]);

    const [sessionDetail, setSessionDetail] = useState(
        /** @type {import('../api/gameSession.js').GameSessionDetail | null} */ (null),
    );
    const [lobby, setLobby] = useState(/** @type {import('../api/facilityGameRoom.js').FacilityGameRoomPayload | null} */ (null));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [playerSearch, setPlayerSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [startBusy, setStartBusy] = useState(false);
    const [startError, setStartError] = useState('');

    const [showFinishModal, setShowFinishModal] = useState(false);
    const [finishTeam1Score, setFinishTeam1Score] = useState('');
    const [finishTeam2Score, setFinishTeam2Score] = useState('');
    const [finishBusy, setFinishBusy] = useState(false);
    const [finishError, setFinishError] = useState('');
    const [visiblePlayerCount, setVisiblePlayerCount] = useState(PLAYER_LIST_INITIAL_COUNT);

    const gameRoomBase = facilityIdNum != null ? `/facility/${facilityIdNum}/game-room` : '/facilities';

    const { canStartMatch, anyPlaying, requiredPlayers, waitingForMatchCount, showFinishMatch } = useMemo(() => {
        if (!sessionDetail?.players) {
            return {
                canStartMatch: false,
                anyPlaying: false,
                requiredPlayers: 2,
                waitingForMatchCount: 0,
                showFinishMatch: false,
            };
        }
        const need = sessionDetail.match_type === 'doubles' ? 4 : 2;
        const players = sessionDetail.players;
        const playing = players.some((p) => p.is_playing);
        const waiting = players.filter((p) => p.is_waiting && !p.is_playing).length;
        const can =
            Boolean(sessionDetail.is_active && sessionDetail.is_host && !playing && waiting >= need);
        const ongoing = sessionDetail.status === 'ongoing';
        const finish =
            Boolean(sessionDetail.is_active && sessionDetail.is_host && ongoing && playing);
        return {
            canStartMatch: can,
            anyPlaying: playing,
            requiredPlayers: need,
            waitingForMatchCount: waiting,
            showFinishMatch: finish,
        };
    }, [sessionDetail]);

    const sessionStatusUi = useMemo(() => {
        if (!sessionDetail) {
            return { label: '', textClass: '' };
        }
        const m = facilitySessionListStatus(sessionDetail);
        return { label: m.label, textClass: m.textClass };
    }, [sessionDetail]);

    const sortedLobbySessions = useMemo(() => {
        if (!lobby?.sessions?.length) {
            return [];
        }
        return [...lobby.sessions].sort((a, b) => {
            const ma = facilitySessionListStatus(a);
            const mb = facilitySessionListStatus(b);
            if (ma.sortRank !== mb.sortRank) {
                return ma.sortRank - mb.sortRank;
            }
            return (b.id ?? 0) - (a.id ?? 0);
        });
    }, [lobby?.sessions]);

    const finishedLobbySessions = useMemo(() => {
        const rows = lobby?.finished_sessions;
        if (!rows?.length) {
            return [];
        }
        return [...rows].sort((a, b) => {
            const ea = a.ended_at ? Date.parse(a.ended_at) : 0;
            const eb = b.ended_at ? Date.parse(b.ended_at) : 0;
            if (Number.isFinite(ea) && Number.isFinite(eb) && ea !== eb) {
                return eb - ea;
            }
            const fa = a.last_match?.finished_at ? Date.parse(a.last_match.finished_at) : 0;
            const fb = b.last_match?.finished_at ? Date.parse(b.last_match.finished_at) : 0;
            if (Number.isFinite(fa) && Number.isFinite(fb) && fa !== fb) {
                return fb - fa;
            }
            return (b.id ?? 0) - (a.id ?? 0);
        });
    }, [lobby?.finished_sessions]);

    const reloadSession = useCallback(async () => {
        if (facilityIdNum == null || !sessionIdParam || !/^\d+$/.test(sessionIdParam)) {
            return;
        }
        const data = await fetchGameSession(sessionIdParam, { facilityId: facilityIdNum });
        setSessionDetail(data);
    }, [facilityIdNum, sessionIdParam]);

    const reloadLobby = useCallback(async () => {
        if (facilityIdNum == null || sessionIdParam) {
            return;
        }
        const room = await fetchFacilityGameRoom(facilityIdNum);
        setLobby(room);
    }, [facilityIdNum, sessionIdParam]);

    useVisibilityPolling(
        () => reloadSession(),
        { enabled: Boolean(sessionIdParam && sessionDetail?.is_active), intervalMs: 10_000 },
    );

    useVisibilityPolling(
        () => reloadLobby(),
        { enabled: facilityIdNum != null && !sessionIdParam, intervalMs: 10_000 },
    );

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setError('');
            setLoading(true);
            setSessionDetail(null);
            setLobby(null);

            try {
                if (facilityIdNum == null) {
                    throw new Error('Invalid facility in URL.');
                }
                if (sessionIdParam) {
                    if (!/^\d+$/.test(sessionIdParam)) {
                        throw new Error('Invalid session link.');
                    }
                    const data = await fetchGameSession(sessionIdParam, { facilityId: facilityIdNum });
                    if (!cancelled) {
                        setSessionDetail(data);
                    }
                } else {
                    const room = await fetchFacilityGameRoom(facilityIdNum);
                    if (!cancelled) {
                        setLobby(room);
                    }
                }
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : 'Could not load the game room.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void load();
        return () => {
            cancelled = true;
        };
    }, [sessionIdParam, facilityIdNum]);

    useEffect(() => {
        setStartError('');
    }, [sessionIdParam, facilityIdNum]);

    useEffect(() => {
        setFinishError('');
        setShowFinishModal(false);
        setFinishTeam1Score('');
        setFinishTeam2Score('');
    }, [sessionIdParam, facilityIdNum]);

    const queueRows = useMemo(() => {
        if (!sessionDetail?.players?.length) {
            return [];
        }
        return sessionDetail.players.map((row) => mapQueueRow(sessionDetail, row, user?.id));
    }, [sessionDetail, user?.id]);

    const lobbyPlayerRows = useMemo(() => {
        if (!lobby?.players?.length) {
            return [];
        }
        return lobby.players.map((p) => {
            const playing = Boolean(p.is_playing);
            const inQueue = Boolean(p.is_in_queue);
            const statusLabel = playing ? 'Playing' : inQueue ? 'In queue' : 'Not in a match';
            const statusColor = playing ? 'text-orange-300' : inQueue ? 'text-[#4ce081]' : 'text-sky-600';
            return {
                key: `lobby-${p.id}`,
                initials: initialsFromName(p.name),
                name: p.name,
                tier: 'Sessions today',
                status: statusLabel,
                statusColor,
                detail: p.email,
                isSelf: user?.id != null && p.id === user.id,
                _playing: playing,
                _waiting: inQueue,
            };
        });
    }, [lobby?.players, user?.id]);

    const q = playerSearch.trim().toLowerCase();
    const filteredPlayers = useMemo(() => {
        if (sessionDetail) {
            return queueRows;
        }

        const searched = q
            ? lobbyPlayerRows.filter(
                  (p) =>
                      p.name.toLowerCase().includes(q) ||
                      p.tier.toLowerCase().includes(q) ||
                      p.status.toLowerCase().includes(q) ||
                      p.detail.toLowerCase().includes(q),
              )
            : [...lobbyPlayerRows];

        if (statusFilter === 'playing') {
            return searched.filter((p) => p._playing);
        }
        if (statusFilter === 'available') {
            return searched.filter((p) => p._waiting);
        }
        return searched;
    }, [sessionDetail, q, statusFilter, queueRows, lobbyPlayerRows]);

    useEffect(() => {
        setVisiblePlayerCount(PLAYER_LIST_INITIAL_COUNT);
    }, [sessionIdParam, statusFilter, q, lobbyPlayerRows.length, queueRows.length]);

    const visiblePlayers = useMemo(() => {
        if (sessionDetail || filteredPlayers.length === 0) {
            return filteredPlayers;
        }
        if (filteredPlayers.length >= PLAYER_LIST_INITIAL_COUNT) {
            return filteredPlayers;
        }
        const placeholders = Array.from({ length: PLAYER_LIST_INITIAL_COUNT - filteredPlayers.length }).map((_, idx) => ({
            key: `placeholder-${idx}`,
            initials: '—',
            name: 'Open slot',
            tier: 'Sessions today',
            status: 'Waiting for player',
            statusColor: 'text-[#918f9c]',
            detail: '—',
            isSelf: false,
            _playing: false,
            _waiting: false,
            _placeholder: true,
        }));
        return [...filteredPlayers, ...placeholders];
    }, [sessionDetail, filteredPlayers]);

    const playersToRender = useMemo(
        () => visiblePlayers.slice(0, visiblePlayerCount),
        [visiblePlayers, visiblePlayerCount],
    );
    const hasMorePlayers = visiblePlayers.length > visiblePlayerCount;
    const hasPlayersToRender = playersToRender.length > 0;

    const sessionHeadline = sessionDetail
        ? `${sessionDetail.sport?.name ?? 'Session'} · ${sessionDetail.match_type === 'doubles' ? 'Doubles' : 'Singles'}`
        : 'GAME ROOM';

    const facilityEyebrow =
        sessionDetail?.facility?.name ?? lobby?.facility?.name ?? 'Game room';

    async function handleStartGame() {
        if (!sessionIdParam || !/^\d+$/.test(sessionIdParam) || facilityIdNum == null) {
            return;
        }
        setStartError('');
        setStartBusy(true);
        try {
            const data = await postStartGameSessionMatch(sessionIdParam, { facilityId: facilityIdNum });
            setSessionDetail(data);
        } catch (e) {
            setStartError(e instanceof Error ? e.message : 'Could not start the match.');
        } finally {
            setStartBusy(false);
        }
    }

    async function handleSubmitFinishMatch() {
        if (!sessionIdParam || !/^\d+$/.test(sessionIdParam) || facilityIdNum == null) {
            return;
        }
        const s1 = Number.parseInt(String(finishTeam1Score).trim(), 10);
        const s2 = Number.parseInt(String(finishTeam2Score).trim(), 10);
        if (!Number.isFinite(s1) || !Number.isFinite(s2) || s1 < 0 || s2 < 0) {
            setFinishError('Enter valid non-negative scores for both teams.');
            return;
        }
        if (s1 === s2) {
            setFinishError('Scores cannot be tied—there must be a winner.');
            return;
        }
        setFinishError('');
        setFinishBusy(true);
        try {
            const data = await postFinishGameSessionMatch(sessionIdParam, {
                facilityId: facilityIdNum,
                team1_score: s1,
                team2_score: s2,
            });
            setSessionDetail(data);
            setShowFinishModal(false);
            setFinishTeam1Score('');
            setFinishTeam2Score('');
        } catch (e) {
            setFinishError(e instanceof Error ? e.message : 'Could not finish the match.');
        } finally {
            setFinishBusy(false);
        }
    }

    return (
        <AppShell user={user}>
            <div className="rt-game-room">
                <div className="mb-4">
                    <Link to="/facilities" className="rt-facility-back">
                        <MaterialIcon name="arrow_back" className="text-lg" />
                        Facilities
                    </Link>
                </div>

                <PageHeader
                    eyebrow={facilityEyebrow}
                    title={sessionHeadline === 'GAME ROOM' ? 'Game room' : sessionHeadline}
                    subtitle={
                        sessionDetail
                            ? undefined
                            : 'Active sessions and everyone on the roster at this facility. Open a session for full queue details.'
                    }
                    action={
                        sessionDetail ? (
                            <SportIcon
                                icon={sessionDetail.sport?.icon ?? 'tennis.png'}
                                imgClassName="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14"
                                materialClassName="text-5xl text-[#c2c1ff]"
                                className="shrink-0"
                            />
                        ) : facilityIdNum != null && !sessionIdParam && !error ? (
                            <Link
                                to={`/facility/${facilityIdNum}/create-match`}
                                className="rt-facility-btn rt-facility-btn-lavender min-h-11 px-4"
                            >
                                <MaterialIcon name="add" className="text-lg" />
                                Create match
                            </Link>
                        ) : null
                    }
                />

                {sessionDetail ? (
                    <dl className="rt-game-room-meta mb-8">
                        {sessionDetail.facility ? (
                            <div>
                                <dt>Facility</dt>
                                <dd>
                                    <span className="block">{sessionDetail.facility.name}</span>
                                    <span className="mt-0.5 block text-xs font-normal text-[#918f9c]">
                                        {sessionDetail.facility.address ?? '—'}
                                    </span>
                                </dd>
                            </div>
                        ) : null}
                        <div>
                            <dt>Game type</dt>
                            <dd>{sessionDetail.game_type}</dd>
                        </div>
                        <div>
                            <dt>Court</dt>
                            <dd>{sessionDetail.court_preference ?? '—'}</dd>
                        </div>
                        <div>
                            <dt>Players</dt>
                            <dd>{sessionDetail.participant_count ?? sessionDetail.players?.length ?? '—'}</dd>
                        </div>
                        <div>
                            <dt>Status</dt>
                            <dd className={sessionStatusUi.textClass}>{sessionStatusUi.label}</dd>
                        </div>
                    </dl>
                ) : null}

                <div className={sessionDetail ? 'rt-game-room-session-layout' : undefined}>
                {sessionDetail ? (
                    <div className="mb-6 md:mb-0 md:sticky md:top-36">
                        {sessionDetail.last_match ? (
                            <div className="rt-create-match-panel">
                                <h3 className="rt-section-eyebrow !mb-2 text-[#c2c1ff]">Last match result</h3>
                                <p className="text-sm font-semibold text-[#e4e1e6]">
                                    Team 1 : {sessionDetail.last_match.team1_score} — Team 2: {sessionDetail.last_match.team2_score}
                                </p>
                                {sessionDetail.last_match.winning_team != null ? (
                                    <p className="font-bold text-[#4ce081]">
                                        Winner: Team {sessionDetail.last_match.winning_team}
                                    </p>
                                ) : null}
                                {sessionDetail.last_match.players?.length ? (
                                    <ul className="mt-3 space-y-2 border-t border-white/5 pt-3 text-xs text-[#c8c5d2]">
                                        {sessionDetail.last_match.players.map((p) => (
                                            <li key={p.user_id} className="flex justify-between gap-3">
                                                <span className="min-w-0 truncate font-medium text-[#e4e1e6]">
                                                    {p.name}
                                                    {p.won ? (
                                                        <span className="ml-1.5 text-[#4ce081]">W</span>
                                                    ) : (
                                                        <span className="ml-1.5 text-[#918f9c]">L</span>
                                                    )}
                                                    <span className={p.rating_change >= 0 ? 'text-[#4ce081] ml-1' : 'text-[#ffb4ab] ml-1'}>
                                                        ({formatRatingChange(p.rating_change)} rating)
                                                    </span>
                                                </span>
                                                <span className="shrink-0 text-right tabular-nums">
                                                    <span className="text-[#c2c1ff]">+{p.session_points_earned} pts</span>
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                            </div>
                        ) : (
                            <p className="rounded-xl border border-dashed border-white/10 bg-[#1b1b1e]/80 px-4 py-4 text-sm text-[#918f9c]">
                                No completed match in this session yet.
                            </p>
                        )}
                    </div>
                ) : null}

                <div className={sessionDetail ? 'min-w-0' : undefined}>

                {error ? (
                    <div className="rt-alert-error mb-6" role="alert">
                        <p className="mb-2">{error}</p>
                        <Link
                            to={gameRoomBase}
                            className="font-semibold text-[#c2c1ff] underline-offset-2 hover:underline"
                        >
                            Back to facility sessions
                        </Link>
                    </div>
                ) : null}

                {!sessionIdParam && !error ? (
                    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
                    <section className="space-y-3">
                        <h2 className="text-lg font-bold text-[#e4e1e6]">Active matches</h2>
                        {loading ? (
                            <div className="space-y-2">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="rt-skeleton h-[88px] rounded-xl" aria-hidden />
                                ))}
                            </div>
                        ) : lobby && sortedLobbySessions.length > 0 ? (
                            <ul className="rt-facility-session-list-grid space-y-2.5 md:space-y-0">
                                {sortedLobbySessions.map((s) => {
                                    const statusMeta = facilitySessionListStatus(s);
                                    const matchLabel =
                                        s.match_type === 'doubles'
                                            ? 'Doubles'
                                            : s.match_type === 'singles'
                                              ? 'Singles'
                                              : s.match_type ?? '';
                                    const participantNote =
                                        typeof s.participant_count === 'number'
                                            ? `${s.participant_count} player${s.participant_count === 1 ? '' : 's'}`
                                            : null;
                                    return (
                                        <li key={s.id}>
                                            <Link
                                                to={`${gameRoomBase}?session=${s.id}`}
                                                className="rt-game-room-session-card"
                                                aria-label={`${s.sport?.name ?? 'Session'} ${statusMeta.label}, open session`}
                                            >
                                                <div className="shrink-0 pt-0.5">
                                                    <SportIcon
                                                        icon={s.sport?.icon ?? 'tennis.png'}
                                                        imgClassName="h-9 w-9 object-contain"
                                                        materialClassName="text-3xl text-[#c2c1ff]"
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1 pt-0.5">
                                                    <p className="truncate text-sm font-bold text-[#e4e1e6]">
                                                        {[s.sport?.name ?? 'Session', matchLabel].filter(Boolean).join(' · ')}
                                                    </p>
                                                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#918f9c]">
                                                        {[s.game_type, participantNote].filter(Boolean).join(' · ')}
                                                        {s.is_host ? (
                                                            <>
                                                                {' '}
                                                                <span className="font-semibold text-[#4ce081]">· You host</span>
                                                            </>
                                                        ) : null}
                                                    </p>
                                                </div>
                                                <div className="flex shrink-0 flex-col items-end justify-center gap-1">
                                                    <span
                                                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusMeta.pillClass} ${statusMeta.textClass}`}
                                                    >
                                                        {statusMeta.label}
                                                    </span>
                                                    <span className="text-[10px] font-medium text-[#918f9c]">Open →</span>
                                                </div>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="rounded-xl border border-dashed border-white/10 bg-[#1b1b1e]/80 px-4 py-4 text-sm text-[#918f9c]">
                                No active matches at this facility yet.
                            </p>
                        )}
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-bold text-[#e4e1e6]">Finished today</h2>
                        {loading ? (
                            <div className="space-y-2">
                                {Array.from({ length: 2 }).map((_, i) => (
                                    <div key={i} className="rt-skeleton h-[88px] rounded-xl" aria-hidden />
                                ))}
                            </div>
                        ) : lobby && finishedLobbySessions.length > 0 ? (
                            <ul className="rt-facility-session-list-grid space-y-2.5 md:space-y-0">
                                {finishedLobbySessions.map((s) => {
                                    const matchLabel =
                                        s.match_type === 'doubles'
                                            ? 'Doubles'
                                            : s.match_type === 'singles'
                                              ? 'Singles'
                                              : s.match_type ?? '';
                                    const participantNote =
                                        typeof s.participant_count === 'number'
                                            ? `${s.participant_count} player${s.participant_count === 1 ? '' : 's'}`
                                            : null;
                                    const scoreLine =
                                        s.last_match?.team1_score != null && s.last_match?.team2_score != null
                                            ? `Team 1: ${s.last_match.team1_score} / Team 2: ${s.last_match.team2_score}`
                                            : null;
                                    return (
                                        <li key={s.id}>
                                            <Link
                                                to={`${gameRoomBase}?session=${s.id}`}
                                                className="rt-game-room-session-card"
                                                aria-label={`${s.sport?.name ?? 'Session'} finished, open details`}
                                            >
                                                <div className="shrink-0 pt-0.5">
                                                    <SportIcon
                                                        icon={s.sport?.icon ?? 'tennis.png'}
                                                        imgClassName="h-9 w-9 object-contain"
                                                        materialClassName="text-3xl text-[#c2c1ff]"
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1 pt-0.5">
                                                    <p className="truncate text-sm font-bold text-[#e4e1e6]">
                                                        {[s.sport?.name ?? 'Session', matchLabel].filter(Boolean).join(' · ')}
                                                    </p>
                                                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#918f9c]">
                                                        {[s.game_type, participantNote]
                                                            .filter(Boolean)
                                                            .join(' · ')}
                                                    </p>
                                                    {scoreLine ? (
                                                        <p className="line-clamp-2 text-xs leading-relaxed text-[#918f9c]">
                                                            {scoreLine}
                                                        </p>
                                                    ) : null}
                                                    {s.last_match?.winning_team != null ? (
                                                        <p className="font-bold text-[#4ce081]">
                                                            Winner: Team {s.last_match.winning_team}
                                                        </p>
                                                    ) : null}
                                                    {s.last_match?.players?.length ? (
                                                        <p className="mt-1 line-clamp-1 text-[11px] text-[#c8c5d2]">
                                                            {s.last_match.players
                                                                .slice(0, 4)
                                                                .map((p) => p.name)
                                                                .filter(Boolean)
                                                                .join(' · ')}
                                                            {s.last_match.players.length > 4 ? ' · …' : ''}
                                                        </p>
                                                    ) : null}
                                                </div>
                                                <div className="flex flex-col items-end justify-between gap-1">
                                                    <span className="inline-flex rounded-full border border-[#ffb4ab]/35 bg-[#ffb4ab]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#ffb4ab]">
                                                        Finished
                                                    </span>
                                                    <span className="text-[12px] font-medium text-[#918f9c]">View →</span>
                                                </div>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="rounded-xl border border-dashed border-white/10 bg-[#1b1b1e]/80 px-4 py-4 text-sm text-[#918f9c]">
                                No finished matches created today yet.
                            </p>
                        )}
                    </section>
                    </div>
                ) : null}

                <section className="mb-6">
                    <h2 className="mb-3 text-base font-bold text-[#e4e1e6]">
                        {sessionDetail ? 'Players' : 'Players at this facility'}
                    </h2>
                    {!sessionDetail ? (
                        <>
                            <div className="relative mb-4">
                                <MaterialIcon
                                    name="search"
                                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#918f9c]"
                                />
                                <input
                                    type="search"
                                    value={playerSearch}
                                    onChange={(e) => setPlayerSearch(e.target.value)}
                                    placeholder="Search by name, email, or queue…"
                                    autoComplete="off"
                                    spellCheck={false}
                                    className="rt-facility-field !pl-12"
                                    aria-label="Search players"
                                    disabled={!sessionDetail?.players?.length && lobbyPlayerRows.length === 0}
                                />
                            </div>

                            <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter players by status">
                                <button
                                    type="button"
                                    className={filterButtonClass(statusFilter === 'all')}
                                    aria-pressed={statusFilter === 'all'}
                                    onClick={() => setStatusFilter('all')}
                                    disabled={!sessionDetail?.players?.length && lobbyPlayerRows.length === 0}
                                >
                                    All players
                                </button>
                                <button
                                    type="button"
                                    className={filterButtonClass(statusFilter === 'playing')}
                                    aria-pressed={statusFilter === 'playing'}
                                    onClick={() => setStatusFilter('playing')}
                                    disabled={!sessionDetail?.players?.length && lobbyPlayerRows.length === 0}
                                >
                                    Playing
                                </button>
                                <button
                                    type="button"
                                    className={filterButtonClass(statusFilter === 'available')}
                                    aria-pressed={statusFilter === 'available'}
                                    onClick={() => setStatusFilter('available')}
                                    disabled={!sessionDetail?.players?.length && lobbyPlayerRows.length === 0}
                                >
                                    In queue
                                </button>
                            </div>
                        </>
                    ) : null}

                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="rt-skeleton h-[88px] rounded-2xl" aria-hidden />
                            ))}
                        </div>
                    ) : !hasPlayersToRender ? (
                        <p className="rounded-2xl border border-dashed border-white/10 bg-[#1b1b1e]/80 px-4 py-6 text-center text-sm text-[#918f9c]">
                            {sessionIdParam
                                ? 'No players on this session yet.'
                                : 'No players from sessions created today at this facility yet.'}
                        </p>
                    ) : (
                        <div className="rt-player-cards-grid space-y-3 md:space-y-0">
                            {playersToRender.map((player) => (
                                <article
                                    key={player.key}
                                    className={[
                                        'flex items-center justify-between rounded-2xl border p-4 transition-colors duration-200',
                                        player._placeholder
                                            ? 'border-dashed border-white/10 bg-[#16161a]'
                                            : player.isSelf
                                              ? 'border-[#c2c1ff]/30 bg-[#c2c1ff]/10 hover:bg-[#c2c1ff]/15'
                                              : 'border-white/5 bg-[#1b1b1e]/90 hover:border-white/10 hover:bg-[#1f1f22]',
                                    ].join(' ')}
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="rt-player-avatar shrink-0">{player.initials}</div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="truncate text-sm font-extrabold tracking-wide text-[#e4e1e6]">
                                                {player.name}
                                                {player.isSelf ? (
                                                    <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-[#c2c1ff]">
                                                        You
                                                    </span>
                                                ) : null}
                                            </h4>
                                            <p className="flex items-center gap-1 text-sm text-[#c8c5d2]">
                                                <MaterialIcon name="military_tech" className="text-sm text-[#918f9c]" />
                                                <span>{player.tier}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="ml-3 shrink-0 space-y-1 text-right">
                                        <p className={`text-xs font-bold ${player.statusColor}`}>{player.status}</p>
                                        <p className="max-w-[140px] truncate text-xs text-[#c8c5d2]">{player.detail}</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                    {!loading && hasPlayersToRender && hasMorePlayers ? (
                        <div className="mt-4">
                            <button
                                type="button"
                                onClick={() => setVisiblePlayerCount((n) => n + PLAYER_LIST_LOAD_STEP)}
                                className="rt-facility-btn rt-facility-btn-secondary w-full min-h-11"
                            >
                                Load more
                            </button>
                        </div>
                    ) : null}
                    {sessionDetail?.is_active && sessionDetail?.is_host ? (
                        <div className="mt-8 space-y-2">
                            {showFinishMatch ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFinishError('');
                                            setShowFinishModal(true);
                                        }}
                                        className="w-full min-h-12 cursor-pointer rounded-xl border border-[#ffb4ab]/45 bg-[#ffb4ab]/12 px-8 py-3.5 text-base font-extrabold tracking-tight text-[#ffb4ab] transition-transform duration-150 enabled:active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffb4ab]/60 md:w-auto"
                                    >
                                        Finish game
                                    </button>
                                    <p className="text-center text-xs text-[#918f9c] md:text-left">
                                        Enter the final score to update rankings, credit session points, and end this session.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => void handleStartGame()}
                                        disabled={!canStartMatch || startBusy}
                                        aria-busy={startBusy}
                                        className="rt-kinetic-gradient w-full min-h-12 cursor-pointer rounded-xl px-8 py-3.5 text-lg font-extrabold tracking-tight text-[#211e6a] transition-transform duration-150 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c2c1ff]/70 md:w-auto"
                                    >
                                        {startBusy ? 'Starting…' : 'Start game'}
                                    </button>
                                    {!anyPlaying && waitingForMatchCount < requiredPlayers ? (
                                        <p className="text-center text-xs text-[#918f9c] md:text-left">
                                            Need {requiredPlayers} waiting players in the queue to start (
                                            {waitingForMatchCount} ready).
                                        </p>
                                    ) : null}
                                    {anyPlaying && !showFinishMatch ? (
                                        <p className="text-center text-xs text-[#918f9c] md:text-left">A match is in progress.</p>
                                    ) : null}
                                    {startError ? (
                                        <p className="text-center text-sm text-[#ffb4ab] md:text-left" role="alert">
                                            {startError}
                                        </p>
                                    ) : null}
                                </>
                            )}
                        </div>
                    ) : null}
                </section>
                </div>
                </div>
            </div>

            {showFinishModal ? (
                <div
                    className="rt-facility-modal-overlay"
                    role="presentation"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget && !finishBusy) setShowFinishModal(false);
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="finish-match-title"
                        className="rt-facility-modal-sheet"
                    >
                        <h2 id="finish-match-title" className="text-lg font-bold text-[#e4e1e6]">
                            Report final score
                        </h2>
                        <p className="mt-2 text-sm text-[#918f9c]">
                            Team 1 vs Team 2 (same sides as when the session was created). One side must win. Saving ends
                            the session after points are applied.
                        </p>
                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <label className="block">
                                <span className="rt-facility-field-label mb-1.5">Team 1 score</span>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    value={finishTeam1Score}
                                    onChange={(e) => setFinishTeam1Score(e.target.value)}
                                    className="rt-facility-field"
                                    autoComplete="off"
                                />
                            </label>
                            <label className="block">
                                <span className="rt-facility-field-label mb-1.5">Team 2 score</span>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    value={finishTeam2Score}
                                    onChange={(e) => setFinishTeam2Score(e.target.value)}
                                    className="rt-facility-field"
                                    autoComplete="off"
                                />
                            </label>
                        </div>
                        {finishError ? (
                            <p className="mt-3 text-sm text-[#ffb4ab]" role="alert">
                                {finishError}
                            </p>
                        ) : null}
                        <div className="mt-6 flex flex-wrap justify-end gap-3">
                            <button
                                type="button"
                                disabled={finishBusy}
                                onClick={() => setShowFinishModal(false)}
                                className="rt-facility-btn rt-facility-btn-ghost min-h-11 px-4"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={finishBusy}
                                aria-busy={finishBusy}
                                onClick={() => void handleSubmitFinishMatch()}
                                className="rt-facility-btn rt-facility-btn-lavender min-h-11 px-5"
                            >
                                {finishBusy ? 'Saving…' : 'Save & update'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </AppShell>
    );
}
