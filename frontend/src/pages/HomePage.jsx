import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, X, Star, Heart, Music, Book, Users, Zap } from 'lucide-react';
import { settingsAPI } from '../services/api';

/* ─── Countdown ──────────────────────────────────────────────────── */
function useCountdown(start, end) {
  const [state, setState] = useState({ status: 'loading', timeLeft: {} });
  useEffect(() => {
    if (!start || !end) return;
    const tick = () => {
      const now = Date.now();
      const s = new Date(start).getTime();
      const e = new Date(end).getTime();
      if (now >= s && now <= e) { setState({ status: 'live' }); return; }
      if (now > e) { setState({ status: 'ended' }); return; }
      const diff = s - now;
      setState({
        status: 'upcoming',
        timeLeft: {
          days: Math.floor(diff / 86400000),
          hours: Math.floor((diff % 86400000) / 3600000),
          minutes: Math.floor((diff % 3600000) / 60000),
          seconds: Math.floor((diff % 60000) / 1000),
        }
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [start, end]);
  return state;
}

function CountdownUnit({ value, label, color }) {
  return (
    <motion.div
      whileHover={{ scale: 1.06 }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(16px)',
        borderRadius: 20, padding: '18px 22px', minWidth: 86,
        border: '1.5px solid rgba(255,255,255,0.22)',
        boxShadow: `0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.25)`,
      }}
    >
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.22 }}
          style={{
            fontSize: '2.6rem', fontWeight: 900, color: 'white', lineHeight: 1,
            fontFamily: "'Fredoka One', cursive", textShadow: '0 2px 12px rgba(0,0,0,0.25)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {String(value ?? 0).padStart(2, '0')}
        </motion.span>
      </AnimatePresence>
      <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.75)', marginTop: 6 }}>
        {label}
      </span>
    </motion.div>
  );
}

/* ─── Photo Gallery / Carousel ───────────────────────────────────── */
function PhotoCarousel({ photos }) {
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState(null);
  const total = photos.length;

  useEffect(() => {
    if (total <= 1) return;
    const id = setInterval(() => setIdx(i => (i + 1) % total), 4500);
    return () => clearInterval(id);
  }, [total]);

  if (!total) {
    // Placeholder cards when no real photos
    const placeholders = [
      { emoji: '📖', label: 'Bible Stories', color: '#fef3c7', border: '#fbbf24' },
      { emoji: '🎵', label: 'Praise & Worship', color: '#dbeafe', border: '#60a5fa' },
      { emoji: '🎨', label: 'Creative Arts', color: '#ede9fe', border: '#a78bfa' },
      { emoji: '🤸', label: 'Fun Activities', color: '#d1fae5', border: '#34d399' },
      { emoji: '🙏', label: 'Prayer Time', color: '#fce7f3', border: '#f9a8d4' },
      { emoji: '👫', label: 'New Friendships', color: '#ffedd5', border: '#fb923c' },
    ];
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
        {placeholders.map((p, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }} whileHover={{ y: -6, scale: 1.03 }}
            style={{ background: p.color, borderRadius: 22, padding: '28px 20px', textAlign: 'center', border: `2px solid ${p.border}`, cursor: 'default' }}>
            <div style={{ fontSize: '2.4rem', marginBottom: 10 }}>{p.emoji}</div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a1a1a', fontFamily: "'Fredoka One', cursive" }}>{p.label}</div>
          </motion.div>
        ))}
      </div>
    );
  }

  // Grid layout for many photos, carousel for few
  if (total >= 4) {
    return (
      <>
        <div style={{ columns: '220px 3', gap: 14 }}>
          {photos.map((p, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.94 }} whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }} whileHover={{ scale: 1.02 }}
              onClick={() => setLightbox(p)}
              style={{ breakInside: 'avoid', marginBottom: 14, borderRadius: 18, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', display: 'block' }}>
              <img src={p.url} alt={p.caption || 'VBS'} style={{ width: '100%', display: 'block' }}
                onError={e => { e.target.parentNode.style.display = 'none'; }} />
              {p.caption && (
                <div style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.65))', color: 'white', padding: '20px 12px 10px', fontSize: '0.78rem', fontWeight: 600 }}>
                  {p.caption} {p.year && <span style={{ opacity: 0.7 }}>· {p.year}</span>}
                </div>
              )}
            </motion.div>
          ))}
        </div>
        <AnimatePresence>
          {lightbox && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setLightbox(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'white', border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
              </button>
              <motion.img src={lightbox.url} initial={{ scale: 0.85 }} animate={{ scale: 1 }}
                style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 18, boxShadow: '0 20px 80px rgba(0,0,0,0.5)' }} />
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Simple carousel for 1-3 photos
  return (
    <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', maxHeight: 420 }}>
      <AnimatePresence mode="wait">
        <motion.img key={idx} src={photos[idx].url} alt={photos[idx].caption}
          initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }}
          transition={{ duration: 0.4 }}
          style={{ width: '100%', display: 'block', objectFit: 'cover', maxHeight: 420, cursor: 'pointer' }}
          onClick={() => setLightbox(photos[idx])} />
      </AnimatePresence>
      {total > 1 && (
        <>
          <button onClick={() => setIdx(i => (i - 1 + total) % total)}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => setIdx(i => (i + 1) % total)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
            <ChevronRight size={20} />
          </button>
          <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
            {photos.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                style={{ width: i === idx ? 20 : 8, height: 8, borderRadius: 99, background: 'white', border: 'none', cursor: 'pointer', transition: 'width 0.3s', opacity: i === idx ? 1 : 0.5 }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Theme Card ─────────────────────────────────────────────────── */
function ThemeCard({ theme, index }) {
  const palettes = [
    { bg: '#fef3c7', border: '#fbbf24', accent: '#d97706', num: '#92400e' },
    { bg: '#dbeafe', border: '#60a5fa', accent: '#2563eb', num: '#1e3a8a' },
    { bg: '#d1fae5', border: '#34d399', accent: '#059669', num: '#064e3b' },
    { bg: '#fce7f3', border: '#f9a8d4', accent: '#db2777', num: '#831843' },
    { bg: '#ede9fe', border: '#a78bfa', accent: '#7c3aed', num: '#4c1d95' },
    { bg: '#ffedd5', border: '#fb923c', accent: '#ea580c', num: '#9a3412' },
    { bg: '#f0fdf4', border: '#86efac', accent: '#16a34a', num: '#14532d' },
  ];
  const p = palettes[index % palettes.length];
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.5 }}
      whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
      style={{ background: p.bg, borderRadius: 24, padding: 22, border: `2px solid ${p.border}`, transition: 'box-shadow 0.3s, transform 0.3s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: p.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '1rem', fontFamily: "'Fredoka One', cursive", boxShadow: `0 4px 12px ${p.accent}60` }}>
          {theme.day}
        </div>
        <div>
          <div style={{ fontSize: '0.62rem', color: p.accent, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Day {theme.day}</div>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', fontFamily: "'Fredoka One', cursive", lineHeight: 1.2 }}>{theme.title}</div>
        </div>
      </div>
      {theme.verse && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: p.accent, color: 'white', borderRadius: 99, padding: '3px 11px', fontSize: '0.72rem', fontWeight: 700, marginBottom: 10 }}>
          📖 {theme.verse}
        </div>
      )}
      {theme.verseText && (
        <div style={{ fontSize: '0.82rem', color: '#374151', fontStyle: 'italic', lineHeight: 1.7, borderLeft: `3px solid ${p.border}`, paddingLeft: 12 }}>
          "{theme.verseText}"
        </div>
      )}
    </motion.div>
  );
}

/* ─── Floating Bubble ────────────────────────────────────────────── */
function Bubble({ emoji, style, delay = 0, duration = 4 }) {
  return (
    <motion.div
      style={{ position: 'absolute', fontSize: '2rem', pointerEvents: 'none', userSelect: 'none', zIndex: 0, ...style }}
      animate={{ y: [0, -20, 0], rotate: [0, 8, -6, 0] }}
      transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay }}
    >{emoji}</motion.div>
  );
}

