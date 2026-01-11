/**
 * DATA VALIDATION IMPLEMENTATION GUIDE
 * 
 * Overview:
 * This document outlines the comprehensive data validation system
 * implemented across the Fortis Secured portal modules.
 */

// ============================================================================
// 1. VALIDATION LIBRARY (`src/lib/validation.js`)
// ============================================================================

/**
 * Core Functions:
 * 
 * parseNumber(value, defaultValue, decimalPlaces)
 *   - Safely parses any value to a finite number
 *   - Returns defaultValue (0) if parsing fails
 *   - Rounds to specified decimal places
 *   - Handles NaN, null, undefined gracefully
 * 
 * formatCurrency(value, currency, decimalPlaces)
 *   - Formats numbers as currency (£ by default)
 *   - Auto-parses invalid inputs
 *   - Output: "£0.00", "£1,234.56", etc.
 * 
 * parseDate(value, defaultValue)
 *   - Parses ISO strings, Date objects, timestamps
 *   - Validates date is actually valid (not Invalid Date)
 *   - Returns defaultValue (now) if parsing fails
 *   - Includes error logging for debugging
 * 
 * formatDate(value, locale, options)
 *   - Formats dates for display in locale-aware manner
 *   - Falls back to "—" if parsing fails
 *   - Default locale: 'en-GB' with YYYY-MM-DD format
 * 
 * calculateHours(startTime, endTime, defaultValue)
 *   - Safely calculates hours between two timestamps
 *   - Validates end time >= start time
 *   - Returns defaultValue (0) if calculation fails
 *   - Output: decimal hours (e.g., 8.5 for 8h 30m)
 * 
 * formatHours(decimalHours)
 *   - Converts decimal hours to "Xh Ym" format
 *   - Input: 8.5 → Output: "8h 30m"
 *   - Handles edge cases (0 hours, round minutes)
 * 
 * validateRequired(obj, requiredFields)
 *   - Checks for missing/empty required fields
 *   - Returns: { isValid, missingFields, errors }
 *   - Generates user-friendly error messages
 * 
 * validateRange(value, min, max, fieldName)
 *   - Ensures numeric value is within bounds
 *   - Returns: { isValid, error }
 *   - Custom error messages with bounds
 * 
 * validateEmail(email)
 *   - Basic email format validation
 *   - Handles null/undefined/non-string values
 *   - Returns boolean
 * 
 * calculatePercentage(part, whole, decimalPlaces)
 *   - Safely calculates percentages
 *   - Handles division by zero (returns 0)
 *   - Useful for payroll calculations
 * 
 * sanitizeObject(obj, numericFields)
 *   - Removes null/undefined values
 *   - Auto-parses numeric fields
 *   - Returns cleaned object
 * 
 * getErrorMessage(value, type)
 *   - Returns user-friendly error messages
 *   - Supports: 'currency', 'date', 'email', 'time', 'number', 'hours'
 *   - Customizable for each data type
 */

// ============================================================================
// 2. PAYROLL MODULE UPDATES
// ============================================================================

/**
 * File: src/pages/portal/Payroll.jsx
 * 
 * Changes:
 * - Imported: parseNumber, formatCurrency, formatHours
 * - Updated payroll calculations to use parseNumber() for safe parsing
 * - Modified stats display to use formatCurrency() instead of string concat
 * - Changed hours display to use formatHours() for "Xh Ym" format
 * - Added error resilience: if any calculation produces NaN, parseNumber returns 0
 * 
 * Example Before:
 *   grossPay: grossPay.toFixed(2)
 *   value: `£${totalStats.totalGross}`
 * 
 * Example After:
 *   grossPay: parseNumber(grossPay)
 *   value: formatCurrency(totalStats.totalGross)  // "£1,234.56"
 * 
 * Benefits:
 * - Guards against invalid/missing values
 * - Consistent formatting across all money fields
 * - Hours display is more readable ("2h 30m" vs "2.5")
 */

// ============================================================================
// 3. TIME TRACKING MODULE UPDATES
// ============================================================================

