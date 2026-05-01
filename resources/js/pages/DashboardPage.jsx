import { useAuth } from '../context/AuthContext.jsx';
import { LogoutButton } from '../components/LogoutButton.jsx';

export function DashboardPage() {
    const { user } = useAuth();

    return (
        <div className="mx-auto w-full max-w-lg">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Dashboard</h1>
            <p className="mt-1 text-sm text-zinc-600">You are signed in.</p>

            <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <dl className="space-y-4 text-sm">
                    <div>
                        <dt className="font-medium text-zinc-500">Name</dt>
                        <dd className="mt-0.5 text-zinc-900">{user?.name}</dd>
                    </div>
                    <div>
                        <dt className="font-medium text-zinc-500">Email</dt>
                        <dd className="mt-0.5 text-zinc-900">{user?.email}</dd>
                    </div>
                </dl>

                <LogoutButton className="mt-8 w-full rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60" />
            </div>
        </div>
    );
}
