import React, { useState, useEffect } from 'react';
import { databases, config } from '../../lib/appwrite';
import { Query, ID } from 'appwrite';
import { demoGuards } from '../../data/demoGuards';
import { validateRequired, validateEmail, parseDate } from '../../lib/validation';
import {
  AiOutlineUser,
  AiOutlineTeam,
  AiOutlinePlus,
  AiOutlineEdit,
  AiOutlineDelete,
  AiOutlineSearch,
  AiOutlineClose,
  AiOutlineMail,
  AiOutlinePhone,
  AiOutlineCheckCircle,
  AiOutlineCloseCircle,
  AiOutlineEye,
  AiOutlineKey,
  AiOutlineSafety,
} from 'react-icons/ai';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [guards, setGuards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [validationMessage, setValidationMessage] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'guard',
    status: 'active',
    department: '',
    permissions: [],
    licenseNumber: '',
    licenseExpiry: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
  });

  const roles = [
    { value: 'admin', label: 'Administrator', color: 'text-red-400', bg: 'bg-red-500' },
    { value: 'manager', label: 'Manager', color: 'text-purple-400', bg: 'bg-purple-500' },
    { value: 'supervisor', label: 'Supervisor', color: 'text-blue-400', bg: 'bg-blue-500' },
    { value: 'dispatcher', label: 'Dispatcher', color: 'text-yellow-400', bg: 'bg-yellow-500' },
    { value: 'guard', label: 'Security Guard', color: 'text-green-400', bg: 'bg-green-500' },
    { value: 'client', label: 'Client', color: 'text-gray-400', bg: 'bg-gray-500' },
  ];

  const permissions = [
    { id: 'view_dashboard', label: 'View Dashboard', category: 'General' },
    { id: 'manage_guards', label: 'Manage Guards', category: 'Guards' },
    { id: 'view_guards', label: 'View Guards', category: 'Guards' },
    { id: 'manage_clients', label: 'Manage Clients', category: 'Clients' },
    { id: 'view_clients', label: 'View Clients', category: 'Clients' },
    { id: 'manage_shifts', label: 'Manage Shifts', category: 'Scheduling' },
    { id: 'view_shifts', label: 'View Shifts', category: 'Scheduling' },
    { id: 'approve_timesheets', label: 'Approve Timesheets', category: 'Time Tracking' },
    { id: 'view_timesheets', label: 'View Timesheets', category: 'Time Tracking' },
    { id: 'manage_incidents', label: 'Manage Incidents', category: 'Incidents' },
    { id: 'view_incidents', label: 'View Incidents', category: 'Incidents' },
    { id: 'manage_assets', label: 'Manage Assets', category: 'Assets' },
    { id: 'view_assets', label: 'View Assets', category: 'Assets' },
    { id: 'manage_invoices', label: 'Manage Invoices', category: 'Finance' },
    { id: 'view_invoices', label: 'View Invoices', category: 'Finance' },
    { id: 'manage_users', label: 'Manage Users', category: 'Administration' },
    { id: 'view_users', label: 'View Users', category: 'Administration' },
    { id: 'manage_settings', label: 'Manage Settings', category: 'Administration' },
    { id: 'view_reports', label: 'View Reports', category: 'Reports' },
    { id: 'export_data', label: 'Export Data', category: 'Reports' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      let guardsData = [];
      
      try {
        const guardsRes = await databases.listDocuments(
          config.databaseId,
          config.guardsCollectionId,
          [Query.limit(500)]
        );
        guardsData = guardsRes.documents;
      } catch (guardError) {
        console.log('Guards collection not available, using demo guards:', guardError);
        // Create demo guards if collection is not available
        guardsData = [
          {
            $id: 'demo-guard-1',
            firstName: 'Michael',
            lastName: 'Brown',
            email: 'michael.brown@fortissecured.com',
            phone: '+44 7700 900010',
          },
          {
            $id: 'demo-guard-2',
            firstName: 'James',
            lastName: 'Wilson',
            email: 'james.wilson@fortissecured.com',
            phone: '+44 7700 900011',
          },
          {
            $id: 'demo-guard-3',
            firstName: 'Olivia',
            lastName: 'Taylor',
            email: 'olivia.taylor@fortissecured.com',
            phone: '+44 7700 900012',
          },
          {
            $id: 'demo-guard-4',
            firstName: 'David',
            lastName: 'Anderson',
            email: 'david.anderson@fortissecured.com',
            phone: '+44 7700 900013',
          },
          {
            $id: 'demo-guard-5',
            firstName: 'Sophie',
            lastName: 'Martinez',
            email: 'sophie.martinez@fortissecured.com',
            phone: '+44 7700 900014',
          },
        ];
      }
      
      setGuards(guardsData);

      // Only initialize once - use the guards as users
      if (!initialized) {
        // Add admin and manager users
        const adminUsers = [
          {
            $id: 'admin-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@fortissecured.com',
            phone: '+44 7700 900000',
            role: 'admin',
            status: 'active',
            department: 'Administration',
            permissions: permissions.map(p => p.id),
            lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date('2024-01-15').toISOString(),
          },
          {
            $id: 'manager-1',
            firstName: 'Sarah',
            lastName: 'Williams',
            email: 'sarah.williams@fortissecured.com',
            phone: '+44 7700 900001',
            role: 'manager',
            status: 'active',
            department: 'Operations',
            permissions: ['view_dashboard', 'manage_guards', 'manage_shifts', 'approve_timesheets', 'view_clients', 'view_incidents', 'view_assets', 'view_invoices', 'view_reports'],
            lastLogin: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date('2024-02-20').toISOString(),
          },
          {
            $id: 'dispatcher-1',
            firstName: 'Emma',
            lastName: 'Davis',
            email: 'emma.davis@fortissecured.com',
            phone: '+44 7700 900003',
            role: 'dispatcher',
            status: 'active',
            department: 'Operations',
            permissions: ['view_dashboard', 'view_guards', 'manage_shifts', 'view_shifts', 'view_timesheets', 'view_incidents', 'view_clients'],
            lastLogin: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            createdAt: new Date('2024-04-05').toISOString(),
          },
        ];

        // Combine admin users with guards (guards are schedulable staff)
        const allUsers = [...adminUsers, ...guardsData];
        setUsers(allUsers);
        setInitialized(true);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // Don't show alert, just log and continue with demo data
    } finally {
      setLoading(false);
    }
  };

  const getRoleInfo = (role) => {
    return roles.find(r => r.value === role) || roles[4];
  };

  const getGuardName = (guardId) => {
    if (!guardId) return 'N/A';
    const guard = guards.find(g => g.$id === guardId);
    return guard ? `${guard.firstName} ${guard.lastName}` : 'Unknown';
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'guard',
        status: user.status || 'active',
        department: user.department || 'Security',
        permissions: user.permissions || [],
        licenseNumber: user.licenseNumber || user.siaLicenceNumber || '',
        licenseExpiry: user.licenseExpiry || user.siaExpiryDate || '',
        address: user.address || '',
        emergencyContact: user.emergencyContact || '',
        emergencyPhone: user.emergencyPhone || '',
      });
      setShowModal(true);
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'guard',
        status: 'active',
        department: 'Security',
        permissions: [],
        licenseNumber: '',
        licenseExpiry: '',
        address: '',
        emergencyContact: '',
        emergencyPhone: '',
      });
      setShowModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormErrors({});
    setValidationMessage('');
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'guard',
      status: 'active',
      department: '',
      permissions: [],
      licenseNumber: '',
      licenseExpiry: '',
      address: '',
      emergencyContact: '',
      emergencyPhone: '',
    });
  };

  const validateUserForm = () => {
    const errors = {};
    
    // Validate required fields
    const validation = validateRequired(formData, ['firstName', 'lastName', 'email', 'role']);
    if (!validation.isValid) {
      Object.assign(errors, validation.errors);
    }
    
    // Validate email
    if (formData.email && !validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Validate names
    if (formData.firstName.trim().length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
    }
    
    if (formData.lastName.trim().length < 2) {
      errors.lastName = 'Last name must be at least 2 characters';
    }
    
    // Validate license expiry if license number provided
    if (formData.licenseNumber && !formData.licenseExpiry) {
      errors.licenseExpiry = 'License expiry date is required when license number is provided';
    }
    
    if (formData.licenseExpiry) {
      const expiryDate = parseDate(formData.licenseExpiry);
      if (expiryDate < new Date()) {
        errors.licenseExpiry = 'License expiry date must be in the future';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateUserForm()) {
      setValidationMessage('Please fix the errors above before submitting.');
      return;
    }

    try {
      const userData = {
        ...formData,
        lastLogin: editingUser?.lastLogin || new Date().toISOString(),
        createdAt: editingUser?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editingUser) {
        const updatedUsers = users.map(u =>
          u.$id === editingUser.$id ? { ...u, ...userData } : u
        );
        setUsers(updatedUsers);
        setValidationMessage('User updated successfully!');
      } else {
        const newUser = {
          $id: ID.unique(),
          ...userData,
        };
        setUsers([newUser, ...users]);
        setValidationMessage('User created successfully!');
      }

      setTimeout(() => handleCloseModal(), 1000);
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Failed to save user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      setUsers(users.filter(u => u.$id !== userId));
      alert('User deleted successfully!');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const updatedUsers = users.map(u =>
        u.$id === userId ? { ...u, status: newStatus } : u
      );
      setUsers(updatedUsers);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update user status');
    }
  };

  const handleTogglePermission = (permissionId) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const handleSelectAllPermissions = () => {
    if (formData.permissions.length === permissions.length) {
      setFormData({ ...formData, permissions: [] });
    } else {
      setFormData({ ...formData, permissions: permissions.map(p => p.id) });
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Role filter
    if (filterRole) {
      filtered = filtered.filter(u => u.role === filterRole);
    }

    // Status filter
    if (filterStatus) {
      filtered = filtered.filter(u => u.status === filterStatus);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(u =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.department?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by name
    filtered.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));

    return filtered;
  };

  const calculateStats = () => {
    const total = users.length;
    const active = users.filter(u => u.status === 'active').length;
    const inactive = users.filter(u => u.status === 'inactive').length;
    const admins = users.filter(u => u.role === 'admin').length;
    const managers = users.filter(u => u.role === 'manager').length;
    const guards = users.filter(u => u.role === 'guard').length;

    return { total, active, inactive, admins, managers, guards };
  };

  const formatLastLogin = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const groupPermissionsByCategory = () => {
    const grouped = {};
    permissions.forEach(perm => {
      if (!grouped[perm.category]) {
        grouped[perm.category] = [];
      }
      grouped[perm.category].push(perm);
    });
    return grouped;
  };

  const stats = calculateStats();
  const filteredUsers = filterUsers();
  const groupedPermissions = groupPermissionsByCategory();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AiOutlineTeam className="mx-auto mb-4 h-12 w-12 animate-spin text-accent" />
          <p className="text-white/70">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="mt-2 text-white/70">Manage system users and permissions</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-white hover:bg-accent/90 transition-all"
        >
          <AiOutlinePlus className="h-5 w-5" />
          Add User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-6">
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Total Users</p>
              <p className="mt-2 text-3xl font-bold text-white">{stats.total}</p>
            </div>
            <AiOutlineTeam className="h-8 w-8 text-accent" />
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Active</p>
              <p className="mt-2 text-3xl font-bold text-green-400">{stats.active}</p>
            </div>
            <AiOutlineCheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Inactive</p>
              <p className="mt-2 text-3xl font-bold text-gray-400">{stats.inactive}</p>
            </div>
            <AiOutlineCloseCircle className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Admins</p>
              <p className="mt-2 text-3xl font-bold text-red-400">{stats.admins}</p>
            </div>
            <AiOutlineSafety className="h-8 w-8 text-red-400" />
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Managers</p>
              <p className="mt-2 text-3xl font-bold text-purple-400">{stats.managers}</p>
            </div>
            <AiOutlineKey className="h-8 w-8 text-purple-400" />
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Guards</p>
              <p className="mt-2 text-3xl font-bold text-green-400">{stats.guards}</p>
            </div>
            <AiOutlineUser className="h-8 w-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Search */}
          <div className="relative">
            <AiOutlineSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Role Filter */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
          >
            <option value="">All Roles</option>
            {roles.map(role => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">User</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Role</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Department</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Contact</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Last Login</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-white/50">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleInfo = getRoleInfo(user.role);
                  return (
                    <tr key={user.$id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                            <span className="font-semibold text-accent">
                              {user.firstName[0]}{user.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <button
                              onClick={() => handleViewUser(user)}
                              className="font-medium text-white hover:text-accent"
                            >
                              {user.firstName} {user.lastName}
                            </button>
                            <p className="text-xs text-white/50">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${roleInfo.bg} text-white`}>
                          {roleInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-white">
                        {user.department || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="flex items-center gap-1 text-white/70">
                            <AiOutlineMail className="h-3 w-3" />
                            <span className="text-xs">{user.email}</span>
                          </div>
                          <div className="flex items-center gap-1 text-white/70 mt-1">
                            <AiOutlinePhone className="h-3 w-3" />
                            <span className="text-xs">{user.phone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-white/70">
                        {formatLastLogin(user.lastLogin)}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(user.$id, user.status)}
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                            user.status === 'active'
                              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                              : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                          }`}
                        >
                          {user.status === 'active' ? (
                            <>
                              <AiOutlineCheckCircle className="h-3 w-3" />
                              Active
                            </>
                          ) : (
                            <>
                              <AiOutlineCloseCircle className="h-3 w-3" />
                              Inactive
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewUser(user)}
                            className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 transition-all"
                            title="View Details"
                          >
                            <AiOutlineEye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenModal(user)}
                            className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 transition-all"
                            title="Edit"
                          >
                            <AiOutlineEdit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.$id)}
                            className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20 transition-all"
                            title="Delete"
                          >
                            <AiOutlineDelete className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Modal */}
      {showDetailModal && viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="glass-panel w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 border-b border-white/10 bg-night-sky p-6 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                    <span className="text-2xl font-bold text-accent">
                      {viewingUser.firstName[0]}{viewingUser.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {viewingUser.firstName} {viewingUser.lastName}
                    </h2>
                    <p className="mt-1 text-sm text-white/50">{viewingUser.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 transition-all"
                >
                  <AiOutlineClose className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                    <p className="text-sm text-white/50">Role</p>
                    <p className="mt-1 font-medium text-white">{getRoleInfo(viewingUser.role).label}</p>
                  </div>
                  <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                    <p className="text-sm text-white/50">Status</p>
                    <p className={`mt-1 font-medium ${viewingUser.status === 'active' ? 'text-green-400' : 'text-gray-400'}`}>
                      {viewingUser.status === 'active' ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                    <p className="text-sm text-white/50">SIA License</p>
                    <p className="mt-1 font-medium text-white">{viewingUser.licenseNumber || viewingUser.siaLicenceNumber || 'N/A'}</p>
                  </div>
                  <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                    <p className="text-sm text-white/50">Linked Guard</p>
                    <p className="mt-1 font-medium text-white">{getGuardName(viewingUser.guardId)}</p>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/10 p-4">
                    <AiOutlineMail className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-sm text-white/50">Email</p>
                      <p className="font-medium text-white">{viewingUser.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/10 p-4">
                    <AiOutlinePhone className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-sm text-white/50">Phone</p>
                      <p className="font-medium text-white">{viewingUser.phone}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Activity</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                    <p className="text-sm text-white/50">Last Login</p>
                    <p className="mt-1 font-medium text-white">{formatLastLogin(viewingUser.lastLogin)}</p>
                  </div>
                  <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                    <p className="text-sm text-white/50">Created</p>
                    <p className="mt-1 font-medium text-white">
                      {new Date(viewingUser.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Permissions */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Permissions ({viewingUser.permissions.length})</h3>
                <div className="space-y-4">
                  {Object.entries(groupedPermissions).map(([category, perms]) => {
                    const categoryPerms = perms.filter(p => viewingUser.permissions.includes(p.id));
                    if (categoryPerms.length === 0) return null;

                    return (
                      <div key={category}>
                        <h4 className="text-sm font-medium text-white/70 mb-2">{category}</h4>
                        <div className="flex flex-wrap gap-2">
                          {categoryPerms.map(perm => (
                            <span
                              key={perm.id}
                              className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent"
                            >
                              <AiOutlineCheckCircle className="h-3 w-3" />
                              {perm.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 border-b border-white/10 bg-night-sky p-6 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 transition-all"
                >
                  <AiOutlineClose className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">
                      First Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="John"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">
                      Last Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="Doe"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">
                      Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="john.doe@fortissecured.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="+44 7700 900000"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">
                      Role <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
                      required
                    >
                      {roles.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">Department</label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="Operations"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">SIA License #</label>
                    <input
                      type="text"
                      value={formData.licenseNumber}
                      onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="SIA-001234"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">License Expiry</label>
                    <input
                      type="date"
                      value={formData.licenseExpiry}
                      onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="123 Street, London"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">Emergency Contact</label>
                    <input
                      type="text"
                      value={formData.emergencyContact}
                      onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="Contact Name"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">Emergency Phone</label>
                    <input
                      type="tel"
                      value={formData.emergencyPhone}
                      onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="+44 7700 900000"
                    />
                  </div>
                </div>
              </div>

              {/* Permissions */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Permissions</h3>
                  <button
                    type="button"
                    onClick={handleSelectAllPermissions}
                    className="text-sm text-accent hover:text-accent/80"
                  >
                    {formData.permissions.length === permissions.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="space-y-4">
                  {Object.entries(groupedPermissions).map(([category, perms]) => (
                    <div key={category} className="rounded-lg bg-white/5 border border-white/10 p-4">
                      <h4 className="text-sm font-medium text-white mb-3">{category}</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {perms.map(perm => (
                          <label
                            key={perm.id}
                            className="flex items-center gap-2 cursor-pointer hover:bg-white/5 rounded p-2 transition-all"
                          >
                            <input
                              type="checkbox"
                              checked={formData.permissions.includes(perm.id)}
                              onChange={() => handleTogglePermission(perm.id)}
                              className="h-4 w-4 rounded border-white/20 bg-white/5 text-accent focus:ring-accent focus:ring-offset-0"
                            />
                            <span className="text-sm text-white">{perm.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 font-medium text-white hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-accent px-4 py-2 font-semibold text-white hover:bg-accent/90 transition-all"
                >
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
