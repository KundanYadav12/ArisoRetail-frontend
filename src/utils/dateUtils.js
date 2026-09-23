/**
 * Indian Standard Time (IST — UTC+05:30 / Asia/Kolkata) Frontend Date Utilities
 * Guarantees that dates rendered, sent to APIs, or selected in datepickers
 * consistently evaluate in Indian Standard Time across all client environments.
 */

/**
 * Returns current date or specified date formatted as YYYY-MM-DD in Asia/Kolkata (IST)
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} e.g. "2026-09-23"
 */
export function getISTDateString(date = new Date()) {
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) {
      return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    }
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  } catch (err) {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  }
}

/**
 * Returns YYYYMMDD in IST (e.g. for sequence numbers and file downloads)
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} e.g. "20260923"
 */
export function getISTDatePrefix(date = new Date()) {
  return getISTDateString(date).replace(/-/g, '');
}

/**
 * Returns current time formatted as HH:mm:ss in Asia/Kolkata (IST) 24h
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} e.g. "14:30:00"
 */
export function getISTTimeString(date = new Date()) {
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) {
      return new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
    }
    return d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
  } catch (err) {
    return new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
  }
}

/**
 * Returns datetime formatted as YYYY-MM-DD HH:mm:ss in Asia/Kolkata (IST)
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} e.g. "2026-09-23 14:30:00"
 */
export function getISTDateTimeString(date = new Date()) {
  return `${getISTDateString(date)} ${getISTTimeString(date)}`;
}

/**
 * Formats a date for human-readable Indian display (e.g. "23 Sep 2026")
 * @param {Date|string|number} date
 * @returns {string}
 */
export function formatISTDisplayDate(date) {
  if (!date) return 'N/A';
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return String(date).slice(0, 10);
    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (err) {
    return String(date).slice(0, 10);
  }
}

/**
 * Formats a date + time for human-readable Indian display (e.g. "23 Sep 2026, 04:30 PM")
 * @param {Date|string|number} date
 * @returns {string}
 */
export function formatISTDisplayDateTime(date) {
  if (!date) return 'N/A';
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return String(date);
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (err) {
    return String(date);
  }
}

/**
 * Helper to get date N days in the past in IST
 * @param {number} days
 * @returns {string} YYYY-MM-DD
 */
export function getPastISTDateString(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return getISTDateString(d);
}

/**
 * Helper to get the first day of current month in IST
 * @returns {string} YYYY-MM-DD
 */
export function getFirstDayOfCurrentMonthIST() {
  const istDate = getISTDateString();
  const [year, month] = istDate.split('-');
  return `${year}-${month}-01`;
}
