import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Users, Key } from 'lucide-react';
import { classesAPI, usersAPI, settingsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Modal, ConfirmDialog, LoadingPage, EmptyState, CategoryBadge, RoleBadge } from '../components/common';
import toast from 'react-hot-toast';

// ─── CLASSES PAGE ─────────────────────────────────────────────────
export function ClassesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'admin';
  const [showForm, setShowForm] = useState(false);
  const [editClass, setEditClass] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ name: '', category: '', capacity: 30, description: '' });

  const { data: classes, isLoading } = useQuery({ queryKey: ['classes'], queryFn: () => classesAPI.getAll(), select: d => d.data?.data || [] });

  const createMutation = useMutation({ mutationFn: (data) => classesAPI.create(data), onSuccess: () => { qc.invalidateQueries(['classes']); toast.success('Class created'); setShowForm(false); setForm({name:'',category:'',capacity:30,description:''}); }, onError: err => toast.error(err.response?.data?.message || 'Failed') });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => classesAPI.update(id, data), onSuccess: () => { qc.invalidateQueries(['classes']); toast.success('Class updated'); setEditClass(null); }, onError: err => toast.error(err.response?.data?.message || 'Failed') });
  const deleteMutation = useMutation({ mutationFn: (id) => classesAPI.delete(id), onSuccess: () => { qc.invalidateQueries(['classes']); toast.success('Class deleted'); setDeleteTarget(null); }, onError: err => toast.error(err.response?.data?.message || 'Failed') });

  const openEdit = c => { setEditClass(c); setForm({ name: c.name, category: c.category, capacity: c.capacity || 30, description: c.description || '' }); };

  if (isLoading) return <LoadingPage />;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div><h1 className="page-title">Classes</h1><p className="page-subtitle">{classes?.length || 0} classes</p></div>
        {isAdmin && <button className="btn btn-primary" onClick={() => { setEditClass(null); setForm({name:'',category:'',capacity:30,description:''}); setShowForm(true); }}><Plus size={16} /> Create Class</button>}
      </div>

      <div className="grid-2">
        {(classes || []).map(cls => (
          <motion.div key={cls._id} className="card" whileHover={{ y: -2 }}>
            <div className="card-header">
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem' }}>{cls.name}</div>
                <div style={{ marginTop: 4 }}><CategoryBadge category={cls.category} /></div>
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-secondary btn-icon" onClick={() => openEdit(cls)}><Edit2 size={14} /></button>
                  <button className="btn btn-danger btn-icon" onClick={() => setDeleteTarget(cls)}><Trash2 size={14} /></button>
                </div>
              )}
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', fontWeight: 600 }}>Grade Range</div>
                  <div style={{ fontWeight: 700, marginTop: 2 }}>{cls.gradeRange || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', fontWeight: 600 }}>Capacity</div>
                  <div style={{ fontWeight: 700, marginTop: 2 }}>{cls.studentCount || 0} / {cls.capacity}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', fontWeight: 600 }}>Teacher</div>
                  <div style={{ fontWeight: 600, marginTop: 2, fontSize: '0.875rem' }}>{cls.teacher?.name || 'Unassigned'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', fontWeight: 600 }}>Year</div>
                  <div style={{ fontWeight: 700, marginTop: 2 }}>{cls.year}</div>
                </div>
              </div>
              {cls.description && <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{cls.description}</div>}
              {/* Capacity bar */}
              <div style={{ marginTop: 12 }}>
                <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min((cls.studentCount / cls.capacity) * 100, 100)}%`, height: '100%', background: cls.studentCount >= cls.capacity ? '#ef4444' : '#3b82f6', borderRadius: 3, transition: 'width 0.5s' }} />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <Modal isOpen={showForm || !!editClass} onClose={() => { setShowForm(false); setEditClass(null); }} title={editClass ? 'Edit Class' : 'Create Class'}
        footer={<><button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditClass(null); }}>Cancel</button><button className="btn btn-primary" onClick={() => editClass ? updateMutation.mutate({ id: editClass._id, data: form }) : createMutation.mutate(form)}>{editClass ? 'Save' : 'Create'}</button></>}>
        <div className="form-grid">
          <div className="form-group"><label className="form-label">Class Name *</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g., Beginner A, Primary 1" /></div>
          <div className="form-group"><label className="form-label">Category *</label>
            <select className="form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
              <option value="">Select category</option>
              {['Beginner','Primary','Junior','Inter'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Capacity</label><input className="form-input" type="number" value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} min={1} /></div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Description</label><textarea className="form-textarea" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteMutation.mutate(deleteTarget._id)} title="Delete Class" message={`Delete class "${deleteTarget?.name}"? All student assignments will be removed.`} confirmLabel="Delete" type="danger" loading={deleteMutation.isPending} />
    </div>
  );
}

// ─── USER MANAGEMENT PAGE ─────────────────────────────────────────
export function UsersPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [form, setForm] = useState({ userID: '', password: '', role: 'editor', name: '', email: '' });

  const { data: users, isLoading } = useQuery({ queryKey: ['users'], queryFn: () => usersAPI.getAll(), select: d => d.data?.data || [] });

  const createMutation = useMutation({ mutationFn: (data) => usersAPI.create(data), onSuccess: () => { qc.invalidateQueries(['users']); toast.success('User created'); setShowForm(false); setForm({userID:'',password:'',role:'editor',name:'',email:''}); }, onError: err => toast.error(err.response?.data?.message || 'Failed') });
  const toggleActiveMutation = useMutation({ mutationFn: ({ id, isActive }) => usersAPI.update(id, { isActive }), onSuccess: () => { qc.invalidateQueries(['users']); toast.success('User status updated'); } });
  const resetPasswordMutation = useMutation({ mutationFn: ({ id, password }) => usersAPI.resetPassword(id, { newPassword: password }), onSuccess: () => { qc.invalidateQueries(['users']); toast.success('Password reset'); setResetTarget(null); setNewPassword(''); } });

  if (isLoading) return <LoadingPage />;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div><h1 className="page-title">User Management</h1><p className="page-subtitle">Manage system access for editors, viewers, and teachers</p></div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Create User</button>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Email</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
            <tbody>
              {(users || []).map(u => (
                <motion.tr key={u._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td><code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{u.userID}</code></td>
                  <td><RoleBadge role={u.role} /></td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{u.email || '—'}</td>
                  <td><span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}</td>
                  <td>
                    {u.role !== 'admin' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => toggleActiveMutation.mutate({ id: u._id, isActive: !u.isActive })}>{u.isActive ? 'Deactivate' : 'Activate'}</button>
                        <button className="btn btn-secondary btn-icon" onClick={() => setResetTarget(u)} title="Reset password"><Key size={14} /></button>
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Create New User"
        footer={<><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" onClick={() => createMutation.mutate(form)}>Create User</button></>}>
        <div className="form-grid">
          <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div className="form-group"><label className="form-label">Username *</label><input className="form-input" value={form.userID} onChange={e => setForm({...form, userID: e.target.value})} placeholder="Login username" /></div>
          <div className="form-group"><label className="form-label">Role *</label>
            <select className="form-select" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>
          <div className="form-group"><label className="form-label">Temporary Password *</label><input className="form-input" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
        </div>
        <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 10, padding: 12, marginTop: 12, fontSize: '0.8rem', color: '#92400e' }}>
          ⚠️ User will be prompted to change their password on first login.
        </div>
      </Modal>

      <Modal isOpen={!!resetTarget} onClose={() => setResetTarget(null)} title={`Reset Password — ${resetTarget?.name}`}
        footer={<><button className="btn btn-secondary" onClick={() => setResetTarget(null)}>Cancel</button><button className="btn btn-primary" onClick={() => resetPasswordMutation.mutate({ id: resetTarget._id, password: newPassword })} disabled={!newPassword || newPassword.length < 8}>Reset Password</button></>}>
        <div className="form-group">
          <label className="form-label">New Temporary Password</label>
          <input className="form-input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 8 characters" />
        </div>
      </Modal>
    </div>
  );
}

// ─── SETTINGS PAGE ─────────────────────────────────────────────────
// ─── SETTINGS PAGE ─────────────────────────────────────────────────
// Replace the existing SettingsPage export in AdminPages.jsx with this

export function SettingsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);   // controls modal open/close
  const [editSettings, setEditSettings] = useState(null); // null = create new, object = editing
  const [form, setForm] = useState({});

  const { data: allSettings, isLoading } = useQuery({
    queryKey: ['all-settings'],
    queryFn: () => settingsAPI.getAll(),
    select: d => d.data?.data || [],
  });

  const createMutation = useMutation({
    mutationFn: settingsAPI.create,
    onSuccess: () => { qc.invalidateQueries(['all-settings']); toast.success('VBS year created'); setShowModal(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => settingsAPI.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['all-settings']); toast.success('Settings updated'); setShowModal(false); },
  });

  const activateMutation = useMutation({
    mutationFn: (id) => settingsAPI.activate(id),
    onSuccess: () => { qc.invalidateQueries(['all-settings']); toast.success('Year activated'); },
  });

  const openCreate = () => {
    setEditSettings(null);
    setForm({
      year: new Date().getFullYear(),
      vbsTitle: '',
      tagline: '',
      startDate: '',
      endDate: '',
      timeWindowStart: '08:00',
      timeWindowEnd: '10:00',
      mainColor: '#2563EB',
      accentColor: '#F59E0B',
    });
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditSettings(s);
    setForm({
      year: s?.year || new Date().getFullYear(),
      vbsTitle: s?.vbsTitle || '',
      tagline: s?.tagline || '',
      startDate: s?.dates?.startDate?.split('T')[0] || '',
      endDate: s?.dates?.endDate?.split('T')[0] || '',
      timeWindowStart: s?.timeWindow?.studentAttendance?.startTime || '08:00',
      timeWindowEnd: s?.timeWindow?.studentAttendance?.endTime || '10:00',
      mainColor: s?.theme?.mainColor || '#2563EB',
      accentColor: s?.theme?.accentColor || '#F59E0B',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditSettings(null);
  };

  const handleSave = () => {
    const data = {
      year: Number(form.year),
      vbsTitle: form.vbsTitle,
      tagline: form.tagline,
      dates: { startDate: form.startDate, endDate: form.endDate },
      timeWindow: {
        studentAttendance: { startTime: form.timeWindowStart, endTime: form.timeWindowEnd },
        teacherAttendance: { flexible: true },
        volunteerAttendance: { flexible: true },
        timezone: 'Asia/Kolkata',
      },
      theme: { mainColor: form.mainColor, accentColor: form.accentColor },
    };
    if (editSettings?._id) updateMutation.mutate({ id: editSettings._id, data });
    else createMutation.mutate(data);
  };

  if (isLoading) return <LoadingPage />;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">VBS Settings</h1>
          <p className="page-subtitle">Configure VBS years, themes, and time windows</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> New VBS Year
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {(allSettings || []).map(s => (
          <div key={s._id} className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: s.theme?.mainColor || '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900 }}>
                  {s.year}
                </div>
                <div>
                  <div style={{ fontWeight: 800 }}>{s.vbsTitle}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{s.tagline}</div>
                </div>
                {s.isActive && <span className="badge badge-green">ACTIVE</span>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {!s.isActive && (
                  <button className="btn btn-success btn-sm" onClick={() => activateMutation.mutate(s._id)}>
                    Set Active
                  </button>
                )}
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}>
                  <Edit2 size={14} /> Edit
                </button>
              </div>
            </div>
            <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {[
                { label: 'Start Date', value: s.dates?.startDate ? new Date(s.dates.startDate).toLocaleDateString() : '—' },
                { label: 'End Date', value: s.dates?.endDate ? new Date(s.dates.endDate).toLocaleDateString() : '—' },
                { label: 'Attendance Window', value: `${s.timeWindow?.studentAttendance?.startTime || '—'} – ${s.timeWindow?.studentAttendance?.endTime || '—'}` },
                { label: 'Daily Themes', value: `${s.dailyThemes?.length || 0} configured` },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editSettings?._id ? `Edit VBS ${editSettings.year}` : 'Create New VBS Year'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Settings'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Year *</label>
            <input className="form-input" type="number" value={form.year || ''} onChange={e => setForm({ ...form, year: e.target.value })} />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">VBS Title *</label>
            <input className="form-input" value={form.vbsTitle || ''} onChange={e => setForm({ ...form, vbsTitle: e.target.value })} placeholder="e.g., Walking with Jesus 2026" />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Tagline</label>
            <input className="form-input" value={form.tagline || ''} onChange={e => setForm({ ...form, tagline: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Start Date *</label>
            <input className="form-input" type="date" value={form.startDate || ''} onChange={e => setForm({ ...form, startDate: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">End Date *</label>
            <input className="form-input" type="date" value={form.endDate || ''} onChange={e => setForm({ ...form, endDate: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Attendance Window Start</label>
            <input className="form-input" type="time" value={form.timeWindowStart || '08:00'} onChange={e => setForm({ ...form, timeWindowStart: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Attendance Window End</label>
            <input className="form-input" type="time" value={form.timeWindowEnd || '10:00'} onChange={e => setForm({ ...form, timeWindowEnd: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}