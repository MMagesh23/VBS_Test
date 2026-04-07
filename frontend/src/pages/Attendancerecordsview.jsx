import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, GraduationCap, Heart, Calendar, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { attendanceAPI, teachersAPI, volunteersAPI } from '../services/api';
import { LoadingPage } from '../components/common';

// ─── Helpers ─────────────────────────────────────────────────────
const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
const STATUS_CFG = {
  present:  { label: 'Present',  color: '#15803d', bg: '#dcfce7', dot: '#16a34a' },
  absent:   { label: 'Absent',   color: '#b91c1c', bg: '#fee2e2', dot: '#dc2626' },
  late:     { label: 'Late',     color: '#a16207', bg: '#fef9c3', dot: '#d97706' },
  leave:    { label: 'Leave',    color: '#6d28d9', bg: '#ede9fe', dot: '#7c3aed' },
  halfDay:  { label: 'Half Day', color: '#c2410c', bg: '#ffedd5', dot: '#ea580c' },
};
const StatusChip = ({ status }) => {
  const c = STATUS_CFG[status] || { label: status || '—', color: '#475569', bg: '#f1f5f9', dot: '#94a3b8' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, background: c.bg, color: c.color, fontSize: '0.75rem', fontWeight: 700 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.dot, display: 'inline-block', flexShrink: 0 }} />
      {c.label}
    </span>
  );
};

const RatePill = ({ rate }) => {
  const cls = rate >= 80 ? 'rate-pill high' : rate >= 60 ? 'rate-pill mid' : 'rate-pill low';
  return <span className={cls}>{rate}%</span>;
};

