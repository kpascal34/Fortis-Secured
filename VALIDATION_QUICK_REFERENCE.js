/**
 * QUICK REFERENCE: Data Validation Functions
 * For developers adding validation to new modules
 */

// ============================================================================
// IMPORT STATEMENT
// ============================================================================

import {
  parseNumber,
  formatCurrency,
  formatDate,
  formatTime,
  formatHours,
  calculateHours,
  validateEmail,
  validateRequired,
  validateRange,
  calculatePercentage,
  sanitizeObject,
  approxEqual,
  validateNumericArray,
  getErrorMessage,
  parseDate,
} from '@/lib/validation';

// ============================================================================
// MOST COMMON FUNCTIONS
// ============================================================================

// 1. Format currency for display
formatCurrency(1234.567)  // "£1234.57"
formatCurrency(0)         // "£0.00"
formatCurrency(null)      // "£0.00"

// 2. Parse number safely
parseNumber('15.5')     // 15.5
parseNumber('abc')      // 0
parseNumber(undefined)  // 0
parseNumber('10.567', 0, 2)  // 10.57

// 3. Format hours nicely
formatHours(8.5)   // "8h 30m"
formatHours(8)     // "8h"
formatHours(0.75)  // "0h 45m"

// 4. Calculate hours between timestamps
calculateHours('2025-12-17T08:00:00Z', '2025-12-17T16:30:00Z')  // 8.5
calculateHours(null, null)  // 0
calculateHours(start, end, 0)  // default to 0 if calculation fails

// 5. Format date for display
formatDate('2025-12-17')  // "17/12/2025" (en-GB)
formatDate(null)          // "—"
formatDate('invalid')     // "—"

// 6. Parse date safely
parseDate('2025-12-17')   // Date object
parseDate(null)           // Current date
parseDate('invalid')      // Current date

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

// 7. Validate required fields
validateRequired(
  { name: 'John', rate: '', date: '2025-12-17' },
  ['name', 'rate', 'date']
)
// Returns: { isValid: false, missingFields: ['rate'], errors: { rate: "Rate is required" } }

// 8. Validate number range
validateRange(85, 0, 100, 'Test Score')
// Returns: { isValid: true, error: '' }

validateRange(150, 0, 100, 'Test Score')
// Returns: { isValid: false, error: 'Test Score must be between 0 and 100' }

// 9. Validate email format
validateEmail('user@example.com')  // true
validateEmail('invalid.email')     // false
validateEmail(null)                // false

// ============================================================================
// ADVANCED FUNCTIONS
// ============================================================================

// 10. Calculate percentage
calculatePercentage(25, 100, 2)  // 25
calculatePercentage(1, 3, 2)     // 33.33
calculatePercentage(0, 0)        // 0 (no division by zero)

// 11. Sanitize object (remove nulls, parse numerics)
sanitizeObject(
  { name: 'John', rate: '15.5', commission: null },
  ['rate']
)
// Returns: { name: 'John', rate: 15.5 }

// 12. Compare floating point numbers with tolerance
approxEqual(0.1 + 0.2, 0.3)  // true (tolerance: 0.01)
approxEqual(10.001, 10, 0.01)  // false

// 13. Validate array of numeric objects
validateNumericArray(
  [{ value: 10 }, { value: 'abc' }, { value: 20 }],
  'value'
)
// Returns: { isValid: false, errors: ['Item 2: Invalid value'] }

// ============================================================================
// USAGE PATTERNS
// ============================================================================

// Pattern 1: Safe calculation in render
const totalPayAmount = payrollData.reduce(
  (sum, p) => sum + parseNumber(p.grossPay),
  0
);
return <p>{formatCurrency(totalPayAmount)}</p>;

// Pattern 2: Display with fallback
return (
  <div>
    <p>Date: {formatDate(invoice.dueDate)}</p>  {/* Shows "—" if invalid */}
    <p>Hours: {formatHours(calculateHours(start, end))}</p>  {/* Safe calc */}
  </div>
);

// Pattern 3: Form validation before submit
const handleSubmit = (data) => {
  const validation = validateRequired(data, ['email', 'amount']);
  if (!validation.isValid) {
    setErrors(validation.errors);
    return;
  }
  
  if (!validateEmail(data.email).isValid) {
    setErrors({ email: getErrorMessage(data.email, 'email') });
    return;
  }
  
  // Submit data...
};

