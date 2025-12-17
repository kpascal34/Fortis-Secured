/**
 * Attachment Management Utilities
 * Handles file attachments, templates, and priority presets
 */

/**
 * Priority presets for tasks and incidents
 */
export const PRIORITY_PRESETS = {
  critical: {
    level: 'critical',
    label: 'Critical',
    color: 'red',
    responseTime: '1 hour',
    resolutionTime: '4 hours',
    icon: 'alert',
  },
  high: {
    level: 'high',
    label: 'High',
    color: 'orange',
    responseTime: '2 hours',
    resolutionTime: '1 day',
    icon: 'warning',
  },
  medium: {
    level: 'medium',
    label: 'Medium',
    color: 'yellow',
    responseTime: '4 hours',
    resolutionTime: '3 days',
    icon: 'info',
  },
  low: {
    level: 'low',
    label: 'Low',
    color: 'blue',
    responseTime: '1 day',
    resolutionTime: '1 week',
    icon: 'check',
  },
};

/**
 * Task templates with pre-filled content
 */
export const TASK_TEMPLATES = {
  patrol: {
    id: 'patrol',
    name: 'Patrol Check',
    description: 'Conduct routine patrol of designated areas. Check all entry/exit points, verify cameras and alarms are functioning.',
    priority: 'medium',
    taskType: 'patrol',
    estimatedHours: 1,
  },
  inspection: {
    id: 'inspection',
    name: 'Equipment Inspection',
    description: 'Inspect all security equipment including cameras, access control, alarm systems, and communication devices.',
    priority: 'high',
    taskType: 'inspection',
    estimatedHours: 2,
  },
  training: {
    id: 'training',
    name: 'Staff Training',
    description: 'Conduct training session for staff on emergency procedures, evacuation routes, and security protocols.',
    priority: 'high',
    taskType: 'training',
    estimatedHours: 2,
  },
  incident_follow_up: {
    id: 'incident_follow_up',
    name: 'Incident Follow-up',
    description: 'Follow up on reported incident. Document findings, verify corrective actions, and update incident record.',
    priority: 'high',
    taskType: 'incident_follow_up',
    estimatedHours: 1,
  },
  maintenance: {
    id: 'maintenance',
    name: 'Equipment Maintenance',
    description: 'Perform scheduled maintenance on security equipment. Check battery levels, update firmware, and test functionality.',
    priority: 'medium',
    taskType: 'maintenance',
    estimatedHours: 1.5,
  },
  briefing: {
    id: 'briefing',
    name: 'Security Briefing',
    description: 'Conduct security briefing with team members. Discuss threats, procedures, and expectations for shift.',
    priority: 'medium',
    taskType: 'briefing',
    estimatedHours: 0.5,
  },
};

/**
 * Incident templates with pre-filled content
 */
export const INCIDENT_TEMPLATES = {
  theft: {
    id: 'theft',
    name: 'Theft Incident',
    title: 'Theft or Unauthorized Removal',
    description: 'Document suspected theft or unauthorized removal of items.',
    incidentType: 'theft',
    severity: 'high',
  },
  breach: {
    id: 'breach',
    name: 'Security Breach',
    title: 'Security Breach or Unauthorized Access',
    description: 'Document security breach, unauthorized access, or compromise of security systems.',
    incidentType: 'security-breach',
    severity: 'critical',
  },
  conflict: {
    id: 'conflict',
    name: 'Conflict/Altercation',
    title: 'Conflict or Altercation',
    description: 'Document conflict, altercation, or aggressive behavior incident.',
    incidentType: 'conflict',
    severity: 'high',
  },
  injury: {
    id: 'injury',
    name: 'Work-Related Injury',
    title: 'Work-Related Injury',
    description: 'Document work-related injury or accident incident.',
    incidentType: 'injury',
    severity: 'high',
  },
  equipment: {
    id: 'equipment',
    name: 'Equipment Failure',
    title: 'Equipment Failure or Malfunction',
    description: 'Document equipment failure, malfunction, or degradation of service.',
    incidentType: 'equipment-failure',
    severity: 'medium',
  },
  property: {
    id: 'property',
    name: 'Property Damage',
    title: 'Property Damage',
    description: 'Document property damage, vandalism, or environmental damage.',
    incidentType: 'property-damage',
    severity: 'medium',
  },
  other: {
    id: 'other',
    name: 'Other Incident',
    title: 'Other Incident',
    description: 'Document other security-related incidents.',
    incidentType: 'other',
    severity: 'low',
  },
};

