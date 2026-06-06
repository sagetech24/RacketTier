import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { normalizeAuthUser } from '../lib/userRoles.js';

/** @typedef {{ id: number, name: string, email: string, is_admin: boolean, email_verified: boolean, email_verified_at: string | null } | null} User */

const AuthContext = createContext(null);

function readInitialUser() {
    if (typeof window === 'undefined' || !window.__RT_USER__) {
        return null;
    }
    return normalizeAuthUser(window.__RT_USER__);
}

/**
 * @param {{ children: import('react').ReactNode }} props
 */
export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => readInitialUser());

    const refreshUser = useCallback(async () => {
        const res = await fetch('/auth/user', {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        });
        const data = await res.json();
        const nextUser = normalizeAuthUser(data.user);
        setUser(nextUser);
        return nextUser;
    }, []);

    const value = useMemo(() => ({ user, setUser, refreshUser }), [user, refreshUser]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return ctx;
}
