/**
 * Security Utils
 * 
 * Comprehensive security utilities including:
 * - Multi-Factor Authentication (MFA)
 * - Role-Based Access Control (RBAC)
 * - User Import/Export
 * - Session Management
 * - Password Policies
 * - Security Audit Logging
 */

// ============================================================================
// MFA (Multi-Factor Authentication) Utilities
// ============================================================================

/**
 * MFA Methods
 */
export const MFA_METHODS = {
  SMS: 'sms',
  EMAIL: 'email',
  AUTHENTICATOR: 'authenticator', // TOTP (Google Authenticator, Authy, etc.)
  BACKUP_CODES: 'backup_codes',
};

/**
 * Generate a 6-digit OTP code
 * @returns {string} - 6-digit code
 */
export const generateOTPCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generate backup codes for account recovery
 * @param {number} count - Number of codes to generate (default: 10)
 * @returns {Array<string>} - Array of backup codes
 */
export const generateBackupCodes = (count = 10) => {
  const codes = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric codes (4 pairs)
    const code = Array.from({ length: 4 }, () => 
      Math.random().toString(36).substring(2, 4).toUpperCase()
    ).join('-');
    codes.push(code);
  }
  return codes;
};

/**
 * Create MFA setup data for a user
 * @param {string} userId - User ID
 * @param {string} method - MFA method (sms, email, authenticator)
 * @param {string} contact - Phone number or email for SMS/Email method
 * @returns {Object} - MFA setup object
 */
export const setupMFA = (userId, method, contact = null) => {
  const mfaData = {
    userId,
    method,
    enabled: false,
    setupDate: null,
    lastUsed: null,
    backupCodes: [],
    secret: null,
  };

  if (method === MFA_METHODS.SMS || method === MFA_METHODS.EMAIL) {
    if (!contact) {
      throw new Error(`Contact information required for ${method} method`);
    }
    mfaData.contact = contact;
  }

  if (method === MFA_METHODS.AUTHENTICATOR) {
    // Generate a secret for TOTP
    mfaData.secret = generateTOTPSecret();
  }

  // Always generate backup codes
  mfaData.backupCodes = generateBackupCodes();

  return mfaData;
};

/**
 * Generate TOTP secret (base32 encoded)
 * @returns {string} - Base32 encoded secret
 */
export const generateTOTPSecret = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
};

/**
 * Verify OTP code
 * @param {string} inputCode - User-entered code
 * @param {string} expectedCode - Expected code
 * @param {number} expiryMinutes - Code validity period (default: 5 minutes)
 * @param {Date} generatedAt - When the code was generated
 * @returns {Object} - { valid: boolean, reason: string }
 */
export const verifyOTPCode = (inputCode, expectedCode, expiryMinutes = 5, generatedAt = new Date()) => {
  // Check if code matches
  if (inputCode !== expectedCode) {
    return { valid: false, reason: 'Invalid code' };
  }

  // Check if code has expired
  const now = new Date();
  const expiryTime = new Date(generatedAt.getTime() + expiryMinutes * 60000);
  if (now > expiryTime) {
    return { valid: false, reason: 'Code has expired' };
  }

  return { valid: true, reason: 'Code verified successfully' };
};

/**
 * Verify backup code
 * @param {string} inputCode - User-entered backup code
 * @param {Array<string>} backupCodes - Array of valid backup codes
 * @returns {Object} - { valid: boolean, remainingCodes: Array<string> }
 */
export const verifyBackupCode = (inputCode, backupCodes) => {
  const normalizedInput = inputCode.toUpperCase().replace(/\s/g, '');
  const codeIndex = backupCodes.findIndex(code => 
    code.toUpperCase().replace(/\s/g, '') === normalizedInput
  );

  if (codeIndex === -1) {
    return { valid: false, remainingCodes: backupCodes };
  }

  // Remove used backup code
  const remainingCodes = backupCodes.filter((_, index) => index !== codeIndex);
  return { valid: true, remainingCodes };
};