// Pattern 4: Safe aggregations
const total = items
  .map(item => parseNumber(item.price))
  .filter(n => Number.isFinite(n))
  .reduce((sum, n) => sum + n, 0);

// Pattern 5: Conditional logic on parsed data
const hours = calculateHours(start, end);
const rate = parseNumber(hourlyRate);
const cost = hours > 0 && rate > 0 ? hours * rate : 0;

// ============================================================================
// COMMON MISTAKES TO AVOID
// ============================================================================

// ❌ WRONG: Assuming .toFixed() on unknown value
const payWrong = payroll.hourlyRate.toFixed(2);  // Crashes if undefined

// ✅ RIGHT: Use parseNumber first
const pay = formatCurrency(payroll.hourlyRate);  // Safe

// ❌ WRONG: Direct date comparison without parsing
if (new Date(invoice.dueDate) < new Date()) {}  // Could throw

// ✅ RIGHT: Use parseDate helper
if (parseDate(invoice.dueDate) < new Date()) {}  // Safe

// ❌ WRONG: Parsing float strings without validation
const sumWrong = items.reduce((s, i) => s + parseFloat(i.value), 0);  // Could be NaN

// ✅ RIGHT: Use parseNumber with filter
const sum = items
  .map(i => parseNumber(i.value))
  .reduce((s, n) => s + n, 0);  // Always a number

// ❌ WRONG: Dividing without checking zero
const avgWrong = total / count;  // Could be Infinity

// ✅ RIGHT: Guard division
const avg = count > 0 ? total / count : 0;

// ============================================================================
// FILE LOCATIONS
// ============================================================================

// Validation Library:
// src/lib/validation.js

// Modules Using Validation:
// src/pages/portal/Payroll.jsx
// src/pages/portal/TimeTracking.jsx
// src/pages/portal/OpenShifts.jsx
// src/pages/portal/Finance.jsx

// Full Documentation:
// DATA_VALIDATION_GUIDE.js (this directory)

// ============================================================================
// WHEN TO USE EACH FUNCTION
// ============================================================================

// Use parseNumber when:
//   - Parsing user input (forms, API responses)
//   - Calculating aggregations (sum, average)
//   - Need guaranteed numeric type
//   - Output will be formatted with formatCurrency

// Use formatCurrency when:
//   - Displaying money values in UI
//   - Output must be readable "£1,234.56"
//   - Source value might be invalid

// Use calculateHours when:
//   - Comparing two timestamps
//   - Computing work duration
//   - Want guaranteed valid number (>= 0)

// Use formatHours when:
//   - Display calculated hours in UI
//   - Want human-readable "8h 30m" format
//   - Source is decimal hours

// Use formatDate when:
//   - Display dates in UI
//   - Want consistent locale (en-GB)
//   - Source date might be invalid

// Use validateRequired when:
//   - Form submission validation
//   - API payload validation
//   - Need detailed error per field

// Use validateRange when:
//   - Percentage fields (0-100)
//   - Age/hour ranges
//   - User-friendly error messages needed

// ============================================================================
// PERFORMANCE TIPS
// ============================================================================

// ✓ Safe to use in render (< 1ms per call)
// ✓ Safe to use in loops (optimized for speed)
// ✓ No external dependencies
// ✓ Tree-shakeable via import
// ✓ No need to memoize (pure functions)

// ✓ Good practice:
export const totalPay = useMemo(
  () => formatCurrency(payroll.reduce((sum, p) => sum + parseNumber(p.grossPay), 0)),
  [payroll]
);

// ✓ Also fine (function is fast enough):
return <p>{formatCurrency(calculateTotal(data))}</p>;

// ============================================================================
// TESTING YOUR USAGE
// ============================================================================

// Test in browser console:
// import { parseNumber, formatCurrency } from '@/lib/validation'
// parseNumber('15.5')  // Should return 15.5
// formatCurrency(1234.567)  // Should return "£1234.57"
// formatCurrency(null)  // Should return "£0.00"

export const QUICK_REFERENCE_VERSION = '1.0';
