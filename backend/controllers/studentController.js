const mongoose = require('mongoose');
const Student = require('../models/Student');
const { StagingStudent } = require('../models/Staging');
const Class = require('../models/Class');
const Settings = require('../models/Settings');
const { generateStudentId } = require('../services/studentIdService');
const { notifyPendingVerification } = require('../services/notificationService');

const buildStudentFilter = (query) => {
  const { search, grade, category, village, classAssigned, vbsYear, isActive } = query;
  const filter = {};
  if (vbsYear) filter.vbsYear = Number(vbsYear);
  if (grade) filter.grade = grade;
  if (category) filter.category = category;
  if (village) filter.village = { $regex: village, $options: 'i' };
  if (classAssigned) filter.classAssigned = classAssigned;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { studentId: { $regex: search, $options: 'i' } },
      { parentName: { $regex: search, $options: 'i' } },
      { village: { $regex: search, $options: 'i' } },
    ];
  }
  return filter;
};

// @desc    Get all students (verified)
// @route   GET /api/students
// @access  Admin, Editor, Viewer, Teacher(own class)
const getStudents = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    let filter = buildStudentFilter(req.query);

    // Teacher can only see their class students
    if (req.user.role === 'teacher') {
      const { Teacher } = require('../models/TeacherVolunteer');
      const teacher = await Teacher.findOne({ user: req.user._id });
      if (!teacher?.classAssigned) {
        return res.json({ success: true, count: 0, total: 0, data: [] });
      }
      filter.classAssigned = teacher.classAssigned;
    }

    const [students, total] = await Promise.all([
      Student.find(filter)
        .populate('classAssigned', 'name category')
        .populate('createdBy', 'name userID')
        .sort({ studentId: 1 })
        .skip(skip)
        .limit(limit),
      Student.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: students.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: students,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single student
// @route   GET /api/students/:id
// @access  Admin, Editor, Viewer, Teacher(own class)
const getStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('classAssigned', 'name category year')
      .populate('createdBy', 'name userID');

    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    // Teacher access check
    if (req.user.role === 'teacher') {
      const { Teacher } = require('../models/TeacherVolunteer');
      const teacher = await Teacher.findOne({ user: req.user._id });
      if (!teacher?.classAssigned || student.classAssigned?._id?.toString() !== teacher.classAssigned.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied. Not in your class.' });
      }
    }

    res.json({ success: true, data: student });
  } catch (err) {
    next(err);
  }
};

// @desc    Create student (Admin: direct, Editor: staging)
// @route   POST /api/students
// @access  Admin, Editor
const createStudent = async (req, res, next) => {
  try {
    const settings = await Settings.findOne({ isActive: true });
    if (!settings) return res.status(400).json({ success: false, message: 'No active VBS year configured' });

    const studentData = { ...req.body, vbsYear: settings.year, createdBy: req.user._id };
    const { GRADE_TO_CATEGORY } = Student;
    if (studentData.grade) {
      studentData.category = GRADE_TO_CATEGORY[studentData.grade];
    }

    // Editor: goes to staging
    if (req.user.role === 'editor') {
      const staged = await StagingStudent.create(studentData);
      await notifyPendingVerification('student', studentData.name, req.user.name);
      return res.status(201).json({
        success: true,
        message: 'Student submitted for admin approval',
        data: staged,
        staged: true,
      });
    }

    // Admin: direct creation with ID generation
    const studentId = await generateStudentId(studentData.grade, settings.year);
    const student = await Student.create({ ...studentData, studentId });

    res.status(201).json({ success: true, message: 'Student created successfully', data: student });
  } catch (err) {
    next(err);
  }
};

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Admin only
const updateStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    // Grade change: update category, but NEVER change studentId
    const updateData = { ...req.body };
    if (updateData.grade) {
      const { GRADE_TO_CATEGORY } = Student;
      updateData.category = GRADE_TO_CATEGORY[updateData.grade];
    }
    delete updateData.studentId; // ID is immutable

    const updated = await Student.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate('classAssigned', 'name category');

    res.json({ success: true, message: 'Student updated', data: updated });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Admin only
const deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, message: 'Student deleted' });
  } catch (err) {
    next(err);
  }
};

// @desc    Bulk delete students
// @route   DELETE /api/students/bulk
// @access  Admin only
const bulkDeleteStudents = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ success: false, message: 'No student IDs provided' });
    const result = await Student.deleteMany({ _id: { $in: ids } });
    res.json({ success: true, message: `${result.deletedCount} students deleted` });
  } catch (err) {
    next(err);
  }
};

