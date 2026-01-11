import React, { useState, useEffect } from 'react';
import { databases, config } from '../../lib/appwrite';
import { Query, ID } from 'appwrite';
import {
  AiOutlineInbox,
  AiOutlineTool,
  AiOutlineCheck,
  AiOutlineWarning,
  AiOutlinePlus,
  AiOutlineEdit,
  AiOutlineDelete,
  AiOutlineUser,
  AiOutlineEnvironment,
  AiOutlineCalendar,
  AiOutlineSearch,
  AiOutlineQrcode,
  AiOutlineBarcode,
  AiOutlineClose,
  AiOutlineEye,
  AiOutlineClockCircle,
} from 'react-icons/ai';

const Assets = () => {
  const [assets, setAssets] = useState([]);
  const [guards, setGuards] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [viewingAsset, setViewingAsset] = useState(null);
  const [view, setView] = useState('all'); // all, available, assigned, maintenance, retired
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLocation, setFilterLocation] = useState('');

  const [formData, setFormData] = useState({
    assetName: '',
    assetType: 'equipment',
    category: 'uniform',
    assetId: '',
    serialNumber: '',
    manufacturer: '',
    model: '',
    purchaseDate: '',
    purchaseCost: '',
    currentValue: '',
    status: 'available',
    condition: 'good',
    assignedTo: '',
    assignedDate: '',
    locationSiteId: '',
    storageLocation: '',
    warrantyExpiry: '',
    lastMaintenanceDate: '',
    nextMaintenanceDate: '',
    maintenanceNotes: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      let guardsData = [];
      try {
        const [guardsRes, sitesRes] = await Promise.all([
          databases.listDocuments(config.databaseId, config.guardsCollectionId, [Query.limit(500)]),
          databases.listDocuments(config.databaseId, config.sitesCollectionId, [Query.limit(500)]),
        ]);

        guardsData = guardsRes.documents;
        setSites(sitesRes.documents);
      } catch (error) {
        console.error('Guards/sites collection not yet available:', error);
        guardsData = [];
        setSites([]);
      }

      setGuards(guardsData);

      // Try to fetch from Appwrite, fallback to local state
      try {
        const assetsRes = await databases.listDocuments(config.databaseId, config.assetsCollectionId, [Query.limit(500)]);
        setAssets(assetsRes.documents);
      } catch (error) {
        console.log('Assets collection not yet available, using local state');
        setAssets([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load assets data');
    } finally {
      setLoading(false);
    }
  };

  const getGuardName = (guardId) => {
    const guard = guards.find(g => g.$id === guardId);
    return guard ? `${guard.firstName} ${guard.lastName}` : 'Unassigned';
  };

  const getSiteName = (siteId) => {
    const site = sites.find(s => s.$id === siteId);
    return site ? site.siteName : 'N/A';
  };

  const generateAssetId = () => {
    const prefix = 'AST';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  };

  const handleOpenModal = (asset = null) => {
    if (asset) {
      setEditingAsset(asset);
      setFormData({
        assetName: asset.assetName || '',
        assetType: asset.assetType || 'equipment',
        category: asset.category || 'uniform',
        assetId: asset.assetId || '',
        serialNumber: asset.serialNumber || '',
        manufacturer: asset.manufacturer || '',
        model: asset.model || '',
        purchaseDate: asset.purchaseDate || '',
        purchaseCost: asset.purchaseCost || '',
        currentValue: asset.currentValue || '',
        status: asset.status || 'available',
        condition: asset.condition || 'good',
        assignedTo: asset.assignedTo || '',
        assignedDate: asset.assignedDate || '',
        locationSiteId: asset.locationSiteId || '',
        storageLocation: asset.storageLocation || '',
        warrantyExpiry: asset.warrantyExpiry || '',
        lastMaintenanceDate: asset.lastMaintenanceDate || '',
        nextMaintenanceDate: asset.nextMaintenanceDate || '',
        maintenanceNotes: asset.maintenanceNotes || '',
        notes: asset.notes || '',
      });
    } else {
      setEditingAsset(null);
      setFormData({
        assetName: '',
        assetType: 'equipment',
        category: 'uniform',
        assetId: generateAssetId(),
        serialNumber: '',
        manufacturer: '',
        model: '',
        purchaseDate: '',
        purchaseCost: '',
        currentValue: '',
        status: 'available',
        condition: 'good',
        assignedTo: '',
        assignedDate: '',
        locationSiteId: '',
        storageLocation: '',
        warrantyExpiry: '',
        lastMaintenanceDate: '',
        nextMaintenanceDate: '',
        maintenanceNotes: '',
        notes: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAsset(null);
  };

  const handleViewAsset = (asset) => {
    setViewingAsset(asset);
    setShowDetailModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const assetData = {
        ...formData,
        createdAt: editingAsset?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editingAsset) {
        // Update existing asset
        try {
          await databases.updateDocument(
            config.databaseId,
            config.assetsCollectionId,
            editingAsset.$id,
            assetData
          );
          await fetchData();
        } catch (error) {
          const updatedAssets = assets.map(a => 
            a.$id === editingAsset.$id ? { ...a, ...assetData } : a
          );
          setAssets(updatedAssets);
        }
      } else {
        // Create new asset
        try {
          await databases.createDocument(
            config.databaseId,
            config.assetsCollectionId,
            ID.unique(),
            assetData
          );
          await fetchData();
        } catch (error) {
          const newAsset = {
            $id: ID.unique(),
            ...assetData,
          };
          setAssets([newAsset, ...assets]);
        }
      }

      handleCloseModal();
      alert(editingAsset ? 'Asset updated successfully!' : 'Asset added successfully!');
    } catch (error) {
      console.error('Error saving asset:', error);
      alert('Failed to save asset');
    }
  };

  const handleDeleteAsset = async (assetId) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;

    try {
      try {
        await databases.deleteDocument(config.databaseId, config.assetsCollectionId, assetId);
        await fetchData();
      } catch (error) {
        setAssets(assets.filter(a => a.$id !== assetId));
      }
      
      alert('Asset deleted successfully!');
    } catch (error) {
      console.error('Error deleting asset:', error);
      alert('Failed to delete asset');
    }
  };

  const handleUpdateStatus = async (assetId, newStatus) => {
    try {
      const updateData = { 
        status: newStatus, 
        updatedAt: new Date().toISOString() 
      };

      if (newStatus === 'available') {
        updateData.assignedTo = '';
        updateData.assignedDate = '';
      }

      try {
        await databases.updateDocument(
          config.databaseId,
          config.assetsCollectionId,
          assetId,
          updateData
        );
        await fetchData();
      } catch (error) {
        const updatedAssets = assets.map(a => 
          a.$id === assetId ? { ...a, ...updateData } : a
        );
        setAssets(updatedAssets);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update asset status');
    }
  };

  const filterAssets = () => {
    let filtered = [...assets];

    // View filter
    if (view === 'available') {
      filtered = filtered.filter(a => a.status === 'available');
    } else if (view === 'assigned') {
      filtered = filtered.filter(a => a.status === 'assigned');
    } else if (view === 'maintenance') {
      filtered = filtered.filter(a => a.status === 'maintenance');
    } else if (view === 'retired') {
      filtered = filtered.filter(a => a.status === 'retired');
    }

    // Category filter
    if (filterCategory) {
      filtered = filtered.filter(a => a.category === filterCategory);
    }

    // Location filter
    if (filterLocation) {
      filtered = filtered.filter(a => a.locationSiteId === filterLocation);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(a => 
        a.assetName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.assetId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getGuardName(a.assignedTo).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by status and name
    filtered.sort((a, b) => {
      const statusOrder = { 'assigned': 0, 'available': 1, 'maintenance': 2, 'retired': 3 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return (a.assetName || '').localeCompare(b.assetName || '');
    });

    return filtered;
  };

  const calculateStats = () => {
    const total = assets.length;
    const available = assets.filter(a => a.status === 'available').length;
    const assigned = assets.filter(a => a.status === 'assigned').length;
    const maintenance = assets.filter(a => a.status === 'maintenance').length;
    const retired = assets.filter(a => a.status === 'retired').length;

    const totalValue = assets.reduce((sum, a) => sum + (parseFloat(a.currentValue) || 0), 0);

    return { total, available, assigned, maintenance, retired, totalValue: totalValue.toFixed(2) };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'assigned': return 'bg-blue-500';
      case 'maintenance': return 'bg-yellow-500';
      case 'retired': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getConditionColor = (condition) => {
    switch (condition) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-blue-400';
      case 'fair': return 'text-yellow-400';
      case 'poor': return 'text-orange-400';
      case 'damaged': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      'uniform': 'Uniform',
      'radio': 'Radio',
      'bodycam': 'Body Camera',
      'vehicle': 'Vehicle',
      'weapon': 'Weapon',
      'first-aid': 'First Aid',
      'it-equipment': 'IT Equipment',
      'tools': 'Tools',
      'keys': 'Keys & Access',
      'other': 'Other',
    };
    return labels[category] || category;
  };

  const isMaintenanceDue = (asset) => {
    if (!asset.nextMaintenanceDate) return false;
    const dueDate = new Date(asset.nextMaintenanceDate);
    const today = new Date();
    const daysUntil = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
    return daysUntil <= 7 && daysUntil >= 0;
  };

  const isWarrantyExpiring = (asset) => {
    if (!asset.warrantyExpiry) return false;
    const expiryDate = new Date(asset.warrantyExpiry);
    const today = new Date();
    const daysUntil = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));
    return daysUntil <= 30 && daysUntil >= 0;
  };

  const stats = calculateStats();
  const filteredAssets = filterAssets();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AiOutlineClockCircle className="mx-auto mb-4 h-12 w-12 animate-spin text-accent" />
          <p className="text-white/70">Loading assets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Asset Management</h1>
          <p className="mt-2 text-white/70">Track and manage security equipment and assets</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-white hover:bg-accent/90 transition-all"
        >
          <AiOutlinePlus className="h-5 w-5" />
          Add Asset
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-6">
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Total Assets</p>
              <p className="mt-2 text-3xl font-bold text-white">{stats.total}</p>
            </div>
            <AiOutlineInbox className="h-8 w-8 text-accent" />
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Available</p>
              <p className="mt-2 text-3xl font-bold text-green-400">{stats.available}</p>
            </div>
            <AiOutlineCheck className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Assigned</p>
              <p className="mt-2 text-3xl font-bold text-blue-400">{stats.assigned}</p>
            </div>
            <AiOutlineUser className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Maintenance</p>
              <p className="mt-2 text-3xl font-bold text-yellow-400">{stats.maintenance}</p>
            </div>
            <AiOutlineTool className="h-8 w-8 text-yellow-400" />
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Retired</p>
              <p className="mt-2 text-3xl font-bold text-gray-400">{stats.retired}</p>
            </div>
            <AiOutlineWarning className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Total Value</p>
              <p className="mt-2 text-2xl font-bold text-white">£{stats.totalValue}</p>
            </div>
            <AiOutlineInbox className="h-8 w-8 text-accent" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {/* Search */}
          <div className="relative">
            <AiOutlineSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* View Filter */}
          <select
            value={view}
            onChange={(e) => setView(e.target.value)}
            className="rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
          >
            <option value="all">All Assets</option>
            <option value="available">Available</option>
            <option value="assigned">Assigned</option>
            <option value="maintenance">Maintenance</option>
            <option value="retired">Retired</option>
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
          >
            <option value="">All Categories</option>
            <option value="uniform">Uniform</option>
            <option value="radio">Radio</option>
            <option value="bodycam">Body Camera</option>
            <option value="vehicle">Vehicle</option>
            <option value="weapon">Weapon</option>
            <option value="first-aid">First Aid</option>
            <option value="it-equipment">IT Equipment</option>
            <option value="tools">Tools</option>
            <option value="keys">Keys & Access</option>
            <option value="other">Other</option>
          </select>

          {/* Location Filter */}
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
          >
            <option value="">All Locations</option>
            {sites.map(site => (
              <option key={site.$id} value={site.$id}>
                {site.siteName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredAssets.length === 0 ? (
          <div className="glass-panel p-12 text-center col-span-full">
            <AiOutlineInbox className="mx-auto mb-4 h-16 w-16 text-white/20" />
            <p className="text-lg text-white/50">No assets found</p>
            <p className="mt-2 text-sm text-white/30">Add your first asset to get started</p>
            <button
              onClick={() => handleOpenModal()}
              className="mt-6 inline-flex items-center gap-2 rounded-lg border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/20 transition-all"
            >
              <AiOutlinePlus className="h-4 w-4" />
              Add Asset
            </button>
          </div>
        ) : (
          filteredAssets.map((asset) => (
            <div key={asset.$id} className="glass-panel p-6 hover:border-accent/50 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`h-3 w-3 rounded-full ${getStatusColor(asset.status)}`} title={asset.status}></span>
                    <h3 className="text-lg font-semibold text-white">{asset.assetName}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <AiOutlineBarcode className="h-3 w-3" />
                    <span>{asset.assetId}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/50">Category</span>
                  <span className="text-white font-medium">{getCategoryLabel(asset.category)}</span>
                </div>

                {asset.manufacturer && (
                  <div className="flex justify-between">
                    <span className="text-white/50">Manufacturer</span>
                    <span className="text-white">{asset.manufacturer}</span>
                  </div>
                )}

                {asset.model && (
                  <div className="flex justify-between">
                    <span className="text-white/50">Model</span>
                    <span className="text-white">{asset.model}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-white/50">Condition</span>
                  <span className={`font-medium capitalize ${getConditionColor(asset.condition)}`}>
                    {asset.condition}
                  </span>
                </div>

                {asset.status === 'assigned' && asset.assignedTo && (
                  <div className="flex items-center gap-1 pt-2 border-t border-white/10">
                    <AiOutlineUser className="h-4 w-4 text-accent" />
                    <span className="text-white/70">{getGuardName(asset.assignedTo)}</span>
                  </div>
                )}

                {asset.locationSiteId && (
                  <div className="flex items-center gap-1 pt-2 border-t border-white/10">
                    <AiOutlineEnvironment className="h-4 w-4 text-accent" />
                    <span className="text-white/70">{getSiteName(asset.locationSiteId)}</span>
                  </div>
                )}

                {(isMaintenanceDue(asset) || isWarrantyExpiring(asset)) && (
                  <div className="pt-2 border-t border-white/10 space-y-1">
                    {isMaintenanceDue(asset) && (
                      <div className="flex items-center gap-1 text-xs text-yellow-400">
                        <AiOutlineWarning className="h-3 w-3" />
                        <span>Maintenance due soon</span>
                      </div>
                    )}
                    {isWarrantyExpiring(asset) && (
                      <div className="flex items-center gap-1 text-xs text-orange-400">
                        <AiOutlineWarning className="h-3 w-3" />
                        <span>Warranty expiring</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10">
                {/* Status Dropdown */}
                <select
                  value={asset.status}
                  onChange={(e) => handleUpdateStatus(asset.$id, e.target.value)}
                  className={`flex-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white ${getStatusColor(asset.status)} hover:opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-accent`}
                >
                  <option value="available">Available</option>
                  <option value="assigned">Assigned</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="retired">Retired</option>
                </select>

                {/* View Button */}
                <button
                  onClick={() => handleViewAsset(asset)}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 transition-all"
                >
                  <AiOutlineEye className="h-4 w-4" />
                </button>

                {/* Edit Button */}
                <button
                  onClick={() => handleOpenModal(asset)}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 transition-all"
                >
                  <AiOutlineEdit className="h-4 w-4" />
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => handleDeleteAsset(asset.$id)}
                  className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20 transition-all"
                >
                  <AiOutlineDelete className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Asset Detail Modal */}
      {showDetailModal && viewingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 border-b border-white/10 bg-night-sky p-6 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`h-4 w-4 rounded-full ${getStatusColor(viewingAsset.status)}`}></span>
                    <span className={`text-sm font-medium capitalize ${getConditionColor(viewingAsset.condition)}`}>
                      {viewingAsset.condition}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-white">{viewingAsset.assetName}</h2>
                  <p className="mt-1 text-sm text-white/50">{viewingAsset.assetId}</p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 transition-all"
                >
                  <AiOutlineClose className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Asset Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-white/50">Category</p>
                    <p className="text-white">{getCategoryLabel(viewingAsset.category)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-white/50">Status</p>
                    <p className="text-white capitalize">{viewingAsset.status}</p>
                  </div>
                  {viewingAsset.manufacturer && (
                    <div>
                      <p className="text-sm text-white/50">Manufacturer</p>
                      <p className="text-white">{viewingAsset.manufacturer}</p>
                    </div>
                  )}
                  {viewingAsset.model && (
                    <div>
                      <p className="text-sm text-white/50">Model</p>
                      <p className="text-white">{viewingAsset.model}</p>
                    </div>
                  )}
                  {viewingAsset.serialNumber && (
                    <div>
                      <p className="text-sm text-white/50">Serial Number</p>
                      <p className="text-white">{viewingAsset.serialNumber}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Info */}
              {(viewingAsset.purchaseDate || viewingAsset.purchaseCost || viewingAsset.currentValue) && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Financial Information</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {viewingAsset.purchaseDate && (
                      <div>
                        <p className="text-sm text-white/50">Purchase Date</p>
                        <p className="text-white">{new Date(viewingAsset.purchaseDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    {viewingAsset.purchaseCost && (
                      <div>
                        <p className="text-sm text-white/50">Purchase Cost</p>
                        <p className="text-white">£{viewingAsset.purchaseCost}</p>
                      </div>
                    )}
                    {viewingAsset.currentValue && (
                      <div>
                        <p className="text-sm text-white/50">Current Value</p>
                        <p className="text-white">£{viewingAsset.currentValue}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Assignment Info */}
              {viewingAsset.status === 'assigned' && viewingAsset.assignedTo && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Assignment</h3>
                  <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-white/50">Assigned To</p>
                        <p className="text-white">{getGuardName(viewingAsset.assignedTo)}</p>
                      </div>
                      {viewingAsset.assignedDate && (
                        <div>
                          <p className="text-sm text-white/50">Assigned Date</p>
                          <p className="text-white">{new Date(viewingAsset.assignedDate).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Location Info */}
              {(viewingAsset.locationSiteId || viewingAsset.storageLocation) && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Location</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {viewingAsset.locationSiteId && (
                      <div>
                        <p className="text-sm text-white/50">Site</p>
                        <p className="text-white">{getSiteName(viewingAsset.locationSiteId)}</p>
                      </div>
                    )}
                    {viewingAsset.storageLocation && (
                      <div>
                        <p className="text-sm text-white/50">Storage Location</p>
                        <p className="text-white">{viewingAsset.storageLocation}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Warranty */}
              {viewingAsset.warrantyExpiry && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Warranty</h3>
                  <div className={`rounded-lg border p-4 ${isWarrantyExpiring(viewingAsset) ? 'bg-orange-500/10 border-orange-500/20' : 'bg-white/5 border-white/10'}`}>
                    <p className="text-sm text-white/50">Expiry Date</p>
                    <p className="text-white">{new Date(viewingAsset.warrantyExpiry).toLocaleDateString()}</p>
                    {isWarrantyExpiring(viewingAsset) && (
                      <p className="mt-2 text-sm text-orange-400">Warranty expiring soon</p>
                    )}
                  </div>
                </div>
              )}

              {/* Maintenance */}
              {(viewingAsset.lastMaintenanceDate || viewingAsset.nextMaintenanceDate || viewingAsset.maintenanceNotes) && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Maintenance</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      {viewingAsset.lastMaintenanceDate && (
                        <div>
                          <p className="text-sm text-white/50">Last Maintenance</p>
                          <p className="text-white">{new Date(viewingAsset.lastMaintenanceDate).toLocaleDateString()}</p>
                        </div>
                      )}
                      {viewingAsset.nextMaintenanceDate && (
                        <div>
                          <p className="text-sm text-white/50">Next Maintenance</p>
                          <p className={isMaintenanceDue(viewingAsset) ? 'text-yellow-400 font-medium' : 'text-white'}>
                            {new Date(viewingAsset.nextMaintenanceDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                    {viewingAsset.maintenanceNotes && (
                      <div>
                        <p className="text-sm text-white/50 mb-1">Notes</p>
                        <p className="text-white/70">{viewingAsset.maintenanceNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {viewingAsset.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Additional Notes</h3>
                  <p className="text-white/70 whitespace-pre-wrap">{viewingAsset.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Asset Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 border-b border-white/10 bg-night-sky p-6 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  {editingAsset ? 'Edit Asset' : 'Add New Asset'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 transition-all"
                >
                  <AiOutlineClose className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Asset Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Asset Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.assetName}
                  onChange={(e) => setFormData({ ...formData, assetName: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="e.g., Radio Motorola XPR7550"
                  required
                />
              </div>

              {/* Category, Status, Condition */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Category <span className="text-red-400">*</span></label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
                    required
                  >
                    <option value="uniform">Uniform</option>
                    <option value="radio">Radio</option>
                    <option value="bodycam">Body Camera</option>
                    <option value="vehicle">Vehicle</option>
                    <option value="weapon">Weapon</option>
                    <option value="first-aid">First Aid</option>
                    <option value="it-equipment">IT Equipment</option>
                    <option value="tools">Tools</option>
                    <option value="keys">Keys & Access</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
                  >
                    <option value="available">Available</option>
                    <option value="assigned">Assigned</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="retired">Retired</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Condition</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
                  >
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                    <option value="damaged">Damaged</option>
                  </select>
                </div>
              </div>

              {/* Asset ID, Serial Number */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Asset ID</label>
                  <input
                    type="text"
                    value={formData.assetId}
                    onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder="Auto-generated"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Serial Number</label>
                  <input
                    type="text"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder="Manufacturer serial number"
                  />
                </div>
              </div>

              {/* Manufacturer, Model */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Manufacturer</label>
                  <input
                    type="text"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder="e.g., Motorola"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Model</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder="e.g., XPR7550"
                  />
                </div>
              </div>

              {/* Purchase Date, Cost, Value */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Purchase Date</label>
                  <input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Purchase Cost (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchaseCost}
                    onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Current Value (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.currentValue}
                    onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Assignment */}
              {formData.status === 'assigned' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">Assigned To</label>
                    <select
                      value={formData.assignedTo}
                      onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
                    >
                      <option value="">Select Guard</option>
                      {guards.map(guard => (
                        <option key={guard.$id} value={guard.$id}>
                          {guard.firstName} {guard.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">Assigned Date</label>
                    <input
                      type="date"
                      value={formData.assignedDate}
                      onChange={(e) => setFormData({ ...formData, assignedDate: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                </div>
              )}

              {/* Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Location Site</label>
                  <select
                    value={formData.locationSiteId}
                    onChange={(e) => setFormData({ ...formData, locationSiteId: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
                  >
                    <option value="">Select Site</option>
                    {sites.map(site => (
                      <option key={site.$id} value={site.$id}>
                        {site.siteName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Storage Location</label>
                  <input
                    type="text"
                    value={formData.storageLocation}
                    onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder="e.g., Storage Room A, Shelf 3"
                  />
                </div>
              </div>

              {/* Warranty */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white">Warranty Expiry Date</label>
                <input
                  type="date"
                  value={formData.warrantyExpiry}
                  onChange={(e) => setFormData({ ...formData, warrantyExpiry: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* Maintenance */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Maintenance Schedule</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">Last Maintenance</label>
                    <input
                      type="date"
                      value={formData.lastMaintenanceDate}
                      onChange={(e) => setFormData({ ...formData, lastMaintenanceDate: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">Next Maintenance</label>
                    <input
                      type="date"
                      value={formData.nextMaintenanceDate}
                      onChange={(e) => setFormData({ ...formData, nextMaintenanceDate: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Maintenance Notes</label>
                  <textarea
                    value={formData.maintenanceNotes}
                    onChange={(e) => setFormData({ ...formData, maintenanceNotes: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder="Maintenance history and notes"
                    rows="3"
                  />
                </div>
              </div>

              {/* General Notes */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white">Additional Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="Any additional information about this asset"
                  rows="3"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 font-medium text-white hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-accent px-4 py-2 font-semibold text-white hover:bg-accent/90 transition-all"
                >
                  {editingAsset ? 'Update Asset' : 'Add Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assets;
