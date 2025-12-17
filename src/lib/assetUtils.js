/**
 * Enhanced Asset Management Utilities
 * Provides comprehensive asset tracking with serial numbers, purchase dates, and linking
 */

/**
 * Asset categories with details
 */
export const ASSET_CATEGORIES = {
  uniform: {
    id: 'uniform',
    name: 'Uniforms',
    icon: 'shirt',
    hasSerialNumber: false,
    tracksExpiry: true,
    requiresMaintenance: false,
  },
  equipment: {
    id: 'equipment',
    name: 'Equipment',
    icon: 'tool',
    hasSerialNumber: true,
    tracksExpiry: false,
    requiresMaintenance: true,
  },
  vehicle: {
    id: 'vehicle',
    name: 'Vehicles',
    icon: 'car',
    hasSerialNumber: true,
    tracksExpiry: true,
    requiresMaintenance: true,
  },
  security_device: {
    id: 'security_device',
    name: 'Security Devices',
    icon: 'camera',
    hasSerialNumber: true,
    tracksExpiry: false,
    requiresMaintenance: true,
  },
  communication: {
    id: 'communication',
    name: 'Communication',
    icon: 'phone',
    hasSerialNumber: true,
    tracksExpiry: true,
    requiresMaintenance: true,
  },
  access_control: {
    id: 'access_control',
    name: 'Access Control',
    icon: 'key',
    hasSerialNumber: true,
    tracksExpiry: false,
    requiresMaintenance: true,
  },
  other: {
    id: 'other',
    name: 'Other',
    icon: 'box',
    hasSerialNumber: false,
    tracksExpiry: false,
    requiresMaintenance: false,
  },
};

/**
 * Asset status values
 */
export const ASSET_STATUS = {
  available: { value: 'available', label: 'Available', color: 'green' },
  assigned: { value: 'assigned', label: 'Assigned', color: 'blue' },
  maintenance: { value: 'maintenance', label: 'Maintenance', color: 'yellow' },
  damaged: { value: 'damaged', label: 'Damaged', color: 'red' },
  retired: { value: 'retired', label: 'Retired', color: 'gray' },
};

/**
 * Asset condition levels
 */
export const ASSET_CONDITION = {
  excellent: { value: 'excellent', label: 'Excellent', color: 'green' },
  good: { value: 'good', label: 'Good', color: 'blue' },
  fair: { value: 'fair', label: 'Fair', color: 'yellow' },
  poor: { value: 'poor', label: 'Poor', color: 'orange' },
  unusable: { value: 'unusable', label: 'Unusable', color: 'red' },
};

/**
 * Maintenance types
 */
export const MAINTENANCE_TYPES = {
  routine: { id: 'routine', name: 'Routine Maintenance', interval: 30 },
  inspection: { id: 'inspection', name: 'Inspection', interval: 90 },
  repair: { id: 'repair', name: 'Repair', interval: null },
  replacement: { id: 'replacement', name: 'Part Replacement', interval: null },
  calibration: { id: 'calibration', name: 'Calibration', interval: 180 },
};

/**
 * Validate asset serial number format
 * @param {string} serialNumber - Serial number to validate
 * @param {string} category - Asset category
 * @returns {Object} { valid: boolean, error: string }
 */
export const validateSerialNumber = (serialNumber, category) => {
  if (!serialNumber) {
    return { valid: false, error: 'Serial number is required' };
  }

  if (serialNumber.length < 3) {
    return { valid: false, error: 'Serial number must be at least 3 characters' };
  }

  if (serialNumber.length > 50) {
    return { valid: false, error: 'Serial number must not exceed 50 characters' };
  }

  // Check for valid characters (alphanumeric, hyphens, underscores)
  if (!/^[a-zA-Z0-9\-_]+$/.test(serialNumber)) {
    return { valid: false, error: 'Serial number can only contain alphanumeric characters, hyphens, and underscores' };
  }

  return { valid: true, error: null };
};

/**
 * Calculate asset depreciation
 * @param {number} purchaseCost - Original purchase cost
 * @param {string} purchaseDate - Purchase date (ISO string)
 * @param {number} depreciationRate - Annual depreciation rate (0-1)
 * @returns {number} Current estimated value
 */
export const calculateAssetValue = (purchaseCost, purchaseDate, depreciationRate = 0.2) => {
  if (!purchaseCost || !purchaseDate) return 0;

  const purchase = new Date(purchaseDate);
  const now = new Date();
  const yearsOld = (now - purchase) / (365.25 * 24 * 60 * 60 * 1000);

  const currentValue = purchaseCost * Math.pow(1 - depreciationRate, yearsOld);
  return Math.max(currentValue, 0); // Minimum value of 0
};

/**
 * Check if asset maintenance is overdue
 * @param {Date} lastMaintenanceDate - Last maintenance date
 * @param {number} maintenanceIntervalDays - Maintenance interval in days
 * @returns {Object} { isDue: boolean, daysOverdue: number, daysUntilDue: number }
 */
