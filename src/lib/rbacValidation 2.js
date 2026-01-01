/**
 * RBAC Validation utilities for user and profile management
 * Provides schema validation for role-based access control
 */

// Valid enum values
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
  CLIENT: 'client',
};

export const STATUSES = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  COMPLIANCE_BLOCKED: 'compliance_blocked',
  ARCHIVED: 'archived',
};

export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  LOGIN: 'login',
  LOGOUT: 'logout',
};

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * Basic type validators
 */
const validators = {
  string: (value, { min, max, pattern, required } = {}) => {
    if (required && (value === undefined || value === null || value === '')) {
      return 'This field is required';
    }
    if (!required && (value === undefined || value === null || value === '')) {
      return null;
    }
    if (typeof value !== 'string') {
      return 'Must be a string';
    }
    if (min && value.length < min) {
      return `Must be at least ${min} characters`;
    }
    if (max && value.length > max) {
      return `Must be at most ${max} characters`;
    }
    if (pattern && !pattern.test(value)) {
      return 'Invalid format';
    }
    return null;
  },

  email: (value, { required } = {}) => {
    if (required && !value) {
      return 'Email is required';
    }
    if (!value) return null;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(value)) {
      return 'Invalid email address';
    }
    return null;
  },

  phone: (value, { required } = {}) => {
    if (required && !value) {
      return 'Phone number is required';
    }
    if (!value) return null;
    const phonePattern = /^[\d\s\-\+\(\)]{10,20}$/;
    if (!phonePattern.test(value)) {
      return 'Invalid phone number';
    }
    return null;
  },

  enum: (value, { values, required } = {}) => {
    if (required && !value) {
      return 'This field is required';
    }
    if (!value) return null;
    if (!values.includes(value)) {
      return `Must be one of: ${values.join(', ')}`;
    }
    return null;
  },

  datetime: (value, { required } = {}) => {
    if (required && !value) {
      return 'Date is required';
    }
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return 'Invalid date format';
    }
    return null;
  },

  integer: (value, { min, max, required } = {}) => {
    if (required && (value === undefined || value === null)) {
      return 'This field is required';
    }
    if (value === undefined || value === null) return null;
    if (!Number.isInteger(value)) {
      return 'Must be an integer';
    }
    if (min !== undefined && value < min) {
      return `Must be at least ${min}`;
    }
    if (max !== undefined && value > max) {
      return `Must be at most ${max}`;
    }
    return null;
  },

  object: (value, { required } = {}) => {
    if (required && !value) {
      return 'This field is required';
    }
    if (!value) return null;
    if (typeof value !== 'object' || Array.isArray(value)) {
      return 'Must be an object';
    }
    return null;
  },

  array: (value, { required, minLength, maxLength } = {}) => {
    if (required && (!value || value.length === 0)) {
      return 'At least one item is required';
    }
    if (!value) return null;
    if (!Array.isArray(value)) {
      return 'Must be an array';
    }
    if (minLength && value.length < minLength) {
      return `Must have at least ${minLength} items`;
    }
    if (maxLength && value.length > maxLength) {
      return `Must have at most ${maxLength} items`;
    }
    return null;
  },
};

/**
 * Validate data against schema
 */
