import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Edit2, Trash2, History, Save, Check, X, Clock, AlertCircle,
  RefreshCw, ChevronLeft, ChevronRight, Users, GraduationCap,
  Heart, Calendar, CheckSquare, AlertTriangle, Info, BarChart2
} from 'lucide-react';
import { attendanceAPI, classesAPI, teachersAPI, volunteersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────────────
const getTodayIST = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  return `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}`;
};

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', weekday: 'short'
    });
  } catch { return dateStr; }
};

// ─── Status Badge ──────────────────────────────────────────────────
const STATUS_MAP = {
  present: { bg: '#dcfce7', color: '#15803d', label: '✓ Present' },
  absent: { bg: '#fee2e2', color: '#b91c1c', label: '✗ Absent' },
  late: { bg: '#fef9c3', color: '#a16207', label: '⏰ Late' },
  leave: { bg: '#ede9fe', color: '#6d28d9', label: '📋 Leave' },
  halfDay: { bg: '#ffedd5', color: '#c2410c', label: '½ Half Day' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_MAP[status] || { bg: '#f1f5f9', color: '#475569', label: status || '—' };
  return <span className="badge" style={{ background: s.bg, color: s.color }}>{s.label}</span>;
};

// ─── Attendance Rate Bar ───────────────────────────────────────────
const RateBar = ({ rate }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <div style={{ width: 56, height: 5, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{ width: `${rate}%`, height: '100%', borderRadius: 99, background: rate >= 80 ? '#16a34a' : rate >= 60 ? '#d97706' : '#dc2626', transition: 'width 0.4s' }} />
    </div>
    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: rate >= 80 ? '#15803d' : rate >= 60 ? '#a16207' : '#b91c1c' }}>{rate}%</span>
  </div>
);

// ─── Window Status Banner ──────────────────────────────────────────
function WindowBanner({ showForTeacher }) {
  const { data: windowData, refetch } = useQuery({
    queryKey: ['window-status'],
    queryFn: () => attendanceAPI.getWindowStatus().then(r => r.data?.data),
    refetchInterval: 60000,
  });

  if (!showForTeacher && !windowData) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
      borderRadius: 10, marginBottom: 16, flexWrap: 'wrap',
      background: windowData?.allowed ? '#f0fdf4' : '#fef2f2',
      border: `1px solid ${windowData?.allowed ? '#bbf7d0' : '#fecaca'}`
    }}>
      <span style={{
        padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 800,
        letterSpacing: '0.05em', textTransform: 'uppercase',
        background: windowData?.allowed ? '#16a34a' : '#dc2626', color: 'white'
      }}>
        {windowData?.allowed ? 'Window OPEN' : 'Window CLOSED'}
      </span>
      <span style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', flex: 1 }}>
        {windowData?.message || 'Loading...'}
      </span>
      {windowData?.allowed && windowData?.minutesRemaining > 0 && (
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '3px 10px', borderRadius: 99 }}>
          <Clock size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
          {windowData.minutesRemaining} min remaining
        </span>
      )}
      <button onClick={() => refetch()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}>
        <RefreshCw size={14} />
      </button>
    </div>
  );
}