export const getMaintenanceStatus = (lastMaintenanceDate, maintenanceIntervalDays = 30) => {
  if (!lastMaintenanceDate) {
    return { isDue: true, daysOverdue: Infinity, daysUntilDue: 0 };
  }

  const last = new Date(lastMaintenanceDate);
  const dueDate = new Date(last.getTime() + maintenanceIntervalDays * 24 * 60 * 60 * 1000);
  const now = new Date();

  const daysUntilDue = Math.ceil((dueDate - now) / (24 * 60 * 60 * 1000));
  const isDue = daysUntilDue <= 0;
  const daysOverdue = isDue ? Math.abs(daysUntilDue) : 0;

  return { isDue, daysOverdue, daysUntilDue };
};

/**
 * Link asset to guard
 * @param {Object} asset - Asset object
 * @param {string} guardId - Guard ID to link
 * @param {string} assignmentType - Type of assignment (personal, temporary, etc.)
 * @returns {Object} Updated asset object
 */
export const linkAssetToGuard = (asset, guardId, assignmentType = 'personal') => {
  return {
    ...asset,
    assignedTo: guardId,
    assignmentType: assignmentType,
    assignedDate: new Date().toISOString(),
    status: 'assigned',
  };
};

/**
 * Link asset to site
 * @param {Object} asset - Asset object
 * @param {string} siteId - Site ID to link
 * @param {string} storageLocation - Storage/deployment location
 * @returns {Object} Updated asset object
 */
export const linkAssetToSite = (asset, siteId, storageLocation) => {
  return {
    ...asset,
    locationSiteId: siteId,
    storageLocation: storageLocation,
    status: 'available',
  };
};

/**
 * Unlink asset from guard
 * @param {Object} asset - Asset object
 * @returns {Object} Updated asset object
 */
export const unlinkAssetFromGuard = (asset) => {
  return {
    ...asset,
    assignedTo: '',
    assignmentType: '',
    assignedDate: '',
    status: 'available',
  };
};

/**
 * Record maintenance activity
 * @param {Object} asset - Asset object
 * @param {Object} maintenance - Maintenance details
 * @returns {Object} Updated asset object
 */
export const recordMaintenance = (asset, maintenance) => {
  const maintenanceHistory = asset.maintenanceHistory || [];
  
  return {
    ...asset,
    lastMaintenanceDate: maintenance.date || new Date().toISOString(),
    maintenanceNotes: maintenance.notes || '',
    condition: maintenance.condition || asset.condition,
    status: maintenance.status === 'needs-repair' ? 'maintenance' : 'available',
    maintenanceHistory: [
      {
        date: maintenance.date || new Date().toISOString(),
        type: maintenance.type,
        notes: maintenance.notes,
        technician: maintenance.technician,
        cost: maintenance.cost || 0,
      },
      ...maintenanceHistory,
    ].slice(0, 50), // Keep last 50 maintenance records
  };
};

/**
 * Generate asset QR code data
 * @param {Object} asset - Asset object
 * @returns {string} QR code data string
 */
export const generateAssetQRData = (asset) => {
  return JSON.stringify({
    id: asset.$id,
    name: asset.assetName,
    serialNumber: asset.serialNumber,
    category: asset.category,
    url: `/portal/assets/${asset.$id}`,
  });
};

/**
 * Generate asset barcode data
 * @param {Object} asset - Asset object
 * @returns {string} Barcode data string
 */
export const generateAssetBarcodeData = (asset) => {
  // Simplified barcode (just use asset ID)
  return asset.$id || '';
};

/**
 * Calculate asset inventory value
 * @param {Array} assets - Array of assets
 * @returns {Object} { totalValue: number, byCategory: Object }
 */
export const calculateInventoryValue = (assets) => {
  let totalValue = 0;
  const byCategory = {};

  assets.forEach(asset => {
    const categoryValue = calculateAssetValue(
      asset.purchaseCost || 0,
      asset.purchaseDate,
      0.2
    );
    totalValue += categoryValue;

    const category = asset.category || 'other';
    byCategory[category] = (byCategory[category] || 0) + categoryValue;
  });

  return { totalValue, byCategory };
};

/**
 * Generate asset report
 * @param {Array} assets - Array of assets
 * @returns {Object} Asset report data
 */
export const generateAssetReport = (assets) => {
  const totalAssets = assets.length;
  const byStatus = {};
  const byCondition = {};
  const byCategory = {};
  const maintenanceDue = [];
  const inventoryValue = calculateInventoryValue(assets);

  assets.forEach(asset => {
    // Group by status
    byStatus[asset.status] = (byStatus[asset.status] || 0) + 1;

    // Group by condition
    byCondition[asset.condition] = (byCondition[asset.condition] || 0) + 1;

    // Group by category
    byCategory[asset.category] = (byCategory[asset.category] || 0) + 1;

    // Check maintenance
    if (asset.category in ASSET_CATEGORIES && ASSET_CATEGORIES[asset.category].requiresMaintenance) {
      const maintenance = getMaintenanceStatus(asset.lastMaintenanceDate, 30);
      if (maintenance.isDue) {
        maintenanceDue.push({
          assetId: asset.$id,
          assetName: asset.assetName,
          daysOverdue: maintenance.daysOverdue,
        });
      }
    }
  });

  return {
    totalAssets,
    byStatus,
    byCondition,
    byCategory,
    maintenanceDue,
    inventoryValue,
    reportDate: new Date().toISOString(),
  };
};
