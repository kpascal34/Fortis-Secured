import React, { useState, useEffect } from 'react';
import { databases, config } from '../../lib/appwrite';
import { Query, ID } from 'appwrite';
import {
  AiOutlineWarning,
  AiOutlineAlert,
  AiOutlineCheckCircle,
  AiOutlineClockCircle,
  AiOutlinePlus,
  AiOutlineEdit,
  AiOutlineDelete,
  AiOutlineUser,
  AiOutlineEnvironment,
  AiOutlineCalendar,
  AiOutlineSearch,
  AiOutlineEye,
  AiOutlineClose,
  AiOutlineFile,
  AiOutlineExclamationCircle,
} from 'react-icons/ai';

const Incidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [guards, setGuards] = useState([]);
  const [clients, setClients] = useState([]);
  const [sites, setSites] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingIncident, setEditingIncident] = useState(null);
  const [viewingIncident, setViewingIncident] = useState(null);
  const [view, setView] = useState('all'); // all, open, investigating, resolved, critical
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterType, setFilterType] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    incidentType: 'security-breach',
    severity: 'medium',
    status: 'open',
    reportedBy: '',
    clientId: '',
    siteId: '',
    shiftId: '',
    incidentDate: '',
    incidentTime: '',
    location: '',
    witnessName: '',
    witnessContact: '',
    actionTaken: '',
    policeNotified: false,
    policeReferenceNumber: '',
    injuries: false,
    injuryDetails: '',
    propertyDamage: false,
    damageDetails: '',
    followUpRequired: false,
    followUpNotes: '',
    resolution: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      let guardsData = [];
      try {
        const [guardsRes, clientsRes, sitesRes, shiftsRes] = await Promise.all([
          databases.listDocuments(config.databaseId, config.guardsCollectionId, [Query.limit(500)]),
          databases.listDocuments(config.databaseId, config.clientsCollectionId, [Query.limit(500)]),
          databases.listDocuments(config.databaseId, config.sitesCollectionId, [Query.limit(500)]),
          databases.listDocuments(config.databaseId, config.shiftsCollectionId, [Query.limit(500)]),
        ]);

        guardsData = guardsRes.documents;
        setClients(clientsRes.documents);
        setSites(sitesRes.documents);
        setShifts(shiftsRes.documents);
      } catch (error) {
        console.log('Unable to load guard data. Connect Appwrite to enable live incidents.', error);
        guardsData = [];
        setClients([]);
        setSites([]);
        setShifts([]);
      }

      setGuards(guardsData);

      // Check if incidents collection exists and fetch
      try {
        const incidentsRes = await databases.listDocuments(config.databaseId, config.incidentsCollectionId, [Query.limit(500)]);
        setIncidents(incidentsRes.documents);
      } catch (error) {
        console.log('Incidents collection not yet available. No demo data loaded.');
        setIncidents([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load incidents data');
    } finally {
      setLoading(false);
    }
  };

  const getGuardName = (guardId) => {
    const guard = guards.find(g => g.$id === guardId);
    return guard ? `${guard.firstName} ${guard.lastName}` : 'Unknown';
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.$id === clientId);
    return client ? client.companyName : 'N/A';
  };

  const getSiteName = (siteId) => {
    const site = sites.find(s => s.$id === siteId);
    return site ? site.siteName : 'N/A';
  };

  const handleOpenModal = (incident = null) => {
    if (incident) {
      setEditingIncident(incident);
      setFormData({
        title: incident.title || '',
        description: incident.description || '',
        incidentType: incident.incidentType || 'security-breach',
        severity: incident.severity || 'medium',
        status: incident.status || 'open',
        reportedBy: incident.reportedBy || '',
        clientId: incident.clientId || '',
        siteId: incident.siteId || '',
        shiftId: incident.shiftId || '',
        incidentDate: incident.incidentDate || '',
        incidentTime: incident.incidentTime || '',
        location: incident.location || '',
        witnessName: incident.witnessName || '',
        witnessContact: incident.witnessContact || '',
        actionTaken: incident.actionTaken || '',
        policeNotified: incident.policeNotified || false,
        policeReferenceNumber: incident.policeReferenceNumber || '',
        injuries: incident.injuries || false,
        injuryDetails: incident.injuryDetails || '',
        propertyDamage: incident.propertyDamage || false,
        damageDetails: incident.damageDetails || '',
        followUpRequired: incident.followUpRequired || false,
        followUpNotes: incident.followUpNotes || '',
        resolution: incident.resolution || '',
      });
    } else {
      setEditingIncident(null);
      const now = new Date();
      setFormData({
        title: '',
        description: '',
        incidentType: 'security-breach',
        severity: 'medium',
        status: 'open',
        reportedBy: '',
        clientId: '',
        siteId: '',
        shiftId: '',
        incidentDate: now.toISOString().split('T')[0],
        incidentTime: now.toTimeString().slice(0, 5),
        location: '',
        witnessName: '',
        witnessContact: '',
        actionTaken: '',
        policeNotified: false,
        policeReferenceNumber: '',
        injuries: false,
        injuryDetails: '',
        propertyDamage: false,
        damageDetails: '',
        followUpRequired: false,
        followUpNotes: '',
        resolution: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingIncident(null);
  };

  const handleViewIncident = (incident) => {
    setViewingIncident(incident);
    setShowDetailModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const incidentData = {
        ...formData,
        createdAt: editingIncident?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editingIncident) {
        // Update existing incident
        try {
          await databases.updateDocument(
            config.databaseId,
            config.incidentsCollectionId,
            editingIncident.$id,
            incidentData
          );
          await fetchData();
        } catch (error) {
          // Fallback to local state
          const updatedIncidents = incidents.map(i => 
            i.$id === editingIncident.$id ? { ...i, ...incidentData } : i
          );
          setIncidents(updatedIncidents);
        }
      } else {
        // Create new incident
        try {
          await databases.createDocument(
            config.databaseId,
            config.incidentsCollectionId,
            ID.unique(),
            incidentData
          );
          await fetchData();
        } catch (error) {
          // Fallback to local state
          const newIncident = {
            $id: ID.unique(),
            ...incidentData,
          };
          setIncidents([newIncident, ...incidents]);
        }
      }

      handleCloseModal();
      alert(editingIncident ? 'Incident updated successfully!' : 'Incident reported successfully!');
    } catch (error) {
      console.error('Error saving incident:', error);
      alert('Failed to save incident');
    }
  };

  const handleDeleteIncident = async (incidentId) => {
    if (!confirm('Are you sure you want to delete this incident report?')) return;

    try {
      try {
        await databases.deleteDocument(config.databaseId, config.incidentsCollectionId, incidentId);
        await fetchData();
      } catch (error) {
        setIncidents(incidents.filter(i => i.$id !== incidentId));
      }
      
      alert('Incident deleted successfully!');
    } catch (error) {
      console.error('Error deleting incident:', error);
      alert('Failed to delete incident');
    }
  };

  const handleUpdateStatus = async (incidentId, newStatus) => {
    try {
      const updateData = { 
        status: newStatus, 
        updatedAt: new Date().toISOString() 
      };

      try {
        await databases.updateDocument(
          config.databaseId,
          config.incidentsCollectionId,
          incidentId,
          updateData
        );
        await fetchData();
      } catch (error) {
        const updatedIncidents = incidents.map(i => 
          i.$id === incidentId ? { ...i, ...updateData } : i
        );
        setIncidents(updatedIncidents);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update incident status');
    }
  };

  const filterIncidents = () => {
    let filtered = [...incidents];

    // View filter
    if (view === 'open') {
      filtered = filtered.filter(i => i.status === 'open');
    } else if (view === 'investigating') {
      filtered = filtered.filter(i => i.status === 'investigating');
    } else if (view === 'resolved') {
      filtered = filtered.filter(i => i.status === 'resolved');
    } else if (view === 'critical') {
      filtered = filtered.filter(i => i.severity === 'critical');
    }

    // Severity filter
    if (filterSeverity) {
      filtered = filtered.filter(i => i.severity === filterSeverity);
    }

    // Type filter
    if (filterType) {
      filtered = filtered.filter(i => i.incidentType === filterType);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(i => 
        i.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getGuardName(i.reportedBy).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by date descending and severity
    filtered.sort((a, b) => {
      const severityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return new Date(b.incidentDate) - new Date(a.incidentDate);
    });

    return filtered;
  };

  const calculateStats = () => {
    const total = incidents.length;
    const open = incidents.filter(i => i.status === 'open').length;
    const investigating = incidents.filter(i => i.status === 'investigating').length;
    const resolved = incidents.filter(i => i.status === 'resolved').length;
    const critical = incidents.filter(i => i.severity === 'critical').length;

    return { total, open, investigating, resolved, critical };
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-red-500';
      case 'investigating': return 'bg-yellow-500';
      case 'resolved': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getIncidentTypeLabel = (type) => {
    const labels = {
      'security-breach': 'Security Breach',
      'theft': 'Theft',
      'vandalism': 'Vandalism',
      'trespassing': 'Trespassing',
      'assault': 'Assault',
      'fire': 'Fire',
      'medical-emergency': 'Medical Emergency',
      'suspicious-activity': 'Suspicious Activity',
      'equipment-failure': 'Equipment Failure',
      'policy-violation': 'Policy Violation',
      'other': 'Other',
    };
    return labels[type] || type;
  };

  const stats = calculateStats();
  const filteredIncidents = filterIncidents();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AiOutlineClockCircle className="mx-auto mb-4 h-12 w-12 animate-spin text-accent" />
          <p className="text-white/70">Loading incidents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Incident Reports</h1>
          <p className="mt-2 text-white/70">Report and track security incidents</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-white hover:bg-accent/90 transition-all"
        >
          <AiOutlinePlus className="h-5 w-5" />
          Report Incident
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Total Reports</p>
              <p className="mt-2 text-3xl font-bold text-white">{stats.total}</p>
            </div>
            <AiOutlineFile className="h-8 w-8 text-accent" />
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Open</p>
              <p className="mt-2 text-3xl font-bold text-red-400">{stats.open}</p>
            </div>
            <AiOutlineAlert className="h-8 w-8 text-red-400" />
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Investigating</p>
              <p className="mt-2 text-3xl font-bold text-yellow-400">{stats.investigating}</p>
            </div>
            <AiOutlineClockCircle className="h-8 w-8 text-yellow-400" />
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Resolved</p>
              <p className="mt-2 text-3xl font-bold text-green-400">{stats.resolved}</p>
            </div>
            <AiOutlineCheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Critical</p>
              <p className="mt-2 text-3xl font-bold text-red-600">{stats.critical}</p>
            </div>
            <AiOutlineExclamationCircle className="h-8 w-8 text-red-600" />
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
              placeholder="Search incidents..."
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
            <option value="all">All Incidents</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="critical">Critical Only</option>
          </select>

          {/* Severity Filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
          >
            <option value="">All Types</option>
            <option value="security-breach">Security Breach</option>
            <option value="theft">Theft</option>
            <option value="vandalism">Vandalism</option>
            <option value="trespassing">Trespassing</option>
            <option value="assault">Assault</option>
            <option value="fire">Fire</option>
            <option value="medical-emergency">Medical Emergency</option>
            <option value="suspicious-activity">Suspicious Activity</option>
            <option value="equipment-failure">Equipment Failure</option>
            <option value="policy-violation">Policy Violation</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Incidents List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredIncidents.length === 0 ? (
          <div className="glass-panel p-12 text-center">
            <AiOutlineFile className="mx-auto mb-4 h-16 w-16 text-white/20" />
            <p className="text-lg text-white/50">No incidents found</p>
            <p className="mt-2 text-sm text-white/30">Report your first incident to get started</p>
            <button
              onClick={() => handleOpenModal()}
              className="mt-6 inline-flex items-center gap-2 rounded-lg border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/20 transition-all"
            >
              <AiOutlinePlus className="h-4 w-4" />
              Report Incident
            </button>
          </div>
        ) : (
          filteredIncidents.map((incident) => (
            <div key={incident.$id} className="glass-panel p-6 hover:border-accent/50 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getSeverityColor(incident.severity)}`}>
                      {incident.severity?.toUpperCase()}
                    </span>
                    <span className={`h-3 w-3 rounded-full ${getStatusColor(incident.status)}`} title={incident.status}></span>
                    <h3 className="text-lg font-semibold text-white">{incident.title}</h3>
                  </div>
                  
                  <p className="mt-2 text-sm text-white/70 line-clamp-2">{incident.description}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/50">
                    <div className="flex items-center gap-1">
                      <AiOutlineCalendar className="h-4 w-4" />
                      {incident.incidentDate ? new Date(incident.incidentDate).toLocaleDateString() : 'N/A'}
                      {incident.incidentTime && ` at ${incident.incidentTime}`}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <AiOutlineUser className="h-4 w-4" />
                      {getGuardName(incident.reportedBy)}
                    </div>

                    {incident.clientId && (
                      <div className="flex items-center gap-1">
                        <AiOutlineEnvironment className="h-4 w-4" />
                        {getClientName(incident.clientId)}
                      </div>
                    )}

                    {incident.siteId && (
                      <div className="text-white/40">
                        / {getSiteName(incident.siteId)}
                      </div>
                    )}

                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs">
                      {getIncidentTypeLabel(incident.incidentType)}
                    </span>

                    {incident.policeNotified && (
                      <span className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                        <AiOutlineWarning className="h-3 w-3" />
                        Police Notified
                      </span>
                    )}

                    {incident.injuries && (
                      <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
                        <AiOutlineWarning className="h-3 w-3" />
                        Injuries
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status Dropdown */}
                  <select
                    value={incident.status}
                    onChange={(e) => handleUpdateStatus(incident.$id, e.target.value)}
                    className={`rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white ${getStatusColor(incident.status)} hover:opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-accent`}
                  >
                    <option value="open">Open</option>
                    <option value="investigating">Investigating</option>
                    <option value="resolved">Resolved</option>
                  </select>

                  {/* View Button */}
                  <button
                    onClick={() => handleViewIncident(incident)}
                    className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 transition-all"
                  >
                    <AiOutlineEye className="h-4 w-4" />
                  </button>

                  {/* Edit Button */}
                  <button
                    onClick={() => handleOpenModal(incident)}
                    className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 transition-all"
                  >
                    <AiOutlineEdit className="h-4 w-4" />
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteIncident(incident.$id)}
                    className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20 transition-all"
                  >
                    <AiOutlineDelete className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Incident Detail Modal */}
      {showDetailModal && viewingIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 border-b border-white/10 bg-night-sky p-6 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getSeverityColor(viewingIncident.severity)}`}>
                      {viewingIncident.severity?.toUpperCase()}
                    </span>
                    <span className={`h-3 w-3 rounded-full ${getStatusColor(viewingIncident.status)}`}></span>
                  </div>
                  <h2 className="text-2xl font-bold text-white">{viewingIncident.title}</h2>
                  <p className="mt-1 text-sm text-white/50">
                    {viewingIncident.incidentDate ? new Date(viewingIncident.incidentDate).toLocaleDateString() : 'N/A'}
                    {viewingIncident.incidentTime && ` at ${viewingIncident.incidentTime}`}
                  </p>
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
                <h3 className="text-lg font-semibold text-white mb-3">Incident Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-white/50">Type</p>
                    <p className="text-white">{getIncidentTypeLabel(viewingIncident.incidentType)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-white/50">Status</p>
                    <p className="text-white capitalize">{viewingIncident.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-white/50">Reported By</p>
                    <p className="text-white">{getGuardName(viewingIncident.reportedBy)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-white/50">Location</p>
                    <p className="text-white">{viewingIncident.location || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                <p className="text-white/70 whitespace-pre-wrap">{viewingIncident.description}</p>
              </div>

              {/* Client/Site */}
              {(viewingIncident.clientId || viewingIncident.siteId) && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Client & Site</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {viewingIncident.clientId && (
                      <div>
                        <p className="text-sm text-white/50">Client</p>
                        <p className="text-white">{getClientName(viewingIncident.clientId)}</p>
                      </div>
                    )}
                    {viewingIncident.siteId && (
                      <div>
                        <p className="text-sm text-white/50">Site</p>
                        <p className="text-white">{getSiteName(viewingIncident.siteId)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Witness Info */}
              {(viewingIncident.witnessName || viewingIncident.witnessContact) && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Witness Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {viewingIncident.witnessName && (
                      <div>
                        <p className="text-sm text-white/50">Name</p>
                        <p className="text-white">{viewingIncident.witnessName}</p>
                      </div>
                    )}
                    {viewingIncident.witnessContact && (
                      <div>
                        <p className="text-sm text-white/50">Contact</p>
                        <p className="text-white">{viewingIncident.witnessContact}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Taken */}
              {viewingIncident.actionTaken && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Action Taken</h3>
                  <p className="text-white/70 whitespace-pre-wrap">{viewingIncident.actionTaken}</p>
                </div>
              )}

              {/* Police Information */}
              {viewingIncident.policeNotified && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Police Information</h3>
                  <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
                    <p className="text-blue-400 font-medium mb-2">Police Notified</p>
                    {viewingIncident.policeReferenceNumber && (
                      <p className="text-white/70">Reference: {viewingIncident.policeReferenceNumber}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Injuries */}
              {viewingIncident.injuries && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Injuries Reported</h3>
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                    <p className="text-white/70 whitespace-pre-wrap">{viewingIncident.injuryDetails || 'Details not provided'}</p>
                  </div>
                </div>
              )}

              {/* Property Damage */}
              {viewingIncident.propertyDamage && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Property Damage</h3>
                  <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-4">
                    <p className="text-white/70 whitespace-pre-wrap">{viewingIncident.damageDetails || 'Details not provided'}</p>
                  </div>
                </div>
              )}

              {/* Follow Up */}
              {viewingIncident.followUpRequired && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Follow-Up Required</h3>
                  <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-4">
                    <p className="text-white/70 whitespace-pre-wrap">{viewingIncident.followUpNotes || 'No notes provided'}</p>
                  </div>
                </div>
              )}

              {/* Resolution */}
              {viewingIncident.resolution && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Resolution</h3>
                  <p className="text-white/70 whitespace-pre-wrap">{viewingIncident.resolution}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Incident Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 border-b border-white/10 bg-night-sky p-6 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  {editingIncident ? 'Edit Incident Report' : 'Report New Incident'}
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
              {/* Title */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Incident Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="Brief title of the incident"
                  required
                />
              </div>

              {/* Type, Severity, Status */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Incident Type <span className="text-red-400">*</span></label>
                  <select
                    value={formData.incidentType}
                    onChange={(e) => setFormData({ ...formData, incidentType: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
                    required
                  >
                    <option value="security-breach">Security Breach</option>
                    <option value="theft">Theft</option>
                    <option value="vandalism">Vandalism</option>
                    <option value="trespassing">Trespassing</option>
                    <option value="assault">Assault</option>
                    <option value="fire">Fire</option>
                    <option value="medical-emergency">Medical Emergency</option>
                    <option value="suspicious-activity">Suspicious Activity</option>
                    <option value="equipment-failure">Equipment Failure</option>
                    <option value="policy-violation">Policy Violation</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Severity <span className="text-red-400">*</span></label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
                    required
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
                  >
                    <option value="open">Open</option>
                    <option value="investigating">Investigating</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="Detailed description of the incident"
                  rows="5"
                  required
                />
              </div>

              {/* Date, Time, Location */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Date <span className="text-red-400">*</span></label>
                  <input
                    type="date"
                    value={formData.incidentDate}
                    onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Time <span className="text-red-400">*</span></label>
                  <input
                    type="time"
                    value={formData.incidentTime}
                    onChange={(e) => setFormData({ ...formData, incidentTime: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder="Specific location"
                  />
                </div>
              </div>

              {/* Reported By, Client, Site, Shift */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Reported By <span className="text-red-400">*</span></label>
                  <select
                    value={formData.reportedBy}
                    onChange={(e) => setFormData({ ...formData, reportedBy: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
                    required
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
                  <label className="mb-2 block text-sm font-medium text-white">Client</label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
                  >
                    <option value="">None</option>
                    {clients.map(client => (
                      <option key={client.$id} value={client.$id}>
                        {client.companyName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Site</label>
                  <select
                    value={formData.siteId}
                    onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
                    disabled={!formData.clientId}
                  >
                    <option value="">None</option>
                    {sites
                      .filter(site => !formData.clientId || site.clientId === formData.clientId)
                      .map(site => (
                        <option key={site.$id} value={site.$id}>
                          {site.siteName}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Related Shift</label>
                  <select
                    value={formData.shiftId}
                    onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
                  >
                    <option value="">None</option>
                    {shifts
                      .filter(shift => !formData.siteId || shift.siteId === formData.siteId)
                      .slice(0, 50)
                      .map(shift => (
                        <option key={shift.$id} value={shift.$id}>
                          {shift.date} {shift.startTime}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Witness Information */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Witness Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">Witness Name</label>
                    <input
                      type="text"
                      value={formData.witnessName}
                      onChange={(e) => setFormData({ ...formData, witnessName: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="Full name"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">Witness Contact</label>
                    <input
                      type="text"
                      value={formData.witnessContact}
                      onChange={(e) => setFormData({ ...formData, witnessContact: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="Phone or email"
                    />
                  </div>
                </div>
              </div>

              {/* Action Taken */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white">Action Taken</label>
                <textarea
                  value={formData.actionTaken}
                  onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="Actions taken in response to the incident"
                  rows="3"
                />
              </div>

              {/* Checkboxes and Details */}
              <div className="space-y-4">
                {/* Police */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <label className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      checked={formData.policeNotified}
                      onChange={(e) => setFormData({ ...formData, policeNotified: e.target.checked })}
                      className="h-4 w-4 rounded border-white/10 bg-white/5 text-accent focus:ring-accent"
                    />
                    <span className="text-sm font-medium text-white">Police Notified</span>
                  </label>
                  {formData.policeNotified && (
                    <input
                      type="text"
                      value={formData.policeReferenceNumber}
                      onChange={(e) => setFormData({ ...formData, policeReferenceNumber: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="Police reference number"
                    />
                  )}
                </div>

                {/* Injuries */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <label className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      checked={formData.injuries}
                      onChange={(e) => setFormData({ ...formData, injuries: e.target.checked })}
                      className="h-4 w-4 rounded border-white/10 bg-white/5 text-accent focus:ring-accent"
                    />
                    <span className="text-sm font-medium text-white">Injuries Reported</span>
                  </label>
                  {formData.injuries && (
                    <textarea
                      value={formData.injuryDetails}
                      onChange={(e) => setFormData({ ...formData, injuryDetails: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="Describe the injuries"
                      rows="2"
                    />
                  )}
                </div>

                {/* Property Damage */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <label className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      checked={formData.propertyDamage}
                      onChange={(e) => setFormData({ ...formData, propertyDamage: e.target.checked })}
                      className="h-4 w-4 rounded border-white/10 bg-white/5 text-accent focus:ring-accent"
                    />
                    <span className="text-sm font-medium text-white">Property Damage</span>
                  </label>
                  {formData.propertyDamage && (
                    <textarea
                      value={formData.damageDetails}
                      onChange={(e) => setFormData({ ...formData, damageDetails: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="Describe the damage"
                      rows="2"
                    />
                  )}
                </div>

                {/* Follow Up */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <label className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      checked={formData.followUpRequired}
                      onChange={(e) => setFormData({ ...formData, followUpRequired: e.target.checked })}
                      className="h-4 w-4 rounded border-white/10 bg-white/5 text-accent focus:ring-accent"
                    />
                    <span className="text-sm font-medium text-white">Follow-Up Required</span>
                  </label>
                  {formData.followUpRequired && (
                    <textarea
                      value={formData.followUpNotes}
                      onChange={(e) => setFormData({ ...formData, followUpNotes: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="Follow-up notes"
                      rows="2"
                    />
                  )}
                </div>
              </div>

              {/* Resolution (for closed incidents) */}
              {formData.status === 'resolved' && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Resolution</label>
                  <textarea
                    value={formData.resolution}
                    onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder="How was this incident resolved?"
                    rows="3"
                  />
                </div>
              )}

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
                  {editingIncident ? 'Update Report' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Incidents;
