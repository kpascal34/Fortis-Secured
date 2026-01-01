/**
 * Data Validation Utility Library
 * Provides robust parsing and validation for common data types
 * with user-friendly error messages
 */

/**
 * Safe numeric parser with validation
 * @param {any} value - Value to parse
 * @param {number} defaultValue - Default if parsing fails (default: 0)
 * @param {number} decimalPlaces - Decimal places to round to
 * @returns {number} Parsed number or default
 */
export function parseNumber(value, defaultValue = 0, decimalPlaces = 2) {
  if (value === null || value === undefined || value === '') return defaultValue;
  
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return defaultValue;
  
  return decimalPlaces >= 0 ? parseFloat(parsed.toFixed(decimalPlaces)) : parsed;
}

/**
 * Format currency with proper handling of invalid values
 * @param {any} value - Value to format
 * @param {string} currency - Currency symbol (default: '£')
 * @param {number} decimalPlaces - Decimal places (default: 2)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value, currency = '£', decimalPlaces = 2) {
  const num = parseNumber(value, 0, decimalPlaces);
  return `${currency}${num.toFixed(decimalPlaces)}`;
}

/**
 * Safe date parser with validation
 * @param {any} value - Value to parse (ISO string, Date object, or timestamp)
 * @param {Date} defaultValue - Default date if parsing fails (default: now)
 * @returns {Date} Parsed date or default
 */
export function parseDate(value, defaultValue = new Date()) {
  if (!value) return defaultValue;
  
  try {
    const date = new Date(value);
    // Check if date is valid
    if (date instanceof Date && !isNaN(date.getTime())) {
      return date;
    }
  } catch (error) {
    console.warn(`Invalid date: ${value}`, error);
  }
  
  return defaultValue;
}

/**
 * Format date for display with fallback
 * @param {any} value - Date value to format
 * @param {string} locale - Locale for formatting (default: 'en-GB')
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDate(value, locale = 'en-GB', options = { year: 'numeric', month: '2-digit', day: '2-digit' }) {
  try {
    const date = parseDate(value);
    return date.toLocaleDateString(locale, options);
  } catch (error) {
    return '—';
  }
}

/**
 * Format time with fallback
 * @param {any} value - Date value or time string (HH:mm)
 * @returns {string} Formatted time
 */
export function formatTime(value, locale = 'en-GB') {
  if (typeof value === 'string' && /^\d{2}:\d{2}/.test(value)) {
    return value;
  }
  
  try {
    const date = parseDate(value);
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    return '—';
  }
}

/**
 * Calculate hours between two timestamps with validation
 * @param {any} startTime - Start timestamp or ISO string
 * @param {any} endTime - End timestamp or ISO string
 * @param {number} defaultValue - Default if calculation fails (default: 0)
 * @returns {number} Hours as decimal (e.g., 8.5 for 8 hours 30 minutes)
 */
export function calculateHours(startTime, endTime, defaultValue = 0) {
  try {
    if (!startTime || !endTime) return defaultValue;
    
    const start = parseDate(startTime);
    const end = parseDate(endTime);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return defaultValue;
    
    const diffMs = end - start;
    if (diffMs < 0) return defaultValue; // End time before start time
    
    const hours = diffMs / (1000 * 60 * 60);
    return parseNumber(hours, defaultValue, 2);
  } catch (error) {
    console.warn('Error calculating hours:', error);
    return defaultValue;
  }
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if email is valid
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate required fields
 * @param {object} obj - Object to validate
 * @param {array} requiredFields - Array of required field names
 * @returns {object} { isValid: boolean, missingFields: array, errors: object }
 */
export function validateRequired(obj, requiredFields = []) {
  const errors = {};
  const missingFields = [];
  
  requiredFields.forEach(field => {
    if (!obj[field] || (typeof obj[field] === 'string' && obj[field].trim() === '')) {
      missingFields.push(field);
      errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
    }
  });
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
    errors,
  };
}

/**
 * Validate numeric range
 * @param {any} value - Value to check
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @param {string} fieldName - Field name for error message
 * @returns {object} { isValid: boolean, error: string }
 */
export function validateRange(value, min = 0, max = 100, fieldName = 'Value') {
  const num = parseNumber(value);
  
  if (num < min || num > max) {
    return {
      isValid: false,
      error: `${fieldName} must be between ${min} and ${max}`,
    };
  }
  
  return { isValid: true, error: '' };
}

