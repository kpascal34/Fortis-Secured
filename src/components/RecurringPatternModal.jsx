import React, { useState, useEffect } from 'react';
import {
  REPEAT_FREQUENCY,
  FREQUENCY_LABELS,
  DAYS_OF_WEEK,
  DAY_LABELS,
  DAY_ABBR,
  END_CONDITION,
  createPattern,
  validatePattern,
  calculateTotalShifts,
  getPatternDescription,
} from '../lib/recurringShiftPatterns';
import {
  AiOutlineClose,
  AiOutlineCalendar,
  AiOutlineClockCircle,
  AiOutlineEnvironment,
  AiOutlineUser,
  AiOutlineInfoCircle,
  AiOutlineCheckCircle,
  AiOutlineWarning,
} from 'react-icons/ai';

const RecurringPatternModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  pattern = null,
  clients = [],
  sites = [],
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    frequency: REPEAT_FREQUENCY.WEEKLY,
    interval: 1,
    daysOfWeek: [],
    startTime: '09:00',
    endTime: '17:00',
    clientId: '',
    siteId: '',
    positionType: '',
    requiredGuards: 1,
    specialInstructions: '',
    endCondition: END_CONDITION.NEVER,
    occurrences: 10,
    endDate: '',
    isActive: true,
  });

  const [errors, setErrors] = useState([]);
  const [previewStart, setPreviewStart] = useState('');
  const [previewEnd, setPreviewEnd] = useState('');
  const [previewCount, setPreviewCount] = useState(0);

  useEffect(() => {
    if (pattern) {
      setFormData({
        name: pattern.name || '',
        description: pattern.description || '',
        frequency: pattern.frequency || REPEAT_FREQUENCY.WEEKLY,
        interval: pattern.interval || 1,
        daysOfWeek: pattern.daysOfWeek || [],
        startTime: pattern.startTime || '09:00',
        endTime: pattern.endTime || '17:00',
        clientId: pattern.clientId || '',
        siteId: pattern.siteId || '',
        positionType: pattern.positionType || '',
        requiredGuards: pattern.requiredGuards || 1,
        specialInstructions: pattern.specialInstructions || '',
        endCondition: pattern.endCondition || END_CONDITION.NEVER,
        occurrences: pattern.occurrences || 10,
        endDate: pattern.endDate || '',
        isActive: pattern.isActive !== undefined ? pattern.isActive : true,
      });
    } else {
      // Set default preview dates (next 4 weeks)
      const today = new Date();
      const fourWeeks = new Date(today);
      fourWeeks.setDate(fourWeeks.getDate() + 28);
      
      setPreviewStart(today.toISOString().split('T')[0]);
      setPreviewEnd(fourWeeks.toISOString().split('T')[0]);
    }
  }, [pattern]);

  // Update preview count when form changes
  useEffect(() => {
    if (previewStart && previewEnd) {
      try {
        const patternData = createPattern(formData);
        const count = calculateTotalShifts(patternData, previewStart, previewEnd);
        setPreviewCount(count);
      } catch (err) {
        setPreviewCount(0);
      }
    }
  }, [formData, previewStart, previewEnd]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors([]);
  };

  const handleDayToggle = (day) => {
    setFormData(prev => {
      const days = prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day].sort((a, b) => a - b);
      return { ...prev, daysOfWeek: days };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const patternData = createPattern(formData);
    const validation = validatePattern(patternData);
    
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    onSave({ ...patternData, ...(pattern ? { $id: pattern.$id } : {}) });
    onClose();
  };

  const filteredSites = sites.filter(site => 
    !formData.clientId || site.clientId === formData.clientId
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-night-sky via-deep-space to-night-sky border border-white/10 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-night-sky/95 backdrop-blur-sm border-b border-white/10 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <AiOutlineCalendar className="text-electric-cyan" />
              {pattern ? 'Edit' : 'Create'} Recurring Pattern
            </h2>
            <p className="text-white/60 text-sm mt-1">
              Define a repeating shift template to generate multiple shifts automatically
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <AiOutlineClose size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AiOutlineWarning className="text-red-400 mt-0.5 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <h4 className="text-red-400 font-semibold mb-1">Please fix the following errors:</h4>
                  <ul className="text-red-300 text-sm space-y-1">
                    {errors.map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <AiOutlineInfoCircle className="text-electric-cyan" />
              Basic Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Pattern Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Weekend Night Patrol"
                  className="w-full px-4 py-2 bg-deep-space/50 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-electric-cyan/20"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Optional description of this pattern..."
                  rows={2}
                  className="w-full px-4 py-2 bg-deep-space/50 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-electric-cyan/20"
                />
              </div>
            </div>
          </div>

          {/* Repeat Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <AiOutlineCalendar className="text-electric-cyan" />
              Repeat Settings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Repeat Frequency *
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => handleInputChange('frequency', e.target.value)}
                  className="w-full px-4 py-2 bg-deep-space/50 border border-white/10 rounded-lg text-white focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-electric-cyan/20"
                  required
                >
                  {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Repeat Every
                </label>
                <input
                  type="number"
                  min="1"
                  max="52"
                  value={formData.interval}
                  onChange={(e) => handleInputChange('interval', parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-deep-space/50 border border-white/10 rounded-lg text-white focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-electric-cyan/20"
                />
              </div>
            </div>

            {/* Days of Week Selection */}
            {(formData.frequency === REPEAT_FREQUENCY.WEEKLY || 
              formData.frequency === REPEAT_FREQUENCY.BIWEEKLY) && (
              <div>
                <label className="block text-white/80 text-sm font-medium mb-3">
                  Days of Week *
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(DAYS_OF_WEEK).map(([name, value]) => {
                    const isSelected = formData.daysOfWeek.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleDayToggle(value)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          isSelected
                            ? 'bg-electric-cyan text-night-sky'
                            : 'bg-deep-space/50 border border-white/10 text-white/60 hover:text-white hover:border-white/30'
                        }`}
                      >
                        {DAY_ABBR[value]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Time Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <AiOutlineClockCircle className="text-electric-cyan" />
              Time Settings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Start Time *
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  className="w-full px-4 py-2 bg-deep-space/50 border border-white/10 rounded-lg text-white focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-electric-cyan/20"
                  required
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  End Time *
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  className="w-full px-4 py-2 bg-deep-space/50 border border-white/10 rounded-lg text-white focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-electric-cyan/20"
                  required
                />
              </div>
            </div>
          </div>

          {/* Location Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <AiOutlineEnvironment className="text-electric-cyan" />
              Location & Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Client *
                </label>
                <select
                  value={formData.clientId}
                  onChange={(e) => {
                    handleInputChange('clientId', e.target.value);
                    handleInputChange('siteId', ''); // Reset site when client changes
                  }}
                  className="w-full px-4 py-2 bg-deep-space/50 border border-white/10 rounded-lg text-white focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-electric-cyan/20"
                  required
                >
                  <option value="">Select client...</option>
                  {clients.map(client => (
                    <option key={client.$id} value={client.$id}>
                      {client.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Site *
                </label>
                <select
                  value={formData.siteId}
                  onChange={(e) => handleInputChange('siteId', e.target.value)}
                  className="w-full px-4 py-2 bg-deep-space/50 border border-white/10 rounded-lg text-white focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-electric-cyan/20"
                  required
                  disabled={!formData.clientId}
                >
                  <option value="">Select site...</option>
                  {filteredSites.map(site => (
                    <option key={site.$id} value={site.$id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Position Type
                </label>
                <input
                  type="text"
                  value={formData.positionType}
                  onChange={(e) => handleInputChange('positionType', e.target.value)}
                  placeholder="e.g., Security Guard, Patrol Officer"
                  className="w-full px-4 py-2 bg-deep-space/50 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-electric-cyan/20"
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Required Guards *
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.requiredGuards}
                  onChange={(e) => handleInputChange('requiredGuards', parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-deep-space/50 border border-white/10 rounded-lg text-white focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-electric-cyan/20"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Special Instructions
                </label>
                <textarea
                  value={formData.specialInstructions}
                  onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                  placeholder="Any special requirements or notes for this pattern..."
                  rows={3}
                  className="w-full px-4 py-2 bg-deep-space/50 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-electric-cyan/20"
                />
              </div>
            </div>
          </div>

          {/* End Condition */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <AiOutlineCheckCircle className="text-electric-cyan" />
              End Condition
            </h3>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="endCondition"
                    value={END_CONDITION.NEVER}
                    checked={formData.endCondition === END_CONDITION.NEVER}
                    onChange={(e) => handleInputChange('endCondition', e.target.value)}
                    className="text-electric-cyan focus:ring-electric-cyan"
                  />
                  <span className="text-white">Never ends</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="endCondition"
                    value={END_CONDITION.AFTER_OCCURRENCES}
                    checked={formData.endCondition === END_CONDITION.AFTER_OCCURRENCES}
                    onChange={(e) => handleInputChange('endCondition', e.target.value)}
                    className="text-electric-cyan focus:ring-electric-cyan"
                  />
                  <span className="text-white">After</span>
                  <input
                    type="number"
                    min="1"
                    value={formData.occurrences}
                    onChange={(e) => handleInputChange('occurrences', parseInt(e.target.value))}
                    disabled={formData.endCondition !== END_CONDITION.AFTER_OCCURRENCES}
                    className="w-20 px-2 py-1 bg-deep-space/50 border border-white/10 rounded text-white text-sm focus:border-electric-cyan focus:outline-none disabled:opacity-50"
                  />
                  <span className="text-white">occurrences</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="endCondition"
                    value={END_CONDITION.ON_DATE}
                    checked={formData.endCondition === END_CONDITION.ON_DATE}
                    onChange={(e) => handleInputChange('endCondition', e.target.value)}
                    className="text-electric-cyan focus:ring-electric-cyan"
                  />
                  <span className="text-white">On date</span>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    disabled={formData.endCondition !== END_CONDITION.ON_DATE}
                    className="px-2 py-1 bg-deep-space/50 border border-white/10 rounded text-white text-sm focus:border-electric-cyan focus:outline-none disabled:opacity-50"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-electric-cyan/5 border border-electric-cyan/20 rounded-lg p-4">
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <AiOutlineInfoCircle className="text-electric-cyan" />
              Pattern Preview
            </h4>
            
            <div className="space-y-3">
              <p className="text-white/80 text-sm">
                {getPatternDescription(createPattern(formData))}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/60 text-xs mb-1">Preview Start Date</label>
                  <input
                    type="date"
                    value={previewStart}
                    onChange={(e) => setPreviewStart(e.target.value)}
                    className="w-full px-3 py-1.5 bg-deep-space/50 border border-white/10 rounded text-white text-sm focus:border-electric-cyan focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-white/60 text-xs mb-1">Preview End Date</label>
                  <input
                    type="date"
                    value={previewEnd}
                    onChange={(e) => setPreviewEnd(e.target.value)}
                    className="w-full px-3 py-1.5 bg-deep-space/50 border border-white/10 rounded text-white text-sm focus:border-electric-cyan focus:outline-none"
                  />
                </div>
              </div>

              {previewStart && previewEnd && (
                <div className="bg-night-sky/50 rounded-lg p-3">
                  <p className="text-electric-cyan font-semibold">
                    {previewCount} shift{previewCount !== 1 ? 's' : ''} will be created
                  </p>
                  <p className="text-white/60 text-xs mt-1">
                    Between {new Date(previewStart).toLocaleDateString()} and {new Date(previewEnd).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => handleInputChange('isActive', e.target.checked)}
              className="w-4 h-4 text-electric-cyan focus:ring-electric-cyan rounded"
            />
            <label htmlFor="isActive" className="text-white cursor-pointer">
              Active (pattern will generate shifts automatically)
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-electric-cyan hover:bg-electric-cyan/80 text-night-sky font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <AiOutlineCheckCircle size={20} />
              {pattern ? 'Update Pattern' : 'Create Pattern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecurringPatternModal;
