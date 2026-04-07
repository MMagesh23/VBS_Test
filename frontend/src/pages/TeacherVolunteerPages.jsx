import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Link, UserPlus, Key, Eye, EyeOff, CheckCircle, X, AlertCircle } from 'lucide-react';
import { teachersAPI, volunteersAPI, classesAPI, usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Modal, ConfirmDialog, LoadingPage, EmptyState, SearchBar, StatusBadge } from '../components/common';
import toast from 'react-hot-toast';

// ─── Teacher Account Creation Modal ───────────────────────────────
function TeacherAccountModal({ isOpen, onClose, teacher, onSuccess }) {
  const [form, setForm] = useState({ userID: '', password: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.userID.trim() || form.userID.length < 3) errs.userID = 'Username must be at least 3 characters';
    if (!form.password || form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) onSuccess(form);
  };

  if (!isOpen || !teacher) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div className="modal modal-sm" onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
        <div className="modal-header">
          <div>
            <span style={{ fontWeight: 700 }}>Create Login Account</span>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>{teacher.name}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="alert alert-info" style={{ marginBottom: 16 }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <div>
              This will create a login account for <strong>{teacher.name}</strong> so they can submit student attendance.
              Share these credentials with the teacher.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Username <span className="required">*</span></label>
            <input className={`form-input ${errors.userID ? 'error' : ''}`}
              value={form.userID}
              onChange={e => setForm(f => ({ ...f, userID: e.target.value.toLowerCase().replace(/\s/g, '') }))}
              placeholder="e.g., teacher.john" autoComplete="new-password" />
            {errors.userID && <div className="form-error">{errors.userID}</div>}
            <div className="form-hint">Lowercase only, no spaces</div>
          </div>

          <div className="form-group">
            <label className="form-label">Password <span className="required">*</span></label>
            <div style={{ position: 'relative' }}>
              <input className={`form-input ${errors.password ? 'error' : ''}`}
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min. 8 characters" autoComplete="new-password"
                style={{ paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <div className="form-error">{errors.password}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password <span className="required">*</span></label>
            <input className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
              type="password"
              value={form.confirmPassword}
              onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
              placeholder="Re-enter password" autoComplete="new-password" />
            {errors.confirmPassword && <div className="form-error">{errors.confirmPassword}</div>}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            <UserPlus size={15} /> Create Account
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Reset Password Modal ──────────────────────────────────────────
function ResetPasswordModal({ isOpen, onClose, teacher, onSuccess }) {
  const [newPassword, setNewPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  if (!isOpen || !teacher) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div className="modal modal-sm" onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
        <div className="modal-header">
          <span style={{ fontWeight: 700 }}>Reset Password — {teacher.name}</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">New Password</label>
            <div style={{ position: 'relative' }}>
              <input className="form-input" type={showPass ? 'text' : 'password'}
                value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="Min 8 characters" style={{ paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary"
            disabled={!newPassword || newPassword.length < 8}
            onClick={() => onSuccess(newPassword)}>
            <Key size={15} /> Reset Password
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── TEACHERS PAGE ─────────────────────────────────────────────────
export function TeachersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'admin';
  const isReadOnly = user?.role === 'viewer';

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTeacher, setEditTeacher] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [accountTarget, setAccountTarget] = useState(null);
  const [resetPwTarget, setResetPwTarget] = useState(null);
  const [form, setForm] = useState({ name: '', contactNumber: '', email: '', yearsOfExperience: '', qualification: '' });

  const { data: teachers, isLoading } = useQuery({
    queryKey: ['teachers', search],
    queryFn: () => teachersAPI.getAll({ search, isActive: true }),
    select: d => d.data?.data || [],
  });

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesAPI.getAll(),
    select: d => d.data?.data || [],
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: (data) => teachersAPI.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries(['teachers']);
      toast.success(res.data?.staged ? 'Teacher submitted for approval' : 'Teacher created');
      setShowForm(false);
      setForm({ name: '', contactNumber: '', email: '', yearsOfExperience: '', qualification: '' });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => teachersAPI.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['teachers']); toast.success('Teacher updated'); setEditTeacher(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => teachersAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries(['teachers']); toast.success('Teacher deleted'); setDeleteTarget(null); },
  });

  const assignMutation = useMutation({
    mutationFn: ({ teacherId, classId }) => teachersAPI.assignClass(teacherId, classId),
    onSuccess: () => { qc.invalidateQueries(['teachers']); toast.success('Teacher assigned to class'); setAssignTarget(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  // Create teacher login account
  const createAccountMutation = useMutation({
    mutationFn: async ({ teacher, userID, password }) => {
      // 1. Create user account with teacher role
      const userRes = await usersAPI.create({
        userID,
        password,
        role: 'teacher',
        name: teacher.name,
        email: teacher.email || undefined,
      });
      // 2. Link the user to the teacher profile
      await teachersAPI.update(teacher._id, { user: userRes.data?.data?._id });
      return userRes;
    },
    onSuccess: (res) => {
      qc.invalidateQueries(['teachers']);
      toast.success(`Login account created! Username: ${res.data?.data?.userID}`);
      setAccountTarget(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create account'),
  });

  // Reset teacher account password
  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId, newPassword }) => usersAPI.resetPassword(userId, { newPassword }),
    onSuccess: () => {
      qc.invalidateQueries(['teachers']);
      toast.success('Password reset. Teacher must change on next login.');
      setResetPwTarget(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const openEdit = (t) => {
    setEditTeacher(t);
    setForm({ name: t.name, contactNumber: t.contactNumber, email: t.email || '', yearsOfExperience: t.yearsOfExperience || '', qualification: t.qualification || '' });
  };

  if (isLoading) return <LoadingPage />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Teachers</h1>
          <p className="page-subtitle">{teachers?.length || 0} active teachers</p>
        </div>
        {!isReadOnly && (
          <button className="btn btn-primary" onClick={() => { setEditTeacher(null); setForm({ name: '', contactNumber: '', email: '', yearsOfExperience: '', qualification: '' }); setShowForm(true); }}>
            <Plus size={16} /> Add Teacher
          </button>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search teachers..." />
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Qualification</th>
                <th>Class Assigned</th>
                <th>Experience</th>
                <th>Login Account</th>
                {!isReadOnly && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {(teachers || []).length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState icon={null} title="No teachers found" description="Add teachers to get started" />
                  </td>
                </tr>
              ) : (
                (teachers || []).map(t => (
                  <motion.tr key={t._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.name}</div>
                      {t.email && <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{t.email}</div>}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{t.contactNumber}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                      {t.qualification || '—'}
                    </td>
                    <td>
                      {t.classAssigned
                        ? <span className="badge badge-blue">{t.classAssigned.name}</span>
                        : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Unassigned</span>}
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem' }}>
                      {t.yearsOfExperience ? `${t.yearsOfExperience} yrs` : '—'}
                    </td>
                    <td>
                      {t.user ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="badge badge-green">
                            <CheckCircle size={11} /> Active
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                            @{t.user?.userID || 'linked'}
                          </span>
                        </div>
                      ) : (
                        <span className="badge badge-gray">No Account</span>
                      )}
                    </td>
                    {!isReadOnly && (
                      <td>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {/* Account management */}
                          {isAdmin && !t.user && (
                            <button className="btn btn-success btn-sm" onClick={() => setAccountTarget(t)} title="Create login account">
                              <UserPlus size={13} /> Account
                            </button>
                          )}
                          {isAdmin && t.user && (
                            <button className="btn btn-secondary btn-sm" onClick={() => setResetPwTarget(t)} title="Reset password">
                              <Key size={13} />
                            </button>
                          )}
                          {/* Class assignment */}
                          {isAdmin && (
                            <button className="btn btn-secondary btn-sm" onClick={() => setAssignTarget(t)} title="Assign to class">
                              <Link size={13} />
                            </button>
                          )}
                          {isAdmin && (
                            <button className="btn btn-secondary btn-icon btn-sm" onClick={() => openEdit(t)}>
                              <Edit2 size={13} />
                            </button>
                          )}
                          {isAdmin && (
                            <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => setDeleteTarget(t)}>
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showForm || !!editTeacher}
        onClose={() => { setShowForm(false); setEditTeacher(null); }}
        title={editTeacher ? 'Edit Teacher' : 'Add Teacher'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditTeacher(null); }}>Cancel</button>
            <button className="btn btn-primary" onClick={() => editTeacher
              ? updateMutation.mutate({ id: editTeacher._id, data: form })
              : createMutation.mutate(form)
            }>
              {user?.role === 'editor' ? 'Submit for Approval' : editTeacher ? 'Save Changes' : 'Create Teacher'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Full Name <span className="required">*</span></label>
            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Teacher's full name" />
          </div>
          <div className="form-group">
            <label className="form-label">Contact Number <span className="required">*</span></label>
            <input className="form-input" value={form.contactNumber} onChange={e => setForm({ ...form, contactNumber: e.target.value })} maxLength={10} placeholder="10-digit number" inputMode="numeric" />
          </div>
          <div className="form-group">
            <label className="form-label">Email <span className="optional">(optional)</span></label>
            <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Years of Experience</label>
            <input className="form-input" type="number" value={form.yearsOfExperience} onChange={e => setForm({ ...form, yearsOfExperience: e.target.value })} min={0} />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Qualification <span className="optional">(optional)</span></label>
            <input className="form-input" value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })} placeholder="e.g., B.Ed, M.A. Theology" />
          </div>
        </div>
        {user?.role === 'editor' && (
          <div className="alert alert-info mt-3">
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <div>This entry will be submitted for admin approval.</div>
          </div>
        )}
        {user?.role === 'admin' && !editTeacher && (
          <div className="alert alert-info mt-3" style={{ marginTop: 12 }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <div>
              After creating the teacher profile, you can create a <strong>login account</strong> for them using the <strong>"Account"</strong> button in the table.
            </div>
          </div>
        )}
      </Modal>

      {/* Assign class modal */}
      <Modal
        isOpen={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        title={`Assign Class — ${assignTarget?.name}`}
        footer={<button className="btn btn-secondary" onClick={() => setAssignTarget(null)}>Close</button>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(classes || []).length === 0 && (
            <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 20 }}>
              No classes found. Create classes first.
            </div>
          )}
          {(classes || []).map(c => (
            <button key={c._id} onClick={() => assignMutation.mutate({ teacherId: assignTarget._id, classId: c._id })}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', border: `1.5px solid ${c._id === assignTarget?.classAssigned?._id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: 10, background: c._id === assignTarget?.classAssigned?._id ? 'rgba(26,47,94,0.06)' : 'white',
                cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.15s'
              }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  {c.category} · {c.studentCount || 0} students
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {c._id === assignTarget?.classAssigned?._id && (
                  <span className="badge badge-green">Current</span>
                )}
                <span className="badge badge-gray">{c.category}</span>
              </div>
            </button>
          ))}
        </div>
      </Modal>

      {/* Create Account Modal */}
      <TeacherAccountModal
        isOpen={!!accountTarget}
        onClose={() => setAccountTarget(null)}
        teacher={accountTarget}
        onSuccess={({ userID, password }) => {
          createAccountMutation.mutate({ teacher: accountTarget, userID, password });
        }}
      />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        isOpen={!!resetPwTarget}
        onClose={() => setResetPwTarget(null)}
        teacher={resetPwTarget}
        onSuccess={(newPassword) => {
          const userId = resetPwTarget?.user?._id || resetPwTarget?.user;
          if (userId) {
            resetPasswordMutation.mutate({ userId, newPassword });
          } else {
            toast.error('No user account linked to this teacher');
          }
        }}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
        title="Delete Teacher"
        message={`Delete "${deleteTarget?.name}"? This will also remove their class assignment. Their login account (if any) will remain but lose teacher access.`}
        confirmLabel="Delete"
        type="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

// ─── VOLUNTEERS PAGE ───────────────────────────────────────────────
export function VolunteersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'admin';
  const isReadOnly = user?.role === 'viewer';

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editVolunteer, setEditVolunteer] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ name: '', contactNumber: '', email: '', role: '', shift: '', notes: '' });

  const { data: volunteers, isLoading } = useQuery({
    queryKey: ['volunteers', search, filterRole],
    queryFn: () => volunteersAPI.getAll({ search, role: filterRole }),
    select: d => d.data?.data || [],
  });

  // Get unique roles for filter
  const uniqueRoles = [...new Set((volunteers || []).map(v => v.role).filter(Boolean))];

  const createMutation = useMutation({
    mutationFn: volunteersAPI.create,
    onSuccess: (res) => {
      qc.invalidateQueries(['volunteers']);
      toast.success(res.data?.staged ? 'Submitted for approval' : 'Volunteer added');
      setShowForm(false);
      setForm({ name: '', contactNumber: '', email: '', role: '', shift: '', notes: '' });
    },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => volunteersAPI.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['volunteers']); toast.success('Updated'); setEditVolunteer(null); },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: volunteersAPI.delete,
    onSuccess: () => { qc.invalidateQueries(['volunteers']); toast.success('Deleted'); setDeleteTarget(null); },
  });

  const openEdit = v => {
    setEditVolunteer(v);
    setForm({ name: v.name, contactNumber: v.contactNumber, email: v.email || '', role: v.role, shift: v.shift || '', notes: v.notes || '' });
  };

  if (isLoading) return <LoadingPage />;

  const SHIFT_COLORS = { Morning: 'badge-blue', Afternoon: 'badge-yellow', 'Full Day': 'badge-green' };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Volunteers</h1>
          <p className="page-subtitle">{volunteers?.length || 0} volunteers</p>
        </div>
        {!isReadOnly && (
          <button className="btn btn-primary" onClick={() => { setEditVolunteer(null); setForm({ name: '', contactNumber: '', email: '', role: '', shift: '', notes: '' }); setShowForm(true); }}>
            <Plus size={16} /> Add Volunteer
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search volunteers..." />
        {uniqueRoles.length > 0 && (
          <select className="form-select" style={{ width: 160 }} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="">All Roles</option>
            {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        )}
        {(search || filterRole) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterRole(''); }}>
            <X size={14} /> Clear
          </button>
        )}
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Shift</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Status</th>
                {!isReadOnly && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {(volunteers || []).length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState icon={null} title="No volunteers found" description="Add volunteers to get started" />
                  </td>
                </tr>
              ) : (
                (volunteers || []).map(v => (
                  <motion.tr key={v._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{v.name}</div>
                      {v.notes && <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{v.notes}</div>}
                    </td>
                    <td><span className="badge badge-purple">{v.role}</span></td>
                    <td>
                      {v.shift
                        ? <span className={`badge ${SHIFT_COLORS[v.shift] || 'badge-gray'}`}>{v.shift}</span>
                        : '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{v.contactNumber}</td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem' }}>{v.email || '—'}</td>
                    <td>
                      <span className={`badge ${v.isActive ? 'badge-green' : 'badge-gray'}`}>
                        {v.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {!isReadOnly && (
                      <td>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {isAdmin && (
                            <button className="btn btn-secondary btn-icon btn-sm" onClick={() => openEdit(v)}>
                              <Edit2 size={13} />
                            </button>
                          )}
                          {isAdmin && (
                            <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => setDeleteTarget(v)}>
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showForm || !!editVolunteer}
        onClose={() => { setShowForm(false); setEditVolunteer(null); }}
        title={editVolunteer ? 'Edit Volunteer' : 'Add Volunteer'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditVolunteer(null); }}>Cancel</button>
            <button className="btn btn-primary" onClick={() => editVolunteer
              ? updateMutation.mutate({ id: editVolunteer._id, data: form })
              : createMutation.mutate(form)
            }>
              {user?.role === 'editor' ? 'Submit for Approval' : editVolunteer ? 'Save Changes' : 'Create Volunteer'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Name <span className="required">*</span></label>
            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Contact <span className="required">*</span></label>
            <input className="form-input" value={form.contactNumber} onChange={e => setForm({ ...form, contactNumber: e.target.value })} maxLength={10} inputMode="numeric" />
          </div>
          <div className="form-group">
            <label className="form-label">Role <span className="required">*</span></label>
            <input className="form-input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="e.g., Registration, Snacks, Security" />
          </div>
          <div className="form-group">
            <label className="form-label">Shift</label>
            <select className="form-select" value={form.shift} onChange={e => setForm({ ...form, shift: e.target.value })}>
              <option value="">Select shift</option>
              <option>Morning</option><option>Afternoon</option><option>Full Day</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Email <span className="optional">(optional)</span></label>
            <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes <span className="optional">(optional)</span></label>
            <input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Special skills or responsibilities" />
          </div>
        </div>
        {user?.role === 'editor' && (
          <div className="alert alert-info mt-3">
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <div>This entry will be submitted for admin approval.</div>
          </div>
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
        title="Delete Volunteer"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        type="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}