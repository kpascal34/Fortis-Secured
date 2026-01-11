/**
 * Advanced Filtering System
 * Site groups, saved filters, and complex query building
 */

import { ID } from 'appwrite';

// Filter operators
export const OPERATORS = {
  EQUALS: 'equals',
  NOT_EQUALS: 'not_equals',
  CONTAINS: 'contains',
  NOT_CONTAINS: 'not_contains',
  STARTS_WITH: 'starts_with',
  ENDS_WITH: 'ends_with',
  GREATER_THAN: 'greater_than',
  LESS_THAN: 'less_than',
  BETWEEN: 'between',
  IN: 'in',
  NOT_IN: 'not_in',
  IS_EMPTY: 'is_empty',
  IS_NOT_EMPTY: 'is_not_empty',
};

// Filterable fields
export const FILTERABLE_FIELDS = {
  // Shift fields
  'shift.date': { label: 'Date', type: 'date', operators: [OPERATORS.EQUALS, OPERATORS.BETWEEN, OPERATORS.GREATER_THAN, OPERATORS.LESS_THAN] },
  'shift.status': { label: 'Status', type: 'select', operators: [OPERATORS.EQUALS, OPERATORS.IN, OPERATORS.NOT_IN] },
  'shift.siteId': { label: 'Site', type: 'select', operators: [OPERATORS.EQUALS, OPERATORS.IN, OPERATORS.NOT_IN] },
  'shift.guardId': { label: 'Guard', type: 'select', operators: [OPERATORS.EQUALS, OPERATORS.IN, OPERATORS.NOT_IN, OPERATORS.IS_EMPTY] },
  'shift.startTime': { label: 'Start Time', type: 'time', operators: [OPERATORS.EQUALS, OPERATORS.GREATER_THAN, OPERATORS.LESS_THAN] },
  'shift.urgency': { label: 'Urgency', type: 'select', operators: [OPERATORS.EQUALS, OPERATORS.IN] },
  
  // Guard fields
  'guard.firstName': { label: 'First Name', type: 'text', operators: [OPERATORS.CONTAINS, OPERATORS.STARTS_WITH, OPERATORS.EQUALS] },
  'guard.lastName': { label: 'Last Name', type: 'text', operators: [OPERATORS.CONTAINS, OPERATORS.STARTS_WITH, OPERATORS.EQUALS] },
  'guard.status': { label: 'Guard Status', type: 'select', operators: [OPERATORS.EQUALS, OPERATORS.IN] },
  'guard.siaLicenseExpiry': { label: 'License Expiry', type: 'date', operators: [OPERATORS.BETWEEN, OPERATORS.LESS_THAN] },
  
  // Site fields
  'site.siteName': { label: 'Site Name', type: 'text', operators: [OPERATORS.CONTAINS, OPERATORS.EQUALS] },
  'site.siteGroup': { label: 'Site Group', type: 'select', operators: [OPERATORS.EQUALS, OPERATORS.IN] },
  'site.clientId': { label: 'Client', type: 'select', operators: [OPERATORS.EQUALS, OPERATORS.IN] },
};

/**
 * Create a new filter
 * @param {string} field - Field to filter on
 * @param {string} operator - Comparison operator
 * @param {any} value - Filter value
 * @returns {Object} Filter object
 */
export const createFilter = (field, operator, value) => ({
  id: ID.unique(),
  field,
  operator,
  value,
  createdAt: new Date().toISOString(),
});

/**
 * Apply single filter to data
 * @param {Array} data - Data to filter
 * @param {Object} filter - Filter to apply
 * @returns {Array} Filtered data
 */
