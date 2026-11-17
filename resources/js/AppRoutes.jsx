import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminRoute } from './components/AdminRoute.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { RootLayout } from './components/RootLayout.jsx';
import { PageLoader } from './components/PageLoader.jsx';

const ActivityPage = lazy(() => import('./pages/ActivityPage.jsx').then((m) => ({ default: m.ActivityPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx').then((m) => ({ default: m.DashboardPage })));
const DashboardPageV2 = lazy(() => import('./pages/DashboardPageV2.jsx').then((m) => ({ default: m.DashboardPageV2 })));
const FacilitiesComingSoonPage = lazy(() =>
    import('./pages/FacilitiesComingSoonPage.jsx').then((m) => ({ default: m.FacilitiesComingSoonPage })),
);
const HomePage = lazy(() => import('./pages/HomePage.jsx').then((m) => ({ default: m.HomePage })));
const HomePageV2 = lazy(() => import('./pages/HomePageV2.jsx').then((m) => ({ default: m.HomePageV2 })));
const HomePageV3 = lazy(() => import('./pages/HomePageV3.jsx').then((m) => ({ default: m.HomePageV3 })));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx').then((m) => ({ default: m.LoginPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx').then((m) => ({ default: m.ProfilePage })));
const AdminOverviewPage = lazy(() => import('./pages/AdminOverviewPage.jsx').then((m) => ({ default: m.AdminOverviewPage })));
const AdminMembersPage = lazy(() => import('./pages/AdminMembersPage.jsx').then((m) => ({ default: m.AdminMembersPage })));
const AdminMemberDetailPage = lazy(() =>
    import('./pages/AdminMemberDetailPage.jsx').then((m) => ({ default: m.AdminMemberDetailPage })),
);
const AdminFacilitiesPage = lazy(() =>
    import('./pages/AdminFacilitiesPage.jsx').then((m) => ({ default: m.AdminFacilitiesPage })),
);
const AdminSessionsPage = lazy(() =>
    import('./pages/AdminSessionsPage.jsx').then((m) => ({ default: m.AdminSessionsPage })),
);
const AdminTiersPage = lazy(() => import('./pages/AdminTiersPage.jsx').then((m) => ({ default: m.AdminTiersPage })));
const RankingPage = lazy(() => import('./pages/RankingPage.jsx').then((m) => ({ default: m.RankingPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx').then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage.jsx').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage.jsx').then((m) => ({ default: m.ResetPasswordPage })));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage.jsx').then((m) => ({ default: m.VerifyEmailPage })));
const CreateQueueingSessionPage = lazy(() => import('./pages/CreateQueueingSessionPage.jsx').then((m) => ({ default: m.CreateQueueingSessionPage })));
const QueueingSessionPage = lazy(() => import('./pages/QueueingSessionPage.jsx').then((m) => ({ default: m.QueueingSessionPage })));
const QueueingSessionHistoryPage = lazy(() => import('./pages/QueueingSessionHistoryPage.jsx').then((m) => ({ default: m.QueueingSessionHistoryPage })));
const QueueingSessionListPage = lazy(() => import('./pages/QueueingSessionListPage.jsx').then((m) => ({ default: m.QueueingSessionListPage })));
const QueueingSessionMatchesPage = lazy(() => import('./pages/QueueingSessionMatchesPage.jsx').then((m) => ({ default: m.QueueingSessionMatchesPage })));
const QueueingSessionPlayersPage = lazy(() => import('./pages/QueueingSessionPlayersPage.jsx').then((m) => ({ default: m.QueueingSessionPlayersPage })));
const PublicQueueingSessionSummaryPage = lazy(() => import('./pages/PublicQueueingSessionSummaryPage.jsx').then((m) => ({ default: m.PublicQueueingSessionSummaryPage })));

function LazyPage({ children }) {
    return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<RootLayout />}>
                <Route index element={<LazyPage><HomePageV3 /></LazyPage>} />
                <Route path="v1" element={<LazyPage><HomePage /></LazyPage>} />
                <Route path="v2" element={<LazyPage><HomePageV2 /></LazyPage>} />
                <Route path="v3" element={<LazyPage><HomePageV3 /></LazyPage>} />
                <Route path="login" element={<LazyPage><LoginPage /></LazyPage>} />
                <Route path="register" element={<LazyPage><RegisterPage /></LazyPage>} />
                <Route path="forgot-password" element={<LazyPage><ForgotPasswordPage /></LazyPage>} />
                <Route path="password/reset/:token" element={<LazyPage><ResetPasswordPage /></LazyPage>} />
                <Route path="q/:publicKey" element={<LazyPage><PublicQueueingSessionSummaryPage /></LazyPage>} />
                <Route
                    path="verify-email"
                    element={
                        <ProtectedRoute>
                            <LazyPage>
                                <VerifyEmailPage />
                            </LazyPage>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="dashboard"
                    element={
                        <ProtectedRoute>
                            <LazyPage>
                                <DashboardPageV2 />
                            </LazyPage>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="dashboard/v1"
                    element={
                        <ProtectedRoute>
                            <LazyPage>
                                <DashboardPage />
                            </LazyPage>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="dashboard/v2"
                    element={
                        <ProtectedRoute>
                            <LazyPage>
                                <DashboardPageV2 />
                            </LazyPage>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="activity"
                    element={
                        <ProtectedRoute>
                            <LazyPage>
                                <ActivityPage />
                            </LazyPage>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="profile"
                    element={
                        <ProtectedRoute>
                            <LazyPage>
                                <ProfilePage />
                            </LazyPage>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="admin"
                    element={
                        <ProtectedRoute>
                            <AdminRoute>
                                <LazyPage>
                                    <AdminOverviewPage />
                                </LazyPage>
                            </AdminRoute>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="admin/members"
                    element={
                        <ProtectedRoute>
                            <AdminRoute>
                                <LazyPage>
                                    <AdminMembersPage />
                                </LazyPage>
                            </AdminRoute>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="admin/members/:id"
                    element={
                        <ProtectedRoute>
                            <AdminRoute>
                                <LazyPage>
                                    <AdminMemberDetailPage />
                                </LazyPage>
                            </AdminRoute>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="admin/facilities"
                    element={
                        <ProtectedRoute>
                            <AdminRoute>
                                <LazyPage>
                                    <AdminFacilitiesPage />
                                </LazyPage>
                            </AdminRoute>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="admin/sessions"
                    element={
                        <ProtectedRoute>
                            <AdminRoute>
                                <LazyPage>
                                    <AdminSessionsPage />
                                </LazyPage>
                            </AdminRoute>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="admin/tiers"
                    element={
                        <ProtectedRoute>
                            <AdminRoute>
                                <LazyPage>
                                    <AdminTiersPage />
                                </LazyPage>
                            </AdminRoute>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="facilities"
                    element={
                        <ProtectedRoute>
                            <LazyPage>
                                <FacilitiesComingSoonPage />
                            </LazyPage>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="facility/:facilityId/create-match"
                    element={<Navigate to="/facilities" replace />}
                />
                <Route
                    path="ranking"
                    element={
                        <ProtectedRoute>
                            <LazyPage>
                                <RankingPage />
                            </LazyPage>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="facility/:facilityId/game-room"
                    element={<Navigate to="/facilities" replace />}
                />
                <Route
                    path="queueing-session"
                    element={
                        <ProtectedRoute>
                            <LazyPage>
                                <QueueingSessionListPage />
                            </LazyPage>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="queueing-session/new"
                    element={
                        <ProtectedRoute>
                            <LazyPage>
                                <CreateQueueingSessionPage />
                            </LazyPage>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="queueing-session/history"
                    element={
                        <ProtectedRoute>
                            <LazyPage>
                                <QueueingSessionHistoryPage />
                            </LazyPage>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="queueing-session/:id"
                    element={
                        <ProtectedRoute>
                            <LazyPage>
                                <QueueingSessionPage />
                            </LazyPage>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="queueing-session/:id/players"
                    element={
                        <ProtectedRoute>
                            <LazyPage>
                                <QueueingSessionPlayersPage />
                            </LazyPage>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="queueing-session/:id/matches"
                    element={
                        <ProtectedRoute>
                            <LazyPage>
                                <QueueingSessionMatchesPage />
                            </LazyPage>
                        </ProtectedRoute>
                    }
                />
            </Route>
        </Routes>
    );
}
