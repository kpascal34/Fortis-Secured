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
      { label: 'Open Incidents', value: 0, helper: '' },
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
      
      // Check if Appwrite is properly configured
      if (config.isDemoMode || !config.clientsCollectionId) {
        // Demo mode - use placeholder data
        setStats(baseStats);
        setClients([
          { name: 'Sample Client 1', location: 'London', status: 'Active', billing: '£50,000/year' },
          { name: 'Sample Client 2', location: 'Manchester', status: 'Active', billing: '£30,000/year' },
        ]);
        setLoading(false);
        return;
      }
      
      // Fetch all metrics in parallel
      const tasksEnabled = Boolean(config.tasksCollectionId);
      const [clientsResponse, shiftsResponse, staffResponse, incidentsResponse, tasksResponse] = await Promise.all([
        databases.listDocuments(config.databaseId, config.clientsCollectionId, [Query.limit(5), Query.orderDesc('$createdAt')]),
        databases.listDocuments(config.databaseId, config.shiftsCollectionId, [Query.limit(100)]).catch(() => ({ documents: [], total: 0 })),
        databases.listDocuments(config.databaseId, config.staffProfilesCollectionId, [Query.limit(100)]).catch(() => ({ documents: [], total: 0 })),
        databases.listDocuments(config.databaseId, config.incidentsCollectionId, [Query.limit(3), Query.orderDesc('$createdAt')]).catch(() => ({ documents: [] })),
        tasksEnabled
          ? databases.listDocuments(config.databaseId, config.tasksCollectionId, [Query.limit(5), Query.orderDesc('updatedAt')]).catch(() => ({ documents: [] }))
          : Promise.resolve({ documents: [] }),
      ]);

      // Process clients
      const clientsData = clientsResponse.documents.map((client) => ({
        name: client.companyName || 'Client',
        location: client.city || client.address || 'Location not provided',
        status: client.status?.charAt(0).toUpperCase() + client.status?.slice(1) || 'Active',
        billing: client.contractValue
          ? `£${parseFloat(client.contractValue).toLocaleString()}/year`
          : null,
      }));
      setClients(clientsData);

      // Calculate metrics
      const totalClients = clientsResponse.total;
      const activeClients = clientsResponse.documents.filter((c) => c.status === 'active').length;
      
      // Active shifts: published and today or future
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const activeShifts = shiftsResponse.documents.filter(shift => {
        const shiftDate = new Date(shift.date || shift.startTime);
        return shift.published && shiftDate >= today;
      }).length;

      // Total guards/staff
      const totalGuards = staffResponse.total;
      const activeGuards = staffResponse.documents.filter(s => s.status === 'active' || s.status === 'pending_compliance').length;

      // Process incidents
      const incidentsData = incidentsResponse.documents.map(inc => ({
        title: inc.title || 'Incident',
        location: inc.site_id || 'Unknown location',
        status: inc.status?.charAt(0).toUpperCase() + inc.status?.slice(1) || 'Open',
        timestamp: inc.reported_at ? new Date(inc.reported_at).toLocaleString('en-GB') : 'Recently',
        summary: inc.description || 'No details provided',
      }));
      setIncidents(incidentsData);

      // Process tasks (if enabled)
      const tasksData = tasksResponse.documents.map((task) => ({
        title: task.title || 'Task',
        status: task.status?.charAt(0).toUpperCase() + task.status?.slice(1) || 'Pending',
        meta: task.description || (task.assignedTo ? `Assigned to ${task.assignedTo}` : 'Unassigned'),
        due: task.dueDate ? `Due ${new Date(task.dueDate).toLocaleDateString('en-GB')}` : '',
      }));
      setTasks(tasksData);

      const openIncidentsCount = incidentsResponse.documents.filter(i => (i.status || 'open').toLowerCase() !== 'resolved').length;
      const pendingTasksCount = tasksData.filter(t => t.status.toLowerCase() === 'pending' || t.status.toLowerCase() === 'in-progress').length;

      setStats([
        { label: 'Total Clients', value: totalClients, helper: activeClients ? `${activeClients} active` : '' },
        { label: 'Active Shifts', value: activeShifts, helper: 'Today onwards' },
        tasksEnabled
          ? { label: 'Pending Tasks', value: pendingTasksCount, helper: tasksData.length ? `${tasksData.length} recent` : '' }
          : { label: 'Open Incidents', value: openIncidentsCount, helper: incidentsData.length ? `${incidentsData.length} recent` : '' },
        { label: 'Total Guards', value: totalGuards, helper: activeGuards ? `${activeGuards} active` : '' },
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
    <div className="fs-page px-6 py-10">
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
            <article key={stat.label} className="fs-card">
              <p className="text-sm text-text-2">{stat.label}</p>
              <p className="mt-2 text-4xl font-bold text-brand">{stat.value}</p>
              {stat.helper && <p className="mt-2 text-xs text-text-3">{stat.helper}</p>}
            </article>
          ))}
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <article className="fs-card">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-text">Clients</h2>
              {syncing ? <span className="text-xs text-text-3">Syncing…</span> : null}
            </div>
            <div className="mt-6 space-y-5">
              {clients.length > 0 ? (
                clients.map((client) => (
                  <div key={client.name} className="group border-b border-border pb-4 last:border-none last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-2 text-sm text-text">
                      <p className="font-semibold transition-colors duration-200 group-hover:text-brand">{client.name}</p>
                      <span className={`text-xs font-semibold uppercase tracking-widest ${statusColours[client.status] || 'text-text-2'}`}>
                        {client.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-text-2">{client.location}</p>
                    {client.billing && <p className="mt-1 text-sm text-brand">{client.billing}</p>}
                  </div>
                ))
              ) : (
                <p className="text-text-3 text-sm py-4">No clients added yet</p>
              )}
            </div>
          </article>

          {/* Only show Tasks section if tasks exist or if tasks feature is enabled */}
          {tasks.length > 0 && (
            <article className="fs-card">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-text">Recent Tasks</h2>
                {syncing ? <span className="text-xs text-text-3">Syncing…</span> : null}
              </div>
              <div className="mt-6 space-y-5">
                {tasks.map((task) => (
                  <div key={`${task.title}-${task.status}`} className="group border-b border-border pb-4 last:border-none last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-2 text-sm text-text">
                      <p className="font-semibold transition-colors duration-200 group-hover:text-brand">{task.title}</p>
                      <span className={`text-xs font-semibold uppercase tracking-widest ${statusColours[task.status] || 'text-text-2'}`}>
                        {task.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-text-2">{task.meta}</p>
                    <p className="mt-1 text-xs text-text-3">{task.due}</p>
                  </div>
                ))}
              </div>
            </article>
          )}
        </section>

        {/* Only show Incidents section if incidents exist */}
        {incidents.length > 0 && (
          <section className="mt-10 fs-card">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-text">Recent Incidents</h2>
              {syncing ? <span className="text-xs text-text-3">Syncing…</span> : null}
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {incidents.map((incident) => (
                <article key={`${incident.title}-${incident.location}`} 
                  className="rounded-2xl border border-border bg-bg-2 p-5 transition-all duration-200 hover:bg-surface-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-text">{incident.title}</h3>
                    <span className={`text-xs font-semibold uppercase tracking-widest ${statusColours[incident.status] || 'text-text-2'}`}>
                      {incident.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-text-2">{incident.location}</p>
                  <p className="mt-1 text-xs text-text-3">{incident.timestamp}</p>
                  <p className="mt-3 text-sm text-text-2">{incident.summary}</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Dashboard;