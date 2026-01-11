import React, { useState, useEffect } from 'react';
import { databases, config } from '../../lib/appwrite';
import { Query, ID } from 'appwrite';
import PortalHeader from '../../components/PortalHeader';
import RecurringPatternModal from '../../components/RecurringPatternModal';
import {
  FREQUENCY_LABELS,
  DAY_ABBR,
  getPatternDescription,
  getPatternStats,
  generateShiftsFromPattern,
  isPatternActive,
} from '../../lib/recurringShiftPatterns';
import {
  AiOutlinePlus,
  AiOutlineCalendar,
  AiOutlineEdit,
  AiOutlineDelete,
  AiOutlineEye,
  AiOutlinePlayCircle,
  AiOutlinePauseCircle,
  AiOutlineClockCircle,
  AiOutlineEnvironment,
  AiOutlineUser,
  AiOutlineLoading3Quarters,
  AiOutlineCheckCircle,
  AiOutlineExclamationCircle,
  AiOutlineInfoCircle,
} from 'react-icons/ai';

const RecurringPatterns = () => {
  const [patterns, setPatterns] = useState([]);
  const [clients, setClients] = useState([]);
  const [sites, setSites] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPattern, setEditingPattern] = useState(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyingPattern, setApplyingPattern] = useState(null);
  const [applyStartDate, setApplyStartDate] = useState('');
  const [applyEndDate, setApplyEndDate] = useState('');
  const [generatedShiftsPreview, setGeneratedShiftsPreview] = useState([]);
  const [applyLoading, setApplyLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      let patternsData = [];
      let clientsData = [];
      let sitesData = [];
      let shiftsData = [];

      try {
        const [patternsRes, clientsRes, sitesRes, shiftsRes] = await Promise.all([
          databases.listDocuments(config.databaseId, 'recurring_patterns', [
            Query.limit(100),
            Query.orderDesc('$createdAt'),
          ]),
          databases.listDocuments(config.databaseId, config.clientsCollectionId, [
            Query.limit(100),
          ]),
          databases.listDocuments(config.databaseId, config.sitesCollectionId, [
            Query.limit(100),
          ]),
          databases.listDocuments(config.databaseId, config.shiftsCollectionId, [
            Query.limit(500),
          ]),
        ]);

        patternsData = patternsRes.documents;
        clientsData = clientsRes.documents;
        sitesData = sitesRes.documents;
        shiftsData = shiftsRes.documents;
      } catch (err) {
        console.warn('Using demo mode or collection not found:', err);
      }

      setPatterns(patternsData);
      setClients(clientsData);
      setSites(sitesData);
      setShifts(shiftsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePattern = async (patternData) => {
    try {
      if (config.isDemoMode) {
        const newPattern = { ...patternData, $id: ID.unique() };
        if (editingPattern) {
          setPatterns(patterns.map(p => p.$id === editingPattern.$id ? newPattern : p));
        } else {
          setPatterns([newPattern, ...patterns]);
        }
        return;
      }

      if (editingPattern) {
        await databases.updateDocument(
          config.databaseId,
          'recurring_patterns',
          editingPattern.$id,
          patternData
        );
      } else {
        await databases.createDocument(
          config.databaseId,
          'recurring_patterns',
          ID.unique(),
          patternData
        );
      }

      await fetchData();
    } catch (error) {
      console.error('Error saving pattern:', error);
      alert('Failed to save pattern. Please try again.');
    }
  };

  const handleDeletePattern = async (patternId) => {
    if (!confirm('Are you sure you want to delete this pattern? This will not affect already created shifts.')) {
      return;
    }

    try {
      if (config.isDemoMode) {
        setPatterns(patterns.filter(p => p.$id !== patternId));
        return;
      }

      await databases.deleteDocument(
        config.databaseId,
        'recurring_patterns',
        patternId
      );

      await fetchData();
    } catch (error) {
      console.error('Error deleting pattern:', error);
      alert('Failed to delete pattern. Please try again.');
    }
  };

  const handleToggleActive = async (pattern) => {
    try {
      const updatedPattern = { ...pattern, isActive: !pattern.isActive };

      if (config.isDemoMode) {
        setPatterns(patterns.map(p => p.$id === pattern.$id ? updatedPattern : p));
        return;
      }

      await databases.updateDocument(
        config.databaseId,
        'recurring_patterns',
        pattern.$id,
        { isActive: !pattern.isActive }
      );

      await fetchData();
    } catch (error) {
      console.error('Error toggling pattern:', error);
      alert('Failed to update pattern. Please try again.');
    }
  };

  const handleApplyPattern = (pattern) => {
    setApplyingPattern(pattern);
    setIsApplyModalOpen(true);
    
    // Set default dates (next 4 weeks)
    const today = new Date();
    const fourWeeks = new Date(today);
    fourWeeks.setDate(fourWeeks.getDate() + 28);
    
    setApplyStartDate(today.toISOString().split('T')[0]);
    setApplyEndDate(fourWeeks.toISOString().split('T')[0]);
  };

  useEffect(() => {
    if (applyingPattern && applyStartDate && applyEndDate) {
      const preview = generateShiftsFromPattern(applyingPattern, applyStartDate, applyEndDate);
      setGeneratedShiftsPreview(preview);
    } else {
      setGeneratedShiftsPreview([]);
    }
  }, [applyingPattern, applyStartDate, applyEndDate]);

  const handleConfirmApply = async () => {
    if (!applyingPattern || generatedShiftsPreview.length === 0) return;

    if (!confirm(`This will create ${generatedShiftsPreview.length} new shifts. Continue?`)) {
      return;
    }

    try {
      setApplyLoading(true);

      if (config.isDemoMode) {
        console.log('Demo mode: Would create', generatedShiftsPreview.length, 'shifts');
        alert(`Demo mode: ${generatedShiftsPreview.length} shifts would be created`);
        setIsApplyModalOpen(false);
        return;
      }

      // Create shifts in batches to avoid overwhelming the API
      const batchSize = 10;
      for (let i = 0; i < generatedShiftsPreview.length; i += batchSize) {
        const batch = generatedShiftsPreview.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(shift =>
            databases.createDocument(
              config.databaseId,
              config.shiftsCollectionId,
              ID.unique(),
              shift
            )
          )
        );
      }

      alert(`Successfully created ${generatedShiftsPreview.length} shifts from pattern`);
      setIsApplyModalOpen(false);
      await fetchData();
    } catch (error) {
      console.error('Error applying pattern:', error);
      alert('Failed to create shifts. Please try again.');
    } finally {
      setApplyLoading(false);
    }
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.$id === clientId);
    return client ? client.companyName : 'Unknown';
  };

  const getSiteName = (siteId) => {
    const site = sites.find(s => s.$id === siteId);
    return site ? site.name : 'Unknown';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-night-sky via-deep-space to-night-sky">
        <PortalHeader title="Recurring Patterns" />
        <div className="flex items-center justify-center h-64">
          <AiOutlineLoading3Quarters className="animate-spin text-electric-cyan" size={48} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-night-sky via-deep-space to-night-sky">
      <PortalHeader title="Recurring Patterns" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Recurring Shift Patterns</h1>
            <p className="text-white/60">
              Create and manage templates for repeating shifts
            </p>
          </div>
          <button
            onClick={() => {
              setEditingPattern(null);
              setIsModalOpen(true);
            }}
            className="px-6 py-3 bg-electric-cyan hover:bg-electric-cyan/80 text-night-sky font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <AiOutlinePlus size={20} />
            New Pattern
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-electric-cyan/10 border border-electric-cyan/30 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AiOutlineInfoCircle className="text-electric-cyan flex-shrink-0 mt-0.5" size={24} />
            <div>
              <h3 className="text-white font-semibold mb-1">About Recurring Patterns</h3>
              <p className="text-white/80 text-sm">
                Recurring patterns are templates that automatically generate multiple shifts based on your schedule.
                Create a pattern once, then apply it to any date range to create all shifts instantly.
              </p>
            </div>
          </div>
        </div>

        {/* Patterns List */}
        {patterns.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-12 text-center">
            <AiOutlineCalendar className="mx-auto text-white/30 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-white mb-2">No patterns yet</h3>
            <p className="text-white/60 mb-6">
              Create your first recurring shift pattern to streamline scheduling
            </p>
            <button
              onClick={() => {
                setEditingPattern(null);
                setIsModalOpen(true);
              }}
              className="px-6 py-3 bg-electric-cyan hover:bg-electric-cyan/80 text-night-sky font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
            >
              <AiOutlinePlus size={20} />
              Create Pattern
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {patterns.map((pattern) => {
              const stats = getPatternStats(pattern, shifts);
              const isActive = isPatternActive(pattern);

              return (
                <div
                  key={pattern.$id}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-electric-cyan/50 transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold text-white">{pattern.name}</h3>
                        {pattern.isActive ? (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs font-semibold rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      {pattern.description && (
                        <p className="text-white/60 text-sm mb-3">{pattern.description}</p>
                      )}
                      <p className="text-white/80 text-sm">
                        {getPatternDescription(pattern)}
                      </p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <AiOutlineEnvironment className="text-electric-cyan" />
                      <span>{getClientName(pattern.clientId)} - {getSiteName(pattern.siteId)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <AiOutlineClockCircle className="text-electric-cyan" />
                      <span>{pattern.startTime} - {pattern.endTime}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <AiOutlineUser className="text-electric-cyan" />
                      <span>{pattern.requiredGuards} guard{pattern.requiredGuards > 1 ? 's' : ''} required</span>
                    </div>
                  </div>

                  {/* Stats */}
                  {stats.total > 0 && (
                    <div className="grid grid-cols-4 gap-2 mb-4 p-3 bg-deep-space/50 rounded-lg">
                      <div className="text-center">
                        <div className="text-white font-semibold">{stats.total}</div>
                        <div className="text-white/50 text-xs">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-green-400 font-semibold">{stats.assigned}</div>
                        <div className="text-white/50 text-xs">Assigned</div>
                      </div>
                      <div className="text-center">
                        <div className="text-yellow-400 font-semibold">{stats.unassigned}</div>
                        <div className="text-white/50 text-xs">Open</div>
                      </div>
                      <div className="text-center">
                        <div className="text-electric-cyan font-semibold">{stats.fillRate}%</div>
                        <div className="text-white/50 text-xs">Fill Rate</div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApplyPattern(pattern)}
                      className="flex-1 px-4 py-2 bg-electric-cyan hover:bg-electric-cyan/80 text-night-sky font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <AiOutlinePlayCircle size={18} />
                      Apply Pattern
                    </button>
                    <button
                      onClick={() => handleToggleActive(pattern)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        pattern.isActive
                          ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400'
                          : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                      }`}
                      title={pattern.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {pattern.isActive ? (
                        <AiOutlinePauseCircle size={20} />
                      ) : (
                        <AiOutlinePlayCircle size={20} />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditingPattern(pattern);
                        setIsModalOpen(true);
                      }}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
                      title="Edit"
                    >
                      <AiOutlineEdit size={20} />
                    </button>
                    <button
                      onClick={() => handleDeletePattern(pattern.$id)}
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <AiOutlineDelete size={20} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pattern Modal */}
      {isModalOpen && (
        <RecurringPatternModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingPattern(null);
          }}
          onSave={handleSavePattern}
          pattern={editingPattern}
          clients={clients}
          sites={sites}
        />
      )}

      {/* Apply Pattern Modal */}
      {isApplyModalOpen && applyingPattern && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-night-sky via-deep-space to-night-sky border border-white/10 rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <AiOutlinePlayCircle className="text-electric-cyan" />
                Apply Pattern: {applyingPattern.name}
              </h2>
              <p className="text-white/60 text-sm mt-1">
                Select the date range to generate shifts from this pattern
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={applyStartDate}
                    onChange={(e) => setApplyStartDate(e.target.value)}
                    className="w-full px-4 py-2 bg-deep-space/50 border border-white/10 rounded-lg text-white focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-electric-cyan/20"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={applyEndDate}
                    onChange={(e) => setApplyEndDate(e.target.value)}
                    className="w-full px-4 py-2 bg-deep-space/50 border border-white/10 rounded-lg text-white focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-electric-cyan/20"
                  />
                </div>
              </div>

              {generatedShiftsPreview.length > 0 && (
                <div className="bg-electric-cyan/10 border border-electric-cyan/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AiOutlineCheckCircle className="text-electric-cyan" size={24} />
                    <div>
                      <h4 className="text-white font-semibold">
                        {generatedShiftsPreview.length} shifts will be created
                      </h4>
                      <p className="text-white/60 text-sm">
                        Between {new Date(applyStartDate).toLocaleDateString()} and {new Date(applyEndDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {generatedShiftsPreview.slice(0, 10).map((shift, idx) => (
                      <div key={idx} className="text-sm text-white/70 flex items-center gap-2">
                        <AiOutlineCalendar className="text-electric-cyan flex-shrink-0" />
                        <span>
                          {new Date(shift.date).toLocaleDateString()} - {shift.startTime} to {shift.endTime}
                        </span>
                      </div>
                    ))}
                    {generatedShiftsPreview.length > 10 && (
                      <p className="text-white/50 text-xs italic">
                        ...and {generatedShiftsPreview.length - 10} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {generatedShiftsPreview.length === 0 && applyStartDate && applyEndDate && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AiOutlineExclamationCircle className="text-yellow-400" size={20} />
                    <p className="text-yellow-400 text-sm">
                      No shifts will be generated for this date range. Please adjust your dates.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-white/10 flex items-center justify-end gap-4">
              <button
                onClick={() => setIsApplyModalOpen(false)}
                disabled={applyLoading}
                className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApply}
                disabled={applyLoading || generatedShiftsPreview.length === 0}
                className="px-6 py-2 bg-electric-cyan hover:bg-electric-cyan/80 text-night-sky font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {applyLoading ? (
                  <>
                    <AiOutlineLoading3Quarters className="animate-spin" size={20} />
                    Creating Shifts...
                  </>
                ) : (
                  <>
                    <AiOutlineCheckCircle size={20} />
                    Create {generatedShiftsPreview.length} Shifts
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecurringPatterns;
