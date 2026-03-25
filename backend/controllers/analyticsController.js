const Student = require('../models/Student');
const { Teacher, Volunteer } = require('../models/TeacherVolunteer');
const Class = require('../models/Class');
const { StudentAttendance, TeacherAttendance, VolunteerAttendance } = require('../models/Attendance');
const Settings = require('../models/Settings');
const { StagingStudent, StagingTeacher, StagingVolunteer } = require('../models/Staging');

// @desc    Dashboard stats
// @route   GET /api/analytics/dashboard
const getDashboardStats = async (req, res, next) => {
  try {
    const settings = await Settings.findOne({ isActive: true });
    const vbsYear = settings?.year;
    const today = new Date(); today.setHours(0,0,0,0);

    const [
      totalStudents, beginnerCount, primaryCount, juniorCount, interCount,
      totalTeachers, totalVolunteers, totalClasses,
      todayStudentAttendance, pendingStudents, pendingTeachers, pendingVolunteers,
    ] = await Promise.all([
      Student.countDocuments({ vbsYear, isActive: true }),
      Student.countDocuments({ vbsYear, category: 'Beginner', isActive: true }),
      Student.countDocuments({ vbsYear, category: 'Primary', isActive: true }),
      Student.countDocuments({ vbsYear, category: 'Junior', isActive: true }),
      Student.countDocuments({ vbsYear, category: 'Inter', isActive: true }),
      Teacher.countDocuments({ isActive: true }),
      Volunteer.countDocuments({ isActive: true }),
      Class.countDocuments({ year: vbsYear }),
      StudentAttendance.find({ date: today, vbsYear }),
      StagingStudent.countDocuments(),
      StagingTeacher.countDocuments(),
      StagingVolunteer.countDocuments(),
    ]);

    const totalPresent = todayStudentAttendance.reduce(
      (sum, a) => sum + a.records.filter((r) => r.status === 'present').length, 0
    );
    const totalAttendanceRecords = todayStudentAttendance.reduce((sum, a) => sum + a.records.length, 0);
    const todayAttendanceRate = totalAttendanceRecords > 0
      ? Math.round((totalPresent / totalAttendanceRecords) * 100) : 0;

    // Classes with no attendance today
    const allClasses = await Class.find({ year: vbsYear });
    const submittedClassIds = todayStudentAttendance.map((a) => a.class?.toString());
    const pendingClasses = allClasses.filter((c) => !submittedClassIds.includes(c._id.toString()));

    // Recent modifications
    const recentModifications = await StudentAttendance.find({ isModified: true, vbsYear })
      .populate('class', 'name')
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('date class modificationHistory isModified');

    res.json({
      success: true,
      data: {
        vbsYear,
        students: { total: totalStudents, beginner: beginnerCount, primary: primaryCount, junior: juniorCount, inter: interCount },
        teachers: { total: totalTeachers },
        volunteers: { total: totalVolunteers },
        classes: { total: totalClasses },
        today: {
          date: today,
          attendanceRate: todayAttendanceRate,
          presentCount: totalPresent,
          submittedClasses: todayStudentAttendance.length,
          pendingClasses: pendingClasses.length,
          pendingClassList: pendingClasses.map((c) => ({ _id: c._id, name: c.name, category: c.category })),
        },
        pendingVerifications: {
          students: pendingStudents,
          teachers: pendingTeachers,
          volunteers: pendingVolunteers,
          total: pendingStudents + pendingTeachers + pendingVolunteers,
        },
        recentModifications,
      },
    });
  } catch (err) { next(err); }
};