// ─── TEACHER: Mark Student Attendance ─────────────────────────────
function TeacherMarkAttendance() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [date, setDate] = useState(getTodayIST());
  const [records, setRecords] = useState({});
  const todayIST = getTodayIST();

  const { data: windowData } = useQuery({
    queryKey: ['window-status'],
    queryFn: () => attendanceAPI.getWindowStatus().then(r => r.data?.data),
    refetchInterval: 60000,
  });

  const { data: classData, isLoading: loadingClass, error: classError } = useQuery({
    queryKey: ['my-class-full', user._id],
    queryFn: async () => {
      const { data: tData } = await teachersAPI.getAll();
      const teacher = tData.data?.find(t =>
        t.user?._id?.toString() === user._id?.toString() ||
        t.user?.toString() === user._id?.toString()
      );
      if (!teacher?.classAssigned?._id && !teacher?.classAssigned) return null;
      const classId = teacher.classAssigned?._id || teacher.classAssigned;
      const { data: clsData } = await classesAPI.getOne(classId);
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
    onSuccess: () => {
      toast.success('Attendance submitted successfully!');
      qc.invalidateQueries(['attendance-check']);
      qc.invalidateQueries(['teacher-history']);
      setRecords({});
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Submission failed'),
  });

  if (loadingClass) return <div className="loading-center"><div className="spinner" /></div>;

  if (!classData) return (
    <div style={{ textAlign: 'center', padding: 56, maxWidth: 420, margin: '0 auto' }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Users size={32} color="var(--color-text-muted)" />
      </div>
      <h3 style={{ fontWeight: 700, marginBottom: 8 }}>No Class Assigned</h3>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
        Contact your administrator to get a class assigned to your account.
      </p>
    </div>
  );

  const students = classData.students || [];
  const alreadySubmitted = !!existingRecord;
  const isToday = date === todayIST;
  const windowOpen = windowData?.allowed;
  const canSubmit = isToday && windowOpen && !alreadySubmitted;

  const markedCount = Object.keys(records).length;
  const presentCount = Object.values(records).filter(v => v === 'present').length;
  const unmarked = students.length - markedCount;

  const markAll = (status) => {
    const all = {};
    students.forEach(s => { all[s._id] = status; });
    setRecords(all);
  };

  const handleSubmit = () => {
    const recs = students.map(s => ({ studentId: s._id, status: records[s._id] || 'absent' }));
    submitMutation.mutate({ date, classId: classData._id, records: recs });
  };

  return (
    <div>
      <WindowBanner showForTeacher />

      {/* Date selector + class info */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label className="form-label">Attendance Date</label>
          <input className="form-input" type="date" value={date}
            onChange={e => { setDate(e.target.value); setRecords({}); }}
            max={todayIST} style={{ width: 200 }} />
        </div>
        <div style={{ flex: 1, padding: '8px 14px', background: 'var(--color-bg)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Class</div>
          <div style={{ fontWeight: 700, marginTop: 2 }}>{classData.name} <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)', fontSize: '0.82rem' }}>· {classData.category} · {students.length} students</span></div>
        </div>
      </div>

      {/* Status messages */}
      {alreadySubmitted && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          <Check size={15} style={{ flexShrink: 0 }} />
          <div>Attendance already submitted for <strong>{formatDisplayDate(date)}</strong>. View the submitted records below.</div>
        </div>
      )}

      {!isToday && !alreadySubmitted && !checkingExisting && (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <div>No record found for <strong>{formatDisplayDate(date)}</strong>. You can only submit attendance for today within the open window.</div>
        </div>
      )}

      {isToday && !windowOpen && !alreadySubmitted && (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          <Clock size={15} style={{ flexShrink: 0 }} />
          <div>The attendance window is currently <strong>closed</strong>. Contact admin if you need to submit attendance outside the window.</div>
        </div>
      )}

      {/* Action bar */}
      {canSubmit && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => markAll('present')}>
            <Check size={14} /> Mark All Present
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => markAll('absent')}>
            <X size={14} /> Mark All Absent
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setRecords({})}>
            <RefreshCw size={14} /> Clear
          </button>
        </div>
      )}

      {/* Attendance table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">{classData.name} — {formatDisplayDate(date)}</span>
          {canSubmit && (
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'flex', gap: 14 }}>
              <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ {presentCount}</span>
              <span style={{ color: '#dc2626', fontWeight: 700 }}>✗ {markedCount - presentCount}</span>
              {unmarked > 0 && <span style={{ color: 'var(--color-text-muted)' }}>{unmarked} unmarked</span>}
            </div>
          )}
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}>S.No</th>
                <th>Student ID</th>
                <th>Name</th>
                <th>Grade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => {
                const submittedStatus = existingRecord?.records?.find(
                  r => r.student?._id?.toString() === s._id?.toString() || r.student?.toString() === s._id?.toString()
                )?.status;
                const currentStatus = alreadySubmitted ? submittedStatus : records[s._id];

                return (
                  <tr key={s._id} style={{ background: canSubmit && records[s._id] ? 'rgba(26,47,94,0.02)' : undefined }}>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>{idx + 1}</td>
                    <td><span className="code">{s.studentId || '—'}</span></td>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                      {['PreKG', 'LKG', 'UKG'].includes(s.grade) ? s.grade : `Std ${s.grade}`}
                    </td>
                    <td>
                      {alreadySubmitted ? (
                        <StatusBadge status={currentStatus} />
                      ) : canSubmit ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          {['present', 'absent'].map(st => (
                            <button key={st} onClick={() => setRecords(r => ({ ...r, [s._id]: st }))}
                              style={{
                                padding: '4px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                                fontWeight: 600, fontSize: '0.78rem', transition: 'all 0.12s',
                                background: currentStatus === st
                                  ? (st === 'present' ? '#16a34a' : '#dc2626')
                                  : 'var(--color-bg)',
                                color: currentStatus === st ? 'white' : 'var(--color-text-secondary)',
                              }}>
                              {st === 'present' ? '✓ Present' : '✗ Absent'}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                          {isToday ? 'Window closed' : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {canSubmit && (
          <div style={{ padding: '14px 18px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
              {unmarked > 0
                ? <span style={{ color: 'var(--color-warning)' }}>⚠️ {unmarked} student(s) not marked — will default to Absent</span>
                : <span style={{ color: 'var(--color-success)' }}>✓ All {students.length} students marked</span>
              }
            </div>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? <><div className="spinner spinner-sm" /> Submitting...</> : <><Save size={15} /> Submit Attendance</>}
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
  const pageSize = 10;

  const { data: classData } = useQuery({
    queryKey: ['my-class-full', user._id],
    queryFn: async () => {
      const { data: tData } = await teachersAPI.getAll();
      const teacher = tData.data?.find(t =>
        t.user?._id?.toString() === user._id?.toString() ||
        t.user?.toString() === user._id?.toString()
      );
      if (!teacher?.classAssigned?._id && !teacher?.classAssigned) return null;
      const classId = teacher.classAssigned?._id || teacher.classAssigned;
      const { data: clsData } = await classesAPI.getOne(classId);
      return clsData.data;
    },
  });

  const { data: history, isLoading } = useQuery({
    queryKey: ['teacher-history', classData?._id],
    queryFn: () => attendanceAPI.getStudentAttendance({ classId: classData._id }).then(r => r.data?.data || []),
    enabled: !!classData?._id,
  });

  if (isLoading) return <div className="loading-center"><div className="spinner" /></div>;

  const records = history || [];
  const paged = records.slice((page - 1) * pageSize, page * pageSize);
  const pages = Math.ceil(records.length / pageSize);

  if (records.length === 0) return (
    <div className="card" style={{ textAlign: 'center', padding: 48 }}>
      <Calendar size={36} style={{ color: 'var(--color-text-muted)', marginBottom: 12 }} />
      <h3>No attendance records yet</h3>
      <p style={{ color: 'var(--color-text-secondary)', marginTop: 6 }}>Records will appear after you submit attendance.</p>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 14, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
        {records.length} records for {classData?.name}
      </div>
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>Date</th>
                <th style={{ textAlign: 'center' }}>Present</th>
                <th style={{ textAlign: 'center' }}>Absent</th>
                <th style={{ textAlign: 'center' }}>Total</th>
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
                const globalIdx = (page - 1) * pageSize + idx;
                return (
                  <tr key={rec._id}>
                    <td><span className="badge badge-navy">Day {globalIdx + 1}</span></td>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatDisplayDate(rec.date)}</td>
                    <td style={{ textAlign: 'center' }}><span style={{ color: '#16a34a', fontWeight: 700 }}>{present}</span></td>
                    <td style={{ textAlign: 'center' }}><span style={{ color: '#dc2626', fontWeight: 700 }}>{absent}</span></td>
                    <td style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>{total}</td>
                    <td><RateBar rate={rate} /></td>
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
            <span className="page-info">{records.length} total records</span>
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
    </div>
  );
}

// ─── ADMIN/EDITOR: Staff Attendance (Teacher/Volunteer) ────────────
function StaffAttendancePanel({ type }) {
  const qc = useQueryClient();
  const [date, setDate] = useState(getTodayIST());
  const [statuses, setStatuses] = useState({});
  const [times, setTimes] = useState({});
  const [remarks, setRemarks] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const todayIST = getTodayIST();

  const isTeacher = type === 'teacher';
  const { data: entities, isLoading } = useQuery({
    queryKey: [`${type}s-list`],
    queryFn: () => isTeacher
      ? teachersAPI.getAll({ isActive: true }).then(r => r.data?.data || [])
      : volunteersAPI.getAll({ isActive: true }).then(r => r.data?.data || []),
  });

  // Load existing records for selected date
  const { data: existingRecords } = useQuery({
    queryKey: [`${type}-attendance-date`, date],
    queryFn: () => isTeacher
      ? attendanceAPI.getTeacherAttendance({ date }).then(r => r.data?.data || [])
      : attendanceAPI.getVolunteerAttendance({ date }).then(r => r.data?.data || []),
    select: data => {
      const map = {};
      data.forEach(rec => {
        const id = isTeacher ? rec.teacher?._id?.toString() || rec.teacher?.toString() : rec.volunteer?._id?.toString() || rec.volunteer?.toString();
        if (id) map[id] = rec;
      });
      return map;
    }
  });

  // Prefill statuses from existing records
  useEffect(() => {
    if (existingRecords) {
      const newStatuses = {};
      Object.entries(existingRecords).forEach(([id, rec]) => {
        newStatuses[id] = rec.status;
      });
      setStatuses(newStatuses);
    } else {
      setStatuses({});
    }
  }, [existingRecords, date]);

  const submitMutation = useMutation({
    mutationFn: (data) => isTeacher
      ? attendanceAPI.submitTeacherAttendance(data)
      : attendanceAPI.submitVolunteerAttendance(data),
    onSuccess: (res) => {
      qc.invalidateQueries([`${type}-attendance-date`]);
      const { created, updated } = res.data?.data || {};
      toast.success(`${(created?.length || 0) + (updated?.length || 0)} records saved`);
      setSubmitting(false);
    },
    onError: (err) => { toast.error(err.response?.data?.message || 'Failed'); setSubmitting(false); },
  });

  const markAll = (status) => {
    const all = {};
    (entities || []).forEach(e => { all[e._id] = status; });
    setStatuses(all);
  };

  const TEACHER_OPTIONS = [
    { val: 'present', label: 'Present', color: '#16a34a', bg: '#dcfce7' },
    { val: 'absent', label: 'Absent', color: '#dc2626', bg: '#fee2e2' },
    { val: 'late', label: 'Late', color: '#d97706', bg: '#fef9c3' },
    { val: 'leave', label: 'Leave', color: '#7c3aed', bg: '#ede9fe' },
  ];

  const VOLUNTEER_OPTIONS = [
    { val: 'present', label: 'Present', color: '#16a34a', bg: '#dcfce7' },
    { val: 'absent', label: 'Absent', color: '#dc2626', bg: '#fee2e2' },
    { val: 'halfDay', label: 'Half Day', color: '#c2410c', bg: '#ffedd5' },
    { val: 'late', label: 'Late', color: '#d97706', bg: '#fef9c3' },
  ];
  const OPTIONS = isTeacher ? TEACHER_OPTIONS : VOLUNTEER_OPTIONS;

  const handleSubmit = () => {
    const recs = (entities || [])
      .filter(e => statuses[e._id])
      .map(e => ({
        [isTeacher ? 'teacherId' : 'volunteerId']: e._id,
        status: statuses[e._id],
        ...(isTeacher && times[e._id]?.arrival ? { arrivalTime: times[e._id].arrival } : {}),
        ...(isTeacher && times[e._id]?.departure ? { departureTime: times[e._id].departure } : {}),
        ...(!isTeacher && times[e._id]?.checkIn ? { checkInTime: times[e._id].checkIn } : {}),
        ...(!isTeacher && times[e._id]?.checkOut ? { checkOutTime: times[e._id].checkOut } : {}),
        ...(remarks[e._id] ? { remarks: remarks[e._id] } : {}),
      }));

    if (!recs.length) { toast.error('Mark at least one person before submitting'); return; }
    setSubmitting(true);
    submitMutation.mutate({ date, records: recs });
  };

  if (isLoading) return <div className="loading-center"><div className="spinner" /></div>;

  const entityList = entities || [];
  const markedCount = Object.keys(statuses).length;
  const presentCount = Object.values(statuses).filter(s => ['present', 'halfDay'].includes(s)).length;

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label className="form-label">Date</label>
          <input className="form-input" type="date" value={date}
            onChange={e => setDate(e.target.value)} max={todayIST} style={{ width: 200 }} />
        </div>
        <div style={{ display: 'flex', gap: 8, paddingBottom: 1 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => markAll('present')}>
            <Check size={14} /> All Present
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setStatuses({})}>
            <RefreshCw size={14} /> Clear
          </button>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={submitMutation.isPending} style={{ marginLeft: 'auto', marginBottom: 1 }}>
          {submitMutation.isPending ? <><div className="spinner spinner-sm" /> Saving...</> : <><Save size={14} /> Save Attendance</>}
        </button>
      </div>

      {/* Summary */}
      {markedCount > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <span className="badge badge-green">{presentCount} Present/Half Day</span>
          <span className="badge badge-red">{Object.values(statuses).filter(s => s === 'absent').length} Absent</span>
          <span className="badge badge-gray">{entityList.length - markedCount} Unmarked</span>
        </div>
      )}

      {/* Attendance grid */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>{isTeacher ? 'Class' : 'Role'}</th>
                {!isTeacher && <th>Shift</th>}
                <th>Mark Status</th>
                {isTeacher && <th>Arrival</th>}
                {isTeacher && <th>Departure</th>}
                {!isTeacher && <th>Check-in</th>}
                {!isTeacher && <th>Check-out</th>}
                <th>Remarks</th>
                <th>Current</th>
              </tr>
            </thead>
            <tbody>
              {entityList.map(e => {
                const existing = existingRecords?.[e._id];
                const currentStatus = statuses[e._id];

                return (
                  <tr key={e._id} style={{ background: currentStatus ? 'rgba(26,47,94,0.015)' : undefined }}>
                    <td style={{ fontWeight: 600 }}>{e.name}</td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem' }}>
                      {isTeacher ? (e.classAssigned?.name || 'Unassigned') : e.role}
                    </td>
                    {!isTeacher && (
                      <td style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{e.shift || '—'}</td>
                    )}
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {OPTIONS.map(opt => (
                          <button key={opt.val} onClick={() => setStatuses(s => ({ ...s, [e._id]: opt.val }))}
                            style={{
                              padding: '3px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
                              fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.12s',
                              background: currentStatus === opt.val ? opt.color : 'var(--color-bg)',
                              color: currentStatus === opt.val ? 'white' : 'var(--color-text-secondary)',
                            }}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </td>
                    {isTeacher && (
                      <>
                        <td>
                          <input type="time" value={times[e._id]?.arrival || ''}
                            onChange={e2 => setTimes(t => ({ ...t, [e._id]: { ...t[e._id], arrival: e2.target.value } }))}
                            style={{ border: '1.5px solid var(--color-border)', borderRadius: 7, padding: '4px 8px', fontSize: '0.78rem', fontFamily: 'var(--font-sans)', width: 100 }} />
                        </td>
                        <td>
                          <input type="time" value={times[e._id]?.departure || ''}
                            onChange={e2 => setTimes(t => ({ ...t, [e._id]: { ...t[e._id], departure: e2.target.value } }))}
                            style={{ border: '1.5px solid var(--color-border)', borderRadius: 7, padding: '4px 8px', fontSize: '0.78rem', fontFamily: 'var(--font-sans)', width: 100 }} />
                        </td>
                      </>
                    )}
                    {!isTeacher && (
                      <>
                        <td>
                          <input type="time" value={times[e._id]?.checkIn || ''}
                            onChange={e2 => setTimes(t => ({ ...t, [e._id]: { ...t[e._id], checkIn: e2.target.value } }))}
                            style={{ border: '1.5px solid var(--color-border)', borderRadius: 7, padding: '4px 8px', fontSize: '0.78rem', fontFamily: 'var(--font-sans)', width: 100 }} />
                        </td>
                        <td>
                          <input type="time" value={times[e._id]?.checkOut || ''}
                            onChange={e2 => setTimes(t => ({ ...t, [e._id]: { ...t[e._id], checkOut: e2.target.value } }))}
                            style={{ border: '1.5px solid var(--color-border)', borderRadius: 7, padding: '4px 8px', fontSize: '0.78rem', fontFamily: 'var(--font-sans)', width: 100 }} />
                        </td>
                      </>
                    )}
                    <td>
                      <input value={remarks[e._id] || ''} placeholder="Optional..."
                        onChange={e2 => setRemarks(r => ({ ...r, [e._id]: e2.target.value }))}
                        style={{ border: '1.5px solid var(--color-border)', borderRadius: 7, padding: '4px 8px', fontSize: '0.78rem', fontFamily: 'var(--font-sans)', width: 120 }} />
                    </td>
                    <td>
                      {existing ? <StatusBadge status={existing.status} /> : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Not marked</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitMutation.isPending}>
            {submitMutation.isPending ? <><div className="spinner spinner-sm" /> Saving...</> : <><Save size={15} /> Save {isTeacher ? 'Teacher' : 'Volunteer'} Attendance</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN: Manage & Modify Student Attendance ─────────────────────
function AdminStudentAttendance() {
  const { user } = useAuth();
  const [dateFilter, setDateFilter] = useState(getTodayIST());
  const [modifyRecord, setModifyRecord] = useState(null);
  const [historyRecord, setHistoryRecord] = useState(null);
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data: records, isLoading, isFetching, refetch } = useQuery({
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

  const totalPresent = allRecords.reduce((sum, r) => sum + (r.records?.filter(x => x.status === 'present').length || 0), 0);
  const totalAbsent = allRecords.reduce((sum, r) => sum + (r.records?.filter(x => x.status === 'absent').length || 0), 0);
  const overallRate = (totalPresent + totalAbsent) > 0 ? Math.round((totalPresent / (totalPresent + totalAbsent)) * 100) : 0;

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label className="form-label">Date</label>
          <input className="form-input" type="date" value={dateFilter}
            onChange={e => { setDateFilter(e.target.value); setPage(1); }} style={{ width: 200 }} />
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => refetch()}>
          <RefreshCw size={14} className={isFetching ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Summary */}
      {allRecords.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Classes', value: allRecords.length, color: '#3b82f6' },
            { label: 'Present', value: totalPresent, color: '#16a34a' },
            { label: 'Absent', value: totalAbsent, color: '#dc2626' },
            { label: 'Rate', value: `${overallRate}%`, color: overallRate >= 80 ? '#16a34a' : overallRate >= 60 ? '#d97706' : '#dc2626' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ padding: '12px 18px', flex: '0 0 auto' }}>
              <div className="stat-label">{s.label}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Student Attendance — {formatDisplayDate(dateFilter)}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{allRecords.length} records</span>
          </div>
          {allRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
              No attendance records for this date
            </div>
          ) : (
            <>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Class</th>
                      <th>Category</th>
                      <th>Submitted By</th>
                      <th style={{ textAlign: 'center' }}>Present</th>
                      <th style={{ textAlign: 'center' }}>Absent</th>
                      <th>Rate</th>
                      <th>Flag</th>
                      <th style={{ width: 110 }}>Actions</th>
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
                          <td style={{ textAlign: 'center' }}><span style={{ color: '#16a34a', fontWeight: 700 }}>{present}</span></td>
                          <td style={{ textAlign: 'center' }}><span style={{ color: '#dc2626', fontWeight: 700 }}>{absent}</span></td>
                          <td><RateBar rate={rate} /></td>
                          <td>
                            {rec.isModified
                              ? <span className="badge badge-orange">Modified</span>
                              : <span className="badge badge-green">Original</span>}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {user.role === 'admin' && (
                                <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setModifyRecord(rec)} title="Edit record">
                                  <Edit2 size={13} />
                                </button>
                              )}
                              <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setHistoryRecord(rec)} title="View history">
                                <History size={13} />
                              </button>
                              {user.role === 'admin' && (
                                <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-danger)' }}
                                  onClick={() => window.confirm('Delete this attendance record? This cannot be undone.') && deleteMutation.mutate(rec._id)}
                                  title="Delete">
                                  <Trash2 size={13} />
                                </button>
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

      {modifyRecord && (
        <ModifyModal record={modifyRecord} onClose={() => setModifyRecord(null)} />
      )}
      {historyRecord && (
        <HistoryModal record={historyRecord} onClose={() => setHistoryRecord(null)} />
      )}
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
    onSuccess: () => {
      toast.success('Attendance modified — audit trail saved');
      qc.invalidateQueries(['admin-student-attendance']);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Modification failed'),
  });

  const changedCount = Object.keys(changes).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span style={{ fontWeight: 700 }}>Edit Attendance — {record.class?.name}</span>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
              {formatDisplayDate(record.date)} · Originally by {record.submittedByName}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="alert alert-warning" style={{ marginBottom: 16 }}>
            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
            <div>Admin modification. All changes are permanently logged in the audit trail.</div>
          </div>
          <div className="table-container" style={{ marginBottom: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Current Status</th>
                  <th>Change To</th>
                </tr>
              </thead>
              <tbody>
                {(record.records || []).map(r => {
                  const newStatus = changes[r.student?._id];
                  return (
                    <tr key={r.student?._id} style={{ background: newStatus ? '#fffbeb' : undefined }}>
                      <td><span className="code" style={{ fontSize: '0.72rem' }}>{r.student?.studentId || '—'}</span></td>
                      <td style={{ fontWeight: newStatus ? 700 : 500 }}>{r.student?.name || '—'}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {['present', 'absent'].map(s => (
                            <button key={s} onClick={() => {
                              if (s !== r.status) {
                                setChanges(c => ({ ...c, [r.student._id]: s }));
                              } else {
                                const c = { ...changes };
                                delete c[r.student._id];
                                setChanges(c);
                              }
                            }}
                              style={{
                                padding: '3px 12px', borderRadius: 6, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                                border: `1.5px solid ${changes[r.student?._id] === s ? (s === 'present' ? '#16a34a' : '#dc2626') : 'var(--color-border)'}`,
                                background: changes[r.student?._id] === s ? (s === 'present' ? '#16a34a' : '#dc2626') : 'white',
                                color: changes[r.student?._id] === s ? 'white' : 'var(--color-text-secondary)',
                                transition: 'all 0.12s'
                              }}>
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
          </div>
          <div className="form-group">
            <label className="form-label">
              Reason for Modification
              <span className="optional" style={{ marginLeft: 6 }}>(recommended for accountability)</span>
            </label>
            <textarea className="form-textarea" rows={2} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="e.g., Parent confirmed child was present but marked absent due to late arrival" />
          </div>
          {changedCount > 0 && (
            <div className="alert alert-info" style={{ marginTop: 12 }}>
              <Info size={14} style={{ flexShrink: 0 }} />
              <div>
                <strong>{changedCount} change(s)</strong> ready to save.
                {Object.entries(changes).map(([id, status]) => {
                  const rec2 = record.records?.find(r => r.student?._id?.toString() === id);
                  return rec2 ? (
                    <span key={id} style={{ marginLeft: 8, fontSize: '0.78rem' }}>
                      {rec2.student?.name}: {rec2.status} → {status}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={changedCount === 0 || modifyMutation.isPending}
            onClick={() => modifyMutation.mutate({
              changes: Object.entries(changes).map(([studentId, newStatus]) => ({ studentId, newStatus })),
              reason
            })}>
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
          <div>
            <span style={{ fontWeight: 700 }}>Modification History</span>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
              {record.class?.name} — {formatDisplayDate(record.date)}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {/* Original submission */}
          <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', marginBottom: 14, fontSize: '0.82rem' }}>
            <div style={{ fontWeight: 700, color: '#15803d', marginBottom: 2 }}>✓ Original Submission</div>
            <div style={{ color: 'var(--color-text-secondary)' }}>
              By <strong>{record.submittedByName}</strong> ({record.submittedByRole}) ·{' '}
              {record.createdAt ? new Date(record.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
            </div>
          </div>

          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
              No modifications have been made to this record.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {history.map((mod, i) => (
                <div key={i} style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                      Modification #{i + 1} by {mod.modifiedByName}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                      {new Date(mod.modifiedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                  {mod.reason && mod.reason !== 'No reason specified' && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 8, fontStyle: 'italic', padding: '6px 10px', background: 'var(--color-bg)', borderRadius: 7 }}>
                      "{mod.reason}"
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {mod.changes?.map((c, j) => (
                      <div key={j} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, minWidth: 120 }}>{c.entityName || '—'}</span>
                        <StatusBadge status={c.previousStatus} />
                        <span style={{ color: 'var(--color-text-muted)' }}>→</span>
                        <StatusBadge status={c.newStatus} />
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

// ─── ADMIN: Submit Attendance on Behalf ────────────────────────────
function AdminSubmitOnBehalf() {
  const qc = useQueryClient();
  const [date, setDate] = useState(getTodayIST());
  const [selectedClassId, setSelectedClassId] = useState('');
  const [records, setRecords] = useState({});
  const todayIST = getTodayIST();

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesAPI.getAll().then(r => r.data?.data || []),
  });

  const { data: classData } = useQuery({
    queryKey: ['class-full', selectedClassId],
    queryFn: () => classesAPI.getOne(selectedClassId).then(r => r.data?.data),
    enabled: !!selectedClassId,
  });

  const { data: existingRecord } = useQuery({
    queryKey: ['attendance-check-admin', date, selectedClassId],
    queryFn: () => attendanceAPI.getStudentAttendance({ date, classId: selectedClassId }).then(r => r.data?.data?.[0]),
    enabled: !!selectedClassId,
  });

  const submitMutation = useMutation({
    mutationFn: (data) => attendanceAPI.submitStudentAttendance(data),
    onSuccess: () => {
      toast.success('Attendance submitted');
      qc.invalidateQueries(['attendance-check-admin']);
      qc.invalidateQueries(['admin-student-attendance']);
      setRecords({});
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const students = classData?.students || [];
  const alreadySubmitted = !!existingRecord;

  const markAll = (status) => {
    const all = {};
    students.forEach(s => { all[s._id] = status; });
    setRecords(all);
  };

  const presentCount = Object.values(records).filter(v => v === 'present').length;
  const markedCount = Object.keys(records).length;

  return (
    <div>
      <div className="alert alert-info" style={{ marginBottom: 16 }}>
        <Info size={15} style={{ flexShrink: 0 }} />
        <div>Submit student attendance on behalf of a teacher — no time window restrictions apply for admin.</div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label className="form-label">Date</label>
          <input className="form-input" type="date" value={date}
            onChange={e => { setDate(e.target.value); setRecords({}); }} style={{ width: 200 }} />
        </div>
        <div>
          <label className="form-label">Class</label>
          <select className="form-select" style={{ width: 200 }} value={selectedClassId}
            onChange={e => { setSelectedClassId(e.target.value); setRecords({}); }}>
            <option value="">Select a class...</option>
            {(classes || []).map(c => <option key={c._id} value={c._id}>{c.name} ({c.category})</option>)}
          </select>
        </div>
        {students.length > 0 && !alreadySubmitted && (
          <div style={{ display: 'flex', gap: 6, paddingBottom: 1 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => markAll('present')}>All Present</button>
            <button className="btn btn-secondary btn-sm" onClick={() => markAll('absent')}>All Absent</button>
          </div>
        )}
      </div>

      {!selectedClassId && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
          Select a class to submit attendance
        </div>
      )}

      {selectedClassId && alreadySubmitted && (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <div>Attendance already submitted for this class on {formatDisplayDate(date)}. Use the <strong>Manage</strong> tab to modify it.</div>
        </div>
      )}

      {selectedClassId && classData && !alreadySubmitted && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">{classData.name} — {formatDisplayDate(date)}</span>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'flex', gap: 12 }}>
              <span style={{ color: '#16a34a', fontWeight: 700 }}>{presentCount} Present</span>
              <span style={{ color: '#dc2626', fontWeight: 700 }}>{markedCount - presentCount} Absent</span>
              <span style={{ color: 'var(--color-text-muted)' }}>{students.length - markedCount} Unmarked</span>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>ID</th><th>Name</th><th>Grade</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, idx) => (
                  <tr key={s._id}>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>{idx + 1}</td>
                    <td><span className="code">{s.studentId || '—'}</span></td>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                      {['PreKG', 'LKG', 'UKG'].includes(s.grade) ? s.grade : `Std ${s.grade}`}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {['present', 'absent'].map(st => (
                          <button key={st} onClick={() => setRecords(r => ({ ...r, [s._id]: st }))}
                            style={{
                              padding: '4px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                              fontWeight: 600, fontSize: '0.78rem', transition: 'all 0.12s',
                              background: records[s._id] === st ? (st === 'present' ? '#16a34a' : '#dc2626') : 'var(--color-bg)',
                              color: records[s._id] === st ? 'white' : 'var(--color-text-secondary)',
                            }}>
                            {st === 'present' ? '✓ Present' : '✗ Absent'}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '14px 18px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" disabled={submitMutation.isPending} onClick={() => {
              const recs = students.map(s => ({ studentId: s._id, status: records[s._id] || 'absent' }));
              submitMutation.mutate({ date, classId: selectedClassId, records: recs });
            }}>
              {submitMutation.isPending ? 'Submitting...' : <><Save size={15} /> Submit Attendance</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN ATTENDANCE PAGE ──────────────────────────────────────────
export default function AttendancePage({ initialTab }) {
  const { user } = useAuth();

  const tabsByRole = {
    admin: [
      { id: 'manage', label: '📋 Student Records', icon: Users },
      { id: 'submit-behalf', label: '✏️ Submit (Admin)', icon: CheckSquare },
      { id: 'teachers', label: '👩‍🏫 Teacher Attendance', icon: GraduationCap },
      { id: 'volunteers', label: '🤝 Volunteer Attendance', icon: Heart },
    ],
    editor: [
      { id: 'teachers', label: '👩‍🏫 Teacher Attendance', icon: GraduationCap },
      { id: 'volunteers', label: '🤝 Volunteer Attendance', icon: Heart },
    ],
    viewer: [
      { id: 'manage', label: '📋 Student Records', icon: Users },
    ],
    teacher: [
      { id: 'submit', label: '✏️ Mark Attendance', icon: CheckSquare },
      { id: 'history', label: '📅 My History', icon: Calendar },
    ],
  };

  const tabs = tabsByRole[user.role] || [];
  const getDefaultTab = () => {
    if (initialTab === 'my-attendance') return 'history';
    if (initialTab === 'submit') return 'submit';
    return tabs[0]?.id;
  };
  const [activeTab, setActiveTab] = useState(getDefaultTab);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance Management</h1>
          <p className="page-subtitle">
            {user.role === 'teacher' ? 'Mark and view attendance for your class' : 'Manage daily attendance for students, teachers, and volunteers'}
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {tabs.map(tab => (
          <button key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {activeTab === 'submit' && <TeacherMarkAttendance />}
        {activeTab === 'history' && <TeacherAttendanceHistory />}
        {activeTab === 'manage' && <AdminStudentAttendance />}
        {activeTab === 'submit-behalf' && <AdminSubmitOnBehalf />}
        {activeTab === 'teachers' && (
          <div>
            <StaffAttendancePanel type="teacher" />
          </div>
        )}
        {activeTab === 'volunteers' && (
          <div>
            <StaffAttendancePanel type="volunteer" />
          </div>
        )}
      </div>
    </div>
  );
}