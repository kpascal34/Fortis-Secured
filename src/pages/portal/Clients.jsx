import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalHeader from '../../components/PortalHeader';
import ClientFormModal from '../../components/ClientFormModal';
import { databases, config } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../lib/rbac.ts';
import { logEvent } from '../../services/auditLogService.js';
import { notifyInviteSent } from '../../services/notificationService.js';
import {
  AiOutlineSearch,
  AiOutlinePlus,
  AiOutlineEdit,
  AiOutlineDelete,
  AiOutlineEye,
  AiOutlinePhone,
  AiOutlineMail,
  AiOutlineEnvironment,
  AiOutlineCalendar,
  AiOutlineFileDone,
  AiOutlineLoading3Quarters,
  AiOutlineSend,
} from 'react-icons/ai';

const PAGE_SIZE = 50;

const Clients = () => {
  const { user, resolvedRole, permissions } = useAuth();
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [resendingInviteFor, setResendingInviteFor] = useState(null);

  const canManageUsers = can('manageUsers', { role: user?.role, resolvedRole, permissions });

  useEffect(() => {
    if (!user?.$id) return;
    fetchClients({ append: false });
  }, [canManageUsers, user?.$id]);

  useEffect(() => {
    filterClients();
  }, [clients, searchTerm, statusFilter]);

  const fetchClients = async ({ append = false } = {}) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setLoadError('');
      }

      const nextPage = append ? page : 0;
      const queries = [
        Query.orderDesc('$createdAt'),
        Query.limit(PAGE_SIZE),
        Query.offset(nextPage * PAGE_SIZE),
      ];

      if (!canManageUsers && user?.$id) {
        queries.push(Query.equal('userId', user.$id));
      }

      const response = await databases.listDocuments(
        config.databaseId,
        config.clientsCollectionId,
        queries
      );

      const incoming = response.documents;
      const nextClients = append ? [...clients, ...incoming] : incoming;
      setClients(nextClients);
      setFilteredClients(nextClients);
      setPage(nextPage + 1);
      setHasMore(incoming.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setLoadError(error.message || 'NetworkError: failed to load clients.');
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  const filterClients = () => {
    let filtered = [...clients];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (client) =>
          client.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((client) => client.status === statusFilter);
    }

    setFilteredClients(filtered);
  };

  const handleAddClient = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  const handleEditClient = (client) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleDeleteClient = async (clientId) => {
    if (!window.confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      return;
    }

    console.log('Attempting to delete client:', clientId);
    console.log('Database ID:', config.databaseId);
    console.log('Collection ID:', config.clientsCollectionId);

    try {
      setIsDeleting(clientId);
      await databases.deleteDocument(
        config.databaseId,
        config.clientsCollectionId,
        clientId
      );
      await logEvent({
        actorId: user?.$id || 'system',
        action: 'client.deleted',
        resourceType: 'clients',
        resourceId: clientId,
        clientId,
      });
      setClients(clients.filter((c) => c.$id !== clientId));
      setFeedback('Client deleted successfully.');
    } catch (error) {
      console.error('Full error object:', error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error type:', error.type);
      setFeedback(`Failed to delete client: ${error.message || 'Unknown error.'}`);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleModalClose = (shouldRefresh) => {
    setIsModalOpen(false);
    setEditingClient(null);
    if (shouldRefresh) {
      setPage(0);
      fetchClients({ append: false });
    }
  };

  const handleResendClientInvite = async (client) => {
    if (!client?.email) {
      setFeedback('PermissionDenied: client has no email address for invite.');
      return;
    }

    try {
      setResendingInviteFor(client.$id);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await notifyInviteSent({
        toEmail: client.email,
        inviteCode: client.$id,
        signupUrl: `${window.location.origin}/portal`,
        expiresAt: expiresAt.toISOString(),
        clientId: client.$id,
        siteId: null,
        userId: client.userId || null,
      });

      setFeedback(`Invite queued for ${client.companyName || client.email}.`);
    } catch (error) {
      console.error('Failed to enqueue client invite:', error);
      setFeedback(`Failed to queue invite: ${error.message || 'Unknown error'}`);
    } finally {
      setResendingInviteFor(null);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-500/10 text-green-400 border-green-500/20',
      inactive: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    };
    return styles[status] || styles.active;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-dark via-night-sky to-night-sky">
        <div className="flex flex-col items-center gap-4">
          <AiOutlineLoading3Quarters className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-white/70">Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-night-sky to-night-sky px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <PortalHeader
          title="Clients / CRM"
          description="Manage client relationships, contracts, and site information"
          eyebrow="Client Management"
        >
          {canManageUsers && (
            <button
              onClick={handleAddClient}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-night-sky shadow-lg shadow-accent/40 transition-all hover:bg-accent/90"
            >
              <AiOutlinePlus className="h-5 w-5" />
              Add Client
            </button>
          )}
        </PortalHeader>

        {loadError && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => {
                setPage(0);
                fetchClients({ append: false });
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

        {/* Search and Filter Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <AiOutlineSearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search clients by name, contact, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {/* Stats Overview */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="glass-panel p-6">
            <p className="text-sm text-white/70">Total Clients</p>
            <p className="mt-2 text-3xl font-bold text-white">{clients.length}</p>
          </div>
          <div className="glass-panel p-6">
            <p className="text-sm text-white/70">Active Contracts</p>
            <p className="mt-2 text-3xl font-bold text-green-400">
              {clients.filter((c) => c.status === 'active').length}
            </p>
          </div>
          <div className="glass-panel p-6">
            <p className="text-sm text-white/70">Pending</p>
            <p className="mt-2 text-3xl font-bold text-yellow-400">
              {clients.filter((c) => c.status === 'pending').length}
            </p>
          </div>
          <div className="glass-panel p-6">
            <p className="text-sm text-white/70">Inactive</p>
            <p className="mt-2 text-3xl font-bold text-gray-400">
              {clients.filter((c) => c.status === 'inactive').length}
            </p>
          </div>
        </div>

        {/* Clients List */}
        {filteredClients.length === 0 ? (
          <div className="glass-panel p-12 text-center">
            <p className="text-white/70">
              {searchTerm || statusFilter !== 'all'
                ? 'No clients found matching your filters.'
                : 'No clients yet. Click "Add Client" to get started.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredClients.map((client) => (
              <div key={client.$id} className="glass-panel overflow-hidden transition-all hover:border-accent/30">
                <div className="p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    {/* Client Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-semibold text-white">{client.companyName}</h3>
                          <p className="mt-1 text-sm text-white/70">{client.industry || 'Industry not specified'}</p>
                        </div>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadge(
                            client.status
                          )}`}
                        >
                          {client.status?.charAt(0).toUpperCase() + client.status?.slice(1) || 'Active'}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="flex items-center gap-2 text-sm text-white/70">
                          <AiOutlinePhone className="h-4 w-4 text-accent" />
                          {client.phone || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-white/70">
                          <AiOutlineMail className="h-4 w-4 text-accent" />
                          {client.email || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-white/70">
                          <AiOutlineEnvironment className="h-4 w-4 text-accent" />
                          {client.address || 'Address not provided'}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-white/70">
                          <AiOutlineFileDone className="h-4 w-4 text-accent" />
                          Contact: {client.contactPerson || 'N/A'}
                        </div>
                      </div>

                      {client.contractStartDate && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-white/70">
                          <AiOutlineCalendar className="h-4 w-4 text-accent" />
                          Contract: {new Date(client.contractStartDate).toLocaleDateString()} -{' '}
                          {client.contractEndDate
                            ? new Date(client.contractEndDate).toLocaleDateString()
                            : 'Ongoing'}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/portal/clients/${client.$id}`}
                        className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/70 transition-all hover:border-accent hover:bg-accent/10 hover:text-accent"
                        title="View Details"
                      >
                        <AiOutlineEye className="h-5 w-5" />
                      </Link>
                      {canManageUsers && (
                        <>
                          <button
                            onClick={() => handleResendClientInvite(client)}
                            disabled={resendingInviteFor === client.$id}
                            className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/70 transition-all hover:border-accent hover:bg-accent/10 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                            title="Send Portal Invite"
                          >
                            {resendingInviteFor === client.$id ? (
                              <AiOutlineLoading3Quarters className="h-5 w-5 animate-spin" />
                            ) : (
                              <AiOutlineSend className="h-5 w-5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleEditClient(client)}
                            className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/70 transition-all hover:border-accent hover:bg-accent/10 hover:text-accent"
                            title="Edit Client"
                          >
                            <AiOutlineEdit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.$id)}
                            disabled={isDeleting === client.$id}
                            className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/70 transition-all hover:border-red-500 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Delete Client"
                          >
                            {isDeleting === client.$id ? (
                              <AiOutlineLoading3Quarters className="h-5 w-5 animate-spin" />
                            ) : (
                              <AiOutlineDelete className="h-5 w-5" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {hasMore && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => fetchClients({ append: true })}
                  className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
                >
                  {loadingMore ? 'Loading…' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Client Form Modal */}
      {isModalOpen && (
        <ClientFormModal
          client={editingClient}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default Clients;
