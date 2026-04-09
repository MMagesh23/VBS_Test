import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, X, Play } from 'lucide-react';
import { settingsAPI } from '../services/api';

// ─── Countdown hook ────────────────────────────────────────────────
function useCountdown(start, end) {
  const [state, setState] = useState({ status: 'loading', timeLeft: {} });
  useEffect(() => {
    if (!start || !end) { setState({ status: 'no-date', timeLeft: {} }); return; }
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

// ─── Floating shapes background ───────────────────────────────────
const SHAPES = [
  { emoji: '⭐', top: '8%', left: '5%', delay: 0, size: '2.2rem' },
  { emoji: '🌟', top: '15%', right: '8%', delay: 0.5, size: '1.8rem' },
  { emoji: '✝️', top: '55%', left: '3%', delay: 1, size: '2rem' },
  { emoji: '🌈', bottom: '20%', right: '5%', delay: 0.8, size: '2rem' },
  { emoji: '🕊️', top: '30%', left: '12%', delay: 1.5, size: '1.7rem' },
  { emoji: '📖', bottom: '30%', left: '8%', delay: 0.3, size: '1.6rem' },
  { emoji: '🎵', top: '12%', left: '42%', delay: 0.7, size: '1.5rem' },
  { emoji: '🙌', bottom: '15%', left: '35%', delay: 1.2, size: '1.6rem' },
  { emoji: '🌸', top: '42%', right: '12%', delay: 0.4, size: '1.7rem' },
  { emoji: '💛', bottom: '42%', right: '18%', delay: 1.8, size: '1.5rem' },
];

function FloatingShape({ emoji, top, left, right, bottom, delay, size }) {
  return (
    <motion.div
      style={{ position: 'absolute', top, left, right, bottom, fontSize: size, pointerEvents: 'none', zIndex: 0, userSelect: 'none' }}
      animate={{ y: [0, -18, 0], rotate: [0, 6, -4, 0] }}
      transition={{ duration: 4 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      {emoji}
    </motion.div>
  );
}

// ─── Countdown Unit ────────────────────────────────────────────────
function CountUnit({ value, label }) {
  return (
    <motion.div whileHover={{ scale: 1.06 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', borderRadius: 20, padding: '16px 20px', minWidth: 80, border: '1.5px solid rgba(255,255,255,0.25)' }}>
      <AnimatePresence mode="popLayout">
        <motion.span key={value}
          initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ fontSize: '2.4rem', fontWeight: 900, color: 'white', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {String(value ?? 0).padStart(2, '0')}
        </motion.span>
      </AnimatePresence>
      <span style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.75)', marginTop: 6 }}>{label}</span>
    </motion.div>
  );
}

// ─── Photo Gallery ─────────────────────────────────────────────────
function PhotoGallery({ photos }) {
  const [lightbox, setLightbox] = useState(null);
  if (!photos.length) return null;
  return (
    <>
      <div style={{ columns: '200px 3', gap: 12 }}>
        {photos.map((p, i) => (
          <motion.div key={i} initial={{ opacity: 0, scale: 0.94 }} whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }} whileHover={{ scale: 1.02 }}
            onClick={() => setLightbox(p)}
            style={{ breakInside: 'avoid', marginBottom: 12, borderRadius: 16, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', display: 'block', position: 'relative' }}>
            <img src={p.url} alt={p.caption || 'VBS'} style={{ width: '100%', display: 'block' }}
              onError={e => { e.target.parentNode.style.display = 'none'; }} />
            {(p.caption || p.year) && (
              <div style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', color: 'white', padding: '20px 12px 10px', fontSize: '0.78rem', fontWeight: 600, position: 'absolute', bottom: 0, left: 0, right: 0 }}>
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
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'white', border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={18} />
            </button>
            <motion.img src={lightbox.url} initial={{ scale: 0.85 }} animate={{ scale: 1 }}
              style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 16, boxShadow: '0 20px 80px rgba(0,0,0,0.5)' }} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── YouTube Video Player ──────────────────────────────────────────
function VideoCard({ video }) {
  const [playing, setPlaying] = useState(false);
  const videoId = video.url?.match(/(?:v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
  if (!videoId) return null;
  const thumb = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  return (
    <motion.div whileHover={{ y: -4 }}
      style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', background: '#000', cursor: 'pointer' }}>
      {playing ? (
        <iframe width="100%" height="220"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title={video.title || 'VBS Video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen style={{ display: 'block', border: 'none' }} />
      ) : (
        <div style={{ position: 'relative', paddingTop: '56.25%', cursor: 'pointer' }} onClick={() => setPlaying(true)}>
          <img src={thumb} alt={video.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`; }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
              <Play size={28} color="white" fill="white" style={{ marginLeft: 4 }} />
            </div>
          </div>
          {video.year && (
            <div style={{ position: 'absolute', top: 12, left: 12, background: '#dc2626', color: 'white', borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 800 }}>
              VBS {video.year}
            </div>
          )}
        </div>
      )}
      {video.title && (
        <div style={{ padding: '12px 14px', background: '#111', color: 'white', fontSize: '0.85rem', fontWeight: 600 }}>
          {video.title}
        </div>
      )}
    </motion.div>
  );
}

// ─── Theme Card ────────────────────────────────────────────────────
const THEME_PALETTES = [
  { bg: '#fff0f5', border: '#f9a8d4', text: '#831843', accent: '#db2777', num: '#fce7f3' },
  { bg: '#eff6ff', border: '#93c5fd', text: '#1e3a8a', accent: '#2563eb', num: '#dbeafe' },
  { bg: '#f0fdf4', border: '#86efac', text: '#14532d', accent: '#16a34a', num: '#dcfce7' },
  { bg: '#fefce8', border: '#fde047', text: '#713f12', accent: '#ca8a04', num: '#fef9c3' },
  { bg: '#faf5ff', border: '#d8b4fe', text: '#4c1d95', accent: '#7c3aed', num: '#ede9fe' },
  { bg: '#fff7ed', border: '#fdba74', text: '#9a3412', accent: '#ea580c', num: '#ffedd5' },
];

function ThemeCard({ theme, index }) {
  const p = THEME_PALETTES[index % THEME_PALETTES.length];
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }} whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
      style={{ background: p.bg, borderRadius: 24, padding: 22, border: `2px solid ${p.border}`, transition: 'box-shadow 0.3s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: p.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '1.1rem', boxShadow: `0 4px 12px ${p.accent}60`, flexShrink: 0 }}>
          {theme.day}
        </div>
        <div>
          <div style={{ fontSize: '0.6rem', color: p.accent, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Day {theme.day}</div>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', lineHeight: 1.2 }}>{theme.title}</div>
        </div>
      </div>
      {theme.verse && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: p.accent, color: 'white', borderRadius: 99, padding: '3px 11px', fontSize: '0.72rem', fontWeight: 700, marginBottom: 10 }}>
          📖 {theme.verse}
        </div>
      )}
      {theme.verseText && (
        <div style={{ fontSize: '0.82rem', color: '#374151', fontStyle: 'italic', lineHeight: 1.7, borderLeft: `3px solid ${p.border}`, paddingLeft: 12, marginBottom: theme.description ? 10 : 0 }}>
          "{theme.verseText}"
        </div>
      )}
      {theme.description && (
        <div style={{ fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.6, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${p.border}` }}>
          {theme.description}
        </div>
      )}
    </motion.div>
  );
}

// ─── Feature Card ──────────────────────────────────────────────────
const FEATURES = [
  { emoji: '📖', title: 'Bible Adventures', desc: "Discover amazing stories from God's Word through exciting lessons and activities", color: '#f59e0b' },
  { emoji: '🎵', title: 'Praise & Worship', desc: 'Sing joyful songs and worship together as one big family of faith', color: '#34d399' },
  { emoji: '🎨', title: 'Creative Arts', desc: 'Express your faith through crafts, art, and creative hands-on activities', color: '#60a5fa' },
  { emoji: '👫', title: 'New Friendships', desc: 'Make lifelong friends and grow together in love and community', color: '#f472b6' },
  { emoji: '🏆', title: 'Fun & Games', desc: 'Exciting games packed with lessons, laughter, and great memories', color: '#a78bfa' },
  { emoji: '🙏', title: 'Prayer & Faith', desc: 'Deepen your prayer life and grow closer to God each day', color: '#fb923c' },
];

// ─── Section Header ────────────────────────────────────────────────
function SectionHeader({ emoji, title, subtitle, accent = '#2563eb' }) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: 48 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${accent}18`, border: `1.5px solid ${accent}40`, borderRadius: 99, padding: '6px 18px', marginBottom: 14, fontSize: '0.85rem', fontWeight: 800, color: accent }}>
        {emoji}
      </div>
      <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>{title}</h2>
      {subtitle && <p style={{ color: '#6b7280', marginTop: 10, fontSize: '1rem', maxWidth: 520, margin: '10px auto 0' }}>{subtitle}</p>}
    </motion.div>
  );
}

// ─── MAIN HOME PAGE ────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);

  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => settingsAPI.getActive(),
    select: d => d.data?.data,
    staleTime: 60000,
  });

  const countdown = useCountdown(settings?.dates?.startDate, settings?.dates?.endDate);
  const photos = settings?.previousYearPhotos || [];
  const themes = settings?.dailyThemes || [];
  const videos = settings?.youtubeVideos || [];

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#fffbf5', overflowX: 'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section ref={heroRef} style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {/* Background */}
        <motion.div style={{ position: 'absolute', inset: 0, y: heroY }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #0c1f5e 0%, #1a3090 30%, #5b1a8f 65%, #9c1a5e 100%)' }} />
          {/* Animated blobs */}
          {[
            { style: { top: '5%', left: '8%', width: 400, height: 400 }, color: 'rgba(251,191,36,0.12)', d: 7 },
            { style: { bottom: '10%', right: '5%', width: 500, height: 500 }, color: 'rgba(244,63,94,0.08)', d: 9 },
            { style: { top: '40%', right: '22%', width: 280, height: 280 }, color: 'rgba(99,102,241,0.13)', d: 6 },
            { style: { bottom: '32%', left: '22%', width: 200, height: 200 }, color: 'rgba(52,211,153,0.1)', d: 8 },
          ].map((blob, i) => (
            <motion.div key={i} animate={{ scale: [1, 1.12, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: blob.d, repeat: Infinity, ease: 'easeInOut', delay: i * 0.8 }}
              style={{ position: 'absolute', ...blob.style, borderRadius: '50%', background: blob.color, filter: 'blur(50px)' }} />
          ))}
          {/* Twinkling stars */}
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div key={i}
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.3, 0.8] }}
              transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 5 }}
              style={{ position: 'absolute', width: 2 + Math.random() * 3, height: 2 + Math.random() * 3, borderRadius: '50%', background: 'white', top: `${Math.random() * 80}%`, left: `${Math.random() * 100}%` }} />
          ))}
        </motion.div>

        {/* Floating emojis */}
        {SHAPES.map((s, i) => <FloatingShape key={i} {...s} />)}

        {/* Hero content */}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '60px 24px', maxWidth: 860, width: '100%' }}>
          {/* Ministry badge */}
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', borderRadius: 100, padding: '7px 18px', marginBottom: 20, border: '1px solid rgba(255,255,255,0.22)' }}>
            <span style={{ fontSize: '1rem' }}>✝️</span>
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.82rem', fontWeight: 700 }}>Presence of Jesus Ministry · Tiruchirappalli</span>
          </motion.div>

          {/* VBS badge */}
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
            style={{ display: 'inline-block', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#1a1a1a', borderRadius: 99, padding: '7px 24px', fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 18, boxShadow: '0 4px 20px rgba(251,191,36,0.4)' }}>
            🎉 Vacation Bible School {settings?.year || new Date().getFullYear()}
          </motion.div>

          {/* Title */}
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }}
            style={{ fontSize: 'clamp(2.2rem, 6.5vw, 4.2rem)', fontWeight: 900, color: 'white', lineHeight: 1.1, marginBottom: 12, letterSpacing: '-0.02em', textShadow: '0 4px 30px rgba(0,0,0,0.25)' }}>
            {settings?.vbsTitle || 'Walking With Jesus'}
          </motion.h1>

          {settings?.tagline && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
              style={{ fontSize: 'clamp(1rem, 2.2vw, 1.25rem)', color: 'rgba(255,255,255,0.8)', marginBottom: 12, fontStyle: 'italic', lineHeight: 1.5 }}>
              "{settings.tagline}"
            </motion.p>
          )}

          {settings?.dates && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 100, padding: '9px 22px', marginBottom: 40, fontSize: '0.88rem', fontWeight: 700, color: 'white' }}>
              📅 {fmtDate(settings.dates.startDate)} — {fmtDate(settings.dates.endDate)}
            </motion.div>
          )}

          {/* Countdown */}
          {settings?.dates?.startDate && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} style={{ marginBottom: 48 }}>
              {countdown.status === 'live' && (
                <motion.div animate={{ scale: [1, 1.02, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                  style={{ display: 'inline-block', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', borderRadius: 20, padding: '18px 44px', textAlign: 'center', boxShadow: '0 0 50px rgba(251,191,36,0.45)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 4 }}>🎉</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1a1a1a' }}>VBS IS HAPPENING NOW!</div>
                  <div style={{ color: 'rgba(0,0,0,0.6)', marginTop: 4, fontWeight: 600 }}>Come join us today!</div>
                </motion.div>
              )}
              {countdown.status === 'ended' && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>🙏</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white' }}>VBS Has Concluded — Thank You!</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>What a wonderful time of learning and worship!</div>
                </div>
              )}
              {countdown.status === 'upcoming' && countdown.timeLeft && (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 16, color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    The Adventure Begins In…
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {[['days', 'Days'], ['hours', 'Hours'], ['minutes', 'Minutes'], ['seconds', 'Seconds']].map(([k, label]) => (
                      <CountUnit key={k} value={countdown.timeLeft[k]} label={label} />
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* CTA */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }}
            style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <motion.button onClick={() => navigate('/login')}
              whileHover={{ scale: 1.05, boxShadow: '0 12px 36px rgba(255,255,255,0.2)' }} whileTap={{ scale: 0.97 }}
              style={{ background: 'white', color: '#1a2f5e', padding: '15px 38px', borderRadius: 100, border: 'none', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 8px 28px rgba(0,0,0,0.2)', fontFamily: "'Plus Jakarta Sans', sans-serif' " }}>
              Staff Login →
            </motion.button>
            {themes.length > 0 && (
              <motion.button onClick={() => document.getElementById('themes-section')?.scrollIntoView({ behavior: 'smooth' })}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '15px 38px', borderRadius: 100, border: '1.5px solid rgba(255,255,255,0.35)', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', backdropFilter: 'blur(8px)', fontFamily: "'Plus Jakarta Sans', sans-serif'" }}>
                See Themes ↓
              </motion.button>
            )}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}
          style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Scroll</span>
          <div style={{ width: 1, height: 36, background: 'linear-gradient(transparent, rgba(255,255,255,0.4))' }} />
        </motion.div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', background: '#0f2a6e' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionHeader emoji="🌟 What Awaits You" title="Why Join VBS?"
            subtitle="A transformational week for children of all ages — faith, fun, and friendship!"
            accent="rgba(255,255,255,0.7)" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 16 }}>
            {FEATURES.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }} whileHover={{ y: -5 }}
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: 24, backdropFilter: 'blur(8px)', transition: 'transform 0.2s' }}>
                <div style={{ fontSize: '2rem', marginBottom: 10 }}>{f.emoji}</div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: f.color, marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{f.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DAILY THEMES ────────────────────────────────────────── */}
      {themes.length > 0 && (
        <section id="themes-section" style={{ padding: '80px 24px', background: '#fffbf5' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <SectionHeader emoji="✨ Each Day A New Adventure" title="Daily Themes"
              subtitle="Each day is filled with a special Bible theme, verse, and exciting activities!"
              accent="#7c3aed" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 16 }}>
              {themes.map((t, i) => <ThemeCard key={i} theme={t} index={i} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── PHOTOS ──────────────────────────────────────────────── */}
      {photos.length > 0 && (
        <section style={{ padding: '80px 24px', background: 'linear-gradient(180deg, #f0f7ff 0%, #fff5f0 100%)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <SectionHeader emoji="📸 Memories" title="Previous Year Highlights"
              subtitle="Relive the joy, laughter, and love from past VBS programs"
              accent="#2563eb" />
            <PhotoGallery photos={photos} />
          </div>
        </section>
      )}

      {/* ── YOUTUBE VIDEOS ──────────────────────────────────────── */}
      {videos.length > 0 && (
        <section style={{ padding: '80px 24px', background: '#111' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <SectionHeader emoji="🎬 Watch & Remember" title="VBS Videos"
              subtitle="Watch highlights and memories from our previous programs"
              accent="#dc2626" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
              {videos.map((v, i) => <VideoCard key={i} video={v} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── NO PHOTOS/VIDEOS placeholder ────────────────────────── */}
      {photos.length === 0 && videos.length === 0 && (
        <section style={{ padding: '80px 24px', background: 'linear-gradient(180deg, #f0f7ff, #fff5f0)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <SectionHeader emoji="📸 What to Expect" title="A Week of Faith & Fun"
              subtitle="Activities, worship, friendship, and memories that will last a lifetime"
              accent="#2563eb" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 16 }}>
              {[
                { emoji: '📖', label: 'Bible Stories', color: '#fef3c7', border: '#fbbf24', text: '#92400e' },
                { emoji: '🎵', label: 'Praise Songs', color: '#dbeafe', border: '#60a5fa', text: '#1e40af' },
                { emoji: '🎨', label: 'Creative Arts', color: '#ede9fe', border: '#a78bfa', text: '#4c1d95' },
                { emoji: '🤸', label: 'Fun Activities', color: '#d1fae5', border: '#34d399', text: '#064e3b' },
                { emoji: '🙏', label: 'Prayer Time', color: '#fce7f3', border: '#f9a8d4', text: '#831843' },
                { emoji: '👫', label: 'Friendships', color: '#ffedd5', border: '#fb923c', text: '#9a3412' },
              ].map((p, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} whileHover={{ y: -6 }}
                  style={{ background: p.color, borderRadius: 20, padding: '28px 20px', textAlign: 'center', border: `2px solid ${p.border}` }}>
                  <div style={{ fontSize: '2.2rem', marginBottom: 10 }}>{p.emoji}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: p.text }}>{p.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer style={{ background: '#070d1f', color: 'rgba(255,255,255,0.45)', padding: '36px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 540, margin: '0 auto' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>✝️</div>
          <div style={{ fontWeight: 800, color: 'rgba(255,255,255,0.82)', fontSize: '0.95rem', marginBottom: 4 }}>
            Presence of Jesus Ministry
          </div>
          <div style={{ fontSize: '0.82rem', marginBottom: 14 }}>Tiruchirappalli, Tamil Nadu, India</div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 14 }} />
          <div style={{ fontSize: '0.72rem', opacity: 0.4 }}>
            VBS Management System ·{' '}
            <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', fontSize: 'inherit' }}>
              Staff Login
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}