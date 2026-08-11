import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { postForm } from '../lib/http.js';

/**
 * @param {{ className?: string, children?: import('react').ReactNode }} props
 */
export function LogoutButton({ className = '', children = 'Log out' }) {
    const { setUser } = useAuth();
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);

    async function onLogout() {
        setBusy(true);
        try {
            const res = await postForm('/logout', {});

            if (res.ok || res.status === 204 || res.redirected) {
                setUser(null);
                navigate('/login', { replace: true });
                return;
            }
        } catch {
            // ignore
        }
        setBusy(false);
    }

    return (
        <button
            type="button"
            onClick={onLogout}
            disabled={busy}
            className={className}
        >
            {busy ? 'Signing out…' : children}
        </button>
    );
}
