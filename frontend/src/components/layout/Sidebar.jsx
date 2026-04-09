import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Users, GraduationCap, Heart, BookOpen,
  ClipboardCheck, BarChart3, FileText, Settings, LogOut,
  ChevronLeft, ChevronRight, CheckSquare, UserCheck, Home,
  Download, Bell, Shield, QrCode,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// Role-specific nav
const NAV = {
  admin: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Users, label: 'Students', path: '/students' },
    { icon: GraduationCap, label: 'Teachers', path: '/teachers' },
    { icon: Heart, label: 'Volunteers', path: '/volunteers' },
    { icon: BookOpen, label: 'Classes', path: '/classes' },
    { icon: ClipboardCheck, label: 'Attendance', path: '/attendance' },
    { icon: QrCode, label: 'QR Attendance', path: '/qr-attendance' },
    { icon: CheckSquare, label: 'Verification Queue', path: '/verification', badge: true },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { icon: FileText, label: 'Reports', path: '/reports' },
    { icon: Users, label: 'User Management', path: '/users' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ],
  editor: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Users, label: 'Students', path: '/students' },
    { icon: GraduationCap, label: 'Teachers', path: '/teachers' },
    { icon: Heart, label: 'Volunteers', path: '/volunteers' },
    { icon: ClipboardCheck, label: 'Attendance', path: '/attendance' },
    { icon: UserCheck, label: 'My Submissions', path: '/my-submissions' },
  ],
  viewer: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Users, label: 'Students', path: '/students' },
    { icon: GraduationCap, label: 'Teachers', path: '/teachers' },
    { icon: Heart, label: 'Volunteers', path: '/volunteers' },
    { icon: BookOpen, label: 'Classes', path: '/classes' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { icon: FileText, label: 'Reports', path: '/reports' },
  ],
  teacher: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: QrCode, label: 'QR Attendance', path: '/qr-attendance' },
    { icon: ClipboardCheck, label: 'Mark Attendance', path: '/attendance/submit' },
    { icon: Users, label: 'My Class', path: '/my-class' },
    { icon: ClipboardCheck, label: 'Attendance History', path: '/my-attendance' },
    { icon: Download, label: 'Export & Reports', path: '/teacher-export' },
  ],
};

const ROLE_THEME = {
  admin:   { accent: '#c8922a', light: 'rgba(200,146,42,0.15)',  label: 'Administrator' },
  editor:  { accent: '#16a34a', light: 'rgba(22,163,74,0.15)',   label: 'Editor' },
  viewer:  { accent: '#7c3aed', light: 'rgba(124,58,237,0.15)',  label: 'Viewer' },
  teacher: { accent: '#2563eb', light: 'rgba(37,99,235,0.15)',   label: 'Teacher' },
};

export default function Sidebar({ pendingCount = 0 }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const items = NAV[user?.role] || [];
  const theme = ROLE_THEME[user?.role] || ROLE_THEME.viewer;

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 240 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      style={{
        background: 'var(--color-primary-dark)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '2px 0 20px rgba(0,0,0,0.15)',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '18px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10, minHeight: 68 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Shield size={18} color="white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>VBS Management</div>
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>Presence of Jesus Ministry</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User info */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: theme.light, border: `2px solid ${theme.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, flexShrink: 0, color: theme.accent }}>
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 148 }}>{user?.name}</div>
              <div style={{ fontSize: '0.65rem', color: theme.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{theme.label}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '10px 8px' }}>
        {items.map(item => {
          const Icon = item.icon;
          const hasBadge = item.badge && pendingCount > 0;
          const isQR = item.path === '/qr-attendance';
          return (
            <NavLink key={item.path} to={item.path}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 9, margin: '1px 0',
                textDecoration: 'none',
                background: isActive ? theme.light : 'transparent',
                color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.835rem',
                transition: 'all 0.15s',
                borderLeft: isActive ? `3px solid ${theme.accent}` : '3px solid transparent',
              })}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Icon size={17} color={isQR ? '#fbbf24' : undefined} />
                {hasBadge && (
                  <span style={{ position: 'absolute', top: -5, right: -5, background: '#ef4444', color: 'white', borderRadius: '50%', fontSize: '0.58rem', fontWeight: 800, width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </div>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ whiteSpace: 'nowrap', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 9, width: '100%', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'var(--font-sans)', transition: 'all 0.15s' }}>
          <Home size={17} />
          {!collapsed && <span>Home Page</span>}
        </button>
        <button onClick={handleLogout}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 9, width: '100%', background: 'transparent', border: 'none', color: 'rgba(239,68,68,0.7)', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'var(--font-sans)', transition: 'all 0.15s' }}>
          <LogOut size={17} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{ position: 'absolute', right: -13, top: '50%', transform: 'translateY(-50%)', width: 26, height: 26, borderRadius: '50%', background: 'var(--color-primary)', border: '2px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
      >
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>
    </motion.aside>
  );
}
