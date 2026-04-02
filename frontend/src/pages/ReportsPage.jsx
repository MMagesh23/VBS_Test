import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, Calendar, Users, GraduationCap, BookOpen, Heart } from 'lucide-react';
import { reportsAPI, classesAPI, teachersAPI, volunteersAPI } from '../services/api';
import { LoadingPage, Alert } from '../components/common';
import { format } from 'date-fns';

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

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Students Present', value: data.summary?.students?.present, color: '#10b981' },
          { label: 'Attendance Rate', value: `${data.summary?.students?.rate}%`, color: '#3b82f6' },
          { label: 'Teachers Present', value: data.summary?.teachers?.present, color: '#8b5cf6' },
          { label: 'Volunteers Present', value: data.summary?.volunteers?.present, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ flex: 1 }}>
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
        <div className="card-header"><span className="card-title">Student Attendance by Class</span></div>
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
                    <td>{a.class?.category}</td>
                    <td><span style={{ color: '#10b981', fontWeight: 700 }}>{p}</span></td>
                    <td><span style={{ color: '#ef4444', fontWeight: 700 }}>{ab}</span></td>
                    <td style={{ fontWeight: 700 }}>{total > 0 ? Math.round((p/total)*100) : 0}%</td>
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

  return data ? (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 4 }}>{data.class?.name} — Class Report</h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Teacher: {data.class?.teacher?.name || 'Unassigned'} · {data.totalDays} days · Avg: {data.classAvgRate}%</p>
      </div>
      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>Student ID</th><th>Name</th><th>Grade</th><th>Village</th><th>Present</th><th>Absent</th><th>Rate</th></tr></thead>
            <tbody>
              {data.students?.map(s => (
                <tr key={s._id}>
                  <td><code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{s.studentId}</code></td>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>{s.grade}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{s.village}</td>
                  <td><span style={{ color: '#10b981', fontWeight: 700 }}>{s.present}</span></td>
                  <td><span style={{ color: '#ef4444', fontWeight: 700 }}>{s.absent}</span></td>
                  <td>
                    <span style={{ fontWeight: 700, color: s.rate >= 80 ? '#10b981' : s.rate >= 60 ? '#f59e0b' : '#ef4444' }}>{s.rate}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  ) : null;
}

function FullYearReport() {
  const { data, isLoading } = useQuery({
    queryKey: ['report-full-year'],
    queryFn: () => reportsAPI.getFullYear(),
    select: d => d.data?.data,
  });
  if (isLoading) return <LoadingPage />;
  if (!data) return <Alert type="warning">No year data found.</Alert>;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontWeight: 800, fontSize: '1.2rem' }}>{data.settings?.vbsTitle}</h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          {format(new Date(data.settings?.dates?.startDate), 'MMMM d')} – {format(new Date(data.settings?.dates?.endDate), 'MMMM d, yyyy')}
        </p>
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

const REPORT_TYPES = [
  { id: 'daily', label: 'Daily Report', icon: Calendar, desc: 'Attendance for all classes on a specific date' },
  { id: 'class', label: 'Class Report', icon: BookOpen, desc: 'Per-student attendance for a specific class' },
  { id: 'full-year', label: 'Full Year Report', icon: FileText, desc: 'Complete VBS program statistics' },
];

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState('daily');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedClass, setSelectedClass] = useState('');

  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => classesAPI.getAll(), select: d => d.data?.data || [] });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">Generate detailed reports for analysis and export</p>
      </div>

      {/* Report Type Selector */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        {REPORT_TYPES.map(rt => {
          const Icon = rt.icon;
          return (
            <button key={rt.id} onClick={() => setActiveReport(rt.id)}
              style={{ background: activeReport === rt.id ? 'var(--color-primary)' : 'white', color: activeReport === rt.id ? 'white' : 'var(--color-text)', border: `1.5px solid ${activeReport === rt.id ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 12, padding: '16px 20px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', fontFamily: 'var(--font-sans)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Icon size={18} />
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{rt.label}</span>
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{rt.desc}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {(activeReport === 'daily') && (
            <div>
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 200 }} />
            </div>
          )}
          {activeReport === 'class' && (
            <div>
              <label className="form-label">Select Class</label>
              <select className="form-select" value={selectedClass} onChange={e => setSelectedClass(e.target.value)} style={{ width: 220 }}>
                <option value="">Choose a class...</option>
                {classes.map(c => <option key={c._id} value={c._id}>{c.name} ({c.category})</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Report Content */}
      {activeReport === 'daily' && <DailyReport date={date} />}
      {activeReport === 'class' && <ClassReport classId={selectedClass} />}
      {activeReport === 'full-year' && <FullYearReport />}
    </div>
  );
}
