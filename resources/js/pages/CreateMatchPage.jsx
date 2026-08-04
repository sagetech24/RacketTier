import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchFacilities } from '../api/facilities.js';
import { fetchFacilityPlayers, fetchSports, postCreateGameSession } from '../api/gameSession.js';
import { AppShell } from '../components/app/AppShell.jsx';
import { PageHeader } from '../components/app/PageHeader.jsx';
import { SportCard } from '../components/dashboard/SportCard.jsx';
import { MaterialIcon } from '../components/dashboard/MaterialIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const GAME_TYPE_OPTIONS = [
    { value: '1st-set', label: '1st Set' },
    { value: '2nd-set', label: '2nd Set' },
    { value: '3rd-set', label: '3rd Set' },
    { value: '4th-set', label: '4th Set' },
    { value: 'rematch', label: 'Rematch' },
    { value: 'final-set', label: 'Final Set' },
];

/**
 * @param {string} name
 */
function initialsFromName(name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * @param {'1'|'2'|'3'|'4'|null} court
 * @param {string} courtSpecify
 */
function buildCourtPreference(court, courtSpecify) {
    const t = courtSpecify.trim();
    if (t.length > 0) {
        return t;
    }
    if (court) {
        return `Court ${court}`;
    }
    return null;
}

export function CreateMatchPage() {
    const navigate = useNavigate();
    const { facilityId: facilityIdParam } = useParams();
    const { user } = useAuth();

    const [sports, setSports] = useState(/** @type {import('../api/gameSession.js').SportRow[]} */ ([]));
    const [facilities, setFacilities] = useState(/** @type {import('../api/facilities.js').FacilityRow[]} */ ([]));
    const [facilityPlayers, setFacilityPlayers] = useState(
        /** @type {import('../api/gameSession.js').FacilityPlayerRow[]} */ ([]),
    );
    const [pageLoadError, setPageLoadError] = useState('');
    const [pageLoading, setPageLoading] = useState(true);

    const [facilityId, setFacilityId] = useState(/** @type {number | null} */ (null));

    const [sportSlug, setSportSlug] = useState('');
    const [matchType, setMatchType] = useState(/** @type {'singles' | 'doubles'} */ ('singles'));
    const [gameType, setGameType] = useState('1st-set');
    const [court, setCourt] = useState(/** @type {'1'|'2'|'3'|'4'|null} */ (null));
    const [courtSpecify, setCourtSpecify] = useState('');
    const [playerSearch, setPlayerSearch] = useState('');
    const [invitedIds, setInvitedIds] = useState(() => new Set(/** @type {number[]} */ ([])));
    const [teamByUserId, setTeamByUserId] = useState(/** @type {Record<number, 1 | 2>} */ ({}));

    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [fieldErrors, setFieldErrors] = useState(/** @type {Record<string, string[]>} */ ({}));

    const reloadPlayers = useCallback(async () => {
        const rows = await fetchFacilityPlayers();
        setFacilityPlayers(rows);
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setPageLoadError('');
            setPageLoading(true);
            try {
                const [sportRows, playerRows, facilityRows] = await Promise.all([
                    fetchSports(),
                    fetchFacilityPlayers(),
                    fetchFacilities(),
                ]);
                if (cancelled) {
                    return;
                }
                setSports(sportRows);
                setFacilityPlayers(playerRows);
                setFacilities(facilityRows);
                if (sportRows.length > 0) {
                    setSportSlug((prev) => (sportRows.some((s) => s.slug === prev) ? prev : sportRows[0].slug));
                }
            } catch {
                if (!cancelled) {
                    setPageLoadError('Could not load create-match data. Refresh and try again.');
                }
            } finally {
                if (!cancelled) {
                    setPageLoading(false);
                }
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (pageLoading) {
            return;
        }
        if (!facilityIdParam || !/^\d+$/.test(facilityIdParam)) {
            navigate('/facilities', { replace: true });
            return;
        }
        const id = Number.parseInt(facilityIdParam, 10);
        if (!facilities.some((f) => f.id === id)) {
            setPageLoadError('That facility was not found in your directory.');
            setFacilityId(null);
            return;
        }
        setPageLoadError('');
        setFacilityId(id);
    }, [pageLoading, facilities, facilityIdParam, navigate]);

    const hostId = user?.id != null ? Number(user.id) : null;

    useEffect(() => {
        setInvitedIds((prev) => {
            const arr = [...prev];
            const cap = matchType === 'doubles' ? 3 : 1;
            if (arr.length <= cap) {
                return prev;
            }
            return new Set(arr.slice(0, cap));
        });
    }, [matchType]);

    const selectedFacility = useMemo(
        () => facilities.find((f) => f.id === facilityId) ?? null,
        [facilities, facilityId],
    );

    const q = playerSearch.trim().toLowerCase();
    const filteredPlayers = useMemo(() => {
        const list = !q
            ? facilityPlayers
            : facilityPlayers.filter(
                  (p) =>
                      p.name.toLowerCase().includes(q) ||
                      p.email.toLowerCase().includes(q) ||
                      String(p.id).includes(q),
              );
        if (hostId == null) {
            return list;
        }
        return list.filter((p) => p.id !== hostId);
    }, [facilityPlayers, q, hostId]);

    const invitedSortedIds = useMemo(() => [...invitedIds].sort((a, b) => a - b), [invitedIds]);

    useEffect(() => {
        if (hostId == null) {
            return;
        }
        setTeamByUserId((prev) => {
            if (matchType === 'singles' && invitedSortedIds.length === 1) {
                const peer = invitedSortedIds[0];
                const roster = new Set([hostId, peer]);
                const next = { ...prev };
                for (const id of roster) {
                    if (next[id] !== 1 && next[id] !== 2) {
                        next[id] = id === hostId ? 1 : 2;
                    }
                }
                return Object.fromEntries(
                    Object.entries(next).filter(([k]) => roster.has(Number(k))),
                ) /** @type {Record<number, 1 | 2>} */;
            }
            if (matchType === 'doubles' && invitedSortedIds.length === 3) {
                const rosterIds = [hostId, ...invitedSortedIds];
                const roster = new Set(rosterIds);
                const next = { ...prev };
                for (const id of rosterIds) {
                    if (next[id] !== 1 && next[id] !== 2) {
                        next[id] = id === hostId || id === invitedSortedIds[0] ? 1 : 2;
                    }
                }
                return Object.fromEntries(
                    Object.entries(next).filter(([k]) => roster.has(Number(k))),
                ) /** @type {Record<number, 1 | 2>} */;
            }
            return {};
        });
    }, [hostId, matchType, invitedSortedIds]);

    const toggleInvite = useCallback(
        (id) => {
            if (hostId != null && id === hostId) {
                return;
            }
            setInvitedIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) {
                    next.delete(id);
                    return next;
                }
                const cap = matchType === 'doubles' ? 3 : 1;
                if (next.size >= cap) {
                    if (matchType === 'singles') {
                        return new Set([id]);
                    }
                    return next;
                }
                next.add(id);
                return next;
            });
        },
        [matchType, hostId],
    );

    const setPlayerTeam = useCallback((userId, team) => {
        setTeamByUserId((prev) => ({ ...prev, [userId]: team }));
    }, []);

    const sportLabel = sports.find((s) => s.slug === sportSlug)?.name ?? sportSlug;
    const gameTypeLabel = GAME_TYPE_OPTIONS.find((o) => o.value === gameType)?.label ?? gameType;
    const courtPreferenceLabel = (() => {
        const pref = buildCourtPreference(court, courtSpecify);
        return pref ?? 'Not selected';
    })();

    const invitedPlayers = useMemo(
        () => facilityPlayers.filter((p) => invitedIds.has(p.id)),
        [facilityPlayers, invitedIds],
    );

    const rosterForTeams = useMemo(() => {
        if (hostId == null || user == null) {
            return /** @type {Array<{ id: number, name: string, email: string, isHost: boolean }>} */ ([]);
        }
        const hostRow = {
            id: hostId,
            name: user.name?.trim() || user.email?.trim() || 'You',
            email: user.email?.trim() ?? '',
            isHost: true,
        };
        const others = [...invitedPlayers].sort((a, b) => a.id - b.id).map((p) => ({
            id: p.id,
            name: p.name,
            email: p.email,
            isHost: false,
        }));
        return [hostRow, ...others];
    }, [hostId, user, invitedPlayers]);

    const requiredInvitees = matchType === 'doubles' ? 3 : 1;
    const inviteCountOk = invitedSortedIds.length === requiredInvitees;

    const teamSummaryLines = useMemo(() => {
        if (!inviteCountOk || hostId == null) {
            return { team1: /** @type {string[]} */ ([]), team2: /** @type {string[]} */ ([]) };
        }
        const namesById = new Map(rosterForTeams.map((r) => [r.id, r.name]));
        const ids =
            matchType === 'singles' ? [hostId, invitedSortedIds[0]] : [hostId, ...invitedSortedIds];
        const team1 = ids.filter((id) => teamByUserId[id] === 1).map((id) => namesById.get(id) ?? `#${id}`);
        const team2 = ids.filter((id) => teamByUserId[id] === 2).map((id) => namesById.get(id) ?? `#${id}`);
        return { team1, team2 };
    }, [inviteCountOk, hostId, rosterForTeams, matchType, invitedSortedIds, teamByUserId]);

    const teamsValid = useMemo(() => {
        if (hostId == null) {
            return false;
        }
        if (matchType === 'singles') {
            if (invitedSortedIds.length !== 1) {
                return false;
            }
            const peer = invitedSortedIds[0];
            const a = teamByUserId[hostId];
            const b = teamByUserId[peer];
            if (a !== 1 && a !== 2) {
                return false;
            }
            if (b !== 1 && b !== 2) {
                return false;
            }
            return a !== b;
        }
        if (matchType === 'doubles') {
            if (invitedSortedIds.length !== 3) {
                return false;
            }
            const ids = [hostId, ...invitedSortedIds];
            const c1 = ids.filter((uid) => teamByUserId[uid] === 1).length;
            const c2 = ids.filter((uid) => teamByUserId[uid] === 2).length;
            return c1 === 2 && c2 === 2;
        }
        return false;
    }, [hostId, matchType, invitedSortedIds, teamByUserId]);

    async function handleSendInvites() {
        setSubmitError('');
        setFieldErrors({});
        setSubmitting(true);
        try {
            if (hostId == null) {
                setSubmitError('You must be signed in to create a session.');
                setSubmitting(false);
                return;
            }
            const courtPreference = buildCourtPreference(court, courtSpecify);
            const rosterIds =
                matchType === 'singles' ? [hostId, invitedSortedIds[0]] : [hostId, ...invitedSortedIds];
            const team_assignments = rosterIds.map((uid) => ({
                user_id: uid,
                team: /** @type {1 | 2} */ (teamByUserId[uid]),
            }));
            const res = await postCreateGameSession({
                facility_id: facilityId ?? 0,
                sport_slug: sportSlug,
                match_type: matchType,
                game_type: gameType,
                court_preference: courtPreference,
                player_ids: invitedSortedIds,
                team_assignments,
            });

            const data = await res.json().catch(() => ({}));

            if (res.status === 422) {
                setFieldErrors(data.errors ?? {});
                setSubmitError(data.message ?? 'Check the highlighted fields and try again.');
                setSubmitting(false);
                return;
            }

            if (!res.ok) {
                setSubmitError('Something went wrong. Try again.');
                setSubmitting(false);
                return;
            }

            const sessionId = data.data?.id;
            if (sessionId != null && facilityId != null) {
                navigate(
                    `/facility/${facilityId}/game-room?session=${encodeURIComponent(String(sessionId))}`,
                    { replace: false },
                );
            } else if (sessionId != null) {
                setSubmitError('Session created but facility was missing.');
                setSubmitting(false);
            } else {
                setSubmitError('Session created but response was unexpected.');
                setSubmitting(false);
            }
        } catch {
            setSubmitError('Network error. Check your connection.');
            setSubmitting(false);
        }
    }

    const canSubmit =
        !pageLoading &&
        !submitting &&
        facilityId != null &&
        sportSlug.length > 0 &&
        inviteCountOk &&
        teamsValid &&
        sports.length > 0 &&
        hostId != null;

    const playerIdsError = fieldErrors.player_ids?.[0] ?? '';
    const teamAssignmentsError = fieldErrors.team_assignments?.[0] ?? '';
    const facilityIdError = fieldErrors.facility_id?.[0] ?? '';

    const subtitle = selectedFacility
        ? `New session at ${selectedFacility.name}. Choose sport, invite players, then set teams.`
        : pageLoading
          ? 'Loading venue details…'
          : 'Pick sport and match details, invite players, then assign teams.';

    return (
        <AppShell user={user}>
            <div className="rt-create-match">
                <div className="mb-4">
                    <Link to="/facilities" className="rt-facility-back">
                        <MaterialIcon name="arrow_back" className="text-lg" />
                        Facilities
                    </Link>
                </div>

                <PageHeader
                    eyebrow="New session"
                    title="Create match"
                    subtitle={subtitle}
                />

                {pageLoadError ? (
                    <div className="rt-alert-error mb-8" role="alert">
                        {pageLoadError}
                    </div>
                ) : null}

                {submitError ? (
                    <div className="rt-alert-error mb-8" role="alert">
                        {submitError}
                    </div>
                ) : null}

                {playerIdsError ? (
                    <div className="rt-alert-error mb-8" role="alert">
                        {playerIdsError}
                    </div>
                ) : null}

                {teamAssignmentsError ? (
                    <div className="rt-alert-error mb-8" role="alert">
                        {teamAssignmentsError}
                    </div>
                ) : null}

                {facilityIdError ? (
                    <div className="rt-alert-error mb-8" role="alert">
                        {facilityIdError}
                    </div>
                ) : null}

                <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
                    <section className={`md:col-span-12 ${!facilityId ? 'pointer-events-none opacity-40' : ''}`}>
                        <h2 className="rt-create-match-step">
                            <span className="rt-create-match-step-num" aria-hidden>
                                1
                            </span>
                            Select sport
                        </h2>
                        {pageLoading ? (
                            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="rt-skeleton h-[120px] rounded-xl" aria-hidden />
                                ))}
                            </div>
                        ) : sports.length === 0 ? (
                            <p className="text-sm text-[#918f9c]">No sports configured. Run database migrations.</p>
                        ) : (
                            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
                    </section>

                    <section className={`md:col-span-12 ${!facilityId ? 'pointer-events-none opacity-40' : ''}`}>
                        <h2 className="rt-create-match-step">
                            <span className="rt-create-match-step-num" aria-hidden>
                                2
                            </span>
                            Game details
                        </h2>
                        <div className="rt-create-match-panel space-y-6">
                            <div className="space-y-2">
                                <label className="rt-facility-field-label">Match type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(
                                        [
                                            { value: 'singles', label: 'Singles' },
                                            { value: 'doubles', label: 'Doubles' },
                                        ]
                                    ).map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setMatchType(/** @type {'singles'|'doubles'} */ (opt.value))}
                                            className={[
                                                'rt-create-match-choice min-h-11',
                                                matchType === opt.value ? 'rt-create-match-choice-on' : '',
                                            ].join(' ')}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="rt-facility-field-label" htmlFor="rt-create-game-type">
                                    Game type
                                </label>
                                <select
                                    id="rt-create-game-type"
                                    value={gameType}
                                    onChange={(e) => setGameType(e.target.value)}
                                    className="rt-facility-field"
                                    disabled={pageLoading}
                                >
                                    {GAME_TYPE_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <p className="rt-facility-field-label">Court preference</p>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    {['1', '2', '3', '4'].map((n) => (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => {
                                                setCourt(n);
                                                setCourtSpecify('');
                                            }}
                                            className={[
                                                'rt-create-match-choice min-h-11',
                                                court === n ? 'rt-create-match-choice-on' : '',
                                            ].join(' ')}
                                        >
                                            Court {n}
                                        </button>
                                    ))}
                                    <div className="col-span-2 space-y-2 sm:col-span-4">
                                        <label className="rt-facility-field-label" htmlFor="rt-create-court-specify">
                                            Or specify a court
                                        </label>
                                        <input
                                            id="rt-create-court-specify"
                                            type="text"
                                            value={courtSpecify}
                                            onChange={(e) => {
                                                setCourtSpecify(e.target.value);
                                                setCourt(null);
                                            }}
                                            className="rt-facility-field"
                                            placeholder="Court 1, Court 2, etc."
                                            disabled={pageLoading}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className={`md:col-span-12 ${!facilityId ? 'pointer-events-none opacity-40' : ''}`}>
                        <h2 className="rt-create-match-step">
                            <span className="rt-create-match-step-num" aria-hidden>
                                3
                            </span>
                            Select players
                        </h2>
                        <div className="rt-create-match-panel space-y-5">
                            <div className="relative">
                                <MaterialIcon
                                    name="search"
                                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#918f9c]"
                                />
                                <input
                                    className="rt-facility-field !pl-12"
                                    placeholder="Search facility players…"
                                    type="search"
                                    value={playerSearch}
                                    onChange={(e) => setPlayerSearch(e.target.value)}
                                    aria-label="Search players"
                                    disabled={pageLoading}
                                />
                            </div>
                            <p className="text-xs leading-relaxed text-[#918f9c]">
                                {matchType === 'doubles'
                                    ? 'Doubles: invite exactly three other members (four including you), then assign teams.'
                                    : 'Singles: invite exactly one other member, then assign sides.'}
                            </p>
                            <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1 rt-hide-scrollbar">
                                {pageLoading ? (
                                    <div className="space-y-2">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <div key={i} className="rt-skeleton h-16 rounded-xl" aria-hidden />
                                        ))}
                                    </div>
                                ) : filteredPlayers.length === 0 ? (
                                    <div className="space-y-3 rounded-xl border border-dashed border-white/10 px-4 py-6 text-sm text-[#918f9c]">
                                        <p>No players match your search.</p>
                                        <p>
                                            Need someone to invite?{' '}
                                            <button
                                                type="button"
                                                className="cursor-pointer font-semibold text-[#c2c1ff] underline-offset-2 hover:underline"
                                                onClick={() => {
                                                    void reloadPlayers();
                                                }}
                                            >
                                                Reload list
                                            </button>{' '}
                                            or register another account.
                                        </p>
                                    </div>
                                ) : (
                                    filteredPlayers.map((p) => {
                                        const on = invitedIds.has(p.id);
                                        return (
                                            <div
                                                key={p.id}
                                                className={[
                                                    'flex items-center justify-between gap-3 rounded-xl border px-3 py-3 transition-colors duration-200',
                                                    on
                                                        ? 'border-[#4ce081]/35 bg-[#4ce081]/12'
                                                        : 'border-transparent bg-[#0f0f12] hover:border-white/8 hover:bg-[#1f1f22]',
                                                ].join(' ')}
                                            >
                                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                                    <div className="rt-player-avatar shrink-0" aria-hidden>
                                                        {initialsFromName(p.name)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-bold text-[#e4e1e6]">{p.name}</p>
                                                        <p className="truncate text-xs text-[#918f9c]">{p.email}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleInvite(p.id)}
                                                    className={[
                                                        'inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c2c1ff]/65',
                                                        on
                                                            ? 'bg-[#4ce081] text-[#003919]'
                                                            : 'bg-[#353438] text-[#c2c1ff] hover:bg-[#c2c1ff] hover:text-[#211e6a]',
                                                    ].join(' ')}
                                                    aria-pressed={on}
                                                    aria-label={on ? `Remove ${p.name}` : `Invite ${p.name}`}
                                                >
                                                    <MaterialIcon name={on ? 'check' : 'add'} className="text-xl" filled={on} />
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </section>

                    <section
                        className={`md:col-span-12 ${!facilityId ? 'pointer-events-none opacity-40' : ''} ${
                            !inviteCountOk ? 'opacity-50' : ''
                        }`}
                    >
                        <h2 className="rt-create-match-step">
                            <span className="rt-create-match-step-num" aria-hidden>
                                4
                            </span>
                            Team lineup
                        </h2>
                        <p className="mb-4 text-xs leading-relaxed text-[#918f9c]">
                            {matchType === 'singles'
                                ? 'Put yourself and your opponent on team 1 and team 2 (one player per side).'
                                : 'Split four players into two pairs — team 1 vs team 2.'}
                        </p>
                        {!inviteCountOk ? (
                            <p className="rounded-xl border border-dashed border-white/10 bg-[#1b1b1e]/80 px-4 py-6 text-sm text-[#918f9c]">
                                {matchType === 'doubles'
                                    ? 'Invite exactly three other players in step 3, then assign teams here.'
                                    : 'Invite exactly one other player in step 3, then assign teams here.'}
                            </p>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2">
                                {rosterForTeams.map((row) => {
                                    const t = teamByUserId[row.id];
                                    return (
                                        <div key={row.id} className="rt-create-match-panel flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                                <div className="rt-player-avatar shrink-0" aria-hidden>
                                                    {initialsFromName(row.name)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-bold text-[#e4e1e6]">
                                                        {row.name}
                                                        {row.isHost ? (
                                                            <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-[#4ce081]">
                                                                Host
                                                            </span>
                                                        ) : null}
                                                    </p>
                                                    <p className="truncate text-xs text-[#918f9c]">{row.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setPlayerTeam(row.id, 1)}
                                                    className={[
                                                        'rt-create-match-choice min-h-11 flex-1 px-4 sm:flex-none',
                                                        t === 1 ? 'rt-create-match-choice-on' : '',
                                                    ].join(' ')}
                                                >
                                                    Team 1
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setPlayerTeam(row.id, 2)}
                                                    className={[
                                                        'rt-create-match-choice min-h-11 flex-1 px-4 sm:flex-none',
                                                        t === 2 ? 'rt-create-match-choice-green' : '',
                                                    ].join(' ')}
                                                >
                                                    Team 2
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {inviteCountOk && !teamsValid ? (
                            <p className="mt-4 text-xs text-[#ffb4ab]" role="alert">
                                {matchType === 'singles'
                                    ? 'Singles needs one player on team 1 and one on team 2.'
                                    : 'Doubles needs exactly two players on each team.'}
                            </p>
                        ) : null}
                    </section>
                </div>

                <h2 className={`rt-create-match-step mt-2 ${!facilityId ? 'opacity-40' : ''}`}>
                    <span className="rt-create-match-step-num" aria-hidden>
                        5
                    </span>
                    Match summary
                </h2>
                <div
                    className={`flex flex-col items-stretch gap-5 ${!facilityId ? 'pointer-events-none opacity-40' : ''}`}
                >
                    <div className="rt-create-match-panel space-y-4">
                        <p className="rt-section-eyebrow !mb-0 text-[#4ce081]">Ready to create</p>
                        <dl className="space-y-3 text-sm">
                            <div className="flex items-start justify-between gap-4">
                                <dt className="shrink-0 text-[#918f9c]">Facility</dt>
                                <dd className="max-w-[60%] text-right font-bold text-[#e4e1e6]">
                                    {selectedFacility ? (
                                        <>
                                            <span className="block">{selectedFacility.name}</span>
                                            <span className="mt-1 block text-xs font-normal text-[#918f9c]">
                                                {selectedFacility.address ?? '—'}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-[#918f9c]">Not selected</span>
                                    )}
                                </dd>
                            </div>
                            <div className="flex items-start justify-between gap-4">
                                <dt className="shrink-0 text-[#918f9c]">Sport</dt>
                                <dd className="text-right font-bold text-[#e4e1e6]">{sportLabel || '—'}</dd>
                            </div>
                            <div className="flex items-start justify-between gap-4">
                                <dt className="shrink-0 text-[#918f9c]">Match type</dt>
                                <dd className="text-right font-bold capitalize text-[#e4e1e6]">{matchType}</dd>
                            </div>
                            <div className="flex items-start justify-between gap-4">
                                <dt className="shrink-0 text-[#918f9c]">Game type</dt>
                                <dd className="text-right font-bold text-[#e4e1e6]">{gameTypeLabel}</dd>
                            </div>
                            <div className="flex items-start justify-between gap-4">
                                <dt className="shrink-0 text-[#918f9c]">Court</dt>
                                <dd className="text-right font-bold text-[#e4e1e6]">{courtPreferenceLabel}</dd>
                            </div>
                            {inviteCountOk ? (
                                <>
                                    <div className="flex items-start justify-between gap-4">
                                        <dt className="shrink-0 text-[#918f9c]">Team 1</dt>
                                        <dd className="max-w-[60%] text-right font-bold text-[#e4e1e6]">
                                            {teamSummaryLines.team1.length > 0
                                                ? teamSummaryLines.team1.join(' · ')
                                                : '—'}
                                        </dd>
                                    </div>
                                    <div className="flex items-start justify-between gap-4">
                                        <dt className="shrink-0 text-[#918f9c]">Team 2</dt>
                                        <dd className="max-w-[60%] text-right font-bold text-[#e4e1e6]">
                                            {teamSummaryLines.team2.length > 0
                                                ? teamSummaryLines.team2.join(' · ')
                                                : '—'}
                                        </dd>
                                    </div>
                                </>
                            ) : null}
                        </dl>
                        <div className="border-t border-white/5 pt-4">
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#c8c5d2]">
                                Invited members
                            </p>
                            {invitedPlayers.length > 0 ? (
                                <ul className="space-y-3">
                                    {invitedPlayers.map((p) => (
                                        <li
                                            key={p.id}
                                            className="flex items-start justify-between gap-3 text-sm font-semibold text-[#e4e1e6]"
                                        >
                                            <span>{p.name}</span>
                                            <span className="max-w-[45%] truncate text-xs font-medium text-[#918f9c]">
                                                {p.email}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-[#918f9c]">No players selected yet.</p>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => void handleSendInvites()}
                        disabled={!canSubmit}
                        aria-busy={submitting}
                        title={
                            !canSubmit && !submitting
                                ? !facilityId
                                    ? 'Facility unavailable. Go back to facilities and try again.'
                                    : !sportSlug
                                      ? undefined
                                      : !inviteCountOk
                                        ? matchType === 'doubles'
                                            ? 'Invite exactly three other players.'
                                            : 'Invite exactly one other player.'
                                        : !teamsValid
                                          ? 'Assign teams in step 4 (one vs one for singles, two vs two for doubles).'
                                          : undefined
                                : undefined
                        }
                        className="rt-kinetic-gradient w-full cursor-pointer rounded-xl px-8 py-4 text-lg font-extrabold tracking-tight text-[#211e6a] transition-transform duration-150 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c2c1ff]/70"
                    >
                        {submitting ? 'Creating…' : 'Create match'}
                    </button>
                </div>
            </div>
        </AppShell>
    );
}
