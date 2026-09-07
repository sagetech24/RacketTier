import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { userIsAdmin } from '../lib/userRoles.js';

/**
 * @param {{ children: import('react').ReactNode }} props
 */
export function AdminRoute({ children }) {
    const { user } = useAuth();

    if (!userIsAdmin(user)) {
        return <Navigate to="/profile" replace />;
    }

    return children;
}
