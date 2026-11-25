// backend/controllers/reportsController.js — UPDATED
// Added: getVillageList, getVillageReport, getCategoryReport

const mongoose = require('mongoose');
const Student = require('../models/Student');
const ClassHistory = require('../models/ClassHistory');
const { Teacher, Volunteer } = require('../models/TeacherVolunteer');
const Class = require('../models/Class');
const { StudentAttendance, TeacherAttendance, VolunteerAttendance } = require('../models/Attendance');
const Settings = require('../models/Settings');
const { normalizeToISTMidnight } = require('../services/attendanceWindowService');

// ─── helpers ──────────────────────────────────────────────────────
const toISTDateStr = (date) =>
  new Date(date).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric',
  });

// ─── Build per-student attendance stats helper ─────────────────────
const buildAttMap = (attendanceRecords) => {
  const attMap = {};
  attendanceRecords.forEach(rec => {
    rec.records.forEach(r => {
      const sid = r.student?._id?.toString() || r.student?.toString();
      if (!sid) return;
      if (!attMap[sid]) attMap[sid] = { present: 0, total: 0 };
      attMap[sid].total++;
      if (r.status === 'present') attMap[sid].present++;
    });
  });
  return attMap;
};

// @desc    Daily report
const getDailyReport = async (req, res, next) => {
  try {
    const { date, vbsYear } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'Date is required' });

    const reportDate = normalizeToISTMidnight(date);
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

    const submittedClassIds = studentAttendance.map(a => a.class?._id?.toString());
    const unsubmittedClasses = classes.filter(c => !submittedClassIds.includes(c._id.toString()));

    const totalStudentPresent = studentAttendance.reduce(
      (s, a) => s + a.records.filter(r => r.status === 'present').length, 0);
    const totalStudentAbsent = studentAttendance.reduce(
      (s, a) => s + a.records.filter(r => r.status === 'absent').length, 0);

    res.json({
      success: true,
      data: {
        date: reportDate,
        summary: {
          students: {
            present: totalStudentPresent, absent: totalStudentAbsent,
            total: totalStudentPresent + totalStudentAbsent,
            rate: totalStudentPresent + totalStudentAbsent > 0
              ? Math.round((totalStudentPresent / (totalStudentPresent + totalStudentAbsent)) * 100) : 0,
          },
          teachers: {
            present: teacherAttendance.filter(t => t.status === 'present').length,
            absent: teacherAttendance.filter(t => t.status === 'absent').length,
            late: teacherAttendance.filter(t => t.status === 'late').length,
          },
          volunteers: {
            present: volunteerAttendance.filter(v => ['present', 'halfDay'].includes(v.status)).length,
            absent: volunteerAttendance.filter(v => v.status === 'absent').length,
          },
        },
        studentAttendance, teacherAttendance, volunteerAttendance, unsubmittedClasses,
      },
    });
  } catch (err) { next(err); }
};

// ─── Class-transfer aware helpers ──────────────────────────────────
// Attendance documents are keyed by the class they were taken in, so history is never lost on a
// transfer. These helpers make the *reports* honour that: a class report lists everyone who was
// ever part of the class, and a student report spans every class the student attended.
const idOf = (v) => (v ? (v._id || v).toString() : null);

/**
 * Everyone who belongs in a class's report:
 *   current roster ∪ anyone with attendance recorded in this class ∪ anyone moved in/out of it.
 * Stats only count attendance taken IN this class.
 */
