import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../../css/dashboard-v2.css';
import { fetchFacilities, postFacility } from '../api/facilities.js';
import { fetchFacilityPlayers, fetchSports, postCreateGameSession } from '../api/gameSession.js';
import { SportCard } from '../components/dashboard/SportCard.jsx';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav.jsx';
import { DashboardV2Header } from '../components/dashboard/DashboardV2Header.jsx';
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
 * @param {number} id
 */
function avatarHue(id) {
    return (id * 47) % 360;
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
    const [facilitySearch, setFacilitySearch] = useState('');
    const [addFacilityOpen, setAddFacilityOpen] = useState(false);
    const [newFacilityName, setNewFacilityName] = useState('');
    const [newFacilityAddress, setNewFacilityAddress] = useState('');
    const [addFacilitySubmitting, setAddFacilitySubmitting] = useState(false);
    const [addFacilityError, setAddFacilityError] = useState('');
    const [addFacilityFieldErrors, setAddFacilityFieldErrors] = useState(/** @type {Record<string, string[]>} */ ({}));

    const [sportSlug, setSportSlug] = useState('');
    const [matchType, setMatchType] = useState(/** @type {'singles' | 'doubles'} */ ('singles'));
    const [gameType, setGameType] = useState('1st-set');
    const [court, setCourt] = useState(/** @type {'1'|'2'|'3'|'4'|null} */ (null));
    const [courtSpecify, setCourtSpecify] = useState('');
    const [playerSearch, setPlayerSearch] = useState('');
    const [invitedIds, setInvitedIds] = useState(() => new Set(/** @type {number[]} */ ([])));

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

    const facilityQ = facilitySearch.trim().toLowerCase();
    const filteredFacilities = useMemo(() => {
        if (!facilityQ) {
            return facilities;
        }
        return facilities.filter(
            (f) =>
                f.name.toLowerCase().includes(facilityQ) ||
                (f.address ?? '').toLowerCase().includes(facilityQ),
        );
    }, [facilities, facilityQ]);

    const selectedFacility = useMemo(
        () => facilities.find((f) => f.id === facilityId) ?? null,
        [facilities, facilityId],
    );

    const q = playerSearch.trim().toLowerCase();
    const filteredPlayers = useMemo(() => {
        if (!q) {
            return facilityPlayers;
        }
        return facilityPlayers.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                p.email.toLowerCase().includes(q) ||
                String(p.id).includes(q),
        );
    }, [facilityPlayers, q]);

    const toggleInvite = useCallback((id) => {
        setInvitedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
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

    async function handleSendInvites() {
        setSubmitError('');
        setFieldErrors({});
        setSubmitting(true);
        try {
            const courtPreference = buildCourtPreference(court, courtSpecify);
            const res = await postCreateGameSession({
                facility_id: facilityId ?? 0,
                sport_slug: sportSlug,
                match_type: matchType,
                game_type: gameType,
                court_preference: courtPreference,
                player_ids: [...invitedIds],
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

    const minOthers = matchType === 'doubles' ? 3 : 1;
    const canSubmit =
        !pageLoading &&
        !submitting &&
        facilityId != null &&
        sportSlug.length > 0 &&
        invitedIds.size >= minOthers &&
        sports.length > 0;

    const playerIdsError = fieldErrors.player_ids?.[0] ?? '';
    const facilityIdError = fieldErrors.facility_id?.[0] ?? '';

    async function handleAddFacility(e) {
        e.preventDefault();
        setAddFacilityError('');
        setAddFacilityFieldErrors({});
        setAddFacilitySubmitting(true);
        try {
            const created = await postFacility({
                name: newFacilityName.trim(),
                address: newFacilityAddress.trim(),
            });
            setFacilities((prev) => [created, ...prev.filter((f) => f.id !== created.id)]);
            setFacilityId(created.id);
            navigate(`/facility/${created.id}/create-match`, { replace: true });
            setAddFacilityOpen(false);
            setNewFacilityName('');
            setNewFacilityAddress('');
        } catch (err) {
            if (err && typeof err === 'object' && 'errors' in err && err.errors) {
                setAddFacilityFieldErrors(/** @type {Record<string, string[]>} */ (err.errors));
            }
            setAddFacilityError(err instanceof Error ? err.message : 'Could not add facility.');
        } finally {
            setAddFacilitySubmitting(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#131316] pb-32 text-[#e4e1e6]">
            <DashboardV2Header user={user} profileLoading={false} />

            <main className="mx-auto max-w-4xl px-6 pt-24">
                <header className="mb-12">
                    <div className="mb-2 flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#4ce081]">New Session</span>
                        <div className="h-px grow bg-[#474651] opacity-20" />
                    </div>
                    <h1 className="mb-4 text-5xl font-extrabold leading-none tracking-tighter">
                        CREATE <span className="italic text-[#c2c1ff]">MATCH</span>
                    </h1>
                    <p className="max-w-md text-sm leading-relaxed text-[#c8c5d2]">
                        Start by choosing a facility, then pick sport, players, and game details. Add a new venue anytime
                        if yours is not in the directory.
                    </p>
                </header>

                {pageLoadError ? (
                    <div
                        className="mb-8 rounded-xl border border-[#ffb4ab]/40 bg-[#ffb4ab]/10 px-4 py-3 text-sm text-[#ffb4ab]"
                        role="alert"
                    >
                        {pageLoadError}
                    </div>
                ) : null}

                {submitError ? (
                    <div
                        className="mb-8 rounded-xl border border-[#ffb4ab]/40 bg-[#ffb4ab]/10 px-4 py-3 text-sm text-[#ffb4ab]"
                        role="alert"
                    >
                        {submitError}
                    </div>
                ) : null}

                {playerIdsError ? (
                    <div
                        className="mb-8 rounded-xl border border-[#ffb4ab]/40 bg-[#ffb4ab]/10 px-4 py-3 text-sm text-[#ffb4ab]"
                        role="alert"
                    >
                        {playerIdsError}
                    </div>
                ) : null}

                {facilityIdError ? (
                    <div
                        className="mb-8 rounded-xl border border-[#ffb4ab]/40 bg-[#ffb4ab]/10 px-4 py-3 text-sm text-[#ffb4ab]"
                        role="alert"
                    >
                        {facilityIdError}
                    </div>
                ) : null}

                <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
                    <section className="md:col-span-12">
                        <h2 className="mb-6 flex items-center gap-3 text-xl font-bold">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#353438] text-[16px] font-black">
                                1
                            </span>
                            SELECT FACILITY
                        </h2>
                        <p className="mb-4 text-xs text-[#918f9c]">
                            Required before sport or players. Search the directory or add a new facility if needed.
                        </p>
                        <div className="relative mb-4">
                            <MaterialIcon
                                name="search"
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#c8c5d2]"
                            />
                            <input
                                className="w-full rounded-lg border-none bg-[#1b1b1e] py-4 pl-12 pr-4 text-sm text-[#e4e1e6] placeholder:text-[#918f9c] focus:ring-1 focus:ring-[#c2c1ff]/20"
                                placeholder="Search venues by name or address…"
                                type="search"
                                value={facilitySearch}
                                onChange={(e) => setFacilitySearch(e.target.value)}
                                aria-label="Search facilities"
                                disabled={pageLoading}
                            />
                        </div>
                        <div className="mb-6">
                            <button
                                type="button"
                                onClick={() => {
                                    setAddFacilityOpen(true);
                                    setAddFacilityError('');
                                    setAddFacilityFieldErrors({});
                                }}
                                className="inline-flex items-center gap-2 rounded-full border border-[#c2c1ff]/40 bg-[#c2c1ff]/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#c2c1ff] transition-colors hover:bg-[#c2c1ff]/20"
                            >
                                <MaterialIcon name="add" className="text-base" />
                                Add new facility
                            </button>
                        </div>
                        {pageLoading ? (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="h-28 animate-pulse rounded-xl bg-[#1b1b1e]" aria-hidden />
                                ))}
                            </div>
                        ) : filteredFacilities.length === 0 ? (
                            <p className="rounded-xl bg-[#1b1b1e] px-4 py-6 text-sm text-[#918f9c]">
                                No facilities match your search.{' '}
                                <button
                                    type="button"
                                    className="font-semibold text-[#c2c1ff] underline-offset-2 hover:underline"
                                    onClick={() => setAddFacilityOpen(true)}
                                >
                                    Add a new facility
                                </button>
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {filteredFacilities.map((f) => {
                                    const on = facilityId === f.id;
                                    return (
                                        <button
                                            key={f.id}
                                            type="button"
                                            onClick={() => navigate(`/facility/${f.id}/create-match`)}
                                            className={`rounded-xl border p-5 text-left transition-all ${
                                                on
                                                    ? 'border-[#4ce081] bg-[#4ce081]/15 ring-1 ring-[#4ce081]/40'
                                                    : 'border-[#353438] bg-[#1b1b1e] hover:border-[#c2c1ff]/35 hover:bg-[#1f1f22]'
                                            }`}
                                        >
                                            <p className="text-base font-bold text-[#e4e1e6]">{f.name}</p>
                                            <p className="mt-2 text-xs leading-relaxed text-[#918f9c]">
                                                {f.address ?? '—'}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <section className={`md:col-span-12 ${!facilityId ? 'pointer-events-none opacity-40' : ''}`}>
                        <h2 className="mb-6 flex items-center gap-3 text-xl font-bold">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#353438] text-[16px] font-black">
                                2
                            </span>
                            SELECT SPORTS
                        </h2>
                        {pageLoading ? (
                            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="h-[120px] animate-pulse rounded-xl bg-[#1b1b1e]"
                                        aria-hidden
                                    />
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

                    <section className={`md:col-span-7 ${!facilityId ? 'pointer-events-none opacity-40' : ''}`}>
                        <h2 className="mb-6 flex items-center gap-3 text-xl font-bold">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#353438] text-[16px] font-black">
                                3
                            </span>
                            SELECT PLAYERS
                        </h2>
                        <div className="space-y-6 rounded-xl bg-[#1b1b1e] p-6">
                            <div className="relative">
                                <MaterialIcon
                                    name="search"
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#c8c5d2]"
                                />
                                <input
                                    className="w-full rounded-lg border-none bg-[#0e0e11] py-4 pl-12 pr-4 text-sm text-[#e4e1e6] placeholder:text-[#918f9c] focus:ring-1 focus:ring-[#c2c1ff]/20"
                                    placeholder="Search facility players..."
                                    type="search"
                                    value={playerSearch}
                                    onChange={(e) => setPlayerSearch(e.target.value)}
                                    aria-label="Search players"
                                    disabled={pageLoading}
                                />
                            </div>
                            <p className="text-xs text-[#918f9c]">
                                {matchType === 'doubles'
                                    ? 'Doubles: invite at least 3 other members (you are added as host automatically).'
                                    : 'Singles: invite at least 1 other member.'}
                            </p>
                            <div className={`max-h-[320px] space-y-3 overflow-y-auto pr-2 rt-hide-scrollbar`}>
                                {pageLoading ? (
                                    <div className="space-y-3">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <div key={i} className="h-16 animate-pulse rounded-lg bg-[#0e0e11]" aria-hidden />
                                        ))}
                                    </div>
                                ) : filteredPlayers.length === 0 ? (
                                    <div className="space-y-3 text-sm text-[#918f9c]">
                                        <p>No players match your search.</p>
                                        <p>
                                            Need someone to invite?{' '}
                                            <button
                                                type="button"
                                                className="font-semibold text-[#c2c1ff] underline-offset-2 hover:underline"
                                                onClick={() => {
                                                    void reloadPlayers();
                                                }}
                                            >
                                                Reload list
                                            </button>{' '}
                                            or register another account in your browser.
                                        </p>
                                    </div>
                                ) : (
                                    filteredPlayers.map((p) => {
                                        const on = invitedIds.has(p.id);
                                        const hue = avatarHue(p.id);
                                        return (
                                            <div
                                                key={p.id}
                                                className={`flex items-center justify-between rounded-lg p-3 transition-colors ${
                                                    on ? 'bg-[#4ce081]/20' : 'group hover:bg-[#1f1f22]'
                                                }`}
                                            >
                                                <div className="flex min-w-0 flex-1 items-center gap-4">
                                                    <div
                                                        className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-black text-[#282671]"
                                                        style={{
                                                            background: `linear-gradient(135deg, hsl(${hue}, 70%, 72%), hsl(${(hue + 40) % 360}, 65%, 58%))`,
                                                        }}
                                                    >
                                                        {initialsFromName(p.name)}
                                                        {on ? (
                                                            <div className="absolute inset-0 bg-[#c2c1ff]/20" />
                                                        ) : null}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-bold">{p.name}</p>
                                                        <p className="truncate text-[10px] font-bold tracking-wider text-[#4ce081]">
                                                            {p.email}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleInvite(p.id)}
                                                    className={`ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all ${
                                                        on
                                                            ? 'bg-[#4ce081] text-[#282671]'
                                                            : 'bg-[#353438] text-[#c2c1ff] group-hover:bg-[#c2c1ff] group-hover:text-[#282671]'
                                                    }`}
                                                    aria-pressed={on}
                                                    aria-label={on ? 'Remove invite' : 'Add invite'}
                                                >
                                                    <MaterialIcon
                                                        name={on ? 'check' : 'add'}
                                                        className="text-lg"
                                                        filled={on}
                                                    />
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </section>

                    <section className={`md:col-span-5 ${!facilityId ? 'pointer-events-none opacity-40' : ''}`}>
                        <h2 className="mb-6 flex items-center gap-3 text-xl font-bold">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#353438] text-[16px] font-black">
                                4
                            </span>
                            GAME DETAILS
                        </h2>
                        <div className="space-y-6 rounded-xl bg-[#1f1f22] p-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#c8c5d2]">
                                    Match type
                                </label>
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
                                            className={`rounded-lg py-3 text-center text-sm font-bold ${
                                                matchType === opt.value
                                                    ? 'bg-[#c2c1ff] text-[#282671]'
                                                    : 'bg-[#0e0e11] text-[#c8c5d2] hover:bg-[#353438]'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#c8c5d2]">
                                    Game Type
                                </label>
                                <select
                                    value={gameType}
                                    onChange={(e) => setGameType(e.target.value)}
                                    className="w-full rounded-lg border-none bg-[#0e0e11] py-4 pl-4 pr-4 text-sm text-[#e4e1e6] focus:ring-1 focus:ring-[#c2c1ff]/20"
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
                                <label className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#c8c5d2]">
                                    Court Preference
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['1', '2', '3', '4'].map((n) => (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => {
                                                setCourt(n);
                                                setCourtSpecify('');
                                            }}
                                            className={`rounded-lg py-3 text-center text-sm font-bold ${
                                                court === n
                                                    ? 'bg-[#c2c1ff] text-[#282671]'
                                                    : 'bg-[#0e0e11] text-[#c8c5d2] hover:bg-[#353438]'
                                            }`}
                                        >
                                            Court {n}
                                        </button>
                                    ))}
                                    <div className="col-span-4 space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[#c8c5d2]">
                                            or specify a court
                                        </label>
                                        <input
                                            type="text"
                                            value={courtSpecify}
                                            onChange={(e) => {
                                                setCourtSpecify(e.target.value);
                                                setCourt(null);
                                            }}
                                            className="w-full rounded-lg border-none bg-[#0e0e11] py-4 pl-4 pr-4 text-sm text-[#e4e1e6] placeholder:text-[#918f9c] focus:ring-1 focus:ring-[#c2c1ff]/20"
                                            placeholder="Court 1, Court 2, etc."
                                            disabled={pageLoading}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <h2
                    className={`mt-8 flex items-center gap-3 text-xl font-bold ${!facilityId ? 'opacity-40' : ''}`}
                >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#353438] text-[16px] font-black">
                        5
                    </span>
                    MATCH SUMMARY
                </h2>
                <div
                    className={`flex flex-col items-stretch justify-between gap-8 border-t border-[#474651]/10 pt-4 md:flex-row md:items-end ${!facilityId ? 'pointer-events-none opacity-40' : ''}`}
                >
                    <div className="w-full max-w-md min-w-0 flex-1 space-y-4 rounded-xl border border-[#474651]/25 bg-[#1b1b1e] p-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4ce081]">Match summary</p>
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
                        </dl>
                        <div className="border-t border-[#474651]/30 pt-4">
                            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#c8c5d2]">
                                Invited players
                            </p>
                            {invitedPlayers.length > 0 ? (
                                <ul className="space-y-3">
                                    {invitedPlayers.map((p) => (
                                        <li
                                            key={p.id}
                                            className="flex items-start justify-between text-sm font-semibold text-[#e4e1e6]"
                                        >
                                            <span className="font-semibold text-[#e4e1e6]">{p.name}</span>
                                            <span className="max-w-[45%] truncate text-[10px] font-bold tracking-wider text-[#4ce081]">
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
                                    ? 'Select a facility first.'
                                    : sportSlug
                                      ? `Select at least ${minOthers} other player${minOthers > 1 ? 's' : ''}.`
                                      : undefined
                                : undefined
                        }
                        className="rt-kinetic-gradient w-full shrink-0 rounded-xl px-12 py-5 text-xl font-black italic tracking-tight text-[#211e6a] shadow-2xl transition-transform enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 md:w-auto"
                    >
                        {submitting ? 'Sending…' : 'Send Invites'}
                    </button>
                </div>
            </main>

            {addFacilityOpen ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="rt-add-facility-title"
                >
                    <div className="w-full max-w-md rounded-2xl border border-[#474651]/40 bg-[#1b1b1e] p-6 shadow-2xl">
                        <h2 id="rt-add-facility-title" className="mb-1 text-lg font-bold text-[#e4e1e6]">
                            Add new facility
                        </h2>
                        <p className="mb-6 text-xs text-[#918f9c]">
                            This venue will be available for everyone on your account after you save it.
                        </p>
                        {addFacilityError ? (
                            <p className="mb-4 rounded-lg bg-[#ffb4ab]/10 px-3 py-2 text-sm text-[#ffb4ab]" role="alert">
                                {addFacilityError}
                            </p>
                        ) : null}
                        <form className="space-y-4" onSubmit={(e) => void handleAddFacility(e)}>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#c8c5d2]">
                                    Venue name
                                </label>
                                <input
                                    required
                                    value={newFacilityName}
                                    onChange={(e) => setNewFacilityName(e.target.value)}
                                    className="w-full rounded-lg border-none bg-[#0e0e11] py-3 px-4 text-sm text-[#e4e1e6] placeholder:text-[#918f9c] focus:ring-1 focus:ring-[#c2c1ff]/20"
                                    placeholder="e.g. Riverside Sports Center"
                                    autoComplete="organization"
                                />
                                {addFacilityFieldErrors.name?.[0] ? (
                                    <p className="text-xs text-[#ffb4ab]">{addFacilityFieldErrors.name[0]}</p>
                                ) : null}
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#c8c5d2]">
                                    Address
                                </label>
                                <textarea
                                    required
                                    value={newFacilityAddress}
                                    onChange={(e) => setNewFacilityAddress(e.target.value)}
                                    rows={3}
                                    className="w-full resize-none rounded-lg border-none bg-[#0e0e11] py-3 px-4 text-sm text-[#e4e1e6] placeholder:text-[#918f9c] focus:ring-1 focus:ring-[#c2c1ff]/20"
                                    placeholder="Street, city, region, postal code"
                                    autoComplete="street-address"
                                />
                                {addFacilityFieldErrors.address?.[0] ? (
                                    <p className="text-xs text-[#ffb4ab]">{addFacilityFieldErrors.address[0]}</p>
                                ) : null}
                            </div>
                            <div className="flex flex-wrap justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAddFacilityOpen(false);
                                        setAddFacilityError('');
                                        setAddFacilityFieldErrors({});
                                    }}
                                    className="rounded-lg px-4 py-2 text-sm font-semibold text-[#c8c5d2] hover:bg-[#353438]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={addFacilitySubmitting}
                                    className="rounded-lg bg-[#4ce081] px-5 py-2 text-sm font-bold text-[#003919] disabled:opacity-50"
                                >
                                    {addFacilitySubmitting ? 'Saving…' : 'Save facility'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}

            <DashboardMobileNav />
        </div>
    );
}