// @desc    Bulk allocate students to a class
// @route   PUT /api/students/bulk-allocate
// @access  Admin only
const bulkAllocate = async (req, res, next) => {
  try {
    const { studentIds, classId } = req.body;
    if (!studentIds?.length || !classId) {
      return res.status(400).json({ success: false, message: 'Provide studentIds and classId' });
    }

    const cls = await Class.findById(classId);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });

    // Validate grade compatibility
    const { CLASS_GRADE_RANGES } = Class;
    const allowedGrades = CLASS_GRADE_RANGES[cls.category];
    const students = await Student.find({ _id: { $in: studentIds } });
    const incompatible = students.filter((s) => !allowedGrades.includes(s.grade));

    if (incompatible.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${incompatible.length} students have grades incompatible with ${cls.category} class`,
        data: incompatible.map((s) => ({ name: s.name, grade: s.grade })),
      });
    }

    await Student.updateMany({ _id: { $in: studentIds } }, { classAssigned: classId });
    res.json({ success: true, message: `${studentIds.length} students allocated to ${cls.name}` });
  } catch (err) {
    next(err);
  }
};

// ─── STAGING / VERIFICATION ────────────────────────────────────────

// @desc    Get staging (pending) students
// @route   GET /api/students/staging
// @access  Admin, Editor (own only)
const getStagingStudents = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'editor') filter.createdBy = req.user._id;

    const students = await StagingStudent.find(filter)
      .populate('createdBy', 'name userID')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: students.length, data: students });
  } catch (err) {
    next(err);
  }
};

// @desc    Approve staged student
// @route   POST /api/students/staging/:id/approve
// @access  Admin only
const approveStagedStudent = async (req, res, next) => {
  try {
    const staged = await StagingStudent.findById(req.params.id).populate('createdBy');
    if (!staged) return res.status(404).json({ success: false, message: 'Staged student not found' });

    const settings = await Settings.findOne({ isActive: true });
    if (!settings) return res.status(400).json({ success: false, message: 'No active VBS year' });

    const studentId = await generateStudentId(staged.grade, settings.year);

    // Allow admin to override data before approving
    const overrides = req.body || {};
    const studentData = {
      studentId,
      name: overrides.name || staged.name,
      dateOfBirth: overrides.dateOfBirth || staged.dateOfBirth,
      gender: overrides.gender || staged.gender,
      grade: overrides.grade || staged.grade,
      category: overrides.category || staged.category,
      schoolName: overrides.schoolName || staged.schoolName,
      parentName: overrides.parentName || staged.parentName,
      contactNumber: overrides.contactNumber || staged.contactNumber,
      alternateNumber: overrides.alternateNumber || staged.alternateNumber,
      village: overrides.village || staged.village,
      vbsYear: settings.year,
      createdBy: staged.createdBy._id,
      approvedBy: req.user._id,
      approvedAt: new Date(),
    };

    const student = await Student.create(studentData);

    // Notify editor
    const { notifyEntryApproved } = require('../services/notificationService');
    await notifyEntryApproved(staged.createdBy._id, 'student', staged.name);

    await StagingStudent.findByIdAndDelete(req.params.id);

    res.status(201).json({
      success: true,
      message: `Student approved. ID: ${studentId}`,
      data: student,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Reject staged student
// @route   POST /api/students/staging/:id/reject
// @access  Admin only
const rejectStagedStudent = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Rejection reason is required' });

    const staged = await StagingStudent.findById(req.params.id).populate('createdBy');
    if (!staged) return res.status(404).json({ success: false, message: 'Staged student not found' });

    const { notifyEntryRejected } = require('../services/notificationService');
    await notifyEntryRejected(staged.createdBy._id, 'student', staged.name, reason);

    await StagingStudent.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Student entry rejected and editor notified' });
  } catch (err) {
    next(err);
  }
};

// @desc    Bulk approve staged students
// @route   POST /api/students/staging/bulk-approve
// @access  Admin only
const bulkApproveStagedStudents = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ success: false, message: 'No IDs provided' });

    const settings = await Settings.findOne({ isActive: true });
    if (!settings) return res.status(400).json({ success: false, message: 'No active VBS year' });

    const results = { approved: [], failed: [] };
    const { notifyEntryApproved } = require('../services/notificationService');

    for (const id of ids) {
      try {
        const staged = await StagingStudent.findById(id).populate('createdBy');
        if (!staged) { results.failed.push({ id, reason: 'Not found' }); continue; }

        const studentId = await generateStudentId(staged.grade, settings.year);
        const student = await Student.create({
          studentId,
          name: staged.name, dateOfBirth: staged.dateOfBirth, gender: staged.gender,
          grade: staged.grade, category: staged.category, schoolName: staged.schoolName,
          parentName: staged.parentName, contactNumber: staged.contactNumber,
          alternateNumber: staged.alternateNumber, village: staged.village,
          vbsYear: settings.year, createdBy: staged.createdBy._id,
          approvedBy: req.user._id, approvedAt: new Date(),
        });

        await notifyEntryApproved(staged.createdBy._id, 'student', staged.name);
        await StagingStudent.findByIdAndDelete(id);
        results.approved.push({ id, studentId, name: student.name });
      } catch (e) {
        results.failed.push({ id, reason: e.message });
      }
    }

    res.json({
      success: true,
      message: `${results.approved.length} approved, ${results.failed.length} failed`,
      data: results,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStudents, getStudent, createStudent, updateStudent, deleteStudent,
  bulkDeleteStudents, bulkAllocate, getStagingStudents, approveStagedStudent,
  rejectStagedStudent, bulkApproveStagedStudents,
};
