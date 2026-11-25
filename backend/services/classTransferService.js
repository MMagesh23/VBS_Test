// backend/services/classTransferService.js
//
// Records class changes in ClassHistory so reports can show a complete, per-class
// attendance history for students that were transferred during the VBS.
const ClassHistory = require('../models/ClassHistory');
const { normalizeToISTMidnight } = require('./attendanceWindowService');

const idOf = (v) => (v ? (v._id || v).toString() : null);

/**
 * Write one ClassHistory row per student whose class actually changed.
 *
 * @param {Array<{ _id: any, classAssigned?: any, vbsYear?: number }>} students  Students BEFORE the change
 * @param {any}    toClassId     New class id (null/undefined = unassigned)
 * @param {object} [opts]
 * @param {any}    [opts.userId]
 * @param {string} [opts.reason]
 * @param {Date|string} [opts.effectiveDate]  Defaults to today (IST)
 * @returns {Promise<number>} number of history rows written
 */
const recordClassChanges = async (students, toClassId, opts = {}) => {
  const to = idOf(toClassId);
  const effectiveDate = normalizeToISTMidnight(opts.effectiveDate || new Date());

  const rows = (students || [])
    .filter((s) => idOf(s.classAssigned) !== to)           // skip no-op "changes"
    .map((s) => ({
      student: s._id,
      fromClass: s.classAssigned ? idOf(s.classAssigned) : null,
      toClass: to,
      vbsYear: s.vbsYear,
      reassignedBy: opts.userId || undefined,
      reason: opts.reason || undefined,
      effectiveDate,
    }));

  if (rows.length) await ClassHistory.insertMany(rows);
  return rows.length;
};

module.exports = { recordClassChanges };
