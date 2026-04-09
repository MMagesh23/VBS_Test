import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Users, GraduationCap, Heart } from 'lucide-react';
import { studentsAPI, teachersAPI, volunteersAPI } from '../services/api';
import { Modal, LoadingPage, EmptyState, CategoryBadge } from '../components/common';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

function RejectModal({ isOpen, onClose, onReject, entityName, loading }) {
  const [reason, setReason] = useState('');
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reject Entry"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-danger" onClick={() => { onReject(reason); setReason(''); }} disabled={!reason.trim() || loading}>
          {loading ? 'Rejecting...' : 'Reject Entry'}
        </button>
      </>}>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 16, fontSize: '0.875rem' }}>
        Rejecting: <strong>{entityName}</strong>
      </p>
      <div className="form-group">
        <label className="form-label">Rejection Reason <span className="required">*</span></label>
        <textarea className="form-textarea" rows={3} value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Explain why this entry is being rejected..." />
      </div>
    </Modal>
  );
}

// Fix 3: StagingTable with in-flight guard to prevent duplicate approve/reject
function StagingTable({ type, data, onApprove, onReject, approveLoading, rejectLoading }) {
  const [rejectTarget, setRejectTarget] = useState(null);
  // Track which IDs are currently being processed to prevent duplicate clicks
  const inFlightRef = useRef(new Set());

  const items = data || [];
  if (items.length === 0) {
    return <EmptyState icon={CheckCircle} title={`No pending ${type}`} description="All entries have been reviewed." />;
  }

  const handleApprove = (item) => {
    if (inFlightRef.current.has(item._id)) return; // block duplicate
    inFlightRef.current.add(item._id);
    onApprove(item._id, () => { inFlightRef.current.delete(item._id); });
  };

  const handleRejectConfirm = (reason) => {
    if (!rejectTarget) return;
    if (inFlightRef.current.has(rejectTarget._id)) return;
    inFlightRef.current.add(rejectTarget._id);
    onReject(rejectTarget._id, reason, () => {
      inFlightRef.current.delete(rejectTarget._id);
      setRejectTarget(null);
    });
  };

  return (
    <div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
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
            {items.map(item => {
              const isInFlight = inFlightRef.current.has(item._id);
              return (
                <motion.tr key={item._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                    {format(new Date(item.createdAt), 'MMM d, h:mm a')}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-success btn-sm"
                        onClick={() => handleApprove(item)}
                        disabled={approveLoading || isInFlight}>
                        <CheckCircle size={14} />
                        {isInFlight && approveLoading ? 'Processing...' : 'Approve'}
                      </button>
                      <button className="btn btn-danger btn-sm"
                        onClick={() => !isInFlight && setRejectTarget(item)}
                        disabled={rejectLoading || isInFlight}>
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <RejectModal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        entityName={rejectTarget?.name}
        onReject={handleRejectConfirm}
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

  const invalidate = () => {
    qc.invalidateQueries(['staging-students']);
    qc.invalidateQueries(['staging-teachers']);
    qc.invalidateQueries(['staging-volunteers']);
    qc.invalidateQueries(['dashboard-stats']);
  };

  // Fix 3: Each mutation uses onSuccess callback to release the in-flight guard
  const approveStudentMut = useMutation({
    mutationFn: (id) => studentsAPI.approve(id),
    onSuccess: () => { toast.success('Student approved!'); invalidate(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to approve'),
  });
  const rejectStudentMut = useMutation({
    mutationFn: ({ id, reason }) => studentsAPI.reject(id, reason),
    onSuccess: () => { toast.success('Student rejected'); invalidate(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to reject'),
  });
  const approveTeacherMut = useMutation({
    mutationFn: (id) => teachersAPI.approve(id),
    onSuccess: () => { toast.success('Teacher approved!'); invalidate(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to approve'),
  });
  const rejectTeacherMut = useMutation({
    mutationFn: ({ id, reason }) => teachersAPI.reject(id, reason),
    onSuccess: () => { toast.success('Teacher rejected'); invalidate(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to reject'),
  });
  const approveVolunteerMut = useMutation({
    mutationFn: (id) => volunteersAPI.approve(id),
    onSuccess: () => { toast.success('Volunteer approved!'); invalidate(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to approve'),
  });
  const rejectVolunteerMut = useMutation({
    mutationFn: ({ id, reason }) => volunteersAPI.reject(id, reason),
    onSuccess: () => { toast.success('Volunteer rejected'); invalidate(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to reject'),
  });

  const makeHandlers = (approveMut, rejectMut) => ({
    onApprove: (id, done) => approveMut.mutate(id, { onSettled: done }),
    onReject: (id, reason, done) => rejectMut.mutate({ id, reason }, { onSettled: done }),
  });

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
          {totalPending > 0 && (
            <span className="badge badge-red" style={{ fontSize: '0.875rem', padding: '4px 12px' }}>
              {totalPending} pending
            </span>
          )}
        </div>
        <p className="page-subtitle">Review and approve/reject entries submitted by editors</p>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--color-bg)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', fontFamily: 'var(--font-sans)', background: activeTab === tab.id ? 'white' : 'transparent', color: activeTab === tab.id ? 'var(--color-text)' : 'var(--color-text-secondary)', boxShadow: activeTab === tab.id ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s' }}>
              <Icon size={16} />
              {tab.label}
              {tab.count > 0 && (
                <span style={{ background: '#ef4444', color: 'white', borderRadius: 10, fontSize: '0.65rem', fontWeight: 800, padding: '1px 6px' }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {activeTab === 'students' && (
            loadingStudents ? <LoadingPage /> : (
              <StagingTable type="students" data={stagingStudents}
                {...makeHandlers(approveStudentMut, rejectStudentMut)}
                approveLoading={approveStudentMut.isPending}
                rejectLoading={rejectStudentMut.isPending} />
            )
          )}
          {activeTab === 'teachers' && (
            loadingTeachers ? <LoadingPage /> : (
              <StagingTable type="teachers" data={stagingTeachers}
                {...makeHandlers(approveTeacherMut, rejectTeacherMut)}
                approveLoading={approveTeacherMut.isPending}
                rejectLoading={rejectTeacherMut.isPending} />
            )
          )}
          {activeTab === 'volunteers' && (
            loadingVolunteers ? <LoadingPage /> : (
              <StagingTable type="volunteers" data={stagingVolunteers}
                {...makeHandlers(approveVolunteerMut, rejectVolunteerMut)}
                approveLoading={approveVolunteerMut.isPending}
                rejectLoading={rejectVolunteerMut.isPending} />
            )
          )}
        </div>
      </div>
    </div>
  );
}