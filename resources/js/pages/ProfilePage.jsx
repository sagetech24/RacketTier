import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchDashboardSummary } from '../api/dashboard.js';
import { AppShell } from '../components/app/AppShell.jsx';
import { PageHeader } from '../components/app/PageHeader.jsx';
import { LogoutButton } from '../components/LogoutButton.jsx';
import { ChangePasswordModal } from '../components/profile/ChangePasswordModal.jsx';
import { EditProfileModal } from '../components/profile/EditProfileModal.jsx';
import { EmailVerificationCard } from '../components/profile/EmailVerificationCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function formatCurrentRating(rating) {
    if (rating == null) {
        return '0.00';
    }

    return (rating / 100).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export function ProfilePage() {
    const { user: authUser, setUser, refreshUser } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editOpen, setEditOpen] = useState(false);
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [passwordToast, setPasswordToast] = useState('');

    const justVerified = useMemo(
        () => new URLSearchParams(location.search).get('verified') === '1',
        [location.search],
    );

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setError('');
            setLoading(true);
            try {
                const data = await fetchDashboardSummary();
                if (!cancelled) setSummary(data);
            } catch {
                if (!cancelled) setError('Could not load your profile. Refresh and try again.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        void load();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (justVerified) {
            void refreshUser();
        }
    }, [justVerified, refreshUser]);

    function clearVerifiedToast() {
        if (justVerified) {
            navigate('/profile', { replace: true });
        }
    }

    const user = summary?.user ?? authUser;
    const stats = summary?.stats;

    return (
        <AppShell user={user} profileLoading={loading && !summary}>
            <PageHeader size="md" title="Profile" subtitle="Account details, security, and your current stats." />

            {error ? (
                <div className="rt-alert-error mb-6" role="alert">
                    {error}
                </div>
            ) : null}

            <div className="flex flex-col gap-4 md:gap-6">
                <div className="rt-surface-card p-5 md:p-6">
                    <div className="flex items-start justify-between gap-3 md:gap-4">
                        <div className="min-w-0">
                            <div className="truncate text-lg font-bold text-[#e4e1e6] md:text-xl">{user?.name ?? 'User'}</div>
                            <div className="truncate text-sm text-[#c8c5d2] md:text-base">{user?.email ?? ''}</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {user?.pronoun ? (
                                    <span className="rounded-full border border-white/10 bg-[#26262a] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[#c8c5d2]">
                                        {user.pronoun}
                                    </span>
                                ) : null}
                                {user?.age != null ? (
                                    <span className="rounded-full border border-white/10 bg-[#26262a] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[#c8c5d2]">
                                        Age {user.age}
                                    </span>
                                ) : null}
                            </div>
                            {user?.member_since ? (
                                <div className="mt-3 text-xs text-[#918f9c]">
                                    Member since {user.member_since_human ?? new Date(user.member_since).toLocaleDateString()}
                                </div>
                            ) : null}
                        </div>
                        <button
                            type="button"
                            onClick={() => setEditOpen(true)}
                            className="rt-btn-secondary shrink-0 px-3 py-1.5 text-[10px] md:px-4 md:text-xs"
                        >
                            Edit
                        </button>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 md:gap-4">
                    <EmailVerificationCard
                        user={user}
                        initialToast={justVerified ? 'Email verified successfully.' : ''}
                        onVerifiedToastDismissed={clearVerifiedToast}
                        onVerified={() => void refreshUser()}
                    />

                    <div className="rt-surface-card p-5 md:p-6">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-[10px] font-semibold uppercase tracking-widest text-[#918f9c]">
                                    Account Security
                                </div>
                                <div className="mt-1 text-base font-bold text-[#e4e1e6]">Change password</div>
                                <p className="mt-1 text-xs text-[#c8c5d2]">
                                    Update the password used to sign in to your RacketTier account.
                                </p>
                                {passwordToast ? (
                                    <p
                                        className="mt-3 inline-block rounded-lg bg-[#4ce081]/10 px-3 py-1.5 text-xs font-semibold text-[#4ce081]"
                                        role="status"
                                    >
                                        {passwordToast}
                                    </p>
                                ) : null}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setPasswordToast('');
                                    setPasswordOpen(true);
                                }}
                                className="rt-btn-secondary shrink-0 px-3 py-1.5 text-[10px] md:px-4 md:text-xs"
                            >
                                Change
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 md:gap-6">
                    <div className="rt-surface-card bg-[#1f1f22] p-4 md:p-5">
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-[#918f9c] md:text-xs">
                            Current Rating
                        </div>
                        <div className="mt-1 text-2xl font-extrabold tabular-nums text-[#c2c1ff] md:text-3xl">
                            {formatCurrentRating(stats?.rating)}
                        </div>
                    </div>
                    <div className="rt-surface-card bg-[#1f1f22] p-4 md:p-5">
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-[#918f9c] md:text-xs">Matches</div>
                        <div className="mt-1 text-2xl font-extrabold tabular-nums md:text-3xl">{stats?.matches_played ?? 0}</div>
                    </div>
                </div>
            </div>

            <div className="mt-8 flex justify-center md:mt-10">
                <LogoutButton className="rounded-full border border-[#918f9c]/40 px-4 py-2 text-xs font-medium uppercase tracking-wider text-[#918f9c] transition hover:border-[#c8c5d2]/50 hover:text-[#c8c5d2]" />
            </div>

            <EditProfileModal
                open={editOpen}
                user={user}
                onClose={() => setEditOpen(false)}
                onSaved={(nextUser) => {
                    setUser(nextUser);
                    setSummary((prev) =>
                        prev
                            ? {
                                  ...prev,
                                  user: {
                                      ...prev.user,
                                      name: nextUser.name,
                                      email: nextUser.email,
                                      age: nextUser.age ?? null,
                                      pronoun: nextUser.pronoun ?? null,
                                  },
                              }
                            : prev,
                    );
                    setEditOpen(false);
                }}
            />

            <ChangePasswordModal
                open={passwordOpen}
                onClose={() => setPasswordOpen(false)}
                onSaved={() => {
                    setPasswordOpen(false);
                    setPasswordToast('Password updated successfully.');
                }}
            />
        </AppShell>
    );
}
