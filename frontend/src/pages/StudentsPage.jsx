import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Users, Search, ChevronLeft, ChevronRight, X, AlertCircle } from 'lucide-react';
import { studentsAPI, classesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const GRADES = ['PreKG', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const GRADE_LABELS = { PreKG: 'Pre-KG', LKG: 'LKG', UKG: 'UKG' };
const gradeLabel = (g) => GRADE_LABELS[g] || `Grade ${g}`;

const GRADE_TO_CATEGORY = {
  PreKG: 'Beginner', LKG: 'Beginner', UKG: 'Beginner', '1': 'Beginner', '2': 'Beginner',
  '3': 'Primary', '4': 'Primary', '5': 'Primary',
  '6': 'Junior', '7': 'Junior', '8': 'Junior',
  '9': 'Inter', '10': 'Inter', '11': 'Inter', '12': 'Inter',
};
const RELIGIONS = ['Christian', 'Hindu', 'Muslim', 'Other'];
const DENOMINATIONS = ['Pentecostal', 'CSI', 'RC', 'Other'];
const CATEGORY_COLOR = { Beginner: 'cat-Beginner', Primary: 'cat-Primary', Junior: 'cat-Junior', Inter: 'cat-Inter' };
const GENDER_LABELS = { male: 'Male', female: 'Female', other: 'Other' };

const defaultForm = {
  name: '', gender: '', grade: '',
  religion: 'Christian', christianDenomination: '',
  contactNumber: '', sameAsContact: false, whatsappNumber: '',
  parentName: '', village: '', schoolName: '',
};

function StudentFormModal({ isOpen, onClose, editStudent, classes = [], onSuccess, userRole }) {
  const [form, setForm] = useState(() => editStudent ? {
    name: editStudent.name || '',
    gender: editStudent.gender || '',
    grade: editStudent.grade || '',
    religion: editStudent.religion || 'Christian',
    christianDenomination: editStudent.christianDenomination || '',
    contactNumber: editStudent.contactNumber || '',
    sameAsContact: editStudent.sameAsContact || false,
    whatsappNumber: editStudent.whatsappNumber || '',
    parentName: editStudent.parentName || '',
    village: editStudent.village || '',
    schoolName: editStudent.schoolName || '',
  } : defaultForm);
  const [errors, setErrors] = useState({});

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.gender) errs.gender = 'Gender is required';
    if (!form.grade) errs.grade = 'Grade is required';
    if (form.contactNumber && !/^\d{10}$/.test(form.contactNumber)) errs.contactNumber = 'Must be 10 digits';
    if (!form.sameAsContact && form.whatsappNumber && !/^\d{10}$/.test(form.whatsappNumber)) errs.whatsappNumber = 'Must be 10 digits';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const category = GRADE_TO_CATEGORY[form.grade];

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div className="modal modal-lg" onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.97, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.18 }}>
        <div className="modal-header">
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
            {editStudent ? 'Edit Student' : 'Add New Student'}
          </span>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={18} /></button>
        </div>

        <div className="modal-body">
          {/* Required fields section */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)', marginBottom: 12 }}>
              Required Information
            </div>
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Full Name <span className="required">*</span></label>
                <input className={`form-input ${errors.name ? 'error' : ''}`}
                  value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="Student's full name" />
                {errors.name && <div className="form-error">{errors.name}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Gender <span className="required">*</span></label>
                <div className="radio-group">
                  {['male', 'female', 'other'].map(g => (
                    <label key={g} className={`radio-option ${form.gender === g ? 'selected' : ''}`}>
                      <input type="radio" name="gender" value={g} checked={form.gender === g} onChange={() => set('gender', g)} />
                      {GENDER_LABELS[g]}
                    </label>
                  ))}
                </div>
                {errors.gender && <div className="form-error">{errors.gender}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Grade <span className="required">*</span></label>
                <select className={`form-select ${errors.grade ? 'error' : ''}`}
                  value={form.grade} onChange={e => set('grade', e.target.value)}>
                  <option value="">Select grade</option>
                  {GRADES.map(g => <option key={g} value={g}>{gradeLabel(g)}</option>)}
                </select>
                {form.grade && (
                  <div style={{ marginTop: 5 }}>
                    <span className={`badge ${CATEGORY_COLOR[category]}`}>{category}</span>
                  </div>
                )}
                {errors.grade && <div className="form-error">{errors.grade}</div>}
              </div>
            </div>
          </div>

          <hr className="divider" />

          {/* Religion */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)', marginBottom: 12 }}>
              Religion <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Religion</label>
                <select className="form-select" value={form.religion} onChange={e => set('religion', e.target.value)}>
                  {RELIGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {form.religion === 'Christian' && (
                <div className="form-group">
                  <label className="form-label">Denomination</label>
                  <select className="form-select" value={form.christianDenomination} onChange={e => set('christianDenomination', e.target.value)}>
                    <option value="">Select denomination</option>
                    {DENOMINATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          <hr className="divider" />

          {/* Contact */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)', marginBottom: 12 }}>
              Contact <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Contact Number</label>
                <input className={`form-input ${errors.contactNumber ? 'error' : ''}`}
                  value={form.contactNumber} onChange={e => set('contactNumber', e.target.value)}
                  placeholder="10-digit mobile number" maxLength={10} inputMode="numeric" />
                {errors.contactNumber && <div className="form-error">{errors.contactNumber}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">WhatsApp Number</label>
                {form.contactNumber && (
                  <label className="checkbox-row" style={{ marginBottom: 6 }}>
                    <input type="checkbox" checked={form.sameAsContact}
                      onChange={e => { set('sameAsContact', e.target.checked); if (e.target.checked) set('whatsappNumber', form.contactNumber); }} />
                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                      Same as contact number
                    </label>
                  </label>
                )}
                {!form.sameAsContact && (
                  <>
                    <input className={`form-input ${errors.whatsappNumber ? 'error' : ''}`}
                      value={form.whatsappNumber} onChange={e => set('whatsappNumber', e.target.value)}
                      placeholder="10-digit WhatsApp number" maxLength={10} inputMode="numeric" />
                    {errors.whatsappNumber && <div className="form-error">{errors.whatsappNumber}</div>}
                  </>
                )}
                {form.sameAsContact && (
                  <div className="form-input" style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)', cursor: 'not-allowed' }}>
                    {form.contactNumber || '—'}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Parent / Guardian Name</label>
                <input className="form-input" value={form.parentName} onChange={e => set('parentName', e.target.value)} placeholder="Parent's name" />
              </div>

              <div className="form-group">
                <label className="form-label">Village / Location</label>
                <input className="form-input" value={form.village} onChange={e => set('village', e.target.value)} placeholder="Village or area name" />
              </div>

              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">School Name</label>
                <input className="form-input" value={form.schoolName} onChange={e => set('schoolName', e.target.value)} placeholder="School name (optional)" />
              </div>
            </div>
          </div>

          {/* Class assignment (admin only) */}
          {(userRole === 'admin') && classes.length > 0 && (
            <>
              <hr className="divider" />
              <div className="form-group">
                <label className="form-label">Assign to Class</label>
                <select className="form-select" value={form.classAssigned || ''} onChange={e => set('classAssigned', e.target.value)}>
                  <option value="">No class assigned</option>
                  {classes.filter(c => !form.grade || c.category === GRADE_TO_CATEGORY[form.grade])
                    .map(c => <option key={c._id} value={c._id}>{c.name} ({c.category})</option>)}
                </select>
                {form.grade && category && (
                  <div className="form-hint">Only showing classes compatible with {category} category</div>
                )}
              </div>
            </>
          )}

          {userRole === 'editor' && (
            <div className="alert alert-info mt-3">
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <div>This entry will be submitted for admin approval before being added to the system.</div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => {
            if (validate()) onSuccess(form);
          }}>
            {userRole === 'editor' ? 'Submit for Approval' : editStudent ? 'Save Changes' : 'Create Student'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function StudentsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'admin';
  const isEditor = user?.role === 'editor';
  const isTeacher = user?.role === 'teacher';
  const isReadOnly = user?.role === 'viewer' || isTeacher;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['students', page, search, filterGrade, filterCategory],
    queryFn: () => studentsAPI.getAll({ page, limit: 50, search, grade: filterGrade, category: filterCategory }),
    select: d => d.data,
    keepPreviousData: true,
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
      const msg = res.data?.staged ? 'Student submitted for approval' : `Student created! ID: ${res.data?.data?.studentId}`;
      toast.success(msg);
      setShowForm(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => studentsAPI.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['students']); toast.success('Student updated'); setEditStudent(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => studentsAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries(['students']); toast.success('Student deleted'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => studentsAPI.bulkDelete(ids),
    onSuccess: () => { qc.invalidateQueries(['students']); toast.success(`${selectedIds.length} students deleted`); setSelectedIds([]); },
  });

  const students = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.pages || 1;

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleAll = () => setSelectedIds(selectedIds.length === students.length ? [] : students.map(s => s._id));

  const handleDelete = (s) => {
    if (window.confirm(`Delete "${s.name}"? This cannot be undone.`)) deleteMutation.mutate(s._id);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">{total} students registered</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isAdmin && selectedIds.length > 0 && (
            <button className="btn btn-danger btn-sm" onClick={() => {
              if (window.confirm(`Delete ${selectedIds.length} students?`)) bulkDeleteMutation.mutate(selectedIds);
            }}>
              <Trash2 size={14} /> Delete {selectedIds.length} selected
            </button>
          )}
          {!isReadOnly && (
            <button className="btn btn-primary" onClick={() => { setEditStudent(null); setShowForm(true); }}>
              <Plus size={16} /> Add Student
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16, padding: 14 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-wrap" style={{ flex: 1, minWidth: 220 }}>
            <Search size={15} className="search-icon" />
            <input className="form-input search-input"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, ID, village, contact..." />
          </div>

          {/* Only admin/editor/viewer get grade filter — not teacher (they see only their class) */}
          {!isTeacher && (
            <>
              <select className="form-select" style={{ width: 130 }} value={filterGrade}
                onChange={e => { setFilterGrade(e.target.value); setFilterCategory(''); setPage(1); }}>
                <option value="">All Grades</option>
                {GRADES.map(g => <option key={g} value={g}>{gradeLabel(g)}</option>)}
              </select>
              <select className="form-select" style={{ width: 140 }} value={filterCategory}
                onChange={e => { setFilterCategory(e.target.value); setFilterGrade(''); setPage(1); }}>
                <option value="">All Categories</option>
                {['Beginner', 'Primary', 'Junior', 'Inter'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </>
          )}

          {(search || filterGrade || filterCategory) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterGrade(''); setFilterCategory(''); setPage(1); }}>
              <X size={14} /> Clear
            </button>
          )}
          {isFetching && <div className="spinner spinner-sm" />}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {isLoading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : students.length === 0 ? (
          <div className="empty-state">
            <Users size={36} style={{ color: 'var(--color-text-muted)' }} />
            <h3>No students found</h3>
            <p>{search || filterGrade || filterCategory ? 'Try adjusting your filters' : 'Add students to get started'}</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    {isAdmin && <th><input type="checkbox" checked={selectedIds.length === students.length && students.length > 0} onChange={toggleAll} /></th>}
                    <th>Student ID</th>
                    <th>Name</th>
                    <th>Grade</th>
                    {!isTeacher && <th>Category</th>}
                    <th>Religion</th>
                    <th>Village</th>
                    {!isTeacher && <th>Class</th>}
                    <th>Contact</th>
                    {!isReadOnly && <th style={{ width: 80 }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {students.map(s => (
                      <motion.tr key={s._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} layout>
                        {isAdmin && (
                          <td><input type="checkbox" checked={selectedIds.includes(s._id)} onChange={() => toggleSelect(s._id)} /></td>
                        )}
                        <td>
                          <span className="code">{s.studentId || '—'}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{s.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{s.gender}</div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{gradeLabel(s.grade)}</td>
                        {!isTeacher && (
                          <td><span className={`badge ${CATEGORY_COLOR[s.category]}`}>{s.category}</span></td>
                        )}
                        <td style={{ fontSize: '0.82rem' }}>
                          {s.religion}
                          {s.christianDenomination && <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>{s.christianDenomination}</div>}
                        </td>
                        <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem' }}>{s.village || '—'}</td>
                        {!isTeacher && (
                          <td>
                            {s.classAssigned?.name
                              ? <span className="badge badge-navy">{s.classAssigned.name}</span>
                              : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>Unassigned</span>}
                          </td>
                        )}
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{s.contactNumber || '—'}</td>
                        {!isReadOnly && (
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {isAdmin && (
                                <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setEditStudent(s)} title="Edit">
                                  <Edit2 size={13} />
                                </button>
                              )}
                              {isAdmin && (
                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(s)} title="Delete" style={{ color: 'var(--color-danger)' }}>
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <span className="page-info">
                  Showing {((page - 1) * 50) + 1}–{Math.min(page * 50, total)} of {total}
                </span>
                <div className="page-btns">
                  <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
                    <ChevronLeft size={15} />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                    <button key={p} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setPage(p)} style={{ minWidth: 32, justifyContent: 'center' }}>{p}</button>
                  ))}
                  <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {(showForm || editStudent) && (
          <StudentFormModal
            isOpen={true}
            onClose={() => { setShowForm(false); setEditStudent(null); }}
            editStudent={editStudent}
            classes={classesData || []}
            userRole={user?.role}
            onSuccess={(form) => {
              if (editStudent) updateMutation.mutate({ id: editStudent._id, data: form });
              else createMutation.mutate(form);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}