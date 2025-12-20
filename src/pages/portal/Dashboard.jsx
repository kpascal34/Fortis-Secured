import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import PortalHeader from '../../components/PortalHeader';
import { databases, config } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { trackModuleAccess } from '../../lib/analyticsUtils';

const statusColours = {
  Pending: 'text-amber-400',
  pending: 'text-amber-400',
  'In Progress': 'text-emerald-400',
  Active: 'text-emerald-400',
  active: 'text-emerald-400',
  Completed: 'text-indigo-400',
  Resolved: 'text-indigo-400',
  Investigating: 'text-amber-400',
  Overdue: 'text-rose-400',
  inactive: 'text-gray-400',
};

const Dashboard = () => {
  const { user } = useAuth();
  const baseStats = React.useMemo(
    () => [
      { label: 'Total Clients', value: 0, helper: '' },
      { label: 'Active Shifts', value: 0, helper: '' },
      { label: 'Pending Tasks', value: 0, helper: '' },
      { label: 'Total Guards', value: 0, helper: '' },
    ],
    []
  );

  const [stats, setStats] = React.useState(baseStats);
  const [clients, setClients] = React.useState([]);
  const [tasks, setTasks] = React.useState([]);
  const [incidents, setIncidents] = React.useState([]);
  const [syncing, setSyncing] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    // Track dashboard access
    trackModuleAccess('dashboard', user);
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setSyncing(true);
      setError('');
      
      const clientsResponse = await databases.listDocuments(
        config.databaseId,
        config.clientsCollectionId,
        [Query.limit(5), Query.orderDesc('$createdAt')]
      );

      const clientsData = clientsResponse.documents.map((client) => ({
        name: client.companyName || 'Client',
        location: client.city || client.address || 'Location not provided',
        status: client.status?.charAt(0).toUpperCase() + client.status?.slice(1) || 'Active',
        billing: client.contractValue
          ? `£${parseFloat(client.contractValue).toLocaleString()}/year`
          : null,
      }));

      setClients(clientsData);

      const totalClients = clientsResponse.total;
      const activeClients = clientsResponse.documents.filter((c) => c.status === 'active').length;

      setStats([
        { label: 'Total Clients', value: totalClients, helper: activeClients ? `${activeClients} active` : '' },
        ...baseStats.slice(1),
      ]);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Unable to load dashboard data. Connect Appwrite to display live metrics.');
      setClients([]);
      setStats(baseStats);
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-primary-dark via-night-sky to-night-sky px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <PortalHeader
          title="Dashboard"
          description="Security Management Overview"
          eyebrow={user?.role || 'Operations'}
        />

        {error && (
          <div className="mb-6 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-6 py-4 text-sm text-amber-200">
            {error}
          </div>
        )}

        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <article key={stat.label} className="glass-panel p-6 transition-all duration-200 hover:bg-white/10">
              <p className="text-sm text-white/60">{stat.label}</p>
              <p className="mt-2 text-4xl font-bold text-accent">{stat.value}</p>
              {stat.helper && <p className="mt-2 text-xs text-white/50">{stat.helper}</p>}
            </article>
          ))}
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <article className="glass-panel p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-white">Clients</h2>
              {syncing ? <span className="text-xs text-white/50">Syncing…</span> : null}
            </div>
            <div className="mt-6 space-y-5">
              {clients.map((client) => (
                <div key={client.name} className="group border-b border-white/10 pb-4 last:border-none last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-2 text-sm text-white">
                    <p className="font-semibold transition-colors duration-200 group-hover:text-accent">{client.name}</p>
                    <span className={`text-xs font-semibold uppercase tracking-widest ${statusColours[client.status] || 'text-white/70'}`}>
                      {client.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-white/70">{client.location}</p>
                  {client.billing && <p className="mt-1 text-sm text-accent">{client.billing}</p>}
                </div>
              ))}
            </div>
          </article>

          <article className="glass-panel p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-white">Recent Tasks</h2>
              {syncing ? <span className="text-xs text-white/50">Syncing…</span> : null}
            </div>
            <div className="mt-6 space-y-5">
              {tasks.map((task) => (
                <div key={`${task.title}-${task.status}`} className="group border-b border-white/10 pb-4 last:border-none last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-2 text-sm text-white">
                    <p className="font-semibold transition-colors duration-200 group-hover:text-accent">{task.title}</p>
                    <span className={`text-xs font-semibold uppercase tracking-widest ${statusColours[task.status] || 'text-white/70'}`}>
                      {task.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-white/70">{task.meta}</p>
                  <p className="mt-1 text-xs text-white/40">{task.due}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-10 glass-panel p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-white">Recent Incidents</h2>
            {syncing ? <span className="text-xs text-white/50">Syncing…</span> : null}
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {incidents.map((incident) => (
              <article key={`${incident.title}-${incident.location}`} 
                className="rounded-2xl border border-white/10 bg-white/5 p-5 transition-all duration-200 hover:border-accent/30 hover:bg-white/10">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white">{incident.title}</h3>
                  <span className={`text-xs font-semibold uppercase tracking-widest ${statusColours[incident.status] || 'text-white/70'}`}>
                    {incident.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-white/60">{incident.location}</p>
                <p className="mt-1 text-xs text-white/40">{incident.timestamp}</p>
                <p className="mt-3 text-sm text-white/70">{incident.summary}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;