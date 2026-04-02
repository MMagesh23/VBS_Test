import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, History, Save, Check, X, Clock, AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { attendanceAPI, classesAPI, teachersAPI, volunteersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

// ─── IST Helpers ──────────────────────────────────────────────────
const getTodayIST = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return parts.find(p => p.type === 'year').value + '-' + parts.find(p => p.type === 'month').value + '-' + parts.find(p => p.type === 'day').value;
};

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' });
  } catch { return dateStr; }
};

// ─── Status Badge ──────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    present: { bg: '#dcfce7', color: '#15803d', label: '✓ Present' },
    absent: { bg: '#fee2e2', color: '#b91c1c', label: '✗ Absent' },
    late: { bg: '#fef9c3', color: '#a16207', label: '⏰ Late' },
    leave: { bg: '#ede9fe', color: '#6d28d9', label: '📋 Leave' },
    halfDay: { bg: '#ffedd5', color: '#c2410c', label: '½ Half Day' },
  };
  const s = map[status] || { bg: '#f1f5f9', color: '#475569', label: status || '—' };
  return <span className="badge" style={{ background: s.bg, color: s.color }}>{s.label}</span>;
};

// ─── TEACHER: Mark Attendance ──────────────────────────────────────
function TeacherMarkAttendance() {
  const { user } = useAuth();
  const [date, setDate] = useState(getTodayIST());
  const [records, setRecords] = useState({});
  const qc = useQueryClient();
  const todayIST = getTodayIST();

  const { data: windowData, refetch: refetchWindow } = useQuery({
    queryKey: ['window-status'],
    queryFn: () => attendanceAPI.getWindowStatus().then(r => r.data?.data),
    refetchInterval: 60000,
  });

  const { data: classData, isLoading: loadingClass } = useQuery({
    queryKey: ['my-class-data', user._id],
    queryFn: async () => {
      const { data: tData } = await teachersAPI.getAll();
      const teacher = tData.data?.find(t =>
        t.user?._id?.toString() === user._id?.toString() ||
        t.user?.toString() === user._id?.toString()
      );
      if (!teacher?.classAssigned?._id) return null;
      const { data: clsData } = await classesAPI.getOne(teacher.classAssigned._id);
      return { ...clsData.data, teacherName: teacher.name };
    },
  });

  const { data: existingRecord, isLoading: checkingExisting } = useQuery({
    queryKey: ['attendance-check', date, classData?._id],
    queryFn: () => attendanceAPI.getStudentAttendance({ date, classId: classData._id }).then(r => r.data?.data?.[0]),
    enabled: !!classData?._id,
  });

  const submitMutation = useMutation({
    mutationFn: (data) => attendanceAPI.submitStudentAttendance(data),
    onSuccess: () => { toast.success('Attendance submitted successfully!'); qc.invalidateQueries(['attendance-check']); qc.invalidateQueries(['teacher-attendance-history']); setRecords({}); },
    onError: (err) => toast.error(err.response?.data?.message || 'Submission failed'),
  });

  if (loadingClass) return <div className="loading-center"><div className="spinner" /></div>;
  if (!classData) return (
    <div style={{ textAlign: 'center', padding: 48 }}>
      <AlertCircle size={36} style={{ color: 'var(--color-text-muted)', marginBottom: 12 }} />
      <h3 style={{ color: 'var(--color-text)' }}>No class assigned</h3>
      <p style={{ color: 'var(--color-text-secondary)', marginTop: 6 }}>Contact your administrator to get a class assigned.</p>
    </div>
  );

  const students = classData.students || [];
  const alreadySubmitted = !!existingRecord;
  const isToday = date === todayIST;
  const windowOpen = windowData?.allowed;

  const markAllPresent = () => {
    const all = {};
    students.forEach(s => { all[s._id] = 'present'; });
    setRecords(all);
  };

  const markedCount = Object.keys(records).length;
  const presentCount = Object.values(records).filter(v => v === 'present').length;

  return (
    <div>
      {/* Date + window status bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label className="form-label">Date</label>
          <input className="form-input" type="date" value={date}
            onChange={e => { setDate(e.target.value); setRecords({}); }}
            max={todayIST} style={{ width: 180 }} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingBottom: 1 }}>
          <span className={`badge ${windowOpen ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.78rem', padding: '5px 12px' }}>
            Window {windowOpen ? 'OPEN' : 'CLOSED'} · {windowData?.windowStart}–{windowData?.windowEnd} IST
          </span>
          {windowOpen && windowData?.minutesRemaining > 0 && (
            <span className="badge badge-yellow" style={{ fontSize: '0.78rem', padding: '5px 10px' }}>
              <Clock size={12} /> {windowData.minutesRemaining} min left
            </span>
          )}
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => refetchWindow()} title="Refresh window status">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Already submitted notice */}
      {alreadySubmitted && (
        <div className="alert alert-info mb-3">
          <Check size={15} style={{ flexShrink: 0 }} />
          <div>Attendance already submitted for <strong>{formatDisplayDate(date)}</strong>. Showing submitted records below.</div>
        </div>
      )}

      {/* Not today and no records */}
      {!isToday && !alreadySubmitted && !checkingExisting && (
        <div className="alert alert-warning mb-3">
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <div>No attendance record found for <strong>{formatDisplayDate(date)}</strong>. You can only submit for today within the attendance window.</div>
        </div>
      )}

      {/* Class card */}
      <div className="card">
        <div className="card-header">
          <div>
            <span className="card-title">{classData.name}</span>
            <span style={{ marginLeft: 10, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{students.length} students · {classData.category}</span>
          </div>
          {!alreadySubmitted && isToday && windowOpen && (
            <button className="btn btn-secondary btn-sm" onClick={markAllPresent}>
              <Check size={14} /> Mark All Present
            </button>
          )}
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: 28 }}>S.No</th>
                <th>Student ID</th>
                <th>Name</th>
                <th>Grade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => {
                const existingStatus = existingRecord?.records?.find(
                  r => r.student?._id?.toString() === s._id?.toString() || r.student?.toString() === s._id?.toString()
                )?.status;
                const currentStatus = alreadySubmitted ? existingStatus : records[s._id];

                return (
                  <tr key={s._id}>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>{idx + 1}</td>
                    <td><span className="code">{s.studentId || '—'}</span></td>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                      {['PreKG', 'LKG', 'UKG'].includes(s.grade) ? s.grade : `Std ${s.grade}`}
                    </td>
                    <td>
                      {alreadySubmitted ? (
                        <StatusBadge status={currentStatus} />
                      ) : isToday && windowOpen ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setRecords(r => ({ ...r, [s._id]: 'present' }))}
                            style={{ padding: '4px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem', transition: 'all 0.15s', background: currentStatus === 'present' ? '#16a34a' : 'var(--color-bg)', color: currentStatus === 'present' ? 'white' : 'var(--color-text-secondary)' }}>
                            ✓ Present
                          </button>
                          <button onClick={() => setRecords(r => ({ ...r, [s._id]: 'absent' }))}
                            style={{ padding: '4px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem', transition: 'all 0.15s', background: currentStatus === 'absent' ? '#dc2626' : 'var(--color-bg)', color: currentStatus === 'absent' ? 'white' : 'var(--color-text-secondary)' }}>
                            ✗ Absent
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Submit footer */}
        {!alreadySubmitted && isToday && windowOpen && (
          <div style={{ padding: '14px 18px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'flex', gap: 14 }}>
              <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ {presentCount} Present</span>
              <span style={{ color: '#dc2626', fontWeight: 700 }}>✗ {markedCount - presentCount} Absent</span>
              <span style={{ color: 'var(--color-text-muted)' }}>{students.length - markedCount} unmarked</span>
            </div>
            <button className="btn btn-primary" onClick={() => {
              const recs = students.map(s => ({ studentId: s._id, status: records[s._id] || 'absent' }));
              submitMutation.mutate({ date, classId: classData._id, records: recs });
            }} disabled={submitMutation.isPending}>
              <Save size={15} /> Submit Attendance
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TEACHER: Attendance History ───────────────────────────────────
function TeacherAttendanceHistory() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  const { data: classData } = useQuery({
    queryKey: ['my-class-data', user._id],
    queryFn: async () => {
      const { data: tData } = await teachersAPI.getAll();
      const teacher = tData.data?.find(t =>
        t.user?._id?.toString() === user._id?.toString() ||
        t.user?.toString() === user._id?.toString()
      );
      if (!teacher?.classAssigned?._id) return null;
      const { data: clsData } = await classesAPI.getOne(teacher.classAssigned._id);
      return clsData.data;
    },
  });

  const { data: history, isLoading } = useQuery({
    queryKey: ['teacher-attendance-history', classData?._id, page],
    queryFn: () => attendanceAPI.getStudentAttendance({ classId: classData._id }).then(r => r.data?.data || []),
    enabled: !!classData?._id,
  });

  if (isLoading) return <div className="loading-center"><div className="spinner" /></div>;

  const records = history || [];
  const pageSize = 10;
  const paged = records.slice((page - 1) * pageSize, page * pageSize);
  const pages = Math.ceil(records.length / pageSize);

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
          {records.length} attendance records for {classData?.name}
        </span>
      </div>

      {records.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Clock size={36} style={{ color: 'var(--color-text-muted)', marginBottom: 12 }} />
          <h3 style={{ color: 'var(--color-text)' }}>No attendance records yet</h3>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 6 }}>Records will appear here after you submit attendance.</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Total</th>
                  <th>Rate</th>
                  <th>Submitted By</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((rec, idx) => {
                  const present = rec.records?.filter(r => r.status === 'present').length || 0;
                  const absent = rec.records?.filter(r => r.status === 'absent').length || 0;
                  const total = present + absent;
                  const rate = total > 0 ? Math.round((present / total) * 100) : 0;
                  const dayNum = records.length - ((page - 1) * pageSize) - idx;
                  return (
                    <tr key={rec._id}>
                      <td style={{ fontWeight: 600 }}>{formatDisplayDate(rec.date)}</td>
                      <td><span className="badge badge-navy">Day {records.indexOf(rec) + 1}</span></td>
                      <td><span style={{ color: '#16a34a', fontWeight: 700 }}>{present}</span></td>
                      <td><span style={{ color: '#dc2626', fontWeight: 700 }}>{absent}</span></td>
                      <td>{total}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 48, height: 5, background: 'var(--color-border)', borderRadius: 99 }}>
                            <div style={{ width: `${rate}%`, height: '100%', borderRadius: 99, background: rate >= 80 ? '#16a34a' : rate >= 60 ? '#d97706' : '#dc2626' }} />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{rate}%</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>{rec.submittedByName}</td>
                      <td>
                        {rec.isModified
                          ? <span className="badge badge-orange">Modified</span>
                          : <span className="badge badge-green">Submitted</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="pagination">
              <span className="page-info">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, records.length)} of {records.length}</span>
              <div className="page-btns">
                <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}><ChevronLeft size={14} /></button>
                {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                  <button key={p} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPage(p)} style={{ minWidth: 32, justifyContent: 'center' }}>{p}</button>
                ))}
                <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={page >= pages}><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ADMIN/EDITOR: Teacher + Volunteer Attendance Form ─────────────
function StaffAttendanceForm({ type }) {
  const qc = useQueryClient();
  const [date, setDate] = useState(getTodayIST());
  const [statuses, setStatuses] = useState({});
  const todayIST = getTodayIST();

  const { data: entities } = useQuery({
    queryKey: [type === 'teacher' ? 'teachers-list' : 'volunteers-list'],
    queryFn: () => type === 'teacher'
      ? teachersAPI.getAll({ isActive: true }).then(r => r.data?.data || [])
      : volunteersAPI.getAll({ isActive: true }).then(r => r.data?.data || []),
  });

  const submitMutation = useMutation({
    mutationFn: (data) => type === 'teacher'
      ? attendanceAPI.submitTeacherAttendance(data)
      : attendanceAPI.submitVolunteerAttendance(data),
    onSuccess: () => {
      toast.success(`${type === 'teacher' ? 'Teacher' : 'Volunteer'} attendance submitted`);
      qc.invalidateQueries([`${type}-attendance-records`]);
      setStatuses({});
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const markAllPresent = () => {
    const all = {};
    (entities || []).forEach(e => { all[e._id] = 'present'; });
    setStatuses(all);
  };

  const OPTIONS = type === 'teacher'
    ? [{ val: 'present', label: 'Present', bg: '#16a34a' }, { val: 'absent', label: 'Absent', bg: '#dc2626' }, { val: 'late', label: 'Late', bg: '#d97706' }, { val: 'leave', label: 'Leave', bg: '#7c3aed' }]
    : [{ val: 'present', label: 'Present', bg: '#16a34a' }, { val: 'absent', label: 'Absent', bg: '#dc2626' }, { val: 'halfDay', label: 'Half Day', bg: '#c2410c' }, { val: 'late', label: 'Late', bg: '#d97706' }];

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label className="form-label">Date</label>
          <input className="form-input" type="date" value={date}
            onChange={e => setDate(e.target.value)}
            max={todayIST} style={{ width: 180 }} />
        </div>
        <button className="btn btn-secondary btn-sm" onClick={markAllPresent}><Check size={14} /> Mark All Present</button>
        <button className="btn btn-primary" onClick={() => {
          const recs = (entities || []).filter(e => statuses[e._id]).map(e => ({
            [type === 'teacher' ? 'teacherId' : 'volunteerId']: e._id,
            status: statuses[e._id],
          }));
          if (!recs.length) { toast.error('Mark at least one person before submitting'); return; }
          submitMutation.mutate({ date, records: recs });
        }} disabled={submitMutation.isPending}>
          <Save size={15} /> Submit {type === 'teacher' ? 'Teacher' : 'Volunteer'} Attendance
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>{type === 'teacher' ? 'Class' : 'Role'}</th>
            <th>Mark Status</th>
          </tr>
        </thead>
        <tbody>
          {(entities || []).map(e => (
            <tr key={e._id}>
              <td style={{ fontWeight: 600 }}>{e.name}</td>
              <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem' }}>
                {type === 'teacher' ? (e.classAssigned?.name || 'Unassigned') : e.role}
              </td>
              <td>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {OPTIONS.map(opt => (
                    <button key={opt.val} onClick={() => setStatuses(s => ({ ...s, [e._id]: opt.val }))}
                      style={{ padding: '4px 11px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 600, transition: 'all 0.15s', background: statuses[e._id] === opt.val ? opt.bg : 'var(--color-bg)', color: statuses[e._id] === opt.val ? 'white' : 'var(--color-text-secondary)' }}>
                      {opt.label}
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

// ─── ADMIN: Manage Student Attendance ─────────────────────────────
function AdminManageAttendance() {
  const { user } = useAuth();
  const [dateFilter, setDateFilter] = useState(getTodayIST());
  const [modifyRecord, setModifyRecord] = useState(null);
  const [historyRecord, setHistoryRecord] = useState(null);
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data: records, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-student-attendance', dateFilter],
    queryFn: () => attendanceAPI.getStudentAttendance({ date: dateFilter }).then(r => r.data?.data || []),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => attendanceAPI.deleteStudentAttendance(id),
    onSuccess: () => { toast.success('Record deleted'); qc.invalidateQueries(['admin-student-attendance']); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const pageSize = 20;
  const allRecords = records || [];
  const paged = allRecords.slice((page - 1) * pageSize, page * pageSize);
  const pages = Math.ceil(allRecords.length / pageSize);

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'flex-end' }}>
        <div>
          <label className="form-label">Filter by Date</label>
          <input className="form-input" type="date" value={dateFilter}
            onChange={e => { setDateFilter(e.target.value); setPage(1); }}
            style={{ width: 200 }} />
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => refetch()} style={{ marginBottom: 1 }}>
          <RefreshCw size={14} className={isFetching ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Student Attendance — {formatDisplayDate(dateFilter)}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{allRecords.length} records</span>
          </div>
          {allRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>
              No attendance records for this date
            </div>
          ) : (
            <>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Class</th><th>Category</th><th>Submitted By</th>
                      <th>Present</th><th>Absent</th><th>Rate</th>
                      <th>Status</th><th style={{ width: 100 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map(rec => {
                      const present = rec.records?.filter(r => r.status === 'present').length || 0;
                      const absent = rec.records?.filter(r => r.status === 'absent').length || 0;
                      const total = present + absent;
                      const rate = total > 0 ? Math.round((present / total) * 100) : 0;
                      return (
                        <tr key={rec._id}>
                          <td style={{ fontWeight: 600 }}>{rec.class?.name}</td>
                          <td><span className={`badge cat-${rec.class?.category}`}>{rec.class?.category}</span></td>
                          <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>{rec.submittedByName}</td>
                          <td><span style={{ color: '#16a34a', fontWeight: 700 }}>{present}</span></td>
                          <td><span style={{ color: '#dc2626', fontWeight: 700 }}>{absent}</span></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <div style={{ width: 52, height: 5, background: 'var(--color-border)', borderRadius: 99 }}>
                                <div style={{ width: `${rate}%`, height: '100%', borderRadius: 99, background: rate >= 80 ? '#16a34a' : rate >= 60 ? '#d97706' : '#dc2626' }} />
                              </div>
                              <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{rate}%</span>
                            </div>
                          </td>
                          <td>
                            {rec.isModified
                              ? <span className="badge badge-orange">Modified</span>
                              : <span className="badge badge-green">Submitted</span>}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {user.role === 'admin' && (
                                <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setModifyRecord(rec)} title="Edit"><Edit2 size={13} /></button>
                              )}
                              <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setHistoryRecord(rec)} title="History"><History size={13} /></button>
                              {user.role === 'admin' && (
                                <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-danger)' }}
                                  onClick={() => window.confirm('Delete this attendance record? This cannot be undone.') && deleteMutation.mutate(rec._id)}
                                  title="Delete"><Trash2 size={13} /></button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {pages > 1 && (
                <div className="pagination">
                  <span className="page-info">{allRecords.length} records</span>
                  <div className="page-btns">
                    <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}><ChevronLeft size={14} /></button>
                    {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                      <button key={p} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPage(p)} style={{ minWidth: 32, justifyContent: 'center' }}>{p}</button>
                    ))}
                    <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={page >= pages}><ChevronRight size={14} /></button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Modify Modal */}
      {modifyRecord && <ModifyModal record={modifyRecord} onClose={() => setModifyRecord(null)} />}
      {historyRecord && <HistoryModal record={historyRecord} onClose={() => setHistoryRecord(null)} />}
    </div>
  );
}

// ─── Modify Modal ──────────────────────────────────────────────────
function ModifyModal({ record, onClose }) {
  const qc = useQueryClient();
  const [changes, setChanges] = useState({});
  const [reason, setReason] = useState('');

  const modifyMutation = useMutation({
    mutationFn: (data) => attendanceAPI.modifyStudentAttendance(record._id, data),
    onSuccess: () => { toast.success('Attendance modified — audit trail saved'); qc.invalidateQueries(['admin-student-attendance']); onClose(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Modification failed'),
  });

  const changedCount = Object.keys(changes).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span style={{ fontWeight: 700 }}>Edit Attendance — {record.class?.name} · {formatDisplayDate(record.date)}</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="alert alert-warning mb-3">
            <AlertCircle size={14} />
            <div>Admin modification. All changes logged with timestamp. Originally submitted by <strong>{record.submittedByName}</strong>.</div>
          </div>
          <table style={{ marginBottom: 16 }}>
            <thead><tr><th>ID</th><th>Name</th><th>Current</th><th>Change To</th></tr></thead>
            <tbody>
              {(record.records || []).map(r => {
                const newStatus = changes[r.student?._id];
                return (
                  <tr key={r.student?._id} style={{ background: newStatus ? '#fffbeb' : 'transparent' }}>
                    <td><span className="code" style={{ fontSize: '0.75rem' }}>{r.student?.studentId}</span></td>
                    <td style={{ fontWeight: newStatus ? 700 : 500 }}>{r.student?.name}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {['present', 'absent'].map(s => (
                          <button key={s} onClick={() => {
                            if (s !== r.status) setChanges(c => ({ ...c, [r.student._id]: s }));
                            else { const c = { ...changes }; delete c[r.student._id]; setChanges(c); }
                          }}
                            style={{ padding: '3px 10px', borderRadius: 6, border: `1.5px solid ${changes[r.student?._id] === s ? (s === 'present' ? '#16a34a' : '#dc2626') : 'var(--color-border)'}`, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, background: changes[r.student?._id] === s ? (s === 'present' ? '#16a34a' : '#dc2626') : 'white', color: changes[r.student?._id] === s ? 'white' : 'var(--color-text-secondary)' }}>
                            {s === 'present' ? '✓ Present' : '✗ Absent'}
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
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => modifyMutation.mutate({ changes: Object.entries(changes).map(([studentId, newStatus]) => ({ studentId, newStatus })), reason })} disabled={changedCount === 0 || modifyMutation.isPending}>
            <Save size={15} /> Save {changedCount > 0 ? `${changedCount} Change${changedCount > 1 ? 's' : ''}` : 'Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── History Modal ─────────────────────────────────────────────────
function HistoryModal({ record, onClose }) {
  const history = record.modificationHistory || [];
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span style={{ fontWeight: 700 }}>Modification History</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--color-bg)', borderRadius: 10, fontSize: '0.82rem' }}>
            <strong>Original submission:</strong> {record.submittedByName} — {record.createdAt ? new Date(record.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
          </div>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>No modifications made to this record.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {history.map((mod, i) => (
                <div key={i} style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Modified by {mod.modifiedByName}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {new Date(mod.modifiedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                  {mod.reason && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 8, fontStyle: 'italic' }}>Reason: {mod.reason}</div>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {mod.changes?.map((c, j) => (
                      <div key={j} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600 }}>{c.entityName}</span>
                        <span className={`badge ${c.previousStatus === 'present' ? 'badge-green' : 'badge-red'}`}>{c.previousStatus}</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>→</span>
                        <span className={`badge ${c.newStatus === 'present' ? 'badge-green' : 'badge-red'}`}>{c.newStatus}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ATTENDANCE PAGE ──────────────────────────────────────────
export default function AttendancePage({ initialTab }) {
  const { user } = useAuth();

  // Determine tabs based on role — teachers never see admin tabs
  const tabsByRole = {
    admin: [
      { id: 'manage', label: '📋 Student Attendance' },
      { id: 'teachers', label: '👩‍🏫 Teacher Attendance' },
      { id: 'volunteers', label: '🤝 Volunteer Attendance' },
      { id: 'submit', label: '✏️ Submit (on behalf)' },
    ],
    editor: [
      { id: 'teachers', label: '👩‍🏫 Teacher Attendance' },
      { id: 'volunteers', label: '🤝 Volunteer Attendance' },
    ],
    viewer: [
      { id: 'manage', label: '📋 Student Attendance' },
    ],
    teacher: [
      { id: 'submit', label: '✏️ Mark Attendance' },
      { id: 'history', label: '📅 History' },
    ],
  };

  const tabs = tabsByRole[user.role] || [];
  const defaultTab = initialTab === 'my-attendance' ? 'history' :
                     initialTab === 'submit' ? 'submit' :
                     tabs[0]?.id;
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance Management</h1>
          <p className="page-subtitle">
            {user.role === 'teacher' ? 'Mark and view your class attendance' : 'Track daily attendance for students, teachers, and volunteers'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {tabs.map(tab => (
          <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'submit' && (
        user.role === 'teacher'
          ? <TeacherMarkAttendance />
          : (
            <div className="card">
              <div className="card-body"><TeacherMarkAttendance /></div>
            </div>
          )
      )}
      {activeTab === 'history' && <TeacherAttendanceHistory />}
      {activeTab === 'manage' && <AdminManageAttendance />}
      {activeTab === 'teachers' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Mark Teacher Attendance</span></div>
          <div className="card-body"><StaffAttendanceForm type="teacher" /></div>
        </div>
      )}
      {activeTab === 'volunteers' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Mark Volunteer Attendance</span></div>
          <div className="card-body"><StaffAttendanceForm type="volunteer" /></div>
        </div>
      )}
    </div>
  );
}