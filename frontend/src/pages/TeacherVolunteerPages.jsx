import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Link } from 'lucide-react';
import { teachersAPI, volunteersAPI, classesAPI, usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Modal, ConfirmDialog, LoadingPage, EmptyState, SearchBar, StatusBadge } from '../components/common';
import toast from 'react-hot-toast';

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
    onSuccess: (res) => { qc.invalidateQueries(['teachers']); toast.success(res.data?.staged ? 'Teacher submitted for approval' : 'Teacher created'); setShowForm(false); setForm({ name:'',contactNumber:'',email:'',yearsOfExperience:'',qualification:'' }); },
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

  const openEdit = (t) => { setEditTeacher(t); setForm({ name: t.name, contactNumber: t.contactNumber, email: t.email || '', yearsOfExperience: t.yearsOfExperience || '', qualification: t.qualification || '' }); };

  if (isLoading) return <LoadingPage />;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Teachers</h1>
          <p className="page-subtitle">{teachers?.length || 0} active teachers</p>
        </div>
        {!isReadOnly && <button className="btn btn-primary" onClick={() => { setEditTeacher(null); setForm({ name:'',contactNumber:'',email:'',yearsOfExperience:'',qualification:'' }); setShowForm(true); }}><Plus size={16} /> Add Teacher</button>}
      </div>

      <div style={{ marginBottom: 16 }}><SearchBar value={search} onChange={setSearch} placeholder="Search teachers..." /></div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>Name</th><th>Contact</th><th>Class</th><th>Experience</th><th>Account</th>{!isReadOnly && <th>Actions</th>}</tr></thead>
            <tbody>
              {(teachers || []).length === 0 ? (
                <tr><td colSpan={6}><EmptyState icon={() => null} title="No teachers found" /></td></tr>
              ) : (teachers || []).map(t => (
                <motion.tr key={t._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td style={{ fontWeight: 600 }}>{t.name}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{t.contactNumber}</td>
                  <td>{t.classAssigned ? <span className="badge badge-blue">{t.classAssigned.name}</span> : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Unassigned</span>}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{t.yearsOfExperience ? `${t.yearsOfExperience} yrs` : '—'}</td>
                  <td>{t.user ? <span className="badge badge-green">Active</span> : <span className="badge badge-gray">No account</span>}</td>
                  {!isReadOnly && (
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {isAdmin && <button className="btn btn-secondary btn-sm" onClick={() => setAssignTarget(t)} title="Assign class"><Link size={14} /></button>}
                        {isAdmin && <button className="btn btn-secondary btn-icon" onClick={() => openEdit(t)}><Edit2 size={14} /></button>}
                        {isAdmin && <button className="btn btn-danger btn-icon" onClick={() => setDeleteTarget(t)}><Trash2 size={14} /></button>}
                      </div>
                    </td>
                  )}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showForm || !!editTeacher} onClose={() => { setShowForm(false); setEditTeacher(null); }} title={editTeacher ? 'Edit Teacher' : 'Add Teacher'}
        footer={<><button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditTeacher(null); }}>Cancel</button><button className="btn btn-primary" onClick={() => editTeacher ? updateMutation.mutate({ id: editTeacher._id, data: form }) : createMutation.mutate(form)}>{user?.role === 'editor' ? 'Submit for Approval' : editTeacher ? 'Save' : 'Create'}</button></>}>
        <div className="form-grid">
          <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div className="form-group"><label className="form-label">Contact Number *</label><input className="form-input" value={form.contactNumber} onChange={e => setForm({...form, contactNumber: e.target.value})} maxLength={10} /></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
          <div className="form-group"><label className="form-label">Years of Experience</label><input className="form-input" type="number" value={form.yearsOfExperience} onChange={e => setForm({...form, yearsOfExperience: e.target.value})} /></div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Qualification</label><input className="form-input" value={form.qualification} onChange={e => setForm({...form, qualification: e.target.value})} /></div>
        </div>
      </Modal>

      {/* Assign class modal */}
      <Modal isOpen={!!assignTarget} onClose={() => setAssignTarget(null)} title={`Assign Class — ${assignTarget?.name}`}
        footer={<><button className="btn btn-secondary" onClick={() => setAssignTarget(null)}>Cancel</button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(classes || []).map(c => (
            <button key={c._id} onClick={() => assignMutation.mutate({ teacherId: assignTarget._id, classId: c._id })}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: `1.5px solid ${c._id === assignTarget?.classAssigned?._id ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 10, background: 'white', cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'border-color 0.2s' }}>
              <span style={{ fontWeight: 600 }}>{c.name}</span>
              <span className="badge badge-gray">{c.category}</span>
            </button>
          ))}
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteMutation.mutate(deleteTarget._id)} title="Delete Teacher" message={`Delete "${deleteTarget?.name}"?`} confirmLabel="Delete" type="danger" loading={deleteMutation.isPending} />
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
  const [showForm, setShowForm] = useState(false);
  const [editVolunteer, setEditVolunteer] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ name: '', contactNumber: '', email: '', role: '', shift: '', notes: '' });

  const { data: volunteers, isLoading } = useQuery({
    queryKey: ['volunteers', search],
    queryFn: () => volunteersAPI.getAll({ search }),
    select: d => d.data?.data || [],
  });

  const createMutation = useMutation({ mutationFn: volunteersAPI.create, onSuccess: (res) => { qc.invalidateQueries(['volunteers']); toast.success(res.data?.staged ? 'Submitted for approval' : 'Volunteer added'); setShowForm(false); setForm({name:'',contactNumber:'',email:'',role:'',shift:'',notes:''}); }, onError: err => toast.error(err.response?.data?.message || 'Failed') });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => volunteersAPI.update(id, data), onSuccess: () => { qc.invalidateQueries(['volunteers']); toast.success('Updated'); setEditVolunteer(null); }, onError: err => toast.error(err.response?.data?.message || 'Failed') });
  const deleteMutation = useMutation({ mutationFn: volunteersAPI.delete, onSuccess: () => { qc.invalidateQueries(['volunteers']); toast.success('Deleted'); setDeleteTarget(null); } });

  const openEdit = v => { setEditVolunteer(v); setForm({ name: v.name, contactNumber: v.contactNumber, email: v.email || '', role: v.role, shift: v.shift || '', notes: v.notes || '' }); };

  if (isLoading) return <LoadingPage />;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div><h1 className="page-title">Volunteers</h1><p className="page-subtitle">{volunteers?.length || 0} volunteers</p></div>
        {!isReadOnly && <button className="btn btn-primary" onClick={() => { setEditVolunteer(null); setForm({name:'',contactNumber:'',email:'',role:'',shift:'',notes:''}); setShowForm(true); }}><Plus size={16} /> Add Volunteer</button>}
      </div>

      <div style={{ marginBottom: 16 }}><SearchBar value={search} onChange={setSearch} placeholder="Search volunteers..." /></div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>Name</th><th>Role</th><th>Shift</th><th>Contact</th><th>Status</th>{!isReadOnly && <th>Actions</th>}</tr></thead>
            <tbody>
              {(volunteers || []).map(v => (
                <motion.tr key={v._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td style={{ fontWeight: 600 }}>{v.name}</td>
                  <td><span className="badge badge-purple">{v.role}</span></td>
                  <td>{v.shift || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{v.contactNumber}</td>
                  <td><StatusBadge status={v.isActive ? 'active' : 'inactive'} /></td>
                  {!isReadOnly && (
                    <td><div style={{ display: 'flex', gap: 6 }}>
                      {isAdmin && <button className="btn btn-secondary btn-icon" onClick={() => openEdit(v)}><Edit2 size={14} /></button>}
                      {isAdmin && <button className="btn btn-danger btn-icon" onClick={() => setDeleteTarget(v)}><Trash2 size={14} /></button>}
                    </div></td>
                  )}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showForm || !!editVolunteer} onClose={() => { setShowForm(false); setEditVolunteer(null); }} title={editVolunteer ? 'Edit Volunteer' : 'Add Volunteer'}
        footer={<><button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditVolunteer(null); }}>Cancel</button><button className="btn btn-primary" onClick={() => editVolunteer ? updateMutation.mutate({ id: editVolunteer._id, data: form }) : createMutation.mutate(form)}>{user?.role === 'editor' ? 'Submit for Approval' : editVolunteer ? 'Save' : 'Create'}</button></>}>
        <div className="form-grid">
          <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div className="form-group"><label className="form-label">Contact *</label><input className="form-input" value={form.contactNumber} onChange={e => setForm({...form, contactNumber: e.target.value})} maxLength={10} /></div>
          <div className="form-group"><label className="form-label">Role *</label><input className="form-input" value={form.role} onChange={e => setForm({...form, role: e.target.value})} placeholder="e.g., Registration, Snacks, Security" /></div>
          <div className="form-group"><label className="form-label">Shift</label><select className="form-select" value={form.shift} onChange={e => setForm({...form, shift: e.target.value})}><option value="">Select shift</option><option>Morning</option><option>Afternoon</option><option>Full Day</option></select></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
          <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteMutation.mutate(deleteTarget._id)} title="Delete Volunteer" message={`Delete "${deleteTarget?.name}"?`} confirmLabel="Delete" type="danger" loading={deleteMutation.isPending} />
    </div>
  );
}
