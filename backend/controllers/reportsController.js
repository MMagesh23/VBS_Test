const Student = require('../models/Student');
const { Teacher, Volunteer } = require('../models/TeacherVolunteer');
const Class = require('../models/Class');
const { StudentAttendance, TeacherAttendance, VolunteerAttendance } = require('../models/Attendance');
const Settings = require('../models/Settings');

const normalizeDate = (d) => { const date = new Date(d); date.setHours(0,0,0,0); return date; };

// @desc    Daily report
// @route   GET /api/reports/daily
const getDailyReport = async (req, res, next) => {
  try {
    const { date, vbsYear } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'Date is required' });

    const reportDate = normalizeDate(date);
    const yearFilter = vbsYear ? { vbsYear: Number(vbsYear) } : {};

    const [studentAttendance, teacherAttendance, volunteerAttendance, classes] = await Promise.all([
      StudentAttendance.find({ date: reportDate, ...yearFilter })
        .populate('class', 'name category')
        .populate('submittedBy', 'name role')
        .populate('records.student', 'name studentId grade'),
      TeacherAttendance.find({ date: reportDate, ...yearFilter })
        .populate('teacher', 'name classAssigned'),
      VolunteerAttendance.find({ date: reportDate, ...yearFilter })
        .populate('volunteer', 'name role shift'),
      Class.find(vbsYear ? { year: Number(vbsYear) } : {}),
    ]);

    const submittedClassIds = studentAttendance.map((a) => a.class?._id?.toString());
    const unsubmittedClasses = classes.filter((c) => !submittedClassIds.includes(c._id.toString()));

    const totalStudentPresent = studentAttendance.reduce(
      (sum, a) => sum + a.records.filter((r) => r.status === 'present').length, 0
    );
    const totalStudentAbsent = studentAttendance.reduce(
      (sum, a) => sum + a.records.filter((r) => r.status === 'absent').length, 0
    );

    res.json({
      success: true,
      data: {
        date: reportDate,
        summary: {
          students: { present: totalStudentPresent, absent: totalStudentAbsent,
            total: totalStudentPresent + totalStudentAbsent,
            rate: totalStudentPresent + totalStudentAbsent > 0
              ? Math.round((totalStudentPresent / (totalStudentPresent + totalStudentAbsent)) * 100) : 0 },
          teachers: {
            present: teacherAttendance.filter(t => t.status === 'present').length,
            absent: teacherAttendance.filter(t => t.status === 'absent').length,
            late: teacherAttendance.filter(t => t.status === 'late').length,
          },
          volunteers: {
            present: volunteerAttendance.filter(v => ['present','halfDay'].includes(v.status)).length,
            absent: volunteerAttendance.filter(v => v.status === 'absent').length,
          },
        },
        studentAttendance,
        teacherAttendance,
        volunteerAttendance,
        unsubmittedClasses,
      },
    });
  } catch (err) { next(err); }
};

// @desc    Class report
// @route   GET /api/reports/class/:classId
const getClassReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const cls = await Class.findById(req.params.classId).populate('teacher', 'name');
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });

    const students = await Student.find({ classAssigned: cls._id, isActive: true }).sort({ studentId: 1 });

    const dateFilter = {};
    if (startDate) dateFilter.$gte = normalizeDate(startDate);
    if (endDate) dateFilter.$lte = normalizeDate(endDate);

    const attendanceFilter = { class: cls._id };
    if (Object.keys(dateFilter).length) attendanceFilter.date = dateFilter;

    const attendanceRecords = await StudentAttendance.find(attendanceFilter)
      .populate('submittedBy', 'name')
      .sort({ date: 1 });

    // Build per-student stats
    const studentStats = students.map((s) => {
      let present = 0, absent = 0;
      attendanceRecords.forEach((rec) => {
        const studentRecord = rec.records.find((r) => r.student?.toString() === s._id.toString());
        if (studentRecord) {
          if (studentRecord.status === 'present') present++;
          else absent++;
        }
      });
      const total = present + absent;
      return { ...s.toObject(), present, absent, total, rate: total > 0 ? Math.round((present/total)*100) : 0 };
    });

    const totalDays = attendanceRecords.length;
    const classAvgRate = studentStats.length > 0
      ? Math.round(studentStats.reduce((sum, s) => sum + s.rate, 0) / studentStats.length) : 0;

    res.json({
      success: true,
      data: { class: cls, students: studentStats, attendanceRecords, totalDays, classAvgRate },
    });
  } catch (err) { next(err); }
};

// @desc    Student report
// @route   GET /api/reports/student/:studentId
const getStudentReport = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.studentId).populate('classAssigned', 'name category');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const attendanceRecords = await StudentAttendance.find({
      class: student.classAssigned,
      'records.student': student._id,
    }).sort({ date: 1 });

    const history = attendanceRecords.map((rec) => {
      const r = rec.records.find((r) => r.student?.toString() === student._id.toString());
      return { date: rec.date, status: r?.status || 'unknown', isModified: rec.isModified };
    });

    const present = history.filter((h) => h.status === 'present').length;
    const absent = history.filter((h) => h.status === 'absent').length;
    const total = history.length;

    res.json({
      success: true,
      data: {
        student,
        attendance: { history, present, absent, total, rate: total > 0 ? Math.round((present/total)*100) : 0 },
      },
    });
  } catch (err) { next(err); }
};

