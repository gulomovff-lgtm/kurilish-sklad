import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import DashboardPage from './pages/DashboardPage';
import RequestsPage from './pages/RequestsPage';
import NewRequestPage from './pages/NewRequestPage';
import RequestDetailPage from './pages/RequestDetailPage';
import WarehousePage from './pages/WarehousePage';
import UsersPage from './pages/UsersPage';
import ObjectsPage from './pages/ObjectsPage';
import TelegramSettingsPage from './pages/TelegramSettingsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import { checkAndNotifySlaBreaches } from './services/telegram';

const SLA_CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 минут

function AppRoutes() {
  const { currentUser, loading } = useAuth();

  // ═══ SLA-эскалация: проверяем каждые 15 мин, когда пользователь залогинен ═══
  useEffect(() => {
    if (!currentUser) return;
    // Первый запуск через 30с после входа (чтобы не спамить при старте)
    const initial = setTimeout(() => checkAndNotifySlaBreaches().catch(() => {}), 30_000);
    const interval = setInterval(() => checkAndNotifySlaBreaches().catch(() => {}), SLA_CHECK_INTERVAL_MS);
    return () => { clearTimeout(initial); clearInterval(interval); };
  }, [currentUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/requests/new" element={<NewRequestPage />} />
        <Route path="/requests/:id" element={<RequestDetailPage />} />
        <Route path="/warehouse" element={<WarehousePage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/objects" element={<ObjectsPage />} />
        {currentUser.role === 'admin' && (
          <Route path="/users" element={<UsersPage />} />
        )}
        {currentUser.role === 'admin' && (
          <Route path="/telegram" element={<TelegramSettingsPage />} />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
