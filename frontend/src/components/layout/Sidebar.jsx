import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, GraduationCap, Heart, BookOpen,
  ClipboardCheck, BarChart3, FileText, Settings, LogOut,
  ChevronLeft, ChevronRight, Bell, Shield, CheckSquare,
  UserCheck, Calendar, Home,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const NAV_ITEMS = {
  admin: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Users, label: 'Students', path: '/students' },
    { icon: GraduationCap, label: 'Teachers', path: '/teachers' },
    { icon: Heart, label: 'Volunteers', path: '/volunteers' },
    { icon: BookOpen, label: 'Classes', path: '/classes' },
    { icon: ClipboardCheck, label: 'Attendance', path: '/attendance' },
    { icon: CheckSquare, label: 'Verification Queue', path: '/verification', badge: true },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { icon: FileText, label: 'Reports', path: '/reports' },
    { icon: Users, label: 'User Management', path: '/users' },
    { icon: Settings, label: 'VBS Settings', path: '/settings' },
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
    { icon: ClipboardCheck, label: 'Mark Attendance', path: '/attendance/submit' },
    { icon: Users, label: 'My Class', path: '/my-class' },
    { icon: Calendar, label: 'My Attendance', path: '/my-attendance' },
  ],
};

const ROLE_COLORS = {
  admin: { bg: '#1e40af', accent: '#3b82f6', label: 'Administrator' },
  editor: { bg: '#065f46', accent: '#10b981', label: 'Editor' },
  viewer: { bg: '#5b21b6', accent: '#8b5cf6', label: 'Viewer' },
  teacher: { bg: '#92400e', accent: '#f59e0b', label: 'Teacher' },
};

export default function Sidebar({ pendingCount = 0 }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const items = NAV_ITEMS[user?.role] || [];
  const roleStyle = ROLE_COLORS[user?.role] || ROLE_COLORS.viewer;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      style={{
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
        color: 'white', display: 'flex', flexDirection: 'column',
        position: 'relative', flexShrink: 0, overflow: 'hidden',
        boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 12, minHeight: 72 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: roleStyle.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          <Shield size={20} color="white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>VBS Management</div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Presence of Jesus Ministry</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User info */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${roleStyle.bg}, ${roleStyle.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, flexShrink: 0 }}>
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{user?.name}</div>
              <div style={{ fontSize: '0.65rem', color: roleStyle.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{roleStyle.label}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflow: 'hidden auto', padding: '12px 8px' }}>
        {items.map((item) => {
          const Icon = item.icon;
          const showBadge = item.badge && pendingCount > 0;
          return (
            <NavLink
              key={item.path} to={item.path}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                borderRadius: 10, margin: '2px 0', textDecoration: 'none',
                background: isActive ? `linear-gradient(135deg, ${roleStyle.bg}90, ${roleStyle.accent}40)` : 'transparent',
                color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
                fontWeight: isActive ? 700 : 500, fontSize: '0.85rem',
                transition: 'all 0.15s ease', position: 'relative',
                borderLeft: isActive ? `3px solid ${roleStyle.accent}` : '3px solid transparent',
              })}
              onMouseEnter={(e) => e.currentTarget.style.background = `${roleStyle.bg}40`}
              onMouseLeave={(e) => {
                const isActive = e.currentTarget.classList.contains('active');
                e.currentTarget.style.background = isActive ? `linear-gradient(135deg, ${roleStyle.bg}90, ${roleStyle.accent}40)` : 'transparent';
              }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Icon size={18} />
                {showBadge && (
                  <span style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: 'white', borderRadius: '50%', fontSize: '0.6rem', fontWeight: 800, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </div>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} style={{ whiteSpace: 'nowrap', flex: 1 }}>
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, width: '100%', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.85rem', textAlign: 'left' }}>
          <Home size={18} />
          {!collapsed && <span>Home Page</span>}
        </button>
        <button onClick={handleLogout}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, width: '100%', background: 'transparent', border: 'none', color: 'rgba(239,68,68,0.7)', cursor: 'pointer', fontSize: '0.85rem', textAlign: 'left' }}>
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{ position: 'absolute', right: -14, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: '50%', background: '#1e293b', border: '2px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </motion.aside>
  );
}