/* ─── Section Header ─────────────────────────────────────────────── */
function SectionHeader({ badge, title, subtitle, badgeBg = '#fef3c7', badgeBorder = '#fbbf24', badgeColor = '#d97706' }) {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: 52 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: badgeBg, border: `1.5px solid ${badgeBorder}`, borderRadius: 99, padding: '6px 18px', marginBottom: 16, fontSize: '0.78rem', fontWeight: 800, color: badgeColor, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {badge}
      </div>
      <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 900, color: '#0f172a', fontFamily: "'Fredoka One', cursive", lineHeight: 1.2 }}>{title}</h2>
      {subtitle && <p style={{ color: '#6b7280', marginTop: 10, fontSize: '1rem', maxWidth: 520, margin: '10px auto 0' }}>{subtitle}</p>}
    </motion.div>
  );
}

/* ─── Main HomePage ──────────────────────────────────────────────── */
export default function HomePage() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);

  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => settingsAPI.getActive(),
    select: d => d.data?.data,
  });

  const countdown = useCountdown(settings?.dates?.startDate, settings?.dates?.endDate);
  const photos = settings?.previousYearPhotos || [];
  const themes = settings?.dailyThemes || [];

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  const features = [
    { emoji: '📖', title: 'Bible Adventures', desc: 'Discover amazing stories from God\'s Word through exciting lessons', color: '#f59e0b' },
    { emoji: '🎵', title: 'Praise & Worship', desc: 'Sing joyful songs and worship together as one big family', color: '#34d399' },
    { emoji: '🎨', title: 'Creative Arts', desc: 'Express your faith through crafts, art, and creative activities', color: '#60a5fa' },
    { emoji: '👫', title: 'New Friendships', desc: 'Make lifelong friends and grow together in faith and love', color: '#f472b6' },
    { emoji: '🏆', title: 'Fun & Games', desc: 'Exciting games and activities packed with lessons and laughter', color: '#a78bfa' },
    { emoji: '🙏', title: 'Prayer & Faith', desc: 'Deepen your prayer life and grow closer to God each day', color: '#fb923c' },
  ];

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#fffbf5', overflowX: 'hidden' }}>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Fredoka+One&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section ref={heroRef} style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {/* Layered gradient background */}
        <motion.div style={{ position: 'absolute', inset: 0, y: heroY }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #0c1f5e 0%, #1a2f8f 35%, #5b1a8f 70%, #9c1a5e 100%)' }} />
          {/* Animated blobs */}
          {[
            { style: { top: '5%', left: '8%', width: 420, height: 420 }, color: 'rgba(251,191,36,0.13)', delay: 0, duration: 8 },
            { style: { bottom: '10%', right: '5%', width: 520, height: 520 }, color: 'rgba(244,63,94,0.09)', delay: 2, duration: 10 },
            { style: { top: '38%', right: '22%', width: 300, height: 300 }, color: 'rgba(99,102,241,0.14)', delay: 1, duration: 7 },
            { style: { bottom: '30%', left: '20%', width: 200, height: 200 }, color: 'rgba(52,211,153,0.1)', delay: 3, duration: 9 },
          ].map((blob, i) => (
            <motion.div key={i} animate={{ scale: [1, 1.15, 1], rotate: [0, 6, -6, 0] }}
              transition={{ duration: blob.duration, repeat: Infinity, ease: 'easeInOut', delay: blob.delay }}
              style={{ position: 'absolute', ...blob.style, borderRadius: '50%', background: blob.color, filter: 'blur(60px)' }} />
          ))}
          {/* Stars */}
          {[...Array(24)].map((_, i) => (
            <motion.div key={i}
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.7, 1.3, 0.7] }}
              transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 5 }}
              style={{ position: 'absolute', width: 3 + Math.random() * 4, height: 3 + Math.random() * 4, borderRadius: '50%', background: 'white', top: `${Math.random() * 85}%`, left: `${Math.random() * 100}%` }} />
          ))}
        </motion.div>

        {/* Floating decorations */}
        <Bubble emoji="⭐" style={{ top: '10%', left: '6%' }} delay={0} />
        <Bubble emoji="🌟" style={{ top: '18%', right: '10%' }} delay={0.5} duration={3.5} />
        <Bubble emoji="✝️" style={{ top: '62%', left: '4%' }} delay={1} duration={4.5} />
        <Bubble emoji="🌈" style={{ bottom: '18%', right: '7%' }} delay={0.8} />
        <Bubble emoji="🕊️" style={{ top: '33%', left: '14%' }} delay={1.5} duration={5} />
        <Bubble emoji="📖" style={{ bottom: '28%', left: '10%' }} delay={0.3} duration={3.8} />
        <Bubble emoji="🎵" style={{ top: '14%', left: '44%' }} delay={0.7} duration={4.2} />
        <Bubble emoji="🙌" style={{ bottom: '12%', left: '38%' }} delay={1.2} duration={3.6} />

        {/* Hero content */}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '60px 24px', maxWidth: 840, width: '100%' }}>
          {/* Ministry badge */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(12px)', borderRadius: 100, padding: '8px 20px', marginBottom: 24, border: '1px solid rgba(255,255,255,0.25)' }}>
            <span>✝️</span>
            <span style={{ color: 'rgba(255,255,255,0.92)', fontSize: '0.82rem', fontWeight: 700 }}>Presence of Jesus Ministry · Tiruchirappalli</span>
          </motion.div>

          {/* VBS badge */}
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, type: 'spring' }}
            style={{ display: 'inline-block', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#1a1a1a', borderRadius: 99, padding: '6px 22px', fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 20, boxShadow: '0 4px 20px rgba(251,191,36,0.45)' }}>
            🎉 Vacation Bible School {settings?.year || new Date().getFullYear()}
          </motion.div>

          {/* Title */}
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.7 }}
            style={{ fontSize: 'clamp(2.4rem, 7vw, 4.6rem)', fontWeight: 900, color: 'white', lineHeight: 1.1, marginBottom: 14, fontFamily: "'Fredoka One', cursive", textShadow: '0 4px 30px rgba(0,0,0,0.3)', letterSpacing: '-0.01em' }}>
            {settings?.vbsTitle || 'Walking With Jesus'}
          </motion.h1>

          {settings?.tagline && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
              style={{ fontSize: 'clamp(1rem, 2.5vw, 1.3rem)', color: 'rgba(255,255,255,0.82)', marginBottom: 14, fontStyle: 'italic', lineHeight: 1.5 }}>
              "{settings.tagline}"
            </motion.p>
          )}

          {/* Date pill */}
          {settings?.dates && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 100, padding: '10px 24px', marginBottom: 44, fontSize: '0.88rem', fontWeight: 700, color: 'white' }}>
              📅 {fmtDate(settings.dates.startDate)} — {fmtDate(settings.dates.endDate)}
            </motion.div>
          )}

          {/* Countdown */}
          {settings?.dates?.startDate && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }} style={{ marginBottom: 52 }}>
              {countdown.status === 'live' && (
                <motion.div animate={{ scale: [1, 1.02, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                  style={{ display: 'inline-block', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', borderRadius: 20, padding: '20px 48px', textAlign: 'center', boxShadow: '0 0 60px rgba(251,191,36,0.5)' }}>
                  <div style={{ fontSize: '2.2rem', marginBottom: 4 }}>🎉</div>
                  <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#1a1a1a', fontFamily: "'Fredoka One', cursive" }}>VBS IS HAPPENING NOW!</div>
                  <div style={{ color: 'rgba(0,0,0,0.6)', marginTop: 4, fontWeight: 600 }}>Join us today!</div>
                </motion.div>
              )}
              {countdown.status === 'ended' && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🙏</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'white', fontFamily: "'Fredoka One', cursive" }}>VBS Has Concluded — Thank You!</div>
                </div>
              )}
              {countdown.status === 'upcoming' && (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 18, color: 'rgba(255,255,255,0.78)', fontSize: '0.88rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    The Adventure Begins In…
                  </div>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {[['days', 'Days', '📅'], ['hours', 'Hours', '⏰'], ['minutes', 'Minutes', '⏱️'], ['seconds', 'Seconds', '✨']].map(([k, label, emoji]) => (
                      <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ fontSize: '1rem', marginBottom: 4 }}>{emoji}</div>
                        <CountdownUnit value={countdown.timeLeft[k]} label={label} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* CTA */}
          <motion.button onClick={() => navigate('/login')}
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.95, type: 'spring' }}
            whileHover={{ scale: 1.05, boxShadow: '0 12px 40px rgba(255,255,255,0.2)' }} whileTap={{ scale: 0.97 }}
            style={{ background: 'white', color: '#1a2f5e', padding: '16px 42px', borderRadius: 100, border: 'none', fontWeight: 900, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 8px 30px rgba(0,0,0,0.2)', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>
            Staff Login →
          </motion.button>
        </div>

        {/* Scroll indicator */}
        <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}
          style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Scroll to explore</span>
          <div style={{ width: 1, height: 40, background: 'linear-gradient(transparent, rgba(255,255,255,0.45))' }} />
        </motion.div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', background: '#0f2a6e', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(251,191,36,0.07) 0%, transparent 60%), radial-gradient(circle at 75% 25%, rgba(244,63,94,0.05) 0%, transparent 55%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <SectionHeader badge="🌟 Every Day A New Adventure" title="Why Join VBS?"
            subtitle="A transformational week for children of all ages — faith, fun, and friendship!"
            badgeBg="rgba(255,255,255,0.1)" badgeBorder="rgba(255,255,255,0.2)" badgeColor="rgba(255,255,255,0.85)" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 18 }}>
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }} whileHover={{ y: -6 }}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 22, padding: 26, backdropFilter: 'blur(8px)', transition: 'transform 0.2s' }}>
                <div style={{ fontSize: '2rem', marginBottom: 10, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}>{f.emoji}</div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: f.color, marginBottom: 7, fontFamily: "'Fredoka One', cursive" }}>{f.title}</div>
                <div style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{f.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DAILY THEMES ────────────────────────────────────────────── */}
      {themes.length > 0 && (
        <section style={{ padding: '80px 24px', background: '#fffbf5', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, #fef3c720, transparent 50%), radial-gradient(circle at 80% 20%, #dbeafe20, transparent 50%)', pointerEvents: 'none' }} />
          <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
            <SectionHeader badge="✨ Each Day A New Theme" title="Daily Themes"
              subtitle="Each day of VBS is filled with a special theme, Bible verse, and exciting activities!" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(275px, 1fr))', gap: 18 }}>
              {themes.map((t, i) => <ThemeCard key={i} theme={t} index={i} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── PHOTO GALLERY ───────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', background: 'linear-gradient(180deg, #f0f7ff 0%, #fff5f0 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionHeader
            badge="📸 Memories & Highlights"
            title={photos.length ? 'Previous Year Highlights' : 'What to Expect'}
            subtitle={photos.length ? 'Relive the joy from past VBS programs' : 'A week full of faith, fun, and friendship!'}
            badgeBg="#dbeafe" badgeBorder="#60a5fa" badgeColor="#2563eb"
          />
          <PhotoCarousel photos={photos} />
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer style={{ background: '#070d1f', color: 'rgba(255,255,255,0.45)', padding: '36px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 540, margin: '0 auto' }}>
          <div style={{ fontSize: '1.6rem', marginBottom: 8 }}>✝️</div>
          <div style={{ fontWeight: 800, color: 'rgba(255,255,255,0.82)', fontSize: '0.95rem', marginBottom: 4, fontFamily: "'Fredoka One', cursive" }}>Presence of Jesus Ministry</div>
          <div style={{ fontSize: '0.82rem', marginBottom: 14 }}>Tiruchirappalli, Tamil Nadu, India</div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 14 }} />
          <div style={{ fontSize: '0.72rem', opacity: 0.4 }}>
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