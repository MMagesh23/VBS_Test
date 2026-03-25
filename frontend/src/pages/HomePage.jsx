import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { settingsAPI } from '../services/api';
import { Heart, Star, Book, Music, Users } from 'lucide-react';

function Countdown({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState({});
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const calc = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const end = target + 7 * 24 * 60 * 60 * 1000;
      if (now >= target && now <= end) { setStarted(true); setEnded(false); return; }
      if (now > end) { setEnded(true); return; }
      const diff = target - now;
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (ended) return <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>🙏 VBS Has Concluded — Thank you!</div>;
  if (started) return (
    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '24px 40px', backdropFilter: 'blur(10px)' }}>
      <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fbbf24' }}>🎉 VBS IS HAPPENING NOW!</div>
    </div>
  );

  return (
    <div>
      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', marginBottom: 20, textAlign: 'center' }}>Starting in...</p>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
        {[
          { value: timeLeft.days, label: 'Days' },
          { value: timeLeft.hours, label: 'Hours' },
          { value: timeLeft.minutes, label: 'Minutes' },
          { value: timeLeft.seconds, label: 'Seconds' },
        ].map(({ value, label }) => (
          <motion.div key={label}
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', borderRadius: 16, padding: '20px 24px', minWidth: 88, textAlign: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
            <AnimatePresence mode="popLayout">
              <motion.div key={value} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ duration: 0.2 }}
                style={{ fontSize: '2.8rem', fontWeight: 900, color: 'white', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {String(value ?? 0).padStart(2, '0')}
              </motion.div>
            </AnimatePresence>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 8 }}>{label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();

  const { data: settings } = useQuery({
    queryKey: ['active-settings-public'],
    queryFn: () => settingsAPI.getActive(),
    select: d => d.data?.data,
  });

  const icons = [Heart, Star, Book, Music, Users];
  const floatingColors = ['#fbbf24', '#34d399', '#f472b6', '#60a5fa', '#a78bfa'];

  return (
    <div style={{ minHeight: '100vh', background: 'white', fontFamily: "'Outfit', sans-serif" }}>
      {/* Hero Section */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 40%, #7c3aed 100%)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', position: 'relative', overflow: 'hidden' }}>
        {/* Floating decorations */}
        {[...Array(8)].map((_, i) => {
          const Icon = icons[i % icons.length];
          return (
            <motion.div key={i}
              animate={{ y: [0, -20, 0], rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
              style={{ position: 'absolute', top: `${10 + (i * 11) % 80}%`, left: `${5 + (i * 13) % 90}%`, opacity: 0.15, pointerEvents: 'none' }}>
              <Icon size={32 + (i % 3) * 12} color={floatingColors[i % 5]} />
            </motion.div>
          );
        })}

        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} style={{ textAlign: 'center', zIndex: 1, maxWidth: 720 }}>
          {/* Church logo/name */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: 100, padding: '8px 20px', marginBottom: 24, border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>✝</div>
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', fontWeight: 600 }}>Presence of Jesus Ministry · Tiruchirappalli</span>
          </div>

          <h1 style={{ fontSize: 'clamp(2.2rem, 6vw, 4rem)', fontWeight: 900, color: 'white', lineHeight: 1.15, marginBottom: 16, textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            {settings?.vbsTitle || 'Vacation Bible School 2026'}
          </h1>

          {settings?.tagline && (
            <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.3rem)', color: 'rgba(255,255,255,0.8)', marginBottom: 12, fontStyle: 'italic' }}>"{settings.tagline}"</p>
          )}

          {settings?.dates && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.4)', borderRadius: 100, padding: '8px 20px', marginBottom: 40 }}>
              <span style={{ color: '#fbbf24', fontSize: '0.9rem', fontWeight: 700 }}>
                📅 {new Date(settings.dates.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })} – {new Date(settings.dates.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          )}

          {/* Countdown */}
          {settings?.dates?.startDate && (
            <div style={{ marginBottom: 48 }}>
              <Countdown targetDate={settings.dates.startDate} />
            </div>
          )}

          <button onClick={() => navigate('/login')}
            style={{ background: 'white', color: '#1d4ed8', padding: '14px 36px', borderRadius: 100, border: 'none', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 8px 30px rgba(0,0,0,0.2)', transition: 'all 0.2s', fontFamily: "'Outfit', sans-serif" }}
            onMouseEnter={e => { e.target.style.transform = 'scale(1.05)'; e.target.style.boxShadow = '0 12px 40px rgba(0,0,0,0.3)'; }}
            onMouseLeave={e => { e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = '0 8px 30px rgba(0,0,0,0.2)'; }}>
            Staff Login →
          </button>
        </motion.div>
      </div>

      {/* Daily Themes Section */}
      {settings?.dailyThemes?.length > 0 && (
        <div style={{ padding: '80px 20px', background: '#f8faff' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: 48 }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a' }}>Daily Themes</h2>
              <p style={{ color: '#64748b', marginTop: 8 }}>Each day of VBS has a special theme and Bible verse</p>
            </motion.div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
              {settings.dailyThemes.map((theme, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `hsl(${i * 45}, 70%, 92%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: `hsl(${i * 45}, 60%, 40%)` }}>
                      {theme.day}
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{theme.title}</span>
                  </div>
                  {theme.verse && <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6366f1', marginBottom: 6 }}>📖 {theme.verse}</div>}
                  {theme.verseText && <div style={{ fontSize: '0.8rem', color: '#475569', fontStyle: 'italic', lineHeight: 1.6 }}>"{theme.verseText}"</div>}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ background: '#0f172a', color: 'rgba(255,255,255,0.6)', textAlign: 'center', padding: '32px 20px', fontSize: '0.875rem' }}>
        <div style={{ marginBottom: 8, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Presence of Jesus Ministry</div>
        <div>Tiruchirappalli, Tamil Nadu, India</div>
        <div style={{ marginTop: 16, opacity: 0.4, fontSize: '0.75rem' }}>VBS Management System · For authorized personnel only</div>
      </footer>
    </div>
  );
}
