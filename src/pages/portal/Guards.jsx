import React, { useState, useEffect } from 'react';
import { databases, config } from '../../lib/appwrite';
import { Query, ID } from 'appwrite';
import { demoGuards } from '../../data/demoGuards';
import PortalHeader from '../../components/PortalHeader';
import {
  AiOutlinePlus,
  AiOutlineSearch,
  AiOutlineEdit,
  AiOutlineDelete,
  AiOutlineUser,
  AiOutlinePhone,
  AiOutlineMail,
  AiOutlineLoading3Quarters,
  AiOutlineClose,
  AiOutlineCheckCircle,
  AiOutlineCloseCircle,
  AiOutlineWarning,
} from 'react-icons/ai';

const Guards = () => {
  const [guards, setGuards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuard, setEditingGuard] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    fetchGuards();
  }, []);

  const fetchGuards = async () => {
    try {
      setLoading(true);
      const response = await databases.listDocuments(config.databaseId, config.guardsCollectionId, [
        Query.orderDesc('$createdAt'),
      ]);
      setGuards(response.documents);
    } catch (error) {
      console.error('Guards collection not available, using demo guards:', error);
      // Use demo guards that match the UserManagement demo guards
      const demoGuards = [
        {
          $id: 'demo-guard-1',
          firstName: 'Michael',
          lastName: 'Brown',
          email: 'michael.brown@fortissecured.com',
          phone: '+44 7700 900010',
          status: 'active',
          role: 'supervisor',
          licenseNumber: 'SIA-001234',
          licenseExpiry: '2026-12-31',
          address: '123 Security Street, London',
          emergencyContact: 'Sarah Brown',
          emergencyPhone: '+44 7700 900020',
          $createdAt: new Date('2024-03-10').toISOString(),
        },
        {
          $id: 'demo-guard-2',
          firstName: 'James',
          lastName: 'Wilson',
          email: 'james.wilson@fortissecured.com',
          phone: '+44 7700 900011',
          status: 'active',
          role: 'guard',
          licenseNumber: 'SIA-001235',
          licenseExpiry: '2026-08-15',
          address: '456 Guard Lane, London',
          emergencyContact: 'Emma Wilson',
          emergencyPhone: '+44 7700 900021',
          $createdAt: new Date('2024-05-12').toISOString(),
        },
        {
          $id: 'demo-guard-3',
          firstName: 'Olivia',
          lastName: 'Taylor',
          email: 'olivia.taylor@fortissecured.com',
          phone: '+44 7700 900012',
          status: 'inactive',
          role: 'guard',
          licenseNumber: 'SIA-001236',
          licenseExpiry: '2026-11-20',
          address: '789 Watch Road, London',
          emergencyContact: 'Jack Taylor',
          emergencyPhone: '+44 7700 900022',
          $createdAt: new Date('2024-06-20').toISOString(),
        },
        {
          $id: 'demo-guard-4',
          firstName: 'David',
          lastName: 'Anderson',
          email: 'david.anderson@fortissecured.com',
          phone: '+44 7700 900013',
          status: 'active',
          role: 'team_leader',
          licenseNumber: 'SIA-001237',
          licenseExpiry: '2027-03-15',
          address: '321 Patrol Avenue, London',
          emergencyContact: 'Lisa Anderson',
          emergencyPhone: '+44 7700 900023',
          $createdAt: new Date('2024-04-15').toISOString(),
        },
        {
          $id: 'demo-guard-5',
          firstName: 'Sophie',
          lastName: 'Martinez',
          email: 'sophie.martinez@fortissecured.com',
          phone: '+44 7700 900014',
          status: 'active',
          role: 'guard',
          licenseNumber: 'SIA-001238',
          licenseExpiry: '2026-09-30',
          address: '654 Sentinel Street, London',
          emergencyContact: 'Carlos Martinez',
          emergencyPhone: '+44 7700 900024',
          $createdAt: new Date('2024-07-08').toISOString(),
        },
        {
          $id: 'demo-guard-6',
          firstName: 'Thomas',
          lastName: 'Johnson',
          email: 'thomas.johnson@fortissecured.com',
          phone: '+44 7700 900015',
          status: 'active',
          role: 'guard',
          licenseNumber: 'SIA-001239',
          licenseExpiry: '2026-10-12',
          address: '987 Defence Drive, London',
          emergencyContact: 'Mary Johnson',
          emergencyPhone: '+44 7700 900025',
          $createdAt: new Date('2024-08-22').toISOString(),
        },
        {
          $id: 'demo-guard-7',
          firstName: 'Emily',
          lastName: 'Roberts',
          email: 'emily.roberts@fortissecured.com',
          phone: '+44 7700 900016',
          status: 'active',
          role: 'guard',
          licenseNumber: 'SIA-001240',
          licenseExpiry: '2027-01-18',
          address: '147 Guardian Way, London',
          emergencyContact: 'Robert Roberts',
          emergencyPhone: '+44 7700 900026',
          $createdAt: new Date('2024-09-05').toISOString(),
        },
        {
          $id: 'demo-guard-8',
          firstName: 'Daniel',
          lastName: 'Thompson',
          email: 'daniel.thompson@fortissecured.com',
          phone: '+44 7700 900017',
          status: 'active',
          role: 'guard',
          licenseNumber: 'SIA-001241',
          licenseExpiry: '2026-12-05',
          address: '258 Protection Place, London',
          emergencyContact: 'Hannah Thompson',
          emergencyPhone: '+44 7700 900027',
          $createdAt: new Date('2024-10-11').toISOString(),
        },
      ];
      setGuards(demoGuards);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this guard?')) return;
    try {
      await databases.deleteDocument(config.databaseId, config.guardsCollectionId, id);
      setGuards(guards.filter((g) => g.$id !== id));
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-500/10 text-green-400 border-green-500/20',
      inactive: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      suspended: 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    return styles[status] || styles.active;
  };

  const getComplianceIcon = (status, expiryDate) => {
    if (!status) return <AiOutlineCloseCircle className="h-5 w-5 text-gray-400" />;
    
    const isExpired = expiryDate && new Date(expiryDate) < new Date();
    const isExpiringSoon = expiryDate && new Date(expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    if (isExpired) return <AiOutlineCloseCircle className="h-5 w-5 text-red-400" />;
    if (isExpiringSoon) return <AiOutlineWarning className="h-5 w-5 text-yellow-400" />;
    return <AiOutlineCheckCircle className="h-5 w-5 text-green-400" />;
  };

  const filteredGuards = guards.filter((guard) => {
    if (filterStatus !== 'all' && guard.status !== filterStatus) return false;
    if (filterRole !== 'all' && guard.role !== filterRole) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        guard.firstName?.toLowerCase().includes(search) ||
        guard.lastName?.toLowerCase().includes(search) ||
        guard.email?.toLowerCase().includes(search) ||
        guard.phone?.toLowerCase().includes(search)
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
        <PortalHeader title="Guards" description="Manage security personnel" eyebrow="Staff Management">
          <button
            onClick={() => { setEditingGuard(null); setIsModalOpen(true); }}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-night-sky shadow-lg hover:bg-accent/90"
          >
            <AiOutlinePlus className="h-5 w-5" />
            Add Guard
          </button>
        </PortalHeader>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[250px]">
            <AiOutlineSearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search guards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
          >
            <option value="all">All Roles</option>
            <option value="guard">Guard</option>
            <option value="supervisor">Supervisor</option>
            <option value="team_leader">Team Leader</option>
          </select>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <div className="glass-panel p-6">
            <p className="text-sm text-white/70">Total Guards</p>
            <p className="mt-2 text-3xl font-bold text-white">{guards.length}</p>
          </div>
          <div className="glass-panel p-6">
            <p className="text-sm text-white/70">Active</p>
            <p className="mt-2 text-3xl font-bold text-green-400">
              {guards.filter((g) => g.status === 'active').length}
            </p>
          </div>
          <div className="glass-panel p-6">
            <p className="text-sm text-white/70">Inactive</p>
            <p className="mt-2 text-3xl font-bold text-gray-400">
              {guards.filter((g) => g.status === 'inactive').length}
            </p>
          </div>
          <div className="glass-panel p-6">
            <p className="text-sm text-white/70">Suspended</p>
            <p className="mt-2 text-3xl font-bold text-red-400">
              {guards.filter((g) => g.status === 'suspended').length}
            </p>
          </div>
        </div>

        {/* Guards List */}
        <div className="space-y-4">
          {filteredGuards.map((guard) => (
            <div key={guard.$id} className="glass-panel p-6 transition-all hover:border-accent/30">
              <div className="flex items-start justify-between">
                <div className="flex gap-4 flex-1">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                    <AiOutlineUser className="h-6 w-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold text-white">
                        {guard.firstName} {guard.lastName}
                      </h3>
                      <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadge(guard.status)}`}>
                        {guard.status}
                      </span>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary-light">
                        {guard.role || 'Guard'}
                      </span>
                    </div>
                    
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <AiOutlinePhone className="h-4 w-4 text-accent" />
                        {guard.phone}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <AiOutlineMail className="h-4 w-4 text-accent" />
                        {guard.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        {getComplianceIcon(guard.siaLicenceType, guard.siaExpiryDate)}
                        <span>SIA: {guard.siaLicenceType || 'None'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        {getComplianceIcon(guard.dbsStatus)}
                        <span>DBS: {guard.dbsStatus || 'None'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        {getComplianceIcon(guard.rightToWorkStatus)}
                        <span>RTW: {guard.rightToWorkStatus || 'Unknown'}</span>
                      </div>
                      {guard.payRate && (
                        <div className="flex items-center gap-2 text-sm text-white/70">
                          <span>Pay: £{guard.payRate}/hr</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingGuard(guard); setIsModalOpen(true); }}
                    className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/70 hover:border-accent hover:text-accent"
                  >
                    <AiOutlineEdit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(guard.$id)}
                    className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/70 hover:border-red-500 hover:text-red-400"
                  >
                    <AiOutlineDelete className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <GuardFormModal
          guard={editingGuard}
          onClose={(refresh) => {
            setIsModalOpen(false);
            if (refresh) fetchGuards();
          }}
        />
      )}
    </div>
  );
};

const GuardFormModal = ({ guard, onClose }) => {
  const [formData, setFormData] = useState({
    firstName: guard?.firstName || '',
    lastName: guard?.lastName || '',
    email: guard?.email || '',
    phone: guard?.phone || '',
    badgeNumber: guard?.badgeNumber || '',
    role: guard?.role || 'guard',
    siaLicenceType: guard?.siaLicenceType || '',
    siaExpiryDate: guard?.siaExpiryDate || '',
    dbsStatus: guard?.dbsStatus || '',
    rightToWorkStatus: guard?.rightToWorkStatus || 'Eligible',
    payRate: guard?.payRate || '',
    status: guard?.status || 'active',
    notes: guard?.notes || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (guard) {
        await databases.updateDocument(config.databaseId, config.guardsCollectionId, guard.$id, formData);
      } else {
        await databases.createDocument(config.databaseId, config.guardsCollectionId, ID.unique(), formData);
      }
      onClose(true);
    } catch (error) {
      alert(`Error: ${error.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-gradient-to-br from-primary-dark to-night-sky p-8 shadow-2xl my-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">{guard ? 'Edit Guard' : 'Add New Guard'}</h2>
          <button onClick={() => onClose(false)} className="rounded-lg p-2 text-white/70 hover:bg-white/10">
            <AiOutlineClose className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Info */}
          <div>
            <h3 className="mb-4 text-lg font-medium text-white">Personal Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-white/70">
                  First Name <span className="text-red-400">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Last Name <span className="text-red-400">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Phone <span className="text-red-400">*</span>
                </label>
                <input
                  required
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/70">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
                >
                  <option value="guard">Guard</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="team_leader">Team Leader</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/70">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
          </div>

          {/* Compliance */}
          <div>
            <h3 className="mb-4 text-lg font-medium text-white">Compliance</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-white/70">SIA Licence Type</label>
                <select
                  value={formData.siaLicenceType}
                  onChange={(e) => setFormData({ ...formData, siaLicenceType: e.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
                >
                  <option value="">None</option>
                  <option value="Security Guards">Security Guards</option>
                  <option value="Door Supervisors">Door Supervisors</option>
                  <option value="Close Protection">Close Protection</option>
                  <option value="CCTV">CCTV</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/70">Badge Number</label>
                <input
                  type="text"
                  value={formData.badgeNumber}
                  onChange={(e) => setFormData({ ...formData, badgeNumber: e.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
                  placeholder="e.g., FG-1234"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/70">SIA Expiry Date</label>
                <input
                  type="date"
                  value={formData.siaExpiryDate}
                  onChange={(e) => setFormData({ ...formData, siaExpiryDate: e.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/70">DBS Status</label>
                <select
                  value={formData.dbsStatus}
                  onChange={(e) => setFormData({ ...formData, dbsStatus: e.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
                >
                  <option value="">None</option>
                  <option value="Current">Current</option>
                  <option value="Pending">Pending</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/70">Right to Work</label>
                <select
                  value={formData.rightToWorkStatus}
                  onChange={(e) => setFormData({ ...formData, rightToWorkStatus: e.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
                >
                  <option value="Eligible">Eligible</option>
                  <option value="Pending">Pending</option>
                  <option value="Not Eligible">Not Eligible</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/70">Pay Rate (£/hour)</label>
                <input
                  type="text"
                  value={formData.payRate}
                  onChange={(e) => setFormData({ ...formData, payRate: e.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
                  placeholder="e.g., 12.50"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-2 block text-sm text-white/70">Notes</label>
            <textarea
              rows={4}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
              placeholder="Additional notes..."
            />
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
              {loading ? 'Saving...' : guard ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Guards;
