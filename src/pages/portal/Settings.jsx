import React, { useState } from 'react';
import {
  AiOutlineSetting,
  AiOutlineUser,
  AiOutlineBell,
  AiOutlineSafety,
  AiOutlineGlobal,
  AiOutlineDatabase,
  AiOutlineMail,
  AiOutlineApi,
  AiOutlineKey,
  AiOutlineCheck,
  AiOutlineClose,
} from 'react-icons/ai';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    // General Settings
    companyName: 'Fortis Secured',
    timezone: 'Europe/London',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    currency: 'GBP',
    language: 'en',

    // Notification Settings
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    incidentAlerts: true,
    shiftReminders: true,
    reportNotifications: true,
    clientUpdates: true,

    // Security Settings
    twoFactorAuth: false,
    sessionTimeout: 30,
    passwordExpiry: 90,
    loginAttempts: 5,
    ipRestriction: false,
    auditLogging: true,

    // Integration Settings
    siaApiEnabled: false,
    siaApiKey: '',
    payrollIntegration: false,
    accountingSystem: 'none',
    calendarSync: false,

    // Email Settings
    smtpHost: '',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    smtpEncryption: 'tls',
    fromEmail: 'noreply@fortissecured.com',
    fromName: 'Fortis Secured',

    // Operational Settings
    autoApproveTimesheets: false,
    requireIncidentPhotos: true,
    mandatoryCheckInOut: true,
    gpsTracking: true,
    breakDuration: 30,
    overtimeThreshold: 40,
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Simulate save
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  const tabs = [
    { id: 'general', label: 'General', icon: AiOutlineSetting },
    { id: 'notifications', label: 'Notifications', icon: AiOutlineBell },
    { id: 'security', label: 'Security', icon: AiOutlineSafety },
    { id: 'integrations', label: 'Integrations', icon: AiOutlineApi },
    { id: 'email', label: 'Email', icon: AiOutlineMail },
    { id: 'operations', label: 'Operations', icon: AiOutlineGlobal },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="mt-2 text-white/70">Configure your system preferences</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 rounded-lg bg-green-500/20 border border-green-500/50 px-4 py-2">
            <AiOutlineCheck className="text-green-500" />
            <span className="text-sm text-green-500">Settings saved successfully</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-accent text-white'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            <tab.icon className="text-lg" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Settings Content */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">General Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Company Name</label>
                  <input
                    type="text"
                    value={settings.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Timezone</label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => handleChange('timezone', e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Europe/Paris">Paris (CET)</option>
                    <option value="America/New_York">New York (EST)</option>
                    <option value="Asia/Dubai">Dubai (GST)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Date Format</label>
                  <select
                    value={settings.dateFormat}
                    onChange={(e) => handleChange('dateFormat', e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Time Format</label>
                  <select
                    value={settings.timeFormat}
                    onChange={(e) => handleChange('timeFormat', e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="24h">24 Hour</option>
                    <option value="12h">12 Hour (AM/PM)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Currency</label>
                  <select
                    value={settings.currency}
                    onChange={(e) => handleChange('currency', e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="GBP">GBP (£)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="AED">AED (د.إ)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Language</label>
                  <select
                    value={settings.language}
                    onChange={(e) => handleChange('language', e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="en">English</option>
                    <option value="ar">Arabic</option>
                    <option value="fr">French</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notification Settings */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Notification Preferences</h2>
              <div className="space-y-4">
                {[
                  { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive notifications via email' },
                  { key: 'smsNotifications', label: 'SMS Notifications', desc: 'Receive notifications via SMS' },
                  { key: 'pushNotifications', label: 'Push Notifications', desc: 'Receive browser push notifications' },
                  { key: 'incidentAlerts', label: 'Incident Alerts', desc: 'Get notified when incidents are reported' },
                  { key: 'shiftReminders', label: 'Shift Reminders', desc: 'Receive reminders before shifts start' },
                  { key: 'reportNotifications', label: 'Report Notifications', desc: 'Get notified when reports are generated' },
                  { key: 'clientUpdates', label: 'Client Updates', desc: 'Receive updates about client activities' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 p-4">
                    <div>
                      <p className="font-medium text-white">{item.label}</p>
                      <p className="text-sm text-white/50">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={settings[item.key]}
                        onChange={(e) => handleChange(item.key, e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-white/20 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-white/20 after:bg-white after:transition-all after:content-[''] peer-checked:bg-accent peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Security Settings</h2>
              
              <div className="space-y-4 mb-6">
                {[
                  { key: 'twoFactorAuth', label: 'Two-Factor Authentication', desc: 'Require 2FA for all users' },
                  { key: 'ipRestriction', label: 'IP Restriction', desc: 'Restrict access to specific IP addresses' },
                  { key: 'auditLogging', label: 'Audit Logging', desc: 'Log all system activities' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 p-4">
                    <div>
                      <p className="font-medium text-white">{item.label}</p>
                      <p className="text-sm text-white/50">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={settings[item.key]}
                        onChange={(e) => handleChange(item.key, e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-white/20 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-white/20 after:bg-white after:transition-all after:content-[''] peer-checked:bg-accent peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent"></div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Session Timeout (minutes)</label>
                  <input
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Password Expiry (days)</label>
                  <input
                    type="number"
                    value={settings.passwordExpiry}
                    onChange={(e) => handleChange('passwordExpiry', parseInt(e.target.value))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Max Login Attempts</label>
                  <input
                    type="number"
                    value={settings.loginAttempts}
                    onChange={(e) => handleChange('loginAttempts', parseInt(e.target.value))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Integration Settings */}
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Third-Party Integrations</h2>
              
              <div className="space-y-6">
                {/* SIA API */}
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-medium text-white">SIA License Verification API</p>
                      <p className="text-sm text-white/50">Automatically verify guard SIA licenses</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={settings.siaApiEnabled}
                        onChange={(e) => handleChange('siaApiEnabled', e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-white/20 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-white/20 after:bg-white after:transition-all after:content-[''] peer-checked:bg-accent peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent"></div>
                    </label>
                  </div>
                  {settings.siaApiEnabled && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white">API Key</label>
                      <input
                        type="password"
                        value={settings.siaApiKey}
                        onChange={(e) => handleChange('siaApiKey', e.target.value)}
                        placeholder="Enter your SIA API key"
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  )}
                </div>

                {/* Payroll Integration */}
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-medium text-white">Payroll Integration</p>
                      <p className="text-sm text-white/50">Sync timesheets with payroll system</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={settings.payrollIntegration}
                        onChange={(e) => handleChange('payrollIntegration', e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-white/20 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-white/20 after:bg-white after:transition-all after:content-[''] peer-checked:bg-accent peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent"></div>
                    </label>
                  </div>
                </div>

                {/* Accounting System */}
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <div className="mb-4">
                    <p className="font-medium text-white">Accounting System</p>
                    <p className="text-sm text-white/50">Connect to your accounting software</p>
                  </div>
                  <select
                    value={settings.accountingSystem}
                    onChange={(e) => handleChange('accountingSystem', e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="none">None</option>
                    <option value="xero">Xero</option>
                    <option value="quickbooks">QuickBooks</option>
                    <option value="sage">Sage</option>
                  </select>
                </div>

                {/* Calendar Sync */}
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Calendar Sync</p>
                      <p className="text-sm text-white/50">Sync shifts with Google Calendar</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={settings.calendarSync}
                        onChange={(e) => handleChange('calendarSync', e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-white/20 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-white/20 after:bg-white after:transition-all after:content-[''] peer-checked:bg-accent peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Email Settings */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Email Configuration</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">SMTP Host</label>
                  <input
                    type="text"
                    value={settings.smtpHost}
                    onChange={(e) => handleChange('smtpHost', e.target.value)}
                    placeholder="smtp.example.com"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">SMTP Port</label>
                  <input
                    type="number"
                    value={settings.smtpPort}
                    onChange={(e) => handleChange('smtpPort', parseInt(e.target.value))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">SMTP Username</label>
                  <input
                    type="text"
                    value={settings.smtpUsername}
                    onChange={(e) => handleChange('smtpUsername', e.target.value)}
                    placeholder="username@example.com"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">SMTP Password</label>
                  <input
                    type="password"
                    value={settings.smtpPassword}
                    onChange={(e) => handleChange('smtpPassword', e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Encryption</label>
                  <select
                    value={settings.smtpEncryption}
                    onChange={(e) => handleChange('smtpEncryption', e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="none">None</option>
                    <option value="ssl">SSL</option>
                    <option value="tls">TLS</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">From Email</label>
                  <input
                    type="email"
                    value={settings.fromEmail}
                    onChange={(e) => handleChange('fromEmail', e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">From Name</label>
                  <input
                    type="text"
                    value={settings.fromName}
                    onChange={(e) => handleChange('fromName', e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              <div className="mt-6">
                <button className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors">
                  Send Test Email
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Operations Settings */}
        {activeTab === 'operations' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Operational Settings</h2>
              
              <div className="space-y-4 mb-6">
                {[
                  { key: 'autoApproveTimesheets', label: 'Auto-Approve Timesheets', desc: 'Automatically approve timesheets without review' },
                  { key: 'requireIncidentPhotos', label: 'Require Incident Photos', desc: 'Make photos mandatory for incident reports' },
                  { key: 'mandatoryCheckInOut', label: 'Mandatory Check-In/Out', desc: 'Require guards to check in and out of shifts' },
                  { key: 'gpsTracking', label: 'GPS Tracking', desc: 'Track guard location during shifts' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 p-4">
                    <div>
                      <p className="font-medium text-white">{item.label}</p>
                      <p className="text-sm text-white/50">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={settings[item.key]}
                        onChange={(e) => handleChange(item.key, e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-white/20 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-white/20 after:bg-white after:transition-all after:content-[''] peer-checked:bg-accent peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent"></div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Break Duration (minutes)</label>
                  <input
                    type="number"
                    value={settings.breakDuration}
                    onChange={(e) => handleChange('breakDuration', parseInt(e.target.value))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Overtime Threshold (hours/week)</label>
                  <input
                    type="number"
                    value={settings.overtimeThreshold}
                    onChange={(e) => handleChange('overtimeThreshold', parseInt(e.target.value))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={() => setSettings({ ...settings })}
            className="rounded-lg bg-white/10 px-6 py-2 text-white hover:bg-white/20 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-accent px-6 py-2 text-white hover:bg-accent/80 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
