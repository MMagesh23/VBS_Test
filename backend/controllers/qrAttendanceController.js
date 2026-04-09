const crypto = require('crypto');
const QRSession = require('../models/QRSession');
const { TeacherAttendance } = require('../models/Attendance');
const { Teacher } = require('../models/TeacherVolunteer');
const Settings = require('../models/Settings');
const { normalizeToISTMidnight } = require('../services/attendanceWindowService');

// ─── Helpers ──────────────────────────────────────────────────────
const generateToken = () => crypto.randomBytes(32).toString('hex');

const getISTTimeString = () => {
  const now = new Date();
  return now.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

// @desc    Create a new QR session (admin generates QR code)
// @route   POST /api/qr-attendance/sessions
// @access  Admin
const createQRSession = async (req, res, next) => {
  try {
    const { date, label, expiryMinutes = 10 } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }

    const settings = await Settings.findOne({ isActive: true });
    if (!settings) {
      return res.status(400).json({ success: false, message: 'No active VBS year configured' });
    }

    const attendanceDate = normalizeToISTMidnight(date);

    // Validate date is within VBS schedule
    const startDate = normalizeToISTMidnight(settings.dates.startDate);
    const endDate = new Date(normalizeToISTMidnight(settings.dates.endDate).getTime() + 24 * 60 * 60 * 1000 - 1);
    if (attendanceDate < startDate || attendanceDate > endDate) {
      return res.status(400).json({
        success: false,
        message: `Date is outside VBS schedule (${settings.dates.startDate.toDateString()} – ${settings.dates.endDate.toDateString()})`,
      });
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    const session = await QRSession.create({
      token,
      date: attendanceDate,
      vbsYear: settings.year,
      createdBy: req.user._id,
      expiresAt,
      label: label?.trim() || `Attendance — ${attendanceDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })}`,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'QR session created',
      data: {
        _id: session._id,
        token: session.token,
        date: session.date,
        vbsYear: session.vbsYear,
        label: session.label,
        expiresAt: session.expiresAt,
        expiryMinutes,
        isActive: session.isActive,
        scansCount: 0,
        // The QR payload — teachers scan this URL
        qrPayload: `QR_ATTENDANCE:${token}`,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all QR sessions (admin view)
// @route   GET /api/qr-attendance/sessions
// @access  Admin
const getQRSessions = async (req, res, next) => {
  try {
    const { date, vbsYear } = req.query;
    const filter = {};
    if (vbsYear) filter.vbsYear = Number(vbsYear);
    if (date) filter.date = normalizeToISTMidnight(date);

    const sessions = await QRSession.find(filter)
      .populate('createdBy', 'name')
      .populate('scans.teacher', 'name classAssigned')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, count: sessions.length, data: sessions });
  } catch (err) {
    next(err);
  }
};

// @desc    Get a single QR session by ID
// @route   GET /api/qr-attendance/sessions/:id
// @access  Admin
const getQRSession = async (req, res, next) => {
  try {
    const session = await QRSession.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('scans.teacher', 'name classAssigned contactNumber');

    if (!session) {
      return res.status(404).json({ success: false, message: 'QR session not found' });
    }

    const now = new Date();
    const isExpired = now > session.expiresAt;
    const remainingMs = Math.max(0, session.expiresAt - now);

    res.json({
      success: true,
      data: {
        ...session.toObject(),
        isExpired,
        remainingSeconds: Math.floor(remainingMs / 1000),
        scansCount: session.scans.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Deactivate a QR session
// @route   PUT /api/qr-attendance/sessions/:id/deactivate
// @access  Admin
const deactivateQRSession = async (req, res, next) => {
  try {
    const session = await QRSession.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!session) {
      return res.status(404).json({ success: false, message: 'QR session not found' });
    }
    res.json({ success: true, message: 'QR session deactivated', data: session });
  } catch (err) {
    next(err);
  }
};

// @desc    Teacher scans QR code — marks their attendance
// @route   POST /api/qr-attendance/scan
// @access  Teacher (must be logged in)
const scanQRCode = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'QR token is required' });
    }

    // Clean token — accept both raw token and "QR_ATTENDANCE:token" format
    const cleanToken = token.startsWith('QR_ATTENDANCE:') ? token.slice(14) : token;

    // Find the session
    const session = await QRSession.findOne({ token: cleanToken });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Invalid QR code. Please ask admin for a new one.' });
    }

    // Check if session is active
    if (!session.isActive) {
      return res.status(400).json({ success: false, message: 'This QR session has been deactivated by the admin.' });
    }

    // Check expiry
    const now = new Date();
    if (now > session.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'This QR code has expired. Please ask admin to generate a new one.',
        expired: true,
      });
    }

    // Find the teacher profile linked to this user
    const teacher = await Teacher.findOne({ user: req.user._id });
    if (!teacher) {
      return res.status(403).json({
        success: false,
        message: 'No teacher profile linked to your account. Contact admin.',
      });
    }

    // Check if this teacher already scanned this session
    const alreadyScanned = session.scans.some(
      (s) => s.teacher?.toString() === teacher._id.toString()
    );
    if (alreadyScanned) {
      return res.status(400).json({
        success: false,
        message: 'You have already marked your attendance for this session.',
        alreadyScanned: true,
      });
    }

    // Determine status: if scanned within 30 min of session creation, present; else late
    const sessionAgeMin = (now - session.createdAt) / (1000 * 60);
    const status = sessionAgeMin <= 30 ? 'present' : 'late';
    const arrivalTime = getISTTimeString();

    // Add scan record to session
    session.scans.push({
      teacher: teacher._id,
      teacherName: teacher.name,
      scannedAt: now,
      status,
      arrivalTime,
    });
    await session.save();

    // Create or update TeacherAttendance record
    const existing = await TeacherAttendance.findOne({
      date: session.date,
      teacher: teacher._id,
    });

    if (existing) {
      // Update existing record
      existing.status = status;
      existing.arrivalTime = arrivalTime;
      existing.remarks = `Marked via QR scan at ${arrivalTime}`;
      existing.isModified = true;
      existing.modificationHistory.push({
        modifiedBy: req.user._id,
        modifiedByName: req.user.name,
        modifiedAt: now,
        changes: [{
          entityId: teacher._id.toString(),
          entityName: teacher.name,
          previousStatus: existing.status,
          newStatus: status,
        }],
        reason: 'QR code scan',
      });
      await existing.save();
    } else {
      await TeacherAttendance.create({
        date: session.date,
        teacher: teacher._id,
        vbsYear: session.vbsYear,
        status,
        arrivalTime,
        remarks: `Marked via QR scan at ${arrivalTime}`,
        markedBy: req.user._id,
        markedByName: req.user.name,
      });
    }

    res.json({
      success: true,
      message: status === 'present'
        ? `✓ Attendance marked! Present at ${arrivalTime}`
        : `✓ Attendance marked as Late at ${arrivalTime}`,
      data: {
        teacherName: teacher.name,
        status,
        arrivalTime,
        date: session.date,
        sessionLabel: session.label,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin manually scans on behalf of teacher (admin panel scan)
// @route   POST /api/qr-attendance/admin-scan
// @access  Admin
const adminScanForTeacher = async (req, res, next) => {
  try {
    const { sessionId, teacherId, status = 'present' } = req.body;

    if (!sessionId || !teacherId) {
      return res.status(400).json({ success: false, message: 'sessionId and teacherId are required' });
    }

    const session = await QRSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    const arrivalTime = getISTTimeString();
    const now = new Date();

    // Remove existing scan if any
    session.scans = session.scans.filter(
      (s) => s.teacher?.toString() !== teacher._id.toString()
    );

    session.scans.push({
      teacher: teacher._id,
      teacherName: teacher.name,
      scannedAt: now,
      status,
      arrivalTime,
    });
    await session.save();

    // Upsert TeacherAttendance
    const existing = await TeacherAttendance.findOne({
      date: session.date,
      teacher: teacher._id,
    });

    if (existing) {
      existing.status = status;
      existing.arrivalTime = arrivalTime;
      existing.remarks = `Manually marked by admin via QR session`;
      existing.isModified = true;
      existing.modificationHistory.push({
        modifiedBy: req.user._id,
        modifiedByName: req.user.name,
        modifiedAt: now,
        changes: [{
          entityId: teacher._id.toString(),
          entityName: teacher.name,
          previousStatus: existing.status,
          newStatus: status,
        }],
        reason: 'Admin manual mark via QR session',
      });
      await existing.save();
    } else {
      await TeacherAttendance.create({
        date: session.date,
        teacher: teacher._id,
        vbsYear: session.vbsYear,
        status,
        arrivalTime,
        remarks: `Manually marked by admin via QR session`,
        markedBy: req.user._id,
        markedByName: req.user.name,
      });
    }

    res.json({
      success: true,
      message: `${teacher.name} marked as ${status}`,
      data: { teacherName: teacher.name, status, arrivalTime },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Validate QR token (used by teacher scan page before submitting)
// @route   GET /api/qr-attendance/validate/:token
// @access  Teacher
const validateToken = async (req, res, next) => {
  try {
    const cleanToken = req.params.token.startsWith('QR_ATTENDANCE:')
      ? req.params.token.slice(14)
      : req.params.token;

    const session = await QRSession.findOne({ token: cleanToken });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Invalid QR code' });
    }

    const now = new Date();
    const isExpired = now > session.expiresAt;
    const remainingMs = Math.max(0, session.expiresAt - now);

    // Check if teacher already scanned
    let alreadyScanned = false;
    if (req.user?.role === 'teacher') {
      const teacher = await Teacher.findOne({ user: req.user._id });
      if (teacher) {
        alreadyScanned = session.scans.some(
          (s) => s.teacher?.toString() === teacher._id.toString()
        );
      }
    }

    res.json({
      success: true,
      data: {
        sessionId: session._id,
        label: session.label,
        date: session.date,
        vbsYear: session.vbsYear,
        isActive: session.isActive,
        isExpired,
        alreadyScanned,
        remainingSeconds: Math.floor(remainingMs / 1000),
        scansCount: session.scans.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createQRSession,
  getQRSessions,
  getQRSession,
  deactivateQRSession,
  scanQRCode,
  adminScanForTeacher,
  validateToken,
};
