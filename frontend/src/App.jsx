import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ActiveYearProvider } from './contexts/ActiveYearContext';
import AppLayout from './components/layout/AppLayout';
import './styles/global.css';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import { TeachersPage, VolunteersPage } from './pages/TeacherVolunteerPages';
import { ClassesPage, UsersPage, SettingsPage } from './pages/AdminPages';
import ChangePasswordPage from './pages/ChangePasswordPage';
import AttendancePage from './pages/AttendancePage';
import VerificationQueuePage from './pages/VerificationQueuePage';
import AnalyticsPage from './pages/AnalyticsPage';
import ReportsPage from './pages/ReportsPage';
import MySubmissionsPage from './pages/MySubmissionsPage';
import { TeacherExportPage } from './pages/TeacherPages';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000, refetchOnWindowFocus: false },
  },
});

/* ─── Global loading screen ─────────────────────────────────────── */
function AppLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f4f6fb', flexDirection: 'column', gap: 14 }}>
      <div style={{ width: 44, height: 44, border: '3px solid #e2e8f0', borderTopColor: '#1a2f5e', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
      <span style={{ fontSize: '0.845rem', color: '#9ca3af', fontWeight: 500 }}>Loading…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ─── Route guards ───────────────────────────────────────────────── */
// Wait for auth to resolve before making ANY routing decision.
// This prevents the flicker: null-user → redirect-to-/ → then user loads → redirect-to-dashboard
function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <AppLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  // Show nothing (not redirect) while auth resolves — avoids flicker to /
  if (loading) return <AppLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  // Block ALL routing until auth state is known. This single gate prevents
  // every loop/flicker scenario: the router won't render any redirect
  // until we know whether the user is logged in or not.
  if (loading) return <AppLoader />;

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

      {/* Change password — accessible to logged-in users only, outside AppLayout */}
      <Route path="/change-password" element={<PrivateRoute><ChangePasswordPage /></PrivateRoute>} />

      {/* Protected app routes */}
      <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/teachers" element={<PrivateRoute roles={['admin', 'editor', 'viewer']}><TeachersPage /></PrivateRoute>} />
        <Route path="/volunteers" element={<PrivateRoute roles={['admin', 'editor', 'viewer']}><VolunteersPage /></PrivateRoute>} />
        <Route path="/classes" element={<PrivateRoute roles={['admin', 'viewer']}><ClassesPage /></PrivateRoute>} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/attendance/submit" element={<PrivateRoute roles={['admin', 'teacher']}><AttendancePage initialTab="submit" /></PrivateRoute>} />
        <Route path="/verification" element={<PrivateRoute roles={['admin']}><VerificationQueuePage /></PrivateRoute>} />
        <Route path="/analytics" element={<PrivateRoute roles={['admin', 'viewer']}><AnalyticsPage /></PrivateRoute>} />
        <Route path="/reports" element={<PrivateRoute roles={['admin', 'viewer']}><ReportsPage /></PrivateRoute>} />
        <Route path="/users" element={<PrivateRoute roles={['admin']}><UsersPage /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute roles={['admin']}><SettingsPage /></PrivateRoute>} />
        <Route path="/my-submissions" element={<PrivateRoute roles={['editor']}><MySubmissionsPage /></PrivateRoute>} />
        <Route path="/my-class" element={<PrivateRoute roles={['teacher']}><StudentsPage /></PrivateRoute>} />
        <Route path="/my-attendance" element={<PrivateRoute roles={['teacher']}><AttendancePage initialTab="my-attendance" /></PrivateRoute>} />
        <Route path="/teacher-export" element={<PrivateRoute roles={['teacher', 'admin']}><TeacherExportPage /></PrivateRoute>} />
      </Route>

      {/* Catch-all: only redirect after auth resolved */}
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ActiveYearProvider>
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '0.845rem', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' },
                success: { iconTheme: { primary: '#16a34a', secondary: 'white' } },
                error: { iconTheme: { primary: '#dc2626', secondary: 'white' } },
              }}
            />
          </ActiveYearProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}