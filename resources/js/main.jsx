import '../css/app.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './AppRoutes.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

const el = document.getElementById('root');
if (!el) {
    throw new Error('Root element #root not found');
}

createRoot(el).render(
    <StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    </StrictMode>,
);
