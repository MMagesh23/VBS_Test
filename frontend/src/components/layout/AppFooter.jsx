import React from 'react';
import { useActiveYear } from '../../contexts/ActiveYearContext';

export default function AppFooter() {
  const { activeYear } = useActiveYear();
  const year = new Date().getFullYear();

  return (
    <footer style={{
      background: 'white',
      borderTop: '1px solid var(--color-border)',
      padding: '0 24px',
      height: 44,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexShrink: 0,
      position: 'sticky',
      bottom: 0,
      zIndex: 50,
    }}>
      {/* Left — ministry name */}
      <div style={{
        fontSize: '0.75rem',
        fontWeight: 700,
        color: 'var(--color-text-secondary)',
        whiteSpace: 'nowrap',
      }}>
        Presence of Jesus Ministry
      </div>

      {/* Center — active VBS title */}
      <div style={{
        fontSize: '0.75rem',
        fontWeight: 600,
        color: 'var(--color-text-secondary)',
        textAlign: 'center',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}>
        {activeYear ? (
          <>
            <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
              {activeYear.vbsTitle || `VBS ${activeYear.year}`}
            </span>
            {activeYear.isActive && (
              <span style={{
                background: '#16a34a',
                color: 'white',
                padding: '1px 6px',
                borderRadius: 99,
                fontSize: '0.58rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
              }}>
                LIVE
              </span>
            )}
          </>
        ) : (
          <span style={{ color: 'var(--color-text-muted)' }}>No active VBS year</span>
        )}
      </div>

      {/* Right — copyright */}
      <div style={{
        fontSize: '0.72rem',
        color: 'var(--color-text-muted)',
        whiteSpace: 'nowrap',
      }}>
        © {year} VBS Management System
      </div>
    </footer>
  );
}
