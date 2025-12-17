import React, { useState, useEffect } from 'react';
import {
  trackEvent,
  getStoredEvents,
  calculateUserActivity,
  getModuleUsageStats,
  getPopularModules,
  getActivityTimeline,
  generateReport,
  REPORT_TEMPLATES,
  createScheduledExport,
  getScheduledExports,
  deleteScheduledExport,
  EXPORT_SCHEDULES,
  downloadReport,
  EVENT_CATEGORIES,
} from '../../lib/analyticsUtils';
import {
  AiOutlineBarChart,
  AiOutlineLineChart,
  AiOutlinePieChart,
  AiOutlineDownload,
  AiOutlinePlus,
  AiOutlineClose,
  AiOutlineDelete,
  AiOutlineCalendar,
  AiOutlineClockCircle,
  AiOutlineUser,
  AiOutlineTeam,
  AiOutlineAppstore,
  AiOutlineDashboard,
  AiOutlineFile,
  AiOutlineCheck,
} from 'react-icons/ai';

const Analytics = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('7days');
  const [userActivity, setUserActivity] = useState(null);
  const [moduleStats, setModuleStats] = useState(null);
  
  // Report generation state
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [generatedReport, setGeneratedReport] = useState(null);
  
  // Scheduled exports state
  const [showExportModal, setShowExportModal] = useState(false);
  const [scheduledExports, setScheduledExports] = useState([]);

  useEffect(() => {
    loadAnalyticsData();
  }, [dateRange]);

  const loadAnalyticsData = () => {
    try {
      setLoading(true);
      
      // Get stored events
      let allEvents = getStoredEvents();
      
      // Filter by date range
      const now = new Date();
      let startDate = new Date();
      
      switch (dateRange) {
        case '24hours':
          startDate.setHours(now.getHours() - 24);
          break;
        case '7days':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate = null;
      }
      
      if (startDate) {
        allEvents = allEvents.filter(e => new Date(e.timestamp) >= startDate);
      }
      
      setEvents(allEvents);
      
      // Calculate analytics
      const activity = calculateUserActivity(allEvents);
      setUserActivity(activity);
      
      const moduleUsage = getModuleUsageStats(allEvents);
      setModuleStats(moduleUsage);
      
      // Load scheduled exports
      setScheduledExports(getScheduledExports());
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = (templateId) => {
    try {
      const startDate = getStartDateForRange(dateRange);
      const report = generateReport(templateId, events, {
        startDate: startDate ? startDate.toISOString() : null,
        endDate: new Date().toISOString(),
      });
      
      setGeneratedReport(report);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    }
  };

  const handleDownloadReport = (format) => {
    if (!generatedReport) return;
    
    try {
      downloadReport(generatedReport, format);
      alert(`Report downloaded as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report');
    }
  };

  const handleCreateScheduledExport = (templateId, scheduleId, format) => {
    try {
      createScheduledExport(templateId, scheduleId, {
        format,
        enabled: true,
      });
      
      setScheduledExports(getScheduledExports());
      setShowExportModal(false);
      alert('Scheduled export created successfully!');
    } catch (error) {
      console.error('Error creating scheduled export:', error);
      alert('Failed to create scheduled export');
    }
  };

  const handleDeleteScheduledExport = (exportId) => {
    if (!confirm('Are you sure you want to delete this scheduled export?')) return;
    
    try {
      deleteScheduledExport(exportId);
      setScheduledExports(getScheduledExports());
      alert('Scheduled export deleted');
    } catch (error) {
      console.error('Error deleting scheduled export:', error);
      alert('Failed to delete scheduled export');
    }
  };

  const getStartDateForRange = (range) => {
    const now = new Date();
    const startDate = new Date();
    
    switch (range) {
      case '24hours':
        startDate.setHours(now.getHours() - 24);
        return startDate;
      case '7days':
        startDate.setDate(now.getDate() - 7);
        return startDate;
      case '30days':
        startDate.setDate(now.getDate() - 30);
        return startDate;
      case '90days':
        startDate.setDate(now.getDate() - 90);
        return startDate;
      default:
        return null;
    }
  };

  const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const getDayName = (dayIndex) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayIndex];
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AiOutlineBarChart className="mx-auto mb-4 h-12 w-12 animate-pulse text-accent" />
          <p className="text-white/70">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics & Reporting</h1>
          <p className="mt-2 text-white/70">Track user interactions and module usage</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="rounded-lg border border-white/10 bg-night-sky px-4 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="24hours">Last 24 Hours</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-white hover:bg-accent/90 transition-all"
          >
            <AiOutlineFile className="h-5 w-5" />
            Generate Report
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Total Events</p>
              <p className="mt-2 text-3xl font-bold text-white">{events.length}</p>
            </div>
            <AiOutlineBarChart className="h-8 w-8 text-accent" />
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Active Users</p>
              <p className="mt-2 text-3xl font-bold text-white">{userActivity?.uniqueSessions || 0}</p>
            </div>
            <AiOutlineUser className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Avg. Session Duration</p>
              <p className="mt-2 text-3xl font-bold text-white">
                {formatDuration(userActivity?.averageSessionDuration || 0)}
              </p>
            </div>
            <AiOutlineClockCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Module Accesses</p>
              <p className="mt-2 text-3xl font-bold text-white">
                {Object.values(moduleStats || {}).reduce((sum, m) => sum + m.accessCount, 0)}
              </p>
            </div>
            <AiOutlineAppstore className="h-8 w-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-panel">
        <div className="border-b border-white/10 p-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'overview'
                  ? 'bg-accent text-white'
                  : 'text-white/70 hover:bg-white/5'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('modules')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'modules'
                  ? 'bg-accent text-white'
                  : 'text-white/70 hover:bg-white/5'
              }`}
            >
              Module Usage
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'users'
                  ? 'bg-accent text-white'
                  : 'text-white/70 hover:bg-white/5'
              }`}
            >
              User Activity
            </button>
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'scheduled'
                  ? 'bg-accent text-white'
                  : 'text-white/70 hover:bg-white/5'
              }`}
            >
              Scheduled Exports
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Activity Timeline</h3>
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <div className="space-y-2">
                    {getActivityTimeline(events, 'day').slice(-7).map((item, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <span className="text-sm text-white/70 w-24">{item.date}</span>
                        <div className="flex-1 h-6 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full"
                            style={{
                              width: `${(item.count / Math.max(...getActivityTimeline(events, 'day').map(i => i.count))) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium text-white w-12 text-right">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Events by Category</h3>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(userActivity?.eventsByCategory || {}).map(([category, count]) => (
                    <div key={category} className="rounded-lg bg-white/5 border border-white/10 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/70 capitalize">{category}</span>
                        <span className="text-xl font-bold text-white">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Module Usage Tab */}
          {activeTab === 'modules' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Popular Modules</h3>
                <div className="space-y-3">
                  {getPopularModules(events, 10).map((module, index) => (
                    <div key={module.name} className="rounded-lg bg-white/5 border border-white/10 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-sm font-bold text-accent">
                            {index + 1}
                          </span>
                          <span className="font-medium text-white capitalize">{module.name}</span>
                        </div>
                        <span className="text-sm text-white/50">{module.accessCount} accesses</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <AiOutlineUser className="h-3 w-3" />
                        <span>{module.uniqueUsers} unique users</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* User Activity Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-lg bg-white/5 border border-white/10 p-6">
                  <h4 className="text-sm font-medium text-white/70 mb-2">Most Active Hour</h4>
                  <p className="text-3xl font-bold text-white">
                    {userActivity?.mostActiveHour !== null ? `${userActivity.mostActiveHour}:00` : 'N/A'}
                  </p>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 p-6">
                  <h4 className="text-sm font-medium text-white/70 mb-2">Most Active Day</h4>
                  <p className="text-3xl font-bold text-white">
                    {userActivity?.mostActiveDayOfWeek !== null 
                      ? getDayName(userActivity.mostActiveDayOfWeek)
                      : 'N/A'}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Event Distribution</h3>
                <div className="space-y-2">
                  {Object.entries(userActivity?.eventsByType || {})
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center gap-3">
                        <span className="text-sm text-white/70 w-48 truncate">{type}</span>
                        <div className="flex-1 h-6 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{
                              width: `${(count / Math.max(...Object.values(userActivity?.eventsByType || {}))) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium text-white w-12 text-right">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Scheduled Exports Tab */}
          {activeTab === 'scheduled' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Scheduled Exports</h3>
                <button
                  onClick={() => setShowExportModal(true)}
                  className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-sm text-white hover:bg-accent/90 transition-all"
                >
                  <AiOutlinePlus className="h-4 w-4" />
                  New Schedule
                </button>
              </div>

              {scheduledExports.length === 0 ? (
                <div className="text-center py-12">
                  <AiOutlineCalendar className="mx-auto h-12 w-12 text-white/30 mb-3" />
                  <p className="text-white/50">No scheduled exports configured</p>
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="mt-4 text-accent hover:text-accent/80"
                  >
                    Create your first scheduled export
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {scheduledExports.map((exp) => (
                    <div key={exp.id} className="rounded-lg bg-white/5 border border-white/10 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-medium text-white">
                              {REPORT_TEMPLATES[exp.templateId.toUpperCase().replace(/-/g, '_')]?.name || exp.templateId}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              exp.enabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {exp.enabled ? 'Active' : 'Disabled'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-white/50">
                            <span>Schedule: {EXPORT_SCHEDULES[exp.schedule.toUpperCase()]?.name}</span>
                            <span>Format: {exp.format.toUpperCase()}</span>
                            {exp.nextRun && (
                              <span>Next run: {new Date(exp.nextRun).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteScheduledExport(exp.id)}
                          className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20 transition-all"
                        >
                          <AiOutlineDelete className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Generate Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 border-b border-white/10 bg-night-sky p-6 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Generate Report</h2>
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setGeneratedReport(null);
                    setSelectedTemplate(null);
                  }}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 transition-all"
                >
                  <AiOutlineClose className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {!generatedReport ? (
                <>
                  <p className="text-sm text-white/70">Select a report template to generate:</p>
                  <div className="space-y-3">
                    {Object.values(REPORT_TEMPLATES).map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleGenerateReport(template.id)}
                        className="w-full text-left rounded-lg bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition-all"
                      >
                        <div className="font-medium text-white mb-1">{template.name}</div>
                        <div className="text-sm text-white/50">{template.description}</div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
                    <div className="flex items-center gap-2 text-green-400 mb-2">
                      <AiOutlineCheck className="h-5 w-5" />
                      <span className="font-medium">Report Generated Successfully</span>
                    </div>
                    <p className="text-sm text-white/70">
                      {generatedReport.eventCount} events analyzed
                    </p>
                  </div>

                  <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                    <h3 className="font-medium text-white mb-2">{generatedReport.templateName}</h3>
                    <div className="text-sm text-white/50 space-y-1">
                      <p>Generated: {new Date(generatedReport.generatedAt).toLocaleString()}</p>
                      <p>Report ID: {generatedReport.id}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleDownloadReport('json')}
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 font-semibold text-white hover:bg-accent/90 transition-all"
                    >
                      <AiOutlineDownload className="h-5 w-5" />
                      Download as JSON
                    </button>
                    <button
                      onClick={() => handleDownloadReport('csv')}
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white hover:bg-white/10 transition-all"
                    >
                      <AiOutlineDownload className="h-5 w-5" />
                      Download as CSV
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Schedule Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="glass-panel w-full max-w-lg">
            <div className="border-b border-white/10 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Schedule Export</h2>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 transition-all"
                >
                  <AiOutlineClose className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Report Template</label>
                <select
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-night-sky px-4 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">Select template...</option>
                  {Object.values(REPORT_TEMPLATES).map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {Object.values(EXPORT_SCHEDULES).filter(s => s.id !== 'custom').map((schedule) => (
                  <button
                    key={schedule.id}
                    onClick={() => selectedTemplate && handleCreateScheduledExport(selectedTemplate, schedule.id, 'json')}
                    disabled={!selectedTemplate}
                    className="rounded-lg bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="font-medium text-white mb-1">{schedule.name}</div>
                    <div className="text-xs text-white/50">{schedule.cron}</div>
                  </button>
                ))}
              </div>

              <p className="text-xs text-white/50 text-center">
                Exports will be saved and available for download
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