// ─── Teacher Attendance Records ──────────────────────────────────
export function TeacherAttendanceRecords() {
  const [page, setPage] = useState(1);
  const [filterTeacher, setFilterTeacher] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [view, setView] = useState('table'); // 'table' | 'summary'
  const PAGE_SIZE = 20;

  const { data: teachers } = useQuery({ queryKey: ['teachers-list'], queryFn: () => teachersAPI.getAll().then(r => r.data?.data || []) });

  const { data: records, isLoading } = useQuery({
    queryKey: ['teacher-att-records', filterTeacher, dateFrom, dateTo],
    queryFn: () => attendanceAPI.getTeacherAttendance({
      teacherId: filterTeacher || undefined,
      startDate: dateFrom || undefined,
      endDate: dateTo || undefined,
    }).then(r => r.data?.data || []),
  });

  const allRecords = records || [];
  const paged = allRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pages = Math.ceil(allRecords.length / PAGE_SIZE);

  // Summary stats
  const stats = allRecords.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  const presentCount = (stats.present || 0) + (stats.late || 0);
  const rate = allRecords.length > 0 ? Math.round((presentCount / allRecords.length) * 100) : 0;

  // Per-teacher summary
  const byTeacher = allRecords.reduce((acc, r) => {
    const name = r.teacher?.name || 'Unknown';
    if (!acc[name]) acc[name] = { present: 0, absent: 0, late: 0, leave: 0, total: 0 };
    acc[name][r.status] = (acc[name][r.status] || 0) + 1;
    acc[name].total += 1;
    return acc;
  }, {});

  if (isLoading) return <LoadingPage />;

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Teacher</label>
          <select className="form-select" style={{ width: 180 }} value={filterTeacher} onChange={e => { setFilterTeacher(e.target.value); setPage(1); }}>
            <option value="">All Teachers</option>
            {(teachers || []).map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 4 }}>From</label>
          <input className="form-input" type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} style={{ width: 160 }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 4 }}>To</label>
          <input className="form-input" type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} style={{ width: 160 }} min={dateFrom} />
        </div>
        {(filterTeacher || dateFrom || dateTo) && <button className="btn btn-ghost btn-sm" onClick={() => { setFilterTeacher(''); setDateFrom(''); setDateTo(''); setPage(1); }}>Clear</button>}
        <div style={{ marginLeft: 'auto', display: 'flex', background: 'var(--color-bg)', borderRadius: 8, padding: 3, border: '1px solid var(--color-border)', gap: 2 }}>
          {['table', 'summary'].map(v => <button key={v} onClick={() => setView(v)} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.78rem', fontWeight: 600, background: view === v ? 'white' : 'transparent', boxShadow: view === v ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s', textTransform: 'capitalize' }}>{v}</button>)}
        </div>
      </div>

      {/* Summary row */}
      <div className="att-summary" style={{ marginBottom: 16 }}>
        {[
          { label: 'Total Records', val: allRecords.length, color: '#3b82f6' },
          { label: 'Present', val: stats.present || 0, color: '#16a34a' },
          { label: 'Absent', val: stats.absent || 0, color: '#dc2626' },
          { label: 'Late', val: stats.late || 0, color: '#d97706' },
          { label: 'Leave', val: stats.leave || 0, color: '#7c3aed' },
          { label: 'Attendance Rate', val: <RatePill rate={rate} />, color: undefined },
        ].map(s => (
          <div key={s.label} className="att-summary-card">
            <div className="val" style={{ color: s.color }}>{s.val}</div>
            <div className="lbl">{s.label}</div>
          </div>
        ))}
      </div>

      {view === 'summary' ? (
        /* Per-teacher summary table */
        <div className="card">
          <div className="card-header"><span className="card-title">Per-Teacher Summary</span></div>
          <div className="table-container">
            <table>
              <thead><tr><th>Teacher</th><th style={{ textAlign: 'center' }}>Present</th><th style={{ textAlign: 'center' }}>Late</th><th style={{ textAlign: 'center' }}>Absent</th><th style={{ textAlign: 'center' }}>Leave</th><th style={{ textAlign: 'center' }}>Total</th><th>Rate</th></tr></thead>
              <tbody>
                {Object.entries(byTeacher).sort((a, b) => b[1].total - a[1].total).map(([name, s]) => {
                  const att = ((s.present || 0) + (s.late || 0));
                  const r = s.total > 0 ? Math.round((att / s.total) * 100) : 0;
                  return (
                    <tr key={name}>
                      <td style={{ fontWeight: 600 }}>{name}</td>
                      <td style={{ textAlign: 'center' }}><span style={{ color: '#15803d', fontWeight: 700 }}>{s.present || 0}</span></td>
                      <td style={{ textAlign: 'center' }}><span style={{ color: '#d97706', fontWeight: 700 }}>{s.late || 0}</span></td>
                      <td style={{ textAlign: 'center' }}><span style={{ color: '#dc2626', fontWeight: 700 }}>{s.absent || 0}</span></td>
                      <td style={{ textAlign: 'center' }}><span style={{ color: '#7c3aed', fontWeight: 700 }}>{s.leave || 0}</span></td>
                      <td style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>{s.total}</td>
                      <td><RatePill rate={r} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Detailed records table */
        <div className="card">
          <div className="card-header">
            <span className="card-title">Teacher Attendance Records</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{allRecords.length} records</span>
          </div>
          {allRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>No records found. Adjust your filters.</div>
          ) : (
            <>
              <div className="table-container">
                <table>
                  <thead><tr><th>Date</th><th>Teacher</th><th>Class</th><th>Status</th><th>Arrival</th><th>Departure</th><th>Remarks</th><th>Marked By</th></tr></thead>
                  <tbody>
                    {paged.map(r => (
                      <tr key={r._id}>
                        <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtDate(r.date)}</td>
                        <td style={{ fontWeight: 600 }}>{r.teacher?.name || '—'}</td>
                        <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem' }}>{r.teacher?.classAssigned?.name || '—'}</td>
                        <td><StatusChip status={r.status} /></td>
                        <td>{r.arrivalTime ? <span className="time-chip" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 99, padding: '2px 8px', color: 'var(--color-text-secondary)' }}>{r.arrivalTime}</span> : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>—</span>}</td>
                        <td>{r.departureTime ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 99, padding: '2px 8px', color: 'var(--color-text-secondary)' }}>{r.departureTime}</span> : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>—</span>}</td>
                        <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.78rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.remarks || '—'}</td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{r.markedByName || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pages > 1 && (
                <div className="pagination">
                  <span className="page-info">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, allRecords.length)} of {allRecords.length}</span>
                  <div className="page-btns">
                    <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}><ChevronLeft size={14} /></button>
                    {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(p => <button key={p} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPage(p)} style={{ minWidth: 32, justifyContent: 'center' }}>{p}</button>)}
                    <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={page >= pages}><ChevronRight size={14} /></button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Volunteer Attendance Records ────────────────────────────────
export function VolunteerAttendanceRecords() {
  const [page, setPage] = useState(1);
  const [filterVol, setFilterVol] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [view, setView] = useState('table');
  const PAGE_SIZE = 20;

  const { data: volunteers } = useQuery({ queryKey: ['vol-list'], queryFn: () => volunteersAPI.getAll().then(r => r.data?.data || []) });

  const { data: records, isLoading } = useQuery({
    queryKey: ['vol-att-records', filterVol, filterRole, dateFrom, dateTo],
    queryFn: () => attendanceAPI.getVolunteerAttendance({
      volunteerId: filterVol || undefined,
      role: filterRole || undefined,
      startDate: dateFrom || undefined,
      endDate: dateTo || undefined,
    }).then(r => r.data?.data || []),
  });

  const allRecords = records || [];
  const paged = allRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pages = Math.ceil(allRecords.length / PAGE_SIZE);
  const stats = allRecords.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
  const presentCount = (stats.present || 0) + (stats.halfDay || 0);
  const rate = allRecords.length > 0 ? Math.round((presentCount / allRecords.length) * 100) : 0;
  const uniqueRoles = [...new Set((volunteers || []).map(v => v.role).filter(Boolean))];

  const byVol = allRecords.reduce((acc, r) => {
    const name = r.volunteer?.name || 'Unknown';
    const role = r.volunteer?.role || '—';
    if (!acc[name]) acc[name] = { role, present: 0, halfDay: 0, absent: 0, late: 0, total: 0 };
    acc[name][r.status] = (acc[name][r.status] || 0) + 1;
    acc[name].total += 1;
    return acc;
  }, {});

  if (isLoading) return <LoadingPage />;

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Volunteer</label>
          <select className="form-select" style={{ width: 180 }} value={filterVol} onChange={e => { setFilterVol(e.target.value); setPage(1); }}>
            <option value="">All Volunteers</option>
            {(volunteers || []).map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
          </select>
        </div>
        {uniqueRoles.length > 0 && <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Role</label>
          <select className="form-select" style={{ width: 150 }} value={filterRole} onChange={e => { setFilterRole(e.target.value); setPage(1); }}>
            <option value="">All Roles</option>
            {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>}
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 4 }}>From</label>
          <input className="form-input" type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} style={{ width: 160 }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 4 }}>To</label>
          <input className="form-input" type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} style={{ width: 160 }} min={dateFrom} />
        </div>
        {(filterVol || filterRole || dateFrom || dateTo) && <button className="btn btn-ghost btn-sm" onClick={() => { setFilterVol(''); setFilterRole(''); setDateFrom(''); setDateTo(''); setPage(1); }}>Clear</button>}
        <div style={{ marginLeft: 'auto', display: 'flex', background: 'var(--color-bg)', borderRadius: 8, padding: 3, border: '1px solid var(--color-border)', gap: 2 }}>
          {['table', 'summary'].map(v => <button key={v} onClick={() => setView(v)} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.78rem', fontWeight: 600, background: view === v ? 'white' : 'transparent', boxShadow: view === v ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s', textTransform: 'capitalize' }}>{v}</button>)}
        </div>
      </div>

      <div className="att-summary" style={{ marginBottom: 16 }}>
        {[
          { label: 'Total Records', val: allRecords.length, color: '#3b82f6' },
          { label: 'Present', val: stats.present || 0, color: '#16a34a' },
          { label: 'Half Day', val: stats.halfDay || 0, color: '#ea580c' },
          { label: 'Absent', val: stats.absent || 0, color: '#dc2626' },
          { label: 'Late', val: stats.late || 0, color: '#d97706' },
          { label: 'Rate', val: <RatePill rate={rate} /> },
        ].map(s => (
          <div key={s.label} className="att-summary-card">
            <div className="val" style={{ color: s.color }}>{s.val}</div>
            <div className="lbl">{s.label}</div>
          </div>
        ))}
      </div>

      {view === 'summary' ? (
        <div className="card">
          <div className="card-header"><span className="card-title">Per-Volunteer Summary</span></div>
          <div className="table-container">
            <table>
              <thead><tr><th>Volunteer</th><th>Role</th><th style={{ textAlign: 'center' }}>Present</th><th style={{ textAlign: 'center' }}>Half Day</th><th style={{ textAlign: 'center' }}>Absent</th><th style={{ textAlign: 'center' }}>Total</th><th>Rate</th></tr></thead>
              <tbody>
                {Object.entries(byVol).sort((a, b) => b[1].total - a[1].total).map(([name, s]) => {
                  const att = (s.present || 0) + (s.halfDay || 0);
                  const r = s.total > 0 ? Math.round((att / s.total) * 100) : 0;
                  return (
                    <tr key={name}>
                      <td style={{ fontWeight: 600 }}>{name}</td>
                      <td><span className="badge badge-purple">{s.role}</span></td>
                      <td style={{ textAlign: 'center' }}><span style={{ color: '#15803d', fontWeight: 700 }}>{s.present || 0}</span></td>
                      <td style={{ textAlign: 'center' }}><span style={{ color: '#ea580c', fontWeight: 700 }}>{s.halfDay || 0}</span></td>
                      <td style={{ textAlign: 'center' }}><span style={{ color: '#dc2626', fontWeight: 700 }}>{s.absent || 0}</span></td>
                      <td style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>{s.total}</td>
                      <td><RatePill rate={r} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Volunteer Attendance Records</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{allRecords.length} records</span>
          </div>
          {allRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>No records found. Adjust your filters.</div>
          ) : (
            <>
              <div className="table-container">
                <table>
                  <thead><tr><th>Date</th><th>Volunteer</th><th>Role</th><th>Status</th><th>Shift</th><th>Check-in</th><th>Check-out</th><th>Marked By</th></tr></thead>
                  <tbody>
                    {paged.map(r => (
                      <tr key={r._id}>
                        <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtDate(r.date)}</td>
                        <td style={{ fontWeight: 600 }}>{r.volunteer?.name || '—'}</td>
                        <td><span className="badge badge-purple" style={{ fontSize: '0.68rem' }}>{r.volunteer?.role || '—'}</span></td>
                        <td><StatusChip status={r.status} /></td>
                        <td>{r.shift ? <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{r.shift}</span> : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>—</span>}</td>
                        <td>{r.checkInTime ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 99, padding: '2px 8px', color: 'var(--color-text-secondary)' }}>{r.checkInTime}</span> : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>—</span>}</td>
                        <td>{r.checkOutTime ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 99, padding: '2px 8px', color: 'var(--color-text-secondary)' }}>{r.checkOutTime}</span> : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>—</span>}</td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{r.markedByName || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pages > 1 && (
                <div className="pagination">
                  <span className="page-info">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, allRecords.length)} of {allRecords.length}</span>
                  <div className="page-btns">
                    <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}><ChevronLeft size={14} /></button>
                    {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(p => <button key={p} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPage(p)} style={{ minWidth: 32, justifyContent: 'center' }}>{p}</button>)}
                    <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={page >= pages}><ChevronRight size={14} /></button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}