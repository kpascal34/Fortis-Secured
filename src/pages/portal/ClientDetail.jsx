import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { databases, config } from '../../lib/appwrite';
import { useAuth } from '../../context/AuthContext';
import ClientFormModal from '../../components/ClientFormModal';
import {
  AiOutlineArrowLeft,
  AiOutlineEdit,
  AiOutlineDelete,
  AiOutlinePhone,
  AiOutlineMail,
  AiOutlineEnvironment,
  AiOutlineCalendar,
  AiOutlineFileDone,
  AiOutlineDollar,
  AiOutlineLoading3Quarters,
  AiOutlineBank,
  AiOutlineFileText,
} from 'react-icons/ai';

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = user?.labels?.includes('admin') || user?.prefs?.role === 'admin';

  useEffect(() => {
    fetchClient();
  }, [id]);

  const fetchClient = async () => {
    try {
      setLoading(true);
      const response = await databases.getDocument(
        config.databaseId,
        config.clientsCollectionId,
        id
      );
      setClient(response);
    } catch (error) {
      console.error('Error fetching client:', error);
      alert('Failed to load client details.');
      navigate('/portal/clients');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      await databases.deleteDocument(
        config.databaseId,
        config.clientsCollectionId,
        id
      );
      navigate('/portal/clients');
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Failed to delete client. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleModalClose = (shouldRefresh) => {
    setIsModalOpen(false);
    if (shouldRefresh) {
      fetchClient();
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
          <p className="text-sm text-white/70">Loading client details...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-night-sky to-night-sky px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/portal/clients"
            className="inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-accent"
          >
            <AiOutlineArrowLeft className="h-4 w-4" />
            Back to Clients
          </Link>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition-all hover:border-accent hover:bg-accent/10"
              >
                <AiOutlineEdit className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-full border border-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-all hover:border-red-500 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? (
                  <AiOutlineLoading3Quarters className="h-4 w-4 animate-spin" />
                ) : (
                  <AiOutlineDelete className="h-4 w-4" />
                )}
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Client Header */}
        <div className="glass-panel mb-6 p-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">{client.companyName}</h1>
              <p className="mt-2 text-white/70">{client.industry || 'Industry not specified'}</p>
            </div>
            <span
              className={`rounded-full border px-4 py-2 text-sm font-medium ${getStatusBadge(client.status)}`}
            >
              {client.status?.charAt(0).toUpperCase() + client.status?.slice(1) || 'Active'}
            </span>
          </div>
        </div>

        {/* Contact Information */}
        <div className="glass-panel mb-6 p-8">
          <h2 className="mb-6 text-xl font-semibold text-white">Contact Information</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm text-white/50">Contact Person</p>
              <div className="flex items-center gap-2">
                <AiOutlineFileDone className="h-5 w-5 text-accent" />
                <p className="text-white">{client.contactPerson || 'N/A'}</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm text-white/50">Phone</p>
              <div className="flex items-center gap-2">
                <AiOutlinePhone className="h-5 w-5 text-accent" />
                <a href={`tel:${client.phone}`} className="text-white hover:text-accent">
                  {client.phone || 'N/A'}
                </a>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm text-white/50">Email</p>
              <div className="flex items-center gap-2">
                <AiOutlineMail className="h-5 w-5 text-accent" />
                <a href={`mailto:${client.email}`} className="text-white hover:text-accent">
                  {client.email || 'N/A'}
                </a>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm text-white/50">Address</p>
              <div className="flex items-start gap-2">
                <AiOutlineEnvironment className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent" />
                <div>
                  <p className="text-white">{client.address || 'N/A'}</p>
                  {(client.city || client.postcode) && (
                    <p className="text-white">
                      {client.city}
                      {client.city && client.postcode && ', '}
                      {client.postcode}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contract Information */}
        <div className="glass-panel mb-6 p-8">
          <h2 className="mb-6 text-xl font-semibold text-white">Contract Information</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm text-white/50">Start Date</p>
              <div className="flex items-center gap-2">
                <AiOutlineCalendar className="h-5 w-5 text-accent" />
                <p className="text-white">
                  {client.contractStartDate
                    ? new Date(client.contractStartDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'Not set'}
                </p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm text-white/50">End Date</p>
              <div className="flex items-center gap-2">
                <AiOutlineCalendar className="h-5 w-5 text-accent" />
                <p className="text-white">
                  {client.contractEndDate
                    ? new Date(client.contractEndDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'Ongoing'}
                </p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm text-white/50">Contract Value</p>
              <div className="flex items-center gap-2">
                <AiOutlineDollar className="h-5 w-5 text-accent" />
                <p className="text-white">
                  {client.contractValue
                    ? `£${parseFloat(client.contractValue).toLocaleString()}`
                    : 'Not specified'}
                </p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm text-white/50">Duration</p>
              <div className="flex items-center gap-2">
                <AiOutlineFileText className="h-5 w-5 text-accent" />
                <p className="text-white">
                  {client.contractStartDate && client.contractEndDate
                    ? `${Math.ceil(
                        (new Date(client.contractEndDate) - new Date(client.contractStartDate)) /
                          (1000 * 60 * 60 * 24 * 30)
                      )} months`
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Site Locations */}
        {client.siteLocations && (
          <div className="glass-panel mb-6 p-8">
            <h2 className="mb-6 text-xl font-semibold text-white">Site Locations</h2>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <pre className="whitespace-pre-wrap text-sm text-white/90">{client.siteLocations}</pre>
            </div>
          </div>
        )}

        {/* Notes */}
        {client.notes && (
          <div className="glass-panel mb-6 p-8">
            <h2 className="mb-6 text-xl font-semibold text-white">Notes</h2>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="whitespace-pre-wrap text-sm text-white/90">{client.notes}</p>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>
              Created: {new Date(client.$createdAt).toLocaleDateString('en-GB')} at{' '}
              {new Date(client.$createdAt).toLocaleTimeString('en-GB')}
            </span>
            <span>
              Last updated: {new Date(client.$updatedAt).toLocaleDateString('en-GB')} at{' '}
              {new Date(client.$updatedAt).toLocaleTimeString('en-GB')}
            </span>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isModalOpen && <ClientFormModal client={client} onClose={handleModalClose} />}
    </div>
  );
};

export default ClientDetail;