// @desc    Student analytics
// @route   GET /api/analytics/students
const getStudentAnalytics = async (req, res, next) => {
  try {
    const { vbsYear } = req.query;
    const filter = vbsYear ? { vbsYear: Number(vbsYear), isActive: true } : { isActive: true };

    const [gradeDistrib, categoryDistrib, genderDistrib, villageDistrib, schoolDistrib] = await Promise.all([
      Student.aggregate([{ $match: filter }, { $group: { _id: '$grade', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Student.aggregate([{ $match: filter }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
      Student.aggregate([{ $match: filter }, { $group: { _id: '$gender', count: { $sum: 1 } } }]),
      Student.aggregate([{ $match: filter }, { $group: { _id: '$village', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 20 }]),
      Student.aggregate([{ $match: { ...filter, schoolName: { $exists: true, $ne: '' } } }, { $group: { _id: '$schoolName', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 15 }]),
    ]);

    const totalStudents = await Student.countDocuments(filter);

    res.json({
      success: true,
      data: {
        totalStudents,
        gradeDistribution: gradeDistrib,
        categoryDistribution: categoryDistrib,
        genderDistribution: genderDistrib,
        villageDistribution: villageDistrib,
        schoolDistribution: schoolDistrib,
      },
    });
  } catch (err) { next(err); }
};

// @desc    Attendance trends
// @route   GET /api/analytics/attendance-trends
const getAttendanceTrends = async (req, res, next) => {
  try {
    const { vbsYear } = req.query;
    const yearFilter = vbsYear ? { vbsYear: Number(vbsYear) } : {};

    // Student attendance daily trends
    const studentTrends = await StudentAttendance.aggregate([
      { $match: yearFilter },
      { $unwind: '$records' },
      { $group: {
        _id: '$date',
        present: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ['$records.status', 'absent'] }, 1, 0] } },
      }},
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', present: 1, absent: 1, total: { $add: ['$present', '$absent'] },
        rate: { $multiply: [{ $divide: ['$present', { $add: ['$present', '$absent'] }] }, 100] } }},
    ]);

    // Teacher attendance trends
    const teacherTrends = await TeacherAttendance.aggregate([
      { $match: yearFilter },
      { $group: {
        _id: '$date',
        present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
        late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
        leave: { $sum: { $cond: [{ $eq: ['$status', 'leave'] }, 1, 0] } },
      }},
      { $sort: { _id: 1 } },
    ]);

    // Volunteer attendance trends
    const volunteerTrends = await VolunteerAttendance.aggregate([
      { $match: yearFilter },
      { $group: {
        _id: '$date',
        present: { $sum: { $cond: [{ $in: ['$status', ['present', 'halfDay']] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
      }},
      { $sort: { _id: 1 } },
    ]);

    // Class performance
    const classPerformance = await StudentAttendance.aggregate([
      { $match: yearFilter },
      { $unwind: '$records' },
      { $group: {
        _id: '$class',
        totalPresent: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
        totalRecords: { $sum: 1 },
        daysSubmitted: { $addToSet: '$date' },
      }},
      { $lookup: { from: 'classes', localField: '_id', foreignField: '_id', as: 'classInfo' } },
      { $unwind: '$classInfo' },
      { $project: {
        className: '$classInfo.name', category: '$classInfo.category',
        totalPresent: 1, totalRecords: 1,
        attendanceRate: { $multiply: [{ $divide: ['$totalPresent', '$totalRecords'] }, 100] },
        daysSubmitted: { $size: '$daysSubmitted' },
      }},
      { $sort: { attendanceRate: -1 } },
    ]);

    res.json({ success: true, data: { studentTrends, teacherTrends, volunteerTrends, classPerformance } });
  } catch (err) { next(err); }
};

// @desc    Modifications audit summary
// @route   GET /api/analytics/modifications
const getModificationsSummary = async (req, res, next) => {
  try {
    const { vbsYear } = req.query;
    const filter = { isModified: true, ...(vbsYear ? { vbsYear: Number(vbsYear) } : {}) };

    const modifiedRecords = await StudentAttendance.find(filter)
      .populate('class', 'name category')
      .select('date class modificationHistory');

    const totalModifications = modifiedRecords.reduce(
      (sum, r) => sum + r.modificationHistory.length, 0
    );

    // Group by admin who modified
    const adminModifications = {};
    modifiedRecords.forEach((record) => {
      record.modificationHistory.forEach((mod) => {
        const key = mod.modifiedByName || 'Unknown';
        adminModifications[key] = (adminModifications[key] || 0) + 1;
      });
    });

    res.json({
      success: true,
      data: {
        totalModifiedRecords: modifiedRecords.length,
        totalModifications,
        adminModifications: Object.entries(adminModifications)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
        recentModifications: modifiedRecords.slice(0, 10),
      },
    });
  } catch (err) { next(err); }
};

module.exports = { getDashboardStats, getStudentAnalytics, getAttendanceTrends, getModificationsSummary };
