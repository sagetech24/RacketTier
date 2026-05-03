import { useState } from 'react';
import '../../css/dashboard-v2.css';
import { SportCard } from '../components/dashboard/SportCard.jsx';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav.jsx';
import { DashboardV2Header } from '../components/dashboard/DashboardV2Header.jsx';
import { MaterialIcon } from '../components/dashboard/MaterialIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const IMG_MARCUS =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCG3pPq7jLjAxRpbDs_QYOIohxj6YrUADzapoK0izk3e5RTe4yIvESqju-zFKqYNur6VBHL-Mrsm_ciORxNTkPoMSc0xavLQUodozj2lFgGP8uR_MHK_JeCCoOmUa7wzbbZspBKsaqilARcbyha7SVGkyfYFvWC4pNwkRn710hsOsCGzrtGudT9dCJkiDVP-avloAAnWrdfFwquxN5u3qXbJ_gbaYXZ4-jUxby_O_ea_0KBV9L0pWTVtfzkfXhgiOnwFAqFI6zH3Yw';

const IMG_SARAH =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCCCrwzbfxAug7Z2_7zVJJSH5_GIuRmv2NFV_mD1W8hzaobJSc87NKGgJ5R4-bBUp7kDQUA6kQzCF2MnU5IlKfLu7oehsrb2xmNvF5ERfqERz-GIMNjn7UWHpDsvx-XXCsUjHvmPT1mfUMda-eg_mlcUrb7faoz2rVjpbbEEpPyQK2WOQTEUTp7g4YVSPYrktD4NO7jku5pPGXoR36b7LvFz7N-ER53Ok_pfa7WmiugQ8-0mgegWdb4ZPuxN68Cm4QMYOAeHE5Kljc';

const IMG_DAVID =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAz05GH33VOqSJwXwDGCP2Cb5-RCexdwKGOS26zN2bybnqeZheZe2hgTrx_TGBQkAxJ2T0hvfSGXSevC7Garg_PRuGGTFFmiipecR6Z1BdrablrA2IhR1oMKvKU6vEewTNbLRuD6GUZfUL1IGh6OUMJUCsEtBu-qing2OvI7oI9goMm24djiTK7wiwweIUN_-S1z1_YbL7Hkht8Ov_VkFc8bJGfeVjtngkkSeSX53H9kDX_Oo2vJ7RO3iNKsFZi9yDmd_BIr_LXMxk';

const IMG_JASON =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCh_IH1eq_jmZbqHD6MG2Dn-6ygbE_9VBvePMWv_GsehqCwm6kvG1WEEH4eERxOJ2XFLtyCyYfI43ba5_qq6aMOWXXS2kVwCTpuETSCZwq_k51x8eMJXJctdWsWl4dafdzaDmmmVCDFqxgoNeEy_EqpxGTVa8FlSOfdGnX4btoRslEWrAdTtHRJduFv6ez_JZxylP8M1vW-bVtKA7fu9edpzBSoWw0vr7q6VyY2JOhTG1ivz4_AJmqmSYG47FfBkn7AW6RDKtiCsjA';

const SPORTS = [
    { id: 'pickleball', label: 'Pickleball', code: 'PKLB', icon: 'sports_tennis' },
    { id: 'badminton', label: 'Badminton', code: 'BDMN', icon: 'sports_tennis' },
    { id: 'tennis', label: 'Tennis', code: 'TNS', icon: 'sports_tennis' },
    { id: 'table-tennis', label: 'Table Tennis', code: 'TBLT', icon: 'sports_tennis' },
];

const PLAYERS = [
    { id: 'marcus', name: 'Marcus Chen', rank: 'TIER #2', image: IMG_MARCUS },
    { id: 'sarah', name: 'Sarah Jenkins', rank: 'TIER #3', image: IMG_SARAH },
    { id: 'david', name: 'David Miller', rank: 'TIER #4', image: IMG_DAVID },
    { id: 'jason', name: 'Jason Bourne', rank: 'TIER #1', image: IMG_JASON },
];

const GAME_TYPE_OPTIONS = [
    { value: '1st-set', label: '1st Set' },
    { value: '2nd-set', label: '2nd Set' },
    { value: '3rd-set', label: '3rd Set' },
    { value: '4th-set', label: '4th Set' },
    { value: 'rematch', label: 'Rematch' },
    { value: 'final-set', label: 'Final Set' },
];

