import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * @param {{ children: import('react').ReactNode }} props
 */
export function ProtectedRoute({ children }) {
    const { user, refreshUser } = useAuth();
    const location = useLocation();
    const [ready, setReady] = useState(!!user);

    useEffect(() => {
        if (user) {
            setReady(true);
            return;
        }

        let cancelled = false;
        (async () => {
            const next = await refreshUser();
            if (!cancelled) {
                setReady(true);
            }
            if (!next && !cancelled) {
                // stay on loading until redirect
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user, refreshUser]);

    if (!ready && !user) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
                Loading…
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    return children;
}