export const applyFilter = (data, filter) => {
  const { field, operator, value } = filter;
  const [entity, property] = field.split('.');

  return data.filter((item) => {
    const fieldValue = item[property];

    switch (operator) {
      case OPERATORS.EQUALS:
        return fieldValue === value;
      
      case OPERATORS.NOT_EQUALS:
        return fieldValue !== value;
      
      case OPERATORS.CONTAINS:
        return typeof fieldValue === 'string' && fieldValue.toLowerCase().includes(value.toLowerCase());
      
      case OPERATORS.NOT_CONTAINS:
        return typeof fieldValue === 'string' && !fieldValue.toLowerCase().includes(value.toLowerCase());
      
      case OPERATORS.STARTS_WITH:
        return typeof fieldValue === 'string' && fieldValue.toLowerCase().startsWith(value.toLowerCase());
      
      case OPERATORS.ENDS_WITH:
        return typeof fieldValue === 'string' && fieldValue.toLowerCase().endsWith(value.toLowerCase());
      
      case OPERATORS.GREATER_THAN:
        return fieldValue > value;
      
      case OPERATORS.LESS_THAN:
        return fieldValue < value;
      
      case OPERATORS.BETWEEN:
        return fieldValue >= value[0] && fieldValue <= value[1];
      
      case OPERATORS.IN:
        return Array.isArray(value) && value.includes(fieldValue);
      
      case OPERATORS.NOT_IN:
        return Array.isArray(value) && !value.includes(fieldValue);
      
      case OPERATORS.IS_EMPTY:
        return !fieldValue || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0);
      
      case OPERATORS.IS_NOT_EMPTY:
        return fieldValue && fieldValue !== '' && (!Array.isArray(fieldValue) || fieldValue.length > 0);
      
      default:
        return true;
    }
  });
};

/**
 * Apply multiple filters to data
 * @param {Array} data - Data to filter
 * @param {Array} filters - Array of filters
 * @param {string} logic - 'AND' or 'OR'
 * @returns {Array} Filtered data
 */
export const applyFilters = (data, filters, logic = 'AND') => {
  if (!filters || filters.length === 0) return data;

  if (logic === 'AND') {
    // All filters must match
    return filters.reduce((filtered, filter) => applyFilter(filtered, filter), data);
  } else {
    // Any filter can match
    const results = new Set();
    filters.forEach((filter) => {
      const filtered = applyFilter(data, filter);
      filtered.forEach((item) => results.add(item));
    });
    return Array.from(results);
  }
};

/**
 * Save filter for reuse
 * @param {string} name - Filter name
 * @param {Array} filters - Filter definitions
 * @param {string} logic - Filter logic
 * @param {Object} options - Additional options
 * @returns {Object} Saved filter
 */
export const saveFilter = (name, filters, logic = 'AND', options = {}) => {
  const savedFilter = {
    id: ID.unique(),
    name,
    filters,
    logic,
    ...options,
    createdAt: new Date().toISOString(),
    createdBy: options.userId || 'system',
  };

  // Save to localStorage
  const saved = getSavedFilters();
  saved.push(savedFilter);
  localStorage.setItem('savedFilters', JSON.stringify(saved));

  return savedFilter;
};

/**
 * Get all saved filters
 * @returns {Array} Saved filters
 */