const buildClassRoster = async (cls, attendanceRecords) => {
  const clsId = cls._id.toString();

  // 1. per-student stats from attendance taken in THIS class
  const stats = new Map();
  attendanceRecords.forEach((rec) => {
    rec.records.forEach((r) => {
      const id = idOf(r.student);
      if (!id) return;
      let st = stats.get(id);
      if (!st) { st = { present: 0, absent: 0, firstDate: rec.date, lastDate: rec.date }; stats.set(id, st); }
      if (r.status === 'present') st.present++; else st.absent++;
      st.lastDate = rec.date;
    });
  });

  // 2. transfers that touch this class (latest move per student)
  const history = await ClassHistory.find({ $or: [{ fromClass: cls._id }, { toClass: cls._id }] })
    .populate('fromClass', 'name').populate('toClass', 'name')
    .sort({ effectiveDate: 1, reassignedAt: 1 });
  const movedIn = new Map();
  const movedOut = new Map();
  history.forEach((h) => {
    const id = idOf(h.student);
    if (idOf(h.toClass) === clsId && h.fromClass) movedIn.set(id, { from: h.fromClass.name, date: h.effectiveDate });
    if (idOf(h.fromClass) === clsId) movedOut.set(id, { to: h.toClass?.name || 'Unassigned', date: h.effectiveDate });
  });

  // 3. roster
  const knownIds = new Set([...stats.keys(), ...history.map((h) => idOf(h.student))]);
  const students = await Student.find({
    $or: [{ classAssigned: cls._id, isActive: true }, { _id: { $in: [...knownIds] } }],
  }).populate('classAssigned', 'name');

  const rows = students.map((s) => {
    const id = s._id.toString();
    const st = stats.get(id) || { present: 0, absent: 0, firstDate: null, lastDate: null };
    const total = st.present + st.absent;
    const isCurrentMember = idOf(s.classAssigned) === clsId;

    let transfer = null;
    if (!isCurrentMember) {
      const out = movedOut.get(id);
      transfer = { type: 'out', otherClass: out?.to || s.classAssigned?.name || 'Unassigned', date: out?.date || null };
    } else if (movedIn.has(id)) {
      const inn = movedIn.get(id);
      transfer = { type: 'in', otherClass: inn.from, date: inn.date };
    }

    return {
      ...s.toObject(),
      present: st.present, absent: st.absent, total,
      rate: total > 0 ? Math.round((st.present / total) * 100) : 0,
      firstDate: st.firstDate, lastDate: st.lastDate,
      isCurrentMember, transfer,
    };
  });

  // current members first, then transferred-out students; each by studentId
  rows.sort((a, b) => (Number(b.isCurrentMember) - Number(a.isCurrentMember))
    || String(a.studentId || '').localeCompare(String(b.studentId || '')));
  return rows;
};

const classDateFilter = (startDate, endDate) => {
  if (!startDate && !endDate) return {};
  const date = {};
  if (startDate) date.$gte = normalizeToISTMidnight(startDate);
  if (endDate) date.$lte = normalizeToISTMidnight(endDate);
  return { date };
};

// @desc    Class report (current students + students transferred in/out, with per-class stats)
const getClassReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    if (!mongoose.isValidObjectId(req.params.classId)) {
      return res.status(400).json({ success: false, message: 'Invalid class id' });
    }
    const cls = await Class.findById(req.params.classId).populate('teacher', 'name');
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });

    const attendanceRecords = await StudentAttendance.find({ class: cls._id, ...classDateFilter(startDate, endDate) })
      .populate('submittedBy', 'name').sort({ date: 1 });

    const studentStats = await buildClassRoster(cls, attendanceRecords);

    // Average over students who actually have records in this class
    const rated = studentStats.filter((s) => s.total > 0);
    const classAvgRate = rated.length > 0
      ? Math.round(rated.reduce((sum, x) => sum + x.rate, 0) / rated.length) : 0;

    res.json({
      success: true,
      data: {
        class: cls, students: studentStats, attendanceRecords,
        totalDays: attendanceRecords.length, classAvgRate,
        summary: {
          current: studentStats.filter((s) => s.isCurrentMember).length,
          transferredOut: studentStats.filter((s) => s.transfer?.type === 'out').length,
          transferredIn: studentStats.filter((s) => s.transfer?.type === 'in').length,
        },
      },
    });
  } catch (err) { next(err); }
};

// @desc    Students of a class — current AND former (for the class → student picker)
// @route   GET /api/reports/class/:classId/students
const getClassStudents = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.classId)) {
      return res.status(400).json({ success: false, message: 'Invalid class id' });
    }
    const cls = await Class.findById(req.params.classId).select('name category year');
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });

    const attendanceRecords = await StudentAttendance.find({ class: cls._id })
      .select('date records.student records.status').sort({ date: 1 });
    const roster = await buildClassRoster(cls, attendanceRecords);

    res.json({
      success: true,
      data: {
        class: cls,
        students: roster.map((s) => ({
          _id: s._id, studentId: s.studentId, name: s.name, grade: s.grade, village: s.village,
          isActive: s.isActive, isCurrentMember: s.isCurrentMember, transfer: s.transfer,
          present: s.present, absent: s.absent, total: s.total, rate: s.rate,
        })),
      },
    });
  } catch (err) { next(err); }
};

