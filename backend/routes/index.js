const express = require('express');
const rateLimit = require('express-rate-limit');
const { protect, adminOnly, editorOrAdmin, authorize } = require('../middleware/auth');

const { login, refresh, logout, changePassword, getMe } = require('../controllers/authController');
const { getUsers, createUser, updateUser, resetPassword, deleteUser } = require('../controllers/userController');
const {
  getStudents, getStudent, createStudent, updateStudent, deleteStudent,
  bulkDeleteStudents, bulkAllocate, getStagingStudents, approveStagedStudent,
  rejectStagedStudent, bulkApproveStagedStudents,
} = require('../controllers/studentController');
const {
  getTeachers, getTeacher, createTeacher, updateTeacher, deleteTeacher, assignTeacherToClass,
  getStagingTeachers, approveStagedTeacher, rejectStagedTeacher, bulkApproveStagedTeachers,
  getVolunteers, getVolunteer, createVolunteer, updateVolunteer, deleteVolunteer,
  getStagingVolunteers, approveStagedVolunteer, rejectStagedVolunteer, bulkApproveStagedVolunteers,
} = require('../controllers/teacherVolunteerController');
const { getClasses, getClass, createClass, updateClass, deleteClass, getEligibleStudents } = require('../controllers/classController');
const {
  getStudentAttendance, submitStudentAttendance, modifyStudentAttendance,
  deleteStudentAttendance, getWindowStatus, getTodaySummary,
} = require('../controllers/studentAttendanceController');
const {
  getTeacherAttendance, submitTeacherAttendance, modifyTeacherAttendance, deleteTeacherAttendance,
  getVolunteerAttendance, submitVolunteerAttendance, modifyVolunteerAttendance, deleteVolunteerAttendance,
} = require('../controllers/teacherVolunteerAttendanceController');
const { getDashboardStats, getStudentAnalytics, getAttendanceTrends, getModificationsSummary } = require('../controllers/analyticsController');
const { getDailyReport, getClassReport, getStudentReport, getTeacherReport, getVolunteerReport, getFullYearReport } = require('../controllers/reportsController');
const { getSettings, getActiveSettings, createSettings, updateSettings, activateYear, getNotifications, markNotificationRead, markAllRead, broadcastNotification } = require('../controllers/settingsNotificationsController');
const { getTeacherExportData } = require('../controllers/exportController');

const router = express.Router();

// ─── Login rate limit ONLY — no global rate limiting on other routes ──
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 5,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true, legacyHeaders: false,
});

// ─── AUTH ──────────────────────────────────────────────────────────
router.post('/auth/login', loginLimiter, login);
router.post('/auth/refresh', refresh);
router.post('/auth/logout', protect, logout);
router.put('/auth/change-password', protect, changePassword);
router.get('/auth/me', protect, getMe);

// ─── USERS ─────────────────────────────────────────────────────────
router.get('/users', protect, adminOnly, getUsers);
router.post('/users', protect, adminOnly, createUser);
router.put('/users/:id', protect, adminOnly, updateUser);
router.put('/users/:id/reset-password', protect, adminOnly, resetPassword);
router.delete('/users/:id', protect, adminOnly, deleteUser);

// ─── STUDENTS ──────────────────────────────────────────────────────
router.get('/students', protect, getStudents);
router.post('/students', protect, authorize('admin', 'editor'), createStudent);
router.delete('/students/bulk', protect, adminOnly, bulkDeleteStudents);
router.put('/students/bulk-allocate', protect, adminOnly, bulkAllocate);
router.get('/students/staging', protect, authorize('admin', 'editor'), getStagingStudents);
router.post('/students/staging/bulk-approve', protect, adminOnly, bulkApproveStagedStudents);
router.post('/students/staging/:id/approve', protect, adminOnly, approveStagedStudent);
router.post('/students/staging/:id/reject', protect, adminOnly, rejectStagedStudent);
router.get('/students/:id', protect, getStudent);
router.put('/students/:id', protect, adminOnly, updateStudent);
router.delete('/students/:id', protect, adminOnly, deleteStudent);

// ─── TEACHERS ──────────────────────────────────────────────────────
router.get('/teachers', protect, getTeachers);
router.post('/teachers', protect, authorize('admin', 'editor'), createTeacher);
router.get('/teachers/staging', protect, authorize('admin', 'editor'), getStagingTeachers);
router.post('/teachers/staging/bulk-approve', protect, adminOnly, bulkApproveStagedTeachers);
router.post('/teachers/staging/:id/approve', protect, adminOnly, approveStagedTeacher);
router.post('/teachers/staging/:id/reject', protect, adminOnly, rejectStagedTeacher);
router.get('/teachers/:id', protect, getTeacher);
router.put('/teachers/:id', protect, adminOnly, updateTeacher);
router.put('/teachers/:id/assign-class', protect, adminOnly, assignTeacherToClass);
router.delete('/teachers/:id', protect, adminOnly, deleteTeacher);

