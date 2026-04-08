import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { settingsAPI } from '../services/api';

const ActiveYearContext = createContext(null);

/**
 * All React Query keys that are year-scoped.
 * Invalidating these when the user switches year forces all mounted
 * components to re-fetch with the correct vbsYear param.
 */
const YEAR_BOUND_KEYS = [
  // Entities
  ['students'], ['teachers'], ['volunteers'], ['classes'], ['all-students-allocation'],
  // Staging
  ['staging-students'], ['staging-teachers'], ['staging-volunteers'],
  // Dashboard & analytics
  ['dashboard-stats'], ['student-analytics'], ['attendance-trends'], ['modifications'],
  // Attendance
  ['teacher-att-records'], ['vol-att-records'], ['admin-student-attendance'],
  ['teacher-history'], ['attendance-check'], ['attendance-check-admin'], ['my-class-full'],
  // Selectors (year-scoped dropdowns)
  ['teachers-list'], ['vol-list'], ['class-full'],
  // Reports
  ['report-daily'], ['report-class'], ['report-full-year'],
  ['report-teacher'], ['report-student'], ['report-volunteer'],
  ['report-village'], ['report-category'], ['village-list'], ['students-search'],
];

export const ActiveYearProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [activeYear, setActiveYearState] = useState(null);
  const [allYears, setAllYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const prevYearId = useRef(null);

  const fetchYears = useCallback(async () => {
    try {
      const { data } = await settingsAPI.getAll();
      const years = data?.data || [];
      setAllYears(years);
      const stored = localStorage.getItem('selectedVbsYear');
      const match = stored ? years.find(y => String(y.year) === stored) : null;
      const active = match || years.find(y => y.isActive) || years[0] || null;
      setActiveYearState(active);
      prevYearId.current = active?._id ?? null;
    } catch { /* ignore startup errors */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchYears(); }, [fetchYears]);

  const setActiveYear = useCallback((yearObj) => {
    const newId = yearObj?._id ?? null;
    if (newId === prevYearId.current) return; // no-op on same year
    setActiveYearState(yearObj);
    prevYearId.current = newId;
    if (yearObj) localStorage.setItem('selectedVbsYear', String(yearObj.year));
    else localStorage.removeItem('selectedVbsYear');
    // Invalidate ALL year-bound caches → components auto re-fetch
    YEAR_BOUND_KEYS.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
  }, [queryClient]);

  const refreshYears = useCallback(() => fetchYears(), [fetchYears]);

  return (
    <ActiveYearContext.Provider value={{
      activeYear,
      allYears,
      loading,
      vbsYear: activeYear?.year ?? null,   // shorthand number for API params
      setActiveYear,
      refreshYears,
    }}>
      {children}
    </ActiveYearContext.Provider>
  );
};

export const useActiveYear = () => {
  const ctx = useContext(ActiveYearContext);
  if (!ctx) throw new Error('useActiveYear must be used within ActiveYearProvider');
  return ctx;
};