const Settings = require('../models/Settings');

/**
 * Checks if the current time (IST) is within the student attendance time window.
 * Admin is always exempt from this check.
 *
 * @returns {{ allowed: boolean, message: string, windowStart: string, windowEnd: string }}
 */
const checkAttendanceWindow = async () => {
  const settings = await Settings.findOne({ isActive: true });
  if (!settings) {
    return { allowed: false, message: 'No active VBS year configured' };
  }

  const { startTime, endTime } = settings.timeWindow.studentAttendance;
  const timezone = settings.timeWindow.timezone || 'Asia/Kolkata';

  // Get current time in IST
  const now = new Date();
  const istString = now.toLocaleString('en-IN', { timeZone: timezone });
  const istDate = new Date(istString);

  const currentHour = istDate.getHours();
  const currentMin = istDate.getMinutes();
  const currentTotalMin = currentHour * 60 + currentMin;

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startTotalMin = startH * 60 + startM;
  const endTotalMin = endH * 60 + endM;

  const allowed = currentTotalMin >= startTotalMin && currentTotalMin <= endTotalMin;

  return {
    allowed,
    message: allowed
      ? 'Attendance window is open'
      : `Attendance window is closed. Window: ${startTime} - ${endTime} IST`,
    windowStart: startTime,
    windowEnd: endTime,
    currentTime: `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`,
    minutesRemaining: allowed ? endTotalMin - currentTotalMin : 0,
  };
};

/**
 * Checks if a given date is within the active VBS schedule.
 */
const isWithinVBSSchedule = async (date) => {
  const settings = await Settings.findOne({ isActive: true });
  if (!settings) return { valid: false, message: 'No active VBS year configured' };

  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  const startDate = new Date(settings.dates.startDate);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(settings.dates.endDate);
  endDate.setHours(23, 59, 59, 999);

  const valid = checkDate >= startDate && checkDate <= endDate;

  return {
    valid,
    message: valid
      ? 'Date is within VBS schedule'
      : `Date is outside VBS schedule (${settings.dates.startDate.toDateString()} - ${settings.dates.endDate.toDateString()})`,
    vbsYear: settings.year,
    settings,
  };
};

/**
 * Returns the active VBS year settings.
 */
const getActiveVBSSettings = async () => {
  return Settings.findOne({ isActive: true });
};

module.exports = { checkAttendanceWindow, isWithinVBSSchedule, getActiveVBSSettings };
