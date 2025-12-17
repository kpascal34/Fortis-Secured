import React, { useState } from 'react';
import { demoGuards, activeDemoGuards } from '../../data/demoGuards';
import { parseNumber, formatCurrency, formatHours } from '../../lib/validation';
import {
  AiOutlineDollar,
  AiOutlineCalendar,
  AiOutlineClockCircle,
  AiOutlineCheckCircle,
  AiOutlineWarning,
  AiOutlineFileText,
  AiOutlineDownload,
  AiOutlineUser,
  AiOutlineBank,
} from 'react-icons/ai';

const Payroll = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [viewMode, setViewMode] = useState('summary');

  const payrollPeriods = [
    { id: 'current', label: 'Current Period', dateRange: '01 Dec - 15 Dec 2025' },
    { id: 'previous', label: 'Previous Period', dateRange: '16 Nov - 30 Nov 2025' },
    { id: 'november', label: 'November 2025', dateRange: '01 Nov - 30 Nov 2025' },
  ];

  const payrollData = activeDemoGuards.map((guard, index) => {
    const regularHours = 80 + Math.floor(Math.random() * 20);
    const overtimeHours = Math.floor(Math.random() * 10);
    const hourlyRate = 12.5 + Math.random() * 5;
    const overtimeRate = hourlyRate * 1.5;
    const regularPay = regularHours * hourlyRate;
    const overtimePay = overtimeHours * overtimeRate;
    const grossPay = regularPay + overtimePay;
    const tax = grossPay * 0.2;
    const ni = grossPay * 0.12;
    const netPay = grossPay - tax - ni;

    return {
      guardId: guard.$id,
      name: `${guard.firstName} ${guard.lastName}`,
      regularHours,
      overtimeHours,
      hourlyRate: parseNumber(hourlyRate),
      overtimeRate: parseNumber(overtimeRate),
      regularPay: parseNumber(regularPay),
      overtimePay: parseNumber(overtimePay),
      grossPay: parseNumber(grossPay),
      tax: parseNumber(tax),
      ni: parseNumber(ni),
      netPay: parseNumber(netPay),
      status: index % 3 === 0 ? 'processed' : 'pending',
      bankAccount: '**** **** **** ' + Math.floor(1000 + Math.random() * 9000),
    };
  });

  const totalStats = {
    totalGross: parseNumber(payrollData.reduce((sum, p) => sum + parseNumber(p.grossPay), 0)),
    totalNet: parseNumber(payrollData.reduce((sum, p) => sum + parseNumber(p.netPay), 0)),
    totalTax: parseNumber(payrollData.reduce((sum, p) => sum + parseNumber(p.tax), 0)),
    totalNI: parseNumber(payrollData.reduce((sum, p) => sum + parseNumber(p.ni), 0)),
    totalHours: payrollData.reduce((sum, p) => sum + p.regularHours + p.overtimeHours, 0),
  };

  const stats = [
    { label: 'Total Gross Pay', value: formatCurrency(totalStats.totalGross), icon: AiOutlineDollar, color: 'blue' },
    { label: 'Total Net Pay', value: formatCurrency(totalStats.totalNet), icon: AiOutlineBank, color: 'green' },
    { label: 'Total Hours', value: formatHours(totalStats.totalHours), icon: AiOutlineClockCircle, color: 'yellow' },
    { label: 'Staff Count', value: payrollData.length, icon: AiOutlineUser, color: 'purple' },
  ];

  const payrollHistory = [
    { period: 'November 2025', grossPay: '£12,450', netPay: '£8,850', staff: 7, status: 'Paid' },
    { period: 'October 2025', grossPay: '£11,890', netPay: '£8,450', staff: 7, status: 'Paid' },
    { period: 'September 2025', grossPay: '£12,100', netPay: '£8,600', staff: 6, status: 'Paid' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Payroll Management</h1>
          <p className="mt-2 text-white/70">Process and manage staff payments</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="rounded-lg border border-white/10 bg-night-sky px-4 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {payrollPeriods.map((period) => (
              <option key={period.id} value={period.id}>
                {period.label} - {period.dateRange}
              </option>
            ))}
          </select>
          <button className="rounded-lg bg-accent px-6 py-2 text-white hover:bg-accent/80 transition-colors">
            Process Payroll
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
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

      {/* View Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('summary')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            viewMode === 'summary'
              ? 'bg-accent text-white'
              : 'bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          Summary View
        </button>
        <button
          onClick={() => setViewMode('detailed')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            viewMode === 'detailed'
              ? 'bg-accent text-white'
              : 'bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          Detailed View
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payroll Details */}
        <div className="lg:col-span-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            {viewMode === 'summary' ? 'Payroll Summary' : 'Detailed Breakdown'}
          </h2>

          {viewMode === 'summary' ? (
            <div className="space-y-3">
              {payrollData.map((payroll) => (
                <div
                  key={payroll.guardId}
                  className="rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20">
                        <AiOutlineUser className="text-accent" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{payroll.name}</p>
                        <p className="text-sm text-white/60 mt-1">
                          {payroll.regularHours}h regular + {payroll.overtimeHours}h overtime
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-white">{formatCurrency(payroll.netPay)}</p>
                      <p className="text-sm text-white/60">Net Pay</p>
                      <span
                        className={`inline-block mt-2 rounded-full px-3 py-1 text-xs ${
                          payroll.status === 'processed'
                            ? 'bg-green-500/20 text-green-500'
                            : 'bg-yellow-500/20 text-yellow-500'
                        }`}
                      >
                        {payroll.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="pb-3 text-left text-sm font-medium text-white/70">Name</th>
                    <th className="pb-3 text-right text-sm font-medium text-white/70">Regular</th>
                    <th className="pb-3 text-right text-sm font-medium text-white/70">OT</th>
                    <th className="pb-3 text-right text-sm font-medium text-white/70">Gross</th>
                    <th className="pb-3 text-right text-sm font-medium text-white/70">Tax</th>
                    <th className="pb-3 text-right text-sm font-medium text-white/70">NI</th>
                    <th className="pb-3 text-right text-sm font-medium text-white/70">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollData.map((payroll) => (
                    <tr key={payroll.guardId} className="border-b border-white/5">
                      <td className="py-3 text-sm text-white">{payroll.name}</td>
                      <td className="py-3 text-right text-sm text-white/70">£{payroll.regularPay}</td>
                      <td className="py-3 text-right text-sm text-white/70">£{payroll.overtimePay}</td>
                      <td className="py-3 text-right text-sm text-white">£{payroll.grossPay}</td>
                      <td className="py-3 text-right text-sm text-red-400">-£{payroll.tax}</td>
                      <td className="py-3 text-right text-sm text-red-400">-£{payroll.ni}</td>
                      <td className="py-3 text-right text-sm font-semibold text-green-500">£{payroll.netPay}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-white/20">
                    <td className="py-3 text-sm font-semibold text-white">Total</td>
                    <td className="py-3 text-right text-sm text-white/70">-</td>
                    <td className="py-3 text-right text-sm text-white/70">-</td>
                    <td className="py-3 text-right text-sm font-semibold text-white">£{totalStats.totalGross}</td>
                    <td className="py-3 text-right text-sm font-semibold text-red-400">-£{totalStats.totalTax}</td>
                    <td className="py-3 text-right text-sm font-semibold text-red-400">-£{totalStats.totalNI}</td>
                    <td className="py-3 text-right text-sm font-bold text-green-500">£{totalStats.totalNet}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors flex items-center gap-2">
              <AiOutlineDownload />
              Export CSV
            </button>
            <button className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors flex items-center gap-2">
              <AiOutlineFileText />
              Generate Report
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Period Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-white/70">Gross Pay</span>
                <span className="text-sm font-semibold text-white">£{totalStats.totalGross}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-white/70">Tax Deductions</span>
                <span className="text-sm text-red-400">-£{totalStats.totalTax}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-white/70">NI Contributions</span>
                <span className="text-sm text-red-400">-£{totalStats.totalNI}</span>
              </div>
              <div className="border-t border-white/10 pt-3 flex justify-between">
                <span className="text-sm font-semibold text-white">Net Pay</span>
                <span className="text-lg font-bold text-green-500">£{totalStats.totalNet}</span>
              </div>
            </div>
          </div>

          {/* Payroll History */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Payroll History</h3>
            <div className="space-y-3">
              {payrollHistory.map((history, index) => (
                <div key={index} className="rounded-lg bg-white/5 border border-white/10 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-white">{history.period}</p>
                    <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-500">
                      {history.status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">Net Pay:</span>
                      <span className="text-white/70">{history.netPay}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">Staff:</span>
                      <span className="text-white/70">{history.staff} guards</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full rounded-lg bg-accent/20 border border-accent/50 px-4 py-2 text-sm text-accent hover:bg-accent/30 transition-colors">
                Submit to HMRC
              </button>
              <button className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors">
                Generate Payslips
              </button>
              <button className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors">
                Export to Accounting
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payroll;
