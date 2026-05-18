import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function HomePage() {
    const { user, refreshUser } = useAuth();
    const [ready, setReady] = useState(!!user);

    useEffect(() => {
        if (user) {
            setReady(true);
            return;
        }

        let cancelled = false;
        (async () => {
            await refreshUser();
            if (!cancelled) {
                setReady(true);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user, refreshUser]);

    if (!ready) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
                Loading…
            </div>
        );
    }

    return <Navigate to={user ? '/dashboard' : '/login'} replace />;
}