/**
 * Enable MFA for a user
 * @param {Object} mfaData - MFA setup object
 * @returns {Object} - Updated MFA data
 */
export const enableMFA = (mfaData) => {
  return {
    ...mfaData,
    enabled: true,
    setupDate: new Date().toISOString(),
  };
};

/**
 * Record MFA usage
 * @param {Object} mfaData - MFA data object
 * @returns {Object} - Updated MFA data
 */
export const recordMFAUsage = (mfaData) => {
  return {
    ...mfaData,
    lastUsed: new Date().toISOString(),
  };
};

// ============================================================================
// Role-Based Access Control (RBAC) Utilities
// ============================================================================

/**
 * System Roles with default permissions
 */
export const SYSTEM_ROLES = {
  SUPER_ADMIN: {
    id: 'super_admin',
    name: 'Super Administrator',
    description: 'Full system access with all permissions',
    level: 1,
    color: '#EF4444', // red-500
    defaultPermissions: '*', // All permissions
  },
  ADMIN: {
    id: 'admin',
    name: 'Administrator',
    description: 'System administrator with elevated privileges',
    level: 2,
    color: '#DC2626', // red-600
    defaultPermissions: [
      'view_dashboard', 'manage_guards', 'manage_clients', 'manage_shifts',
      'approve_timesheets', 'manage_incidents', 'manage_assets', 'manage_invoices',
      'manage_users', 'view_users', 'manage_settings', 'view_reports', 'export_data'
    ],
  },
  MANAGER: {
    id: 'manager',
    name: 'Manager',
    description: 'Operations manager with team oversight',
    level: 3,
    color: '#A855F7', // purple-500
    defaultPermissions: [
      'view_dashboard', 'manage_guards', 'view_guards', 'manage_shifts', 'view_shifts',
      'approve_timesheets', 'view_clients', 'manage_incidents', 'view_incidents',
      'view_assets', 'view_invoices', 'view_reports', 'export_data'
    ],
  },
  SUPERVISOR: {
    id: 'supervisor',
    name: 'Supervisor',
    description: 'Team supervisor with shift management',
    level: 4,
    color: '#3B82F6', // blue-500
    defaultPermissions: [
      'view_dashboard', 'view_guards', 'manage_shifts', 'view_shifts',
      'view_timesheets', 'view_clients', 'manage_incidents', 'view_incidents',
      'view_assets'
    ],
  },
  DISPATCHER: {
    id: 'dispatcher',
    name: 'Dispatcher',
    description: 'Dispatch and scheduling coordinator',
    level: 5,
    color: '#F59E0B', // yellow-500
    defaultPermissions: [
      'view_dashboard', 'view_guards', 'manage_shifts', 'view_shifts',
      'view_timesheets', 'view_clients', 'view_incidents'
    ],
  },
  GUARD: {
    id: 'guard',
    name: 'Security Guard',
    description: 'Field security personnel',
    level: 6,
    color: '#10B981', // green-500
    defaultPermissions: [
      'view_dashboard', 'view_shifts', 'view_timesheets', 'view_incidents'
    ],
  },
  CLIENT: {
    id: 'client',
    name: 'Client',
    description: 'Client with read-only access',
    level: 7,
    color: '#6B7280', // gray-500
    defaultPermissions: [
      'view_dashboard', 'view_shifts', 'view_incidents', 'view_reports'
    ],
  },
};

/**
 * All available permissions in the system
 */
