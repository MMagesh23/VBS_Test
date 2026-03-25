import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppLayout from './components/layout/AppLayout';
import './styles/global.css';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import { TeachersPage, VolunteersPage } from './pages/TeacherVolunteerPages';
import { ClassesPage, UsersPage, SettingsPage } from './pages/AdminPages';
import AttendancePage from './pages/AttendancePage';
import VerificationQueuePage from './pages/VerificationQueuePage';
import AnalyticsPage from './pages/AnalyticsPage';
import ReportsPage from './pages/ReportsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function ChangePasswordPage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = React.useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [loading, setLoading] = React.useState(false);
  const { authAPI } = require('./services/api');
  const navigate = require('react-router-dom').useNavigate();
  const toast = require('react-hot-toast').default;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await authAPI.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      updateUser({ mustChangePassword: false });
      toast.success('Password changed. Please login again.');
      localStorage.clear();
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 20, padding: 40, width: '100%', maxWidth: 440, boxShadow: 'var(--shadow-xl)' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 8 }}>Change Password</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24, fontSize: '0.875rem' }}>You must change your password before continuing.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label className="form-label">Current Password</label><input className="form-input" type="password" value={form.currentPassword} onChange={e => setForm({...form, currentPassword: e.target.value})} required /></div>
          <div className="form-group"><label className="form-label">New Password</label><input className="form-input" type="password" value={form.newPassword} onChange={e => setForm({...form, newPassword: e.target.value})} required minLength={8} /></div>
          <div className="form-group"><label className="form-label">Confirm New Password</label><input className="form-input" type="password" value={form.confirm} onChange={e => setForm({...form, confirm: e.target.value})} required /></div>
          <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/change-password" element={<PrivateRoute><ChangePasswordPage /></PrivateRoute>} />

      {/* Protected app */}
      <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Students - all roles except teacher (teacher gets filtered) */}
        <Route path="/students" element={<StudentsPage />} />

        {/* Teachers - admin, editor, viewer */}
        <Route path="/teachers" element={<PrivateRoute roles={['admin','editor','viewer']}><TeachersPage /></PrivateRoute>} />

        {/* Volunteers - admin, editor, viewer */}
        <Route path="/volunteers" element={<PrivateRoute roles={['admin','editor','viewer']}><VolunteersPage /></PrivateRoute>} />

        {/* Classes - admin, viewer */}
        <Route path="/classes" element={<PrivateRoute roles={['admin','viewer']}><ClassesPage /></PrivateRoute>} />

        {/* Attendance */}
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/attendance/submit" element={<AttendancePage />} />

        {/* Verification queue - admin only */}
        <Route path="/verification" element={<PrivateRoute roles={['admin']}><VerificationQueuePage /></PrivateRoute>} />

        {/* Analytics - admin, viewer */}
        <Route path="/analytics" element={<PrivateRoute roles={['admin','viewer']}><AnalyticsPage /></PrivateRoute>} />

        {/* Reports - admin, viewer */}
        <Route path="/reports" element={<PrivateRoute roles={['admin','viewer']}><ReportsPage /></PrivateRoute>} />

        {/* Admin only */}
        <Route path="/users" element={<PrivateRoute roles={['admin']}><UsersPage /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute roles={['admin']}><SettingsPage /></PrivateRoute>} />

        {/* Editor shortcuts */}
        <Route path="/my-submissions" element={<PrivateRoute roles={['editor']}><StudentsPage /></PrivateRoute>} />

        {/* Teacher */}
        <Route path="/my-class" element={<PrivateRoute roles={['teacher']}><StudentsPage /></PrivateRoute>} />
        <Route path="/my-attendance" element={<PrivateRoute roles={['teacher']}><AttendancePage /></PrivateRoute>} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: '0.875rem', borderRadius: 10 },
              success: { iconTheme: { primary: '#10b981', secondary: 'white' } },
              error: { iconTheme: { primary: '#ef4444', secondary: 'white' } },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
