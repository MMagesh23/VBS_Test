import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Sidebar from './Sidebar';
import Header from './Header';
import { analyticsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/students': 'Students',
  '/teachers': 'Teachers',
  '/volunteers': 'Volunteers',
  '/classes': 'Classes',
  '/attendance': 'Attendance',
  '/attendance/submit': 'Mark Attendance',
  '/verification': 'Verification Queue',
  '/analytics': 'Analytics',
  '/reports': 'Reports',
  '/users': 'User Management',
  '/settings': 'VBS Settings',
  '/my-submissions': 'My Submissions',
  '/my-class': 'My Class',
  '/my-attendance': 'My Attendance',
  '/change-password': 'Change Password',
  '/teacher-export': 'Export & Reports',
};

export default function AppLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const title = PAGE_TITLES[location.pathname] || 'VBS Management';

  const { data: dashData } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => analyticsAPI.getDashboard(),
    enabled: user?.role === 'admin',
    refetchInterval: 60000,
    select: (d) => d.data?.data,
  });

  const pendingCount = dashData?.pendingVerifications?.total || 0;

  return (
    <div className="app-layout">
      <Sidebar pendingCount={pendingCount} />
      <div className="main-content">
        <Header title={title} />
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}