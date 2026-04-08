import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText, Calendar, BookOpen, GraduationCap, Heart,
  MapPin, Users, Printer, ChevronDown, ChevronUp
} from 'lucide-react';
import { reportsAPI, classesAPI, teachersAPI, volunteersAPI, studentsAPI } from '../services/api';
import api from '../services/api';
import { useActiveYear } from '../contexts/ActiveYearContext';
import { LoadingPage, Alert, CategoryBadge } from '../components/common';
import { format } from 'date-fns';

/* ─── Shared helpers ─────────────────────────────────────────────── */
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const RateBar = ({ rate = 0 }) => {
  const color = rate >= 80 ? '#16a34a' : rate >= 60 ? '#d97706' : '#dc2626';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{ width: 50, height: 5, background: 'var(--color-border)', borderRadius: 99 }}>
        <div style={{ width: `${Math.min(rate, 100)}%`, height: '100%', borderRadius: 99, background: color }} />
      </div>
      <span style={{ fontWeight: 700, fontSize: '0.8rem', color }}>{rate}%</span>
    </div>
  );
};

function StatRow({ items }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
      {items.map(s => (
        <div key={s.label} className="stat-card" style={{ flex: 1, minWidth: 90, padding: '12px 16px' }}>
          <div className="stat-label">{s.label}</div>
          <div className="stat-value" style={{ color: s.color || 'var(--color-primary)', fontSize: '1.6rem' }}>{s.value ?? '—'}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── Print utility ──────────────────────────────────────────────── */
const print = (title, body, summary = '', vbsYear = '') => {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
  <style>
    @page{size:A4;margin:14mm}*{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:9.5pt;color:#111}
    .hdr{border-bottom:2.5px solid #1a2f5e;padding-bottom:10px;margin-bottom:12px}
    .church{font-size:13pt;font-weight:800;color:#1a2f5e}
    .rpt{font-size:10.5pt;font-weight:700;color:#c8922a;margin-top:3px}
    .sm{display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap}
    .sc{border:1px solid #ddd;border-radius:5px;padding:7px 12px}
    .sc .n{font-size:15pt;font-weight:800;color:#1a2f5e}
    .sc .l{font-size:7.5pt;color:#555;text-transform:uppercase;margin-top:1px}
    table{width:100%;border-collapse:collapse}
    th{background:#1a2f5e;color:#fff;padding:5px 7px;text-align:left;font-size:7.5pt;font-weight:700}
    td{padding:4px 7px;border-bottom:1px solid #e8edf2;font-size:8.5pt}
    tr:nth-child(even)td{background:#f9fafb}
    .ftr{margin-top:14px;font-size:7.5pt;color:#888;border-top:1px solid #ddd;padding-top:7px;display:flex;justify-content:space-between}
    @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
  </style></head><body>
  <div class="hdr"><div class="church">✝ Presence of Jesus Ministry, Tiruchirappalli</div>
  <div class="rpt">${title}${vbsYear ? ` — VBS ${vbsYear}` : ''}</div></div>
  ${summary}${body}
  <div class="ftr"><span>VBS Management System</span><span>Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</span></div>
  </body></html>`);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 500);
};

const mkSummary = items => `<div class="sm">${items.map(i => `<div class="sc"><div class="n">${i.v}</div><div class="l">${i.l}</div></div>`).join('')}</div>`;
const mkTable = (heads, rows) => `<table><thead><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;

/* ─── Shared components ──────────────────────────────────────────── */
function NoYearState() {
  return (
    <div className="empty-state">
      <Calendar size={36} style={{ color: 'var(--color-text-muted)' }} />
      <h3>No VBS Year Selected</h3>
      <p>Use the year selector in the top bar to choose a year and generate reports.</p>
    </div>
  );
}

function YearBanner({ vbsYear, activeYear }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, marginBottom: 16, fontSize: '0.82rem', color: '#1e40af', fontWeight: 600 }}>
      <Calendar size={14} />
      All reports scoped to: <strong>{activeYear?.vbsTitle || `VBS ${vbsYear}`}</strong>
    </div>
  );
}

function SectionCard({ title, children, action }) {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-header">
        <span className="card-title">{title}</span>
        {action}
      </div>
      <div className="table-container">{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   1. DAILY REPORT
═══════════════════════════════════════════════════════════════════ */
function DailyReport({ date, vbsYear }) {
  const { data, isLoading } = useQuery({
    queryKey: ['report-daily', date, vbsYear],
    queryFn: () => reportsAPI.getDaily({ date, vbsYear }),
    enabled: !!date && !!vbsYear,
    select: d => d.data?.data,
  });

  if (!date) return <Alert type="info">Select a date above to view the daily report.</Alert>;
  if (isLoading) return <LoadingPage />;
  if (!data) return <Alert type="warning">No attendance data found for {fmtDate(date)}.</Alert>;

  const { summary, studentAttendance = [], teacherAttendance = [], volunteerAttendance = [], unsubmittedClasses = [] } = data;

  const handlePrint = () => {
    const sum = mkSummary([
      { l: 'Students Present', v: summary?.students?.present ?? 0 },
      { l: 'Students Absent', v: summary?.students?.absent ?? 0 },
      { l: 'Attendance Rate', v: `${summary?.students?.rate ?? 0}%` },
      { l: 'Teachers Present', v: summary?.teachers?.present ?? 0 },
      { l: 'Teachers Absent', v: summary?.teachers?.absent ?? 0 },
      { l: 'Volunteers Present', v: summary?.volunteers?.present ?? 0 },
    ]);
    const stuRows = studentAttendance.map(a => {
      const p = a.records?.filter(r => r.status === 'present').length || 0;
      const ab = a.records?.filter(r => r.status === 'absent').length || 0;
      const t = p + ab;
      return `<tr><td>${a.class?.name}</td><td>${a.class?.category}</td><td>${p}</td><td>${ab}</td><td>${t > 0 ? Math.round((p / t) * 100) : 0}%</td><td>${a.submittedByName || '—'}</td><td>${a.isModified ? 'Modified' : 'Original'}</td></tr>`;
    }).join('');
    const tRows = teacherAttendance.map(t => `<tr><td>${t.teacher?.name || '—'}</td><td>${t.status}</td><td>${t.arrivalTime || '—'}</td><td>${t.departureTime || '—'}</td><td>${t.remarks || '—'}</td></tr>`).join('');
    const vRows = volunteerAttendance.map(v => `<tr><td>${v.volunteer?.name || '—'}</td><td>${v.volunteer?.role || '—'}</td><td>${v.status}</td><td>${v.shift || '—'}</td><td>${v.checkInTime || '—'}</td></tr>`).join('');
    const body = mkTable(['Class', 'Category', 'Present', 'Absent', 'Rate', 'Submitted By', 'Status'], stuRows)
      + (tRows ? '<br/>' + mkTable(['Teacher', 'Status', 'Arrival', 'Departure', 'Remarks'], tRows) : '')
      + (vRows ? '<br/>' + mkTable(['Volunteer', 'Role', 'Status', 'Shift', 'Check-in'], vRows) : '');
    print(`Daily Attendance — ${fmtDate(date)}`, body, sum, vbsYear);
  };

  return (
    <div>
      <StatRow items={[
        { label: 'Students Present', value: summary?.students?.present, color: '#16a34a' },
        { label: 'Students Absent', value: summary?.students?.absent, color: '#dc2626' },
        { label: 'Student Rate', value: `${summary?.students?.rate ?? 0}%`, color: '#3b82f6' },
        { label: 'Teachers Present', value: summary?.teachers?.present, color: '#8b5cf6' },
        { label: 'Teachers Late', value: summary?.teachers?.late, color: '#d97706' },
        { label: 'Volunteers Present', value: summary?.volunteers?.present, color: '#f59e0b' },
      ]} />

      {unsubmittedClasses.length > 0 && (
        <Alert type="warning" style={{ marginBottom: 12 }}>
          ⚠️ <strong>{unsubmittedClasses.length}</strong> class(es) did not submit attendance: {unsubmittedClasses.map(c => c.name).join(', ')}
        </Alert>
      )}

      {/* Student Attendance by Class */}
      <SectionCard title="📚 Student Attendance by Class" action={
        <button className="btn btn-secondary btn-sm" onClick={handlePrint}><Printer size={13} /> Print All</button>
      }>
        <table>
          <thead><tr><th>Class</th><th>Category</th><th>Present</th><th>Absent</th><th>Total</th><th>Rate</th><th>Submitted By</th><th>Status</th></tr></thead>
          <tbody>
            {studentAttendance.length === 0
              ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-muted)' }}>No student attendance submitted for this date.</td></tr>
              : studentAttendance.map(a => {
                const p = a.records?.filter(r => r.status === 'present').length || 0;
                const ab = a.records?.filter(r => r.status === 'absent').length || 0;
                const total = p + ab;
                return (
                  <tr key={a._id}>
                    <td style={{ fontWeight: 600 }}>{a.class?.name}</td>
                    <td><span className={`badge cat-${a.class?.category}`}>{a.class?.category}</span></td>
                    <td><span style={{ color: '#16a34a', fontWeight: 700 }}>{p}</span></td>
                    <td><span style={{ color: '#dc2626', fontWeight: 700 }}>{ab}</span></td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{total}</td>
                    <td><RateBar rate={total > 0 ? Math.round((p / total) * 100) : 0} /></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{a.submittedByName}</td>
                    <td>{a.isModified ? <span className="badge badge-orange">Modified</span> : <span className="badge badge-green">Original</span>}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </SectionCard>

      {/* Teacher Attendance */}
      <SectionCard title="👩‍🏫 Teacher Attendance">
        <table>
          <thead><tr><th>Teacher</th><th>Class</th><th>Status</th><th>Arrival</th><th>Departure</th><th>Remarks</th></tr></thead>
          <tbody>
            {teacherAttendance.length === 0
              ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-muted)' }}>No teacher attendance recorded.</td></tr>
              : teacherAttendance.map(t => (
                <tr key={t._id}>
                  <td style={{ fontWeight: 600 }}>{t.teacher?.name || '—'}</td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{t.teacher?.classAssigned?.name || '—'}</td>
                  <td><span className={`badge ${t.status === 'present' ? 'badge-green' : t.status === 'late' ? 'badge-yellow' : t.status === 'leave' ? 'badge-purple' : 'badge-red'}`}>{t.status}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{t.arrivalTime || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{t.departureTime || '—'}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{t.remarks || '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </SectionCard>

      {/* Volunteer Attendance */}
      <SectionCard title="🤝 Volunteer Attendance">
        <table>
          <thead><tr><th>Volunteer</th><th>Role</th><th>Status</th><th>Shift</th><th>Check-in</th><th>Check-out</th></tr></thead>
          <tbody>
            {volunteerAttendance.length === 0
              ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-muted)' }}>No volunteer attendance recorded.</td></tr>
              : volunteerAttendance.map(v => (
                <tr key={v._id}>
                  <td style={{ fontWeight: 600 }}>{v.volunteer?.name || '—'}</td>
                  <td><span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>{v.volunteer?.role || '—'}</span></td>
                  <td><span className={`badge ${v.status === 'present' ? 'badge-green' : v.status === 'halfDay' ? 'badge-orange' : 'badge-red'}`}>{v.status}</span></td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{v.shift || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{v.checkInTime || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{v.checkOutTime || '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   2. CLASS REPORT
═══════════════════════════════════════════════════════════════════ */
function ClassReport({ classId, vbsYear }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['report-class', classId, startDate, endDate, vbsYear],
    queryFn: () => reportsAPI.getClass(classId, { startDate: startDate || undefined, endDate: endDate || undefined }),
    enabled: !!classId && !!vbsYear,
    select: d => d.data?.data,
  });

  if (!classId) return <Alert type="info">Select a class above to view its report.</Alert>;
  if (isLoading) return <LoadingPage />;
  if (!data) return <Alert type="warning">No data for this class.</Alert>;

  // Grade distribution within class
  const gradeMap = {};
  (data.students || []).forEach(s => { gradeMap[s.grade] = (gradeMap[s.grade] || 0) + 1; });

  const handlePrint = () => {
    const sum = mkSummary([
      { l: 'Students', v: data.students?.length ?? 0 },
      { l: 'Days Recorded', v: data.totalDays ?? 0 },
      { l: 'Avg Rate', v: `${data.classAvgRate ?? 0}%` },
      { l: 'Teacher', v: data.class?.teacher?.name || 'Unassigned' },
    ]);
    const rows = (data.students || []).map(s => `<tr><td>${s.studentId || '—'}</td><td>${s.name}</td><td>${s.grade}</td><td>${s.gender}</td><td>${s.village || '—'}</td><td>${s.present}</td><td>${s.absent}</td><td>${s.rate}%</td></tr>`).join('');
    print(`Class Report — ${data.class?.name}`, mkTable(['ID', 'Name', 'Grade', 'Gender', 'Village', 'Present', 'Absent', 'Rate'], rows), sum, vbsYear);
  };

  return (
    <div>
      {/* Date range filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div><label className="form-label">From Date <span className="optional">(optional)</span></label><input className="form-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: 180 }} /></div>
        <div><label className="form-label">To Date <span className="optional">(optional)</span></label><input className="form-input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} style={{ width: 180 }} /></div>
        {(startDate || endDate) && <button className="btn btn-ghost btn-sm" onClick={() => { setStartDate(''); setEndDate(''); }}>✕ Clear</button>}
      </div>

      {/* Class info */}
      <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{data.class?.name} <span className={`badge cat-${data.class?.category}`}>{data.class?.category}</span></div>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
              Teacher: <strong>{data.class?.teacher?.name || 'Unassigned'}</strong> · Capacity: {data.class?.capacity} · {data.totalDays} days recorded
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handlePrint}><Printer size={13} /> Print</button>
        </div>
      </div>

      <StatRow items={[
        { label: 'Total Students', value: data.students?.length, color: '#3b82f6' },
        { label: 'Days Recorded', value: data.totalDays, color: '#8b5cf6' },
        { label: 'Class Avg Rate', value: `${data.classAvgRate ?? 0}%`, color: data.classAvgRate >= 80 ? '#16a34a' : data.classAvgRate >= 60 ? '#d97706' : '#dc2626' },
      ]} />

      {/* Grade distribution */}
      {Object.keys(gradeMap).length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', alignSelf: 'center' }}>Grade breakdown:</span>
          {Object.entries(gradeMap).sort().map(([g, c]) => (
            <span key={g} className="badge badge-navy" style={{ fontSize: '0.72rem' }}>{['PreKG', 'LKG', 'UKG'].includes(g) ? g : `Std ${g}`}: {c}</span>
          ))}
        </div>
      )}

      <SectionCard title="👥 Student Attendance Records">
        <table>
          <thead><tr><th>Student ID</th><th>Name</th><th>Grade</th><th>Gender</th><th>Village</th><th>Contact</th><th>Present</th><th>Absent</th><th>Rate</th></tr></thead>
          <tbody>
            {(data.students || []).length === 0
              ? <tr><td colSpan={9} style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-muted)' }}>No students found.</td></tr>
              : (data.students || []).map(s => (
                <tr key={s._id}>
                  <td><span className="code" style={{ fontSize: '0.75rem' }}>{s.studentId || '—'}</span></td>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>{s.grade}</td>
                  <td style={{ textTransform: 'capitalize', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{s.gender}</td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{s.village || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{s.contactNumber || '—'}</td>
                  <td><span style={{ color: '#16a34a', fontWeight: 700 }}>{s.present}</span></td>
                  <td><span style={{ color: '#dc2626', fontWeight: 700 }}>{s.absent}</span></td>
                  <td><RateBar rate={s.rate} /></td>
                </tr>
              ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   3. FULL YEAR REPORT
═══════════════════════════════════════════════════════════════════ */
function FullYearReport({ vbsYear, allYears }) {
  const { data, isLoading } = useQuery({
    queryKey: ['report-full-year', vbsYear],
    queryFn: () => reportsAPI.getFullYear({ vbsYear }),
    enabled: !!vbsYear,
    select: d => d.data?.data,
  });

  if (isLoading) return <LoadingPage />;
  if (!data) return <Alert type="warning">No data found for VBS {vbsYear}.</Alert>;

  const { summary, classes = [], settings } = data;
  const att = summary?.attendance;

  const handlePrint = () => {
    const sum = mkSummary([
      { l: 'Students', v: summary?.totalStudents ?? 0 },
      { l: 'Teachers', v: summary?.totalTeachers ?? 0 },
      { l: 'Volunteers', v: summary?.totalVolunteers ?? 0 },
      { l: 'Classes', v: summary?.totalClasses ?? 0 },
      { l: 'Student Rate', v: `${att?.students?.rate ?? 0}%` },
      { l: 'Modifications', v: summary?.modifications ?? 0 },
    ]);
    const rows = classes.map(c => `<tr><td>${c.name}</td><td>${c.category}</td></tr>`).join('');
    print(`Full Year Report — VBS ${vbsYear}`, mkTable(['Class Name', 'Category'], rows), sum, vbsYear);
  };

  return (
    <div>
      {/* Header */}
      <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{settings?.vbsTitle || `VBS ${vbsYear}`}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: 3 }}>
              {fmtDate(settings?.dates?.startDate)} — {fmtDate(settings?.dates?.endDate)}
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handlePrint}><Printer size={13} /> Print</button>
        </div>
      </div>

      {/* Overview stats */}
      <StatRow items={[
        { label: 'Total Students', value: summary?.totalStudents, color: '#3b82f6' },
        { label: 'Total Teachers', value: summary?.totalTeachers, color: '#8b5cf6' },
        { label: 'Total Volunteers', value: summary?.totalVolunteers, color: '#10b981' },
        { label: 'Classes', value: summary?.totalClasses, color: '#f59e0b' },
      ]} />

      {/* Attendance stats */}
      <StatRow items={[
        { label: 'Student Rate', value: `${att?.students?.rate ?? 0}%`, color: '#3b82f6' },
        { label: 'Students Present', value: att?.students?.present, color: '#16a34a' },
        { label: 'Teachers Present', value: att?.teachers?.present, color: '#8b5cf6' },
        { label: 'Volunteers Present', value: att?.volunteers?.present, color: '#10b981' },
        { label: 'Modifications', value: summary?.modifications, color: '#f59e0b' },
      ]} />

      {/* Class performance */}
      <SectionCard title="🏆 Class Performance">
        <table>
          <thead><tr><th>Class</th><th>Category</th></tr></thead>
          <tbody>
            {classes.length === 0
              ? <tr><td colSpan={2} style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-muted)' }}>No classes configured.</td></tr>
              : classes.map(c => (
                <tr key={c._id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td><span className={`badge cat-${c.category}`}>{c.category}</span></td>
                </tr>
              ))}
          </tbody>
        </table>
      </SectionCard>

      {/* Year-over-year comparison */}
      {allYears?.length > 1 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header"><span className="card-title">📊 Year-over-Year Comparison</span></div>
          <div className="table-container">
            <table>
              <thead><tr><th>VBS Year</th><th>Title</th><th>Start</th><th>End</th><th>Active</th></tr></thead>
              <tbody>
                {allYears.map(y => (
                  <tr key={y._id} style={{ background: y.year === vbsYear ? 'rgba(26,47,94,0.04)' : undefined }}>
                    <td style={{ fontWeight: y.year === vbsYear ? 700 : 400 }}>{y.year}</td>
                    <td>{y.vbsTitle || '—'}</td>
                    <td style={{ fontSize: '0.82rem' }}>{fmtDate(y.dates?.startDate)}</td>
                    <td style={{ fontSize: '0.82rem' }}>{fmtDate(y.dates?.endDate)}</td>
                    <td>{y.isActive ? <span className="badge badge-green">LIVE</span> : y.year === vbsYear ? <span className="badge badge-navy">Viewing</span> : <span className="badge badge-gray">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   4. TEACHER REPORT
═══════════════════════════════════════════════════════════════════ */
function TeacherReport({ teacherId, vbsYear }) {
  const { data, isLoading } = useQuery({
    queryKey: ['report-teacher', teacherId, vbsYear],
    queryFn: () => reportsAPI.getTeacher(teacherId),
    enabled: !!teacherId && !!vbsYear,
    select: d => d.data?.data,
  });

  if (!teacherId) return <Alert type="info">Select a teacher above to view their report.</Alert>;
  if (isLoading) return <LoadingPage />;
  if (!data) return <Alert type="warning">No data for this teacher.</Alert>;

  const { teacher, submissions, ownAttendance } = data;

  const handlePrint = () => {
    const sum = mkSummary([
      { l: 'Class', v: teacher?.classAssigned?.name || 'Unassigned' },
      { l: 'Days Submitted', v: submissions?.total ?? 0 },
      { l: 'Expected Days', v: submissions?.expectedDays ?? 0 },
      { l: 'Submission Rate', v: `${submissions?.submissionRate ?? 0}%` },
      { l: 'Days Present', v: ownAttendance?.present ?? 0 },
      { l: 'Attendance Rate', v: `${ownAttendance?.rate ?? 0}%` },
    ]);
    const rows = (submissions?.history || []).map(s => `<tr><td>${fmtDate(s.date)}</td><td>${s.submittedByName || '—'}</td><td>${s.records?.length ?? 0} students</td><td>${s.isModified ? 'Modified' : 'Original'}</td></tr>`).join('');
    print(`Teacher Report — ${teacher?.name}`, mkTable(['Date', 'Submitted By', 'Students', 'Status'], rows), sum, vbsYear);
  };

  return (
    <div>
      {/* Teacher info card */}
      <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{teacher?.name}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
              Class: <strong>{teacher?.classAssigned?.name || 'Unassigned'}</strong>
              {teacher?.classAssigned && <> · Category: <strong>{teacher.classAssigned.category}</strong></>}
              {' · '}Contact: {teacher?.contactNumber || '—'}
              {teacher?.qualification && <> · {teacher.qualification}</>}
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handlePrint}><Printer size={13} /> Print</button>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        {/* Submission stats */}
        <div className="card">
          <div className="card-header"><span className="card-title">📋 Student Attendance Submissions</span></div>
          <div className="card-body">
            {[{ label: 'Days Submitted', value: submissions?.total, color: '#3b82f6' },
              { label: 'Expected Days', value: submissions?.expectedDays, color: '#8b5cf6' },
              { label: 'Submission Rate', value: `${submissions?.submissionRate ?? 0}%`, color: submissions?.submissionRate >= 80 ? '#16a34a' : '#dc2626' }].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--color-border-light)' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{s.label}</span>
                <span style={{ fontWeight: 700, color: s.color }}>{s.value ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Own attendance */}
        <div className="card">
          <div className="card-header"><span className="card-title">📅 Teacher's Own Attendance</span></div>
          <div className="card-body">
            {[{ label: 'Days Present', value: ownAttendance?.present, color: '#16a34a' },
              { label: 'Days Absent', value: ownAttendance?.absent, color: '#dc2626' },
              { label: 'Late', value: ownAttendance?.late, color: '#d97706' },
              { label: 'Attendance Rate', value: `${ownAttendance?.rate ?? 0}%`, color: ownAttendance?.rate >= 80 ? '#16a34a' : '#dc2626' }].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--color-border-light)' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{s.label}</span>
                <span style={{ fontWeight: 700, color: s.color }}>{s.value ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Submission history */}
      <SectionCard title="📁 Submission History">
        <table>
          <thead><tr><th>Date</th><th>Submitted By</th><th>Students</th><th>Status</th></tr></thead>
          <tbody>
            {(submissions?.history || []).length === 0
              ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-muted)' }}>No submissions recorded.</td></tr>
              : (submissions?.history || []).map((s, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{fmtDate(s.date)}</td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{s.submittedByName || '—'}</td>
                  <td style={{ fontSize: '0.82rem' }}>{s.records?.length ?? 0} students</td>
                  <td>{s.isModified ? <span className="badge badge-orange">Modified</span> : <span className="badge badge-green">Original</span>}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   5. STUDENT REPORT
═══════════════════════════════════════════════════════════════════ */
function StudentReport({ vbsYear }) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const { data: students } = useQuery({
    queryKey: ['students-search', search, vbsYear],
    queryFn: () => studentsAPI.getAll({ search, limit: 20, vbsYear }),
    select: d => d.data?.data || [],
    enabled: search.length >= 2 && !!vbsYear,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['report-student', selectedId, vbsYear],
    queryFn: () => reportsAPI.getStudent(selectedId),
    enabled: !!selectedId && !!vbsYear,
    select: d => d.data?.data,
  });

  if (!selectedId) return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label className="form-label">Search Student</label>
        <input className="form-input" style={{ width: 300 }} placeholder="Type name or student ID…"
          value={search} onChange={e => { setSearch(e.target.value); setShowSearch(true); }} />
        {showSearch && search.length >= 2 && (students || []).length > 0 && (
          <div style={{ position: 'absolute', zIndex: 50, background: 'white', border: '1px solid var(--color-border)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', width: 300, marginTop: 4, maxHeight: 240, overflowY: 'auto' }}>
            {students.map(s => (
              <button key={s._id} onClick={() => { setSelectedId(s._id); setSearch(`${s.name} (${s.studentId})`); setShowSearch(false); }}
                style={{ display: 'block', width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)', fontSize: '0.845rem', borderBottom: '1px solid var(--color-border-light)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <div style={{ fontWeight: 600 }}>{s.name}</div>
                <div style={{ fontSize: '0.73rem', color: 'var(--color-text-secondary)' }}>{s.studentId} · {s.grade} · {s.village}</div>
              </button>
            ))}
          </div>
        )}
      </div>
      <Alert type="info">Type at least 2 characters to search for a student.</Alert>
    </div>
  );

  if (isLoading) return <LoadingPage />;
  if (!data) return <Alert type="warning">No data for this student.</Alert>;

  const { student, attendance } = data;

  const handlePrint = () => {
    const sum = mkSummary([
      { l: 'Grade', v: student?.grade },
      { l: 'Category', v: student?.category },
      { l: 'Class', v: student?.classAssigned?.name || 'Unassigned' },
      { l: 'Present', v: attendance?.present ?? 0 },
      { l: 'Absent', v: attendance?.absent ?? 0 },
      { l: 'Rate', v: `${attendance?.rate ?? 0}%` },
    ]);
    const rows = (attendance?.history || []).map(h => `<tr><td>${fmtDate(h.date)}</td><td>${h.status}</td><td>${h.isModified ? 'Modified' : 'Original'}</td></tr>`).join('');
    print(`Student Report — ${student?.name}`, mkTable(['Date', 'Status', 'Record'], rows), sum, vbsYear);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedId(''); setSearch(''); }}>← Back to Search</button>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{student?.name} <span className="code" style={{ fontSize: '0.8rem' }}>{student?.studentId}</span></div>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
              Grade {student?.grade} · <span className={`badge cat-${student?.category}`}>{student?.category}</span>
              {' · '}{student?.gender} · {student?.village || '—'}
              {student?.classAssigned && <> · Class: <strong>{student.classAssigned.name}</strong></>}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: 3 }}>
              Parent: {student?.parentName || '—'} · Contact: {student?.contactNumber || '—'}
              {student?.schoolName && <> · School: {student.schoolName}</>}
              {student?.religion && <> · {student.religion}{student?.christianDenomination ? ` (${student.christianDenomination})` : ''}</>}
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handlePrint}><Printer size={13} /> Print</button>
        </div>
      </div>

      <StatRow items={[
        { label: 'Days Present', value: attendance?.present, color: '#16a34a' },
        { label: 'Days Absent', value: attendance?.absent, color: '#dc2626' },
        { label: 'Total Days', value: attendance?.total, color: '#3b82f6' },
        { label: 'Attendance Rate', value: `${attendance?.rate ?? 0}%`, color: attendance?.rate >= 80 ? '#16a34a' : attendance?.rate >= 60 ? '#d97706' : '#dc2626' },
      ]} />

      <SectionCard title="📅 Complete Attendance History">
        <table>
          <thead><tr><th>Date</th><th>Status</th><th>Record</th></tr></thead>
          <tbody>
            {(attendance?.history || []).length === 0
              ? <tr><td colSpan={3} style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-muted)' }}>No attendance records.</td></tr>
              : (attendance?.history || []).map((h, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{fmtDate(h.date)}</td>
                  <td><span className={`badge ${h.status === 'present' ? 'badge-green' : 'badge-red'}`}>{h.status === 'present' ? '✓ Present' : '✗ Absent'}</span></td>
                  <td>{h.isModified ? <span className="badge badge-orange">Modified</span> : <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Original</span>}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   6. VILLAGE REPORT
═══════════════════════════════════════════════════════════════════ */
function VillageReport({ vbsYear }) {
  const [village, setVillage] = useState('');
  const [queried, setQueried] = useState('');

  const { data: villageList } = useQuery({
    queryKey: ['village-list', vbsYear],
    queryFn: () => api.get('/reports/villages', { params: { vbsYear } }).then(r => r.data?.data || []),
    enabled: !!vbsYear,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['report-village', queried, vbsYear],
    queryFn: () => api.get('/reports/village', { params: { village: queried, vbsYear } }).then(r => r.data?.data),
    enabled: !!queried && !!vbsYear,
  });

  if (!queried) return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'flex-end' }}>
        <div>
          <label className="form-label">Select Village</label>
          <select className="form-select" style={{ width: 260 }} value={village} onChange={e => setVillage(e.target.value)}>
            <option value="">Choose a village…</option>
            {(villageList || []).map(v => <option key={v.village || v._id} value={v.village || v._id}>{v.village || v._id} ({v.count} students)</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => setQueried(village)} disabled={!village}>View Report</button>
      </div>
      <Alert type="info">Select a village from the dropdown to see its report.</Alert>
    </div>
  );

  if (isLoading) return <LoadingPage />;
  if (!data) return <Alert type="warning">No data found for this village.</Alert>;

  const gradeMap = {};
  const catMap = {};
  const genderMap = {};
  (data.students || []).forEach(s => {
    gradeMap[s.grade] = (gradeMap[s.grade] || 0) + 1;
    catMap[s.category] = (catMap[s.category] || 0) + 1;
    genderMap[s.gender] = (genderMap[s.gender] || 0) + 1;
  });

  const handlePrint = () => {
    const sum = mkSummary([
      { l: 'Village', v: queried },
      { l: 'Total Students', v: data.totalStudents ?? 0 },
      { l: 'Student Rate', v: `${data.stats?.attendance?.rate ?? 0}%` },
    ]);
    const rows = (data.students || []).map(s => `<tr><td>${s.studentId || '—'}</td><td>${s.name}</td><td>${s.grade}</td><td>${s.category}</td><td>${s.gender}</td><td>${s.classAssigned?.name || '—'}</td><td>${s.attendance?.rate ?? 0}%</td></tr>`).join('');
    print(`Village Report — ${queried}`, mkTable(['ID', 'Name', 'Grade', 'Category', 'Gender', 'Class', 'Rate'], rows), sum, vbsYear);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => { setQueried(''); setVillage(''); }}>← Change Village</button>
        <span style={{ fontWeight: 700, fontSize: '1rem' }}>📍 {queried}</span>
        <button className="btn btn-secondary btn-sm" onClick={handlePrint} style={{ marginLeft: 'auto' }}><Printer size={13} /> Print</button>
      </div>

      <StatRow items={[
        { label: 'Total Students', value: data.totalStudents, color: '#3b82f6' },
        { label: 'Attendance Rate', value: `${data.stats?.attendance?.rate ?? 0}%`, color: '#10b981' },
      ]} />

      {/* Demographics breakdown */}
      <div className="grid-3" style={{ marginBottom: 16 }}>
        <div className="card"><div className="card-header"><span className="card-title">Grade</span></div>
          <div className="card-body" style={{ padding: '10px 16px' }}>
            {Object.entries(gradeMap).sort().map(([g, c]) => (
              <div key={g} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--color-border-light)', fontSize: '0.845rem' }}>
                <span>{['PreKG', 'LKG', 'UKG'].includes(g) ? g : `Grade ${g}`}</span><span style={{ fontWeight: 700 }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card"><div className="card-header"><span className="card-title">Category</span></div>
          <div className="card-body" style={{ padding: '10px 16px' }}>
            {Object.entries(catMap).map(([c, n]) => (
              <div key={c} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--color-border-light)', fontSize: '0.845rem' }}>
                <CategoryBadge category={c} /><span style={{ fontWeight: 700 }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card"><div className="card-header"><span className="card-title">Gender</span></div>
          <div className="card-body" style={{ padding: '10px 16px' }}>
            {Object.entries(genderMap).map(([g, n]) => (
              <div key={g} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--color-border-light)', fontSize: '0.845rem', textTransform: 'capitalize' }}>
                <span>{g}</span><span style={{ fontWeight: 700 }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SectionCard title="👥 Students from This Village">
        <table>
          <thead><tr><th>Student ID</th><th>Name</th><th>Grade</th><th>Category</th><th>Gender</th><th>Class</th><th>Contact</th><th>Rate</th></tr></thead>
          <tbody>
            {(data.students || []).map(s => (
              <tr key={s._id}>
                <td><span className="code" style={{ fontSize: '0.75rem' }}>{s.studentId || '—'}</span></td>
                <td style={{ fontWeight: 600 }}>{s.name}</td>
                <td>{s.grade}</td>
                <td><CategoryBadge category={s.category} /></td>
                <td style={{ textTransform: 'capitalize', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{s.gender}</td>
                <td>{s.classAssigned?.name ? <span className="badge badge-navy">{s.classAssigned.name}</span> : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>—</span>}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{s.contactNumber || '—'}</td>
                <td><RateBar rate={s.attendance?.rate ?? 0} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   7. VOLUNTEER REPORT
═══════════════════════════════════════════════════════════════════ */
function VolunteerReport({ volunteerId, vbsYear }) {
  const { data, isLoading } = useQuery({
    queryKey: ['report-volunteer', volunteerId, vbsYear],
    queryFn: () => reportsAPI.getVolunteer(volunteerId),
    enabled: !!volunteerId && !!vbsYear,
    select: d => d.data?.data,
  });

  if (!volunteerId) return <Alert type="info">Select a volunteer above to view their report.</Alert>;
  if (isLoading) return <LoadingPage />;
  if (!data) return <Alert type="warning">No data for this volunteer.</Alert>;

  const { volunteer, attendance } = data;

  const handlePrint = () => {
    const sum = mkSummary([
      { l: 'Role', v: volunteer?.role || '—' },
      { l: 'Shift', v: volunteer?.shift || '—' },
      { l: 'Present', v: attendance?.present ?? 0 },
      { l: 'Half Day', v: attendance?.halfDay ?? 0 },
      { l: 'Absent', v: attendance?.absent ?? 0 },
      { l: 'Rate', v: `${attendance?.rate ?? 0}%` },
    ]);
    const rows = (attendance?.history || []).map(h => `<tr><td>${fmtDate(h.date)}</td><td>${h.status}</td><td>${h.checkInTime || '—'}</td><td>${h.checkOutTime || '—'}</td><td>${h.shift || '—'}</td></tr>`).join('');
    print(`Volunteer Report — ${volunteer?.name}`, mkTable(['Date', 'Status', 'Check-in', 'Check-out', 'Shift'], rows), sum, vbsYear);
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{volunteer?.name}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
              Role: <strong>{volunteer?.role || '—'}</strong>
              {volunteer?.shift && <> · Shift: <strong>{volunteer.shift}</strong></>}
              {' · '}Contact: {volunteer?.contactNumber || '—'}
              {volunteer?.email && <> · {volunteer.email}</>}
              {volunteer?.notes && <> · Notes: {volunteer.notes}</>}
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handlePrint}><Printer size={13} /> Print</button>
        </div>
      </div>

      <StatRow items={[
        { label: 'Days Present', value: attendance?.present, color: '#16a34a' },
        { label: 'Half Days', value: attendance?.halfDay, color: '#ea580c' },
        { label: 'Days Absent', value: attendance?.absent, color: '#dc2626' },
        { label: 'Total Records', value: attendance?.total, color: '#3b82f6' },
        { label: 'Attendance Rate', value: `${attendance?.rate ?? 0}%`, color: attendance?.rate >= 80 ? '#16a34a' : '#dc2626' },
      ]} />

      <SectionCard title="📅 Complete Attendance History">
        <table>
          <thead><tr><th>Date</th><th>Status</th><th>Shift</th><th>Check-in</th><th>Check-out</th><th>Remarks</th></tr></thead>
          <tbody>
            {(attendance?.history || []).length === 0
              ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-muted)' }}>No attendance records.</td></tr>
              : (attendance?.history || []).map((h, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{fmtDate(h.date)}</td>
                  <td><span className={`badge ${h.status === 'present' ? 'badge-green' : h.status === 'halfDay' ? 'badge-orange' : 'badge-red'}`}>{h.status}</span></td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{h.shift || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{h.checkInTime || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{h.checkOutTime || '—'}</td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>{h.remarks || '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   8. CATEGORY REPORT
═══════════════════════════════════════════════════════════════════ */
function CategoryReport({ vbsYear }) {
  const [category, setCategory] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['report-category', category, vbsYear],
    queryFn: () => api.get(`/reports/category/${category}`, { params: { vbsYear } }).then(r => r.data?.data),
    enabled: !!category && !!vbsYear,
  });

  const CATS = ['Beginner', 'Primary', 'Junior', 'Inter'];

  if (!category) return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {CATS.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className={`btn ${category === c ? 'btn-primary' : 'btn-secondary'}`}>
            {c}
          </button>
        ))}
      </div>
      <Alert type="info">Select a category above to view the report.</Alert>
    </div>
  );

  if (isLoading) return <LoadingPage />;
  if (!data) return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {CATS.map(c => <button key={c} onClick={() => setCategory(c)} className={`btn ${c === category ? 'btn-primary' : 'btn-secondary'}`}>{c}</button>)}
      </div>
      <Alert type="warning">No data for {category} category in VBS {vbsYear}.</Alert>
    </div>
  );

  const gradeMap = {};
  const genderMap = {};
  const classMap = {};
  (data.students || []).forEach(s => {
    gradeMap[s.grade] = (gradeMap[s.grade] || 0) + 1;
    genderMap[s.gender] = (genderMap[s.gender] || 0) + 1;
    const cn = s.classAssigned?.name || 'Unassigned';
    classMap[cn] = (classMap[cn] || 0) + 1;
  });

  const handlePrint = () => {
    const sum = mkSummary([
      { l: 'Category', v: category },
      { l: 'Students', v: data.totalStudents ?? 0 },
      { l: 'Classes', v: data.totalClasses ?? 0 },
      { l: 'Rate', v: `${data.stats?.attendance?.rate ?? 0}%` },
    ]);
    const rows = (data.students || []).map(s => `<tr><td>${s.studentId || '—'}</td><td>${s.name}</td><td>${s.grade}</td><td>${s.gender}</td><td>${s.village || '—'}</td><td>${s.classAssigned?.name || '—'}</td><td>${s.attendance?.rate ?? 0}%</td></tr>`).join('');
    print(`Category Report — ${category}`, mkTable(['ID', 'Name', 'Grade', 'Gender', 'Village', 'Class', 'Rate'], rows), sum, vbsYear);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {CATS.map(c => <button key={c} onClick={() => setCategory(c)} className={`btn ${c === category ? 'btn-primary' : 'btn-secondary'}`}>{c}</button>)}
      </div>

      <StatRow items={[
        { label: 'Total Students', value: data.totalStudents, color: '#3b82f6' },
        { label: 'Total Classes', value: data.totalClasses, color: '#8b5cf6' },
        { label: 'Attendance Rate', value: `${data.stats?.attendance?.rate ?? 0}%`, color: '#10b981' },
      ]} />

      {/* Demographics */}
      <div className="grid-3" style={{ marginBottom: 16 }}>
        <div className="card"><div className="card-header"><span className="card-title">Grade Distribution</span></div>
          <div className="card-body" style={{ padding: '10px 16px' }}>
            {Object.entries(gradeMap).sort().map(([g, c]) => (
              <div key={g} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--color-border-light)', fontSize: '0.845rem' }}>
                <span>{['PreKG', 'LKG', 'UKG'].includes(g) ? g : `Grade ${g}`}</span><span style={{ fontWeight: 700 }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card"><div className="card-header"><span className="card-title">Gender Distribution</span></div>
          <div className="card-body" style={{ padding: '10px 16px' }}>
            {Object.entries(genderMap).map(([g, c]) => (
              <div key={g} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--color-border-light)', fontSize: '0.845rem', textTransform: 'capitalize' }}>
                <span>{g}</span><span style={{ fontWeight: 700 }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card"><div className="card-header"><span className="card-title">Class Distribution</span></div>
          <div className="card-body" style={{ padding: '10px 16px' }}>
            {Object.entries(classMap).map(([c, n]) => (
              <div key={c} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--color-border-light)', fontSize: '0.845rem' }}>
                <span>{c}</span><span style={{ fontWeight: 700 }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SectionCard title={`👥 ${category} Students`} action={
        <button className="btn btn-secondary btn-sm" onClick={handlePrint}><Printer size={13} /> Print</button>
      }>
        <table>
          <thead><tr><th>Student ID</th><th>Name</th><th>Grade</th><th>Gender</th><th>Village</th><th>Class</th><th>Contact</th><th>Rate</th></tr></thead>
          <tbody>
            {(data.students || []).length === 0
              ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-muted)' }}>No students in this category for VBS {vbsYear}.</td></tr>
              : (data.students || []).map(s => (
                <tr key={s._id}>
                  <td><span className="code" style={{ fontSize: '0.75rem' }}>{s.studentId || '—'}</span></td>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>{s.grade}</td>
                  <td style={{ textTransform: 'capitalize', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{s.gender}</td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{s.village || '—'}</td>
                  <td>{s.classAssigned?.name ? <span className="badge badge-navy">{s.classAssigned.name}</span> : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>—</span>}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{s.contactNumber || '—'}</td>
                  <td><RateBar rate={s.attendance?.rate ?? 0} /></td>
                </tr>
              ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════ */
const REPORT_TYPES = [
  { id: 'daily',     label: 'Daily',     icon: Calendar,      desc: 'All classes on a specific date' },
  { id: 'class',     label: 'Class',     icon: BookOpen,      desc: 'Per-student class breakdown' },
  { id: 'full-year', label: 'Full Year', icon: FileText,      desc: 'Complete VBS statistics' },
  { id: 'teacher',   label: 'Teacher',   icon: GraduationCap, desc: 'Submissions & attendance' },
  { id: 'student',   label: 'Student',   icon: Users,         desc: 'Individual attendance history' },
  { id: 'village',   label: 'Village',   icon: MapPin,        desc: 'Students by village' },
  { id: 'volunteer', label: 'Volunteer', icon: Heart,         desc: 'Volunteer attendance history' },
  { id: 'category',  label: 'Category',  icon: BookOpen,      desc: 'Beginner/Primary/Junior/Inter' },
];

export default function ReportsPage() {
  const { vbsYear, activeYear, allYears } = useActiveYear();
  const [activeReport, setActiveReport] = useState('daily');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedVol, setSelectedVol] = useState('');

  const { data: classes } = useQuery({
    queryKey: ['classes', vbsYear],
    queryFn: () => classesAPI.getAll({ year: vbsYear }),
    select: d => d.data?.data || [],
    enabled: !!vbsYear,
  });
  const { data: teachers } = useQuery({
    queryKey: ['teachers-list', vbsYear],
    queryFn: () => teachersAPI.getAll({ isActive: true }),
    select: d => d.data?.data || [],
    enabled: !!vbsYear,
  });
  const { data: volunteers } = useQuery({
    queryKey: ['vol-list', vbsYear],
    queryFn: () => volunteersAPI.getAll(),
    select: d => d.data?.data || [],
    enabled: !!vbsYear,
  });

  if (!vbsYear) return <NoYearState />;

  const handleTypeChange = (id) => {
    setActiveReport(id);
    setSelectedClass('');
    setSelectedTeacher('');
    setSelectedVol('');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Generate detailed reports · <Printer size={13} style={{ verticalAlign: 'middle' }} /> prints as PDF</p>
        </div>
      </div>

      <YearBanner vbsYear={vbsYear} activeYear={activeYear} />

      {/* Report type tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {REPORT_TYPES.map(rt => {
          const Icon = rt.icon;
          const active = activeReport === rt.id;
          return (
            <button key={rt.id} onClick={() => handleTypeChange(rt.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`, background: active ? 'var(--color-primary)' : 'white', color: active ? 'white' : 'var(--color-text)', cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.15s' }}>
              <Icon size={14} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{rt.label}</div>
                <div style={{ fontSize: '0.68rem', opacity: 0.75, lineHeight: 1.2 }}>{rt.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selector bar — shown for relevant report types */}
      {['daily', 'class', 'teacher', 'volunteer'].includes(activeReport) && (
        <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {activeReport === 'daily' && (
              <div>
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 200 }} />
              </div>
            )}
            {activeReport === 'class' && (
              <div>
                <label className="form-label">Class — VBS {vbsYear}</label>
                <select className="form-select" style={{ width: 260 }} value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                  <option value="">Choose a class…</option>
                  {(classes || []).map(c => <option key={c._id} value={c._id}>{c.name} ({c.category})</option>)}
                </select>
              </div>
            )}
            {activeReport === 'teacher' && (
              <div>
                <label className="form-label">Teacher</label>
                <select className="form-select" style={{ width: 260 }} value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)}>
                  <option value="">Choose a teacher…</option>
                  {(teachers || []).map(t => <option key={t._id} value={t._id}>{t.name}{t.classAssigned?.name ? ` — ${t.classAssigned.name}` : ''}</option>)}
                </select>
              </div>
            )}
            {activeReport === 'volunteer' && (
              <div>
                <label className="form-label">Volunteer</label>
                <select className="form-select" style={{ width: 260 }} value={selectedVol} onChange={e => setSelectedVol(e.target.value)}>
                  <option value="">Choose a volunteer…</option>
                  {(volunteers || []).map(v => <option key={v._id} value={v._id}>{v.name} — {v.role}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report panels */}
      {activeReport === 'daily'     && <DailyReport date={date} vbsYear={vbsYear} />}
      {activeReport === 'class'     && <ClassReport classId={selectedClass} vbsYear={vbsYear} />}
      {activeReport === 'full-year' && <FullYearReport vbsYear={vbsYear} allYears={allYears} />}
      {activeReport === 'teacher'   && <TeacherReport teacherId={selectedTeacher} vbsYear={vbsYear} />}
      {activeReport === 'student'   && <StudentReport vbsYear={vbsYear} />}
      {activeReport === 'village'   && <VillageReport vbsYear={vbsYear} />}
      {activeReport === 'volunteer' && <VolunteerReport volunteerId={selectedVol} vbsYear={vbsYear} />}
      {activeReport === 'category'  && <CategoryReport vbsYear={vbsYear} />}
    </div>
  );
}