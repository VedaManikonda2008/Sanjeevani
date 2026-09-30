// utils/dateUtils.js

/**
 * Returns the actual number of days in the month of the given date.
 * Correctly handles 28 (Feb non-leap), 29 (Feb leap), 30, and 31 day months.
 * @param {Date} date
 * @returns {number}
 */
function daysInMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  // Day 0 of "next month" is the last day of "this month"
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Given a start date and duration type, compute totalDays and endDate.
 * - weekly  -> always exactly 7 days
 * - monthly -> the actual remaining days of that calendar month,
 *              counted from the start date through the last day of
 *              that same month (so totalDays varies: 28/29/30/31 minus
 *              however many days into the month the user started).
 *
 * If you'd rather monthly ALWAYS mean "a full calendar month's worth of
 * days starting today" (e.g. always 30 or 31 days regardless of start
 * date), swap to the commented alternative below.
 */
function calculatePlanDuration(startDate, durationType) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  if (durationType === "weekly") {
    const totalDays = 7;
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + (totalDays - 1));
    return { totalDays, endDate };
  }

  if (durationType === "monthly") {
    const totalDaysInThisMonth = daysInMonth(start);
    const lastDayOfMonth = new Date(
      start.getFullYear(),
      start.getMonth(),
      totalDaysInThisMonth
    );
    const totalDays =
      Math.round((lastDayOfMonth - start) / (1000 * 60 * 60 * 24)) + 1;

    // --- Alternative (always a full month, e.g. 30/31 days from start,
    // rolling into the next month): uncomment to use instead ---
    // const totalDays = totalDaysInThisMonth;
    // const endDate = new Date(start);
    // endDate.setDate(endDate.getDate() + (totalDays - 1));
    // return { totalDays, endDate };

    return { totalDays, endDate: lastDayOfMonth };
  }

  throw new Error("durationType must be 'weekly' or 'monthly'");
}

/** Add N days to a date and return a new Date (UTC-safe, midnight). */
function addDays(date, n) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

/** Returns true if `date` (day-level) is strictly after today. */
function isFutureDate(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() > today.getTime();
}

module.exports = { daysInMonth, calculatePlanDuration, addDays, isFutureDate };