// ─── VOLUNTEERS ─────────────────────────────────────────────────────
router.get('/volunteers', protect, getVolunteers);
router.post('/volunteers', protect, authorize('admin', 'editor'), createVolunteer);
router.get('/volunteers/staging', protect, authorize('admin', 'editor'), getStagingVolunteers);
router.post('/volunteers/staging/bulk-approve', protect, adminOnly, bulkApproveStagedVolunteers);
router.post('/volunteers/staging/:id/approve', protect, adminOnly, approveStagedVolunteer);
router.post('/volunteers/staging/:id/reject', protect, adminOnly, rejectStagedVolunteer);
router.get('/volunteers/:id', protect, getVolunteer);
router.put('/volunteers/:id', protect, adminOnly, updateVolunteer);
router.delete('/volunteers/:id', protect, adminOnly, deleteVolunteer);

// ─── CLASSES ────────────────────────────────────────────────────────
router.get('/classes', protect, getClasses);
router.post('/classes', protect, adminOnly, createClass);
router.get('/classes/:id', protect, getClass);
router.get('/classes/:id/eligible-students', protect, adminOnly, getEligibleStudents);
router.put('/classes/:id', protect, adminOnly, updateClass);
router.delete('/classes/:id', protect, adminOnly, deleteClass);

// ─── ATTENDANCE ──────────────────────────────────────────────────────
router.get('/attendance/window-status', protect, getWindowStatus);
router.get('/attendance/today-summary', protect, authorize('admin', 'editor', 'viewer'), getTodaySummary);
router.get('/attendance/students', protect, authorize('admin', 'viewer', 'teacher'), getStudentAttendance);
router.post('/attendance/students', protect, authorize('admin', 'teacher'), submitStudentAttendance);
router.put('/attendance/students/:id/modify', protect, adminOnly, modifyStudentAttendance);
router.delete('/attendance/students/:id', protect, adminOnly, deleteStudentAttendance);
router.get('/attendance/teachers', protect, authorize('admin', 'editor', 'viewer', 'teacher'), getTeacherAttendance);
router.post('/attendance/teachers', protect, editorOrAdmin, submitTeacherAttendance);
router.put('/attendance/teachers/:id/modify', protect, adminOnly, modifyTeacherAttendance);
router.delete('/attendance/teachers/:id', protect, adminOnly, deleteTeacherAttendance);
router.get('/attendance/volunteers', protect, authorize('admin', 'editor', 'viewer'), getVolunteerAttendance);
router.post('/attendance/volunteers', protect, editorOrAdmin, submitVolunteerAttendance);
router.put('/attendance/volunteers/:id/modify', protect, adminOnly, modifyVolunteerAttendance);
router.delete('/attendance/volunteers/:id', protect, adminOnly, deleteVolunteerAttendance);

// ─── ANALYTICS ───────────────────────────────────────────────────────
router.get('/analytics/dashboard', protect, authorize('admin', 'viewer'), getDashboardStats);
router.get('/analytics/students', protect, authorize('admin', 'viewer'), getStudentAnalytics);
router.get('/analytics/attendance-trends', protect, authorize('admin', 'viewer'), getAttendanceTrends);
router.get('/analytics/modifications', protect, adminOnly, getModificationsSummary);

// ─── REPORTS ─────────────────────────────────────────────────────────
router.get('/reports/daily', protect, authorize('admin', 'viewer'), getDailyReport);
router.get('/reports/full-year', protect, authorize('admin', 'viewer'), getFullYearReport);
router.get('/reports/class/:classId', protect, authorize('admin', 'viewer'), getClassReport);
router.get('/reports/student/:studentId', protect, authorize('admin', 'viewer'), getStudentReport);
router.get('/reports/teacher/:teacherId', protect, authorize('admin', 'viewer'), getTeacherReport);
router.get('/reports/volunteer/:volunteerId', protect, authorize('admin', 'viewer'), getVolunteerReport);

// ─── TEACHER EXPORT ──────────────────────────────────────────────────
router.get('/teacher/export-data', protect, authorize('admin', 'teacher'), getTeacherExportData);

// ─── SETTINGS ────────────────────────────────────────────────────────
router.get('/settings', protect, getSettings);
router.get('/settings/active', getActiveSettings); // Public — home page countdown
router.post('/settings', protect, adminOnly, createSettings);
router.put('/settings/:id', protect, adminOnly, updateSettings);
router.put('/settings/:id/activate', protect, adminOnly, activateYear);

// ─── NOTIFICATIONS ───────────────────────────────────────────────────
router.get('/notifications', protect, getNotifications);
router.put('/notifications/mark-all-read', protect, markAllRead);
router.put('/notifications/:id/read', protect, markNotificationRead);
router.post('/notifications/broadcast', protect, adminOnly, broadcastNotification);

module.exports = router;