/**
 * Format hours and minutes from decimal hours
 * @param {any} decimalHours - Hours as decimal (e.g., 8.5)
 * @returns {string} Formatted as "Xh Ym" (e.g., "8h 30m")
 */
export function formatHours(decimalHours) {
  const hours = parseNumber(decimalHours, 0);
  if (hours === 0) return '0h';
  
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  if (minutes === 0) return `${wholeHours}h`;
  return `${wholeHours}h ${minutes}m`;
}

/**
 * Get error message for a validation error
 * @param {any} value - Value that failed validation
 * @param {string} type - Type of validation (currency, date, email, etc.)
 * @returns {string} User-friendly error message
 */
export function getErrorMessage(value, type = 'field') {
  const messages = {
    currency: `Invalid currency amount: "${value}". Please enter a valid number.`,
    date: `Invalid date: "${value}". Please use YYYY-MM-DD format.`,
    email: `Invalid email address: "${value}". Please check the format.`,
    time: `Invalid time format. Please use HH:mm format.`,
    number: `Invalid number: "${value}". Please enter a valid number.`,
    hours: `Invalid hours value. Hours must be a positive number.`,
  };
  
  return messages[type] || `Invalid ${type}: "${value}". Please check the value.`;
}

/**
 * Safely calculate percentage
 * @param {any} part - Part value
 * @param {any} whole - Whole value
 * @param {number} decimalPlaces - Decimal places (default: 2)
 * @returns {number} Percentage or 0 if calculation fails
 */
export function calculatePercentage(part, whole, decimalPlaces = 2) {
  const partNum = parseNumber(part, 0);
  const wholeNum = parseNumber(whole, 1);
  
  if (wholeNum === 0) return 0;
  
  const percentage = (partNum / wholeNum) * 100;
  return parseNumber(percentage, 0, decimalPlaces);
}

/**
 * Sanitize object by removing null/undefined and parsing numerics
 * @param {object} obj - Object to sanitize
 * @param {array} numericFields - Fields that should be numeric
 * @returns {object} Sanitized object
 */
export function sanitizeObject(obj = {}, numericFields = []) {
  const sanitized = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    
    if (numericFields.includes(key)) {
      sanitized[key] = parseNumber(value);
    } else {
      sanitized[key] = value;
    }
  });
  
  return sanitized;
}

/**
 * Compare two numbers with tolerance for floating point errors
 * @param {number} a - First number
 * @param {number} b - Second number
 * @param {number} tolerance - Tolerance (default: 0.01)
 * @returns {boolean} True if numbers are approximately equal
 */
export function approxEqual(a, b, tolerance = 0.01) {
  return Math.abs(parseNumber(a) - parseNumber(b)) <= tolerance;
}

/**
 * Validate array of numeric objects
 * @param {array} array - Array to validate
 * @param {string} numericField - Field name that should be numeric
 * @returns {object} { isValid: boolean, errors: array }
 */
