import React, { useState, useEffect } from 'react';
import { databases, config } from '../../lib/appwrite';
import { Query, ID } from 'appwrite';
import { validateRequired, validateRange, parseDate, formatCurrency } from '../../lib/validation';
import {
  AiOutlineDollar,
  AiOutlineFileText,
  AiOutlineCheck,
  AiOutlineClockCircle,
  AiOutlineWarning,
  AiOutlinePlus,
  AiOutlineEdit,
  AiOutlineDelete,
  AiOutlineDownload,
  AiOutlineEye,
  AiOutlineClose,
  AiOutlineSearch,
  AiOutlineMail,
  AiOutlinePrinter,
} from 'react-icons/ai';

const Finance = () => {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [shiftAssignments, setShiftAssignments] = useState([]);
  const [guards, setGuards] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showShiftSelectorModal, setShowShiftSelectorModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [view, setView] = useState('all'); // all, draft, sent, paid, overdue
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [selectedShifts, setSelectedShifts] = useState([]);
  const [shiftSearchTerm, setShiftSearchTerm] = useState('');
  const [shiftDateFilter, setShiftDateFilter] = useState('');

  const [formData, setFormData] = useState({
    invoiceNumber: '',
    clientId: '',
    invoiceDate: '',
    dueDate: '',
    status: 'draft',
    items: [],
    linkedShifts: [],
    subtotal: 0,
    taxRate: 20,
    taxAmount: 0,
    total: 0,
    notes: '',
    paymentTerms: '30 days',
  });

  const [newItem, setNewItem] = useState({
    description: '',
    quantity: 1,
    rate: 0,
    amount: 0,
  });

  const [formErrors, setFormErrors] = useState({});
  const [validationMessage, setValidationMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      let clientsData = [];
      let shiftsData = [];
      let assignmentsData = [];
      let guardsData = [];
      let sitesData = [];

      try {
        const res = await databases.listDocuments(
          config.databaseId,
          config.clientsCollectionId,
          [Query.limit(500)]
        );
        clientsData = res.documents;
      } catch (err) {
        clientsData = [];
      }

      try {
        const res = await databases.listDocuments(
          config.databaseId,
          config.shiftsCollectionId,
          [Query.limit(500)]
        );
        shiftsData = res.documents;
      } catch (err) {
        shiftsData = [];
      }

      try {
        const res = await databases.listDocuments(
          config.databaseId,
          config.shiftAssignmentsCollectionId,
          [Query.limit(500)]
        );
        assignmentsData = res.documents;
      } catch (err) {
        assignmentsData = [];
      }

      try {
        const res = await databases.listDocuments(
          config.databaseId,
          config.guardsCollectionId,
          [Query.limit(500)]
        );
        guardsData = res.documents;
      } catch (err) {
        guardsData = [];
      }

      try {
        const res = await databases.listDocuments(
          config.databaseId,
          config.sitesCollectionId,
          [Query.limit(500)]
        );
        sitesData = res.documents;
      } catch (err) {
        sitesData = [];
      }

      setClients(clientsData);
      setShifts(shiftsData);
      setShiftAssignments(assignmentsData);
      setGuards(guardsData);
      setSites(sitesData);

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load finance data. Connect Appwrite to enable billing.');
    } finally {
      setLoading(false);
    }
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.$id === clientId);
    return client ? client.companyName : 'Unknown Client';
  };

  const getGuardName = (guardId) => {
    const guard = guards.find(g => g.$id === guardId);
    return guard ? `${guard.firstName} ${guard.lastName}` : 'Unknown';
  };

  const getSiteName = (siteId) => {
    const site = sites.find(s => s.$id === siteId);
    return site ? site.siteName : 'Unknown';
  };

  const getShiftDetails = (shiftId) => {
    return shifts.find(s => s.$id === shiftId) || {};
  };

  const calculateHours = (checkInTime, checkOutTime) => {
    if (!checkInTime || !checkOutTime) return 0;
    const diff = new Date(checkOutTime) - new Date(checkInTime);
    return (diff / (1000 * 60 * 60));
  };

  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const count = invoices.length + 1;
    return `INV-${year}-${count.toString().padStart(3, '0')}`;
  };

  const calculateItemAmount = (quantity, rate) => {
    return (parseFloat(quantity) || 0) * (parseFloat(rate) || 0);
  };

  const calculateTotals = (items, taxRate) => {
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const taxAmount = (subtotal * (parseFloat(taxRate) || 0)) / 100;
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const handleOpenModal = (invoice = null) => {
    if (invoice) {
      setEditingInvoice(invoice);
      setFormData({
        invoiceNumber: invoice.invoiceNumber || '',
        clientId: invoice.clientId || '',
        invoiceDate: invoice.invoiceDate || '',
        dueDate: invoice.dueDate || '',
        status: invoice.status || 'draft',
        items: invoice.items || [],
        linkedShifts: invoice.linkedShifts || [],
        subtotal: invoice.subtotal || 0,
        taxRate: invoice.taxRate || 20,
        taxAmount: invoice.taxAmount || 0,
        total: invoice.total || 0,
        notes: invoice.notes || '',
        paymentTerms: invoice.paymentTerms || '30 days',
      });
    } else {
      setEditingInvoice(null);
      const today = new Date().toISOString().split('T')[0];
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      setFormData({
        invoiceNumber: generateInvoiceNumber(),
        clientId: '',
        invoiceDate: today,
        dueDate: dueDate.toISOString().split('T')[0],
        status: 'draft',
        items: [],
        linkedShifts: [],
        subtotal: 0,
        taxRate: 20,
        taxAmount: 0,
        total: 0,
        notes: '',
        paymentTerms: '30 days',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingInvoice(null);
  };

  const handleViewInvoice = (invoice) => {
    setViewingInvoice(invoice);
    setShowDetailModal(true);
  };

  const handleAddItem = () => {
    if (!newItem.description || !newItem.quantity || !newItem.rate) {
      alert('Please fill in all item fields');
      return;
    }

    const item = {
      description: newItem.description,
      quantity: parseFloat(newItem.quantity),
      rate: parseFloat(newItem.rate),
      amount: calculateItemAmount(newItem.quantity, newItem.rate),
    };

    const updatedItems = [...formData.items, item];
    const totals = calculateTotals(updatedItems, formData.taxRate);

    setFormData({
      ...formData,
      items: updatedItems,
      ...totals,
    });

    setNewItem({ description: '', quantity: 1, rate: 0, amount: 0 });
  };

  const handleRemoveItem = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    const totals = calculateTotals(updatedItems, formData.taxRate);

    setFormData({
      ...formData,
      items: updatedItems,
      ...totals,
    });
  };

  const handleTaxRateChange = (newTaxRate) => {
    const totals = calculateTotals(formData.items, newTaxRate);
    setFormData({
      ...formData,
      taxRate: newTaxRate,
      ...totals,
    });
  };

  const handleOpenShiftSelector = () => {
    if (!formData.clientId) {
      alert('Please select a client first');
      return;
    }
    setSelectedShifts(formData.linkedShifts || []);
    setShowShiftSelectorModal(true);
  };

  const handleImportShifts = () => {
    const newItems = [];
    
    selectedShifts.forEach(shiftId => {
      const shift = shifts.find(s => s.$id === shiftId);
      if (!shift) return;

      // Get all assignments for this shift
      const assignments = shiftAssignments.filter(a => a.shiftId === shiftId);
      
      assignments.forEach(assignment => {
        const hours = calculateHours(assignment.checkInTime, assignment.checkOutTime);
        const guardName = getGuardName(assignment.guardId);
        const siteName = getSiteName(shift.siteId);
        const shiftDate = new Date(shift.date).toLocaleDateString();
        
        if (hours > 0) {
          newItems.push({
            description: `${guardName} - ${siteName} (${shiftDate})`,
            quantity: parseFloat(hours.toFixed(2)),
            rate: shift.hourlyRate || 25,
            amount: parseFloat((hours * (shift.hourlyRate || 25)).toFixed(2)),
            shiftId: shiftId,
            assignmentId: assignment.$id,
          });
        }
      });
    });

    const updatedItems = [...formData.items, ...newItems];
    const totals = calculateTotals(updatedItems, formData.taxRate);

    setFormData({
      ...formData,
      items: updatedItems,
      linkedShifts: selectedShifts,
      ...totals,
    });

    setShowShiftSelectorModal(false);
    alert(`Imported ${newItems.length} items from ${selectedShifts.length} shifts`);
  };

  const toggleShiftSelection = (shiftId) => {
    setSelectedShifts(prev => 
      prev.includes(shiftId) 
        ? prev.filter(id => id !== shiftId)
        : [...prev, shiftId]
    );
  };

  const getAvailableShifts = () => {
    if (!formData.clientId) return [];

    return shifts.filter(shift => {
      // Filter by client
      if (shift.clientId !== formData.clientId) return false;

      // Filter by date if set
      if (shiftDateFilter && shift.date !== shiftDateFilter) return false;

      // Filter by search term
      if (shiftSearchTerm) {
        const searchLower = shiftSearchTerm.toLowerCase();
        const siteName = getSiteName(shift.siteId).toLowerCase();
        const shiftDate = new Date(shift.date).toLocaleDateString().toLowerCase();
        
        if (!siteName.includes(searchLower) && !shiftDate.includes(searchLower)) {
          return false;
        }
      }

      // Check if shift has completed assignments with clock in/out times
      const assignments = shiftAssignments.filter(a => 
        a.shiftId === shift.$id && 
        a.checkInTime && 
        a.checkOutTime
      );

      return assignments.length > 0;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const getShiftHoursAndCost = (shiftId) => {
    const shift = shifts.find(s => s.$id === shiftId);
    if (!shift) return { hours: 0, cost: 0 };

    const assignments = shiftAssignments.filter(a => 
      a.shiftId === shiftId && 
      a.checkInTime && 
      a.checkOutTime
    );

    const totalHours = assignments.reduce((sum, assignment) => {
      return sum + calculateHours(assignment.checkInTime, assignment.checkOutTime);
    }, 0);

    const cost = totalHours * (shift.hourlyRate || 25);

    return { 
      hours: parseFloat(totalHours.toFixed(2)), 
      cost: parseFloat(cost.toFixed(2)),
      guardCount: assignments.length
    };
  };

  const validateInvoiceForm = () => {
    const errors = {};

    // Validate invoice number
    if (!validateRequired(formData.invoiceNumber)) {
      errors.invoiceNumber = 'Invoice number is required';
    }

    // Validate client selection
    if (!validateRequired(formData.clientId)) {
      errors.clientId = 'Please select a client';
    }

    // Validate invoice date
    if (!validateRequired(formData.invoiceDate)) {
      errors.invoiceDate = 'Invoice date is required';
    }

    // Validate due date exists and is after invoice date
    if (!validateRequired(formData.dueDate)) {
      errors.dueDate = 'Due date is required';
    } else if (formData.invoiceDate && formData.dueDate) {
      const invoiceDate = parseDate(formData.invoiceDate);
      const dueDate = parseDate(formData.dueDate);
      if (dueDate <= invoiceDate) {
        errors.dueDate = 'Due date must be after invoice date';
      }
    }

    // Validate at least one item
    if (!formData.items || formData.items.length === 0) {
      errors.items = 'At least one invoice item is required';
    }

    // Validate tax rate
    if (formData.taxRate < 0 || formData.taxRate > 100) {
      errors.taxRate = 'Tax rate must be between 0 and 100%';
    }

    // Validate total is positive
    if (formData.total <= 0) {
      errors.total = 'Invoice total must be greater than zero';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationMessage('');

    if (!validateInvoiceForm()) {
      setValidationMessage('Please fix the errors above before submitting.');
      return;
    }

    try {
      const invoiceData = {
        ...formData,
        createdAt: editingInvoice?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editingInvoice) {
        const updatedInvoices = invoices.map(inv =>
          inv.$id === editingInvoice.$id ? { ...inv, ...invoiceData } : inv
        );
        setInvoices(updatedInvoices);
        setValidationMessage('Invoice updated successfully!');
      } else {
        const newInvoice = {
          $id: ID.unique(),
          ...invoiceData,
        };
        setInvoices([newInvoice, ...invoices]);
        setValidationMessage('Invoice created successfully!');
      }

      setTimeout(() => handleCloseModal(), 1000);
    } catch (error) {
      console.error('Error saving invoice:', error);
      setValidationMessage(`Error: ${error.message || 'Failed to save invoice'}`);
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      setInvoices(invoices.filter(inv => inv.$id !== invoiceId));
      alert('Invoice deleted successfully!');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Failed to delete invoice');
    }
  };

  const handleUpdateStatus = async (invoiceId, newStatus) => {
    try {
      const updateData = {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };

      if (newStatus === 'paid') {
        updateData.paidDate = new Date().toISOString().split('T')[0];
      }

      const updatedInvoices = invoices.map(inv =>
        inv.$id === invoiceId ? { ...inv, ...updateData } : inv
      );
      setInvoices(updatedInvoices);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update invoice status');
    }
  };

  const handleDownloadPDF = (invoice) => {
    alert('PDF download functionality would be implemented here');
  };

  const handleSendEmail = (invoice) => {
    alert('Email sending functionality would be implemented here');
  };

  const filterInvoices = () => {
    let filtered = [...invoices];

    // View filter
    if (view === 'draft') {
      filtered = filtered.filter(inv => inv.status === 'draft');
    } else if (view === 'sent') {
      filtered = filtered.filter(inv => inv.status === 'sent');
    } else if (view === 'paid') {
      filtered = filtered.filter(inv => inv.status === 'paid');
    } else if (view === 'overdue') {
      filtered = filtered.filter(inv => inv.status === 'overdue');
    }

    // Client filter
    if (filterClient) {
      filtered = filtered.filter(inv => inv.clientId === filterClient);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(inv =>
        inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getClientName(inv.clientId).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));

    return filtered;
  };

  const calculateStats = () => {
    const total = invoices.length;
    const draft = invoices.filter(inv => inv.status === 'draft').length;
    const sent = invoices.filter(inv => inv.status === 'sent').length;
    const paid = invoices.filter(inv => inv.status === 'paid').length;
    const overdue = invoices.filter(inv => inv.status === 'overdue').length;

    const totalRevenue = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    const outstanding = invoices
      .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    return { total, draft, sent, paid, overdue, totalRevenue: totalRevenue.toFixed(2), outstanding: outstanding.toFixed(2) };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'sent': return 'bg-blue-500';
      case 'paid': return 'bg-green-500';
      case 'overdue': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const isOverdue = (invoice) => {
    if (invoice.status === 'paid') return false;
    return new Date(invoice.dueDate) < new Date();
  };

  const stats = calculateStats();
  const filteredInvoices = filterInvoices();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AiOutlineClockCircle className="mx-auto mb-4 h-12 w-12 animate-spin text-accent" />
          <p className="text-white/70">Loading invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      {error && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          {error}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Invoices & Finance</h1>
          <p className="mt-2 text-white/70">Manage invoices, expenses and financial reports</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-white hover:bg-accent/90 transition-all"
        >
          <AiOutlinePlus className="h-5 w-5" />
          New Invoice
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4 lg:grid-cols-7">
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Total Invoices</p>
              <p className="mt-2 text-3xl font-bold text-white">{stats.total}</p>
            </div>
            <AiOutlineFileText className="h-8 w-8 text-accent" />
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Draft</p>
              <p className="mt-2 text-3xl font-bold text-gray-400">{stats.draft}</p>
            </div>
            <AiOutlineEdit className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Sent</p>
              <p className="mt-2 text-3xl font-bold text-blue-400">{stats.sent}</p>
            </div>
            <AiOutlineMail className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Paid</p>
              <p className="mt-2 text-3xl font-bold text-green-400">{stats.paid}</p>
            </div>
            <AiOutlineCheck className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Overdue</p>
              <p className="mt-2 text-3xl font-bold text-red-400">{stats.overdue}</p>
            </div>
            <AiOutlineWarning className="h-8 w-8 text-red-400" />
          </div>
        </div>

        <div className="glass-panel p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Total Revenue</p>
              <p className="mt-2 text-2xl font-bold text-green-400">£{stats.totalRevenue}</p>
            </div>
            <AiOutlineDollar className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="glass-panel p-6 lg:col-span-3 md:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Outstanding</p>
              <p className="mt-2 text-2xl font-bold text-yellow-400">£{stats.outstanding}</p>
            </div>
            <AiOutlineClockCircle className="h-8 w-8 text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Search */}
          <div className="relative">
            <AiOutlineSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search invoices by number or client name"
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-night-sky transition-all"
            />
          </div>

          {/* View Filter */}
          <select
            value={view}
            onChange={(e) => setView(e.target.value)}
            aria-label="Filter invoices by status"
            className="rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-night-sky [&>option]:bg-night-sky [&>option]:text-white transition-all"
          >
            <option value="all">All Invoices</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>

          {/* Client Filter */}
          <select
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            aria-label="Filter invoices by client"
            className="rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-night-sky [&>option]:bg-night-sky [&>option]:text-white transition-all"
          >
            <option value="">All Clients</option>
            {clients.map(client => (
              <option key={client.$id} value={client.$id}>
                {client.companyName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Invoice #</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Client</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Due Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-white/50">
                    No invoices found
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.$id} className="border-b border-white/10 hover:bg-white/5">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleViewInvoice(invoice)}
                        className="text-sm font-medium text-accent hover:text-accent/80"
                      >
                        {invoice.invoiceNumber}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-white">
                      {getClientName(invoice.clientId)}
                    </td>
                    <td className="px-6 py-4 text-sm text-white">
                      {new Date(invoice.invoiceDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className={isOverdue(invoice) ? 'text-red-400 font-medium' : 'text-white'}>
                        {new Date(invoice.dueDate).toLocaleDateString()}
                        {isOverdue(invoice) && <span className="ml-2 text-xs">(Overdue)</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-white">
                      £{Number(invoice.total || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={invoice.status}
                        onChange={(e) => handleUpdateStatus(invoice.$id, e.target.value)}
                        className={`rounded-lg border border-white/10 px-3 py-1 text-xs font-medium text-white ${getStatusColor(invoice.status)} hover:opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-accent`}
                      >
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadPDF(invoice)}
                          className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 transition-all"
                          title="Download PDF"
                        >
                          <AiOutlineDownload className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleSendEmail(invoice)}
                          className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 transition-all"
                          title="Send Email"
                        >
                          <AiOutlineMail className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenModal(invoice)}
                          aria-label={`Edit invoice ${invoice.invoiceNumber}`}
                          className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-night-sky"
                        >
                          <AiOutlineEdit className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => handleDeleteInvoice(invoice.$id)}
                          aria-label={`Delete invoice ${invoice.invoiceNumber}`}
                          className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-night-sky"
                        >
                          <AiOutlineDelete className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {showDetailModal && viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 border-b border-white/10 bg-night-sky p-6 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">{viewingInvoice.invoiceNumber}</h2>
                  <p className="mt-1 text-sm text-white/50">
                    Status: <span className={`capitalize font-medium ${viewingInvoice.status === 'paid' ? 'text-green-400' : viewingInvoice.status === 'overdue' ? 'text-red-400' : 'text-white'}`}>{viewingInvoice.status}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadPDF(viewingInvoice)}
                    className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 transition-all"
                  >
                    <AiOutlinePrinter className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 transition-all"
                  >
                    <AiOutlineClose className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">From</h3>
                  <p className="text-white font-semibold">Fortis Secured</p>
                  <p className="text-white/70 text-sm">123 Security Street</p>
                  <p className="text-white/70 text-sm">London, UK</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Bill To</h3>
                  <p className="text-white font-semibold">{getClientName(viewingInvoice.clientId)}</p>
                </div>
              </div>

              {/* Invoice Details */}
              <div className="grid grid-cols-3 gap-4 rounded-lg bg-white/5 border border-white/10 p-4">
                <div>
                  <p className="text-sm text-white/50">Invoice Date</p>
                  <p className="text-white font-medium">{new Date(viewingInvoice.invoiceDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-white/50">Due Date</p>
                  <p className="text-white font-medium">{new Date(viewingInvoice.dueDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-white/50">Payment Terms</p>
                  <p className="text-white font-medium">{viewingInvoice.paymentTerms}</p>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Items</h3>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white/70">Description</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-white/70">Qty</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-white/70">Rate</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-white/70">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingInvoice.items.map((item, index) => (
                      <tr key={index} className="border-b border-white/10">
                        <td className="px-4 py-3 text-white">{item.description}</td>
                        <td className="px-4 py-3 text-right text-white">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-white">£{Number(item.rate || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-white font-medium">£{Number(item.amount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-80 space-y-2">
                  <div className="flex justify-between text-white/70">
                    <span>Subtotal</span>
                    <span>£{Number(viewingInvoice.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>VAT ({viewingInvoice.taxRate}%)</span>
                    <span>£{Number(viewingInvoice.taxAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-white/10">
                    <span>Total</span>
                    <span>£{Number(viewingInvoice.total || 0).toFixed(2)}</span>
                  </div>
                  {viewingInvoice.paidDate && (
                    <div className="flex justify-between text-green-400 text-sm">
                      <span>Paid on</span>
                      <span>{new Date(viewingInvoice.paidDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {viewingInvoice.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Notes</h3>
                  <p className="text-white/70 whitespace-pre-wrap">{viewingInvoice.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="glass-panel w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 border-b border-white/10 bg-night-sky p-6 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  {editingInvoice ? 'Edit Invoice' : 'New Invoice'}
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
              {/* Validation Message */}
              {validationMessage && (
                <div
                  role="alert"
                  className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                    validationMessage.includes('Error')
                      ? 'border-red-500/50 bg-red-500/10 text-red-300'
                      : validationMessage.includes('success')
                      ? 'border-green-500/50 bg-green-500/10 text-green-300'
                      : 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                  }`}
                  aria-live="polite"
                >
                  {validationMessage}
                </div>
              )}

              {/* Invoice Number, Client, Status */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="invoice-number" className="mb-2 block text-sm font-medium text-white">Invoice Number</label>
                  <input
                    id="invoice-number"
                    type="text"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    aria-invalid={formErrors.invoiceNumber ? 'true' : 'false'}
                    aria-describedby={formErrors.invoiceNumber ? 'invoiceNumber-error' : undefined}
                    aria-label="Invoice number"
                    className={`w-full rounded-lg border bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-night-sky transition-all ${
                      formErrors.invoiceNumber
                        ? 'border-red-500 focus:border-red-400 focus:ring-red-400'
                        : 'border-white/10 focus:border-accent focus:ring-accent'
                    }`}
                    placeholder="INV-2025-001"
                  />
                  {formErrors.invoiceNumber && (
                    <p id="invoiceNumber-error" className="mt-1 text-sm text-red-400">
                      {formErrors.invoiceNumber}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="client-select" className="mb-2 block text-sm font-medium text-white">
                    Client <span className="text-red-400" aria-label="required">*</span>
                  </label>
                  <select
                    id="client-select"
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    aria-invalid={formErrors.clientId ? 'true' : 'false'}
                    aria-describedby={formErrors.clientId ? 'clientId-error' : undefined}
                    aria-label="Select a client for this invoice"
                    className={`w-full rounded-lg border bg-night-sky py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-night-sky [&>option]:bg-night-sky [&>option]:text-white transition-all ${
                      formErrors.clientId
                        ? 'border-red-500 focus:border-red-400 focus:ring-red-400'
                        : 'border-white/10 focus:border-accent focus:ring-accent'
                    }`}
                    required
                  >
                    <option value="">Select Client</option>
                    {clients.map(client => (
                      <option key={client.$id} value={client.$id}>
                        {client.companyName}
                      </option>
                    ))}
                  </select>
                  {formErrors.clientId && (
                    <p id="clientId-error" className="mt-1 text-sm text-red-400">
                      {formErrors.clientId}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="status-select" className="mb-2 block text-sm font-medium text-white">Status</label>
                  <select
                    id="status-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    aria-label="Invoice status"
                    className="w-full rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-night-sky [&>option]:bg-night-sky [&>option]:text-white transition-all"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Invoice Date</label>
                  <input
                    type="date"
                    value={formData.invoiceDate}
                    onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                    aria-invalid={formErrors.invoiceDate ? 'true' : 'false'}
                    aria-describedby={formErrors.invoiceDate ? 'invoiceDate-error' : undefined}
                    className={`w-full rounded-lg border bg-white/5 px-4 py-2 text-white focus:outline-none focus:ring-1 transition-all ${
                      formErrors.invoiceDate
                        ? 'border-red-500 focus:border-red-400 focus:ring-red-400'
                        : 'border-white/10 focus:border-accent focus:ring-accent'
                    }`}
                  />
                  {formErrors.invoiceDate && (
                    <p id="invoiceDate-error" className="mt-1 text-sm text-red-400">
                      {formErrors.invoiceDate}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    aria-invalid={formErrors.dueDate ? 'true' : 'false'}
                    aria-describedby={formErrors.dueDate ? 'dueDate-error' : undefined}
                    className={`w-full rounded-lg border bg-white/5 px-4 py-2 text-white focus:outline-none focus:ring-1 transition-all ${
                      formErrors.dueDate
                        ? 'border-red-500 focus:border-red-400 focus:ring-red-400'
                        : 'border-white/10 focus:border-accent focus:ring-accent'
                    }`}
                  />
                  {formErrors.dueDate && (
                    <p id="dueDate-error" className="mt-1 text-sm text-red-400">
                      {formErrors.dueDate}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Payment Terms</label>
                  <select
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
                  >
                    <option value="Due on receipt">Due on receipt</option>
                    <option value="15 days">Net 15</option>
                    <option value="30 days">Net 30</option>
                    <option value="60 days">Net 60</option>
                    <option value="90 days">Net 90</option>
                  </select>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">Line Items</h3>
                  <button
                    type="button"
                    onClick={handleOpenShiftSelector}
                    disabled={!formData.clientId}
                    className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <AiOutlineClockCircle className="h-4 w-4" />
                    Import from Shifts
                  </button>
                </div>
                
                {/* Add Item Form */}
                <div className="rounded-lg bg-white/5 border border-white/10 p-4 mb-4">
                  <div className="grid grid-cols-5 gap-3">
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={newItem.description}
                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                        placeholder="Description"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                        placeholder="Qty"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        value={newItem.rate}
                        onChange={(e) => setNewItem({ ...newItem, rate: e.target.value })}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                        placeholder="Rate"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-all"
                      >
                        Add Item
                      </button>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                {formData.items.length > 0 && (
                  <table className="w-full mb-4">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="px-4 py-2 text-left text-sm font-semibold text-white/70">Description</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold text-white/70">Qty</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold text-white/70">Rate</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold text-white/70">Amount</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, index) => (
                        <tr key={index} className="border-b border-white/10">
                          <td className="px-4 py-2 text-white">{item.description}</td>
                          <td className="px-4 py-2 text-right text-white">{item.quantity}</td>
                          <td className="px-4 py-2 text-right text-white">£{item.rate.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right text-white font-medium">£{item.amount.toFixed(2)}</td>
                          <td className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="rounded-lg border border-red-500/20 bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20 transition-all"
                            >
                              <AiOutlineDelete className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-80 space-y-3">
                  <div className="flex justify-between text-white/70">
                    <span>Subtotal</span>
                    <span className="font-medium">£{Number(formData.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">VAT</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={formData.taxRate}
                        onChange={(e) => handleTaxRateChange(parseFloat(e.target.value) || 0)}
                        aria-invalid={formErrors.taxRate ? 'true' : 'false'}
                        aria-describedby={formErrors.taxRate ? 'taxRate-error' : undefined}
                        className={`w-20 rounded-lg border bg-white/5 px-3 py-1 text-sm text-white focus:outline-none focus:ring-1 transition-all ${
                          formErrors.taxRate
                            ? 'border-red-500 focus:border-red-400 focus:ring-red-400'
                            : 'border-white/10 focus:border-accent focus:ring-accent'
                        }`}
                        min="0"
                        step="0.01"
                      />
                      <span className="text-white/70">%</span>
                      <span className="text-white font-medium w-24 text-right">£{Number(formData.taxAmount || 0).toFixed(2)}</span>
                    </div>
                  </div>
                  {formErrors.taxRate && (
                    <p id="taxRate-error" className="text-sm text-red-400">
                      {formErrors.taxRate}
                    </p>
                  )}
                  <div className="flex justify-between text-xl font-bold text-white pt-3 border-t border-white/10">
                    <span>Total</span>
                    <span>£{Number(formData.total || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="Additional notes or payment instructions"
                  rows="3"
                />
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
                  {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shift Selector Modal */}
      {showShiftSelectorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="glass-panel w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 border-b border-white/10 bg-night-sky p-6 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Select Shifts to Invoice</h2>
                  <p className="mt-1 text-sm text-white/50">
                    Client: {getClientName(formData.clientId)} • {selectedShifts.length} shifts selected
                  </p>
                </div>
                <button
                  onClick={() => setShowShiftSelectorModal(false)}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 transition-all"
                >
                  <AiOutlineClose className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <AiOutlineSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50" />
                  <input
                    type="text"
                    placeholder="Search by site name or date..."
                    value={shiftSearchTerm}
                    onChange={(e) => setShiftSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <input
                  type="date"
                  value={shiftDateFilter}
                  onChange={(e) => setShiftDateFilter(e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="Filter by date"
                />
              </div>

              {/* Shifts List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {getAvailableShifts().length === 0 ? (
                  <div className="text-center py-12 text-white/50">
                    <AiOutlineClockCircle className="mx-auto mb-4 h-12 w-12" />
                    <p>No completed shifts found for this client</p>
                    <p className="text-sm mt-2">Shifts must have clock-in and clock-out times to be invoiced</p>
                  </div>
                ) : (
                  getAvailableShifts().map(shift => {
                    const { hours, cost, guardCount } = getShiftHoursAndCost(shift.$id);
                    const isSelected = selectedShifts.includes(shift.$id);
                    
                    return (
                      <div
                        key={shift.$id}
                        onClick={() => toggleShiftSelection(shift.$id)}
                        className={`cursor-pointer rounded-lg border p-4 transition-all ${
                          isSelected
                            ? 'border-accent bg-accent/10'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className={`h-5 w-5 rounded border-2 flex items-center justify-center ${
                                isSelected ? 'border-accent bg-accent' : 'border-white/30'
                              }`}>
                                {isSelected && <AiOutlineCheck className="h-3 w-3 text-white" />}
                              </div>
                              <div>
                                <p className="font-semibold text-white">{getSiteName(shift.siteId)}</p>
                                <p className="text-sm text-white/70">
                                  {new Date(shift.date).toLocaleDateString()} • {shift.startTime} - {shift.endTime}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 ml-8 flex items-center gap-4 text-sm">
                              <span className="text-white/70">
                                <AiOutlineUser className="inline h-4 w-4 mr-1" />
                                {guardCount} {guardCount === 1 ? 'Guard' : 'Guards'}
                              </span>
                              <span className="text-white/70">
                                <AiOutlineClockCircle className="inline h-4 w-4 mr-1" />
                                {hours} hours
                              </span>
                              <span className="text-accent font-semibold">
                                £{cost.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div className="text-white">
                  {selectedShifts.length > 0 && (
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-white/70">
                        Total: <span className="font-semibold text-white">
                          £{selectedShifts.reduce((sum, shiftId) => {
                            const { cost } = getShiftHoursAndCost(shiftId);
                            return sum + cost;
                          }, 0).toFixed(2)}
                        </span>
                      </span>
                      <span className="text-sm text-white/70">
                        ({selectedShifts.reduce((sum, shiftId) => {
                          const { hours } = getShiftHoursAndCost(shiftId);
                          return sum + hours;
                        }, 0).toFixed(2)} hours)
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowShiftSelectorModal(false)}
                    className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 font-medium text-white hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleImportShifts}
                    disabled={selectedShifts.length === 0}
                    className="rounded-lg bg-accent px-4 py-2 font-semibold text-white hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Import {selectedShifts.length} {selectedShifts.length === 1 ? 'Shift' : 'Shifts'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;