// @desc    Student report — complete attendance history across every class the student has been in.
//          Optional ?classId= narrows the report to the attendance taken in that one class.
// @route   GET /api/reports/student/:studentId
const getStudentReport = async (req, res, next) => {
  try {
    const { classId } = req.query;
    if (!mongoose.isValidObjectId(req.params.studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid student id' });
    }
    if (classId && !mongoose.isValidObjectId(classId)) {
      return res.status(400).json({ success: false, message: 'Invalid class id' });
    }

    const student = await Student.findById(req.params.studentId).populate('classAssigned', 'name category');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    // All attendance the student appears in (any class) – the source of truth for history
    const [allAttendance, transferRows] = await Promise.all([
      StudentAttendance.find({ 'records.student': student._id })
        .populate('class', 'name category').sort({ date: 1 }),
      ClassHistory.find({ student: student._id })
        .populate('fromClass', 'name category').populate('toClass', 'name category')
        .populate('reassignedBy', 'name').sort({ effectiveDate: 1, reassignedAt: 1 }),
    ]);

    const currentClassId = idOf(student.classAssigned);

    // Per-class breakdown (also lists classes the student was moved to/from with no records yet)
    const byClass = new Map();
    const ensureClass = (c) => {
      const id = idOf(c);
      if (!id) return null;
      if (!byClass.has(id)) {
        byClass.set(id, {
          _id: id, name: c.name || 'Unknown class', category: c.category,
          isCurrent: id === currentClassId, present: 0, absent: 0, total: 0, rate: 0,
          firstDate: null, lastDate: null,
        });
      }
      return byClass.get(id);
    };

    const fullHistory = [];
    allAttendance.forEach((rec) => {
      const r = rec.records.find((x) => idOf(x.student) === student._id.toString());
      if (!r) return;
      const entry = ensureClass(rec.class);
      if (!entry) return;                                    // class was deleted – skip orphan row
      entry.total++;
      if (r.status === 'present') entry.present++; else entry.absent++;
      entry.firstDate = entry.firstDate || rec.date;
      entry.lastDate = rec.date;
      fullHistory.push({
        date: rec.date, status: r.status || 'unknown', isModified: rec.isModified,
        classId: entry._id, className: entry.name, classCategory: entry.category,
      });
    });

    if (student.classAssigned) ensureClass(student.classAssigned);
    transferRows.forEach((t) => { ensureClass(t.fromClass); ensureClass(t.toClass); });

    const classes = [...byClass.values()].map((c) => ({
      ...c, rate: c.total > 0 ? Math.round((c.present / c.total) * 100) : 0,
    })).sort((a, b) => {
      if (!a.firstDate && !b.firstDate) return 0;
      if (!a.firstDate) return 1;
      if (!b.firstDate) return -1;
      return new Date(a.firstDate) - new Date(b.firstDate);
    });

    // Scope: one class, or everything
    const history = classId ? fullHistory.filter((h) => h.classId === classId) : fullHistory;
    const present = history.filter((h) => h.status === 'present').length;
    const absent = history.filter((h) => h.status === 'absent').length;
    const total = history.length;

    const overallPresent = fullHistory.filter((h) => h.status === 'present').length;
    const overallTotal = fullHistory.length;

    res.json({
      success: true,
      data: {
        student,
        scope: classId ? 'class' : 'all',
        selectedClass: classId ? (classes.find((c) => c._id === classId) || null) : null,
        attendance: { history, present, absent, total, rate: total > 0 ? Math.round((present / total) * 100) : 0 },
        overall: {
          present: overallPresent, absent: overallTotal - overallPresent, total: overallTotal,
          rate: overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 100) : 0,
        },
        classes,
        transfers: transferRows.map((t) => ({
          _id: t._id,
          from: t.fromClass ? { _id: idOf(t.fromClass), name: t.fromClass.name } : null,
          to: t.toClass ? { _id: idOf(t.toClass), name: t.toClass.name } : null,
          effectiveDate: t.effectiveDate, reassignedAt: t.reassignedAt,
          reassignedBy: t.reassignedBy?.name || null, reason: t.reason || '',
        })),
      },
    });
  } catch (err) { next(err); }
};

// @desc    Teacher report
const getTeacherReport = async (req, res, next) => {
  try {
    const teacher = await Teacher.findById(req.params.teacherId)
      .populate('classAssigned', 'name category').populate('user', 'userID name');
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });

    const settings = await Settings.findOne({ isActive: true });
    const vbsYear = settings?.year;

    const [submissionHistory, ownAttendance] = await Promise.all([
      StudentAttendance.find({ class: teacher.classAssigned, vbsYear })
        .select('date submittedBy submittedByName records isModified').sort({ date: 1 }),
      TeacherAttendance.find({ teacher: teacher._id, vbsYear }).sort({ date: 1 }),
    ]);

    const totalDays = settings?.dates?.startDate && settings?.dates?.endDate
      ? Math.round((new Date(settings.dates.endDate) - new Date(settings.dates.startDate)) / (1000 * 60 * 60 * 24)) + 1 : 0;
    const daysPresent = ownAttendance.filter(a => a.status === 'present').length;

    res.json({
      success: true,
      data: {
        teacher,
        submissions: {
          history: submissionHistory, total: submissionHistory.length, expectedDays: totalDays,
          submissionRate: totalDays > 0 ? Math.round((submissionHistory.length / totalDays) * 100) : 0,
        },
        ownAttendance: {
          history: ownAttendance, present: daysPresent,
          absent: ownAttendance.filter(a => a.status === 'absent').length,
          late: ownAttendance.filter(a => a.status === 'late').length,
          total: ownAttendance.length,
          rate: totalDays > 0 ? Math.round((daysPresent / totalDays) * 100) : 0,
        },
      },
    });
  } catch (err) { next(err); }
};

