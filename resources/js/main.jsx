import '../css/app.css';
import '../css/product-tour.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AppRoutes } from './AppRoutes.jsx';
import { ToastHost } from './components/app/ToastHost.jsx';
import { ProductTourProvider } from './components/tour/ProductTourProvider.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { queryClient } from './lib/queryClient.js';
import { initPwa } from './pwa.js';

initPwa();

const el = document.getElementById('root');
if (!el) {
    throw new Error('Root element #root not found');
}

createRoot(el).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <AuthProvider>
                    <ProductTourProvider>
                        <AppRoutes />
                        <ToastHost />
                    </ProductTourProvider>
                </AuthProvider>
            </BrowserRouter>
        </QueryClientProvider>
    </StrictMode>,
);
