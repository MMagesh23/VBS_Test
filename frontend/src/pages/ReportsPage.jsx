import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Calendar, Users, BookOpen, GraduationCap, Heart, MapPin, Printer, Download } from 'lucide-react';
import { reportsAPI, classesAPI, teachersAPI, volunteersAPI } from '../services/api';
import api from '../services/api';
import { LoadingPage, Alert, CategoryBadge } from '../components/common';
import { format, startOfWeek } from 'date-fns';

// ─── Print helpers ─────────────────────────────────────────────────
const printReport = (title, tableHtml, summaryHtml = '') => {
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8"><title>${title}</title>
    <style>
      @page { size: A4; margin: 15mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #111; }
      .header { border-bottom: 2px solid #1a2f5e; padding-bottom: 10px; margin-bottom: 14px; }
      .church { font-size: 14pt; font-weight: 800; color: #1a2f5e; }
      .rpt-title { font-size: 11pt; font-weight: 700; color: #c8922a; margin-top: 4px; }
      .summary { display: flex; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
      .scard { border: 1px solid #ddd; border-radius: 6px; padding: 8px 14px; }
      .scard .n { font-size: 16pt; font-weight: 800; color: #1a2f5e; }
      .scard .l { font-size: 8pt; color: #555; text-transform: uppercase; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #1a2f5e; color: white; padding: 6px 8px; text-align: left; font-size: 8pt; font-weight: 700; }
      td { padding: 5px 8px; border-bottom: 1px solid #e8edf2; font-size: 9pt; }
      tr:nth-child(even) td { background: #f9fafb; }
      .footer { margin-top: 16px; font-size: 8pt; color: #888; border-top: 1px solid #ddd; padding-top: 8px; display: flex; justify-content: space-between; }
      @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
    </style>
  </head><body>
    <div class="header">
      <div class="church">✝ Presence of Jesus Ministry, Tiruchirappalli</div>
      <div class="rpt-title">${title}</div>
    </div>
    ${summaryHtml}
    ${tableHtml}
    <div class="footer"><span>VBS Management System</span><span>Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</span></div>
  </body></html>`);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 500);
};

// ─── Formatters ─────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const RateBar = ({ rate }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <div style={{ width: 52, height: 5, background: 'var(--color-border)', borderRadius: 99 }}>
      <div style={{ width: `${rate}%`, height: '100%', borderRadius: 99, background: rate >= 80 ? '#16a34a' : rate >= 60 ? '#d97706' : '#dc2626' }} />
    </div>
    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: rate >= 80 ? '#16a34a' : rate >= 60 ? '#d97706' : '#dc2626' }}>{rate}%</span>
  </div>
);

// ─── Daily Report ──────────────────────────────────────────────────
function DailyReport({ date }) {
  const { data, isLoading } = useQuery({
    queryKey: ['report-daily', date],
    queryFn: () => reportsAPI.getDaily({ date }),
    enabled: !!date,
    select: d => d.data?.data,
  });
  if (!date) return <Alert type="info">Select a date to view the daily report.</Alert>;
  if (isLoading) return <LoadingPage />;
  if (!data) return <Alert type="warning">No data for this date.</Alert>;

  const handlePrint = () => {
    const { summary, studentAttendance = [], teacherAttendance = [], volunteerAttendance = [] } = data;
    const summaryHtml = `<div class="summary">
      <div class="scard"><div class="n">${summary?.students?.present}</div><div class="l">Students Present</div></div>
      <div class="scard"><div class="n">${summary?.students?.rate}%</div><div class="l">Attendance Rate</div></div>
      <div class="scard"><div class="n">${summary?.teachers?.present}</div><div class="l">Teachers Present</div></div>
      <div class="scard"><div class="n">${summary?.volunteers?.present}</div><div class="l">Volunteers Present</div></div>
    </div>`;
    const tableHtml = `<table>
      <thead><tr><th>Class</th><th>Category</th><th>Present</th><th>Absent</th><th>Rate</th><th>Submitted By</th></tr></thead>
      <tbody>${studentAttendance.map(a => {
        const p = a.records?.filter(r => r.status === 'present').length || 0;
        const ab = a.records?.filter(r => r.status === 'absent').length || 0;
        const total = p + ab;
        return `<tr><td>${a.class?.name}</td><td>${a.class?.category}</td><td>${p}</td><td>${ab}</td><td>${total > 0 ? Math.round((p/total)*100) : 0}%</td><td>${a.submittedByName}</td></tr>`;
      }).join('')}</tbody></table>`;
    printReport(`Daily Attendance Report — ${fmtDate(date)}`, tableHtml, summaryHtml);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Students Present', value: data.summary?.students?.present, color: '#10b981' },
          { label: 'Attendance Rate', value: `${data.summary?.students?.rate}%`, color: '#3b82f6' },
          { label: 'Teachers Present', value: data.summary?.teachers?.present, color: '#8b5cf6' },
          { label: 'Volunteers Present', value: data.summary?.volunteers?.present, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ flex: 1, minWidth: 120 }}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {data.unsubmittedClasses?.length > 0 && (
        <Alert type="warning" style={{ marginBottom: 16 }}>
          ⚠️ {data.unsubmittedClasses.length} class(es) did not submit attendance: {data.unsubmittedClasses.map(c => c.name).join(', ')}
        </Alert>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">Student Attendance by Class</span>
          <button className="btn btn-secondary btn-sm" onClick={handlePrint}><Printer size={14} /> Print</button>
        </div>
        <div className="table-container">
          <table>
            <thead><tr><th>Class</th><th>Category</th><th>Present</th><th>Absent</th><th>Rate</th><th>Submitted By</th><th>Modified</th></tr></thead>
            <tbody>
              {(data.studentAttendance || []).map(a => {
                const p = a.records?.filter(r => r.status === 'present').length || 0;
                const ab = a.records?.filter(r => r.status === 'absent').length || 0;
                const total = p + ab;
                return (
                  <tr key={a._id}>
                    <td style={{ fontWeight: 600 }}>{a.class?.name}</td>
                    <td><span className={`badge cat-${a.class?.category}`}>{a.class?.category}</span></td>
                    <td><span style={{ color: '#10b981', fontWeight: 700 }}>{p}</span></td>
                    <td><span style={{ color: '#ef4444', fontWeight: 700 }}>{ab}</span></td>
                    <td><RateBar rate={total > 0 ? Math.round((p/total)*100) : 0} /></td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>{a.submittedByName}</td>
                    <td>{a.isModified ? <span className="badge badge-orange">Modified</span> : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Weekly Report ─────────────────────────────────────────────────
function WeeklyReport({ startDate }) {
  const { data, isLoading } = useQuery({
    queryKey: ['report-weekly', startDate],
    queryFn: () => api.get('/reports/weekly', { params: { startDate } }).then(r => r.data?.data),
    enabled: !!startDate,
  });
  if (!startDate) return <Alert type="info">Select a week start date to view the weekly report.</Alert>;
  if (isLoading) return <LoadingPage />;
  if (!data) return <Alert type="warning">No data for this week.</Alert>;

  const handlePrint = () => {
    const summaryHtml = `<div class="summary">
      <div class="scard"><div class="n">${data.summary?.weeklyStudentRate}%</div><div class="l">Weekly Rate</div></div>
      <div class="scard"><div class="n">${data.summary?.totalStudentPresent}</div><div class="l">Total Present</div></div>
      <div class="scard"><div class="n">${data.summary?.daysWithData}</div><div class="l">Days Recorded</div></div>
    </div>`;
    const tableHtml = `<table>
      <thead><tr><th>Date</th><th>S.Present</th><th>S.Rate</th><th>Classes</th><th>T.Present</th><th>V.Present</th></tr></thead>
      <tbody>${(data.dailyStats || []).map(d => `<tr>
        <td>${fmtDate(d.date)}</td><td>${d.students.present}</td><td>${d.students.rate}%</td>
        <td>${d.students.classesSubmitted}</td><td>${d.teachers.present}</td><td>${d.volunteers.present}</td>
      </tr>`).join('')}</tbody></table>`;
    printReport(`Weekly Attendance Report — ${fmtDate(data.weekStart)} to ${fmtDate(data.weekEnd)}`, tableHtml, summaryHtml);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Weekly Student Rate', value: `${data.summary?.weeklyStudentRate}%`, color: '#3b82f6' },
          { label: 'Total Present', value: data.summary?.totalStudentPresent, color: '#10b981' },
          { label: 'Teacher Present', value: data.summary?.totalTeacherPresent, color: '#8b5cf6' },
          { label: 'Days Recorded', value: data.summary?.daysWithData, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ flex: 1, minWidth: 120 }}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Daily Breakdown — {fmtDate(data.weekStart)} to {fmtDate(data.weekEnd)}</span>
          <button className="btn btn-secondary btn-sm" onClick={handlePrint}><Printer size={14} /> Print</button>
        </div>
        <div className="table-container">
          <table>
            <thead><tr><th>Date</th><th>Students Present</th><th>Student Rate</th><th>Classes Submitted</th><th>Teachers Present</th><th>Volunteers Present</th></tr></thead>
            <tbody>
              {(data.dailyStats || []).map((d, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{fmtDate(d.date)}</td>
                  <td><span style={{ color: '#10b981', fontWeight: 700 }}>{d.students.present}</span></td>
                  <td><RateBar rate={d.students.rate} /></td>
                  <td>{d.students.classesSubmitted}</td>
                  <td>{d.teachers.present}</td>
                  <td>{d.volunteers.present}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {data.classPerformance?.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header"><span className="card-title">Class Performance This Week</span></div>
          <div className="table-container">
            <table>
              <thead><tr><th>Class</th><th>Category</th><th>Days</th><th>Attendance Rate</th></tr></thead>
              <tbody>
                {data.classPerformance.map((c, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{c.className}</td>
                    <td><span className={`badge cat-${c.category}`}>{c.category}</span></td>
                    <td>{c.daysSubmitted}</td>
                    <td><RateBar rate={c.rate} /></td>
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

// ─── Class Report ──────────────────────────────────────────────────
function ClassReport({ classId }) {
  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => classesAPI.getAll(), select: d => d.data?.data || [] });
  const { data, isLoading } = useQuery({
    queryKey: ['report-class', classId],
    queryFn: () => reportsAPI.getClass(classId),
    enabled: !!classId,
    select: d => d.data?.data,
  });
  if (!classId) return <Alert type="info">Select a class to view its report.</Alert>;
  if (isLoading) return <LoadingPage />;

  const handlePrint = () => {
    if (!data) return;
    const summaryHtml = `<div class="summary">
      <div class="scard"><div class="n">${data.students?.length}</div><div class="l">Total Students</div></div>
      <div class="scard"><div class="n">${data.totalDays}</div><div class="l">Days</div></div>
      <div class="scard"><div class="n">${data.classAvgRate}%</div><div class="l">Avg Rate</div></div>
    </div>`;
    const tableHtml = `<table>
      <thead><tr><th>Student ID</th><th>Name</th><th>Grade</th><th>Village</th><th>Present</th><th>Absent</th><th>Rate</th></tr></thead>
      <tbody>${(data.students || []).map(s => `<tr>
        <td>${s.studentId}</td><td>${s.name}</td><td>${s.grade}</td><td>${s.village || '—'}</td>
        <td>${s.present}</td><td>${s.absent}</td><td>${s.rate}%</td>
      </tr>`).join('')}</tbody></table>`;
    printReport(`Class Report — ${data.class?.name}`, tableHtml, summaryHtml);
  };

  return data ? (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontWeight: 700, marginBottom: 4 }}>{data.class?.name} — {data.class?.category}</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            Teacher: {data.class?.teacher?.name || 'Unassigned'} · {data.totalDays} days · Avg: {data.classAvgRate}%
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handlePrint}><Printer size={14} /> Print Report</button>
      </div>
      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>Student ID</th><th>Name</th><th>Grade</th><th>Village</th><th>Present</th><th>Absent</th><th>Rate</th></tr></thead>
            <tbody>
              {data.students?.map(s => (
                <tr key={s._id}>
                  <td><span className="code">{s.studentId}</span></td>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>{s.grade}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{s.village}</td>
                  <td><span style={{ color: '#10b981', fontWeight: 700 }}>{s.present}</span></td>
                  <td><span style={{ color: '#ef4444', fontWeight: 700 }}>{s.absent}</span></td>
                  <td><RateBar rate={s.rate} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  ) : null;
}

// ─── Village Report ────────────────────────────────────────────────
function VillageReport() {
  const [village, setVillage] = useState('');
  const [searched, setSearched] = useState('');

  const { data: villageList } = useQuery({
    queryKey: ['village-list'],
    queryFn: () => api.get('/reports/villages').then(r => r.data?.data || []),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['report-village', searched],
    queryFn: () => api.get('/reports/village', { params: { village: searched } }).then(r => r.data?.data),
    enabled: !!searched,
  });

  const handlePrint = () => {
    if (!data) return;
    const summaryHtml = `<div class="summary">
      <div class="scard"><div class="n">${data.totalStudents}</div><div class="l">Total Students</div></div>
      <div class="scard"><div class="n">${data.stats?.attendance?.rate}%</div><div class="l">Attendance Rate</div></div>
    </div>`;
    const tableHtml = `<table>
      <thead><tr><th>ID</th><th>Name</th><th>Grade</th><th>Category</th><th>Gender</th><th>Class</th><th>Rate</th></tr></thead>
      <tbody>${(data.students || []).map(s => `<tr>
        <td>${s.studentId}</td><td>${s.name}</td><td>${s.grade}</td><td>${s.category}</td>
        <td>${s.gender}</td><td>${s.classAssigned?.name || '—'}</td><td>${s.attendance?.rate}%</td>
      </tr>`).join('')}</tbody></table>`;
    printReport(`Village Report — ${data.village}`, tableHtml, summaryHtml);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'flex-end' }}>
        <div style={{ flex: 1, maxWidth: 300 }}>
          <label className="form-label">Select Village</label>
          <select className="form-select" value={village} onChange={e => setVillage(e.target.value)}>
            <option value="">Choose a village...</option>
            {(villageList || []).map(v => (
              <option key={v.village} value={v.village}>{v.village} ({v.count} students)</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => setSearched(village)} disabled={!village}>
          View Report
        </button>
      </div>

      {isLoading && <LoadingPage />}
      {data && searched && (
        <div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Students', value: data.totalStudents, color: '#3b82f6' },
              { label: 'Attendance Rate', value: `${data.stats?.attendance?.rate}%`, color: '#10b981' },
            ].map(s => (
              <div key={s.label} className="stat-card" style={{ flex: 1, minWidth: 120 }}>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
            {/* Category distribution */}
            {(data.stats?.categoryDistribution || []).map(c => (
              <div key={c.category} className="stat-card" style={{ flex: 1, minWidth: 100 }}>
                <div className="stat-label">{c.category}</div>
                <div className="stat-value" style={{ fontSize: '1.4rem' }}>{c.count}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Students from {data.village}</span>
              <button className="btn btn-secondary btn-sm" onClick={handlePrint}><Printer size={14} /> Print</button>
            </div>
            <div className="table-container">
              <table>
                <thead><tr><th>Student ID</th><th>Name</th><th>Grade</th><th>Category</th><th>Gender</th><th>Class</th><th>Contact</th><th>Attendance</th></tr></thead>
                <tbody>
                  {(data.students || []).map(s => (
                    <tr key={s._id}>
                      <td><span className="code">{s.studentId}</span></td>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td>{s.grade}</td>
                      <td><CategoryBadge category={s.category} /></td>
                      <td style={{ textTransform: 'capitalize', fontSize: '0.82rem' }}>{s.gender}</td>
                      <td>{s.classAssigned?.name || <span style={{ color: 'var(--color-text-muted)' }}>—</span>}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{s.contactNumber || '—'}</td>
                      <td><RateBar rate={s.attendance?.rate || 0} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Category Report ───────────────────────────────────────────────
function CategoryReport() {
  const [category, setCategory] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['report-category', category],
    queryFn: () => api.get(`/reports/category/${category}`).then(r => r.data?.data),
    enabled: !!category,
  });

  const handlePrint = () => {
    if (!data) return;
    const summaryHtml = `<div class="summary">
      <div class="scard"><div class="n">${data.totalStudents}</div><div class="l">Students</div></div>
      <div class="scard"><div class="n">${data.totalClasses}</div><div class="l">Classes</div></div>
      <div class="scard"><div class="n">${data.stats?.attendance?.rate}%</div><div class="l">Avg Rate</div></div>
    </div>`;
    const tableHtml = `<table>
      <thead><tr><th>ID</th><th>Name</th><th>Grade</th><th>Gender</th><th>Village</th><th>Class</th><th>Rate</th></tr></thead>
      <tbody>${(data.students || []).map(s => `<tr>
        <td>${s.studentId}</td><td>${s.name}</td><td>${s.grade}</td><td>${s.gender}</td>
        <td>${s.village || '—'}</td><td>${s.classAssigned?.name || '—'}</td><td>${s.attendance?.rate}%</td>
      </tr>`).join('')}</tbody></table>`;
    printReport(`Category Report — ${data.category}`, tableHtml, summaryHtml);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'flex-end' }}>
        <div>
          <label className="form-label">Select Category</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['Beginner', 'Primary', 'Junior', 'Inter'].map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`btn ${category === cat ? 'btn-primary' : 'btn-secondary'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading && <LoadingPage />}
      {data && category && (
        <div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Students', value: data.totalStudents, color: '#3b82f6' },
              { label: 'Total Classes', value: data.totalClasses, color: '#8b5cf6' },
              { label: 'Attendance Rate', value: `${data.stats?.attendance?.rate}%`, color: '#10b981' },
            ].map(s => (
              <div key={s.label} className="stat-card" style={{ flex: 1, minWidth: 120 }}>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Grade + Gender mini-stats */}
          <div className="grid-2" style={{ marginBottom: 20 }}>
            <div className="card">
              <div className="card-header"><span className="card-title">Grade Distribution</span></div>
              <div className="card-body" style={{ padding: '12px 16px' }}>
                {(data.stats?.gradeDistribution || []).map(g => (
                  <div key={g.grade} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--color-border-light)', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600 }}>
                      {['PreKG','LKG','UKG'].includes(g.grade) ? g.grade : `Grade ${g.grade}`}
                    </span>
                    <span>{g.count} students</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-header"><span className="card-title">Gender Distribution</span></div>
              <div className="card-body" style={{ padding: '12px 16px' }}>
                {(data.stats?.genderDistribution || []).map(g => (
                  <div key={g.gender} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--color-border-light)', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{g.gender}</span>
                    <span>{g.count} students</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">{category} Students ({data.totalStudents})</span>
              <button className="btn btn-secondary btn-sm" onClick={handlePrint}><Printer size={14} /> Print</button>
            </div>
            <div className="table-container">
              <table>
                <thead><tr><th>Student ID</th><th>Name</th><th>Grade</th><th>Gender</th><th>Village</th><th>Class</th><th>Attendance</th></tr></thead>
                <tbody>
                  {(data.students || []).map(s => (
                    <tr key={s._id}>
                      <td><span className="code">{s.studentId}</span></td>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td>{s.grade}</td>
                      <td style={{ textTransform: 'capitalize', fontSize: '0.82rem' }}>{s.gender}</td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem' }}>{s.village || '—'}</td>
                      <td>{s.classAssigned?.name || <span style={{ color: 'var(--color-text-muted)' }}>—</span>}</td>
                      <td><RateBar rate={s.attendance?.rate || 0} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Full Year Report ──────────────────────────────────────────────
function FullYearReport() {
  const { data, isLoading } = useQuery({
    queryKey: ['report-full-year'],
    queryFn: () => reportsAPI.getFullYear(),
    select: d => d.data?.data,
  });
  if (isLoading) return <LoadingPage />;
  if (!data) return <Alert type="warning">No year data found.</Alert>;

  const handlePrint = () => {
    const summaryHtml = `<div class="summary">
      <div class="scard"><div class="n">${data.summary?.totalStudents}</div><div class="l">Students</div></div>
      <div class="scard"><div class="n">${data.summary?.totalTeachers}</div><div class="l">Teachers</div></div>
      <div class="scard"><div class="n">${data.summary?.totalVolunteers}</div><div class="l">Volunteers</div></div>
      <div class="scard"><div class="n">${data.summary?.attendance?.students?.rate}%</div><div class="l">Attendance</div></div>
      <div class="scard"><div class="n">${data.summary?.modifications}</div><div class="l">Modifications</div></div>
    </div>`;
    const tableHtml = `<table>
      <thead><tr><th>Class</th><th>Category</th></tr></thead>
      <tbody>${(data.classes || []).map(c => `<tr><td>${c.name}</td><td>${c.category}</td></tr>`).join('')}</tbody>
    </table>`;
    printReport(`Full Year Report — VBS ${data.settings?.year}`, tableHtml, summaryHtml);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontWeight: 800, fontSize: '1.2rem' }}>{data.settings?.vbsTitle}</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
            {data.settings?.dates?.startDate && format(new Date(data.settings.dates.startDate), 'MMMM d')} – {data.settings?.dates?.endDate && format(new Date(data.settings.dates.endDate), 'MMMM d, yyyy')}
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handlePrint}><Printer size={14} /> Print Report</button>
      </div>
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Students', value: data.summary?.totalStudents, color: '#3b82f6' },
          { label: 'Total Teachers', value: data.summary?.totalTeachers, color: '#8b5cf6' },
          { label: 'Total Volunteers', value: data.summary?.totalVolunteers, color: '#10b981' },
          { label: 'Classes', value: data.summary?.totalClasses, color: '#f59e0b' },
          { label: 'Student Attendance', value: `${data.summary?.attendance?.students?.rate}%`, color: '#3b82f6' },
          { label: 'Records Modified', value: data.summary?.modifications, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Report type config ────────────────────────────────────────────
const REPORT_TYPES = [
  { id: 'daily',    label: 'Daily',    icon: Calendar,       desc: 'All classes, specific date' },
  { id: 'weekly',   label: 'Weekly',   icon: Calendar,       desc: '7-day aggregate stats' },
  { id: 'class',    label: 'Class',    icon: BookOpen,       desc: 'Per-student, specific class' },
  { id: 'village',  label: 'Village',  icon: MapPin,         desc: 'Students by village' },
  { id: 'category', label: 'Category', icon: Users,          desc: 'Beginner/Primary/Junior/Inter' },
  { id: 'full-year',label: 'Full Year',icon: FileText,       desc: 'Complete VBS statistics' },
];

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState('daily');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [weekStart, setWeekStart] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [selectedClass, setSelectedClass] = useState('');

  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => classesAPI.getAll(), select: d => d.data?.data || [] });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Generate detailed reports — click <Printer size={14} style={{ verticalAlign: 'middle' }} /> on any report to print or save as PDF</p>
        </div>
      </div>

      {/* Report type selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {REPORT_TYPES.map(rt => {
          const Icon = rt.icon;
          return (
            <button key={rt.id} onClick={() => setActiveReport(rt.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 16px', borderRadius: 'var(--radius-md)',
                border: `1.5px solid ${activeReport === rt.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: activeReport === rt.id ? 'var(--color-primary)' : 'white',
                color: activeReport === rt.id ? 'white' : 'var(--color-text)',
                cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
              }}>
              <Icon size={15} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{rt.label}</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.75 }}>{rt.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      {(activeReport === 'daily' || activeReport === 'weekly' || activeReport === 'class') && (
        <div className="card" style={{ marginBottom: 20, padding: '14px 18px' }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {activeReport === 'daily' && (
              <div>
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 200 }} />
              </div>
            )}
            {activeReport === 'weekly' && (
              <div>
                <label className="form-label">Week Starting (Monday)</label>
                <input className="form-input" type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)} style={{ width: 200 }} />
              </div>
            )}
            {activeReport === 'class' && (
              <div>
                <label className="form-label">Select Class</label>
                <select className="form-select" value={selectedClass} onChange={e => setSelectedClass(e.target.value)} style={{ width: 240 }}>
                  <option value="">Choose a class...</option>
                  {classes.map(c => <option key={c._id} value={c._id}>{c.name} ({c.category})</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report content */}
      {activeReport === 'daily'     && <DailyReport date={date} />}
      {activeReport === 'weekly'    && <WeeklyReport startDate={weekStart} />}
      {activeReport === 'class'     && <ClassReport classId={selectedClass} />}
      {activeReport === 'village'   && <VillageReport />}
      {activeReport === 'category'  && <CategoryReport />}
      {activeReport === 'full-year' && <FullYearReport />}
    </div>
  );
}