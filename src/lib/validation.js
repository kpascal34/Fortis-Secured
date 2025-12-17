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
