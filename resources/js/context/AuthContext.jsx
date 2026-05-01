import { createContext, useCallback, useContext, useMemo, useState } from 'react';

/** @typedef {{ id: number, name: string, email: string } | null} User */

const AuthContext = createContext(null);

function readInitialUser() {
    if (typeof window === 'undefined' || !window.__RT_USER__) {
        return null;
    }
    return window.__RT_USER__;
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
        setUser(data.user ?? null);
        return data.user ?? null;
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
