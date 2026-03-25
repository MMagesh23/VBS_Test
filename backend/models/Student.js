const mongoose = require('mongoose');

const GRADE_TO_CATEGORY = {
  PreKG: 'Beginner',
  LKG: 'Beginner',
  UKG: 'Beginner',
  '1': 'Beginner',
  '2': 'Beginner',
  '3': 'Primary',
  '4': 'Primary',
  '5': 'Primary',
  '6': 'Junior',
  '7': 'Junior',
  '8': 'Junior',
  '9': 'Inter',
  '10': 'Inter',
  '11': 'Inter',
  '12': 'Inter',
};

const CATEGORY_CODE = {
  Beginner: 'BEG',
  Primary: 'PRI',
  Junior: 'JUN',
  Inter: 'INT',
};

const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: [true, 'Gender is required'],
    },
    grade: {
      type: String,
      enum: ['PreKG', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
      required: [true, 'Grade is required'],
    },
    category: {
      type: String,
      enum: ['Beginner', 'Primary', 'Junior', 'Inter'],
    },
    schoolName: {
      type: String,
      trim: true,
      maxlength: [100, 'School name cannot exceed 100 characters'],
    },
    parentName: {
      type: String,
      required: [true, 'Parent name is required'],
      trim: true,
      maxlength: [100, 'Parent name cannot exceed 100 characters'],
    },
    contactNumber: {
      type: String,
      required: [true, 'Contact number is required'],
      match: [/^\d{10}$/, 'Contact number must be 10 digits'],
    },
    alternateNumber: {
      type: String,
      match: [/^\d{10}$/, 'Alternate number must be 10 digits'],
    },
    village: {
      type: String,
      required: [true, 'Village/Location is required'],
      trim: true,
      maxlength: [100, 'Village cannot exceed 100 characters'],
    },
    classAssigned: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    vbsYear: {
      type: Number,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Auto-determine category from grade
studentSchema.pre('save', function (next) {
  if (this.isModified('grade') || !this.category) {
    this.category = GRADE_TO_CATEGORY[this.grade];
  }
  next();
});

studentSchema.index({ studentId: 1 });
studentSchema.index({ grade: 1, vbsYear: 1 });
studentSchema.index({ category: 1, vbsYear: 1 });
studentSchema.index({ name: 'text' });

studentSchema.statics.GRADE_TO_CATEGORY = GRADE_TO_CATEGORY;
studentSchema.statics.CATEGORY_CODE = CATEGORY_CODE;

module.exports = mongoose.model('Student', studentSchema);
