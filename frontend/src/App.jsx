// ─── ADD TO App.jsx ───────────────────────────────────────────────
// 
// 1. Import at the top:
//    import QRAttendancePage from './pages/QRAttendancePage';
//
// 2. Add to PAGE_TITLES in AppLayout.jsx:
//    '/qr-attendance': 'QR Attendance',
//
// 3. Add this route inside the AppLayout <Route element={...}> block:
//
//    <Route
//      path="/qr-attendance"
//      element={
//        <RoleGate roles={['admin', 'teacher']}>
//          <QRAttendancePage />
//        </RoleGate>
//      }
//    />
//
// ─── FULL UPDATED App.jsx ─────────────────────────────────────────

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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
import QRAttendancePage from './pages/QRAttendancePage'; // ← NEW

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
  },
});

function AppLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#f4f6fb', flexDirection: 'column', gap: 14,
    }}>
      <div style={{
        width: 44, height: 44,
        border: '3px solid #e2e8f0', borderTopColor: '#1a2f5e',
        borderRadius: '50%', animation: 'spin 0.75s linear infinite',
      }} />
      <span style={{ fontSize: '0.845rem', color: '#9ca3af', fontWeight: 500 }}>Loading…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <AppLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <AppLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function PostLoginRedirect() {
  const { user, loading, freshLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && user && freshLogin) {
      if (user.mustChangePassword && location.pathname !== '/change-password') {
        navigate('/change-password', { replace: true });
      }
    }
  }, [loading, user, freshLogin, location.pathname, navigate]);

  return null;
}

function AppRoutes() {
  const { loading } = useAuth();
  if (loading) return <AppLoader />;

  return (
    <>
      <PostLoginRedirect />
      <Routes>
        {/* ── Public ────────────────────────────────────────────── */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/change-password" element={<PrivateRoute><ChangePasswordPage /></PrivateRoute>} />

        {/* ── Protected app shell ───────────────────────────────── */}
        <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route
            path="/teachers"
            element={<RoleGate roles={['admin', 'editor', 'viewer']}><TeachersPage /></RoleGate>}
          />
          <Route
            path="/volunteers"
            element={<RoleGate roles={['admin', 'editor', 'viewer']}><VolunteersPage /></RoleGate>}
          />
          <Route
            path="/classes"
            element={<RoleGate roles={['admin', 'viewer']}><ClassesPage /></RoleGate>}
          />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route
            path="/attendance/submit"
            element={<RoleGate roles={['admin', 'teacher']}><AttendancePage initialTab="submit" /></RoleGate>}
          />

          {/* ── QR ATTENDANCE (admin + teacher) ─────────────────── */}
          <Route
            path="/qr-attendance"
            element={<RoleGate roles={['admin', 'teacher']}><QRAttendancePage /></RoleGate>}
          />

          <Route
            path="/verification"
            element={<RoleGate roles={['admin']}><VerificationQueuePage /></RoleGate>}
          />
          <Route
            path="/analytics"
            element={<RoleGate roles={['admin', 'viewer']}><AnalyticsPage /></RoleGate>}
          />
          <Route
            path="/reports"
            element={<RoleGate roles={['admin', 'viewer']}><ReportsPage /></RoleGate>}
          />
          <Route
            path="/users"
            element={<RoleGate roles={['admin']}><UsersPage /></RoleGate>}
          />
          <Route
            path="/settings"
            element={<RoleGate roles={['admin']}><SettingsPage /></RoleGate>}
          />
          <Route
            path="/my-submissions"
            element={<RoleGate roles={['editor']}><MySubmissionsPage /></RoleGate>}
          />
          <Route
            path="/my-class"
            element={<RoleGate roles={['teacher']}><StudentsPage /></RoleGate>}
          />
          <Route
            path="/my-attendance"
            element={<RoleGate roles={['teacher']}><AttendancePage initialTab="my-attendance" /></RoleGate>}
          />
          <Route
            path="/teacher-export"
            element={<RoleGate roles={['teacher', 'admin']}><TeacherExportPage /></RoleGate>}
          />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

function RoleGate({ roles, children }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
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
                style: {
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: '0.845rem',
                  borderRadius: 10,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                },
                success: { iconTheme: { primary: '#16a34a', secondary: 'white' } },
                error:   { iconTheme: { primary: '#dc2626', secondary: 'white' } },
              }}
            />
          </ActiveYearProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