// @desc    Volunteer report
const getVolunteerReport = async (req, res, next) => {
  try {
    const volunteer = await Volunteer.findById(req.params.volunteerId);
    if (!volunteer) return res.status(404).json({ success: false, message: 'Volunteer not found' });

    const settings = await Settings.findOne({ isActive: true });
    const attendance = await VolunteerAttendance.find({ volunteer: volunteer._id, vbsYear: settings?.year }).sort({ date: 1 });
    const totalDays = settings?.dates?.startDate && settings?.dates?.endDate
      ? Math.round((new Date(settings.dates.endDate) - new Date(settings.dates.startDate)) / (1000 * 60 * 60 * 24)) + 1 : 0;

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
          rate: totalDays > 0
            ? Math.round((attendance.filter(a => ['present', 'halfDay'].includes(a.status)).length / totalDays) * 100) : 0,
        },
      },
    });
  } catch (err) { next(err); }
};

// @desc    Full year report
const getFullYearReport = async (req, res, next) => {
  try {
    const { vbsYear } = req.query;
    const settings = await Settings.findOne(vbsYear ? { year: Number(vbsYear) } : { isActive: true });
    if (!settings) return res.status(404).json({ success: false, message: 'VBS year not found' });

    const year = settings.year;

    const [allClasses, allTeachers, allVolunteers, allStudentAttendance, allTeacherAttendance, allVolunteerAttendance] =
      await Promise.all([
        Class.find({ year }).populate('teacher', 'name contactNumber').sort({ category: 1, name: 1 }),
        Teacher.find({ isActive: true }).populate('classAssigned', 'name category year').sort({ name: 1 }),
        Volunteer.find({ isActive: true }).sort({ name: 1 }),
        StudentAttendance.find({ vbsYear: year })
          .populate('class', 'name category')
          .populate('records.student', 'name studentId grade gender village category')
          .sort({ date: 1 }),
        TeacherAttendance.find({ vbsYear: year }).populate('teacher', 'name classAssigned').sort({ date: 1 }),
        VolunteerAttendance.find({ vbsYear: year }).populate('volunteer', 'name role shift').sort({ date: 1 }),
      ]);

    const yearClassIds = new Set(allClasses.map(c => c._id.toString()));
    const yearTeachers = allTeachers.filter(t => {
      const cid = t.classAssigned?._id?.toString() || t.classAssigned?.toString();
      return !cid || yearClassIds.has(cid);
    });

    const allStudents = await Student.find({ vbsYear: year, isActive: true })
      .populate('classAssigned', 'name category').sort({ category: 1, studentId: 1 });

    const dateSet = new Set();
    allStudentAttendance.forEach(a => dateSet.add(normalizeToISTMidnight(a.date).getTime()));
    const vbsDates = [...dateSet].sort().map(ts => ({ ts, date: new Date(ts), dateStr: toISTDateStr(new Date(ts)) }));

    const attendanceByClass = {};
    allStudentAttendance.forEach(rec => {
      const cid = rec.class?._id?.toString();
      if (!cid) return;
      if (!attendanceByClass[cid]) attendanceByClass[cid] = {};
      const dateTs = normalizeToISTMidnight(rec.date).getTime();
      rec.records.forEach(r => {
        const sid = r.student?._id?.toString() || r.student?.toString();
        if (!sid) return;
        if (!attendanceByClass[cid][sid]) attendanceByClass[cid][sid] = {};
        attendanceByClass[cid][sid][dateTs] = r.status;
      });
    });

    const teacherAttMap = {};
    allTeacherAttendance.forEach(rec => {
      const tid = rec.teacher?._id?.toString() || rec.teacher?.toString();
      if (!tid) return;
      const dateTs = normalizeToISTMidnight(rec.date).getTime();
      if (!teacherAttMap[tid]) teacherAttMap[tid] = {};
      teacherAttMap[tid][dateTs] = rec;
    });

    const volAttMap = {};
    allVolunteerAttendance.forEach(rec => {
      const vid = rec.volunteer?._id?.toString() || rec.volunteer?.toString();
      if (!vid) return;
      const dateTs = normalizeToISTMidnight(rec.date).getTime();
      if (!volAttMap[vid]) volAttMap[vid] = {};
      volAttMap[vid][dateTs] = rec;
    });

    // Transfer-aware: a class lists its current students AND students who have attendance recorded
    // in it but have since moved elsewhere. Attendance taken before a transfer stays in the old class.
    const classNameById = {};
    allClasses.forEach(c => { classNameById[c._id.toString()] = c.name; });
    const studentById = new Map(allStudents.map(s => [s._id.toString(), s]));
    allStudentAttendance.forEach(rec => {
      rec.records.forEach(r => {
        const doc = r.student && r.student._id ? r.student : null;      // populated doc
        if (doc && !studentById.has(doc._id.toString())) studentById.set(doc._id.toString(), doc);
      });
    });
    const classesAttendedBy = {};                                       // studentId -> Set(classId)
    Object.entries(attendanceByClass).forEach(([cid, byStudent]) => {
      Object.keys(byStudent).forEach(sid => {
        (classesAttendedBy[sid] = classesAttendedBy[sid] || new Set()).add(cid);
      });
    });

    const classData = allClasses.map(cls => {
      const cid = cls._id.toString();
      const classAttMap = attendanceByClass[cid] || {};

      const currentStudents = allStudents.filter(
        s => s.classAssigned?._id?.toString() === cid || s.classAssigned?.toString() === cid
      );
      const currentIds = new Set(currentStudents.map(s => s._id.toString()));
      const formerStudents = Object.keys(classAttMap)
        .filter(sid => !currentIds.has(sid) && studentById.has(sid))
        .map(sid => studentById.get(sid));
      const classStudents = [...currentStudents, ...formerStudents];

      const studentsWithAtt = classStudents.map((s, idx) => {
        const sid = s._id.toString();
        const attByDate = classAttMap[sid] || {};
        const isCurrent = currentIds.has(sid);
        const otherClassIds = [...(classesAttendedBy[sid] || [])].filter(c => c !== cid);
        const wasTransferred = !isCurrent || otherClassIds.length > 0;

        const presentDays = vbsDates.filter(d => attByDate[d.ts] === 'present').length;
        // Transferred students are measured against the days recorded for them in THIS class
        const recordedDays = vbsDates.filter(d => !!attByDate[d.ts]).length;
        const possibleDays = wasTransferred ? recordedDays : vbsDates.length;

        const currentClassName = s.classAssigned?.name || classNameById[s.classAssigned?.toString?.()] || 'Unassigned';
        let transferNote = '';
        if (!isCurrent) transferNote = `Transferred to ${currentClassName}`;
        else if (otherClassIds.length) transferNote = `Transferred from ${otherClassIds.map(c => classNameById[c] || 'another class').join(', ')}`;

        const attendanceRow = {};
        vbsDates.forEach(d => { attendanceRow[d.dateStr] = attByDate[d.ts] || ''; });
        return {
          sno: idx + 1, studentId: s.studentId, name: s.name, grade: s.grade,
          gender: s.gender, category: s.category, village: s.village || '',
          contactNumber: s.contactNumber || '', parentName: s.parentName || '',
          schoolName: s.schoolName || '', attendance: attendanceRow,
          totalPresent: presentDays, totalDays: possibleDays,
          percentage: possibleDays > 0 ? Math.round((presentDays / possibleDays) * 100) : 0,
          isCurrentMember: isCurrent, transferNote,
        };
      });

      const totalPresent = studentsWithAtt.reduce((s, x) => s + x.totalPresent, 0);
      const totalPossible = studentsWithAtt.reduce((s, x) => s + x.totalDays, 0);
      return {
        classId: cid, className: cls.name, category: cls.category, capacity: cls.capacity,
        teacher: cls.teacher ? { name: cls.teacher.name, contact: cls.teacher.contactNumber } : null,
        students: studentsWithAtt, studentCount: currentStudents.length,
        stats: { totalPresent, totalPossible, attendanceRate: totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0 },
      };
    });

    const teacherSummary = yearTeachers.map(t => {
      const tid = t._id.toString();
      const attMap = teacherAttMap[tid] || {};
      const attHistory = vbsDates.map(d => ({
        dateStr: d.dateStr, status: attMap[d.ts]?.status || '', arrivalTime: attMap[d.ts]?.arrivalTime || '',
      }));
      const daysPresent = attHistory.filter(x => x.status === 'present').length;
      const daysLate = attHistory.filter(x => x.status === 'late').length;
      const classId = t.classAssigned?._id?.toString() || t.classAssigned?.toString();
      const submissions = allStudentAttendance.filter(a => a.class?._id?.toString() === classId);
      return {
        name: t.name, contactNumber: t.contactNumber, email: t.email || '',
        qualification: t.qualification || '', classAssigned: t.classAssigned?.name || 'Unassigned',
        classCategory: t.classAssigned?.category || '',
        attendance: {
          history: attHistory, daysPresent, daysLate,
          daysAbsent: attHistory.filter(x => x.status === 'absent').length,
          daysLeave: attHistory.filter(x => x.status === 'leave').length,
          totalDays: vbsDates.length,
          attendanceRate: vbsDates.length > 0 ? Math.round(((daysPresent + daysLate) / vbsDates.length) * 100) : 0,
        },
        submissions: {
          daysSubmitted: submissions.length, totalDays: vbsDates.length,
          submissionRate: vbsDates.length > 0 ? Math.round((submissions.length / vbsDates.length) * 100) : 0,
        },
      };
    });

    const volunteerSummary = allVolunteers.map(v => {
      const vid = v._id.toString();
      const attMap = volAttMap[vid] || {};
      const attHistory = vbsDates.map(d => ({
        dateStr: d.dateStr, status: attMap[d.ts]?.status || '', shift: attMap[d.ts]?.shift || '',
        checkInTime: attMap[d.ts]?.checkInTime || '',
      }));
      const daysPresent = attHistory.filter(x => ['present', 'halfDay'].includes(x.status)).length;
      return {
        name: v.name, role: v.role, shift: v.shift || '', contactNumber: v.contactNumber,
        email: v.email || '', notes: v.notes || '',
        attendance: {
          history: attHistory, daysPresent,
          daysHalfDay: attHistory.filter(x => x.status === 'halfDay').length,
          daysAbsent: attHistory.filter(x => x.status === 'absent').length,
          totalDays: vbsDates.length,
          attendanceRate: vbsDates.length > 0 ? Math.round((daysPresent / vbsDates.length) * 100) : 0,
        },
      };
    });

    const totalStudentRecords = allStudentAttendance.reduce((s, a) => s + a.records.length, 0);
    const totalStudentPresent = allStudentAttendance.reduce(
      (s, a) => s + a.records.filter(r => r.status === 'present').length, 0);
    const teacherPresent = allTeacherAttendance.filter(a => a.status === 'present').length;
    const volPresent = allVolunteerAttendance.filter(a => ['present', 'halfDay'].includes(a.status)).length;

    const generatedAt = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit',
      year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
    });

    res.json({
      success: true,
      data: {
        ministry: 'Presence of Jesus Ministry, Tiruchirappalli',
        settings, vbsYear: year, vbsTitle: settings.vbsTitle, tagline: settings.tagline,
        generatedAt, vbsDates,
        summary: {
          totalStudents: allStudents.length, totalTeachers: yearTeachers.length,
          totalVolunteers: allVolunteers.length, totalClasses: allClasses.length,
          vbsDuration: vbsDates.length,
          attendance: {
            students: { rate: totalStudentRecords > 0 ? Math.round((totalStudentPresent / totalStudentRecords) * 100) : 0, present: totalStudentPresent, total: totalStudentRecords },
            teachers: { rate: allTeacherAttendance.length > 0 ? Math.round((teacherPresent / allTeacherAttendance.length) * 100) : 0, present: teacherPresent, total: allTeacherAttendance.length },
            volunteers: { rate: allVolunteerAttendance.length > 0 ? Math.round((volPresent / allVolunteerAttendance.length) * 100) : 0, present: volPresent, total: allVolunteerAttendance.length },
          },
          modifications: allStudentAttendance.filter(a => a.isModified).length,
        },
        classes: classData, teachers: teacherSummary, volunteers: volunteerSummary,
        allStudents: allStudents.map((s, idx) => ({
          sno: idx + 1, studentId: s.studentId, name: s.name, grade: s.grade,
          gender: s.gender, category: s.category, religion: s.religion || '',
          christianDenomination: s.christianDenomination || '', contactNumber: s.contactNumber || '',
          parentName: s.parentName || '', village: s.village || '', schoolName: s.schoolName || '',
          classAssigned: s.classAssigned?.name || 'Unassigned', classCategory: s.classAssigned?.category || '',
        })),
      },
    });
  } catch (err) { next(err); }
};

