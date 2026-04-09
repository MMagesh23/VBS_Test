import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { settingsAPI } from '../services/api';

const ActiveYearContext = createContext(null);

const YEAR_BOUND_KEYS = [
  ['students'], ['teachers'], ['volunteers'], ['classes'], ['all-students-allocation'],
  ['staging-students'], ['staging-teachers'], ['staging-volunteers'],
  ['dashboard-stats'], ['student-analytics'], ['attendance-trends'], ['modifications'],
  ['teacher-att-records'], ['vol-att-records'], ['admin-student-attendance'],
  ['teacher-history'], ['attendance-check'], ['attendance-check-admin'], ['my-class-full'],
  ['teachers-list'], ['vol-list'], ['class-full'],
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
  // Track if we did initial fetch
  const fetchedRef = useRef(false);

  const fetchYears = useCallback(async () => {
    try {
      const { data } = await settingsAPI.getAll();
      const years = data?.data || [];
      setAllYears(years);

      if (!years.length) {
        setActiveYearState(null);
        prevYearId.current = null;
        return;
      }

      // Priority: stored localStorage → active VBS year → first year
      const stored = localStorage.getItem('selectedVbsYear');
      let chosen = null;
      if (stored) {
        chosen = years.find(y => String(y.year) === stored) || null;
      }
      // If stored year not found or not set, use active year
      if (!chosen) {
        chosen = years.find(y => y.isActive) || years[0] || null;
      }

      // Only update if it differs — avoid unnecessary re-renders
      if (chosen?._id !== prevYearId.current) {
        setActiveYearState(chosen);
        prevYearId.current = chosen?._id ?? null;
        if (chosen) {
          localStorage.setItem('selectedVbsYear', String(chosen.year));
        }
      }
    } catch (err) {
      console.error('Failed to fetch VBS years:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchYears();
    }
  }, [fetchYears]);

  const setActiveYear = useCallback((yearObj) => {
    const newId = yearObj?._id ?? null;
    if (newId === prevYearId.current) return;
    setActiveYearState(yearObj);
    prevYearId.current = newId;
    if (yearObj) {
      localStorage.setItem('selectedVbsYear', String(yearObj.year));
    } else {
      localStorage.removeItem('selectedVbsYear');
    }
    // Invalidate all year-bound caches
    YEAR_BOUND_KEYS.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
  }, [queryClient]);

  const refreshYears = useCallback(async () => {
    fetchedRef.current = false;
    await fetchYears();
    fetchedRef.current = true;
  }, [fetchYears]);

  return (
    <ActiveYearContext.Provider value={{
      activeYear,
      allYears,
      loading,
      vbsYear: activeYear?.year ?? null,
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