export function CreateMatchPage() {
    const { user } = useAuth();
    const [sport, setSport] = useState('badminton');
    const [gameType, setGameType] = useState('1st-set');
    const [court, setCourt] = useState(/** @type {'1'|'2'|'3'|'4'|null} */ (null));
    const [courtSpecify, setCourtSpecify] = useState('');
    const [invited, setInvited] = useState(() => ({
        marcus: false,
        sarah: true,
        david: false,
        jason: false,
    }));

    function toggleInvite(id) {
        setInvited((prev) => ({ ...prev, [id]: !prev[id] }));
    }

    const sportLabel = SPORTS.find((s) => s.id === sport)?.label ?? sport;
    const gameTypeLabel = GAME_TYPE_OPTIONS.find((o) => o.value === gameType)?.label ?? gameType;
    const invitedPlayers = PLAYERS.filter((p) => invited[p.id]);

    const courtSpecifyTrimmed = courtSpecify.trim();
    const courtPreferenceLabel =
        courtSpecifyTrimmed.length > 0
            ? courtSpecifyTrimmed
            : court
              ? `Court ${court}`
              : 'Not selected';

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
                        Organize elite gameplay at the North Wing Facility. Select your discipline, recruit competitors,
                        and lock in the schedule.
                    </p>
                </header>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
                    <section className="md:col-span-12">
                        <h2 className="mb-6 flex items-center gap-3 text-xl font-bold">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#353438] text-[16px] font-black">
                                1
                            </span>
                            SELECT SPORTS
                        </h2>
                        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                            {SPORTS.map((s) => (
                                <SportCard
                                    key={s.id}
                                    name={s.label}
                                    icon={s.icon}
                                    symbol={s.code}
                                    selected={sport === s.id}
                                    onClick={() => setSport(s.id)}
                                />
                            ))}
                        </div>
                    </section>

                    <section className="md:col-span-7">
                        <h2 className="mb-6 flex items-center gap-3 text-xl font-bold">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#353438] text-[16px] font-black">
                                2
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
                                    type="text"
                                    aria-label="Search players"
                                />
                            </div>
                            <div className={`max-h-[320px] space-y-3 overflow-y-auto pr-2 rt-hide-scrollbar`}>
                                {PLAYERS.map((p) => {
                                    const on = !!invited[p.id];
                                    return (
                                        <div
                                            key={p.id}
                                            className={`flex items-center justify-between rounded-lg p-3 transition-colors ${
                                                on ? 'bg-[#4ce081]/20' : 'group hover:bg-[#1f1f22]'
                                            }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="relative h-10 w-10 overflow-hidden rounded-full bg-[#353438]">
                                                    <img
                                                        alt=""
                                                        src={p.image}
                                                        className="h-full w-full object-cover"
                                                    />
                                                    {on ? (
                                                        <div className="absolute inset-0 bg-[#c2c1ff]/20" />
                                                    ) : null}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold">{p.name}</p>
                                                    <p className="text-[10px] font-bold tracking-wider text-[#4ce081]">
                                                        {p.rank}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => toggleInvite(p.id)}
                                                className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
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
                                })}
                            </div>
                        </div>
                    </section>

                    <section className="md:col-span-5">
                        <h2 className="mb-6 flex items-center gap-3 text-xl font-bold">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#353438] text-[16px] font-black">
                                3
                            </span>
                            GAME DETAILS
                        </h2>
                        <div className="space-y-6 rounded-xl bg-[#1f1f22] p-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#c8c5d2]">
                                    Game Type
                                </label>
                                <select
                                    value={gameType}
                                    onChange={(e) => setGameType(e.target.value)}
                                    className="w-full rounded-lg border-none bg-[#0e0e11] py-4 pl-4 pr-4 text-sm text-[#e4e1e6] focus:ring-1 focus:ring-[#c2c1ff]/20"
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
                                    {(['1', '2', '3', '4']).map((n) => (
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
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <h2 className="mt-8 flex items-center gap-3 text-xl font-bold">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#353438] text-[16px] font-black">
                        4
                    </span>
                    MATCH SUMMARY
                </h2>
                <div className="flex flex-col items-stretch justify-between gap-8 border-t border-[#474651]/10 pt-4 md:flex-row md:items-end">
                    <div className="w-full max-w-md min-w-0 flex-1 space-y-4 rounded-xl border border-[#474651]/25 bg-[#1b1b1e] p-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4ce081]">Match summary</p>
                        <dl className="space-y-3 text-sm">
                            <div className="flex items-start justify-between gap-4">
                                <dt className="shrink-0 text-[#918f9c]">Sport</dt>
                                <dd className="text-right font-bold text-[#e4e1e6]">{sportLabel}</dd>
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
                                            <span className="text-[10px] font-bold tracking-wider text-[#4ce081]">
                                                {p.rank}
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
                        className="rt-kinetic-gradient w-full shrink-0 rounded-xl px-12 py-5 text-xl font-black italic tracking-tight text-[#211e6a] shadow-2xl transition-transform active:scale-95 md:w-auto"
                    >
                        Send Invites
                    </button>
                </div>
            </main>

            <DashboardMobileNav />
        </div>
    );
}