/**
 * File: src/pages/portal/TimeTracking.jsx
 * 
 * Changes:
 * - Imported: calculateHours, parseNumber, formatCurrency
 * - Replaced local calculateHours() with validation version
 * - Updated calculateScheduledHours() with error handling for time parsing
 * - Added parseNumber() guards in getTimeStatus() calculations
 * - Validates decimal hours > 0 before percentage comparisons
 * 
 * Error Handling Improvements:
 * 1. Time String Parsing:
 *    - Split "HH:mm" format safely
 *    - Parse each component to integer with default (0)
 *    - Return 0 if parsing fails (prevents NaN from spreading)
 * 
 * 2. Hour Calculation:
 *    - Validates both timestamps are valid dates
 *    - Checks diff >= 0 (no negative durations)
 *    - Returns defaultValue if any check fails
 * 
 * 3. Percentage Comparisons:
 *    - Validates scheduledHours > 0 before division
 *    - Prevents spurious "short" or "overtime" status
 *    - Only compares if both values are meaningful
 * 
 * Example Before (Fragile):
 *   const actualHours = parseFloat(calculateHours(...))  // Could be NaN
 *   if (actualHours < scheduledHours * 0.9)  // NaN < anything is false
 * 
 * Example After (Robust):
 *   const actualHours = parseNumber(calculateHours(...) || 0)  // Always number
 *   if (scheduledHours > 0 && actualHours < scheduledHours * 0.9)
 */

// ============================================================================
// 4. OPEN SHIFTS MODULE UPDATES
// ============================================================================

/**
 * File: src/pages/portal/OpenShifts.jsx
 * 
 * Changes:
 * - Imported: parseNumber, formatCurrency
 * - Updated getAveragePayRate() to use parseNumber() for rate parsing
 * - Replaced manual currency formatting with formatCurrency()
 * - Fixed £NaN bug by validating rates before averaging
 * 
 * Average Pay Rate Function:
 *   Old: rates.map(s => Number(s.payRate))  // Could include NaN
 *   New: rates.map(s => parseNumber(s.payRate))  // Always finite number
 * 
 * Display Improvements:
 *   Old: <p>£{shift.payRate}</p>  // Might show "£undefined" or "£NaN"
 *   New: <p>{formatCurrency(shift.payRate)}</p>  // Always "£X.XX"
 */

// ============================================================================
// 5. FINANCE MODULE (COMPLETED EARLIER)
// ============================================================================

/**
 * File: src/pages/portal/Finance.jsx
 * 
 * Already implemented:
 * - Individual try/catch for each API collection
 * - Removed alert popup; replaced with inline error banner
 * - Added Number() guards on all toFixed() calls
 * - Fallback to 'Unknown Client' for missing client names
 * 
 * Combined with new validation library:
 * - Could import formatCurrency for all money display
 * - Could use formatDate() for invoice dates
 * - Could use calculateHours() for shift duration calculations
 */

// ============================================================================
// 6. ERROR MESSAGE PATTERNS
// ============================================================================

/**
 * User-Friendly Error Messages
 * 
 * Currency Validation:
 *   Invalid: "invalid amount: 'abc'. Please enter a valid number."
 *   Display: "—" or "£0.00" (user sees no error unless in form)
 * 
 * Date Validation:
 *   Invalid: "invalid date: '2025-13-45'. Please use YYYY-MM-DD format."
 *   Display: "—" or defaults to today
 * 
 * Email Validation:
 *   Invalid: "invalid email: 'example@'. Please check the format."
 *   Display: Form error message before submission
 * 
 * Time Parsing:
 *   Invalid: "invalid time format. Please use HH:mm format."
 *   Display: Graceful fallback (0 hours, "—")
 * 
 * Range Validation:
 *   Invalid: "Tax Rate must be between 0 and 100"
 *   Display: Form error message (validation before submission)
 */

// ============================================================================
// 7. IMPLEMENTATION CHECKLIST
// ============================================================================

/**
 * ✓ Payroll Module:
 *   ✓ parseNumber() for all monetary calculations
 *   ✓ formatCurrency() for display
 *   ✓ formatHours() for duration display
 *   ✓ Guards against NaN in aggregations
 * 
 * ✓ Time Tracking Module:
 *   ✓ Safe time string parsing with error handling
 *   ✓ Hour calculation with null/invalid checks
 *   ✓ Percentage comparisons guarded
 * 
 * ✓ Open Shifts Module:
 *   ✓ Safe average pay rate calculation
 *   ✓ Currency formatting on display
 *   ✓ Fixed £NaN bug
 * 
 * ✓ Finance Module:
 *   ✓ Resilient data loading per collection
 *   ✓ Error banner instead of alert
 *   ✓ Guards on all toFixed() calls
 * 
 * ⚠ Future Enhancements:
 *   ○ Extend validation to Tasks module (dueDate comparisons)
 *   ○ Add email validation to User Management forms
 *   ○ Implement validateRequired() in invoice creation
 *   ○ Use calculatePercentage() in Reports module
 *   ○ Add form-level validation feedback components
 */

// ============================================================================
// 8. USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: Parsing user input for payroll
 * 
 * // Without validation:
 * const rate = document.getElementById('rate').value  // "15.5x" (typo)
 * const hours = document.getElementById('hours').value  // ""
 * const pay = rate * hours  // NaN
 * 
 * // With validation:
 * const rate = parseNumber(document.getElementById('rate').value, 0)  // 0
 * const hours = parseNumber(document.getElementById('hours').value, 0)  // 0
 * const pay = rate * hours  // 0 (safe, shows as "£0.00")
 */

