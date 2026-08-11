import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { fetchFacilityGameRoom } from '../api/facilityGameRoom.js';
import { fetchGameSession, postFinishGameSessionMatch, postStartGameSessionMatch } from '../api/gameSession.js';
import { AppShell } from '../components/app/AppShell.jsx';
import { EmptyState } from '../components/app/EmptyState.jsx';
import { PageHeader } from '../components/app/PageHeader.jsx';
import { MaterialIcon } from '../components/dashboard/MaterialIcon.jsx';
import { SportIcon } from '../components/dashboard/SportIcon.jsx';
import { FacilityFinishMatchModal } from '../components/facilities/FacilityFinishMatchModal.jsx';
import { FacilityGameRoomSessionCard } from '../components/facilities/FacilityGameRoomSessionCard.jsx';
import {
    FacilitySessionMatchPanel,
    facilitySessionLineup,
} from '../components/facilities/FacilitySessionMatchPanel.jsx';
import { GameRoomPlayerRow } from '../components/facilities/GameRoomPlayerRow.jsx';
import { playerInitials } from '../components/ranking/rankingUtils.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useVisibilityPolling } from '../hooks/useVisibilityPolling.js';
import { facilitySessionListStatus, formatGameTypeLabel } from '../lib/facilityGameRoomUi.js';

/**
 * @param {string} name
 */
function initialsFromName(name) {
    return playerInitials(name);
}

const PLAYER_LIST_INITIAL_COUNT = 8;
const PLAYER_LIST_LOAD_STEP = 8;

/**
 * @param {import('../api/gameSession.js').GameSessionDetail} session
 * @param {NonNullable<import('../api/gameSession.js').GameSessionDetail['players']>[number]} row
 * @param {number | undefined} currentUserId
 */
