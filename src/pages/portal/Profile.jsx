import React, { useState } from 'react';
import { useProfile, useRole, ROLES } from '../../hooks/useRBAC';
import PageHeader from '../../components/PageHeader';
import { maskSensitive } from '../../lib/rbacValidation';

const Profile = () => {
  const { profile, loading, error, updating, updateProfile } = useProfile();
  const { role, isAdmin, isManager, isStaff, isClient } = useRole();
  const [formData, setFormData] = useState({});
  const [message, setMessage] = useState(null);

  React.useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || profile.contactName || profile.companyName || '',
        phone: profile.phone || '',
        department: profile.department || '',
        emergencyContact: profile.emergencyContact || '',
        uniformSize: profile.uniformSize || '',
        billingAddress: profile.billingAddress || '',
      });
    }
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    
    try {
      const updates = {};
      
      // Common fields
      if (formData.fullName) updates.fullName = formData.fullName;
      
      // Role-specific fields
      if (isAdmin && formData.department) {
        updates.department = formData.department;
      }
      
      if (isStaff) {
        if (formData.emergencyContact) updates.emergencyContact = formData.emergencyContact;
        if (formData.uniformSize) updates.uniformSize = formData.uniformSize;
      }
      
      if (isClient) {
        if (formData.contactName) updates.contactName = formData.contactName;
        if (formData.billingAddress) updates.billingAddress = formData.billingAddress;
      }
      
      await updateProfile(updates);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-night-sky p-4">
        <p className="text-white/70">Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-night-sky p-4">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
            <p className="text-red-400">Error loading profile: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-night-sky to-night-sky p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          category="Settings"
          title="My Profile"
          subtitle="Manage your personal information and preferences"
        />

        {message && (
          <div
            className={`mb-6 rounded-lg p-4 ${
              message.type === 'success'
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-6 lg:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Badge */}
            <div>
              <label className="block text-sm font-medium text-white/50 mb-2">
                Role
              </label>
              <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-accent/20 text-accent">
                {role?.toUpperCase()}
              </span>
            </div>

            {/* Common Fields */}
            {(isAdmin || isManager || isStaff) && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-white/90 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName || ''}
                  onChange={handleChange}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>
            )}

            {/* Client Fields */}
            {isClient && (
              <>
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-white/90 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    value={profile?.companyName || ''}
                    disabled
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white/50 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-white/40">Contact admin to change company name</p>
                </div>

                <div>
                  <label htmlFor="contactName" className="block text-sm font-medium text-white/90 mb-2">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    id="contactName"
                    name="contactName"
                    value={formData.contactName || profile?.contactName || ''}
                    onChange={handleChange}
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder="Primary contact name"
                  />
                </div>

                <div>
                  <label htmlFor="billingAddress" className="block text-sm font-medium text-white/90 mb-2">
                    Billing Address
                  </label>
                  <textarea
                    id="billingAddress"
                    name="billingAddress"
                    value={formData.billingAddress || ''}
                    onChange={handleChange}
                    rows={3}
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder="Enter billing address"
                  />
                </div>
              </>
            )}

            {/* Admin Fields */}
            {isAdmin && (
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-white/90 mb-2">
                  Department
                </label>
                <input
                  type="text"
                  id="department"
                  name="department"
                  value={formData.department || ''}
                  onChange={handleChange}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="e.g., Operations, Management"
                />
              </div>
            )}

            {/* Staff Fields */}
            {isStaff && (
              <>
                <div>
                  <label htmlFor="siaLicence" className="block text-sm font-medium text-white/90 mb-2">
                    SIA Licence Number
                  </label>
                  <input
                    type="text"
                    id="siaLicence"
                    value={profile?.siaLicence ? `****${profile.siaLicence.slice(-4)}` : 'Not set'}
                    disabled
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white/50 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-white/40">Contact admin to update SIA licence</p>
                </div>

                <div>
                  <label htmlFor="siaExpiryDate" className="block text-sm font-medium text-white/90 mb-2">
                    SIA Expiry Date
                  </label>
                  <input
                    type="text"
                    id="siaExpiryDate"
                    value={profile?.siaExpiryDate ? new Date(profile.siaExpiryDate).toLocaleDateString('en-GB') : 'Not set'}
                    disabled
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white/50 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label htmlFor="emergencyContact" className="block text-sm font-medium text-white/90 mb-2">
                    Emergency Contact
                  </label>
                  <textarea
                    id="emergencyContact"
                    name="emergencyContact"
                    value={formData.emergencyContact || ''}
                    onChange={handleChange}
                    rows={2}
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder="Name, relationship, phone number"
                  />
                </div>

                <div>
                  <label htmlFor="uniformSize" className="block text-sm font-medium text-white/90 mb-2">
                    Uniform Size
                  </label>
                  <select
                    id="uniformSize"
                    name="uniformSize"
                    value={formData.uniformSize || ''}
                    onChange={handleChange}
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  >
                    <option value="">Select size</option>
                    <option value="XS">XS</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                    <option value="XXXL">XXXL</option>
                  </select>
                </div>
              </>
            )}

            {/* Manager Fields */}
            {isManager && (
              <>
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Assigned Clients
                  </label>
                  <div className="rounded-lg bg-white/5 border border-white/10 px-4 py-3">
                    <p className="text-white/70 text-sm">
                      {profile?.assignedClients 
                        ? JSON.parse(profile.assignedClients).length 
                        : 0} client(s) assigned
                    </p>
                    <p className="mt-1 text-xs text-white/40">Contact admin to modify assignments</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Assigned Sites
                  </label>
                  <div className="rounded-lg bg-white/5 border border-white/10 px-4 py-3">
                    <p className="text-white/70 text-sm">
                      {profile?.assignedSites 
                        ? JSON.parse(profile.assignedSites).length 
                        : 0} site(s) assigned
                    </p>
                    <p className="mt-1 text-xs text-white/40">Contact admin to modify assignments</p>
                  </div>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="submit"
                disabled={updating}
                className="flex-1 rounded-lg bg-accent px-6 py-3 font-medium text-white hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-night-sky disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {updating ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 sm:flex-none rounded-lg bg-white/10 px-6 py-3 font-medium text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-night-sky transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Additional Info */}
        <div className="mt-6 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 p-4">
          <h3 className="text-sm font-medium text-white/90 mb-2">Account Information</h3>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-white/50">Email</dt>
              <dd className="text-white/90">{profile?.email || 'Not available'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/50">Status</dt>
              <dd className="text-white/90">
                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
                  Active
                </span>
              </dd>
            </div>
            {profile?.lastLoginAt && (
              <div className="flex justify-between">
                <dt className="text-white/50">Last Login</dt>
                <dd className="text-white/90">
                  {new Date(profile.lastLoginAt).toLocaleString('en-GB')}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
};

export default Profile;
