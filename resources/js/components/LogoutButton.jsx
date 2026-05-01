import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { csrfToken } from '../lib/http.js';

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
            const body = new URLSearchParams();
            const res = await fetch('/logout', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                credentials: 'same-origin',
                body: body.toString(),
            });

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
