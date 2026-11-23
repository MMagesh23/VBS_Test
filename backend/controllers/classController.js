const Class = require('../models/Class');
const Student = require('../models/Student');
const Settings = require('../models/Settings');

const CLASS_EDITABLE_FIELDS = ['name', 'category', 'gradeRange', 'capacity', 'description', 'teacher', 'isActive'];
const pickFields = (source, fields) => Object.fromEntries(fields.filter(key => Object.prototype.hasOwnProperty.call(source, key)).map(key => [key, source[key]]));

const getClasses = async (req, res, next) => {
  try {
    const { year, category, search } = req.query;
    const filter = {};
    if (year) filter.year = Number(year);
    if (category) filter.category = category;
    if (search) {
      const safeSearch = String(search).slice(0, 100).split('').map(char =>
        '\\.^$|?*+()[]{}'.includes(char) ? '\\' + char : char
      ).join('');
      filter.name = { $regex: safeSearch, $options: 'i' };
    }

    const classes = await Class.find(filter)
      .populate('teacher', 'name contactNumber')
      .sort({ category: 1, name: 1 });

    // Append student count using aggregation instead of per-class countDocuments
    // to avoid N+1 query issue and the potential undefined Student bug
    const classIds = classes.map(c => c._id);

    const studentCounts = await Student.aggregate([
      { $match: { classAssigned: { $in: classIds } } },
      { $group: { _id: '$classAssigned', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    studentCounts.forEach(sc => { countMap[sc._id.toString()] = sc.count; });

    const classesWithCount = classes.map(cls => ({
      ...cls.toObject(),
      studentCount: countMap[cls._id.toString()] || 0,
    }));

    res.json({ success: true, count: classes.length, data: classesWithCount });
  } catch (err) { next(err); }
};

const getClass = async (req, res, next) => {
  try {
    const cls = await Class.findById(req.params.id).populate('teacher', 'name contactNumber email');
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });

    const students = await Student.find({ classAssigned: cls._id }).sort({ studentId: 1 });
    res.json({ success: true, data: { ...cls.toObject(), students, studentCount: students.length } });
  } catch (err) { next(err); }
};

const createClass = async (req, res, next) => {
  try {
    const settings = await Settings.findOne({ isActive: true });
    const year = req.body.year || settings?.year;
    if (!year) return res.status(400).json({ success: false, message: 'No active VBS year' });

    const cls = await Class.create({ ...pickFields(req.body, CLASS_EDITABLE_FIELDS), year, createdBy: req.user._id });
    res.status(201).json({ success: true, message: 'Class created', data: cls });
  } catch (err) { next(err); }
};

const updateClass = async (req, res, next) => {
  try {
    const updates = pickFields(req.body, CLASS_EDITABLE_FIELDS);
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No editable class fields provided' });
    }
    const cls = await Class.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true })
      .populate('teacher', 'name');
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });
    res.json({ success: true, message: 'Class updated', data: cls });
  } catch (err) { next(err); }
};

const deleteClass = async (req, res, next) => {
  try {
    const studentsInClass = await Student.countDocuments({ classAssigned: req.params.id });
    if (studentsInClass > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete class. ${studentsInClass} students are still assigned.`,
      });
    }
    const cls = await Class.findByIdAndDelete(req.params.id);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });
    res.json({ success: true, message: 'Class deleted' });
  } catch (err) { next(err); }
};

const getEligibleStudents = async (req, res, next) => {
  try {
    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });

    const { CLASS_GRADE_RANGES } = Class;
    const allowedGrades = CLASS_GRADE_RANGES[cls.category];

    const students = await Student.find({
      grade: { $in: allowedGrades },
      vbsYear: cls.year,
      isActive: true,
    }).sort({ grade: 1, name: 1 });

    const allocated = students.filter(s => s.classAssigned?.toString() === cls._id.toString());
    const unallocated = students.filter(s => !s.classAssigned);

    res.json({ success: true, data: { allocated, unallocated, total: students.length } });
  } catch (err) { next(err); }
};

module.exports = { getClasses, getClass, createClass, updateClass, deleteClass, getEligibleStudents };