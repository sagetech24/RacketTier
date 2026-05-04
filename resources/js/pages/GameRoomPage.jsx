import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import '../../css/dashboard-v2.css';
import { fetchFacilities } from '../api/facilities.js';
import { fetchFacilityGameRoom } from '../api/facilityGameRoom.js';
import { fetchGameSession, postStartGameSessionMatch } from '../api/gameSession.js';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav.jsx';
import { DashboardV2Header } from '../components/dashboard/DashboardV2Header.jsx';
import { useAuth } from '../context/AuthContext.jsx';

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
        detail: row.user.email,
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

    const [facilityLabel, setFacilityLabel] = useState('');

    const [sessionDetail, setSessionDetail] = useState(
        /** @type {import('../api/gameSession.js').GameSessionDetail | null} */ (null),
    );
    const [lobby, setLobby] = useState(/** @type {import('../api/facilityGameRoom.js').FacilityGameRoomPayload | null} */ (null));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [playerSearch, setPlayerSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [fastMatchmaking, setFastMatchmaking] = useState(false);
    const [startBusy, setStartBusy] = useState(false);
    const [startError, setStartError] = useState('');

    const gameRoomBase = facilityIdNum != null ? `/facility/${facilityIdNum}/game-room` : '/facilities';

    const { canStartMatch, anyPlaying, requiredPlayers, waitingForMatchCount } = useMemo(() => {
        if (!sessionDetail?.players) {
            return {
                canStartMatch: false,
                anyPlaying: false,
                requiredPlayers: 2,
                waitingForMatchCount: 0,
            };
        }
        const need = sessionDetail.match_type === 'doubles' ? 4 : 2;
        const players = sessionDetail.players;
        const playing = players.some((p) => p.is_playing);
        const waiting = players.filter((p) => p.is_waiting && !p.is_playing).length;
        const can =
            Boolean(sessionDetail.is_active && sessionDetail.is_host && !playing && waiting >= need);
        return {
            canStartMatch: can,
            anyPlaying: playing,
            requiredPlayers: need,
            waitingForMatchCount: waiting,
        };
    }, [sessionDetail]);

    const sessionStatusDisplay = useMemo(() => {
        if (!sessionDetail) {
            return '';
        }
        if (!sessionDetail.is_active) {
            return 'Ended';
        }
        const s = sessionDetail.status ?? 'queueing';
        if (s === 'ongoing') {
            return 'Ongoing';
        }
        if (s === 'finished') {
            return 'Finished';
        }
        if (s === 'queueing' || s === 'pending') {
            return 'Queueing';
        }
        return s ? String(s) : 'Queueing';
    }, [sessionDetail]);

    useEffect(() => {
        if (facilityIdNum == null) {
            setFacilityLabel('');
            return;
        }
        let cancelled = false;

        async function loadFacilityName() {
            try {
                const list = await fetchFacilities();
                if (cancelled) {
                    return;
                }
                const row = list.find((f) => f.id === facilityIdNum);
                setFacilityLabel(row?.name ?? '');
            } catch {
                if (!cancelled) {
                    setFacilityLabel('');
                }
            }
        }

        void loadFacilityName();
        return () => {
            cancelled = true;
        };
    }, [facilityIdNum]);

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
        return lobby.players.map((p) => ({
            key: `lobby-${p.id}`,
            initials: initialsFromName(p.name),
            name: p.name,
            tier: 'At this facility',
            status: 'On roster',
            statusColor: 'text-[#4ce081]',
            detail: p.email,
            isSelf: user?.id != null && p.id === user.id,
            _playing: false,
            _waiting: true,
        }));
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
            : [...queueRows];

        if (statusFilter === 'playing') {
            return searched.filter((p) => p._playing);
        }
        if (statusFilter === 'available') {
            return searched.filter((p) => p._waiting);
        }
        return searched;
    }, [sessionDetail, q, statusFilter, queueRows, lobbyPlayerRows]);

    const sessionHeadline = sessionDetail
        ? `${sessionDetail.sport?.name ?? 'Session'} · ${sessionDetail.match_type === 'doubles' ? 'Doubles' : 'Singles'}`
        : 'GAME ROOM';

    const facilityEyebrow =
        sessionDetail?.facility?.name ?? (facilityLabel.trim() ? facilityLabel : 'Game room');

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

    return (
        <div className="min-h-screen bg-[#131316] text-[#e4e1e6] selection:bg-[#c2c1ff] selection:text-[#282671]">
            <DashboardV2Header user={user} profileLoading={false} />

            <main className="mx-auto min-h-screen max-w-md px-6 pb-32 pt-28">
                <section className="mb-8">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4ce081]">
                        {facilityEyebrow}
                    </p>
                    <h1 className="text-5xl font-extrabold tracking-tight">{sessionHeadline}</h1>
                    {sessionDetail ? (
                        <>
                            <dl className="mt-4 space-y-1 text-sm text-[#c8c5d2]">
                                {sessionDetail.facility ? (
                                    <div className="flex justify-between gap-4">
                                        <dt className="shrink-0 text-[#918f9c]">Facility</dt>
                                        <dd className="max-w-[65%] text-right font-medium text-[#e4e1e6]">
                                            <span className="block">{sessionDetail.facility.name}</span>
                                            <span className="mt-0.5 block text-xs font-normal text-[#918f9c]">
                                                {sessionDetail.facility.address ?? '—'}
                                            </span>
                                        </dd>
                                    </div>
                                ) : null}
                                <div className="flex justify-between gap-4">
                                    <dt className="text-[#918f9c]">Game type</dt>
                                    <dd className="text-right font-medium text-[#e4e1e6]">{sessionDetail.game_type}</dd>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <dt className="text-[#918f9c]">Court</dt>
                                    <dd className="text-right font-medium text-[#e4e1e6]">
                                        {sessionDetail.court_preference ?? '—'}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <dt className="text-[#918f9c]">Players</dt>
                                    <dd className="text-right font-medium text-[#e4e1e6]">
                                        {sessionDetail.participant_count ?? sessionDetail.players?.length ?? '—'}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <dt className="text-[#918f9c]">Status</dt>
                                    <dd className="text-right font-medium text-[#4ce081]">{sessionStatusDisplay}</dd>
                                </div>
                            </dl>
                        </>
                    ) : (
                        <p className="mt-4 text-sm leading-relaxed text-[#c8c5d2]">
                            Active sessions and everyone on the roster at this facility. Open a session for full queue
                            details, or refresh to update the list.
                        </p>
                    )}
                </section>

                {error ? (
                    <div
                        className="mb-6 rounded-xl border border-[#ffb4ab]/40 bg-[#ffb4ab]/10 px-4 py-3 text-sm text-[#ffb4ab]"
                        role="alert"
                    >
                        <p className="mb-2">{error}</p>
                        <Link
                            to={gameRoomBase}
                            className="font-semibold text-[#c2c1ff] underline-offset-2 hover:underline"
                        >
                            Back to facility sessions
                        </Link>
                    </div>
                ) : null}

                {!error && facilityIdNum != null && !sessionIdParam ? (
                    <Link
                        to={`/facility/${facilityIdNum}/create-match`}
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
                ) : null}

                {!sessionIdParam && !error ? (
                    <section className="mb-8 space-y-3">
                        <h2 className="text-lg font-bold text-[#e4e1e6]">Sessions at this facility</h2>
                        {loading ? (
                            <div className="space-y-2">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="h-[72px] animate-pulse rounded-xl bg-[#1b1b1e]" aria-hidden />
                                ))}
                            </div>
                        ) : lobby && lobby.sessions.length > 0 ? (
                            <ul className="space-y-2">
                                {lobby.sessions.map((s) => (
                                    <li key={s.id}>
                                        <Link
                                            to={`${gameRoomBase}?session=${s.id}`}
                                            className="block rounded-xl border border-[#474651]/40 bg-[#1b1b1e] px-4 py-3 transition-colors hover:border-[#c2c1ff]/35 hover:bg-[#1f1f22]"
                                        >
                                            <p className="text-sm font-bold text-[#e4e1e6]">
                                                {s.sport?.name ?? 'Session'} #{s.id}
                                            </p>
                                            <p className="mt-1 text-xs text-[#918f9c]">
                                                {s.match_type} · {s.game_type}
                                                {typeof s.participant_count === 'number'
                                                    ? ` · ${s.participant_count} players`
                                                    : ''}
                                                {s.is_host ? (
                                                    <span className="ml-2 font-semibold text-[#4ce081]">You host</span>
                                                ) : null}
                                            </p>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="rounded-xl bg-[#1b1b1e] px-4 py-4 text-sm text-[#918f9c]">
                                No active sessions at this facility yet.
                            </p>
                        )}
                    </section>
                ) : null}

                <section className="mb-6">
                    <h2 className="mb-3 text-base font-bold text-[#e4e1e6]">
                        {sessionDetail ? 'Session queue' : 'Players at this facility'}
                    </h2>
                    {!sessionDetail ? (
                        <>
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
                                    placeholder="Search by name, email, or queue…"
                                    autoComplete="off"
                                    spellCheck={false}
                                    className="min-w-0 flex-1 bg-transparent text-sm text-[#e4e1e6] placeholder:text-[#918f9c] outline-none"
                                    aria-label="Search players"
                                    disabled={!sessionDetail?.players?.length && lobbyPlayerRows.length === 0}
                                />
                            </label>

                            <h3 className="mb-3 text-xs font-semibold text-[#e4e1e6]">Status Filters</h3>
                            <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter players by status">
                                <button
                                    type="button"
                                    className={filterButtonClass(statusFilter === 'all')}
                                    aria-pressed={statusFilter === 'all'}
                                    onClick={() => setStatusFilter('all')}
                                    disabled={!sessionDetail?.players?.length && lobbyPlayerRows.length === 0}
                                >
                                    All Players
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
                        </>
                    ) : null}

                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-[#1b1b1e]" aria-hidden />
                            ))}
                        </div>
                    ) : !sessionDetail?.players?.length && (!lobbyPlayerRows.length || sessionDetail) ? (
                        <p className="rounded-2xl bg-[#1b1b1e] px-4 py-6 text-center text-sm text-[#918f9c]">
                            {sessionIdParam
                                ? 'No players on this session yet.'
                                : 'No players on active sessions at this facility yet.'}
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {filteredPlayers.map((player) => (
                                <article
                                    key={player.key}
                                    className={`flex items-center justify-between rounded-2xl p-4 transition-colors ${
                                        player.isSelf
                                            ? 'bg-[#c2c1ff]/10 ring-1 ring-[#c2c1ff]/30 hover:bg-[#c2c1ff]/15'
                                            : 'bg-[#1b1b1e] hover:bg-[#1f1f22]'
                                    }`}
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#353438] text-sm font-bold text-[#e4e1e6]">
                                            {player.initials}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="truncate text-sm font-extrabold tracking-wide text-[#e4e1e6]">
                                                {player.name}
                                                {player.isSelf ? (
                                                    <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-[#c2c1ff]">
                                                        You
                                                    </span>
                                                ) : null}
                                            </h4>
                                            <p className="flex items-center">
                                                <TrophyIcon className="mr-1 inline-block size-3 shrink-0 text-[#c8c5d2]" />
                                                <span className="text-sm text-[#c8c5d2]">{player.tier}</span>
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
                    {sessionDetail?.is_active && sessionDetail?.is_host ? (
                        <div className="mt-8 space-y-2">
                            <button
                                type="button"
                                onClick={() => void handleStartGame()}
                                disabled={!canStartMatch || startBusy}
                                aria-busy={startBusy}
                                className="rt-kinetic-gradient w-full shrink-0 rounded-xl px-12 py-5 text-xl font-black italic tracking-tight text-[#211e6a] shadow-2xl transition-transform enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 md:w-auto"
                            >
                                {startBusy ? 'Starting…' : 'Start Game'}
                            </button>
                            {!anyPlaying && waitingForMatchCount < requiredPlayers ? (
                                <p className="text-center text-xs text-[#918f9c]">
                                    Need {requiredPlayers} waiting players in the queue to start ({waitingForMatchCount}{' '}
                                    ready).
                                </p>
                            ) : null}
                            {anyPlaying ? (
                                <p className="text-center text-xs text-[#918f9c]">A match is in progress.</p>
                            ) : null}
                            {startError ? (
                                <p className="text-center text-sm text-[#ffb4ab]" role="alert">
                                    {startError}
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                </section>
            </main>

            <DashboardMobileNav />
        </div>
    );
}
