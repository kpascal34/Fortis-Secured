import React from 'react';
import PortalHeader from '../../components/PortalHeader';
import { RiShieldKeyholeLine } from 'react-icons/ri';

const PlaceholderPage = ({ title, description }) => {
  const [notified, setNotified] = React.useState(false);

  const handleNotify = () => {
    setNotified(true);
    setTimeout(() => setNotified(false), 3000);
  };

  return (
    <div className="bg-gradient-to-br from-primary-dark via-night-sky to-night-sky px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <PortalHeader
          title={title}
          description={description}
          eyebrow="Coming Soon"
        >
          <button
            onClick={handleNotify}
            className={`inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition-all hover:border-accent hover:bg-accent/10 ${
              notified ? 'border-accent bg-accent/10' : ''
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            Notify me
          </button>
        </PortalHeader>

        <div className="glass-panel p-8">
          <div className="flex items-center justify-between border-b border-white/10 pb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                <RiShieldKeyholeLine className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Development in Progress</h2>
                <p className="text-sm text-white/70">Scheduled for next release</p>
              </div>
            </div>
            <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              Coming Q1 2026
            </span>
          </div>
          
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-accent" />
              <p className="text-sm text-white/70">Feature specification complete</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-white/40" />
              <p className="text-sm text-white/70">Development roadmap defined</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-white/40" />
              <p className="text-sm text-white/70">User testing planned</p>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-6">
            <button
              className="group inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-accent"
              onClick={() => window.scrollTo(0, 0)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/40 transition-colors group-hover:text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17.25l1.5-.75C14.084 15.217 17.25 12.057 17.25 7.5h-1.5A.75.75 0 0116.5 6h3.75c.414 0 .75.336.75.75v3.75a.75.75 0 01-1.5 0V9c0 5.799-4.097 10.299-9.139 12.148l-.811.402z" />
              </svg>
              Share feedback
            </button>
            <button
              className="group inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-accent"
              onClick={() => window.scrollTo(0, 0)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/40 transition-colors group-hover:text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              Learn more
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Clients = () => <PlaceholderPage title="Clients / CRM" description="Manage client relationships and contracts" />;
export const Scheduling = () => <PlaceholderPage title="Scheduling" description="Manage guard shifts and assignments" />;
export const TimeTracking = () => <PlaceholderPage title="Time Tracking" description="Track and manage guard hours and attendance" />;
export const Tasks = () => <PlaceholderPage title="Tasks" description="Manage and track security tasks and assignments" />;
export const Incidents = () => <PlaceholderPage title="Incidents" description="Report and track security incidents" />;
export const Assets = () => <PlaceholderPage title="Assets" description="Track and manage security equipment and assets" />;
export const Messages = () => <PlaceholderPage title="Messages" description="Internal communication system" />;
export const Finance = () => <PlaceholderPage title="Finance" description="Manage invoices, expenses and financial reports" />;
export const AIAssistant = () => <PlaceholderPage title="AI Assistant" description="AI-powered security assistance" />;
export const UserManagement = () => <PlaceholderPage title="User Management" description="Manage system users and permissions" />;
export const HR = () => <PlaceholderPage title="HR & Compliance" description="Manage employee records and compliance" />;
export const Payroll = () => <PlaceholderPage title="Payroll" description="Process and manage payroll" />;
export const Reports = () => <PlaceholderPage title="Reports" description="Generate and view security reports" />;
export const Settings = () => <PlaceholderPage title="Settings" description="System configuration and preferences" />;