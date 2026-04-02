const mongoose = require('mongoose');

const GRADE_TO_CATEGORY = {
  PreKG: 'Beginner', LKG: 'Beginner', UKG: 'Beginner',
  '1': 'Beginner', '2': 'Beginner',
  '3': 'Primary', '4': 'Primary', '5': 'Primary',
  '6': 'Junior', '7': 'Junior', '8': 'Junior',
  '9': 'Inter', '10': 'Inter', '11': 'Inter', '12': 'Inter',
};

const CATEGORY_CODE = {
  Beginner: 'BEG', Primary: 'PRI', Junior: 'JUN', Inter: 'INT',
};

const RELIGION_OPTIONS = ['Christian', 'Hindu', 'Muslim', 'Other'];
const CHRISTIAN_DENOMINATIONS = ['Pentecostal', 'CSI', 'RC', 'Other'];

const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String, unique: true, sparse: true, trim: true, uppercase: true,
    },
    name: {
      type: String, required: [true, 'Student name is required'],
      trim: true, maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    gender: {
      type: String, enum: ['male', 'female', 'other'], required: [true, 'Gender is required'],
    },
    grade: {
      type: String,
      enum: ['PreKG', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
      required: [true, 'Grade is required'],
    },
    category: {
      type: String, enum: ['Beginner', 'Primary', 'Junior', 'Inter'],
    },
    // Religion fields
    religion: {
      type: String, enum: RELIGION_OPTIONS, default: 'Christian',
    },
    christianDenomination: {
      // Only used when religion === 'Christian'
      type: String, enum: [...CHRISTIAN_DENOMINATIONS, null],
    },
    // Contact
    contactNumber: {
      type: String,
      match: [/^\d{10}$/, 'Contact number must be 10 digits'],
    },
    whatsappNumber: {
      type: String,
      match: [/^\d{10}$/, 'WhatsApp number must be 10 digits'],
    },
    sameAsContact: {
      // If true, whatsappNumber === contactNumber
      type: Boolean, default: false,
    },
    // Family
    parentName: {
      type: String, trim: true, maxlength: [100, 'Parent name cannot exceed 100 characters'],
    },
    village: {
      type: String, trim: true, maxlength: [100, 'Village cannot exceed 100 characters'],
    },
    schoolName: {
      type: String, trim: true, maxlength: [100, 'School name cannot exceed 100 characters'],
    },
    // Assignment
    classAssigned: {
      type: mongoose.Schema.Types.ObjectId, ref: 'Class',
    },
    isActive: { type: Boolean, default: true },
    vbsYear: { type: Number, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

// Auto-determine category from grade
studentSchema.pre('save', function (next) {
  if (this.isModified('grade') || !this.category) {
    this.category = GRADE_TO_CATEGORY[this.grade];
  }
  // Sync whatsapp if sameAsContact
  if (this.sameAsContact && this.contactNumber) {
    this.whatsappNumber = this.contactNumber;
  }
  next();
});

studentSchema.index({ studentId: 1 });
studentSchema.index({ grade: 1, vbsYear: 1 });
studentSchema.index({ category: 1, vbsYear: 1 });
studentSchema.index({ name: 'text' });

studentSchema.statics.GRADE_TO_CATEGORY = GRADE_TO_CATEGORY;
studentSchema.statics.CATEGORY_CODE = CATEGORY_CODE;
studentSchema.statics.RELIGION_OPTIONS = RELIGION_OPTIONS;
studentSchema.statics.CHRISTIAN_DENOMINATIONS = CHRISTIAN_DENOMINATIONS;

module.exports = mongoose.model('Student', studentSchema);