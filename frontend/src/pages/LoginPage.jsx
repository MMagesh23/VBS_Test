import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Shield, Cross } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ userID: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.userID, form.password);
      toast.success(`Welcome back, ${user.name}!`);
      if (user.mustChangePassword) {
        navigate('/change-password');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      toast.error(msg)
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1e40af 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative', overflow: 'hidden' }}>
      {/* Background decoration */}
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', borderRadius: '50%', background: `rgba(255,255,255,${0.02 + i * 0.01})`, width: `${150 + i * 80}px`, height: `${150 + i * 80}px`, top: `${10 + i * 15}%`, left: `${5 + i * 12}%`, pointerEvents: 'none' }} />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}
      >
        {/* Church Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Shield size={32} color="white" />
          </div>
          <h1 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}>VBS Management</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', marginTop: 4 }}>Presence of Jesus Ministry, Tiruchirappalli</p>
        </div>

        {/* Card */}
        <div style={{ background: 'white', borderRadius: 24, padding: 32, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Sign In</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 24 }}>Enter your credentials to access the system</p>

          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: '0.875rem', color: '#991b1b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username <span className="required">*</span></label>
              <input
                className="form-input"
                type="text"
                placeholder="Enter your username"
                value={form.userID}
                onChange={(e) => setForm({ ...form, userID: e.target.value })}
                required
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password <span className="required">*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  style={{ paddingRight: 44 }}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full" style={{ justifyContent: 'center', height: 46, fontSize: '0.95rem', marginTop: 8 }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <p style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', marginTop: 20 }}>
            This system is for authorized personnel only.<br />
            Contact admin for access.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
