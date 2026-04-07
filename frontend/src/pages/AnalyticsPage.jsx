import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { analyticsAPI } from '../services/api';
import { LoadingPage, CategoryBadge } from '../components/common';

const COLORS = { Beginner: '#8b5cf6', Primary: '#3b82f6', Junior: '#10b981', Inter: '#f59e0b' };
const GENDER_COLORS = { male: '#3b82f6', female: '#ec4899', other: '#8b5cf6' };

function ChartCard({ title, children, height = 280 }) {
  return (
    <div className="card">
      <div className="card-header"><span className="card-title">{title}</span></div>
      <div className="card-body" style={{ padding: '20px 16px' }}>
        <ResponsiveContainer width="100%" height={height}>{children}</ResponsiveContainer>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [vbsYear, setVbsYear] = useState('');

  const { data: studentData, isLoading: loadingStudents } = useQuery({
    queryKey: ['student-analytics', vbsYear],
    queryFn: () => analyticsAPI.getStudentAnalytics({ vbsYear }),
    select: d => d.data?.data,
  });

  const { data: trendsData, isLoading: loadingTrends } = useQuery({
    queryKey: ['attendance-trends', vbsYear],
    queryFn: () => analyticsAPI.getAttendanceTrends({ vbsYear }),
    select: d => d.data?.data,
  });

  const { data: modsData } = useQuery({
    queryKey: ['modifications'],
    queryFn: () => analyticsAPI.getModifications({ vbsYear }),
    select: d => d.data?.data,
  });

  const isLoading = loadingStudents || loadingTrends;
  if (isLoading) return <LoadingPage />;

  const gradeData = (studentData?.gradeDistribution || []).map(g => ({ grade: g._id, count: g.count }));
  const categoryData = (studentData?.categoryDistribution || []).map(c => ({ name: c._id, value: c.count }));
  const genderData = (studentData?.genderDistribution || []).map(g => ({ name: g._id, value: g.count }));
  const villageData = (studentData?.villageDistribution || []).slice(0, 10);
  const studentTrends = (trendsData?.studentTrends || []).map(t => ({
    date: new Date(t.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    'Student Rate': Math.round(t.rate || 0),
    Present: t.present,
    Absent: t.absent,
  }));
  const teacherTrends = (trendsData?.teacherTrends || []).map(t => ({
    date: new Date(t.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    Present: t.present || 0, Absent: t.absent || 0,
  }));
  const classPerf = (trendsData?.classPerformance || []).map(c => ({ class: c.className, rate: Math.round(c.attendanceRate || 0) }));

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Analytics & Insights</h1>
          <p className="page-subtitle">Visual overview of VBS program data</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Students', value: studentData?.totalStudents || 0, color: '#3b82f6' },
          { label: 'Avg Attendance Rate', value: `${Math.round((studentTrends.reduce((s, t) => s + (t['Student Rate'] || 0), 0) / (studentTrends.length || 1)))}%`, color: '#10b981' },
          { label: 'Attendance Modifications', value: modsData?.totalModifications || 0, color: '#f59e0b' },
          { label: 'Modified Records', value: modsData?.totalModifiedRecords || 0, color: '#8b5cf6' },
        ].map(stat => (
          <div key={stat.label} className="stat-card">
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <ChartCard title="📊 Category Distribution">
          <PieChart>
            <Pie data={categoryData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`} labelLine={false}>
              {categoryData.map((entry) => <Cell key={entry.name} fill={COLORS[entry.name] || '#94a3b8'} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ChartCard>

        <ChartCard title="👫 Gender Distribution">
          <PieChart>
            <Pie data={genderData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`} labelLine={false}>
              {genderData.map((entry) => <Cell key={entry.name} fill={GENDER_COLORS[entry.name] || '#94a3b8'} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ChartCard>
      </div>

      {/* Student Attendance Trend */}
      {studentTrends.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <ChartCard title="📈 Student Attendance Rate Over Time" height={240}>
            <LineChart data={studentTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v) => [`${v}%`]} />
              <Line type="monotone" dataKey="Student Rate" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ChartCard>
        </div>
      )}

      {/* Class Performance */}
      {classPerf.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <ChartCard title="🏆 Class Performance Comparison" height={240}>
            <BarChart data={classPerf}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="class" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v) => [`${v}%`, 'Attendance Rate']} />
              <Bar dataKey="rate" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                {classPerf.map((entry, i) => <Cell key={i} fill={entry.rate >= 80 ? '#10b981' : entry.rate >= 60 ? '#f59e0b' : '#ef4444'} />)}
              </Bar>
            </BarChart>
          </ChartCard>
        </div>
      )}

      {/* Grade Distribution */}
      {gradeData.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <ChartCard title="📚 Grade Distribution" height={220}>
            <BarChart data={gradeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="grade" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [v, 'Students']} />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartCard>
        </div>
      )}

      {/* Village Distribution */}
      {villageData.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="card">
            <div className="card-header"><span className="card-title">📍 Top Villages by Participation</span></div>
            <div className="card-body" style={{ padding: '20px 16px' }}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={villageData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="_id" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip formatter={(v) => [v, 'Students']} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Modifications Summary */}
      {modsData?.adminModifications?.length > 0 && (
        <div className="card">
          <div className="card-header"><span className="card-title">🔧 Attendance Modifications by Admin</span></div>
          <div className="card-body" style={{ padding: 0 }}>
            <table>
              <thead><tr><th>Admin Name</th><th>Modifications Made</th></tr></thead>
              <tbody>
                {modsData.adminModifications.map((a) => (
                  <tr key={a.name}>
                    <td style={{ fontWeight: 600 }}>{a.name}</td>
                    <td><span className="badge badge-orange">{a.count} changes</span></td>
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