export const SYSTEM_PERMISSIONS = [
  // General
  { id: 'view_dashboard', name: 'View Dashboard', category: 'General', description: 'Access to main dashboard' },
  
  // Guards
  { id: 'view_guards', name: 'View Guards', category: 'Guards', description: 'View guard information' },
  { id: 'manage_guards', name: 'Manage Guards', category: 'Guards', description: 'Create, edit, and delete guards' },
  
  // Clients
  { id: 'view_clients', name: 'View Clients', category: 'Clients', description: 'View client information' },
  { id: 'manage_clients', name: 'Manage Clients', category: 'Clients', description: 'Create, edit, and delete clients' },
  
  // Scheduling
  { id: 'view_shifts', name: 'View Shifts', category: 'Scheduling', description: 'View shift schedules' },
  { id: 'manage_shifts', name: 'Manage Shifts', category: 'Scheduling', description: 'Create, edit, and delete shifts' },
  
  // Time Tracking
  { id: 'view_timesheets', name: 'View Timesheets', category: 'Time Tracking', description: 'View time records' },
  { id: 'approve_timesheets', name: 'Approve Timesheets', category: 'Time Tracking', description: 'Approve and reject timesheets' },
  
  // Incidents
  { id: 'view_incidents', name: 'View Incidents', category: 'Incidents', description: 'View incident reports' },
  { id: 'manage_incidents', name: 'Manage Incidents', category: 'Incidents', description: 'Create, edit, and delete incidents' },
  
  // Assets
  { id: 'view_assets', name: 'View Assets', category: 'Assets', description: 'View asset inventory' },
  { id: 'manage_assets', name: 'Manage Assets', category: 'Assets', description: 'Create, edit, and delete assets' },
  
  // Finance
  { id: 'view_invoices', name: 'View Invoices', category: 'Finance', description: 'View financial records' },
  { id: 'manage_invoices', name: 'Manage Invoices', category: 'Finance', description: 'Create, edit, and delete invoices' },
  
  // Administration
  { id: 'view_users', name: 'View Users', category: 'Administration', description: 'View user accounts' },
  { id: 'manage_users', name: 'Manage Users', category: 'Administration', description: 'Create, edit, and delete users' },
  { id: 'manage_settings', name: 'Manage Settings', category: 'Administration', description: 'Modify system settings' },
  
  // Reports
  { id: 'view_reports', name: 'View Reports', category: 'Reports', description: 'Access to reports' },
  { id: 'export_data', name: 'Export Data', category: 'Reports', description: 'Export data to files' },
];

/**
 * Check if user has a specific permission
 * @param {Object} user - User object with role and permissions
 * @param {string} permissionId - Permission ID to check
 * @returns {boolean} - True if user has permission
 */
export const hasPermission = (user, permissionId) => {
  if (!user) return false;

  // Super admin has all permissions
  if (user.role === 'super_admin') return true;

  // Check if user has explicit permission
  if (user.permissions && Array.isArray(user.permissions)) {
    return user.permissions.includes(permissionId);
  }

  // Fall back to role's default permissions
  const role = SYSTEM_ROLES[user.role?.toUpperCase()];
  if (role?.defaultPermissions === '*') return true;
  if (Array.isArray(role?.defaultPermissions)) {
    return role.defaultPermissions.includes(permissionId);
  }

  return false;
};

/**
 * Check if user has any of the specified permissions
 * @param {Object} user - User object
 * @param {Array<string>} permissionIds - Array of permission IDs
 * @returns {boolean} - True if user has any permission
 */
export const hasAnyPermission = (user, permissionIds) => {
  return permissionIds.some(permId => hasPermission(user, permId));
};

/**
 * Check if user has all specified permissions
 * @param {Object} user - User object
 * @param {Array<string>} permissionIds - Array of permission IDs
 * @returns {boolean} - True if user has all permissions
 */
export const hasAllPermissions = (user, permissionIds) => {
  return permissionIds.every(permId => hasPermission(user, permId));
};

/**
 * Get role hierarchy level
 * @param {string} roleId - Role ID
 * @returns {number} - Role level (lower is higher privilege)
 */
export const getRoleLevel = (roleId) => {
  const role = SYSTEM_ROLES[roleId?.toUpperCase()];
  return role?.level || 999;
};

