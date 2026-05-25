import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDashboardSummary } from '../api/dashboard.js';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav.jsx';
import { DashboardV2Header } from '../components/dashboard/DashboardV2Header.jsx';
import { LogoutButton } from '../components/LogoutButton.jsx';
import { ChangePasswordModal } from '../components/profile/ChangePasswordModal.jsx';
import { EditProfileModal } from '../components/profile/EditProfileModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function ProfilePage() {
    const { user: authUser, setUser } = useAuth();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editOpen, setEditOpen] = useState(false);
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [passwordToast, setPasswordToast] = useState('');

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

    const user = summary?.user ?? authUser;
    const stats = summary?.stats;

    return (
        <div className="dashboard-v2-shell bg-[#131316] font-sans text-[#e4e1e6] selection:bg-[#c2c1ff] selection:text-[#282671]">
            <DashboardV2Header user={user} profileLoading={loading && !summary} />

            <main className="mx-auto min-h-screen max-w-md px-6 pb-32 pt-36">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-extrabold tracking-tight text-[#e4e1e6]">Profile</h2>
                </div>

                {error ? (
                    <div className="mb-6 rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200" role="alert">
                        {error}
                    </div>
                ) : null}

                <div className="rounded-xl bg-[#1b1b1e] border border-zinc-700 p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="mt-1 text-lg font-bold text-[#e4e1e6] truncate">{user?.name ?? 'User'}</div>
                            <div className="text-sm text-[#c8c5d2] truncate">{user?.email ?? ''}</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {user?.pronoun ? (
                                    <span className="rounded-full border border-[#3a3a40] bg-[#26262a] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[#c8c5d2]">
                                        {user.pronoun}
                                    </span>
                                ) : null}
                                {user?.age != null ? (
                                    <span className="rounded-full border border-[#3a3a40] bg-[#26262a] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[#c8c5d2]">
                                        Age {user.age}
                                    </span>
                                ) : null}
                            </div>
                            {user?.member_since ? (
                                <div className="mt-3 text-xs text-[#c8c5d2]/70">
                                    Member since {user.member_since_human ?? new Date(user.member_since).toLocaleDateString()}
                                </div>
                            ) : null}
                        </div>
                        <button
                            type="button"
                            onClick={() => setEditOpen(true)}
                            className="shrink-0 rounded-full border border-[#c2c1ff]/40 bg-[#c2c1ff]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#c2c1ff] transition-colors hover:bg-[#c2c1ff]/20"
                        >
                            Edit
                        </button>
                    </div>
                </div>

                <div className="mt-4 rounded-xl bg-[#1b1b1e] border border-zinc-700 p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#c8c5d2]">
                                Account Security
                            </div>
                            <div className="mt-1 text-base font-bold text-[#e4e1e6]">Change password</div>
                            <p className="mt-1 text-xs text-[#c8c5d2]/70">
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
                            className="shrink-0 rounded-full border border-[#c2c1ff]/40 bg-[#c2c1ff]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#c2c1ff] transition-colors hover:bg-[#c2c1ff]/20"
                        >
                            Change
                        </button>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-[#1f1f22] border border-zinc-700 p-4">
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-[#c8c5d2]">Current Rating</div>
                        <div className="mt-1 text-2xl font-extrabold">{stats?.rating / 100 ?? 1000}</div>
                    </div>
                    <div className="rounded-xl bg-[#1f1f22] border border-zinc-700 p-4">
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-[#c8c5d2]">Matches</div>
                        <div className="mt-1 text-2xl font-extrabold">{stats?.matches_played ?? 0}</div>
                    </div>
                </div>

                <div className="mt-8 flex justify-center">
                    <LogoutButton className="text-xs font-medium uppercase border border-zinc-500 rounded-full px-4 py-2 tracking-wider text-[#c8c5d2]/80 underline-offset-4 transition hover:text-[#e4e1e6]" />
                </div>
            </main>

            <DashboardMobileNav />

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
        </div>
    );
}

