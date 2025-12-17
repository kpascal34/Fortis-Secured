import React, { useState } from 'react';
import { calculatePercentage } from '../../lib/validation';
import {
  AiOutlineFileText,
  AiOutlineBarChart,
  AiOutlineClockCircle,
  AiOutlineTeam,
  AiOutlineWarning,
  AiOutlineDollar,
  AiOutlineDownload,
  AiOutlineCalendar,
  AiOutlinePieChart,
  AiOutlineLineChart,
  AiOutlineAreaChart,
} from 'react-icons/ai';

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [validationMessage, setValidationMessage] = useState('');

  const reportCategories = [
    {
      name: 'Operational Reports',
      icon: AiOutlineBarChart,
      reports: [
        {
          id: 'shift-coverage',
          name: 'Shift Coverage Report',
          description: 'Detailed analysis of shift coverage across all sites',
          icon: AiOutlineClockCircle,
          metrics: ['Total Shifts', 'Coverage Rate', 'Unfilled Shifts', 'Peak Times'],
        },
        {
          id: 'guard-performance',
          name: 'Guard Performance Report',
          description: 'Individual guard performance metrics and KPIs',
          icon: AiOutlineTeam,
          metrics: ['Attendance Rate', 'Incidents Handled', 'Client Feedback', 'Training Status'],
        },
        {
          id: 'incident-analysis',
          name: 'Incident Analysis Report',
          description: 'Comprehensive incident trends and patterns',
          icon: AiOutlineWarning,
          metrics: ['Total Incidents', 'Response Time', 'Resolution Rate', 'Recurring Issues'],
        },
      ],
    },
    {
      name: 'Financial Reports',
      icon: AiOutlineDollar,
      reports: [
        {
          id: 'revenue-analysis',
          name: 'Revenue Analysis',
          description: 'Revenue breakdown by client, site, and service type',
          icon: AiOutlinePieChart,
          metrics: ['Total Revenue', 'Client Revenue', 'Service Revenue', 'Growth Rate'],
        },
        {
          id: 'cost-analysis',
          name: 'Cost Analysis',
          description: 'Operational costs and profitability metrics',
          icon: AiOutlineLineChart,
          metrics: ['Labor Costs', 'Overhead', 'Profit Margin', 'Cost per Site'],
        },
        {
          id: 'invoice-summary',
          name: 'Invoice Summary',
          description: 'Invoice status and payment tracking',
          icon: AiOutlineFileText,
          metrics: ['Invoiced', 'Paid', 'Overdue', 'Outstanding'],
        },
      ],
    },
    {
      name: 'Compliance Reports',
      icon: AiOutlineFileText,
      reports: [
        {
          id: 'license-compliance',
          name: 'License Compliance',
          description: 'SIA license status and expiry tracking',
          icon: AiOutlineTeam,
          metrics: ['Valid Licenses', 'Expiring Soon', 'Expired', 'Compliance Rate'],
        },
        {
          id: 'training-compliance',
          name: 'Training Compliance',
          description: 'Staff training completion and certification status',
          icon: AiOutlineFileText,
          metrics: ['Completed', 'In Progress', 'Overdue', 'Completion Rate'],
        },
        {
          id: 'audit-log',
          name: 'Audit Log Report',
          description: 'System activity and security audit trail',
          icon: AiOutlineAreaChart,
          metrics: ['Total Activities', 'User Actions', 'Failed Attempts', 'System Changes'],
        },
      ],
    },
  ];

  const recentReports = [
    {
      name: 'Monthly Operations Summary',
      date: '2025-12-01',
      type: 'Operational',
      size: '2.4 MB',
      format: 'PDF',
    },
    {
      name: 'Revenue Analysis Q4 2025',
      date: '2025-12-10',
      type: 'Financial',
      size: '1.8 MB',
      format: 'Excel',
    },
    {
      name: 'Incident Analysis - November',
      date: '2025-12-05',
      type: 'Operational',
      size: '1.2 MB',
      format: 'PDF',
    },
    {
      name: 'Guard Performance Review',
      date: '2025-12-08',
      type: 'Operational',
      size: '3.1 MB',
      format: 'PDF',
    },
  ];

  const generateKPIData = (reportId) => {
    // Mock data for demonstration - in production, fetch from database
    const mockMetrics = {
      'shift-coverage': {
        totalShifts: 150,
        filledShifts: 142,
        totalIncidents: 8,
      },
      'guard-performance': {
        attendanceRecords: 2500,
        presentDays: 2425,
        incidentsHandled: 45,
        trainingCompleted: 38,
      },
      'incident-analysis': {
        totalIncidents: 85,
        resolved: 78,
        averageResponseTime: 4.2,
      },
      'license-compliance': {
        totalLicenses: 200,
        validLicenses: 195,
        expiringCerts: 5,
      },
      'training-compliance': {
        totalStaff: 150,
        trainingCompleted: 142,
        overdue: 8,
      },
      'invoice-summary': {
        invoiced: 50000,
        paid: 45000,
        overdue: 3000,
      },
    };

    const metrics = mockMetrics[reportId] || {};
    const kpis = {};

    // Calculate percentages based on report type
    switch (reportId) {
      case 'shift-coverage':
        kpis.coverage = calculatePercentage(metrics.filledShifts, metrics.totalShifts);
        kpis.unfilled = metrics.totalShifts - metrics.filledShifts;
        break;
      case 'guard-performance':
        kpis.attendance = calculatePercentage(metrics.presentDays, metrics.attendanceRecords);
        kpis.training = calculatePercentage(metrics.trainingCompleted, 40);
        break;
      case 'incident-analysis':
        kpis.resolution = calculatePercentage(metrics.resolved, metrics.totalIncidents);
        break;
      case 'license-compliance':
        kpis.compliance = calculatePercentage(metrics.validLicenses, metrics.totalLicenses);
        kpis.expiringRate = calculatePercentage(metrics.expiringCerts, metrics.totalLicenses);
        break;
      case 'training-compliance':
        kpis.completion = calculatePercentage(metrics.trainingCompleted, metrics.totalStaff);
        kpis.overdueRate = calculatePercentage(metrics.overdue, metrics.totalStaff);
        break;
      case 'invoice-summary':
        kpis.paidRate = calculatePercentage(metrics.paid, metrics.invoiced);
        kpis.overdueRate = calculatePercentage(metrics.overdue, metrics.invoiced);
        break;
      default:
        break;
    }

    return { metrics, kpis };
  };

  const handleGenerateReport = (reportId) => {
    setGenerating(true);
    const reportContent = generateKPIData(reportId);
    
    setTimeout(() => {
      setReportData(reportContent);
      setGenerating(false);
      setValidationMessage(`Report "${reportId}" generated successfully!`);
    }, 1500);
  };

  const exportFormats = ['PDF', 'Excel', 'CSV', 'JSON'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Reports & Analytics</h1>
          <p className="mt-2 text-white/70">Generate comprehensive reports and insights</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-4 py-2">
            <AiOutlineCalendar className="text-white/70" />
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="bg-transparent text-sm text-white outline-none"
            />
            <span className="text-white/50">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="bg-transparent text-sm text-white outline-none"
            />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Reports', value: '127', icon: AiOutlineFileText, color: 'blue' },
          { label: 'This Month', value: '24', icon: AiOutlineCalendar, color: 'green' },
          { label: 'Scheduled', value: '8', icon: AiOutlineClockCircle, color: 'yellow' },
          { label: 'Automated', value: '15', icon: AiOutlineBarChart, color: 'purple' },
        ].map((stat, index) => (
          <div key={index} className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold text-white">{stat.value}</p>
              </div>
              <div className={`rounded-lg bg-${stat.color}-500/20 p-3`}>
                <stat.icon className={`text-2xl text-${stat.color}-500`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Categories */}
        <div className="lg:col-span-2 space-y-6">
          {reportCategories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-lg bg-accent/20 p-2">
                  <category.icon className="text-xl text-accent" />
                </div>
                <h2 className="text-xl font-semibold text-white">{category.name}</h2>
              </div>

              <div className="space-y-3">
                {category.reports.map((report) => (
                  <div
                    key={report.id}
                    className="rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => setSelectedReport(report)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="rounded-lg bg-accent/10 p-2 mt-1">
                          <report.icon className="text-lg text-accent" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">{report.name}</h3>
                          <p className="text-sm text-white/60 mt-1">{report.description}</p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {report.metrics.map((metric, idx) => (
                              <span
                                key={idx}
                                className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/70"
                              >
                                {metric}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateReport(report.id);
                        }}
                        disabled={generating}
                        className="ml-4 rounded-lg bg-accent px-4 py-2 text-sm text-white hover:bg-accent/80 transition-colors disabled:opacity-50"
                      >
                        {generating ? 'Generating...' : 'Generate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Export Formats */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Export Formats</h3>
            <div className="space-y-2">
              {exportFormats.map((format) => (
                <button
                  key={format}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-left text-white hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span>{format}</span>
                    <AiOutlineDownload className="text-accent" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Reports */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Reports</h3>
            <div className="space-y-3">
              {recentReports.map((report, index) => (
                <div
                  key={index}
                  className="rounded-lg bg-white/5 border border-white/10 p-3 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm truncate">{report.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-white/50">{report.date}</span>
                        <span className="text-xs text-white/30">•</span>
                        <span className="text-xs text-white/50">{report.size}</span>
                      </div>
                      <span className="inline-block mt-2 rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">
                        {report.format}
                      </span>
                    </div>
                    <button className="ml-2 rounded-lg bg-white/5 p-2 hover:bg-white/10 transition-colors">
                      <AiOutlineDownload className="text-white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scheduled Reports */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Scheduled Reports</h3>
            <div className="space-y-3">
              {[
                { name: 'Weekly Operations', schedule: 'Every Monday 9:00 AM' },
                { name: 'Monthly Financial', schedule: '1st of each month' },
                { name: 'Compliance Review', schedule: 'Every Friday 5:00 PM' },
              ].map((scheduled, index) => (
                <div key={index} className="rounded-lg bg-white/5 border border-white/10 p-3">
                  <p className="font-medium text-white text-sm">{scheduled.name}</p>
                  <p className="text-xs text-white/50 mt-1">{scheduled.schedule}</p>
                </div>
              ))}
            </div>
            <button className="mt-4 w-full rounded-lg bg-accent/20 border border-accent/50 px-4 py-2 text-sm text-accent hover:bg-accent/30 transition-colors">
              Manage Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Selected Report Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="max-w-2xl w-full rounded-xl border border-white/10 bg-night-sky p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-accent/20 p-3">
                  <selectedReport.icon className="text-2xl text-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedReport.name}</h2>
                  <p className="text-white/60 mt-1">{selectedReport.description}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="rounded-lg bg-white/5 p-2 hover:bg-white/10 transition-colors"
              >
                <AiOutlineDownload className="text-white rotate-180" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Report Metrics</h3>
                <div className="grid grid-cols-2 gap-3">
                  {selectedReport.metrics.map((metric, idx) => (
                    <div key={idx} className="rounded-lg bg-white/5 border border-white/10 p-4">
                      <p className="text-sm text-white/70">{metric}</p>
                      <p className="mt-2 text-2xl font-bold text-white">
                        {Math.floor(Math.random() * 100)}
                        {idx === 3 ? '%' : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Export Options</h3>
                <div className="grid grid-cols-4 gap-2">
                  {exportFormats.map((format) => (
                    <button
                      key={format}
                      className="rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-sm text-white hover:bg-accent hover:border-accent transition-colors"
                    >
                      {format}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  handleGenerateReport(selectedReport.id);
                  setSelectedReport(null);
                }}
                disabled={generating}
                className="w-full rounded-lg bg-accent px-6 py-3 text-white hover:bg-accent/80 transition-colors disabled:opacity-50 mt-4"
              >
                <div className="flex items-center justify-center gap-2">
                  <AiOutlineDownload />
                  <span>{generating ? 'Generating Report...' : 'Generate & Download'}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