/**
 * Supported file types for attachments
 */
export const SUPPORTED_FILE_TYPES = {
  documents: {
    extensions: ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx'],
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  images: {
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/bmp'],
    maxSize: 5 * 1024 * 1024, // 5MB
  },
  videos: {
    extensions: ['mp4', 'avi', 'mov', 'mkv'],
    mimeTypes: ['video/mp4', 'video/x-msvideo', 'video/quicktime', 'video/x-matroska'],
    maxSize: 100 * 1024 * 1024, // 100MB
  },
  audio: {
    extensions: ['mp3', 'wav', 'aac', 'm4a'],
    mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/aac', 'audio/mp4'],
    maxSize: 25 * 1024 * 1024, // 25MB
  },
};

/**
 * Validate file for attachment
 * @param {File} file - File to validate
 * @param {string} type - Type of file (documents, images, videos, audio)
 * @returns {Object} { valid: boolean, error: string }
 */
export const validateAttachment = (file, type = 'documents') => {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  const fileType = SUPPORTED_FILE_TYPES[type];
  if (!fileType) {
    return { valid: false, error: 'Invalid file type category' };
  }

  // Check file extension
  const extension = file.name.split('.').pop().toLowerCase();
  if (!fileType.extensions.includes(extension)) {
    return {
      valid: false,
      error: `File type not supported. Allowed: ${fileType.extensions.join(', ')}`,
    };
  }

  // Check file size
  if (file.size > fileType.maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${fileType.maxSize / (1024 * 1024)}MB limit`,
    };
  }

  return { valid: true, error: null };
};

/**
 * Create attachment object from file
 * @param {File} file - File to attach
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Attachment object
 */
export const createAttachment = (file, metadata = {}) => {
  const timestamp = new Date().toISOString();
  
  return {
    id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    uploadedAt: timestamp,
    uploadedBy: metadata.uploadedBy || 'system',
    description: metadata.description || '',
    category: metadata.category || 'general',
    url: metadata.url || null,
    ...metadata,
  };
};

/**
 * Apply task template to form data
 * @param {string} templateId - Template ID
 * @param {Object} currentData - Current form data
 * @returns {Object} Updated form data
 */
export const applyTaskTemplate = (templateId, currentData = {}) => {
  const template = TASK_TEMPLATES[templateId];
  if (!template) return currentData;

  return {
    ...currentData,
    title: template.name,
    description: template.description,
    priority: template.priority,
    taskType: template.taskType,
    estimatedHours: template.estimatedHours,
  };
};

/**
 * Apply incident template to form data
 * @param {string} templateId - Template ID
 * @param {Object} currentData - Current form data
 * @returns {Object} Updated form data
 */
export const applyIncidentTemplate = (templateId, currentData = {}) => {
  const template = INCIDENT_TEMPLATES[templateId];
  if (!template) return currentData;

  return {
    ...currentData,
    title: template.title,
    description: template.description,
    incidentType: template.incidentType,
    severity: template.severity,
  };
};

/**
 * Apply priority preset to task
 * @param {string} priorityLevel - Priority level (critical, high, medium, low)
 * @returns {Object} Priority preset data
 */
export const applyPriorityPreset = (priorityLevel) => {
  return PRIORITY_PRESETS[priorityLevel] || PRIORITY_PRESETS.medium;
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Get file icon class based on file type
 * @param {string} fileName - File name
 * @returns {string} Icon class name
 */
export const getFileIconClass = (fileName) => {
  const extension = fileName.split('.').pop().toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(extension)) {
    return 'file-image';
  }
  if (['pdf'].includes(extension)) {
    return 'file-pdf';
  }
  if (['doc', 'docx'].includes(extension)) {
    return 'file-word';
  }
  if (['xls', 'xlsx'].includes(extension)) {
    return 'file-excel';
  }
  if (['mp4', 'avi', 'mov', 'mkv'].includes(extension)) {
    return 'file-video';
  }
  if (['mp3', 'wav', 'aac', 'm4a'].includes(extension)) {
    return 'file-audio';
  }
  
  return 'file-generic';
};
