import React, { useState, useEffect } from 'react';
import { databases, config } from '../../lib/appwrite';
import { Query, ID } from 'appwrite';
import { useAuth } from '../../context/AuthContext';
import PortalHeader from '../../components/PortalHeader';
import { logEvent } from '../../services/auditLogService.js';
import {
  AiOutlinePlus,
  AiOutlineSearch,
  AiOutlineEdit,
  AiOutlineDelete,
  AiOutlineEnvironment,
  AiOutlinePhone,
  AiOutlineMail,
  AiOutlineLoading3Quarters,
  AiOutlineClose,
} from 'react-icons/ai';

const Sites = () => {
  const PAGE_SIZE = 50;
  const { user } = useAuth();
  const [sites, setSites] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('all');

  useEffect(() => {
    fetchData({ append: false });
  }, []);

  const fetchData = async ({ append = false } = {}) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setLoadError('');
      }

      const nextPage = append ? page : 0;
      const [sitesRes, clientsRes] = await Promise.all([
        databases.listDocuments(config.databaseId, config.sitesCollectionId, [
          Query.orderDesc('$createdAt'),
          Query.limit(PAGE_SIZE),
          Query.offset(nextPage * PAGE_SIZE),
        ]),
        databases.listDocuments(config.databaseId, config.clientsCollectionId, [Query.limit(200)]),
      ]);
      const incomingSites = sitesRes.documents;
      const nextSites = append ? [...sites, ...incomingSites] : incomingSites;
      setSites(nextSites);
      setClients(clientsRes.documents);
      setPage(nextPage + 1);
      setHasMore(incomingSites.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoadError(error.message || 'NetworkError: failed to load sites.');
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this site?')) return;
    try {
      await databases.deleteDocument(config.databaseId, config.sitesCollectionId, id);
      await logEvent({
        actorId: user?.$id || 'system',
        action: 'site.deleted',
        resourceType: 'sites',
        resourceId: id,
      });
      setSites(sites.filter((s) => s.$id !== id));
      setFeedback('Site deleted successfully.');
    } catch (error) {
      setFeedback(`Failed to delete site: ${error.message || 'Unknown error'}`);
    }
  };

  const getClientName = (clientId) => {
    return clients.find((c) => c.$id === clientId)?.companyName || 'Unknown';
  };

  const filteredSites = sites.filter((site) => {
    if (filterClient !== 'all' && site.clientId !== filterClient) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        site.siteName?.toLowerCase().includes(search) ||
        site.address?.toLowerCase().includes(search) ||
        site.city?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-dark via-night-sky to-night-sky">
        <AiOutlineLoading3Quarters className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-night-sky to-night-sky px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <PortalHeader title="Sites" description="Manage client sites and locations" eyebrow="Site Management">
          <button
            onClick={() => { setEditingSite(null); setIsModalOpen(true); }}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-night-sky shadow-lg shadow-accent/40 transition-all hover:bg-accent/90"
          >
            <AiOutlinePlus className="h-5 w-5" />
            Add Site
          </button>
        </PortalHeader>

        {loadError && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => {
                setPage(0);
                fetchData({ append: false });
              }}
              className="rounded-md border border-red-300/40 px-3 py-1 text-xs font-semibold text-red-100 hover:bg-red-500/20"
            >
              Retry
            </button>
          </div>
        )}
        {feedback && (
          <div className="mb-4 rounded-lg border border-white/20 bg-white/5 p-3 text-sm text-white/90">
            {feedback}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <div className="relative flex-1">
            <AiOutlineSearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search sites..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
            />
          </div>
          <select
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
          >
            <option value="all">All Clients</option>
            {clients.map((c) => (
              <option key={c.$id} value={c.$id}>
                {c.companyName}
              </option>
            ))}
          </select>
        </div>

        {/* Sites List */}
        <div className="space-y-4">
          {filteredSites.length === 0 ? (
            <div className="glass-panel p-8 text-center text-white/70">
              No sites found for the selected filters.
            </div>
          ) : filteredSites.map((site) => (
            <div key={site.$id} className="glass-panel p-6 transition-all hover:border-accent/30">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white">{site.siteName}</h3>
                  <p className="mt-1 text-sm text-accent">{getClientName(site.clientId)}</p>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <AiOutlineEnvironment className="h-4 w-4 text-accent" />
                      {site.address}, {site.city} {site.postcode}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingSite(site); setIsModalOpen(true); }}
                    className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/70 hover:border-accent hover:text-accent"
                  >
                    <AiOutlineEdit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(site.$id)}
                    className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/70 hover:border-red-500 hover:text-red-400"
                  >
                    <AiOutlineDelete className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {hasMore && (
            <div className="pt-2 text-center">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => fetchData({ append: true })}
                className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <SiteFormModal
          site={editingSite}
          clients={clients}
          actorId={user?.$id}
          onClose={(refresh) => {
            setIsModalOpen(false);
            if (refresh) {
              setPage(0);
              fetchData({ append: false });
            }
          }}
        />
      )}
    </div>
  );
};

const SiteFormModal = ({ site, clients, actorId, onClose }) => {
  const [formData, setFormData] = useState({
    clientId: site?.clientId || '',
    siteName: site?.siteName || '',
    address: site?.address || '',
    city: site?.city || '',
    postcode: site?.postcode || '',
    gpsLat: site?.gpsLat || '',
    gpsLng: site?.gpsLng || '',
    siteNotes: site?.siteNotes || '',
    accessInstructions: site?.accessInstructions || '',
    status: site?.status || 'active',
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      if (site) {
        await databases.updateDocument(config.databaseId, config.sitesCollectionId, site.$id, formData);
        await logEvent({
          actorId: actorId || 'system',
          action: 'site.updated',
          resourceType: 'sites',
          resourceId: site.$id,
          clientId: formData.clientId || null,
          metadata: { siteName: formData.siteName },
        });
      } else {
        const created = await databases.createDocument(config.databaseId, config.sitesCollectionId, ID.unique(), formData);
        await logEvent({
          actorId: actorId || 'system',
          action: 'site.created',
          resourceType: 'sites',
          resourceId: created.$id,
          clientId: formData.clientId || null,
          metadata: { siteName: formData.siteName },
        });
      }
      onClose(true);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to save site.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-gradient-to-br from-primary-dark to-night-sky p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">{site ? 'Edit Site' : 'Add New Site'}</h2>
          <button onClick={() => onClose(false)} className="rounded-lg p-2 text-white/70 hover:bg-white/10">
            <AiOutlineClose className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMessage && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {errorMessage}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm text-white/70">
                Client <span className="text-red-400">*</span>
              </label>
              <select
                required
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
              >
                <option value="">Select client</option>
                {clients.map((c) => (
                  <option key={c.$id} value={c.$id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm text-white/70">
                Site Name <span className="text-red-400">*</span>
              </label>
              <input
                required
                type="text"
                value={formData.siteName}
                onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
                placeholder="e.g., Tesco DC - Bradford"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm text-white/70">
                Address <span className="text-red-400">*</span>
              </label>
              <input
                required
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/70">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/70">Postcode</label>
              <input
                type="text"
                value={formData.postcode}
                onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
              />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-white/70">Site Notes</label>
              <textarea
                rows={3}
                value={formData.siteNotes}
                onChange={(e) => setFormData({ ...formData, siteNotes: e.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm text-white/70">Access Instructions</label>
              <textarea
                rows={3}
                value={formData.accessInstructions}
                onChange={(e) => setFormData({ ...formData, accessInstructions: e.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-night-sky hover:bg-accent/90 disabled:opacity-50"
            >
              {loading ? 'Saving...' : site ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Sites;
