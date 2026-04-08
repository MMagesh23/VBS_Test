import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function isoToLocal(isoStr) {
  if (!isoStr) return null;
  const [y, m, d] = isoStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toISO(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function sameDay(a, b) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function DateInput({
  value,        // ISO string 'YYYY-MM-DD'
  onChange,     // (isoString) => void
  label,
  required,
  optional,
  placeholder = 'Select date',
  min,          // ISO string
  max,          // ISO string
  error,
  style,
  disabled,
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? isoToLocal(value) : null;
  const today = new Date();
  const [viewYear, setViewYear] = useState((selected || today).getFullYear());
  const [viewMonth, setViewMonth] = useState((selected || today).getMonth());
  const containerRef = useRef(null);

  const minDate = min ? isoToLocal(min) : null;
  const maxDate = max ? isoToLocal(max) : null;

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Sync view when value changes
  useEffect(() => {
    if (selected) { setViewYear(selected.getFullYear()); setViewMonth(selected.getMonth()); }
  }, [value]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const isDisabled = useCallback((date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  }, [minDate, maxDate]);

  const selectDate = (date) => {
    if (isDisabled(date)) return;
    onChange(toISO(date));
    setOpen(false);
  };

  const totalDays = daysInMonth(viewYear, viewMonth);
  const firstDay = firstDayOfMonth(viewYear, viewMonth);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(viewYear, viewMonth, d));

  const displayValue = selected
    ? selected.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

  return (
    <div ref={containerRef} style={{ position: 'relative', ...style }}>
      {label && (
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: 5 }}>
          {label}
          {required && <span style={{ color: 'var(--color-danger)', marginLeft: 2 }}>*</span>}
          {optional && <span style={{ color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: 4, fontSize: '0.75rem' }}>(optional)</span>}
        </label>
      )}

      {/* Input trigger */}
      <button type="button" onClick={() => !disabled && setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 9,
          width: '100%', padding: '8px 12px',
          border: `1.5px solid ${error ? 'var(--color-danger)' : open ? 'var(--color-primary-light)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-md)', background: disabled ? 'var(--color-bg)' : 'var(--color-surface)',
          cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)',
          fontSize: '0.85rem', textAlign: 'left',
          boxShadow: open ? '0 0 0 3px rgba(42,74,142,0.1)' : 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          opacity: disabled ? 0.6 : 1,
        }}>
        <Calendar size={15} color={selected ? 'var(--color-primary)' : 'var(--color-text-muted)'} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, color: selected ? 'var(--color-text)' : 'var(--color-text-muted)', fontWeight: selected ? 500 : 400 }}>
          {displayValue || placeholder}
        </span>
        {selected && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(''); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '2px', display: 'flex', borderRadius: 4, fontSize: '1rem', lineHeight: 1 }}>
            ×
          </button>
        )}
      </button>

      {error && <div style={{ fontSize: '0.73rem', color: 'var(--color-danger)', marginTop: 4 }}>{error}</div>}

      {/* Calendar Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 500,
          background: 'white', border: '1px solid var(--color-border)',
          borderRadius: 14, boxShadow: 'var(--shadow-xl)', width: 280, overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--color-primary)', color: 'white' }}>
            <button type="button" onClick={prevMonth}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <ChevronLeft size={15} />
            </button>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', textAlign: 'center' }}>
              {MONTHS[viewMonth]} {viewYear}
            </div>
            <button type="button" onClick={nextMonth}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Day labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '8px 8px 0', gap: 2 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', padding: '4px 0', letterSpacing: '0.04em' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Date grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '4px 8px 10px', gap: 2 }}>
            {cells.map((date, i) => {
              if (!date) return <div key={`empty-${i}`} />;
              const isSelected = sameDay(date, selected);
              const isToday = sameDay(date, today);
              const disabled = isDisabled(date);
              return (
                <button type="button" key={i} onClick={() => selectDate(date)}
                  disabled={disabled}
                  style={{
                    width: '100%', aspectRatio: '1', borderRadius: 8, border: 'none',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: '0.8rem', fontWeight: isSelected || isToday ? 700 : 400,
                    background: isSelected ? 'var(--color-primary)' : isToday ? 'var(--color-accent-bg)' : 'transparent',
                    color: isSelected ? 'white' : isToday ? 'var(--color-accent-dark)' : disabled ? 'var(--color-text-muted)' : 'var(--color-text)',
                    outline: isToday && !isSelected ? `1.5px solid var(--color-accent)` : 'none',
                    opacity: disabled ? 0.35 : 1,
                    transition: 'background 0.12s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  onMouseEnter={e => { if (!isSelected && !disabled) e.currentTarget.style.background = 'var(--color-bg)'; }}
                  onMouseLeave={e => { if (!isSelected && !disabled) e.currentTarget.style.background = 'transparent'; }}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Quick actions */}
          <div style={{ padding: '8px 10px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => selectDate(today)}
              style={{ padding: '4px 12px', borderRadius: 7, border: '1px solid var(--color-border)', background: 'white', fontSize: '0.73rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', color: 'var(--color-text)' }}>
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}