// @desc    Teacher report
// @route   GET /api/reports/teacher/:teacherId
const getTeacherReport = async (req, res, next) => {
  try {
    const teacher = await Teacher.findById(req.params.teacherId)
      .populate('classAssigned', 'name category')
      .populate('user', 'userID name');
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });

    const settings = await Settings.findOne({ isActive: true });
    const vbsYear = settings?.year;

    const [submissionHistory, ownAttendance] = await Promise.all([
      StudentAttendance.find({ class: teacher.classAssigned, vbsYear })
        .select('date submittedBy submittedByName records isModified')
        .sort({ date: 1 }),
      TeacherAttendance.find({ teacher: teacher._id, vbsYear }).sort({ date: 1 }),
    ]);

    const totalDays = settings
      ? Math.round((new Date(settings.dates.endDate) - new Date(settings.dates.startDate)) / (1000*60*60*24)) + 1
      : 0;

    const daysPresent = ownAttendance.filter((a) => a.status === 'present').length;

    res.json({
      success: true,
      data: {
        teacher,
        submissions: {
          history: submissionHistory,
          total: submissionHistory.length,
          expectedDays: totalDays,
          submissionRate: totalDays > 0 ? Math.round((submissionHistory.length / totalDays) * 100) : 0,
        },
        ownAttendance: {
          history: ownAttendance,
          present: daysPresent,
          absent: ownAttendance.filter((a) => a.status === 'absent').length,
          late: ownAttendance.filter((a) => a.status === 'late').length,
          total: ownAttendance.length,
          rate: totalDays > 0 ? Math.round((daysPresent / totalDays) * 100) : 0,
        },
      },
    });
  } catch (err) { next(err); }
};

// @desc    Volunteer report
// @route   GET /api/reports/volunteer/:volunteerId
const getVolunteerReport = async (req, res, next) => {
  try {
    const volunteer = await Volunteer.findById(req.params.volunteerId);
    if (!volunteer) return res.status(404).json({ success: false, message: 'Volunteer not found' });

    const settings = await Settings.findOne({ isActive: true });
    const attendance = await VolunteerAttendance.find({ volunteer: volunteer._id, vbsYear: settings?.year }).sort({ date: 1 });

    const totalDays = settings
      ? Math.round((new Date(settings.dates.endDate) - new Date(settings.dates.startDate)) / (1000*60*60*24)) + 1 : 0;

    res.json({
      success: true,
      data: {
        volunteer,
        attendance: {
          history: attendance,
          present: attendance.filter(a => a.status === 'present').length,
          halfDay: attendance.filter(a => a.status === 'halfDay').length,
          absent: attendance.filter(a => a.status === 'absent').length,
          total: attendance.length,
          rate: totalDays > 0 ? Math.round((attendance.filter(a => ['present','halfDay'].includes(a.status)).length / totalDays) * 100) : 0,
        },
      },
    });
  } catch (err) { next(err); }
};

// @desc    Full year report
// @route   GET /api/reports/full-year
const getFullYearReport = async (req, res, next) => {
  try {
    const { vbsYear } = req.query;
    const settings = await Settings.findOne(vbsYear ? { year: Number(vbsYear) } : { isActive: true });
    if (!settings) return res.status(404).json({ success: false, message: 'VBS year not found' });

    const year = settings.year;

    const [students, teachers, volunteers, classes, allStudentAttendance, allTeacherAttendance, allVolunteerAttendance] = await Promise.all([
      Student.countDocuments({ vbsYear: year }),
      Teacher.countDocuments({ isActive: true }),
      Volunteer.countDocuments({ isActive: true }),
      Class.find({ year }),
      StudentAttendance.find({ vbsYear: year }),
      TeacherAttendance.find({ vbsYear: year }),
      VolunteerAttendance.find({ vbsYear: year }),
    ]);

    const totalStudentRecords = allStudentAttendance.reduce((sum, a) => sum + a.records.length, 0);
    const totalPresent = allStudentAttendance.reduce((sum, a) => sum + a.records.filter(r => r.status === 'present').length, 0);

    res.json({
      success: true,
      data: {
        settings,
        summary: {
          totalStudents: students, totalTeachers: teachers, totalVolunteers: volunteers, totalClasses: classes.length,
          attendance: {
            students: { rate: totalStudentRecords > 0 ? Math.round((totalPresent/totalStudentRecords)*100) : 0, present: totalPresent, total: totalStudentRecords },
            teachers: { total: allTeacherAttendance.length, present: allTeacherAttendance.filter(a => a.status === 'present').length },
            volunteers: { total: allVolunteerAttendance.length, present: allVolunteerAttendance.filter(a => ['present','halfDay'].includes(a.status)).length },
          },
          modifications: allStudentAttendance.filter(a => a.isModified).length,
        },
        classes: classes,
      },
    });
  } catch (err) { next(err); }
};

module.exports = { getDailyReport, getClassReport, getStudentReport, getTeacherReport, getVolunteerReport, getFullYearReport };
