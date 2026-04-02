import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Users, GraduationCap, Heart, Clock } from 'lucide-react';
import { studentsAPI, teachersAPI, volunteersAPI } from '../services/api';
import { Modal, ConfirmDialog, LoadingPage, EmptyState, CategoryBadge } from '../components/common';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

function RejectModal({ isOpen, onClose, onReject, entityName, loading }) {
  const [reason, setReason] = useState('');
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reject Entry"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-danger" onClick={() => onReject(reason)} disabled={!reason.trim() || loading}>
          {loading ? 'Rejecting...' : 'Reject Entry'}
        </button>
      </>}
    >
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 16, fontSize: '0.875rem' }}>
        Rejecting: <strong>{entityName}</strong>
      </p>
      <div className="form-group">
        <label className="form-label">Rejection Reason <span className="required">*</span></label>
        <textarea className="form-textarea" rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain why this entry is being rejected..." />
      </div>
    </Modal>
  );
}

function StagingTable({ type, data, onApprove, onReject, approveLoading, rejectLoading }) {
  const [rejectTarget, setRejectTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const items = data || [];
  if (items.length === 0) {
    return <EmptyState icon={CheckCircle} title={`No pending ${type}`} description="All entries have been reviewed." />;
  }

  const toggleAll = () => setSelectedIds(selectedIds.length === items.length ? [] : items.map(i => i._id));

  const getLabel = (item) => {
    if (type === 'students') return `${item.name} | Grade ${item.grade} | ${item.village}`;
    if (type === 'teachers') return `${item.name} | ${item.contactNumber}`;
    return `${item.name} | ${item.role}`;
  };

  return (
    <div>
      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, padding: 12, background: '#f0f7ff', borderRadius: 10, border: '1px solid #bfdbfe' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{selectedIds.length} selected</span>
          <button className="btn btn-success btn-sm" onClick={() => { studentsAPI.bulkApprove && studentsAPI.bulkApprove(selectedIds).then(() => { toast.success('Bulk approved'); }); }}>
            <CheckCircle size={14} /> Approve All Selected
          </button>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th><input type="checkbox" checked={selectedIds.length === items.length} onChange={toggleAll} /></th>
              <th>Name</th>
              {type === 'students' && <><th>Grade</th><th>Category</th><th>Village</th><th>Parent</th></>}
              {type === 'teachers' && <><th>Contact</th><th>Email</th><th>Experience</th></>}
              {type === 'volunteers' && <><th>Role</th><th>Shift</th><th>Contact</th></>}
              <th>Submitted By</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <motion.tr key={item._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <td><input type="checkbox" checked={selectedIds.includes(item._id)} onChange={() => setSelectedIds(prev => prev.includes(item._id) ? prev.filter(i => i !== item._id) : [...prev, item._id])} /></td>
                <td style={{ fontWeight: 600 }}>{item.name}</td>
                {type === 'students' && <>
                  <td>{item.grade}</td>
                  <td><CategoryBadge category={item.category} /></td>
                  <td>{item.village}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{item.parentName}</td>
                </>}
                {type === 'teachers' && <>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{item.contactNumber}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{item.email || '—'}</td>
                  <td>{item.yearsOfExperience ? `${item.yearsOfExperience} yrs` : '—'}</td>
                </>}
                {type === 'volunteers' && <>
                  <td><span className="badge badge-blue">{item.role}</span></td>
                  <td>{item.shift || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{item.contactNumber}</td>
                </>}
                <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>{item.createdBy?.name || '—'}</td>
                <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>{format(new Date(item.createdAt), 'MMM d, h:mm a')}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-success btn-sm" onClick={() => onApprove(item._id)} disabled={approveLoading}>
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => setRejectTarget(item)} disabled={rejectLoading}>
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <RejectModal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        entityName={rejectTarget?.name}
        onReject={(reason) => { onReject(rejectTarget._id, reason); setRejectTarget(null); }}
        loading={rejectLoading}
      />
    </div>
  );
}

export default function VerificationQueuePage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('students');

  const { data: stagingStudents, isLoading: loadingStudents } = useQuery({
    queryKey: ['staging-students'],
    queryFn: () => studentsAPI.getStaging(),
    select: d => d.data?.data || [],
  });
  const { data: stagingTeachers, isLoading: loadingTeachers } = useQuery({
    queryKey: ['staging-teachers'],
    queryFn: () => teachersAPI.getStaging(),
    select: d => d.data?.data || [],
  });
  const { data: stagingVolunteers, isLoading: loadingVolunteers } = useQuery({
    queryKey: ['staging-volunteers'],
    queryFn: () => volunteersAPI.getStaging(),
    select: d => d.data?.data || [],
  });

  const invalidate = () => { qc.invalidateQueries(['staging-students']); qc.invalidateQueries(['staging-teachers']); qc.invalidateQueries(['staging-volunteers']); qc.invalidateQueries(['dashboard-stats']); };

  const approveStudent = useMutation({ mutationFn: (id) => studentsAPI.approve(id), onSuccess: () => { toast.success('Student approved!'); invalidate(); } });
  const rejectStudent = useMutation({ mutationFn: ({ id, reason }) => studentsAPI.reject(id, reason), onSuccess: () => { toast.success('Student rejected'); invalidate(); } });
  const approveTeacher = useMutation({ mutationFn: (id) => teachersAPI.approve(id), onSuccess: () => { toast.success('Teacher approved!'); invalidate(); } });
  const rejectTeacher = useMutation({ mutationFn: ({ id, reason }) => teachersAPI.reject(id, reason), onSuccess: () => { toast.success('Teacher rejected'); invalidate(); } });
  const approveVolunteer = useMutation({ mutationFn: (id) => volunteersAPI.approve(id), onSuccess: () => { toast.success('Volunteer approved!'); invalidate(); } });
  const rejectVolunteer = useMutation({ mutationFn: ({ id, reason }) => volunteersAPI.reject(id, reason), onSuccess: () => { toast.success('Volunteer rejected'); invalidate(); } });

  const tabs = [
    { id: 'students', label: 'Students', icon: Users, count: stagingStudents?.length || 0 },
    { id: 'teachers', label: 'Teachers', icon: GraduationCap, count: stagingTeachers?.length || 0 },
    { id: 'volunteers', label: 'Volunteers', icon: Heart, count: stagingVolunteers?.length || 0 },
  ];

  const totalPending = (stagingStudents?.length || 0) + (stagingTeachers?.length || 0) + (stagingVolunteers?.length || 0);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 className="page-title">Verification Queue</h1>
          {totalPending > 0 && <span className="badge badge-red" style={{ fontSize: '0.875rem', padding: '4px 12px' }}>{totalPending} pending</span>}
        </div>
        <p className="page-subtitle">Review and approve/reject entries submitted by editors</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--color-bg)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', fontFamily: 'var(--font-sans)', background: activeTab === tab.id ? 'white' : 'transparent', color: activeTab === tab.id ? 'var(--color-text)' : 'var(--color-text-secondary)', boxShadow: activeTab === tab.id ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s' }}>
              <Icon size={16} />
              {tab.label}
              {tab.count > 0 && <span style={{ background: '#ef4444', color: 'white', borderRadius: 10, fontSize: '0.65rem', fontWeight: 800, padding: '1px 6px' }}>{tab.count}</span>}
            </button>
          );
        })}
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {activeTab === 'students' && (
            loadingStudents ? <LoadingPage /> : <StagingTable type="students" data={stagingStudents}
              onApprove={(id) => approveStudent.mutate(id)}
              onReject={(id, reason) => rejectStudent.mutate({ id, reason })}
              approveLoading={approveStudent.isPending} rejectLoading={rejectStudent.isPending} />
          )}
          {activeTab === 'teachers' && (
            loadingTeachers ? <LoadingPage /> : <StagingTable type="teachers" data={stagingTeachers}
              onApprove={(id) => approveTeacher.mutate(id)}
              onReject={(id, reason) => rejectTeacher.mutate({ id, reason })}
              approveLoading={approveTeacher.isPending} rejectLoading={rejectTeacher.isPending} />
          )}
          {activeTab === 'volunteers' && (
            loadingVolunteers ? <LoadingPage /> : <StagingTable type="volunteers" data={stagingVolunteers}
              onApprove={(id) => approveVolunteer.mutate(id)}
              onReject={(id, reason) => rejectVolunteer.mutate({ id, reason })}
              approveLoading={approveVolunteer.isPending} rejectLoading={rejectVolunteer.isPending} />
          )}
        </div>
      </div>
    </div>
  );
}
