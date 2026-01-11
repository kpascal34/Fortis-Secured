/**
 * Advanced Filter Panel Component
 * UI for building complex filters with site groups and saved filters
 */

import { useState, useEffect } from 'react';
import {
  OPERATORS,
  FILTERABLE_FIELDS,
  QUICK_FILTERS,
  createFilter,
  applyFilters,
  saveFilter,
  getSavedFilters,
  deleteSavedFilter,
  getSiteGroups,
  filterByGroup,
} from '../lib/advancedFiltering';

const AdvancedFilterPanel = ({ data, onFilterChange, entityType = 'shift' }) => {
  const [filters, setFilters] = useState([]);
  const [logic, setLogic] = useState('AND');
  const [savedFilters, setSavedFilters] = useState([]);
  const [siteGroups, setSiteGroups] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [activeTab, setActiveTab] = useState('filters'); // filters, saved, groups, quick

  useEffect(() => {
    loadSavedFilters();
    loadSiteGroups();
  }, []);

  useEffect(() => {
    // Apply filters whenever they change
    const filtered = applyFilters(data, filters, logic);
    onFilterChange(filtered);
  }, [filters, logic]);

  const loadSavedFilters = () => {
    setSavedFilters(getSavedFilters());
  };

  const loadSiteGroups = () => {
    setSiteGroups(getSiteGroups());
  };

  const addFilter = () => {
    const firstField = Object.keys(FILTERABLE_FIELDS)[0];
    const fieldConfig = FILTERABLE_FIELDS[firstField];
    const newFilter = createFilter(firstField, fieldConfig.operators[0], '');
    setFilters([...filters, newFilter]);
  };

  const updateFilter = (index, updates) => {
    const updated = [...filters];
    updated[index] = { ...updated[index], ...updates };
    setFilters(updated);
  };

  const removeFilter = (index) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const clearFilters = () => {
    setFilters([]);
  };

  const handleSaveFilter = () => {
    if (filterName.trim()) {
      saveFilter(filterName, filters, logic);
      setFilterName('');
      setShowSaveDialog(false);
      loadSavedFilters();
    }
  };

  const loadSavedFilter = (saved) => {
    setFilters(saved.filters);
    setLogic(saved.logic);
  };

  const handleDeleteSavedFilter = (filterId) => {
    deleteSavedFilter(filterId);
    loadSavedFilters();
  };

  const applyQuickFilter = (quickFilterKey) => {
    const quickFilter = QUICK_FILTERS[quickFilterKey];
    setFilters(quickFilter.filters);
    setLogic(quickFilter.logic);
  };

  const applyGroupFilter = (groupId) => {
    const filtered = filterByGroup(data, groupId);
    onFilterChange(filtered);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      {/* Tabs */}
      <div className="flex space-x-4 border-b pb-2">
        <button
          onClick={() => setActiveTab('filters')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'filters'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Custom Filters
        </button>
        <button
          onClick={() => setActiveTab('quick')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'quick'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Quick Filters
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'saved'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Saved Filters ({savedFilters.length})
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'groups'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Site Groups
        </button>
      </div>

      {/* Custom Filters Tab */}
      {activeTab === 'filters' && (
        <div className="space-y-4">
          {/* Logic Selector */}
          {filters.length > 1 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Match:</span>
              <select
                value={logic}
                onChange={(e) => setLogic(e.target.value)}
                className="border rounded px-3 py-1 text-sm"
              >
                <option value="AND">All conditions (AND)</option>
                <option value="OR">Any condition (OR)</option>
              </select>
            </div>
          )}

          {/* Filter List */}
          {filters.map((filter, index) => (
            <div key={filter.id} className="flex items-start space-x-2 p-4 bg-gray-50 rounded-lg">
              {/* Field Selector */}
              <select
                value={filter.field}
                onChange={(e) => {
                  const field = e.target.value;
                  const fieldConfig = FILTERABLE_FIELDS[field];
                  updateFilter(index, {
                    field,
                    operator: fieldConfig.operators[0],
                    value: '',
                  });
                }}
                className="flex-1 border rounded px-3 py-2 text-sm"
              >
                {Object.entries(FILTERABLE_FIELDS)
                  .filter(([key]) => key.startsWith(entityType))
                  .map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
              </select>

              {/* Operator Selector */}
              <select
                value={filter.operator}
                onChange={(e) => updateFilter(index, { operator: e.target.value })}
                className="flex-1 border rounded px-3 py-2 text-sm"
              >
                {FILTERABLE_FIELDS[filter.field].operators.map((op) => (
                  <option key={op} value={op}>
                    {op.replace(/_/g, ' ').toUpperCase()}
                  </option>
                ))}
              </select>

              {/* Value Input */}
              {![OPERATORS.IS_EMPTY, OPERATORS.IS_NOT_EMPTY].includes(filter.operator) && (
                <input
                  type={FILTERABLE_FIELDS[filter.field].type === 'date' ? 'date' : 'text'}
                  value={filter.value}
                  onChange={(e) => updateFilter(index, { value: e.target.value })}
                  className="flex-1 border rounded px-3 py-2 text-sm"
                  placeholder="Value"
                />
              )}

              {/* Remove Button */}
              <button
                onClick={() => removeFilter(index)}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
              >
                ✕
              </button>
            </div>
          ))}

          {/* Actions */}
          <div className="flex space-x-2">
            <button
              onClick={addFilter}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Add Filter
            </button>
            {filters.length > 0 && (
              <>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowSaveDialog(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Save Filter
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Quick Filters Tab */}
      {activeTab === 'quick' && (
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(QUICK_FILTERS).map(([key, quickFilter]) => (
            <button
              key={key}
              onClick={() => applyQuickFilter(key)}
              className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg hover:from-blue-100 hover:to-blue-200 text-left"
            >
              <div className="font-medium text-blue-900">{quickFilter.name}</div>
              <div className="text-xs text-blue-600 mt-1">
                {quickFilter.filters.length} condition{quickFilter.filters.length !== 1 ? 's' : ''}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Saved Filters Tab */}
      {activeTab === 'saved' && (
        <div className="space-y-2">
          {savedFilters.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No saved filters yet</p>
          ) : (
            savedFilters.map((saved) => (
              <div
                key={saved.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{saved.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {saved.filters.length} condition{saved.filters.length !== 1 ? 's' : ''} · {saved.logic}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => loadSavedFilter(saved)}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => handleDeleteSavedFilter(saved.id)}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Site Groups Tab */}
      {activeTab === 'groups' && (
        <div className="grid grid-cols-2 gap-3">
          {siteGroups.map((group) => (
            <button
              key={group.id}
              onClick={() => applyGroupFilter(group.id)}
              className="p-4 rounded-lg text-left hover:shadow-md transition-shadow"
              style={{ backgroundColor: `${group.color}15`, borderLeft: `4px solid ${group.color}` }}
            >
              <div className="font-medium text-gray-900">{group.name}</div>
              <div className="text-xs text-gray-600 mt-1">{group.siteIds.length} sites</div>
              {group.description && (
                <div className="text-xs text-gray-500 mt-2">{group.description}</div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Save Filter Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Save Filter</h3>
            <input
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="Filter name"
              className="w-full border rounded px-3 py-2 mb-4"
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFilter}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {filters.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm font-medium text-blue-900">
            Active Filters: {filters.length}
          </div>
          <div className="text-xs text-blue-700 mt-1">
            Showing items that match {logic === 'AND' ? 'all' : 'any'} conditions
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFilterPanel;
