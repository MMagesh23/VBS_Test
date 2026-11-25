// backend/models/ClassHistory.js
//
// One document per class change of a student (first allocation, transfer, un-assignment).
// Attendance documents stay keyed by the class they were taken in, so this collection is
// the *timeline* (who moved where, and when) used by the class-wise reports.
const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

const classHistorySchema = new mongoose.Schema(
  {
    student:       { type: ObjectId, ref: 'Student', required: true },
    fromClass:     { type: ObjectId, ref: 'Class', default: null },  // null = first assignment
    toClass:       { type: ObjectId, ref: 'Class', default: null },  // null = unassigned
    vbsYear:       { type: Number },
    reassignedAt:  { type: Date, default: Date.now },
    reassignedBy:  { type: ObjectId, ref: 'User' },
    reason:        { type: String, trim: true },
    effectiveDate: { type: Date, default: Date.now },                // day the move takes effect (IST midnight)
  },
  { timestamps: true }
);

classHistorySchema.index({ student: 1, reassignedAt: -1 });
classHistorySchema.index({ fromClass: 1 });
classHistorySchema.index({ toClass: 1 });
classHistorySchema.index({ vbsYear: 1 });

module.exports = mongoose.models.ClassHistory || mongoose.model('ClassHistory', classHistorySchema);
