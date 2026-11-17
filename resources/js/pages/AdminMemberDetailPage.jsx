import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { AdminMembersForbiddenError } from '../api/adminMembers.js';
import {
    fetchAdminMemberAudit,
    fetchAdminMemberDetail,
    postAdjustMemberRating,
    postAdjustMemberWallet,
} from '../api/adminDashboard.js';
import { AdminMemberBadges } from '../components/admin/AdminMemberBadges.jsx';
import { AdminPanel, AdminPanelRow, AdminPanelSkeleton } from '../components/admin/AdminPanel.jsx';
import { AdminShell } from '../components/admin/AdminShell.jsx';
import { PageHeader } from '../components/app/PageHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function AdminMemberDetailPage() {
    const { user: authUser } = useAuth();
    const { id } = useParams();
    const memberId = Number(id);

    const [detail, setDetail] = useState(/** @type {any} */ (null));
    const [audit, setAudit] = useState(/** @type {any} */ (null));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [forbidden, setForbidden] = useState(false);
    const [notFound, setNotFound] = useState(false);

    const [adjustType, setAdjustType] = useState(/** @type {'rating' | 'wallet'} */ ('rating'));
    const [sportId, setSportId] = useState('');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [adjusting, setAdjusting] = useState(false);
    const [adjustMsg, setAdjustMsg] = useState('');

    const reload = useCallback(async () => {
        if (!Number.isFinite(memberId) || memberId <= 0) {
            setNotFound(true);
            return;
        }
        setLoading(true);
        setError('');
        try {
            const [memberDetail, memberAudit] = await Promise.all([
                fetchAdminMemberDetail(memberId),
                fetchAdminMemberAudit(memberId, { limit: 30 }),
            ]);
            setDetail(memberDetail);
            setAudit(memberAudit);
            if (!sportId && memberDetail.sports?.[0]) {
                setSportId(String(memberDetail.sports[0].sport_id));
            }
        } catch (err) {
            if (err instanceof AdminMembersForbiddenError) {
                setForbidden(true);
                return;
            }
            if (err instanceof Error && err.message === 'Member not found') {
                setNotFound(true);
                return;
            }
            setError('Could not load member detail.');
        } finally {
            setLoading(false);
        }
    }, [memberId, sportId]);

    useEffect(() => {
        void reload();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per member
    }, [memberId]);

    async function handleAdjust(e) {
        e.preventDefault();
        setAdjusting(true);
        setAdjustMsg('');
        setError('');
        try {
            const payload = {
                sport_id: Number(sportId),
                amount: Number(amount),
                reason: reason.trim(),
            };
            if (adjustType === 'rating') {
                await postAdjustMemberRating(memberId, payload);
            } else {
                await postAdjustMemberWallet(memberId, payload);
            }
            setAdjustMsg('Adjustment saved.');
            setAmount('');
            setReason('');
            const [memberDetail, memberAudit] = await Promise.all([
                fetchAdminMemberDetail(memberId),
                fetchAdminMemberAudit(memberId, { limit: 30 }),
            ]);
            setDetail(memberDetail);
            setAudit(memberAudit);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Adjustment failed.');
        } finally {
            setAdjusting(false);
        }
    }

    if (forbidden) {
        return <Navigate to="/profile" replace />;
    }
    if (notFound) {
        return <Navigate to="/admin/members" replace />;
    }

    const member = detail?.user;

    return (
        <AdminShell user={authUser}>
            <div className="mb-4">
                <Link to="/admin/members" className="text-sm font-semibold text-[#c2c1ff] hover:underline">
                    ← Members
                </Link>
            </div>

            <PageHeader
                size="md"
                eyebrow="Admin"
                title={loading ? 'Member' : (member?.name ?? 'Member')}
                subtitle={member?.email ?? 'Member profile, rankings, and support tools.'}
            />

            {error ? (
                <div className="rt-alert-error mb-6" role="alert">
                    <p>{error}</p>
                    <button
                        type="button"
                        className="mt-2 text-xs font-bold uppercase tracking-wider underline underline-offset-2"
                        onClick={() => void reload()}
                    >
                        Retry
                    </button>
                </div>
            ) : null}

            {loading && !detail ? <AdminPanelSkeleton label="Loading member" /> : null}

            {member ? (
                <div className="mb-6">
                    <AdminMemberBadges isAdmin={member.is_admin} emailVerified={member.email_verified} />
                </div>
            ) : null}

            {detail ? (
                <>
                    <section className="mb-8">
                        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-[#918f9c]">Sports</h2>
                        <AdminPanel>
                            {(detail.sports ?? []).map((row) => (
                                <AdminPanelRow key={row.sport_id}>
                                    <p className="text-sm font-semibold text-[#e4e1e6]">{row.sport_name}</p>
                                    <p className="mt-0.5 text-xs text-[#918f9c]">
                                        ELO {row.rating ?? '—'} · Wallet {row.wallet_balance}
                                        {row.tier ? ` · ${row.tier.name}` : ''}
                                    </p>
                                </AdminPanelRow>
                            ))}
                        </AdminPanel>
                    </section>

                    <section className="mb-8">
                        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-[#918f9c]">
                            Recent sessions
                        </h2>
                        {(detail.recent_sessions ?? []).length === 0 ? (
                            <AdminPanel>
                                <AdminPanelRow>
                                    <p className="text-sm text-[#918f9c]">No sessions yet.</p>
                                </AdminPanelRow>
                            </AdminPanel>
                        ) : (
                            <AdminPanel>
                                {detail.recent_sessions.map((session) => (
                                    <AdminPanelRow key={session.id} as="div">
                                        <Link
                                            to={
                                                session.session_context === 'queueing'
                                                    ? `/queueing-session/${session.id}`
                                                    : '/facilities'
                                            }
                                            className="block hover:text-[#c2c1ff]"
                                        >
                                            <p className="text-sm font-semibold text-[#e4e1e6]">
                                                {session.queue_name || `${session.session_context} #${session.id}`}
                                            </p>
                                            <p className="mt-0.5 text-xs text-[#918f9c]">
                                                {session.sport_name} · {session.is_active ? 'Active' : 'Ended'}
                                            </p>
                                        </Link>
                                    </AdminPanelRow>
                                ))}
                            </AdminPanel>
                        )}
                    </section>

                    <section className="mb-8">
                        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-[#918f9c]">
                            Guarded correction
                        </h2>
                        <AdminPanel>
                            <AdminPanelRow>
                                <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => void handleAdjust(e)}>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[#918f9c]">
                                        Type
                                        <select
                                            className="rt-facility-search-input mt-1"
                                            value={adjustType}
                                            onChange={(e) =>
                                                setAdjustType(/** @type {'rating' | 'wallet'} */ (e.target.value))
                                            }
                                        >
                                            <option value="rating">ELO rating</option>
                                            <option value="wallet">Wallet points</option>
                                        </select>
                                    </label>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[#918f9c]">
                                        Sport
                                        <select
                                            className="rt-facility-search-input mt-1"
                                            value={sportId}
                                            onChange={(e) => setSportId(e.target.value)}
                                            required
                                        >
                                            {(detail.sports ?? []).map((row) => (
                                                <option key={row.sport_id} value={row.sport_id}>
                                                    {row.sport_name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[#918f9c]">
                                        Amount (+/−)
                                        <input
                                            type="number"
                                            className="rt-facility-search-input mt-1"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            required
                                        />
                                    </label>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[#918f9c] sm:col-span-2">
                                        Reason
                                        <input
                                            className="rt-facility-search-input mt-1"
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            minLength={3}
                                            required
                                            placeholder="Why this correction is needed"
                                        />
                                    </label>
                                    <div className="sm:col-span-2">
                                        <button
                                            type="submit"
                                            disabled={adjusting}
                                            className="rt-facility-btn rt-facility-btn-lavender min-h-11 px-5 text-sm"
                                        >
                                            {adjusting ? 'Saving…' : 'Apply adjustment'}
                                        </button>
                                        {adjustMsg ? <p className="mt-2 text-sm text-[#4ce081]">{adjustMsg}</p> : null}
                                    </div>
                                </form>
                            </AdminPanelRow>
                        </AdminPanel>
                    </section>

                    <section className="mb-8">
                        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-[#918f9c]">
                            Rating history
                        </h2>
                        <AdminPanel>
                            {(audit?.rating_histories ?? []).length === 0 ? (
                                <AdminPanelRow>
                                    <p className="text-sm text-[#918f9c]">No rating history.</p>
                                </AdminPanelRow>
                            ) : (
                                (audit?.rating_histories ?? []).slice(0, 15).map((row) => (
                                    <AdminPanelRow key={row.id}>
                                        <p className="text-sm text-[#e4e1e6]">
                                            {row.sport_name}{' '}
                                            <span className="text-[#918f9c]">
                                                {row.rating_before} → {row.rating_after} (
                                                {row.rating_change > 0 ? '+' : ''}
                                                {row.rating_change})
                                            </span>
                                        </p>
                                    </AdminPanelRow>
                                ))
                            )}
                        </AdminPanel>
                    </section>

                    <section className="mb-8">
                        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-[#918f9c]">
                            Wallet ledger
                        </h2>
                        <AdminPanel>
                            {(audit?.wallet_transactions ?? []).length === 0 ? (
                                <AdminPanelRow>
                                    <p className="text-sm text-[#918f9c]">No wallet transactions.</p>
                                </AdminPanelRow>
                            ) : (
                                (audit?.wallet_transactions ?? []).slice(0, 15).map((row) => (
                                    <AdminPanelRow key={row.id}>
                                        <p className="text-sm text-[#e4e1e6]">
                                            {row.sport_name}{' '}
                                            <span className="text-[#918f9c]">
                                                {row.amount > 0 ? '+' : ''}
                                                {row.amount} → balance {row.balance_after}
                                            </span>
                                        </p>
                                    </AdminPanelRow>
                                ))
                            )}
                        </AdminPanel>
                    </section>

                    <section className="mb-8">
                        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-[#918f9c]">
                            Admin adjustments
                        </h2>
                        <AdminPanel>
                            {(audit?.admin_adjustments ?? []).length === 0 ? (
                                <AdminPanelRow>
                                    <p className="text-sm text-[#918f9c]">No admin adjustments yet.</p>
                                </AdminPanelRow>
                            ) : (
                                (audit?.admin_adjustments ?? []).map((row) => (
                                    <AdminPanelRow key={row.id}>
                                        <p className="text-sm text-[#e4e1e6]">
                                            {row.adjustment_type} · {row.sport_name} · {row.amount > 0 ? '+' : ''}
                                            {row.amount}
                                        </p>
                                        <p className="mt-0.5 text-xs text-[#918f9c]">
                                            {row.reason} · by {row.admin_name ?? 'admin'}
                                        </p>
                                    </AdminPanelRow>
                                ))
                            )}
                        </AdminPanel>
                    </section>
                </>
            ) : null}
        </AdminShell>
    );
}