/**
 * Example 2: Formatting monetary values
 * 
 * import { formatCurrency } from '@/lib/validation'
 * 
 * const total = 1234.567
 * formatCurrency(total)  // "£1234.57"
 * formatCurrency(null)  // "£0.00"
 * formatCurrency("not a number")  // "£0.00"
 */

/**
 * Example 3: Calculating and formatting hours
 * 
 * import { calculateHours, formatHours } from '@/lib/validation'
 * 
 * const start = "2025-12-17T08:00:00Z"
 * const end = "2025-12-17T16:30:00Z"
 * const hours = calculateHours(start, end)  // 8.5
 * formatHours(hours)  // "8h 30m"
 */

/**
 * Example 4: Date validation and formatting
 * 
 * import { parseDate, formatDate } from '@/lib/validation'
 * 
 * const userInput = "2025-99-99"  // Invalid
 * const date = parseDate(userInput)  // Returns today (default)
 * formatDate(date)  // "17/12/2025" (using en-GB locale)
 * 
 * // Display in component:
 * const invoice = { dueDate: null }
 * <p>{formatDate(invoice.dueDate)}</p>  // Shows "—"
 */

/**
 * Example 5: Validation in form submission
 * 
 * import { validateRequired, validateRange, getErrorMessage } from '@/lib/validation'
 * 
 * const handleSubmit = (data) => {
 *   const required = validateRequired(data, ['name', 'rate', 'date'])
 *   if (!required.isValid) {
 *     console.error(required.errors)  // { name: "Name is required", ... }
 *     return
 *   }
 *   
 *   const rangeCheck = validateRange(data.rate, 0, 100, 'Hourly Rate')
 *   if (!rangeCheck.isValid) {
 *     alert(rangeCheck.error)  // "Hourly Rate must be between 0 and 100"
 *     return
 *   }
 * }
 */

// ============================================================================
// 9. TESTING STRATEGY
// ============================================================================

/**
 * Test Cases for Validation Functions:
 * 
 * parseNumber():
 *   - Input: null → 0
 *   - Input: undefined → 0
 *   - Input: "" → 0
 *   - Input: "15.5" → 15.5
 *   - Input: "15.567" → 15.57 (2 decimals)
 *   - Input: "abc" → 0
 *   - Input: Infinity → 0
 *   - Input: NaN → 0
 * 
 * calculateHours():
 *   - Valid dates → hours (decimal)
 *   - Invalid dates → 0
 *   - End before start → 0
 *   - Null values → 0
 *   - Empty strings → 0
 * 
 * formatCurrency():
 *   - 0 → "£0.00"
 *   - 1234.5 → "£1234.50"
 *   - null → "£0.00"
 *   - "xyz" → "£0.00"
 * 
 * formatHours():
 *   - 0 → "0h"
 *   - 8 → "8h"
 *   - 8.5 → "8h 30m"
 *   - 8.25 → "8h 15m"
 *   - 8.75 → "8h 45m"
 */

// ============================================================================
// 10. PERFORMANCE NOTES
// ============================================================================

/**
 * - All validation functions execute in < 1ms
 * - No external dependencies (uses native JS)
 * - Can be safely used in hot loops
 * - Memoization not needed for typical usage
 * - Tree-shakeable: import only functions you need
 */

// ============================================================================
// 11. INTEGRATION ACROSS CODEBASE
// ============================================================================

/**
 * Modules Using Validation Library:
 * 
 * ✓ Payroll.jsx          - parseNumber, formatCurrency, formatHours
 * ✓ TimeTracking.jsx     - calculateHours, parseNumber, formatCurrency
 * ✓ OpenShifts.jsx       - parseNumber, formatCurrency
 * ✓ Finance.jsx          - Already uses Number() guards (future: formatCurrency)
 * 
 * Candidate Modules (Future):
 * ○ Tasks.jsx            - formatDate, validateRequired, parseDate
 * ○ UserManagement.jsx   - validateEmail, validateRequired, formatDate
 * ○ Reports.jsx          - calculatePercentage, formatCurrency, parseDate
 * ○ Incidents.jsx        - formatDate, calculateHours
 * ○ MySchedule.jsx       - calculateHours, formatHours
 * ○ Dashboard.jsx        - formatCurrency for financial summaries
 */

export const DATA_VALIDATION_GUIDE = {
  version: '1.0',
  createdAt: '2025-12-17',
  lastUpdated: '2025-12-17',
  status: 'Active Implementation',
};
