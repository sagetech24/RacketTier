import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AdminMembersForbiddenError } from '../api/adminMembers.js';
import { fetchAdminSummary } from '../api/adminDashboard.js';
import { AdminMembersTableSkeleton } from '../components/admin/AdminMembersTableSkeleton.jsx';
import { AdminShell } from '../components/admin/AdminShell.jsx';
import { PageHeader } from '../components/app/PageHeader.jsx';
import { MaterialIcon } from '../components/dashboard/MaterialIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const METRICS = [
    {
        key: 'total_members',
        label: 'Members',
        detail: 'Registered accounts',
        icon: 'group',
        to: '/admin/members',
        accent: 'text-[#c2c1ff]',
    },
    {
        key: 'unverified_members',
        label: 'Unverified',
        detail: 'Email not verified',
        icon: 'mark_email_unread',
        to: '/admin/members',
        accent: 'text-[#ffb4ab]',
    },
    {
        key: 'total_facilities',
        label: 'Facilities',
        detail: 'Active venues',
        icon: 'stadium',
        to: '/admin/facilities',
        accent: 'text-[#4ce081]',
    },
    {
        key: 'active_queueing_sessions',
        label: 'Active queues',
        detail: 'Sessions in progress',
        icon: 'play_circle',
        to: '/admin/sessions?status=active',
        accent: 'text-[#c2c1ff]',
    },
    {
        key: 'matches_finished_today',
        label: 'Matches today',
        detail: 'Finished matches',
        icon: 'sports_score',
        to: '/admin/sessions',
        accent: 'text-[#4ce081]',
    },
    {
        key: 'queueing_sessions_ended_today',
        label: 'Queues ended today',
        detail: 'Closed queueing sessions',
        icon: 'flag',
        to: '/admin/sessions?status=ended',
        accent: 'text-[#918f9c]',
    },
];

export function AdminOverviewPage() {
    const { user } = useAuth();
    const [summary, setSummary] = useState(/** @type {Record<string, number> | null} */ (null));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [forbidden, setForbidden] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError('');
            try {
                const data = await fetchAdminSummary();
                if (!cancelled) {
                    setSummary(data);
                }
            } catch (err) {
                if (cancelled) return;
                if (err instanceof AdminMembersForbiddenError) {
                    setForbidden(true);
                    return;
                }
                setError('Could not load admin overview.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        void load();
        return () => {
            cancelled = true;
        };
    }, [reloadKey]);

    if (forbidden) {
        return <Navigate to="/profile" replace />;
    }

    const showInitialSkeleton = loading && !summary && !error;
    const subtitle = summary
        ? `${summary.total_members} members · ${summary.active_queueing_sessions} active queues · ${summary.total_facilities} facilities.`
        : 'Platform pulse for facilities, members, and queueing sessions.';

    return (
        <AdminShell user={user}>
            <PageHeader size="md" eyebrow="Admin" title="Overview" subtitle={subtitle} />

            {error ? (
                <div className="rt-alert-error mb-6" role="alert">
                    <p>{error}</p>
                    <button
                        type="button"
                        className="mt-2 text-xs font-bold uppercase tracking-wider underline underline-offset-2"
                        onClick={() => setReloadKey((key) => key + 1)}
                    >
                        Retry
                    </button>
                </div>
            ) : null}

            {showInitialSkeleton ? <AdminMembersTableSkeleton /> : null}

            {summary ? (
                <>
                    <div className="divide-y divide-white/5 rounded-xl border border-[#45454a] bg-[#1b1b1e] md:hidden">
                        {METRICS.map((metric) => (
                            <Link
                                key={metric.key}
                                to={metric.to}
                                className="block px-4 py-4 transition-colors hover:bg-white/[0.03]"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="truncate text-base font-bold text-[#e4e1e6]">{metric.label}</h3>
                                        <p className="mt-0.5 truncate text-xs text-[#918f9c]">{metric.detail}</p>
                                    </div>
                                    <MaterialIcon name={metric.icon} className="shrink-0 text-xl text-[#918f9c]" />
                                </div>
                                <p className={`mt-3 text-2xl font-extrabold tracking-tight tabular-nums ${metric.accent}`}>
                                    {summary[metric.key]}
                                </p>
                            </Link>
                        ))}
                    </div>

                    <div className="rt-admin-members-table hidden overflow-x-auto rounded-xl border border-[#45454a] bg-[#1b1b1e] md:block">
                        <table className="w-full min-w-[560px] border-collapse text-left">
                            <thead>
                                <tr className="border-b border-[#45454a] text-[11px] font-bold uppercase tracking-wide text-[#918f9c]">
                                    <th scope="col" className="px-4 py-3">
                                        Metric
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        Value
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        Detail
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        Open
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {METRICS.map((metric) => (
                                    <tr
                                        key={metric.key}
                                        className="rt-admin-members-row border-b border-[#2a2a2d] last:border-b-0"
                                    >
                                        <td className="px-4 py-3 align-middle">
                                            <Link to={metric.to} className="flex items-center gap-2 hover:text-[#c2c1ff]">
                                                <MaterialIcon name={metric.icon} className="text-xl text-[#918f9c]" />
                                                <span className="text-sm font-semibold text-[#e4e1e6]">{metric.label}</span>
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 align-middle">
                                            <span
                                                className={`text-sm font-extrabold tabular-nums ${metric.accent}`}
                                            >
                                                {summary[metric.key]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 align-middle text-sm text-[#c8c5d2]">
                                            {metric.detail}
                                        </td>
                                        <td className="px-4 py-3 align-middle">
                                            <Link
                                                to={metric.to}
                                                className="text-xs font-bold uppercase tracking-wider text-[#c2c1ff] hover:underline"
                                            >
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : null}
        </AdminShell>
    );
}
