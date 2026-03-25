import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Users, Filter, Download } from 'lucide-react';
import { studentsAPI, classesAPI, settingsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Modal, ConfirmDialog, LoadingPage, EmptyState, SearchBar, Pagination, CategoryBadge, StatusBadge } from '../components/common';
import toast from 'react-hot-toast';

const GRADES = ['PreKG','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12'];
const GRADE_TO_CATEGORY = { PreKG:'Beginner',LKG:'Beginner',UKG:'Beginner','1':'Beginner','2':'Beginner','3':'Primary','4':'Primary','5':'Primary','6':'Junior','7':'Junior','8':'Junior','9':'Inter','10':'Inter','11':'Inter','12':'Inter' };

const defaultForm = { name:'', dateOfBirth:'', gender:'', grade:'', schoolName:'', parentName:'', contactNumber:'', alternateNumber:'', village:'' };

function StudentForm({ form, setForm, classes = [] }) {
  return (
    <div>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Full Name <span className="required">*</span></label>
          <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Student's full name" required />
        </div>
        <div className="form-group">
          <label className="form-label">Date of Birth <span className="required">*</span></label>
          <input className="form-input" type="date" value={form.dateOfBirth} onChange={e => setForm({...form, dateOfBirth: e.target.value})} required />
        </div>
        <div className="form-group">
          <label className="form-label">Gender <span className="required">*</span></label>
          <select className="form-select" value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} required>
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Grade <span className="required">*</span></label>
          <select className="form-select" value={form.grade} onChange={e => setForm({...form, grade: e.target.value})} required>
            <option value="">Select grade</option>
            {GRADES.map(g => <option key={g} value={g}>{g === 'PreKG' ? 'Pre-KG' : g === 'LKG' ? 'LKG' : g === 'UKG' ? 'UKG' : `Grade ${g}`}</option>)}
          </select>
          {form.grade && <p style={{fontSize:'0.75rem',color:'var(--color-text-secondary)',marginTop:4}}>Category: <strong>{GRADE_TO_CATEGORY[form.grade]}</strong></p>}
        </div>
        <div className="form-group">
          <label className="form-label">Parent/Guardian Name <span className="required">*</span></label>
          <input className="form-input" value={form.parentName} onChange={e => setForm({...form, parentName: e.target.value})} placeholder="Parent's name" required />
        </div>
        <div className="form-group">
          <label className="form-label">Contact Number <span className="required">*</span></label>
          <input className="form-input" value={form.contactNumber} onChange={e => setForm({...form, contactNumber: e.target.value})} placeholder="10-digit mobile number" maxLength={10} required />
        </div>
        <div className="form-group">
          <label className="form-label">Village/Location <span className="required">*</span></label>
          <input className="form-input" value={form.village} onChange={e => setForm({...form, village: e.target.value})} placeholder="Village or area" required />
        </div>
        <div className="form-group">
          <label className="form-label">School Name</label>
          <input className="form-input" value={form.schoolName} onChange={e => setForm({...form, schoolName: e.target.value})} placeholder="School name (optional)" />
        </div>
        <div className="form-group">
          <label className="form-label">Alternate Number</label>
          <input className="form-input" value={form.alternateNumber} onChange={e => setForm({...form, alternateNumber: e.target.value})} placeholder="Optional" maxLength={10} />
        </div>
        {classes.length > 0 && (
          <div className="form-group">
            <label className="form-label">Assign to Class</label>
            <select className="form-select" value={form.classAssigned || ''} onChange={e => setForm({...form, classAssigned: e.target.value})}>
              <option value="">No class assigned</option>
              {classes.filter(c => !form.grade || c.category === GRADE_TO_CATEGORY[form.grade]).map(c => (
                <option key={c._id} value={c._id}>{c.name} ({c.category})</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'admin';
  const isReadOnly = user?.role === 'viewer' || user?.role === 'teacher';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ grade: '', category: '', isActive: '' });
  const [showForm, setShowForm] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [form, setForm] = useState(defaultForm);

  const { data, isLoading } = useQuery({
    queryKey: ['students', page, search, filters],
    queryFn: () => studentsAPI.getAll({ page, limit: 50, search, ...filters }),
    select: d => d.data,
  });

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesAPI.getAll(),
    select: d => d.data?.data || [],
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: (data) => studentsAPI.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries(['students']);
      toast.success(res.data?.staged ? 'Student submitted for approval' : `Student created! ID: ${res.data?.data?.studentId}`);
      setShowForm(false);
      setForm(defaultForm);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create student'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => studentsAPI.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['students']); toast.success('Student updated'); setEditStudent(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => studentsAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries(['students']); toast.success('Student deleted'); setDeleteTarget(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => studentsAPI.bulkDelete(ids),
    onSuccess: () => { qc.invalidateQueries(['students']); toast.success(`${selectedIds.length} students deleted`); setSelectedIds([]); },
  });

  const students = data?.data || [];
  const totalPages = data?.pages || 1;
  const total = data?.total || 0;

  const handleSubmit = () => {
    if (editStudent) updateMutation.mutate({ id: editStudent._id, data: form });
    else createMutation.mutate(form);
  };

  const openEdit = (s) => { setEditStudent(s); setForm({ name: s.name, dateOfBirth: s.dateOfBirth?.split('T')[0] || '', gender: s.gender, grade: s.grade, schoolName: s.schoolName || '', parentName: s.parentName, contactNumber: s.contactNumber, alternateNumber: s.alternateNumber || '', village: s.village, classAssigned: s.classAssigned?._id || '' }); };

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleAll = () => setSelectedIds(selectedIds.length === students.length ? [] : students.map(s => s._id));

  if (isLoading) return <LoadingPage />;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">{total} students registered</p>
        </div>
        {!isReadOnly && (
          <button className="btn btn-primary" onClick={() => { setEditStudent(null); setForm(defaultForm); setShowForm(true); }}>
            <Plus size={16} /> Add Student
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name, ID, village..." width={300} />
          <select className="form-select" style={{ width: 140 }} value={filters.grade} onChange={e => setFilters({...filters, grade: e.target.value})}>
            <option value="">All Grades</option>
            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select className="form-select" style={{ width: 140 }} value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})}>
            <option value="">All Categories</option>
            {['Beginner','Primary','Junior','Inter'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {isAdmin && selectedIds.length > 0 && (
            <button className="btn btn-danger btn-sm" onClick={() => bulkDeleteMutation.mutate(selectedIds)}>
              <Trash2 size={14} /> Delete {selectedIds.length} selected
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                {isAdmin && <th><input type="checkbox" checked={selectedIds.length === students.length && students.length > 0} onChange={toggleAll} /></th>}
                <th>Student ID</th>
                <th>Name</th>
                <th>Grade</th>
                <th>Category</th>
                <th>Village</th>
                <th>Class</th>
                <th>Parent</th>
                <th>Contact</th>
                {!isReadOnly && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 0 }}>
                  <EmptyState icon={Users} title="No students found" description="Add students to get started" />
                </td></tr>
              ) : students.map(s => (
                <motion.tr key={s._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {isAdmin && <td><input type="checkbox" checked={selectedIds.includes(s._id)} onChange={() => toggleSelect(s._id)} /></td>}
                  <td><code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', background: 'var(--color-bg)', padding: '2px 8px', borderRadius: 6 }}>{s.studentId || '—'}</code></td>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>{s.grade}</td>
                  <td><CategoryBadge category={s.category} /></td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{s.village}</td>
                  <td>{s.classAssigned?.name ? <span className="badge badge-blue">{s.classAssigned.name}</span> : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Unassigned</span>}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{s.parentName}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{s.contactNumber}</td>
                  {!isReadOnly && (
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {isAdmin && <button className="btn btn-secondary btn-icon" onClick={() => openEdit(s)}><Edit2 size={14} /></button>}
                        {isAdmin && <button className="btn btn-danger btn-icon" onClick={() => setDeleteTarget(s)}><Trash2 size={14} /></button>}
                      </div>
                    </td>
                  )}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pages={totalPages} total={total} limit={50} onPageChange={setPage} />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showForm || !!editStudent}
        onClose={() => { setShowForm(false); setEditStudent(null); }}
        title={editStudent ? 'Edit Student' : 'Add New Student'}
        size="modal-lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditStudent(null); }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {user?.role === 'editor' ? 'Submit for Approval' : editStudent ? 'Save Changes' : 'Create Student'}
            </button>
          </>
        }
      >
        <StudentForm form={form} setForm={setForm} classes={classesData || []} />
        {user?.role === 'editor' && (
          <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 10, padding: 12, marginTop: 16, fontSize: '0.8rem', color: '#92400e' }}>
            ℹ️ As an editor, this entry will be submitted for admin approval before being added to the system.
          </div>
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
        title="Delete Student"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        type="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
