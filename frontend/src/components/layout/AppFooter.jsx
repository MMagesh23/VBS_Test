import React from 'react';
import { useActiveYear } from '../../contexts/ActiveYearContext';
import { BrandLogo } from '../../brand';

export default function AppFooter() {
  const { activeYear } = useActiveYear();
  const year = new Date().getFullYear();

  return (
    <footer style={{
      background: 'var(--color-primary-dark)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: '10px 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap',
      flexShrink: 0,
    }}>
      {/* Left — brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6, overflow: 'hidden',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <BrandLogo size={26} />
        </div>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)', lineHeight: 1.2 }}>
            Presence of Jesus Ministry
          </div>
          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
            Tiruchirappalli, Tamil Nadu, India
          </div>
        </div>
      </div>

      {/* Center — active VBS */}
      {activeYear && (
        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
            {activeYear.vbsTitle || `VBS ${activeYear.year}`}
          </span>
          {activeYear.isActive && (
            <span style={{ marginLeft: 8, background: '#16a34a', color: 'white', padding: '1px 6px', borderRadius: 99, fontSize: '0.58rem', fontWeight: 800 }}>
              LIVE
            </span>
          )}
        </div>
      )}

      {/* Right — copyright */}
      <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap' }}>
        © {year} VBS Management System
      </div>
    </footer>
  );
}