/**
 * Check if user can manage another user (based on role hierarchy)
 * @param {Object} currentUser - Current user
 * @param {Object} targetUser - Target user to manage
 * @returns {boolean} - True if current user can manage target user
 */
export const canManageUser = (currentUser, targetUser) => {
  const currentLevel = getRoleLevel(currentUser.role);
  const targetLevel = getRoleLevel(targetUser.role);
  
  // Can only manage users with lower privilege (higher level number)
  return currentLevel < targetLevel;
};

/**
 * Get permissions for a role
 * @param {string} roleId - Role ID
 * @returns {Array<string>} - Array of permission IDs
 */
export const getRolePermissions = (roleId) => {
  const role = SYSTEM_ROLES[roleId?.toUpperCase()];
  if (!role) return [];
  if (role.defaultPermissions === '*') {
    return SYSTEM_PERMISSIONS.map(p => p.id);
  }
  return role.defaultPermissions || [];
};

/**
 * Create custom role
 * @param {string} id - Role ID
 * @param {string} name - Role name
 * @param {Array<string>} permissions - Array of permission IDs
 * @param {Object} options - Additional options
 * @returns {Object} - Role object
 */
export const createCustomRole = (id, name, permissions, options = {}) => {
  return {
    id,
    name,
    description: options.description || '',
    level: options.level || 10,
    color: options.color || '#6B7280',
    defaultPermissions: permissions,
    isCustom: true,
    createdAt: new Date().toISOString(),
  };
};

// ============================================================================
// User Import/Export Utilities
// ============================================================================

/**
 * Export users to CSV format
 * @param {Array<Object>} users - Array of user objects
 * @param {Array<string>} fields - Fields to include (optional)
 * @returns {string} - CSV string
 */
export const exportUsersToCSV = (users, fields = null) => {
  if (!users || users.length === 0) {
    throw new Error('No users to export');
  }

  // Default fields if not specified
  const defaultFields = [
    'firstName', 'lastName', 'email', 'phone', 'role', 'status',
    'department', 'licenseNumber', 'licenseExpiry', 'address',
    'emergencyContact', 'emergencyPhone', 'createdAt'
  ];

  const exportFields = fields || defaultFields;

  // Create CSV header
  const headers = exportFields.map(field => {
    // Convert camelCase to Title Case
    return field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }).join(',');

  // Create CSV rows
  const rows = users.map(user => {
    return exportFields.map(field => {
      const value = user[field];
      
      // Handle arrays (permissions)
      if (Array.isArray(value)) {
        return `"${value.join('; ')}"`;
      }
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        return '';
      }
      
      // Handle dates
      if (field.includes('Date') || field === 'createdAt') {
        try {
          const date = new Date(value);
          return date.toISOString().split('T')[0];
        } catch {
          return value;
        }
      }
      
      // Escape commas and quotes
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    }).join(',');
  }).join('\n');

  return `${headers}\n${rows}`;
};

/**
 * Export users to JSON format
 * @param {Array<Object>} users - Array of user objects
 * @param {boolean} prettify - Pretty print JSON (default: true)
 * @returns {string} - JSON string
 */
export const exportUsersToJSON = (users, prettify = true) => {
  if (!users || users.length === 0) {
    throw new Error('No users to export');
  }

  const exportData = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    totalUsers: users.length,
    users: users.map(user => ({
      ...user,
      // Remove sensitive data
      password: undefined,
      mfaSecret: undefined,
    })),
  };

  return prettify ? JSON.stringify(exportData, null, 2) : JSON.stringify(exportData);
};

/**
 * Import users from CSV
 * @param {string} csvContent - CSV file content
 * @returns {Object} - { users: Array, errors: Array }
 */
