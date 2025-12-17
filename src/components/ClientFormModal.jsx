import React, { useState, useEffect } from 'react';
import { databases, config } from '../lib/appwrite';
import { ID } from 'appwrite';
import { AiOutlineClose, AiOutlineLoading3Quarters } from 'react-icons/ai';

const ClientFormModal = ({ client, onClose }) => {
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    postcode: '',
    industry: '',
    status: 'active',
    contractStartDate: '',
    contractEndDate: '',
    contractValue: '',
    siteLocations: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (client) {
      setFormData({
        companyName: client.companyName || '',
        contactPerson: client.contactPerson || '',
        phone: client.phone || '',
        email: client.email || '',
        address: client.address || '',
        city: client.city || '',
        postcode: client.postcode || '',
        industry: client.industry || '',
        status: client.status || 'active',
        contractStartDate: client.contractStartDate || '',
        contractEndDate: client.contractEndDate || '',
        contractValue: client.contractValue || '',
        siteLocations: client.siteLocations || '',
        notes: client.notes || '',
      });
    }
  }, [client]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (client) {
        // Update existing client
        await databases.updateDocument(
          config.databaseId,
          config.clientsCollectionId,
          client.$id,
          formData
        );
      } else {
        // Create new client
        await databases.createDocument(
          config.databaseId,
          config.clientsCollectionId,
          ID.unique(),
          formData
        );
      }
      onClose(true); // Pass true to indicate refresh needed
    } catch (err) {
      console.error('Error saving client:', err);
      setError(err.message || 'Failed to save client. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-gradient-to-br from-primary-dark to-night-sky p-8 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">
            {client ? 'Edit Client' : 'Add New Client'}
          </h2>
          <button
            onClick={() => onClose(false)}
            className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <AiOutlineClose className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Information */}
          <div>
            <h3 className="mb-4 text-lg font-medium text-white">Company Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm text-white/70">
                  Company Name <span className="text-red-400">*</span>
                </label>
                <input
                  required
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
                  placeholder="Enter company name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">Industry / Sector</label>
                <input
                  type="text"
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
                  placeholder="e.g., Retail, Construction"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Status <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="mb-4 text-lg font-medium text-white">Contact Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm text-white/70">
                  Contact Person <span className="text-red-400">*</span>
                </label>
                <input
                  required
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
                  placeholder="Enter contact name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Phone <span className="text-red-400">*</span>
                </label>
                <input
                  required
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
                  placeholder="e.g., 01234 567890"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  required
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
                  placeholder="contact@company.com"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm text-white/70">Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
                  placeholder="Street address"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">Postcode</label>
                <input
                  type="text"
                  name="postcode"
                  value={formData.postcode}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
                  placeholder="Postcode"
                />
              </div>
            </div>
          </div>

          {/* Contract Information */}
          <div>
            <h3 className="mb-4 text-lg font-medium text-white">Contract Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-white/70">Contract Start Date</label>
                <input
                  type="date"
                  name="contractStartDate"
                  value={formData.contractStartDate}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">Contract End Date</label>
                <input
                  type="date"
                  name="contractEndDate"
                  value={formData.contractEndDate}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm text-white/70">Contract Value (£)</label>
                <input
                  type="number"
                  name="contractValue"
                  value={formData.contractValue}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
                  placeholder="Annual contract value"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm text-white/70">Site Locations</label>
                <textarea
                  name="siteLocations"
                  value={formData.siteLocations}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
                  placeholder="List all site locations where security is provided (one per line)"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-2 block text-sm text-white/70">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
              placeholder="Additional notes or requirements"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => onClose(false)}
              disabled={loading}
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-night-sky shadow-lg shadow-accent/40 transition-all hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && <AiOutlineLoading3Quarters className="h-4 w-4 animate-spin" />}
              {loading ? 'Saving...' : client ? 'Update Client' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientFormModal;
