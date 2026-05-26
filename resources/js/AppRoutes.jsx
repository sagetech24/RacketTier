import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { RootLayout } from './components/RootLayout.jsx';
import { CreateMatchPage } from './pages/CreateMatchPage.jsx';
import { ActivityPage } from './pages/ActivityPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { FacilitiesPage } from './pages/FacilitiesPage.jsx';
import { GameRoomPage } from './pages/GameRoomPage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';
import { RankingPage } from './pages/RankingPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { VerifyEmailPage } from './pages/VerifyEmailPage.jsx';
import { CreateQueueingSessionPage } from './pages/CreateQueueingSessionPage.jsx';
import { QueueingSessionPage } from './pages/QueueingSessionPage.jsx';
import { QueueingSessionListPage } from './pages/QueueingSessionListPage.jsx';
import { QueueingSessionMatchesPage } from './pages/QueueingSessionMatchesPage.jsx';
import { QueueingSessionPlayersPage } from './pages/QueueingSessionPlayersPage.jsx';

export function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<RootLayout />}>
                <Route index element={<HomePage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route
                    path="verify-email"
                    element={
                        <ProtectedRoute>
                            <VerifyEmailPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="dashboard"
                    element={
                        <ProtectedRoute>
                            <DashboardPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="activity"
                    element={
                        <ProtectedRoute>
                            <ActivityPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="profile"
                    element={
                        <ProtectedRoute>
                            <ProfilePage />
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
                    path="facility/:facilityId/create-match"
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
                    path="facility/:facilityId/game-room"
                    element={
                        <ProtectedRoute>
                            <GameRoomPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="queueing-session"
                    element={
                        <ProtectedRoute>
                            <QueueingSessionListPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="queueing-session/new"
                    element={
                        <ProtectedRoute>
                            <CreateQueueingSessionPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="queueing-session/:id"
                    element={
                        <ProtectedRoute>
                            <QueueingSessionPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="queueing-session/:id/players"
                    element={
                        <ProtectedRoute>
                            <QueueingSessionPlayersPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="queueing-session/:id/matches"
                    element={
                        <ProtectedRoute>
                            <QueueingSessionMatchesPage />
                        </ProtectedRoute>
                    }
                />
            </Route>
        </Routes>
    );
}