export function validateNumericArray(array = [], numericField = 'value') {
  const errors = [];
  
  array.forEach((item, index) => {
    const num = parseNumber(item[numericField]);
    if (!Number.isFinite(num)) {
      errors.push(`Item ${index + 1}: Invalid ${numericField}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============ INTERIM PLATFORM VALIDATORS ============

/**
 * Sanitize username (a-z/0-9/dots, lowercase)
 */
export function sanitizeUsername(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('Username input required');
  }
  return input
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '')
    .slice(0, 100);
}

/**
 * Validate password (12+ chars minimum)
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password required');
  }
  if (password.length < 12) {
    throw new Error('Password must be at least 12 characters');
  }
  return true;
}

/**
 * Validate SIA licence format
 */
export function validateSIALicence(licenceNumber) {
  if (!licenceNumber || typeof licenceNumber !== 'string') {
    throw new Error('SIA licence number required');
  }
  if (licenceNumber.length < 10 || licenceNumber.length > 50) {
    throw new Error('Invalid SIA licence format');
  }
  return true;
}

/**
 * Validate date of birth (18+ years old)
 */
export function validateDateOfBirth(dob) {
  const date = new Date(dob);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date of birth');
  }
  const age = new Date().getFullYear() - date.getFullYear();
  const m = new Date().getMonth() - date.getMonth();
  const actualAge = m < 0 || (m === 0 && new Date().getDate() < date.getDate()) ? age - 1 : age;
  if (actualAge < 18) {
    throw new Error('Must be at least 18 years old');
  }
  return true;
}

/**
 * Validate UK National Insurance Number
 */
export function validateNINumber(ni) {
  if (!ni || typeof ni !== 'string') {
    throw new Error('National Insurance number required');
  }
  const re = /^[A-Z]{2}[0-9]{6}[A-Z]$/;
  if (!re.test(ni.toUpperCase().replace(/\s/g, ''))) {
    throw new Error('Invalid National Insurance number format');
  }
  return true;
}

/**
 * Validate UK postcode
 */
export function validatePostcode(postcode) {
  if (!postcode || typeof postcode !== 'string') {
    throw new Error('Postcode required');
  }
  const cleaned = postcode.toUpperCase().replace(/\s/g, '');
  if (!/^[A-Z0-9]{6,7}$/.test(cleaned)) {
    throw new Error('Invalid UK postcode format');
  }
  return true;
}

/**
 * Validate phone number
 */
export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    throw new Error('Phone number required');
  }
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 10 || cleaned.length > 15) {
    throw new Error('Invalid phone number');
  }
  return true;
}

/**
 * Calculate months between two dates
 */
export function getMonthsBetween(from, to) {
  from = new Date(from);
  to = new Date(to);
  const months = (to.getFullYear() - from.getFullYear()) * 12;
  return months + (to.getMonth() - from.getMonth());
}

/**
 * Check if employment gap > 31 days
 */
export function hasExcessiveGap(endDate, nextStartDate) {
  const end = new Date(endDate);
  const start = new Date(nextStartDate);
  const days = Math.floor((start - end) / (1000 * 60 * 60 * 24));
  return days > 31;
}

/**
 * Validate address history covers 5 years
 */
export function validateAddressHistoryCoverage(addresses) {
  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw new Error('At least one address required');
  }
  let totalMonths = 0;
  for (const addr of addresses) {
    if (!addr.fromDate) throw new Error('Address from date required');
    const from = new Date(addr.fromDate);
    const to = addr.toDate ? new Date(addr.toDate) : new Date();
    totalMonths += getMonthsBetween(from, to);
  }
  if (totalMonths < 60) {
    throw new Error(`Address history covers ${totalMonths} months, need 60+ months`);
  }
  return true;
}

/**
 * Validate employment gaps < 31 days
 */
export function validateEmploymentGaps(jobs) {
  if (!Array.isArray(jobs) || jobs.length === 0) {
    throw new Error('At least one job required');
  }
  const sorted = [...jobs].sort((a, b) => new Date(b.toDate) - new Date(a.toDate));
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    if (hasExcessiveGap(current.toDate, next.fromDate)) {
      const end = new Date(current.toDate);
      const start = new Date(next.fromDate);
      const days = Math.floor((start - end) / (1000 * 60 * 60 * 24));
      throw new Error(`Gap of ${days} days between jobs (max 31 allowed)`);
    }
  }
  return true;
}

/**
 * Validate employment coverage 5+ years
 */
export function validateEmploymentCoverage(jobs) {
  if (!Array.isArray(jobs) || jobs.length === 0) {
    throw new Error('At least one job required');
  }
  let coverage = 0;
  for (const job of jobs) {
    const from = new Date(job.fromDate);
    const to = job.toDate ? new Date(job.toDate) : new Date();
    coverage += getMonthsBetween(from, to);
  }
  if (coverage < 60) {
    throw new Error(`Employment history covers ${coverage} months, need 60+`);
  }
  return true;
}

/**
 * Validate file size (max 50MB default)
 */
export function validateFileSize(sizeInBytes, maxMB = 50) {
  const maxBytes = maxMB * 1024 * 1024;
  if (sizeInBytes > maxBytes) {
    throw new Error(`File too large (max ${maxMB}MB)`);
  }
  return true;
}

/**
 * Validate file type (whitelist)
 */
export function validateFileType(mimeType, allowed = null) {
  const defaultAllowed = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'video/mp4',
    'video/quicktime',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  const allowedTypes = allowed || defaultAllowed;
  if (!allowedTypes.includes(mimeType)) {
    throw new Error(`File type not allowed: ${mimeType}`);
  }
  return true;
}
