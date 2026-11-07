import { Link } from 'react-router-dom';
import { AppShell } from '../components/app/AppShell.jsx';
import { MaterialIcon } from '../components/dashboard/MaterialIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Temporary placeholder while the member facilities browse flow is hidden.
 */
export function FacilitiesComingSoonPage() {
    const { user } = useAuth();

    return (
        <AppShell user={user}>
            <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
                <div className="mb-6 flex size-16 items-center justify-center rounded-2xl border border-[#c2c1ff]/30 bg-[#c2c1ff]/10">
                    <MaterialIcon name="stadium" className="text-[32px]! text-[#c2c1ff]" />
                </div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c2c1ff]">
                    Facilities
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-[#e4e1e6] sm:text-4xl">
                    Coming soon
                </h1>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-[#bab9c0] sm:text-base">
                    Facility browse and game-room flows are temporarily unavailable. Queueing sessions
                    are still open — start or join a queue anytime.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <Link
                        to="/queueing-session"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#c2c1ff] px-5 text-sm font-bold text-[#211e6a] transition-opacity hover:opacity-90"
                    >
                        <MaterialIcon name="groups" className="text-[18px]!" />
                        Queueing sessions
                    </Link>
                    <Link
                        to="/dashboard"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/15 px-5 text-sm font-semibold text-[#e4e1e6] transition-colors hover:border-[#c2c1ff]/40 hover:text-[#c2c1ff]"
                    >
                        Back to dashboard
                    </Link>
                </div>
            </div>
        </AppShell>
    );
}
