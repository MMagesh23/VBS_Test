import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { settingsAPI } from '../services/api';

/* ─── Countdown Component ─────────────────────────────────────── */
function Countdown({ targetDate, endDate }) {
  const [timeLeft, setTimeLeft] = useState({});
  const [status, setStatus] = useState('upcoming'); // upcoming | live | ended

  useEffect(() => {
    const calc = () => {
      const now = Date.now();
      const start = new Date(targetDate).getTime();
      const end = new Date(endDate).getTime();

      if (now >= start && now <= end) { setStatus('live'); return; }
      if (now > end) { setStatus('ended'); return; }

      setStatus('upcoming');
      const diff = start - now;
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [targetDate, endDate]);

  if (status === 'ended') return (
    <div style={{ textAlign: 'center', padding: '32px 0' }}>
      <div style={{ fontSize: '3rem', marginBottom: 8 }}>🙏</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', fontFamily: "'Fredoka One', cursive" }}>
        VBS Has Concluded!
      </div>
      <div style={{ color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>Thank you for joining us this year</div>
    </div>
  );

  if (status === 'live') return (
    <motion.div
      animate={{ scale: [1, 1.02, 1] }}
      transition={{ repeat: Infinity, duration: 2 }}
      style={{
        textAlign: 'center',
        background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
        borderRadius: 24, padding: '24px 48px',
        boxShadow: '0 0 60px rgba(251,191,36,0.5)',
      }}
    >
      <div style={{ fontSize: '2.5rem', marginBottom: 4 }}>🎉</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1a1a1a', fontFamily: "'Fredoka One', cursive" }}>
        VBS IS HAPPENING NOW!
      </div>
      <div style={{ color: 'rgba(0,0,0,0.6)', marginTop: 4, fontWeight: 600 }}>Come join us today!</div>
    </motion.div>
  );

  const units = [
    { value: timeLeft.days, label: 'Days', emoji: '📅' },
    { value: timeLeft.hours, label: 'Hours', emoji: '⏰' },
    { value: timeLeft.minutes, label: 'Minutes', emoji: '⏱️' },
    { value: timeLeft.seconds, label: 'Seconds', emoji: '✨' },
  ];

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 20, color: 'rgba(255,255,255,0.8)', fontSize: '1rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        The Adventure Begins In...
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {units.map(({ value, label, emoji }) => (
          <motion.div
            key={label}
            style={{
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(16px)',
              borderRadius: 20,
              padding: '20px 24px',
              minWidth: 90,
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.25)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            }}
            whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.22)' }}
          >
            <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{emoji}</div>
            <AnimatePresence mode="popLayout">
              <motion.div
                key={value}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{
                  fontSize: '2.8rem', fontWeight: 900, color: 'white',
                  lineHeight: 1, fontVariantNumeric: 'tabular-nums',
                  fontFamily: "'Fredoka One', cursive",
                  textShadow: '0 2px 12px rgba(0,0,0,0.3)',
                }}
              >
                {String(value ?? 0).padStart(2, '0')}
              </motion.div>
            </AnimatePresence>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 6 }}>
              {label}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── Floating Decoration ─────────────────────────────────────── */
function FloatingDeco({ emoji, style, delay = 0 }) {
  return (
    <motion.div
      style={{ position: 'absolute', fontSize: '2rem', pointerEvents: 'none', userSelect: 'none', ...style }}
      animate={{ y: [0, -18, 0], rotate: [0, 8, -8, 0] }}
      transition={{ duration: 3.5 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      {emoji}
    </motion.div>
  );
}

/* ─── Photo Gallery ───────────────────────────────────────────── */
function PhotoGallery({ photos }) {
  const [selected, setSelected] = useState(null);

  if (!photos?.length) {
    // Show placeholder cards when no photos
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {[
          { emoji: '📖', label: 'Bible Stories' },
          { emoji: '🎵', label: 'Praise & Worship' },
          { emoji: '🎨', label: 'Arts & Crafts' },
          { emoji: '🤸', label: 'Fun Activities' },
          { emoji: '🙏', label: 'Prayer Time' },
          { emoji: '👫', label: 'New Friends' },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ y: -4, scale: 1.02 }}
            style={{
              background: `hsl(${i * 55 + 200}, 70%, 94%)`,
              borderRadius: 20, padding: '28px 20px', textAlign: 'center',
              border: `2px solid hsl(${i * 55 + 200}, 60%, 85%)`,
              cursor: 'default',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>{item.emoji}</div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a1a1a' }}>{item.label}</div>
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div style={{ columns: '200px 3', gap: 14 }}>
        {photos.map((photo, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ scale: 1.03, zIndex: 2 }}
            onClick={() => setSelected(photo)}
            style={{
              breakInside: 'avoid', marginBottom: 14, borderRadius: 16,
              overflow: 'hidden', cursor: 'pointer', position: 'relative',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              display: 'block',
            }}
          >
            <img src={photo.url} alt={photo.caption || `VBS ${photo.year}`}
              style={{ width: '100%', display: 'block', transition: 'transform 0.3s' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
            {photo.caption && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                color: 'white', padding: '24px 12px 10px', fontSize: '0.78rem', fontWeight: 600,
              }}>
                {photo.caption} {photo.year && <span style={{ opacity: 0.7 }}>· {photo.year}</span>}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          >
            <motion.img
              src={selected.url} alt={selected.caption}
              initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}
              style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 20, boxShadow: '0 20px 80px rgba(0,0,0,0.5)' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Daily Theme Card ────────────────────────────────────────── */
function ThemeCard({ theme, index }) {
  const colors = [
    { bg: '#fef3c7', border: '#fbbf24', accent: '#d97706' },
    { bg: '#dbeafe', border: '#60a5fa', accent: '#2563eb' },
    { bg: '#d1fae5', border: '#34d399', accent: '#059669' },
    { bg: '#fce7f3', border: '#f9a8d4', accent: '#db2777' },
    { bg: '#ede9fe', border: '#a78bfa', accent: '#7c3aed' },
    { bg: '#ffedd5', border: '#fb923c', accent: '#ea580c' },
    { bg: '#f0fdf4', border: '#86efac', accent: '#16a34a' },
  ];
  const c = colors[index % colors.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.5 }}
      whileHover={{ y: -6, boxShadow: '0 16px 40px rgba(0,0,0,0.12)' }}
      style={{
        background: c.bg, borderRadius: 24, padding: 24,
        border: `2px solid ${c.border}`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.3s, transform 0.3s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14, background: c.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 900, fontSize: '1rem',
          fontFamily: "'Fredoka One', cursive",
          boxShadow: `0 4px 12px ${c.accent}60`,
        }}>
          {theme.day}
        </div>
        <div>
          <div style={{ fontSize: '0.68rem', color: c.accent, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Day {theme.day}</div>
          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', fontFamily: "'Fredoka One', cursive" }}>{theme.title}</div>
        </div>
      </div>
      {theme.verse && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: c.accent, color: 'white', borderRadius: 99, padding: '3px 12px', fontSize: '0.75rem', fontWeight: 700, marginBottom: 10 }}>
          📖 {theme.verse}
        </div>
      )}
      {theme.verseText && (
        <div style={{ fontSize: '0.84rem', color: '#374151', fontStyle: 'italic', lineHeight: 1.7, borderLeft: `3px solid ${c.border}`, paddingLeft: 12 }}>
          "{theme.verseText}"
        </div>
      )}
    </motion.div>
  );
}

/* ─── Main HomePage ───────────────────────────────────────────── */
export default function HomePage() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);

  const { data: settings } = useQuery({
    queryKey: ['active-settings-public'],
    queryFn: () => settingsAPI.getActive(),
    select: d => d.data?.data,
  });

  const photos = settings?.previousYearPhotos || [];
  const themes = settings?.dailyThemes || [];

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#fffbf5', minHeight: '100vh', overflowX: 'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=Fredoka+One&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ── HERO ─────────────────────────────────── */}
      <section ref={heroRef} style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {/* Animated gradient background */}
        <motion.div style={{ position: 'absolute', inset: 0, y: heroY }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(160deg, #0f2a6e 0%, #1a3a8f 35%, #6b21a8 70%, #be185d 100%)',
          }} />
          {/* Animated blobs */}
          <motion.div animate={{ scale: [1, 1.15, 1], rotate: [0, 10, 0] }} transition={{ duration: 8, repeat: Infinity }}
            style={{ position: 'absolute', top: '5%', left: '10%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(251,191,36,0.12)', filter: 'blur(60px)' }} />
          <motion.div animate={{ scale: [1.1, 1, 1.1], rotate: [0, -8, 0] }} transition={{ duration: 10, repeat: Infinity, delay: 2 }}
            style={{ position: 'absolute', bottom: '10%', right: '5%', width: 500, height: 500, borderRadius: '50%', background: 'rgba(244,63,94,0.1)', filter: 'blur(70px)' }} />
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 7, repeat: Infinity, delay: 1 }}
            style={{ position: 'absolute', top: '40%', right: '25%', width: 300, height: 300, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', filter: 'blur(50px)' }} />
          {/* Stars */}
          {[...Array(20)].map((_, i) => (
            <motion.div key={i}
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 4 }}
              style={{
                position: 'absolute', width: 3 + Math.random() * 4, height: 3 + Math.random() * 4,
                borderRadius: '50%', background: 'white',
                top: `${Math.random() * 80}%`, left: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </motion.div>

        {/* Floating emojis */}
        <FloatingDeco emoji="⭐" style={{ top: '12%', left: '8%' }} delay={0} />
        <FloatingDeco emoji="🌟" style={{ top: '20%', right: '12%' }} delay={0.5} />
        <FloatingDeco emoji="✝️" style={{ top: '60%', left: '5%' }} delay={1} />
        <FloatingDeco emoji="🌈" style={{ bottom: '20%', right: '8%' }} delay={0.8} />
        <FloatingDeco emoji="🕊️" style={{ top: '35%', left: '15%' }} delay={1.5} />
        <FloatingDeco emoji="📖" style={{ bottom: '30%', left: '12%' }} delay={0.3} />
        <FloatingDeco emoji="🎵" style={{ top: '15%', left: '45%' }} delay={0.7} />
        <FloatingDeco emoji="🙌" style={{ bottom: '15%', left: '40%' }} delay={1.2} />

        {/* Hero content */}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '60px 24px', maxWidth: 820, width: '100%' }}>
          {/* Ministry badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', borderRadius: 100, padding: '8px 20px', marginBottom: 28, border: '1px solid rgba(255,255,255,0.25)' }}
          >
            <span style={{ fontSize: '1rem' }}>✝️</span>
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.02em' }}>
              Presence of Jesus Ministry · Tiruchirappalli
            </span>
          </motion.div>

          {/* VBS label */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, type: 'spring' }}
            style={{ display: 'inline-block', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#1a1a1a', borderRadius: 99, padding: '6px 20px', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 20, boxShadow: '0 4px 20px rgba(251,191,36,0.4)' }}
          >
            🎉 Vacation Bible School {settings?.year || new Date().getFullYear()}
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.7 }}
            style={{ fontSize: 'clamp(2.4rem, 7vw, 4.5rem)', fontWeight: 900, color: 'white', lineHeight: 1.1, marginBottom: 16, fontFamily: "'Fredoka One', cursive", textShadow: '0 4px 30px rgba(0,0,0,0.3)', letterSpacing: '-0.01em' }}
          >
            {settings?.vbsTitle || 'Walking With Jesus'}
          </motion.h1>

          {settings?.tagline && (
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              style={{ fontSize: 'clamp(1rem, 2.5vw, 1.3rem)', color: 'rgba(255,255,255,0.85)', marginBottom: 16, fontStyle: 'italic', lineHeight: 1.5 }}
            >
              "{settings.tagline}"
            </motion.p>
          )}

          {/* Date badge */}
          {settings?.dates && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 100, padding: '10px 24px', marginBottom: 44, fontSize: '0.9rem', fontWeight: 700, color: 'white' }}
            >
              <span>📅</span>
              {new Date(settings.dates.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
              {' '}&mdash;{' '}
              {new Date(settings.dates.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </motion.div>
          )}

          {/* Countdown */}
          {settings?.dates?.startDate && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} style={{ marginBottom: 52 }}>
              <Countdown targetDate={settings.dates.startDate} endDate={settings.dates.endDate} />
            </motion.div>
          )}

          {/* CTA button */}
          <motion.button
            onClick={() => navigate('/login')}
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1, type: 'spring' }}
            whileHover={{ scale: 1.05, boxShadow: '0 12px 40px rgba(255,255,255,0.25)' }}
            whileTap={{ scale: 0.97 }}
            style={{ background: 'white', color: '#1a2f5e', padding: '16px 40px', borderRadius: 100, border: 'none', fontWeight: 900, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 8px 30px rgba(0,0,0,0.2)', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}
          >
            Staff Login →
          </motion.button>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}
          style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
        >
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Scroll to explore</span>
          <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, rgba(255,255,255,0.5), transparent)' }} />
        </motion.div>
      </section>

      {/* ── DAILY THEMES ─────────────────────────── */}
      {themes.length > 0 && (
        <section style={{ padding: '80px 24px', background: '#fffbf5', position: 'relative', overflow: 'hidden' }}>
          {/* Background pattern */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, #fef3c720 0%, transparent 50%), radial-gradient(circle at 80% 20%, #dbeafe20 0%, transparent 50%)', pointerEvents: 'none' }} />
          <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fef3c7', border: '1.5px solid #fbbf24', borderRadius: 99, padding: '6px 18px', marginBottom: 16, fontSize: '0.8rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                ✨ Each Day A New Adventure
              </div>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 900, color: '#0f172a', fontFamily: "'Fredoka One', cursive", lineHeight: 1.2 }}>
                Daily Themes
              </h2>
              <p style={{ color: '#6b7280', marginTop: 10, fontSize: '1.05rem', maxWidth: 500, margin: '10px auto 0' }}>
                Each day of VBS is filled with a special theme, Bible verse, and exciting activities!
              </p>
            </motion.div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {themes.map((theme, i) => <ThemeCard key={i} theme={theme} index={i} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── PHOTO GALLERY ────────────────────────── */}
      <section style={{ padding: '80px 24px', background: 'linear-gradient(180deg, #f0f7ff 0%, #fff5f0 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -80, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(251,191,36,0.06)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: -60, right: -60, width: 250, height: 250, borderRadius: '50%', background: 'rgba(99,102,241,0.06)', filter: 'blur(40px)' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#dbeafe', border: '1.5px solid #60a5fa', borderRadius: 99, padding: '6px 18px', marginBottom: 16, fontSize: '0.8rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              📸 Memories
            </div>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 900, color: '#0f172a', fontFamily: "'Fredoka One', cursive" }}>
              {photos.length > 0 ? 'Previous Year Highlights' : 'What to Expect'}
            </h2>
            <p style={{ color: '#6b7280', marginTop: 10, fontSize: '1.05rem' }}>
              {photos.length > 0 ? 'Relive the joy and memories from past VBS programs' : 'A week full of faith, fun, and friendship!'}
            </p>
          </motion.div>
          <PhotoGallery photos={photos} />
        </div>
      </section>

      {/* ── WHY VBS SECTION ──────────────────────── */}
      <section style={{ padding: '80px 24px', background: '#0f2a6e', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(251,191,36,0.08) 0%, transparent 60%), radial-gradient(circle at 70% 30%, rgba(244,63,94,0.06) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 900, color: 'white', fontFamily: "'Fredoka One', cursive" }}>
              Why Join VBS? 🌟
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.65)', marginTop: 10, fontSize: '1rem' }}>
              A transformational week for children of all ages
            </p>
          </motion.div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
            {[
              { emoji: '📖', title: 'Bible Learning', desc: 'Discover amazing stories from the Word of God through fun lessons', color: '#fbbf24' },
              { emoji: '🎵', title: 'Worship & Music', desc: 'Sing praise songs and worship together as one big family', color: '#34d399' },
              { emoji: '🎨', title: 'Creative Arts', desc: 'Express your faith through crafts, art, and creative activities', color: '#60a5fa' },
              { emoji: '👫', title: 'New Friendships', desc: 'Make lifelong friends and grow together in faith', color: '#f472b6' },
              { emoji: '🏆', title: 'Fun Games', desc: 'Exciting games and activities that teach valuable lessons', color: '#a78bfa' },
              { emoji: '🙏', title: 'Prayer & Faith', desc: 'Deepen your prayer life and grow closer to God', color: '#fb923c' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ y: -6 }}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 24, padding: 28, backdropFilter: 'blur(8px)', transition: 'transform 0.2s' }}
              >
                <div style={{ fontSize: '2rem', marginBottom: 12, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>{item.emoji}</div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: item.color, marginBottom: 8, fontFamily: "'Fredoka One', cursive" }}>{item.title}</div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{item.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────── */}
      <footer style={{ background: '#070d1f', color: 'rgba(255,255,255,0.5)', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>✝️</div>
          <div style={{ fontWeight: 800, color: 'rgba(255,255,255,0.85)', fontSize: '1rem', marginBottom: 4, fontFamily: "'Fredoka One', cursive" }}>
            Presence of Jesus Ministry
          </div>
          <div style={{ fontSize: '0.875rem', marginBottom: 16 }}>Tiruchirappalli, Tamil Nadu, India</div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 16 }} />
          <div style={{ fontSize: '0.75rem', opacity: 0.4 }}>
            VBS Management System · For authorized staff only ·{' '}
            <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', fontSize: 'inherit' }}>
              Staff Login
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}