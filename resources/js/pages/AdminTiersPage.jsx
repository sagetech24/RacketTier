import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AdminMembersForbiddenError } from '../api/adminMembers.js';
import { fetchAdminTierRanks, patchAdminTierRank } from '../api/adminDashboard.js';
import {
    AdminFilterChips,
    AdminPanel,
    AdminPanelRow,
    AdminPanelSkeleton,
} from '../components/admin/AdminPanel.jsx';
import { AdminShell } from '../components/admin/AdminShell.jsx';
import { EmptyState } from '../components/app/EmptyState.jsx';
import { PageHeader } from '../components/app/PageHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function AdminTiersPage() {
    const { user } = useAuth();
    const [sports, setSports] = useState(/** @type {{ id: number, name: string }[]} */ ([]));
    const [sportId, setSportId] = useState(/** @type {number | null} */ (null));
    const [tiers, setTiers] = useState(/** @type {any[]} */ ([]));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [forbidden, setForbidden] = useState(false);
    const [editingId, setEditingId] = useState(/** @type {number | null} */ (null));
    const [draft, setDraft] = useState(/** @type {any} */ (null));
    const [saving, setSaving] = useState(false);

    const reload = useCallback(async (selectedSportId) => {
        setLoading(true);
        setError('');
        try {
            const data = await fetchAdminTierRanks(selectedSportId ?? undefined);
            setSports(data.sports ?? []);
            setTiers(data.tiers ?? []);
            if (selectedSportId == null && data.sports?.length) {
                setSportId(data.sports[0].id);
            }
        } catch (err) {
            if (err instanceof AdminMembersForbiddenError) {
                setForbidden(true);
                return;
            }
            setError('Could not load tier ranks.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void reload(sportId);
    }, [reload, sportId]);

    function startEdit(tier) {
        setEditingId(tier.id);
        setDraft({
            name: tier.name,
            tier_no: tier.tier_no,
            start_point: tier.start_point,
            end_point: tier.end_point,
            status: tier.status,
        });
    }

    async function saveEdit() {
        if (!editingId || !draft) return;
        setSaving(true);
        setError('');
        try {
            await patchAdminTierRank(editingId, {
                name: draft.name,
                tier_no: Number(draft.tier_no),
                start_point: Number(draft.start_point),
                end_point: Number(draft.end_point),
                status: Boolean(draft.status),
            });
            setEditingId(null);
            setDraft(null);
            await reload(sportId);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save tier.');
        } finally {
            setSaving(false);
        }
    }

    if (forbidden) {
        return <Navigate to="/profile" replace />;
    }

    const filtered = sportId ? tiers.filter((t) => t.sport_id === sportId) : tiers;
    const sportName = sports.find((s) => s.id === sportId)?.name;
    const subtitle = sportName
        ? `${filtered.length} tier${filtered.length === 1 ? '' : 's'} for ${sportName}. Active ranges must not overlap.`
        : 'Edit per-sport point brackets. Active ranges must not overlap.';

    const showSkeleton = loading && filtered.length === 0 && !error;
    const empty = !loading && !error && filtered.length === 0;

    return (
        <AdminShell user={user}>
            <PageHeader size="md" eyebrow="Admin" title="Tier ranks" subtitle={subtitle} />

            {sports.length > 0 ? (
                <AdminFilterChips
                    value={sportId != null ? String(sportId) : ''}
                    onChange={(value) => setSportId(Number(value))}
                    options={sports.map((sport) => ({
                        value: String(sport.id),
                        label: sport.name,
                    }))}
                />
            ) : null}

            {error ? (
                <div className="rt-alert-error mb-6" role="alert">
                    <p>{error}</p>
                    <button
                        type="button"
                        className="mt-2 text-xs font-bold uppercase tracking-wider underline underline-offset-2"
                        onClick={() => void reload(sportId)}
                    >
                        Retry
                    </button>
                </div>
            ) : null}

            {showSkeleton ? <AdminPanelSkeleton label="Loading tiers" /> : null}

            {empty ? (
                <EmptyState icon="military_tech" title="No tiers" description="No tier ranks for this sport yet." />
            ) : null}

            {filtered.length > 0 ? (
                <AdminPanel>
                    <div className="hidden grid-cols-[4rem_minmax(0,1.2fr)_8rem_5rem_6rem] gap-4 border-b border-[#45454a] px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-[#918f9c] md:grid">
                        <div>No.</div>
                        <div>Name</div>
                        <div>Points</div>
                        <div>Status</div>
                        <div>Actions</div>
                    </div>
                    {filtered.map((tier) => (
                        <AdminPanelRow key={tier.id} as="article">
                            {editingId === tier.id && draft ? (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[#918f9c]">
                                        Name
                                        <input
                                            className="rt-facility-search-input mt-1"
                                            value={draft.name}
                                            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                                        />
                                    </label>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[#918f9c]">
                                        Tier no
                                        <input
                                            type="number"
                                            className="rt-facility-search-input mt-1"
                                            value={draft.tier_no}
                                            onChange={(e) => setDraft({ ...draft, tier_no: e.target.value })}
                                        />
                                    </label>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[#918f9c]">
                                        Start
                                        <input
                                            type="number"
                                            className="rt-facility-search-input mt-1"
                                            value={draft.start_point}
                                            onChange={(e) => setDraft({ ...draft, start_point: e.target.value })}
                                        />
                                    </label>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[#918f9c]">
                                        End
                                        <input
                                            type="number"
                                            className="rt-facility-search-input mt-1"
                                            value={draft.end_point}
                                            onChange={(e) => setDraft({ ...draft, end_point: e.target.value })}
                                        />
                                    </label>
                                    <label className="inline-flex min-h-11 items-center gap-2 text-sm text-[#c8c5d2]">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(draft.status)}
                                            onChange={(e) => setDraft({ ...draft, status: e.target.checked })}
                                        />
                                        Active
                                    </label>
                                    <div className="flex gap-2 sm:col-span-2">
                                        <button
                                            type="button"
                                            disabled={saving}
                                            onClick={() => void saveEdit()}
                                            className="rt-facility-btn rt-facility-btn-lavender min-h-10 px-4 text-xs"
                                        >
                                            Save
                                        </button>
                                        <button
                                            type="button"
                                            disabled={saving}
                                            onClick={() => {
                                                setEditingId(null);
                                                setDraft(null);
                                            }}
                                            className="min-h-10 rounded-lg border border-white/10 px-4 text-xs font-bold text-[#918f9c]"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3 md:grid md:grid-cols-[4rem_minmax(0,1.2fr)_8rem_5rem_6rem] md:items-center md:gap-4">
                                    <div className="text-sm font-semibold tabular-nums text-[#c8c5d2]">
                                        {tier.tier_no}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="truncate text-base font-bold text-[#e4e1e6] md:text-sm md:font-semibold">
                                            {tier.name}
                                        </h3>
                                        <p className="mt-0.5 text-xs text-[#918f9c] md:hidden">
                                            {tier.start_point} – {tier.end_point} pts
                                        </p>
                                    </div>
                                    <div className="hidden text-sm tabular-nums text-[#c8c5d2] md:block">
                                        {tier.start_point} – {tier.end_point}
                                    </div>
                                    <div>
                                        {tier.status ? (
                                            <span className="rounded-full bg-[#4ce081]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#4ce081]">
                                                Active
                                            </span>
                                        ) : (
                                            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#918f9c]">
                                                Off
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <button
                                            type="button"
                                            className="min-h-10 rounded-lg border border-white/10 px-3 text-xs font-bold text-[#c8c5d2]"
                                            onClick={() => startEdit(tier)}
                                        >
                                            Edit
                                        </button>
                                    </div>
                                </div>
                            )}
                        </AdminPanelRow>
                    ))}
                </AdminPanel>
            ) : null}
        </AdminShell>
    );
}
