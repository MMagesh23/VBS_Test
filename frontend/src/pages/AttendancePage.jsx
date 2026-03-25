import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Edit2, Trash2, History, Clock, AlertTriangle, Save } from 'lucide-react';
import { attendanceAPI, classesAPI, teachersAPI, volunteersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Modal, LoadingPage, Alert, StatusBadge } from '../components/common';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// ─── Student Attendance Submission (Teacher View) ─────────────────
function TeacherAttendanceForm() {
  const { user } = useAuth();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [records, setRecords] = useState({});
  const qc = useQueryClient();

  const { data: windowData } = useQuery({
    queryKey: ['window-status'],
    queryFn: () => attendanceAPI.getWindowStatus(),
    refetchInterval: 30000,
    select: d => d.data?.data,
  });

  const { data: myClassData, isLoading } = useQuery({
    queryKey: ['my-class-students'],
    queryFn: async () => {
      const { data: tData } = await teachersAPI.getAll();
      const teacher = tData.data?.find(t => t.user?._id === user._id || t.user === user._id);
      if (!teacher?.classAssigned?._id) return null;
      const classId = teacher.classAssigned._id;
      const { data: classData } = await classesAPI.getOne(classId);
      return classData?.data;
    },
    select: d => d,
  });

  const { data: existingAttendance } = useQuery({
    queryKey: ['attendance-check', date, myClassData?._id],
    queryFn: () => attendanceAPI.getStudentAttendance({ date, classId: myClassData?._id }),
    enabled: !!myClassData?._id,
    select: d => d.data?.data?.[0],
  });

  const submitMutation = useMutation({
    mutationFn: (data) => attendanceAPI.submitStudentAttendance(data),
    onSuccess: () => { toast.success('Attendance submitted!'); qc.invalidateQueries(['attendance-check']); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to submit'),
  });

  const toggleStatus = (studentId, status) => setRecords(prev => ({ ...prev, [studentId]: status }));
  const markAllPresent = () => {
    const allPresent = {};
    myClassData?.students?.forEach(s => { allPresent[s._id] = 'present'; });
    setRecords(allPresent);
  };

  const handleSubmit = () => {
    const students = myClassData?.students || [];
    const recordsArray = students.map(s => ({ studentId: s._id, status: records[s._id] || 'absent' }));
    submitMutation.mutate({ date, classId: myClassData._id, records: recordsArray });
  };

  if (isLoading) return <LoadingPage />;
  if (!myClassData) return <Alert type="warning">No class assigned. Contact admin.</Alert>;

  const alreadySubmitted = !!existingAttendance;

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <label className="form-label">Date</label>
          <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} max={format(new Date(), 'yyyy-MM-dd')} style={{ width: 180 }} />
        </div>
        <div style={{ marginTop: 22 }}>
          <span className={`badge ${windowData?.allowed ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            Window {windowData?.allowed ? 'OPEN' : 'CLOSED'} · {windowData?.windowStart}–{windowData?.windowEnd}
          </span>
        </div>
      </div>

      {alreadySubmitted && <Alert type="warning" style={{ marginBottom: 16 }}>✅ Attendance already submitted for {format(new Date(date), 'MMMM d, yyyy')}.</Alert>}

      <div className="card">
        <div className="card-header">
          <div>
            <span className="card-title">{myClassData.name} — Student Attendance</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginLeft: 12 }}>{myClassData.students?.length} students</span>
          </div>
          {!alreadySubmitted && <button className="btn btn-secondary btn-sm" onClick={markAllPresent}>✓ Mark All Present</button>}
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Student ID</th><th>Name</th><th>Grade</th><th>Status</th></tr></thead>
            <tbody>
              {(myClassData.students || []).map(s => {
                const existing = existingAttendance?.records?.find(r => r.student?._id === s._id || r.student === s._id);
                const status = alreadySubmitted ? existing?.status : (records[s._id] || null);
                return (
                  <tr key={s._id}>
                    <td><code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{s.studentId}</code></td>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>{s.grade}</td>
                    <td>
                      {alreadySubmitted ? (
                        <StatusBadge status={status} />
                      ) : (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => toggleStatus(s._id, 'present')}
                            style={{ padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', background: status === 'present' ? '#10b981' : 'var(--color-bg)', color: status === 'present' ? 'white' : 'var(--color-text-secondary)', transition: 'all 0.15s' }}>
                            ✓ Present
                          </button>
                          <button onClick={() => toggleStatus(s._id, 'absent')}
                            style={{ padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', background: status === 'absent' ? '#ef4444' : 'var(--color-bg)', color: status === 'absent' ? 'white' : 'var(--color-text-secondary)', transition: 'all 0.15s' }}>
                            ✗ Absent
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!alreadySubmitted && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#10b981', fontWeight: 700 }}>✓ {Object.values(records).filter(v => v === 'present').length}</span>
              <span style={{ color: '#ef4444', fontWeight: 700 }}>✗ {Object.values(records).filter(v => v === 'absent').length}</span>
            </div>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={!windowData?.allowed || submitMutation.isPending}>
              <Save size={16} /> Submit Attendance
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Admin Modify Modal ────────────────────────────────────────────
function ModifyAttendanceModal({ record, isOpen, onClose }) {
  const qc = useQueryClient();
  const [changes, setChanges] = useState({});
  const [reason, setReason] = useState('');

  const modifyMutation = useMutation({
    mutationFn: (data) => attendanceAPI.modifyStudentAttendance(record._id, data),
    onSuccess: () => { toast.success('Attendance modified with audit trail saved'); qc.invalidateQueries(['admin-attendance']); onClose(); setChanges({}); setReason(''); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to modify'),
  });

  if (!record) return null;
  const students = record.records || [];
  const changedCount = Object.keys(changes).length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Attendance — ${record.class?.name} · ${format(new Date(record.date), 'MMMM d, yyyy')}`} size="modal-lg"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={() => modifyMutation.mutate({ changes: Object.entries(changes).map(([studentId, newStatus]) => ({ studentId, newStatus })), reason })} disabled={changedCount === 0 || modifyMutation.isPending}>
          <Save size={16} /> Save {changedCount > 0 ? `${changedCount} Change${changedCount > 1 ? 's' : ''}` : 'Changes'}
        </button>
      </>}
    >
      <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fef3c7', borderRadius: 10, fontSize: '0.8rem', color: '#92400e' }}>
        ⚠️ Admin modification. All changes will be logged with timestamp and reason in the audit trail.
        Originally submitted by <strong>{record.submittedByName}</strong> at {format(new Date(record.createdAt), 'h:mm a')}.
      </div>

      <table style={{ marginBottom: 20 }}>
        <thead><tr><th>ID</th><th>Name</th><th>Current Status</th><th>Change To</th></tr></thead>
        <tbody>
          {students.map(r => {
            const newStatus = changes[r.student?._id];
            const isChanged = !!newStatus;
            return (
              <tr key={r.student?._id} style={{ background: isChanged ? '#fffbeb' : 'transparent' }}>
                <td><code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{r.student?.studentId}</code></td>
                <td style={{ fontWeight: isChanged ? 700 : 500 }}>{r.student?.name}</td>
                <td><StatusBadge status={r.status} /></td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['present', 'absent'].map(s => (
                      <button key={s} onClick={() => {
                        if (s === r.status && !newStatus) return;
                        if (newStatus === s) { const c = {...changes}; delete c[r.student._id]; setChanges(c); }
                        else if (s !== r.status) setChanges({...changes, [r.student._id]: s});
                      }}
                        style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                          background: (newStatus || r.status) === s && (newStatus ? newStatus === s : r.status === s) ? (s === 'present' ? '#10b981' : '#ef4444') : 'var(--color-bg)',
                          color: (newStatus || r.status) === s ? 'white' : 'var(--color-text-secondary)',
                          outline: isChanged && newStatus === s ? '2px solid #f59e0b' : 'none' }}>
                        {s === 'present' ? '✓' : '✗'} {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="form-group">
        <label className="form-label">Reason for Modification <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(recommended)</span></label>
        <textarea className="form-textarea" rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g., Parent confirmed child was present but marked absent" />
      </div>
    </Modal>
  );
}

// ─── History Modal ─────────────────────────────────────────────────
function HistoryModal({ record, isOpen, onClose }) {
  if (!record) return null;
  const history = record.modificationHistory || [];
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Modification History" size="modal-lg">
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Original Submission</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
          Submitted by {record.submittedByName} at {format(new Date(record.createdAt), 'MMMM d, yyyy h:mm a')}
        </div>
      </div>
      {history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-secondary)' }}>No modifications made</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {history.map((mod, i) => (
            <div key={i} style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Modified by {mod.modifiedByName}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{format(new Date(mod.modifiedAt), 'MMM d, yyyy h:mm a')}</span>
              </div>
              {mod.reason && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 8 }}>Reason: {mod.reason}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {mod.changes?.map((c, j) => (
                  <div key={j} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600 }}>{c.entityName}</span>
                    <span className={`badge ${c.previousStatus === 'present' ? 'badge-green' : 'badge-red'}`}>{c.previousStatus}</span>
                    <span>→</span>
                    <span className={`badge ${c.newStatus === 'present' ? 'badge-green' : 'badge-red'}`}>{c.newStatus}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────
export default function AttendancePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(user.role === 'teacher' ? 'submit' : 'manage');
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [modifyRecord, setModifyRecord] = useState(null);
  const [historyRecord, setHistoryRecord] = useState(null);
  const qc = useQueryClient();

  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['admin-attendance', dateFilter],
    queryFn: () => attendanceAPI.getStudentAttendance({ date: dateFilter }),
    enabled: activeTab === 'manage',
    select: d => d.data?.data || [],
  });

  const deleteAttendance = useMutation({
    mutationFn: (id) => attendanceAPI.deleteStudentAttendance(id),
    onSuccess: () => { toast.success('Record deleted'); qc.invalidateQueries(['admin-attendance']); },
  });

  const tabs = user.role === 'teacher'
    ? [{ id: 'submit', label: '✏️ Mark Attendance' }]
    : [
        { id: 'manage', label: '📋 Student Attendance' },
        { id: 'teachers', label: '👩‍🏫 Teacher Attendance' },
        { id: 'volunteers', label: '🤝 Volunteer Attendance' },
        { id: 'submit', label: '✏️ Submit (Teacher View)' },
      ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Attendance Management</h1>
        <p className="page-subtitle">Track and manage daily attendance for students, teachers, and volunteers</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--color-bg)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', fontFamily: 'var(--font-sans)', background: activeTab === tab.id ? 'white' : 'transparent', color: activeTab === tab.id ? 'var(--color-text)' : 'var(--color-text-secondary)', boxShadow: activeTab === tab.id ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Submit tab (teachers + admin) */}
      {activeTab === 'submit' && <TeacherAttendanceForm />}

      {/* Admin: Manage student attendance */}
      {activeTab === 'manage' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
            <div>
              <label className="form-label">Filter by Date</label>
              <input className="form-input" type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ width: 200 }} />
            </div>
          </div>

          {isLoading ? <LoadingPage /> : (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Attendance Records — {format(new Date(dateFilter), 'MMMM d, yyyy')}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{attendanceData?.length || 0} records</span>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Class</th><th>Category</th><th>Submitted By</th>
                      <th>Present</th><th>Absent</th><th>Rate</th>
                      <th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(attendanceData || []).length === 0 ? (
                      <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>No attendance records for this date</td></tr>
                    ) : (attendanceData || []).map(rec => {
                      const present = rec.records?.filter(r => r.status === 'present').length || 0;
                      const absent = rec.records?.filter(r => r.status === 'absent').length || 0;
                      const total = present + absent;
                      const rate = total > 0 ? Math.round((present / total) * 100) : 0;
                      return (
                        <tr key={rec._id}>
                          <td style={{ fontWeight: 600 }}>{rec.class?.name}</td>
                          <td>{rec.class?.category}</td>
                          <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>{rec.submittedByName}</td>
                          <td><span style={{ color: '#10b981', fontWeight: 700 }}>{present}</span></td>
                          <td><span style={{ color: '#ef4444', fontWeight: 700 }}>{absent}</span></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 60, height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${rate}%`, height: '100%', background: rate >= 80 ? '#10b981' : rate >= 60 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
                              </div>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{rate}%</span>
                            </div>
                          </td>
                          <td>
                            {rec.isModified
                              ? <span className="badge badge-orange">✓ Modified</span>
                              : <span className="badge badge-green">Submitted</span>}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {user.role === 'admin' && <button className="btn btn-secondary btn-sm" onClick={() => setModifyRecord(rec)} title="Edit attendance"><Edit2 size={14} /></button>}
                              <button className="btn btn-secondary btn-sm" onClick={() => setHistoryRecord(rec)} title="View history"><History size={14} /></button>
                              {user.role === 'admin' && <button className="btn btn-danger btn-sm" onClick={() => deleteAttendance.mutate(rec._id)} title="Delete"><Trash2 size={14} /></button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Teacher/Volunteer attendance tabs would be similar */}
      {(activeTab === 'teachers' || activeTab === 'volunteers') && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">{activeTab === 'teachers' ? '👩‍🏫 Teacher' : '🤝 Volunteer'} Attendance</span>
          </div>
          <div className="card-body">
            <TeacherVolunteerAttendanceForm type={activeTab === 'teachers' ? 'teacher' : 'volunteer'} />
          </div>
        </div>
      )}

      <ModifyAttendanceModal record={modifyRecord} isOpen={!!modifyRecord} onClose={() => setModifyRecord(null)} />
      <HistoryModal record={historyRecord} isOpen={!!historyRecord} onClose={() => setHistoryRecord(null)} />
    </div>
  );
}

// ─── Teacher/Volunteer Attendance Form ────────────────────────────
function TeacherVolunteerAttendanceForm({ type }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [statuses, setStatuses] = useState({});

  const { data: entities } = useQuery({
    queryKey: [type === 'teacher' ? 'teachers' : 'volunteers'],
    queryFn: () => type === 'teacher' ? teachersAPI.getAll({ isActive: true }) : volunteersAPI.getAll({ isActive: true }),
    select: d => d.data?.data || [],
  });

  const submitMutation = useMutation({
    mutationFn: (data) => type === 'teacher'
      ? attendanceAPI.submitTeacherAttendance(data)
      : attendanceAPI.submitVolunteerAttendance(data),
    onSuccess: () => { toast.success(`${type === 'teacher' ? 'Teacher' : 'Volunteer'} attendance submitted`); qc.invalidateQueries([`${type}-attendance`]); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const handleSubmit = () => {
    const records = (entities || []).filter(e => statuses[e._id]).map(e => ({
      [type === 'teacher' ? 'teacherId' : 'volunteerId']: e._id,
      status: statuses[e._id],
    }));
    if (!records.length) { toast.error('Mark at least one person'); return; }
    submitMutation.mutate({ date, records });
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-end' }}>
        <div>
          <label className="form-label">Date</label>
          <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 180 }} />
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => { const all = {}; (entities || []).forEach(e => { all[e._id] = 'present'; }); setStatuses(all); }}>
          ✓ Mark All Present
        </button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitMutation.isPending}>
          <Save size={16} /> Submit
        </button>
      </div>
      <table>
        <thead><tr><th>Name</th><th>{type === 'teacher' ? 'Class' : 'Role'}</th><th>Status</th></tr></thead>
        <tbody>
          {(entities || []).map(e => (
            <tr key={e._id}>
              <td style={{ fontWeight: 600 }}>{e.name}</td>
              <td style={{ color: 'var(--color-text-secondary)' }}>{type === 'teacher' ? (e.classAssigned?.name || 'Unassigned') : e.role}</td>
              <td>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(type === 'teacher' ? ['present','absent','late','leave'] : ['present','absent','halfDay','late']).map(s => (
                    <button key={s} onClick={() => setStatuses({...statuses, [e._id]: s})}
                      style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                        background: statuses[e._id] === s ? (s === 'present' ? '#10b981' : s === 'absent' ? '#ef4444' : '#f59e0b') : 'var(--color-bg)',
                        color: statuses[e._id] === s ? 'white' : 'var(--color-text-secondary)' }}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
