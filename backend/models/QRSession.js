const mongoose = require('mongoose');

const qrSessionSchema = new mongoose.Schema(
  {
    // Unique token embedded in the QR code
    token: {
      type: String,
      required: true,
      unique: true,
    },
    // Which VBS date this QR is for
    date: {
      type: Date,
      required: true,
    },
    vbsYear: {
      type: Number,
      required: true,
    },
    // Created by admin
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // QR expires after X minutes (default 10 min)
    expiresAt: {
      type: Date,
      required: true,
    },
    // Whether this session is still active
    isActive: {
      type: Boolean,
      default: true,
    },
    // Label for display (e.g. "Morning Session Day 3")
    label: {
      type: String,
      trim: true,
      default: '',
    },
    // Track which teachers have scanned
    scans: [
      {
        teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
        teacherName: String,
        scannedAt: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ['present', 'late'],
          default: 'present',
        },
        arrivalTime: String,
      },
    ],
  },
  { timestamps: true }
);

// TTL index — auto-delete expired sessions after 24 hours past expiry
qrSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });
qrSessionSchema.index({ token: 1 });
qrSessionSchema.index({ date: 1, vbsYear: 1 });

module.exports = mongoose.models.QRSession || mongoose.model('QRSession', qrSessionSchema);
