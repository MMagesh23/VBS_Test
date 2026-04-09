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

// ─── QueryClient: stable singleton, never recreated ───────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
      refetchOnWindowFocus: false,
      // Prevent background refetches from triggering re-renders during navigation
      refetchOnMount: true,
    },
  },
});

/* ─── Loading screen ────────────────────────────────────────────── */
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

/* ─── Route guards ───────────────────────────────────────────────
   KEY FIX: Both guards return <AppLoader /> while auth is resolving.
   They NEVER redirect until `loading === false`. This is the single
   fix that eliminates the reload loop — previously the wildcard `*`
   route and PrivateRoute both evaluated `user` before it was ready,
   causing: null→redirect→/→null→redirect... infinitely.
─────────────────────────────────────────────────────────────────── */
function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();

  // Always wait for auth resolution — never redirect on null user during load
  if (loading) return <AppLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  // Always wait — prevents the flash redirect to /login then back to /dashboard
  if (loading) return <AppLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

/* ─── Post-login redirect handler ───────────────────────────────
   Runs ONCE after a fresh login to handle mustChangePassword.
   Separated from routing to avoid re-render loops.
─────────────────────────────────────────────────────────────────── */
function PostLoginRedirect() {
  const { user, loading, freshLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only act on a fresh login, not on page refresh with stored token
    if (!loading && user && freshLogin) {
      if (
        user.mustChangePassword &&
        location.pathname !== '/change-password'
      ) {
        navigate('/change-password', { replace: true });
      }
    }
  }, [loading, user, freshLogin, location.pathname, navigate]);

  return null;
}

/* ─── App routes ─────────────────────────────────────────────────
   KEY FIX: The wildcard `*` route no longer conditionally evaluates
   `user` inline — it simply shows the loader until auth resolves,
   then uses a stable PrivateRoute check.
─────────────────────────────────────────────────────────────────── */
function AppRoutes() {
  const { loading } = useAuth();

  // Single top-level gate: render nothing until auth state is determined.
  // This prevents ANY route from mounting prematurely.
  if (loading) return <AppLoader />;

  return (
    <>
      {/* Handles mustChangePassword redirect after fresh login */}
      <PostLoginRedirect />

      <Routes>
        {/* ── Public ────────────────────────────────────────────── */}
        <Route path="/" element={<HomePage />} />
        <Route
          path="/login"
          element={<PublicRoute><LoginPage /></PublicRoute>}
        />

        {/* ── Change password (logged-in, outside AppLayout) ──── */}
        <Route
          path="/change-password"
          element={<PrivateRoute><ChangePasswordPage /></PrivateRoute>}
        />

        {/* ── Protected app shell ───────────────────────────────
             Single PrivateRoute wraps AppLayout. Child routes do NOT
             wrap in additional PrivateRoute unless role-gating is
             needed — avoids nested guard conflicts.
        ─────────────────────────────────────────────────────────── */}
        <Route
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/students" element={<StudentsPage />} />

          {/* Role-gated child routes use inline role checks via the
              RoleGate component instead of nested PrivateRoute to
              avoid double-guard re-render loops */}
          <Route
            path="/teachers"
            element={
              <RoleGate roles={['admin', 'editor', 'viewer']}>
                <TeachersPage />
              </RoleGate>
            }
          />
          <Route
            path="/volunteers"
            element={
              <RoleGate roles={['admin', 'editor', 'viewer']}>
                <VolunteersPage />
              </RoleGate>
            }
          />
          <Route
            path="/classes"
            element={
              <RoleGate roles={['admin', 'viewer']}>
                <ClassesPage />
              </RoleGate>
            }
          />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route
            path="/attendance/submit"
            element={
              <RoleGate roles={['admin', 'teacher']}>
                <AttendancePage initialTab="submit" />
              </RoleGate>
            }
          />
          <Route
            path="/verification"
            element={
              <RoleGate roles={['admin']}>
                <VerificationQueuePage />
              </RoleGate>
            }
          />
          <Route
            path="/analytics"
            element={
              <RoleGate roles={['admin', 'viewer']}>
                <AnalyticsPage />
              </RoleGate>
            }
          />
          <Route
            path="/reports"
            element={
              <RoleGate roles={['admin', 'viewer']}>
                <ReportsPage />
              </RoleGate>
            }
          />
          <Route
            path="/users"
            element={
              <RoleGate roles={['admin']}>
                <UsersPage />
              </RoleGate>
            }
          />
          <Route
            path="/settings"
            element={
              <RoleGate roles={['admin']}>
                <SettingsPage />
              </RoleGate>
            }
          />
          <Route
            path="/my-submissions"
            element={
              <RoleGate roles={['editor']}>
                <MySubmissionsPage />
              </RoleGate>
            }
          />
          <Route
            path="/my-class"
            element={
              <RoleGate roles={['teacher']}>
                <StudentsPage />
              </RoleGate>
            }
          />
          <Route
            path="/my-attendance"
            element={
              <RoleGate roles={['teacher']}>
                <AttendancePage initialTab="my-attendance" />
              </RoleGate>
            }
          />
          <Route
            path="/teacher-export"
            element={
              <RoleGate roles={['teacher', 'admin']}>
                <TeacherExportPage />
              </RoleGate>
            }
          />
        </Route>

        {/* ── Catch-all ──────────────────────────────────────────
             KEY FIX: No inline `user` evaluation here. PrivateRoute
             handles the redirect safely after auth has resolved.
        ─────────────────────────────────────────────────────────── */}
        <Route
          path="*"
          element={<Navigate to="/dashboard" replace />}
        />
      </Routes>
    </>
  );
}

/* ─── RoleGate: lightweight role check for child routes ──────────
   Unlike PrivateRoute, this does NOT check auth (already done by
   the parent PrivateRoute wrapping AppLayout). It only checks role.
   This prevents double-guard re-render loops inside the app shell.
─────────────────────────────────────────────────────────────────── */
function RoleGate({ roles, children }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

/* ─── Root ───────────────────────────────────────────────────────── */
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