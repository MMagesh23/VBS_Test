import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, X, Check, CheckCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

const PRIORITY_COLORS = {
  critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#94a3b8',
};

export default function Header({ title }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showNotifs, setShowNotifs] = useState(false);
  const [search, setSearch] = useState('');

  const { data: notifsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.getAll({ limit: 10 }),
    refetchInterval: 30000,
  });

  const notifications = notifsData?.data?.data || [];
  const unreadCount = notifsData?.data?.unreadCount || 0;

  const markRead = useMutation({
    mutationFn: (id) => notificationsAPI.markRead(id),
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsAPI.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  });

  return (
    <header style={{
      background: 'white', borderBottom: '1px solid var(--color-border)',
      padding: '0 24px', height: 64, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100,
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text)' }}>{title}</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            style={{ position: 'relative', width: 40, height: 40, borderRadius: '50%', background: 'var(--color-bg)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Bell size={18} color="var(--color-text-secondary)" />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: -2, right: -2, background: '#ef4444', color: 'white', borderRadius: '50%', fontSize: '0.6rem', fontWeight: 800, width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifs && (
            <div style={{ position: 'absolute', right: 0, top: 48, width: 360, background: 'white', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--color-border)', zIndex: 200 }}>
              <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Notifications</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {unreadCount > 0 && (
                    <button onClick={() => markAllRead.mutate()} style={{ fontSize: '0.75rem', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCheck size={14} /> Mark all read
                    </button>
                  )}
                  <button onClick={() => setShowNotifs(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}>
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                    No notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div key={n._id} onClick={() => { if (!n.isRead) markRead.mutate(n._id); }}
                      style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border-light)', background: n.isRead ? 'transparent' : '#f0f7ff', cursor: 'pointer', display: 'flex', gap: 12 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLORS[n.priority], marginTop: 6, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: n.isRead ? 500 : 700, color: 'var(--color-text)', lineHeight: 1.4 }}>{n.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2, lineHeight: 1.4 }}>{n.message}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                      {!n.isRead && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', flexShrink: 0, marginTop: 6 }} />}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700 }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{user?.name}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>{user?.role}</span>
          </div>
        </div>
      </div>

      {showNotifs && (
        <div onClick={() => setShowNotifs(false)} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />
      )}
    </header>
  );
}