export function validateRBAC(data, schema) {
  const errors = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    const error = validators[rules.type](value, rules);
    
    if (error) {
      errors.push({ field, message: error });
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return true;
}

/**
 * User schemas
 */
export const userSchemas = {
  create: {
    email: { type: 'email', required: true },
    phone: { type: 'phone', required: false },
    role: { type: 'enum', values: Object.values(ROLES), required: true },
    status: { type: 'enum', values: Object.values(STATUSES), required: false },
  },

  update: {
    email: { type: 'email', required: false },
    phone: { type: 'phone', required: false },
    role: { type: 'enum', values: Object.values(ROLES), required: false },
    status: { type: 'enum', values: Object.values(STATUSES), required: false },
  },

  selfUpdate: {
    phone: { type: 'phone', required: false },
    // Role and status cannot be self-updated
  },
};

/**
 * Profile schemas
 */
export const profileSchemas = {
  admin: {
    create: {
      fullName: { type: 'string', required: true, min: 2, max: 255 },
      department: { type: 'string', required: false, max: 100 },
      permissions: { type: 'array', required: false },
      notificationPreferences: { type: 'object', required: false },
    },
    update: {
      fullName: { type: 'string', required: false, min: 2, max: 255 },
      department: { type: 'string', required: false, max: 100 },
      permissions: { type: 'array', required: false },
      notificationPreferences: { type: 'object', required: false },
    },
  },

  manager: {
    create: {
      fullName: { type: 'string', required: true, min: 2, max: 255 },
      assignedClients: { type: 'array', required: false },
      assignedSites: { type: 'array', required: false },
      maxStaffSupervision: { type: 'integer', required: false, min: 1, max: 500 },
      certifications: { type: 'array', required: false },
    },
    update: {
      fullName: { type: 'string', required: false, min: 2, max: 255 },
      assignedClients: { type: 'array', required: false },
      assignedSites: { type: 'array', required: false },
      maxStaffSupervision: { type: 'integer', required: false, min: 1, max: 500 },
      certifications: { type: 'array', required: false },
    },
  },

  staff: {
    create: {
      fullName: { type: 'string', required: true, min: 2, max: 255 },
      siaLicence: { type: 'string', required: true, min: 8, max: 50 },
      siaExpiryDate: { type: 'datetime', required: true },
      emergencyContact: { type: 'string', required: false, max: 500 },
      availability: { type: 'object', required: false },
      certifications: { type: 'array', required: false },
      uniformSize: { type: 'string', required: false, max: 20 },
      transportMethod: { 
        type: 'enum', 
        values: ['car', 'public_transport', 'bicycle', 'motorcycle', 'walk'], 
        required: false 
      },
    },
    update: {
      fullName: { type: 'string', required: false, min: 2, max: 255 },
      siaLicence: { type: 'string', required: false, min: 8, max: 50 },
      siaExpiryDate: { type: 'datetime', required: false },
      emergencyContact: { type: 'string', required: false, max: 500 },
      availability: { type: 'object', required: false },
      certifications: { type: 'array', required: false },
      uniformSize: { type: 'string', required: false, max: 20 },
      transportMethod: { 
        type: 'enum', 
        values: ['car', 'public_transport', 'bicycle', 'motorcycle', 'walk'], 
        required: false 
      },
    },
  },

  client: {
    create: {
      companyName: { type: 'string', required: true, min: 2, max: 255 },
      contactName: { type: 'string', required: true, min: 2, max: 255 },
      billingAddress: { type: 'string', required: false, max: 500 },
      vatNumber: { type: 'string', required: false, max: 50 },
      contractStartDate: { type: 'datetime', required: false },
      contractEndDate: { type: 'datetime', required: false },
      paymentTerms: { type: 'integer', required: false, min: 0, max: 365 },
    },
    update: {
      companyName: { type: 'string', required: false, min: 2, max: 255 },
      contactName: { type: 'string', required: false, min: 2, max: 255 },
      billingAddress: { type: 'string', required: false, max: 500 },
      vatNumber: { type: 'string', required: false, max: 50 },
      contractStartDate: { type: 'datetime', required: false },
      contractEndDate: { type: 'datetime', required: false },
      paymentTerms: { type: 'integer', required: false, min: 0, max: 365 },
    },
  },
};

/**
 * Sanitize input data
 */
export function sanitize(data) {
  if (typeof data !== 'object' || data === null) return data;
  
  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = value.trim();
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitize(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Mask sensitive data for display
 */
export function maskSensitive(data, field) {
  if (!data || !data[field]) return data;
  
  const value = data[field];
  
  switch (field) {
    case 'siaLicence':
      // Show last 4 characters only
      return value.length > 4 ? `****${value.slice(-4)}` : '****';
    case 'phone':
      // Show last 4 digits only
      return value.length > 4 ? `****${value.slice(-4)}` : '****';
    case 'email':
      // Show first char and domain only
      const [local, domain] = value.split('@');
      return local.length > 0 ? `${local[0]}***@${domain}` : value;
    default:
      return value;
  }
}