function mapQueueRow(session, row, currentUserId) {
    const hostId = session.created_by?.id;
    const name = row.user?.name?.trim() || row.guest_name?.trim() || 'Player';
    const isHost = hostId != null && row.user?.id === hostId;
    const playing = row.is_playing;
    const waiting = row.is_waiting && !row.is_playing;
    const statusKey = playing ? 'playing' : waiting ? 'waiting' : 'idle';

    return {
        key: String(row.id),
        initials: initialsFromName(name),
        name,
        isHost,
        queuePosition: row.queue_position,
        skillLevel: row.skill_level,
        sessionPoints: row.session_points,
        eloRating: row.elo_rating,
        statusKey,
        status: playing ? 'Playing' : waiting ? 'Waiting' : 'Idle',
        isSelf: currentUserId != null && row.user?.id === currentUserId,
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

    const [startBusy, setStartBusy] = useState(false);
    const [startError, setStartError] = useState('');

    const [showFinishModal, setShowFinishModal] = useState(false);
    const [finishTeam1Score, setFinishTeam1Score] = useState('');
    const [finishTeam2Score, setFinishTeam2Score] = useState('');
    const [finishByWinner, setFinishByWinner] = useState(false);
    /** @type {1 | 2 | null} */
    const [finishWinningTeam, setFinishWinningTeam] = useState(null);
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
        setFinishByWinner(false);
        setFinishWinningTeam(null);
    }, [sessionIdParam, facilityIdNum]);

    const queueRows = useMemo(() => {
        if (!sessionDetail?.players?.length) {
            return [];
        }
        return sessionDetail.players.map((row) => mapQueueRow(sessionDetail, row, user?.id));
    }, [sessionDetail, user?.id]);

    useEffect(() => {
        setVisiblePlayerCount(PLAYER_LIST_INITIAL_COUNT);
    }, [sessionIdParam, queueRows.length]);

    const playersToRender = useMemo(
        () => queueRows.slice(0, visiblePlayerCount),
        [queueRows, visiblePlayerCount],
    );
    const hasMorePlayers = queueRows.length > visiblePlayerCount;
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

    function resetFinishForm() {
        setFinishTeam1Score('');
        setFinishTeam2Score('');
        setFinishByWinner(false);
        setFinishWinningTeam(null);
        setFinishError('');
    }

    async function handleSubmitFinishMatch() {
        if (!sessionIdParam || !/^\d+$/.test(sessionIdParam) || facilityIdNum == null) {
            return;
        }
        if (finishByWinner) {
            if (finishWinningTeam !== 1 && finishWinningTeam !== 2) {
                setFinishError('Select the winning team.');
                return;
            }
        } else {
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
        }
        setFinishError('');
        setFinishBusy(true);
        try {
            const data = await postFinishGameSessionMatch(
                sessionIdParam,
                finishByWinner
                    ? {
                          facilityId: facilityIdNum,
                          winning_team: finishWinningTeam ?? undefined,
                      }
                    : {
                          facilityId: facilityIdNum,
                          team1_score: Number.parseInt(String(finishTeam1Score).trim(), 10),
                          team2_score: Number.parseInt(String(finishTeam2Score).trim(), 10),
                      },
            );
            setSessionDetail(data);
            setShowFinishModal(false);
            resetFinishForm();
        } catch (e) {
            setFinishError(e instanceof Error ? e.message : 'Could not finish the match.');
        } finally {
            setFinishBusy(false);
        }
    }

    const finishLineup = useMemo(
        () => (sessionDetail ? facilitySessionLineup(sessionDetail) : { team1: [], team2: [] }),
        [sessionDetail],
    );

    const gameTypeLabel = formatGameTypeLabel(sessionDetail?.game_type);
    const playerCount = sessionDetail?.participant_count ?? sessionDetail?.players?.length ?? 0;

    return (
        <AppShell user={user}>
            <div className="rt-game-room">
                <div className="mb-4">
                    <Link to={sessionDetail ? gameRoomBase : '/facilities'} className="rt-facility-back">
                        <MaterialIcon name="arrow_back" className="text-lg" />
                        {sessionDetail ? 'Game room' : 'Facilities'}
                    </Link>
                </div>

                <PageHeader
                    size="md"
                    eyebrow={facilityEyebrow}
                    title={sessionHeadline === 'GAME ROOM' ? 'Game room' : sessionHeadline}
                    subtitle={
                        sessionDetail
                            ? sessionDetail.facility?.address ?? undefined
                            : lobby?.facility?.address ??
                              'Open a match to manage the queue and report scores.'
                    }
                    action={
                        sessionDetail ? (
                            <SportIcon
                                icon={sessionDetail.sport?.icon ?? 'tennis.png'}
                                imgClassName="h-10 w-10 shrink-0 object-contain sm:h-12 sm:w-12"
                                materialClassName="text-4xl text-[#c2c1ff]"
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
                    <ul className="rt-game-room-facts" aria-label="Session details">
                        {sessionDetail.court_preference ? (
                            <li className="rt-game-room-fact">
                                <MaterialIcon name="stadium" className="text-base text-[#c2c1ff]" />
                                {sessionDetail.court_preference}
                            </li>
                        ) : null}
                        {gameTypeLabel ? (
                            <li className="rt-game-room-fact">
                                <MaterialIcon name="scoreboard" className="text-base text-[#c2c1ff]" />
                                {gameTypeLabel}
                            </li>
                        ) : null}
                        <li className="rt-game-room-fact">
                            <MaterialIcon name="group" className="text-base text-[#c2c1ff]" />
                            {playerCount} {playerCount === 1 ? 'player' : 'players'}
                        </li>
                    </ul>
                ) : null}

                <div className={sessionDetail ? 'rt-game-room-session-layout' : undefined}>
                {sessionDetail && !error ? (
                    loading ? (
                        <div className="rt-skeleton mb-6 h-64 rounded-xl md:mb-0" aria-hidden />
                    ) : (
                        <FacilitySessionMatchPanel
                            session={sessionDetail}
                            canStartMatch={canStartMatch}
                            anyPlaying={anyPlaying}
                            requiredPlayers={requiredPlayers}
                            waitingForMatchCount={waitingForMatchCount}
                            showFinishMatch={showFinishMatch}
                            startBusy={startBusy}
                            startError={startError}
                            onStart={() => void handleStartGame()}
                            onFinish={() => {
                                resetFinishForm();
                                setShowFinishModal(true);
                            }}
                        />
                    )
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
                    <div className="mb-10 space-y-8">
                        <section>
                            <div className="mb-3 flex items-baseline justify-between gap-3">
                                <h2 className="text-base font-bold text-[#e4e1e6]">Active matches</h2>
                                {!loading && sortedLobbySessions.length > 0 ? (
                                    <p className="text-xs font-semibold tabular-nums text-[#918f9c]">
                                        {sortedLobbySessions.length}
                                    </p>
                                ) : null}
                            </div>
                            {loading ? (
                                <div className="space-y-2">
                                    {Array.from({ length: 2 }).map((_, i) => (
                                        <div key={i} className="rt-skeleton h-[88px] rounded-xl" aria-hidden />
                                    ))}
                                </div>
                            ) : sortedLobbySessions.length > 0 ? (
                                <ul
                                    className={[
                                        'rt-game-room-lobby-list',
                                        sortedLobbySessions.length > 1 ? 'rt-game-room-lobby-list--multi' : '',
                                    ]
                                        .filter(Boolean)
                                        .join(' ')}
                                >
                                    {sortedLobbySessions.map((s) => (
                                        <li key={s.id}>
                                            <FacilityGameRoomSessionCard
                                                session={s}
                                                href={`${gameRoomBase}?session=${s.id}`}
                                                variant="active"
                                            />
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <EmptyState
                                    icon="sports_tennis"
                                    title="No active matches"
                                    description="Create a match to build a queue and start play at this facility."
                                    actionLabel="Create match"
                                    actionTo={
                                        facilityIdNum != null
                                            ? `/facility/${facilityIdNum}/create-match`
                                            : undefined
                                    }
                                />
                            )}
                        </section>

                    </div>
                ) : null}

                {sessionDetail ? (
                <section className="mb-6 min-w-0">
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                        <h2 className="text-base font-bold text-[#e4e1e6]">Roster</h2>
                        {!loading && hasPlayersToRender ? (
                            <p className="text-xs font-semibold tabular-nums text-[#918f9c]" aria-live="polite">
                                {queueRows.length}
                            </p>
                        ) : null}
                    </div>
                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="rt-skeleton h-[88px] rounded-2xl" aria-hidden />
                            ))}
                        </div>
                    ) : !hasPlayersToRender ? (
                        <EmptyState
                            icon="group"
                            title="No players yet"
                            description="Add players when creating the match so they appear on this roster."
                        />
                    ) : (
                        <ul className="rt-game-room-roster">
                            {playersToRender.map((player) => (
                                <li key={player.key}>
                                    <GameRoomPlayerRow player={player} />
                                </li>
                            ))}
                        </ul>
                    )}
                    {!loading && hasPlayersToRender && hasMorePlayers ? (
                        <div className="mt-4">
                            <button
                                type="button"
                                onClick={() => setVisiblePlayerCount((n) => n + PLAYER_LIST_LOAD_STEP)}
                                className="rt-facility-btn rt-facility-btn-secondary min-h-11 w-full cursor-pointer"
                            >
                                Load more
                            </button>
                        </div>
                    ) : null}
                </section>
                ) : null}
                </div>
                </div>
            </div>

            <FacilityFinishMatchModal
                open={showFinishModal}
                busy={finishBusy}
                error={finishError}
                team1Names={finishLineup.team1}
                team2Names={finishLineup.team2}
                team1Score={finishTeam1Score}
                team2Score={finishTeam2Score}
                finishByWinner={finishByWinner}
                winningTeam={finishWinningTeam}
                onTeam1Score={setFinishTeam1Score}
                onTeam2Score={setFinishTeam2Score}
                onFinishByWinner={(value) => {
                    setFinishByWinner(value);
                    setFinishError('');
                }}
                onWinningTeam={setFinishWinningTeam}
                onCancel={() => {
                    if (!finishBusy) {
                        setShowFinishModal(false);
                        resetFinishForm();
                    }
                }}
                onSubmit={() => void handleSubmitFinishMatch()}
            />
        </AppShell>
    );
}