export const getSavedFilters = () => {
  try {
    const saved = localStorage.getItem('savedFilters');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

/**
 * Delete saved filter
 * @param {string} filterId - Filter ID to delete
 */
export const deleteSavedFilter = (filterId) => {
  const saved = getSavedFilters();
  const updated = saved.filter((f) => f.id !== filterId);
  localStorage.setItem('savedFilters', JSON.stringify(updated));
};

/**
 * Site Groups Management
 */

/**
 * Create a site group
 * @param {string} name - Group name
 * @param {Array} siteIds - Array of site IDs
 * @param {Object} options - Additional options
 * @returns {Object} Site group
 */
export const createSiteGroup = (name, siteIds, options = {}) => {
  const group = {
    id: ID.unique(),
    name,
    siteIds,
    color: options.color || '#3B82F6',
    description: options.description || '',
    createdAt: new Date().toISOString(),
  };

  const groups = getSiteGroups();
  groups.push(group);
  localStorage.setItem('siteGroups', JSON.stringify(groups));

  return group;
};

/**
 * Get all site groups
 * @returns {Array} Site groups
 */
export const getSiteGroups = () => {
  try {
    const groups = localStorage.getItem('siteGroups');
    return groups ? JSON.parse(groups) : getDefaultSiteGroups();
  } catch {
    return getDefaultSiteGroups();
  }
};

/**
 * Update site group
 * @param {string} groupId - Group ID
 * @param {Object} updates - Updates to apply
 */
export const updateSiteGroup = (groupId, updates) => {
  const groups = getSiteGroups();
  const index = groups.findIndex((g) => g.id === groupId);
  
  if (index !== -1) {
    groups[index] = { ...groups[index], ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem('siteGroups', JSON.stringify(groups));
  }
};

/**
 * Delete site group
 * @param {string} groupId - Group ID to delete
 */
export const deleteSiteGroup = (groupId) => {
  const groups = getSiteGroups();
  const updated = groups.filter((g) => g.id !== groupId);
  localStorage.setItem('siteGroups', JSON.stringify(updated));
};

/**
 * Get default site groups
 */
const getDefaultSiteGroups = () => [
  {
    id: 'group-1',
    name: 'Retail Sites',
    siteIds: ['site-1', 'site-4'],
    color: '#10B981',
    description: 'Shopping centers and retail locations',
  },
  {
    id: 'group-2',
    name: 'Corporate Offices',
    siteIds: ['site-2', 'site-5'],
    color: '#3B82F6',
    description: 'Office buildings and corporate HQs',
  },
  {
    id: 'group-3',
    name: 'Industrial Sites',
    siteIds: ['site-3'],
    color: '#F59E0B',
    description: 'Warehouses and industrial facilities',
  },
  {
    id: 'group-4',
    name: 'High Priority',
    siteIds: ['site-1', 'site-2'],
    color: '#EF4444',
    description: 'Sites requiring premium security',
  },
];

/**
 * Filter shifts by site group
 * @param {Array} shifts - All shifts
 * @param {string} groupId - Site group ID
 * @returns {Array} Filtered shifts
 */
export const filterByGroup = (shifts, groupId) => {
  const groups = getSiteGroups();
  const group = groups.find((g) => g.id === groupId);
  
  if (!group) return [];
  
  return shifts.filter((shift) => group.siteIds.includes(shift.siteId));
};

/**
 * Quick filters for common scenarios
 */
export const QUICK_FILTERS = {
  UNASSIGNED_SHIFTS: {
    name: 'Unassigned Shifts',
    filters: [createFilter('shift.guardId', OPERATORS.IS_EMPTY, null)],
    logic: 'AND',
  },
  TODAY: {
    name: 'Today',
    filters: [
      createFilter('shift.date', OPERATORS.EQUALS, new Date().toISOString().split('T')[0]),
    ],
    logic: 'AND',
  },
  THIS_WEEK: {
    name: 'This Week',
    filters: [
      createFilter('shift.date', OPERATORS.BETWEEN, [
        new Date().toISOString().split('T')[0],
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      ]),
    ],
    logic: 'AND',
  },
  URGENT_SHIFTS: {
    name: 'Urgent Shifts',
    filters: [createFilter('shift.urgency', OPERATORS.IN, ['high', 'urgent'])],
    logic: 'AND',
  },
  EXPIRING_LICENSES: {
    name: 'Expiring Licenses',
    filters: [
      createFilter('guard.siaLicenseExpiry', OPERATORS.LESS_THAN, 
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      ),
    ],
    logic: 'AND',
  },
  NIGHT_SHIFTS: {
    name: 'Night Shifts',
    filters: [
      createFilter('shift.startTime', OPERATORS.GREATER_THAN, '22:00'),
    ],
    logic: 'OR',
  },
};

/**
 * Build complex filter from UI state
 * @param {Object} filterState - UI filter state
 * @returns {Object} Filter configuration
 */
export const buildFilterFromState = (filterState) => {
  const filters = [];

  Object.entries(filterState).forEach(([field, config]) => {
    if (config.enabled && config.value !== null && config.value !== undefined) {
      filters.push(createFilter(field, config.operator, config.value));
    }
  });

  return {
    filters,
    logic: filterState._logic || 'AND',
  };
};

/**
 * Export filters as JSON
 * @param {Array} filters - Filters to export
 * @returns {string} JSON string
 */
export const exportFilters = (filters) => {
  return JSON.stringify(filters, null, 2);
};

/**
 * Import filters from JSON
 * @param {string} json - JSON string
 * @returns {Array} Parsed filters
 */
export const importFilters = (json) => {
  try {
    return JSON.parse(json);
  } catch (error) {
    throw new Error('Invalid filter JSON');
  }
};

export default {
  OPERATORS,
  FILTERABLE_FIELDS,
  QUICK_FILTERS,
  createFilter,
  applyFilter,
  applyFilters,
  saveFilter,
  getSavedFilters,
  deleteSavedFilter,
  createSiteGroup,
  getSiteGroups,
  updateSiteGroup,
  deleteSiteGroup,
  filterByGroup,
  buildFilterFromState,
  exportFilters,
  importFilters,
};
