import React, { useState, useEffect } from 'react';
import { databases, config } from '../lib/appwrite';
import { ID, Query } from 'appwrite';
import { AiOutlineClose, AiOutlineLoading3Quarters } from 'react-icons/ai';

const StaffFormModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    licenseNumber: '',
    licenseExpiry: '',
    status: 'active',
    address: '',
    startDate: '',
    dBSStatus: 'pending',
    rightToWork: 'pending',
    emergencyContact: '',
    emergencyPhone: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [errors, setErrors] = useState({});
  
  // Roles and departments state with defaults
  const [roles, setRoles] = useState(['guard', 'supervisor', 'manager', 'admin']);
  const [departments, setDepartments] = useState(['Security', 'HR', 'Operations', 'Management']);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Fetch roles and departments from Appwrite on mount
  useEffect(() => {
    if (isOpen) {
      fetchRolesAndDepartments();
    }
  }, [isOpen]);

  const fetchRolesAndDepartments = async () => {
    setLoadingOptions(true);
    try {
      // Try to fetch from a settings/configuration collection if it exists
      // For now, we'll use the defaults. In the future, you can create a
      // 'settings' collection in Appwrite to store configurable options
      
      // Example: Fetch unique roles from existing staff profiles
      if (config.staffProfilesCollectionId) {
        try {
          const staffResponse = await databases.listDocuments(
            config.databaseId,
            config.staffProfilesCollectionId,
            [Query.limit(100)]
          );
          
          // Extract unique roles
          const uniqueRoles = [...new Set(staffResponse.documents.map(doc => doc.role).filter(Boolean))];
          if (uniqueRoles.length > 0) {
            // Merge with defaults
            setRoles([...new Set([...roles, ...uniqueRoles])]);
          }
          
          // Extract unique departments
          const uniqueDepts = [...new Set(staffResponse.documents.map(doc => doc.department).filter(Boolean))];
          if (uniqueDepts.length > 0) {
            setDepartments([...new Set([...departments, ...uniqueDepts])]);
          }
        } catch (err) {
          console.log('Could not fetch existing roles/departments, using defaults:', err.message);
        }
      }
    } catch (err) {
      console.error('Error fetching options:', err);
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.role) {
      newErrors.role = 'Role is required';
    }
    if (!formData.department) {
      newErrors.department = 'Department is required';
    }
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    if (formData.licenseNumber && !formData.licenseExpiry) {
      newErrors.licenseExpiry = 'License expiry is required if license number provided';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const staffData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone,
        role: formData.role,
        department: formData.department,
        licenseNumber: formData.licenseNumber,
        licenseExpiry: formData.licenseExpiry ? new Date(formData.licenseExpiry).toISOString() : null,
        status: formData.status,
        address: formData.address,
        startDate: new Date(formData.startDate).toISOString(),
        dBSStatus: formData.dBSStatus,
        rightToWork: formData.rightToWork,
        emergencyContact: formData.emergencyContact,
        emergencyPhone: formData.emergencyPhone,
      };

      const response = await databases.createDocument(
        config.databaseId,
        config.staffProfilesCollectionId,
        ID.unique(),
        staffData
      );

      // Auto-sync to scheduling guards collection
      if (config.guardsCollectionId) {
        try {
          await databases.createDocument(
            config.databaseId,
            config.guardsCollectionId,
            ID.unique(),
            {
              firstName: staffData.firstName,
              lastName: staffData.lastName,
              email: staffData.email,
              phone: staffData.phone,
              status: staffData.status || 'active',
              role: staffData.role || 'guard',
              payRate: formData.payRate || 0,
              siaLicenceNumber: staffData.licenseNumber || '',
              siaExpiryDate: staffData.licenseExpiry || null,
              createdFrom: 'HR',
            }
          );
        } catch (syncError) {
          console.warn('Failed to sync staff to scheduling guards collection', syncError);
        }
      }

      setSuccess('Staff member created successfully!');
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: '',
        department: '',
        licenseNumber: '',
        licenseExpiry: '',
        status: 'active',
        address: '',
        startDate: '',
        dBSStatus: 'pending',
        rightToWork: 'pending',
        emergencyContact: '',
        emergencyPhone: '',
      });

      setTimeout(() => {
        onSuccess(response);
        onClose();
        setSuccess('');
      }, 1500);
    } catch (err) {
      console.error('Error creating staff:', err);
      setError(err.message || 'Failed to create staff member. Please check all fields and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-gradient-to-br from-primary-dark to-night-sky p-8 shadow-2xl my-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">Add Staff Member</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <AiOutlineClose className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Messages */}
          {error && (
            <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-300">
              {success}
            </div>
          )}

          {/* Personal Information */}
          <div>
            <h3 className="mb-4 text-lg font-medium text-white">Personal Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-white/70">
                  First Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`w-full rounded-2xl border bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none transition-colors ${
                    errors.firstName ? 'border-red-500 focus:border-red-400' : 'border-white/10 focus:border-accent'
                  }`}
                  placeholder="Enter first name"
                />
                {errors.firstName && <p className="mt-1 text-sm text-red-400">{errors.firstName}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Last Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`w-full rounded-2xl border bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none transition-colors ${
                    errors.lastName ? 'border-red-500 focus:border-red-400' : 'border-white/10 focus:border-accent'
                  }`}
                  placeholder="Enter last name"
                />
                {errors.lastName && <p className="mt-1 text-sm text-red-400">{errors.lastName}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full rounded-2xl border bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none transition-colors ${
                    errors.email ? 'border-red-500 focus:border-red-400' : 'border-white/10 focus:border-accent'
                  }`}
                  placeholder="staff.member@company.com"
                />
                {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none transition-colors"
                  placeholder="+44 7XXX XXXXXX"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm text-white/70">Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none transition-colors"
                  placeholder="Enter full address"
                />
              </div>
            </div>
          </div>

          {/* Employment Details */}
          <div>
            <h3 className="mb-4 text-lg font-medium text-white">Employment Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Role <span className="text-red-400">*</span>
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className={`w-full rounded-2xl border bg-white/5 px-4 py-3 text-white focus:outline-none transition-colors [&>option]:bg-night-sky ${
                    errors.role ? 'border-red-500 focus:border-red-400' : 'border-white/10 focus:border-accent'
                  }`}
                  disabled={loadingOptions}
                >
                  <option value="">Select a role...</option>
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
                {errors.role && <p className="mt-1 text-sm text-red-400">{errors.role}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Department <span className="text-red-400">*</span>
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className={`w-full rounded-2xl border bg-white/5 px-4 py-3 text-white focus:outline-none transition-colors [&>option]:bg-night-sky ${
                    errors.department ? 'border-red-500 focus:border-red-400' : 'border-white/10 focus:border-accent'
                  }`}
                  disabled={loadingOptions}
                >
                  <option value="">Select a department...</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                {errors.department && <p className="mt-1 text-sm text-red-400">{errors.department}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Start Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className={`w-full rounded-2xl border bg-white/5 px-4 py-3 text-white focus:outline-none transition-colors ${
                    errors.startDate ? 'border-red-500 focus:border-red-400' : 'border-white/10 focus:border-accent'
                  }`}
                />
                {errors.startDate && <p className="mt-1 text-sm text-red-400">{errors.startDate}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none transition-colors [&>option]:bg-night-sky"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                  <option value="probation">Probation</option>
                </select>
              </div>
            </div>
          </div>

          {/* License Information */}
          <div>
            <h3 className="mb-4 text-lg font-medium text-white">License Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-white/70">License Number</label>
                <input
                  type="text"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none transition-colors"
                  placeholder="Enter SIA license number"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">License Expiry</label>
                <input
                  type="date"
                  name="licenseExpiry"
                  value={formData.licenseExpiry}
                  onChange={handleChange}
                  className={`w-full rounded-2xl border bg-white/5 px-4 py-3 text-white focus:outline-none transition-colors ${
                    errors.licenseExpiry ? 'border-red-500 focus:border-red-400' : 'border-white/10 focus:border-accent'
                  }`}
                />
                {errors.licenseExpiry && <p className="mt-1 text-sm text-red-400">{errors.licenseExpiry}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">DBS Status</label>
                <select
                  name="dBSStatus"
                  value={formData.dBSStatus}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none transition-colors [&>option]:bg-night-sky"
                >
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="failed">Failed</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">Right to Work</label>
                <select
                  name="rightToWork"
                  value={formData.rightToWork}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none transition-colors [&>option]:bg-night-sky"
                >
                  <option value="verified">Verified</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <h3 className="mb-4 text-lg font-medium text-white">Emergency Contact</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-white/70">Contact Name</label>
                <input
                  type="text"
                  name="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none transition-colors"
                  placeholder="Enter emergency contact name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">Contact Phone</label>
                <input
                  type="tel"
                  name="emergencyPhone"
                  value={formData.emergencyPhone}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none transition-colors"
                  placeholder="+44 7XXX XXXXXX"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-medium text-white transition-all hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-2xl bg-accent px-6 py-3 font-medium text-night-sky transition-all hover:bg-accent/90 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <AiOutlineLoading3Quarters className="animate-spin" />
                  Creating...
                </span>
              ) : (
                'Create Staff Member'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffFormModal;
