import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { RootLayout } from './components/RootLayout.jsx';
import { CreateMatchPage } from './pages/CreateMatchPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { FacilitiesPage } from './pages/FacilitiesPage.jsx';
import { GameRoomPage } from './pages/GameRoomPage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RankingPage } from './pages/RankingPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';

export function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<RootLayout />}>
                <Route index element={<HomePage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route
                    path="dashboard"
                    element={
                        <ProtectedRoute>
                            <DashboardPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="facilities"
                    element={
                        <ProtectedRoute>
                            <FacilitiesPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="create-match"
                    element={
                        <ProtectedRoute>
                            <CreateMatchPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="ranking"
                    element={
                        <ProtectedRoute>
                            <RankingPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="game-room"
                    element={
                        <ProtectedRoute>
                            <GameRoomPage />
                        </ProtectedRoute>
                    }
                />
            </Route>
        </Routes>
    );
}
