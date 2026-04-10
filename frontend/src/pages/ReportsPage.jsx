import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText, Calendar, BookOpen, GraduationCap, Heart,
  MapPin, Users, Printer, ChevronDown, ChevronUp
} from 'lucide-react';
import { reportsAPI, classesAPI, teachersAPI, volunteersAPI, studentsAPI, settingsAPI } from '../services/api';
import api from '../services/api';
import { useActiveYear } from '../contexts/ActiveYearContext';
import { LoadingPage, Alert, CategoryBadge } from '../components/common';
import DateInput from '../components/Dateinput';
import { format } from 'date-fns';
import { FullYearReport } from './Fullyearreport';

/* ─── Helpers ─────────────────────────────────────────────────────── */
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateFull = d => d ? new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : '—';

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

/* ─── Print helper ─────────────────────────────────────────────────── */
const printPage = (title, body, summary = '', vbsYear = '') => {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
  <style>
    @page{size:A4;margin:14mm}*{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:9.5pt;color:#111}
    .hdr{border-bottom:2.5px solid #1a2f5e;padding-bottom:10px;margin-bottom:12px}
    .hdr-top{display:flex;align-items:center;gap:12px;margin-bottom:4px}
    .hdr-logo{width:42px;height:42px;object-fit:contain;flex-shrink:0;border-radius:6px}
    .church-name{font-size:13pt;font-weight:800;color:#1a2f5e;line-height:1.2}
    .church-sub{font-size:7.5pt;color:#666;margin-top:1px}
    .rpt{font-size:10.5pt;font-weight:700;color:#c8922a;margin-top:5px}
    .sm{display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap}
    .sc{border:1px solid #ddd;border-radius:5px;padding:7px 12px}
    .sc .n{font-size:15pt;font-weight:800;color:#1a2f5e}
    .sc .l{font-size:7.5pt;color:#555;text-transform:uppercase;margin-top:1px}
    table{width:100%;border-collapse:collapse}
    th{background:#1a2f5e;color:#fff;padding:5px 7px;text-align:left;font-size:7.5pt;font-weight:700}
    td{padding:4px 7px;border-bottom:1px solid #e8edf2;font-size:8.5pt}
    tr:nth-child(even)td{background:#f9fafb}
    .section-head{background:#e8edf2;padding:8px 12px;margin:16px 0 8px;font-weight:800;color:#1a2f5e;border-left:4px solid #1a2f5e;font-size:9.5pt}
    .class-block{margin-bottom:20px;page-break-inside:avoid}
    .class-header{background:#1a2f5e;color:white;padding:8px 12px;font-weight:700;font-size:9pt;display:flex;justify-content:space-between}
    .ftr{margin-top:14px;font-size:7.5pt;color:#888;border-top:1px solid #ddd;padding-top:7px;display:flex;justify-content:space-between}
    @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
  </style></head><body>
  <div class="hdr">
    <div class="hdr-top">
      <img class="hdr-logo" src="/poj-logo.png" alt="POJ" onerror="this.style.display='none'" />
      <div>
        <div class="church-name">Presence of Jesus Ministry, Tiruchirappalli</div>
        <div class="church-sub">Tamil Nadu, India</div>
      </div>
    </div>
    <div class="rpt">${title}${vbsYear ? ` — VBS ${vbsYear}` : ''}</div>
  </div>
  ${summary}${body}
  <div class="ftr">
    <span>VBS Management System</span>
    <span>Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</span>
  </div>
  </body></html>`);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 500);
};

const mkSummary = items => `<div class="sm">${items.map(i => `<div class="sc"><div class="n">${i.v}</div><div class="l">${i.l}</div></div>`).join('')}</div>`;
const mkTable = (heads, rows) => `<table><thead><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;

/* ─── Shared ─────────────────────────────────────────────────────── */
function NoYearState() {
  return (
    <div className="empty-state">
      <Calendar size={36} style={{ color: 'var(--color-text-muted)' }} />
      <h3>No VBS Year Selected</h3>
      <p>Use the year selector in the top bar to choose a year.</p>
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

/* ─── Collapsible Class Student List ─────────────────────────────── */
function ClassStudentList({ rec, dayLabel = 'Day' }) {
  const [expanded, setExpanded] = useState(false);
  const present = rec.records?.filter(r => r.status === 'present').length || 0;
  const absent = rec.records?.filter(r => r.status === 'absent').length || 0;
  const total = present + absent;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: 'var(--color-bg)', cursor: 'pointer',
          gap: 12, flexWrap: 'wrap',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{rec.class?.name}</span>
          <span className={`badge cat-${rec.class?.category}`}>{rec.class?.category}</span>
          {rec.isModified && <span className="badge badge-orange">Modified</span>}
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.82rem' }}>✓ {present}</span>
          <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.82rem' }}>✗ {absent}</span>
          <RateBar rate={rate} />
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>by {rec.submittedByName}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>
      {expanded && (
        <div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '7px 12px', textAlign: 'left', fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', background: 'white', borderBottom: '1px solid var(--color-border)' }}>#</th>
                <th style={{ padding: '7px 12px', textAlign: 'left', fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', background: 'white', borderBottom: '1px solid var(--color-border)' }}>Student ID</th>
                <th style={{ padding: '7px 12px', textAlign: 'left', fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', background: 'white', borderBottom: '1px solid var(--color-border)' }}>Name</th>
                <th style={{ padding: '7px 12px', textAlign: 'left', fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', background: 'white', borderBottom: '1px solid var(--color-border)' }}>Grade</th>
                <th style={{ padding: '7px 12px', textAlign: 'left', fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', background: 'white', borderBottom: '1px solid var(--color-border)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(rec.records || []).map((r, idx) => (
                <tr key={idx} style={{ background: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                  <td style={{ padding: '6px 12px', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                  <td style={{ padding: '6px 12px' }}><span className="code" style={{ fontSize: '0.75rem' }}>{r.student?.studentId || '—'}</span></td>
                  <td style={{ padding: '6px 12px', fontWeight: 600, fontSize: '0.845rem' }}>{r.student?.name || '—'}</td>
                  <td style={{ padding: '6px 12px', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                    {['PreKG', 'LKG', 'UKG'].includes(r.student?.grade) ? r.student?.grade : r.student?.grade ? `Std ${r.student.grade}` : '—'}
                  </td>
                  <td style={{ padding: '6px 12px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700, background: r.status === 'present' ? '#dcfce7' : '#fee2e2', color: r.status === 'present' ? '#15803d' : '#b91c1c' }}>
                      {r.status === 'present' ? '✓ Present' : '✗ Absent'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════ 1. DAILY REPORT ════════════════════════════════ */
function DailyReport({ date, vbsYear, vbsStartDate, vbsEndDate }) {
  const { data, isLoading } = useQuery({
    queryKey: ['report-daily', date, vbsYear],
    queryFn: () => reportsAPI.getDaily({ date, vbsYear }),
    enabled: !!date && !!vbsYear,
    select: d => d.data?.data,
  });

  if (!date) return <Alert type="info">Select a date above to view the daily report.</Alert>;
  if (isLoading) return <LoadingPage />;
  if (!data) return <Alert type="warning">No data for {fmtDate(date)}.</Alert>;

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

    // Summary table
    const stuSummaryRows = studentAttendance.map(a => {
      const p = a.records?.filter(r => r.status === 'present').length || 0;
      const ab = a.records?.filter(r => r.status === 'absent').length || 0;
      const t = p + ab;
      return `<tr><td>${a.class?.name}</td><td>${a.class?.category}</td><td>${p}</td><td>${ab}</td><td>${t > 0 ? Math.round((p / t) * 100) : 0}%</td><td>${a.submittedByName || '—'}</td><td>${a.isModified ? '⚠ Modified' : '✓ Original'}</td></tr>`;
    }).join('');

    // Classwise student detail blocks
    const classBlocks = studentAttendance.map(a => {
      const p = a.records?.filter(r => r.status === 'present').length || 0;
      const ab = a.records?.filter(r => r.status === 'absent').length || 0;
      const t = p + ab;
      const rate = t > 0 ? Math.round((p / t) * 100) : 0;
      const studentRows = (a.records || []).map((r, i) =>
        `<tr style="background:${i%2===0?'#f9fafb':'white'}">
          <td style="text-align:center;color:#888">${i + 1}</td>
          <td style="font-family:monospace;color:#1a2f5e;font-size:8pt">${r.student?.studentId || '—'}</td>
          <td style="font-weight:600">${r.student?.name || '—'}</td>
          <td style="color:#555">${r.student?.grade || '—'}</td>
          <td><span style="padding:1px 6px;border-radius:3px;font-size:7.5pt;font-weight:700;background:${r.status==='present'?'#dcfce7':'#fee2e2'};color:${r.status==='present'?'#15803d':'#b91c1c'}">${r.status==='present'?'✓ Present':'✗ Absent'}</span></td>
        </tr>`
      ).join('');
      return `<div class="class-block">
        <div class="class-header">
          <span>${a.class?.name} (${a.class?.category})</span>
          <span>Teacher: ${a.submittedByName || '—'} | ✓${p} ✗${ab} ${rate}%</span>
        </div>
        <table><thead><tr><th>#</th><th>Student ID</th><th>Name</th><th>Grade</th><th>Status</th></tr></thead>
        <tbody>${studentRows}</tbody></table>
      </div>`;
    }).join('');

    const tRows = teacherAttendance.map(t => `<tr><td>${t.teacher?.name || '—'}</td><td>${t.status}</td><td>${t.arrivalTime || '—'}</td><td>${t.remarks || '—'}</td></tr>`).join('');
    const vRows = volunteerAttendance.map(v => `<tr><td>${v.volunteer?.name || '—'}</td><td>${v.volunteer?.role || '—'}</td><td>${v.status}</td><td>${v.shift || '—'}</td></tr>`).join('');

    const body = `
      <div class="section-head">Summary by Class</div>
      ${mkTable(['Class', 'Category', 'Present', 'Absent', 'Rate', 'Submitted By', 'Status'], stuSummaryRows)}
      
      ${unsubmittedClasses.length ? `<div style="margin:10px 0;padding:8px 12px;background:#fef3c7;border-left:3px solid #fbbf24;font-size:8.5pt;color:#92400e"><strong>⚠ Pending (${unsubmittedClasses.length}):</strong> ${unsubmittedClasses.map(c => c.name).join(', ')}</div>` : ''}
      
      <div class="section-head">Class-wise Student Attendance</div>
      ${classBlocks}
      
      ${tRows ? `<div class="section-head">Teacher Attendance</div>${mkTable(['Teacher', 'Status', 'Arrival', 'Remarks'], tRows)}` : ''}
      ${vRows ? `<div class="section-head">Volunteer Attendance</div>${mkTable(['Volunteer', 'Role', 'Status', 'Shift'], vRows)}` : ''}
    `;

    printPage(`Daily Attendance — ${fmtDateFull(date)}`, body, sum, vbsYear);
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
          ⚠️ <strong>{unsubmittedClasses.length}</strong> class(es) pending: {unsubmittedClasses.map(c => c.name).join(', ')}
        </Alert>
      )}

      {/* Class summary + expandable student lists */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">📚 Class-wise Attendance</span>
          <button className="btn btn-secondary btn-sm" onClick={handlePrint}><Printer size={13} /> Print All</button>
        </div>
        <div style={{ padding: '14px' }}>
          {studentAttendance.length === 0
            ? <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>No student attendance submitted for this date.</div>
            : studentAttendance.map(rec => (
              <ClassStudentList key={rec._id} rec={rec} />
            ))
          }
        </div>
      </div>

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

/* ═══════════════ 2. CLASS REPORT ════════════════════════════════ */
function ClassReport({ classId, vbsYear }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { data: activeSettings } = useQuery({ queryKey: ['active-settings'], queryFn: () => settingsAPI.getActive().then(r => r.data?.data) });

  const { data, isLoading } = useQuery({
    queryKey: ['report-class', classId, startDate, endDate, vbsYear],
    queryFn: () => reportsAPI.getClass(classId, { startDate: startDate || undefined, endDate: endDate || undefined }),
    enabled: !!classId && !!vbsYear,
    select: d => d.data?.data,
  });

  if (!classId) return <Alert type="info">Select a class above to view its report.</Alert>;
  if (isLoading) return <LoadingPage />;
  if (!data) return <Alert type="warning">No data for this class.</Alert>;

  const handlePrint = () => {
    const sum = mkSummary([
      { l: 'Students', v: data.students?.length ?? 0 },
      { l: 'Days Recorded', v: data.totalDays ?? 0 },
      { l: 'Avg Rate', v: `${data.classAvgRate ?? 0}%` },
      { l: 'Teacher', v: data.class?.teacher?.name || 'Unassigned' },
    ]);
    const rows = (data.students || []).map(s =>
      `<tr><td>${s.studentId || '—'}</td><td>${s.name}</td><td>${s.grade}</td><td>${s.gender}</td><td>${s.village || '—'}</td><td>${s.present}</td><td>${s.absent}</td><td>${s.rate}%</td></tr>`
    ).join('');
    printPage(`Class Report — ${data.class?.name}`, mkTable(['ID', 'Name', 'Grade', 'Gender', 'Village', 'Present', 'Absent', 'Rate'], rows), sum, vbsYear);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 160px' }}>
          <DateInput label="From (optional)" value={startDate} onChange={setStartDate}
            vbsStartDate={activeSettings?.dates?.startDate?.slice(0, 10)}
            vbsEndDate={activeSettings?.dates?.endDate?.slice(0, 10)}
            showVBSDays />
        </div>
        <div style={{ flex: '1 1 160px' }}>
          <DateInput label="To (optional)" value={endDate} onChange={setEndDate}
            min={startDate}
            vbsStartDate={activeSettings?.dates?.startDate?.slice(0, 10)}
            vbsEndDate={activeSettings?.dates?.endDate?.slice(0, 10)}
            showVBSDays />
        </div>
        {(startDate || endDate) && <button className="btn btn-ghost btn-sm" style={{ marginBottom: 1 }} onClick={() => { setStartDate(''); setEndDate(''); }}>✕ Clear</button>}
      </div>

      <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{data.class?.name} <span className={`badge cat-${data.class?.category}`}>{data.class?.category}</span></div>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
              Teacher: <strong>{data.class?.teacher?.name || 'Unassigned'}</strong> · {data.totalDays} days recorded
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handlePrint}><Printer size={13} /> Print</button>
        </div>
      </div>

      <StatRow items={[
        { label: 'Total Students', value: data.students?.length, color: '#3b82f6' },
        { label: 'Days Recorded', value: data.totalDays, color: '#8b5cf6' },
        { label: 'Class Avg Rate', value: `${data.classAvgRate ?? 0}%`, color: data.classAvgRate >= 80 ? '#16a34a' : '#d97706' },
      ]} />

      <SectionCard title="👥 Student Attendance Records">
        <table>
          <thead><tr><th>Student ID</th><th>Name</th><th>Grade</th><th>Gender</th><th>Village</th><th>Contact</th><th>Present</th><th>Absent</th><th>Rate</th></tr></thead>
          <tbody>
            {(data.students || []).map(s => (
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

// /* ═══════════════ 3. FULL YEAR REPORT ════════════════════════════ */
// // Fix 5: Enhanced with student list, class details with student names, attendance records
// function FullYearReport({ vbsYear, allYears }) {
//   const [showStudentList, setShowStudentList] = useState(false);
//   const [showClassDetails, setShowClassDetails] = useState(false);
//   const [showTeacherDetails, setShowTeacherDetails] = useState(false);
//   const [showVolunteerDetails, setShowVolunteerDetails] = useState(false);

//   const { data, isLoading } = useQuery({
//     queryKey: ['report-full-year', vbsYear],
//     queryFn: () => reportsAPI.getFullYear({ vbsYear }),
//     enabled: !!vbsYear,
//     select: d => d.data?.data,
//   });

//   // Fetch students list for the year
//   const { data: studentsData } = useQuery({
//     queryKey: ['all-students-report', vbsYear],
//     queryFn: () => studentsAPI.getAll({ vbsYear, limit: 1000 }),
//     enabled: !!vbsYear && showStudentList,
//     select: d => d.data?.data || [],
//   });

//   // Fetch teachers with attendance
//   const { data: teachersData } = useQuery({
//     queryKey: ['teachers-report', vbsYear],
//     queryFn: () => teachersAPI.getAll({ isActive: true }),
//     enabled: !!vbsYear && showTeacherDetails,
//     select: d => d.data?.data || [],
//   });

//   // Fetch volunteers with attendance
//   const { data: volunteersData } = useQuery({
//     queryKey: ['volunteers-report', vbsYear],
//     queryFn: () => volunteersAPI.getAll({ isActive: true }),
//     enabled: !!vbsYear && showVolunteerDetails,
//     select: d => d.data?.data || [],
//   });

//   // Fetch class details with student-level attendance
//   const { data: classesDetail } = useQuery({
//     queryKey: ['classes-detail-report', vbsYear],
//     queryFn: async () => {
//       const res = await classesAPI.getAll({ year: vbsYear });
//       const classes = res.data?.data || [];
//       // For each class, fetch the class report
//       const details = await Promise.all(
//         classes.map(async cls => {
//           try {
//             const r = await reportsAPI.getClass(cls._id);
//             return r.data?.data;
//           } catch { return null; }
//         })
//       );
//       return details.filter(Boolean);
//     },
//     enabled: !!vbsYear && showClassDetails,
//   });

//   if (isLoading) return <LoadingPage />;
//   if (!data) return <Alert type="warning">No data found for VBS {vbsYear}.</Alert>;

//   const { summary, classes = [], settings } = data;
//   const att = summary?.attendance;

//   const handlePrintFull = () => {
//     const sum = mkSummary([
//       { l: 'Students', v: summary?.totalStudents ?? 0 },
//       { l: 'Teachers', v: summary?.totalTeachers ?? 0 },
//       { l: 'Volunteers', v: summary?.totalVolunteers ?? 0 },
//       { l: 'Classes', v: summary?.totalClasses ?? 0 },
//       { l: 'Student Rate', v: `${att?.students?.rate ?? 0}%` },
//       { l: 'Modifications', v: summary?.modifications ?? 0 },
//     ]);

//     // Classes summary
//     const classRows = (classesDetail || classes).map(c => {
//       const name = c.class?.name || c.name || '—';
//       const cat = c.class?.category || c.category || '—';
//       const teacher = c.class?.teacher?.name || c.teacher?.name || '—';
//       const students = c.students?.length ?? '—';
//       const rate = c.classAvgRate !== undefined ? `${c.classAvgRate}%` : '—';
//       return `<tr><td>${name}</td><td>${cat}</td><td>${teacher}</td><td style="text-align:center">${students}</td><td>${rate}</td></tr>`;
//     }).join('');

//     // Classwise student attendance table
//     const classStudentBlocks = (classesDetail || []).map(cls => {
//       if (!cls?.students?.length) return '';
//       const studentRows = cls.students.map((s, i) =>
//         `<tr style="background:${i%2===0?'#f9fafb':'white'}">
//           <td style="text-align:center;color:#888">${i+1}</td>
//           <td style="font-family:monospace;font-size:8pt;color:#1a2f5e">${s.studentId || '—'}</td>
//           <td style="font-weight:600">${s.name}</td>
//           <td>${s.grade}</td>
//           <td>${s.gender}</td>
//           <td style="color:#15803d;font-weight:700;text-align:center">${s.present}</td>
//           <td style="color:#b91c1c;font-weight:700;text-align:center">${s.absent}</td>
//           <td style="text-align:center">${s.rate}%</td>
//         </tr>`
//       ).join('');
//       return `<div class="class-block">
//         <div class="class-header">
//           <span>${cls.class?.name} (${cls.class?.category})</span>
//           <span>Teacher: ${cls.class?.teacher?.name || '—'} | ${cls.students?.length} students | Avg: ${cls.classAvgRate}%</span>
//         </div>
//         <table><thead><tr><th>#</th><th>Student ID</th><th>Name</th><th>Grade</th><th>Gender</th><th style="text-align:center">Present</th><th style="text-align:center">Absent</th><th style="text-align:center">Rate</th></tr></thead>
//         <tbody>${studentRows}</tbody></table>
//       </div>`;
//     }).join('');

//     // Teacher list
//     const teacherRows = (teachersData || []).map((t, i) =>
//       `<tr style="background:${i%2===0?'#f9fafb':'white'}">
//         <td>${t.name}</td>
//         <td>${t.classAssigned?.name || '—'}</td>
//         <td>${t.contactNumber}</td>
//         <td>${t.qualification || '—'}</td>
//       </tr>`
//     ).join('');

//     // Volunteer list
//     const volRows = (volunteersData || []).map((v, i) =>
//       `<tr style="background:${i%2===0?'#f9fafb':'white'}">
//         <td>${v.name}</td>
//         <td>${v.role}</td>
//         <td>${v.shift || '—'}</td>
//         <td>${v.contactNumber}</td>
//       </tr>`
//     ).join('');

//     const body = `
//       <div class="section-head">Overall Statistics</div>
//       <p style="font-size:8.5pt;color:#555;margin-bottom:8px">${settings?.vbsTitle || ''} · ${fmtDate(settings?.dates?.startDate)} – ${fmtDate(settings?.dates?.endDate)}</p>
      
//       <div class="section-head">Classes Summary</div>
//       ${mkTable(['Class', 'Category', 'Teacher', 'Students', 'Avg Rate'], classRows)}
      
//       ${classStudentBlocks ? `<div class="section-head">Class-wise Student Attendance Details</div>${classStudentBlocks}` : ''}
      
//       ${teacherRows ? `<div class="section-head">Teacher List</div>${mkTable(['Name', 'Class Assigned', 'Contact', 'Qualification'], teacherRows)}` : ''}
      
//       ${volRows ? `<div class="section-head">Volunteer List</div>${mkTable(['Name', 'Role', 'Shift', 'Contact'], volRows)}` : ''}
//     `;

//     printPage(`Full Year Report — VBS ${vbsYear}`, body, sum, vbsYear);
//   };

//   return (
//     <div>
//       <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
//         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
//           <div>
//             <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{settings?.vbsTitle || `VBS ${vbsYear}`}</div>
//             <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: 3 }}>
//               {fmtDate(settings?.dates?.startDate)} — {fmtDate(settings?.dates?.endDate)}
//             </div>
//           </div>
//           <button className="btn btn-secondary btn-sm" onClick={handlePrintFull}><Printer size={13} /> Print Full</button>
//         </div>
//       </div>

//       <StatRow items={[
//         { label: 'Total Students', value: summary?.totalStudents, color: '#3b82f6' },
//         { label: 'Total Teachers', value: summary?.totalTeachers, color: '#8b5cf6' },
//         { label: 'Total Volunteers', value: summary?.totalVolunteers, color: '#10b981' },
//         { label: 'Classes', value: summary?.totalClasses, color: '#f59e0b' },
//       ]} />
//       <StatRow items={[
//         { label: 'Student Rate', value: `${att?.students?.rate ?? 0}%`, color: '#3b82f6' },
//         { label: 'Students Present', value: att?.students?.present, color: '#16a34a' },
//         { label: 'Teachers Present', value: att?.teachers?.present, color: '#8b5cf6' },
//         { label: 'Volunteers Present', value: att?.volunteers?.present, color: '#10b981' },
//         { label: 'Modifications', value: summary?.modifications, color: '#f59e0b' },
//       ]} />

//       {/* ── Student List ── */}
//       <div className="card" style={{ marginBottom: 12 }}>
//         <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setShowStudentList(!showStudentList)}>
//           <span className="card-title">👥 Student Name List ({summary?.totalStudents})</span>
//           <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
//             <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Click to {showStudentList ? 'collapse' : 'expand'}</span>
//             {showStudentList ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
//           </div>
//         </div>
//         {showStudentList && (
//           <div className="table-container">
//             <table>
//               <thead><tr><th>#</th><th>Student ID</th><th>Name</th><th>Grade</th><th>Category</th><th>Gender</th><th>Village</th><th>Class</th></tr></thead>
//               <tbody>
//                 {(studentsData || []).map((s, i) => (
//                   <tr key={s._id}>
//                     <td style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>{i + 1}</td>
//                     <td><span className="code" style={{ fontSize: '0.75rem' }}>{s.studentId || '—'}</span></td>
//                     <td style={{ fontWeight: 600 }}>{s.name}</td>
//                     <td>{s.grade}</td>
//                     <td><span className={`badge cat-${s.category}`}>{s.category}</span></td>
//                     <td style={{ textTransform: 'capitalize', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{s.gender}</td>
//                     <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{s.village || '—'}</td>
//                     <td>{s.classAssigned?.name ? <span className="badge badge-navy">{s.classAssigned.name}</span> : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>—</span>}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>

//       {/* ── Class Details with Student Attendance ── */}
//       <div className="card" style={{ marginBottom: 12 }}>
//         <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setShowClassDetails(!showClassDetails)}>
//           <span className="card-title">🏫 Class Details with Student Attendance ({classes.length} classes)</span>
//           <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
//             <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{showClassDetails ? 'Collapse' : 'Expand (loads data)'}</span>
//             {showClassDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
//           </div>
//         </div>
//         {showClassDetails && (
//           <div style={{ padding: 14 }}>
//             {!classesDetail ? (
//               <div className="loading-center"><div className="spinner" /></div>
//             ) : classesDetail.length === 0 ? (
//               <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-muted)' }}>No class data available.</div>
//             ) : (
//               classesDetail.map(cls => {
//                 if (!cls) return null;
//                 // Build attendance dates headers
//                 const dates = cls.attendanceRecords || [];
//                 return (
//                   <div key={cls.class?._id} style={{ marginBottom: 20, border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
//                     <div style={{ background: 'var(--color-primary)', color: 'white', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
//                       <div>
//                         <span style={{ fontWeight: 800, fontSize: '1rem' }}>{cls.class?.name}</span>
//                         <span style={{ marginLeft: 8, opacity: 0.8, fontSize: '0.82rem' }}>{cls.class?.category}</span>
//                       </div>
//                       <div style={{ display: 'flex', gap: 16, fontSize: '0.82rem', flexWrap: 'wrap' }}>
//                         <span>👨‍🏫 {cls.class?.teacher?.name || 'Unassigned'}</span>
//                         <span>👥 {cls.students?.length} students</span>
//                         <span>📅 {cls.totalDays} days</span>
//                         <span style={{ background: '#fbbf24', color: '#1a1a1a', padding: '1px 8px', borderRadius: 99, fontWeight: 800 }}>{cls.classAvgRate}% avg</span>
//                       </div>
//                     </div>
//                     <div className="table-container">
//                       <table>
//                         <thead>
//                           <tr>
//                             <th>#</th>
//                             <th>Student ID</th>
//                             <th>Name</th>
//                             <th>Grade</th>
//                             {dates.slice(0, 10).map((d, i) => (
//                               <th key={i} style={{ minWidth: 55, textAlign: 'center' }}>
//                                 <div>Day {i + 1}</div>
//                                 <div style={{ fontWeight: 400, opacity: 0.7, fontSize: '0.62rem' }}>
//                                   {new Date(d.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' })}
//                                 </div>
//                               </th>
//                             ))}
//                             <th style={{ textAlign: 'center' }}>Present</th>
//                             <th style={{ textAlign: 'center' }}>Rate</th>
//                           </tr>
//                         </thead>
//                         <tbody>
//                           {(cls.students || []).map((s, idx) => (
//                             <tr key={s._id} style={{ background: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
//                               <td style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>{idx + 1}</td>
//                               <td><span className="code" style={{ fontSize: '0.75rem' }}>{s.studentId || '—'}</span></td>
//                               <td style={{ fontWeight: 600 }}>{s.name}</td>
//                               <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{s.grade}</td>
//                               {dates.slice(0, 10).map((d, di) => {
//                                 const rec = cls.attendanceRecords?.[di];
//                                 const studentRec = rec?.records?.find(r => r.student?._id?.toString() === s._id?.toString() || r.student?.toString() === s._id?.toString());
//                                 return (
//                                   <td key={di} style={{ textAlign: 'center' }}>
//                                     {studentRec ? (
//                                       <span style={{ fontSize: '0.85rem', fontWeight: 700, color: studentRec.status === 'present' ? '#16a34a' : '#dc2626' }}>
//                                         {studentRec.status === 'present' ? '✓' : '✗'}
//                                       </span>
//                                     ) : (
//                                       <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>—</span>
//                                     )}
//                                   </td>
//                                 );
//                               })}
//                               <td style={{ textAlign: 'center' }}><span style={{ color: '#16a34a', fontWeight: 700 }}>{s.present}</span></td>
//                               <td style={{ textAlign: 'center' }}><RateBar rate={s.rate} /></td>
//                             </tr>
//                           ))}
//                         </tbody>
//                       </table>
//                     </div>
//                   </div>
//                 );
//               })
//             )}
//           </div>
//         )}
//       </div>

//       {/* ── Teacher List + Attendance ── */}
//       <div className="card" style={{ marginBottom: 12 }}>
//         <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setShowTeacherDetails(!showTeacherDetails)}>
//           <span className="card-title">👩‍🏫 Teacher List & Attendance ({summary?.totalTeachers})</span>
//           {showTeacherDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
//         </div>
//         {showTeacherDetails && (
//           <div className="table-container">
//             <table>
//               <thead><tr><th>#</th><th>Name</th><th>Class Assigned</th><th>Contact</th><th>Qualification</th><th>Experience</th></tr></thead>
//               <tbody>
//                 {(teachersData || []).map((t, i) => (
//                   <tr key={t._id}>
//                     <td style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>{i + 1}</td>
//                     <td style={{ fontWeight: 600 }}>{t.name}</td>
//                     <td>{t.classAssigned?.name ? <span className="badge badge-blue">{t.classAssigned.name}</span> : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>Unassigned</span>}</td>
//                     <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{t.contactNumber}</td>
//                     <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{t.qualification || '—'}</td>
//                     <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{t.yearsOfExperience ? `${t.yearsOfExperience} yrs` : '—'}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>

//       {/* ── Volunteer List + Attendance ── */}
//       <div className="card" style={{ marginBottom: 12 }}>
//         <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setShowVolunteerDetails(!showVolunteerDetails)}>
//           <span className="card-title">🤝 Volunteer List & Details ({summary?.totalVolunteers})</span>
//           {showVolunteerDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
//         </div>
//         {showVolunteerDetails && (
//           <div className="table-container">
//             <table>
//               <thead><tr><th>#</th><th>Name</th><th>Role</th><th>Shift</th><th>Contact</th><th>Email</th></tr></thead>
//               <tbody>
//                 {(volunteersData || []).map((v, i) => (
//                   <tr key={v._id}>
//                     <td style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>{i + 1}</td>
//                     <td style={{ fontWeight: 600 }}>{v.name}</td>
//                     <td><span className="badge badge-purple">{v.role}</span></td>
//                     <td>{v.shift ? <span className={`badge ${v.shift === 'Morning' ? 'badge-blue' : v.shift === 'Afternoon' ? 'badge-yellow' : 'badge-green'}`}>{v.shift}</span> : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>—</span>}</td>
//                     <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{v.contactNumber}</td>
//                     <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{v.email || '—'}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>

//       {/* Year comparison */}
//       {allYears?.length > 1 && (
//         <div className="card" style={{ marginTop: 16 }}>
//           <div className="card-header"><span className="card-title">📊 Year-over-Year</span></div>
//           <div className="table-container">
//             <table>
//               <thead><tr><th>VBS Year</th><th>Title</th><th>Start</th><th>End</th><th>Active</th></tr></thead>
//               <tbody>
//                 {allYears.map(y => (
//                   <tr key={y._id} style={{ background: y.year === vbsYear ? 'rgba(26,47,94,0.04)' : undefined }}>
//                     <td style={{ fontWeight: y.year === vbsYear ? 700 : 400 }}>{y.year}</td>
//                     <td>{y.vbsTitle || '—'}</td>
//                     <td style={{ fontSize: '0.82rem' }}>{fmtDate(y.dates?.startDate)}</td>
//                     <td style={{ fontSize: '0.82rem' }}>{fmtDate(y.dates?.endDate)}</td>
//                     <td>{y.isActive ? <span className="badge badge-green">LIVE</span> : y.year === vbsYear ? <span className="badge badge-navy">Viewing</span> : <span className="badge badge-gray">—</span>}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

/* ═══════════════ OTHER REPORTS (Teacher, Student, Village, Volunteer, Category) ════ */
// Keep same as original but add DateInput with VBS highlighting where applicable

function TeacherReport({ teacherId, vbsYear }) {
  const { data, isLoading } = useQuery({
    queryKey: ['report-teacher', teacherId, vbsYear],
    queryFn: () => reportsAPI.getTeacher(teacherId),
    enabled: !!teacherId && !!vbsYear,
    select: d => d.data?.data,
  });
  if (!teacherId) return <Alert type="info">Select a teacher above.</Alert>;
  if (isLoading) return <LoadingPage />;
  if (!data) return <Alert type="warning">No data for this teacher.</Alert>;
  const { teacher, submissions, ownAttendance } = data;
  const handlePrint = () => {
    const sum = mkSummary([
      { l: 'Class', v: teacher?.classAssigned?.name || '—' },
      { l: 'Submitted', v: submissions?.total ?? 0 },
      { l: 'Rate', v: `${submissions?.submissionRate ?? 0}%` },
      { l: 'Present', v: ownAttendance?.present ?? 0 },
    ]);
    const rows = (submissions?.history || []).map(s =>
      `<tr><td>${fmtDate(s.date)}</td><td>${s.submittedByName || '—'}</td><td>${s.records?.length ?? 0}</td><td>${s.isModified ? 'Modified' : 'Original'}</td></tr>`
    ).join('');
    printPage(`Teacher Report — ${teacher?.name}`, mkTable(['Date', 'Submitted By', 'Students', 'Status'], rows), sum, vbsYear);
  };
  return (
    <div>
      <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{teacher?.name}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
              Class: <strong>{teacher?.classAssigned?.name || 'Unassigned'}</strong> · {teacher?.contactNumber || '—'}
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handlePrint}><Printer size={13} /> Print</button>
        </div>
      </div>
      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">📋 Submission Stats</span></div>
          <div className="card-body">
            {[{ label: 'Days Submitted', value: submissions?.total, color: '#3b82f6' },
              { label: 'Expected Days', value: submissions?.expectedDays, color: '#8b5cf6' },
              { label: 'Submission Rate', value: `${submissions?.submissionRate ?? 0}%`, color: '#16a34a' }].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--color-border-light)' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{s.label}</span>
                <span style={{ fontWeight: 700, color: s.color }}>{s.value ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">📅 Own Attendance</span></div>
          <div className="card-body">
            {[{ label: 'Present', value: ownAttendance?.present, color: '#16a34a' },
              { label: 'Absent', value: ownAttendance?.absent, color: '#dc2626' },
              { label: 'Late', value: ownAttendance?.late, color: '#d97706' },
              { label: 'Rate', value: `${ownAttendance?.rate ?? 0}%`, color: '#3b82f6' }].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--color-border-light)' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{s.label}</span>
                <span style={{ fontWeight: 700, color: s.color }}>{s.value ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <SectionCard title="📁 Submission History">
        <table>
          <thead><tr><th>Date</th><th>Submitted By</th><th>Students</th><th>Status</th></tr></thead>
          <tbody>
            {(submissions?.history || []).length === 0
              ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-muted)' }}>No submissions yet.</td></tr>
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
      <div style={{ marginBottom: 16, position: 'relative', display: 'inline-block' }}>
        <label className="form-label">Search Student</label>
        <input className="form-input" style={{ width: 300 }} placeholder="Type name or student ID…"
          value={search} onChange={e => { setSearch(e.target.value); setShowSearch(true); }} />
        {showSearch && search.length >= 2 && (students || []).length > 0 && (
          <div style={{ position: 'absolute', zIndex: 50, background: 'white', border: '1px solid var(--color-border)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', width: 300, marginTop: 4, maxHeight: 240, overflowY: 'auto' }}>
            {students.map(s => (
              <button key={s._id} onClick={() => { setSelectedId(s._id); setSearch(`${s.name} (${s.studentId})`); setShowSearch(false); }}
                style={{ display: 'block', width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)', fontSize: '0.845rem', borderBottom: '1px solid var(--color-border-light)' }}>
                <div style={{ fontWeight: 600 }}>{s.name}</div>
                <div style={{ fontSize: '0.73rem', color: 'var(--color-text-secondary)' }}>{s.studentId} · {s.grade} · {s.village}</div>
              </button>
            ))}
          </div>
        )}
      </div>
      <Alert type="info">Type at least 2 characters to search.</Alert>
    </div>
  );
  if (isLoading) return <LoadingPage />;
  if (!data) return <Alert type="warning">No data for this student.</Alert>;
  const { student, attendance } = data;
  const handlePrint = () => {
    const sum = mkSummary([{ l: 'Grade', v: student?.grade }, { l: 'Category', v: student?.category }, { l: 'Present', v: attendance?.present }, { l: 'Rate', v: `${attendance?.rate ?? 0}%` }]);
    const rows = (attendance?.history || []).map(h => `<tr><td>${fmtDate(h.date)}</td><td>${h.status}</td><td>${h.isModified ? 'Modified' : '—'}</td></tr>`).join('');
    printPage(`Student Report — ${student?.name}`, mkTable(['Date', 'Status', 'Record'], rows), sum, vbsYear);
  };
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedId(''); setSearch(''); }}>← Back</button>
      </div>
      <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{student?.name} <span className="code" style={{ fontSize: '0.8rem' }}>{student?.studentId}</span></div>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
              Grade {student?.grade} · <span className={`badge cat-${student?.category}`}>{student?.category}</span> · {student?.gender} · {student?.village || '—'}
              {student?.classAssigned && <> · Class: <strong>{student.classAssigned.name}</strong></>}
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handlePrint}><Printer size={13} /> Print</button>
        </div>
      </div>
      <StatRow items={[
        { label: 'Present', value: attendance?.present, color: '#16a34a' },
        { label: 'Absent', value: attendance?.absent, color: '#dc2626' },
        { label: 'Total', value: attendance?.total, color: '#3b82f6' },
        { label: 'Rate', value: `${attendance?.rate ?? 0}%`, color: '#8b5cf6' },
      ]} />
      <SectionCard title="📅 Attendance History">
        <table>
          <thead><tr><th>Date</th><th>Status</th><th>Record</th></tr></thead>
          <tbody>
            {(attendance?.history || []).length === 0
              ? <tr><td colSpan={3} style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-muted)' }}>No records.</td></tr>
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
        <button className="btn btn-primary" onClick={() => setQueried(village)} disabled={!village}>View</button>
      </div>
      <Alert type="info">Select a village to view its report.</Alert>
    </div>
  );
  if (isLoading) return <LoadingPage />;
  if (!data) return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => { setQueried(''); setVillage(''); }}>← Back</button>
      </div>
      <Alert type="warning">No data for {queried}.</Alert>
    </div>
  );
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => { setQueried(''); setVillage(''); }}>← Back</button>
        <span style={{ fontWeight: 700, fontSize: '1rem' }}>📍 {queried}</span>
      </div>
      <StatRow items={[
        { label: 'Total Students', value: data.totalStudents, color: '#3b82f6' },
        { label: 'Attendance Rate', value: `${data.stats?.attendance?.rate ?? 0}%`, color: '#10b981' },
      ]} />
      <SectionCard title={`👥 Students from ${queried}`}>
        <table>
          <thead><tr><th>Student ID</th><th>Name</th><th>Grade</th><th>Category</th><th>Gender</th><th>Class</th><th>Rate</th></tr></thead>
          <tbody>
            {(data.students || []).map(s => (
              <tr key={s._id}>
                <td><span className="code" style={{ fontSize: '0.75rem' }}>{s.studentId || '—'}</span></td>
                <td style={{ fontWeight: 600 }}>{s.name}</td>
                <td>{s.grade}</td>
                <td><CategoryBadge category={s.category} /></td>
                <td style={{ textTransform: 'capitalize', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{s.gender}</td>
                <td>{s.classAssigned?.name ? <span className="badge badge-navy">{s.classAssigned.name}</span> : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>—</span>}</td>
                <td><RateBar rate={s.attendance?.rate ?? 0} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

function VolunteerReport({ volunteerId, vbsYear }) {
  const { data, isLoading } = useQuery({
    queryKey: ['report-volunteer', volunteerId, vbsYear],
    queryFn: () => reportsAPI.getVolunteer(volunteerId),
    enabled: !!volunteerId && !!vbsYear,
    select: d => d.data?.data,
  });
  if (!volunteerId) return <Alert type="info">Select a volunteer above.</Alert>;
  if (isLoading) return <LoadingPage />;
  if (!data) return <Alert type="warning">No data.</Alert>;
  const { volunteer, attendance } = data;
  return (
    <div>
      <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
        <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{volunteer?.name}</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
          Role: <strong>{volunteer?.role || '—'}</strong>
          {volunteer?.shift && <> · Shift: <strong>{volunteer.shift}</strong></>}
          {' · '}{volunteer?.contactNumber || '—'}
        </div>
      </div>
      <StatRow items={[
        { label: 'Present', value: attendance?.present, color: '#16a34a' },
        { label: 'Half Day', value: attendance?.halfDay, color: '#ea580c' },
        { label: 'Absent', value: attendance?.absent, color: '#dc2626' },
        { label: 'Rate', value: `${attendance?.rate ?? 0}%`, color: '#3b82f6' },
      ]} />
      <SectionCard title="📅 Attendance History">
        <table>
          <thead><tr><th>Date</th><th>Status</th><th>Shift</th><th>Check-in</th><th>Check-out</th></tr></thead>
          <tbody>
            {(attendance?.history || []).length === 0
              ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-muted)' }}>No records.</td></tr>
              : (attendance?.history || []).map((h, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{fmtDate(h.date)}</td>
                  <td><span className={`badge ${h.status === 'present' ? 'badge-green' : h.status === 'halfDay' ? 'badge-orange' : 'badge-red'}`}>{h.status}</span></td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{h.shift || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{h.checkInTime || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{h.checkOutTime || '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

function CategoryReport({ vbsYear }) {
  const [category, setCategory] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['report-category', category, vbsYear],
    queryFn: () => api.get(`/reports/category/${category}`, { params: { vbsYear } }).then(r => r.data?.data),
    enabled: !!category && !!vbsYear,
  });
  const CATS = ['Beginner', 'Primary', 'Junior', 'Inter'];
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {CATS.map(c => <button key={c} onClick={() => setCategory(c)} className={`btn ${c === category ? 'btn-primary' : 'btn-secondary'}`}>{c}</button>)}
      </div>
      {!category && <Alert type="info">Select a category above.</Alert>}
      {category && isLoading && <LoadingPage />}
      {category && !isLoading && !data && <Alert type="warning">No data for {category}.</Alert>}
      {category && !isLoading && data && (
        <>
          <StatRow items={[
            { label: 'Students', value: data.totalStudents, color: '#3b82f6' },
            { label: 'Classes', value: data.totalClasses, color: '#8b5cf6' },
            { label: 'Rate', value: `${data.stats?.attendance?.rate ?? 0}%`, color: '#10b981' },
          ]} />
          <SectionCard title={`👥 ${category} Students`}>
            <table>
              <thead><tr><th>Student ID</th><th>Name</th><th>Grade</th><th>Gender</th><th>Village</th><th>Class</th><th>Rate</th></tr></thead>
              <tbody>
                {(data.students || []).map(s => (
                  <tr key={s._id}>
                    <td><span className="code" style={{ fontSize: '0.75rem' }}>{s.studentId || '—'}</span></td>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>{s.grade}</td>
                    <td style={{ textTransform: 'capitalize', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{s.gender}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{s.village || '—'}</td>
                    <td>{s.classAssigned?.name ? <span className="badge badge-navy">{s.classAssigned.name}</span> : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>—</span>}</td>
                    <td><RateBar rate={s.attendance?.rate ?? 0} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        </>
      )}
    </div>
  );
}

/* ═══════════════ MAIN PAGE ════════════════════════════════════════ */
const REPORT_TYPES = [
  { id: 'daily',     label: 'Daily',     icon: Calendar,      desc: 'All classes on a date' },
  { id: 'class',     label: 'Class',     icon: BookOpen,      desc: 'Per-student class breakdown' },
  { id: 'full-year', label: 'Full Year', icon: FileText,      desc: 'Complete VBS statistics' },
  { id: 'teacher',   label: 'Teacher',   icon: GraduationCap, desc: 'Submissions & attendance' },
  { id: 'student',   label: 'Student',   icon: Users,         desc: 'Individual history' },
  { id: 'village',   label: 'Village',   icon: MapPin,        desc: 'Students by village' },
  { id: 'volunteer', label: 'Volunteer', icon: Heart,         desc: 'Volunteer attendance' },
  { id: 'category',  label: 'Category',  icon: BookOpen,      desc: 'Beginner/Primary/Junior/Inter' },
];

export default function ReportsPage() {
  const { vbsYear, activeYear, allYears } = useActiveYear();
  const [activeReport, setActiveReport] = useState('daily');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedVol, setSelectedVol] = useState('');

  const { data: activeSettings } = useQuery({ queryKey: ['active-settings'], queryFn: () => settingsAPI.getActive().then(r => r.data?.data) });
  const { data: classes } = useQuery({ queryKey: ['classes', vbsYear], queryFn: () => classesAPI.getAll({ year: vbsYear }), select: d => d.data?.data || [], enabled: !!vbsYear });
  const { data: teachers } = useQuery({ queryKey: ['teachers-list', vbsYear], queryFn: () => teachersAPI.getAll({ isActive: true }), select: d => d.data?.data || [], enabled: !!vbsYear });
  const { data: volunteers } = useQuery({ queryKey: ['vol-list', vbsYear], queryFn: () => volunteersAPI.getAll(), select: d => d.data?.data || [], enabled: !!vbsYear });

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

      {/* Scrollable report type selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {REPORT_TYPES.map(rt => {
          const Icon = rt.icon;
          const active = activeReport === rt.id;
          return (
            <button key={rt.id} onClick={() => handleTypeChange(rt.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px',
                borderRadius: 'var(--radius-md)',
                border: `1.5px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: active ? 'var(--color-primary)' : 'white',
                color: active ? 'white' : 'var(--color-text)',
                cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
              }}>
              <Icon size={14} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{rt.label}</div>
                <div style={{ fontSize: '0.68rem', opacity: 0.75, lineHeight: 1.2 }}>{rt.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selector bar for date/class/teacher/volunteer */}
      {['daily', 'class', 'teacher', 'volunteer'].includes(activeReport) && (
        <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {activeReport === 'daily' && (
              <div style={{ flex: '1 1 200px' }}>
                <DateInput
                  label="Date"
                  value={date}
                  onChange={setDate}
                  vbsStartDate={activeSettings?.dates?.startDate?.slice(0, 10)}
                  vbsEndDate={activeSettings?.dates?.endDate?.slice(0, 10)}
                  showVBSDays={true}
                />
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

      {activeReport === 'daily' && (
        <DailyReport date={date} vbsYear={vbsYear}
          vbsStartDate={activeSettings?.dates?.startDate?.slice(0, 10)}
          vbsEndDate={activeSettings?.dates?.endDate?.slice(0, 10)}
        />
      )}
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