export const importUsersFromCSV = (csvContent) => {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file is empty or invalid');
  }

  // Parse header
  const headers = lines[0].split(',').map(h => 
    h.trim().replace(/^"|"$/g, '').replace(/\s+/g, '')
      .replace(/([A-Z])/g, (match, p1, offset) => offset > 0 ? match.toLowerCase() : match.toLowerCase())
  );

  const users = [];
  const errors = [];

  // Parse rows
  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);
      
      if (values.length !== headers.length) {
        errors.push({ line: i + 1, error: 'Column count mismatch' });
        continue;
      }

      const user = {};
      headers.forEach((header, index) => {
        const value = values[index].trim();
        
        // Handle empty values
        if (value === '') {
          user[header] = null;
          return;
        }

        // Handle arrays (permissions)
        if (header === 'permissions') {
          user[header] = value.split(';').map(p => p.trim());
          return;
        }

        user[header] = value;
      });

      // Validate required fields
      if (!user.firstName || !user.lastName || !user.email) {
        errors.push({ line: i + 1, error: 'Missing required fields (firstName, lastName, email)' });
        continue;
      }

      // Set defaults
      user.status = user.status || 'active';
      user.role = user.role || 'guard';
      user.permissions = user.permissions || [];
      user.createdAt = user.createdAt || new Date().toISOString();

      users.push(user);
    } catch (error) {
      errors.push({ line: i + 1, error: error.message });
    }
  }

  return { users, errors };
};

/**
 * Parse a CSV line handling quoted values
 * @param {string} line - CSV line
 * @returns {Array<string>} - Array of values
 */
const parseCSVLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of value
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Add last value
  values.push(current);

  return values;
};

/**
 * Import users from JSON
 * @param {string} jsonContent - JSON file content
 * @returns {Object} - { users: Array, errors: Array }
 */
export const importUsersFromJSON = (jsonContent) => {
  try {
    const data = JSON.parse(jsonContent);
    
    if (!data.users || !Array.isArray(data.users)) {
      throw new Error('Invalid JSON format: missing users array');
    }

    const users = [];
    const errors = [];

    data.users.forEach((user, index) => {
      // Validate required fields
      if (!user.firstName || !user.lastName || !user.email) {
        errors.push({ 
          index: index + 1, 
          error: 'Missing required fields (firstName, lastName, email)' 
        });
        return;
      }

      // Set defaults
      user.status = user.status || 'active';
      user.role = user.role || 'guard';
      user.permissions = user.permissions || [];
      user.createdAt = user.createdAt || new Date().toISOString();

      users.push(user);
    });

    return { users, errors };
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error.message}`);
  }
};

/**
 * Download file to user's computer
 * @param {string} content - File content
 * @param {string} filename - File name
 * @param {string} mimeType - MIME type
 */
export const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ============================================================================
// Session Management Utilities
// ============================================================================

/**
 * Session data structure
 */
export const createSession = (user, expiryHours = 24) => {
  return {
    sessionId: generateSessionId(),
    userId: user.$id || user.id,
    userEmail: user.email,
    userRole: user.role,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString(),
    lastActivity: new Date().toISOString(),
    ipAddress: null, // Set by backend
    userAgent: navigator.userAgent,
    mfaVerified: false,
  };
};

/**
 * Generate unique session ID
 * @returns {string} - Session ID
 */
const generateSessionId = () => {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

/**
 * Check if session is valid
 * @param {Object} session - Session object
 * @returns {boolean} - True if session is valid
 */
export const isSessionValid = (session) => {
  if (!session) return false;
  
  const now = new Date();
  const expiresAt = new Date(session.expiresAt);
  
  return now < expiresAt;
};

/**
 * Update session activity
 * @param {Object} session - Session object
 * @returns {Object} - Updated session
 */
export const updateSessionActivity = (session) => {
  return {
    ...session,
    lastActivity: new Date().toISOString(),
  };
};

// ============================================================================
// Password Policy Utilities
// ============================================================================

/**
 * Password policy configuration
 */
export const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  preventCommonPasswords: true,
  preventUserInfo: true, // Prevent using name, email in password
};

/**
 * Validate password against policy
 * @param {string} password - Password to validate
 * @param {Object} user - User object (optional, for checking user info)
 * @returns {Object} - { valid: boolean, errors: Array<string>, strength: number }
 */
export const validatePassword = (password, user = null) => {
  const errors = [];
  let strength = 0;

  // Length check
  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters`);
  } else {
    strength += 20;
  }

  if (password.length > PASSWORD_POLICY.maxLength) {
    errors.push(`Password must be less than ${PASSWORD_POLICY.maxLength} characters`);
  }

  // Uppercase check
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else if (/[A-Z]/.test(password)) {
    strength += 20;
  }

  // Lowercase check
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else if (/[a-z]/.test(password)) {
    strength += 20;
  }

  // Number check
  if (PASSWORD_POLICY.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  } else if (/[0-9]/.test(password)) {
    strength += 20;
  }

  // Special character check
  if (PASSWORD_POLICY.requireSpecialChars) {
    const specialCharsRegex = new RegExp(`[${PASSWORD_POLICY.specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`);
    if (!specialCharsRegex.test(password)) {
      errors.push('Password must contain at least one special character');
    } else {
      strength += 20;
    }
  }

  // Check for user info in password
  if (PASSWORD_POLICY.preventUserInfo && user) {
    const lowerPassword = password.toLowerCase();
    if (user.firstName && lowerPassword.includes(user.firstName.toLowerCase())) {
      errors.push('Password cannot contain your first name');
    }
    if (user.lastName && lowerPassword.includes(user.lastName.toLowerCase())) {
      errors.push('Password cannot contain your last name');
    }
    if (user.email) {
      const emailPart = user.email.split('@')[0].toLowerCase();
      if (lowerPassword.includes(emailPart)) {
        errors.push('Password cannot contain your email');
      }
    }
  }

  // Additional strength bonuses
  if (password.length >= 12) strength += 10;
  if (password.length >= 16) strength += 10;
  if (/[A-Z].*[A-Z]/.test(password)) strength += 5; // Multiple uppercase
  if (/[0-9].*[0-9]/.test(password)) strength += 5; // Multiple numbers

  return {
    valid: errors.length === 0,
    errors,
    strength: Math.min(strength, 100),
  };
};