// @desc    Village list
// @route   GET /api/reports/villages
const getVillageList = async (req, res, next) => {
  try {
    const { vbsYear } = req.query;
    const filter = { isActive: true, village: { $exists: true, $ne: '' } };
    if (vbsYear) filter.vbsYear = Number(vbsYear);

    const villages = await Student.aggregate([
      { $match: filter },
      { $group: { _id: '$village', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { village: '$_id', count: 1, _id: 0 } },
    ]);

    res.json({ success: true, data: villages });
  } catch (err) { next(err); }
};

// @desc    Village report
// @route   GET /api/reports/village
const getVillageReport = async (req, res, next) => {
  try {
    const { village, vbsYear } = req.query;
    if (!village) return res.status(400).json({ success: false, message: 'village is required' });

    const filter = {
      village: { $regex: `^${village.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      isActive: true,
    };
    if (vbsYear) filter.vbsYear = Number(vbsYear);

    const students = await Student.find(filter)
      .populate('classAssigned', 'name category').sort({ name: 1 });

    const studentIds = students.map(s => s._id);
    const attFilter = { 'records.student': { $in: studentIds } };
    if (vbsYear) attFilter.vbsYear = Number(vbsYear);

    const attendanceRecords = await StudentAttendance.find(attFilter);
    const attMap = buildAttMap(attendanceRecords);

    const studentsWithAtt = students.map(s => ({
      ...s.toObject(),
      attendance: (() => {
        const att = attMap[s._id.toString()] || { present: 0, total: 0 };
        return { present: att.present, total: att.total, rate: att.total > 0 ? Math.round((att.present / att.total) * 100) : 0 };
      })(),
    }));

    const totalPresent = studentsWithAtt.reduce((s, x) => s + x.attendance.present, 0);
    const totalRecords = studentsWithAtt.reduce((s, x) => s + x.attendance.total, 0);

    res.json({
      success: true,
      data: {
        village, totalStudents: students.length, students: studentsWithAtt,
        stats: { attendance: { present: totalPresent, total: totalRecords, rate: totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0 } },
      },
    });
  } catch (err) { next(err); }
};

// @desc    Category report
// @route   GET /api/reports/category/:category
const getCategoryReport = async (req, res, next) => {
  try {
    const { category } = req.params;
    const { vbsYear } = req.query;
    const validCats = ['Beginner', 'Primary', 'Junior', 'Inter'];
    if (!validCats.includes(category)) {
      return res.status(400).json({ success: false, message: 'Invalid category. Must be one of: ' + validCats.join(', ') });
    }

    const filter = { category, isActive: true };
    if (vbsYear) filter.vbsYear = Number(vbsYear);

    const [students, classes] = await Promise.all([
      Student.find(filter).populate('classAssigned', 'name category').sort({ grade: 1, name: 1 }),
      Class.find({ category, ...(vbsYear ? { year: Number(vbsYear) } : {}) }).populate('teacher', 'name'),
    ]);

    const studentIds = students.map(s => s._id);
    const attFilter = { 'records.student': { $in: studentIds } };
    if (vbsYear) attFilter.vbsYear = Number(vbsYear);

    const attendanceRecords = await StudentAttendance.find(attFilter);
    const attMap = buildAttMap(attendanceRecords);

    const studentsWithAtt = students.map(s => ({
      ...s.toObject(),
      attendance: (() => {
        const att = attMap[s._id.toString()] || { present: 0, total: 0 };
        return { present: att.present, total: att.total, rate: att.total > 0 ? Math.round((att.present / att.total) * 100) : 0 };
      })(),
    }));

    const totalPresent = studentsWithAtt.reduce((s, x) => s + x.attendance.present, 0);
    const totalRecords = studentsWithAtt.reduce((s, x) => s + x.attendance.total, 0);

    res.json({
      success: true,
      data: {
        category, totalStudents: students.length, totalClasses: classes.length,
        students: studentsWithAtt,
        classes: classes.map(c => ({ _id: c._id, name: c.name, teacher: c.teacher?.name || 'Unassigned', capacity: c.capacity })),
        stats: { attendance: { present: totalPresent, total: totalRecords, rate: totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0 } },
      },
    });
  } catch (err) { next(err); }
};

// @desc    Student Attendance Report by Category (all students, date columns)
// @route   GET /api/reports/student-attendance/:category
const getStudentAttendanceReport = async (req, res, next) => {
  try {
    const { category } = req.params;
    const { vbsYear } = req.query;
    const validCats = ['Beginner', 'Primary', 'Junior', 'Inter'];
    if (!validCats.includes(category)) {
      return res.status(400).json({ success: false, message: 'Invalid category' });
    }

    const filter = { category, isActive: true };
    if (vbsYear) filter.vbsYear = Number(vbsYear);

    const students = await Student.find(filter)
      .populate('classAssigned', 'name category')
      .sort({ studentId: 1 });

    const studentIds = students.map(s => s._id);
    const attFilter = { 'records.student': { $in: studentIds } };
    if (vbsYear) attFilter.vbsYear = Number(vbsYear);

    const attendanceRecords = await StudentAttendance.find(attFilter).sort({ date: 1 });

    const dateSet = new Set();
    attendanceRecords.forEach(rec => {
      dateSet.add(normalizeToISTMidnight(rec.date).toISOString());
    });
    const sortedDates = [...dateSet].sort().map((iso, i) => {
      const d = new Date(iso);
      return {
        iso, dayNum: i + 1,
        dateStr: d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' }),
        dayLabel: d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' }),
      };
    });

    const attMap = {};
    attendanceRecords.forEach(rec => {
      const dateIso = normalizeToISTMidnight(rec.date).toISOString();
      rec.records.forEach(r => {
        const sid = r.student?.toString();
        if (!sid) return;
        if (!attMap[sid]) attMap[sid] = {};
        attMap[sid][dateIso] = r.status;
      });
    });

    const rows = students.map((s, idx) => {
      const sid = s._id.toString();
      const daily = sortedDates.map(d => attMap[sid]?.[d.iso] || null);
      const totalPresent = daily.filter(v => v === 'present').length;
      const totalAbsent = daily.filter(v => v === 'absent').length;
      const totalRecorded = totalPresent + totalAbsent;
      return {
        sno: idx + 1,
        studentId: s.studentId || '—',
        name: s.name,
        grade: s.grade,
        gender: s.gender,
        village: s.village || '',
        contactNumber: s.contactNumber || '',
        classAssigned: s.classAssigned?.name || 'Unassigned',
        daily,
        totalPresent,
        totalAbsent,
        totalRecorded,
        percentage: totalRecorded > 0 ? Math.round((totalPresent / totalRecorded) * 100) : 0,
      };
    });

    const grandTotalPresent = rows.reduce((s, r) => s + r.totalPresent, 0);
    const grandTotalRecorded = rows.reduce((s, r) => s + r.totalRecorded, 0);

    res.json({
      success: true,
      data: {
        category,
        totalStudents: students.length,
        dates: sortedDates,
        rows,
        summary: {
          grandTotalPresent,
          grandTotalRecorded,
          overallRate: grandTotalRecorded > 0 ? Math.round((grandTotalPresent / grandTotalRecorded) * 100) : 0,
        },
      },
    });
  } catch (err) { next(err); }
};

// @desc    Religion-wise Student Report
// @route   GET /api/reports/religion
const getReligionReport = async (req, res, next) => {
  try {
    const { vbsYear, religion } = req.query;
    const baseFilter = { isActive: true };
    if (vbsYear) baseFilter.vbsYear = Number(vbsYear);

    const religionDistrib = await Student.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$religion', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const denomDistrib = await Student.aggregate([
      { $match: { ...baseFilter, religion: 'Christian', christianDenomination: { $exists: true, $ne: '' } } },
      { $group: { _id: '$christianDenomination', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const catByReligion = await Student.aggregate([
      { $match: baseFilter },
      { $group: { _id: { religion: '$religion', category: '$category' }, count: { $sum: 1 } } },
      { $sort: { '_id.religion': 1, '_id.category': 1 } },
    ]);

    let religionStudents = null;
    if (religion) {
      const filter = { ...baseFilter, religion };
      const students = await Student.find(filter)
        .populate('classAssigned', 'name category')
        .sort({ category: 1, studentId: 1 });

      const studentIds = students.map(s => s._id);
      const attFilter = { 'records.student': { $in: studentIds } };
      if (vbsYear) attFilter.vbsYear = Number(vbsYear);

      const attendanceRecords = await StudentAttendance.find(attFilter);
      const attMap = buildAttMap(attendanceRecords);

      religionStudents = students.map((s, idx) => {
        const att = attMap[s._id.toString()] || { present: 0, total: 0 };
        return {
          sno: idx + 1,
          studentId: s.studentId || '—',
          name: s.name,
          grade: s.grade,
          gender: s.gender,
          category: s.category,
          christianDenomination: s.christianDenomination || '',
          village: s.village || '',
          contactNumber: s.contactNumber || '',
          classAssigned: s.classAssigned?.name || 'Unassigned',
          attendance: {
            present: att.present,
            total: att.total,
            rate: att.total > 0 ? Math.round((att.present / att.total) * 100) : 0,
          },
        };
      });
    }

    res.json({
      success: true,
      data: {
        religionDistribution: religionDistrib,
        denominationDistribution: denomDistrib,
        categoryByReligion: catByReligion,
        religionStudents,
        selectedReligion: religion || null,
      },
    });
  } catch (err) { next(err); }
};

module.exports = {
  getDailyReport, getClassReport, getClassStudents, getStudentReport, getTeacherReport,
  getVolunteerReport, getFullYearReport,
  getVillageList, getVillageReport, getCategoryReport,
  getStudentAttendanceReport, getReligionReport,  // ← ADD THESE
};