/**
 * Get password strength label
 * @param {number} strength - Strength score (0-100)
 * @returns {Object} - { label: string, color: string }
 */
export const getPasswordStrengthLabel = (strength) => {
  if (strength < 40) return { label: 'Weak', color: '#EF4444' }; // red
  if (strength < 60) return { label: 'Fair', color: '#F59E0B' }; // yellow
  if (strength < 80) return { label: 'Good', color: '#3B82F6' }; // blue
  return { label: 'Strong', color: '#10B981' }; // green
};

// ============================================================================
// Audit Logging Utilities
// ============================================================================

/**
 * Create audit log entry
 * @param {string} action - Action performed
 * @param {Object} user - User who performed action
 * @param {Object} details - Additional details
 * @returns {Object} - Audit log entry
 */
export const createAuditLog = (action, user, details = {}) => {
  return {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString(),
    action,
    userId: user?.$id || user?.id,
    userEmail: user?.email,
    userRole: user?.role,
    details,
    ipAddress: null, // Set by backend
    userAgent: navigator.userAgent,
  };
};

/**
 * Audit action types
 */
export const AUDIT_ACTIONS = {
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_LOGIN_FAILED: 'user_login_failed',
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DELETED: 'user_deleted',
  USER_ROLE_CHANGED: 'user_role_changed',
  USER_PERMISSIONS_CHANGED: 'user_permissions_changed',
  PASSWORD_CHANGED: 'password_changed',
  MFA_ENABLED: 'mfa_enabled',
  MFA_DISABLED: 'mfa_disabled',
  MFA_VERIFIED: 'mfa_verified',
  SESSION_CREATED: 'session_created',
  SESSION_EXPIRED: 'session_expired',
  DATA_EXPORTED: 'data_exported',
  DATA_IMPORTED: 'data_imported',
};
