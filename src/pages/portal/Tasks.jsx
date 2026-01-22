import React, { useState, useEffect } from 'react';
import { databases, config } from '../../lib/appwrite';
import { Query, ID } from 'appwrite';
import { validateRequired, parseDate, formatDate } from '../../lib/validation';
import {
  AiOutlineCheckCircle,
  AiOutlineClockCircle,
  AiOutlineWarning,
  AiOutlineFlag,
  AiOutlinePlus,
  AiOutlineEdit,
  AiOutlineDelete,
  AiOutlineUser,
  AiOutlineEnvironment,
  AiOutlineCalendar,
  AiOutlineSearch,
  AiOutlineFilter,
  AiOutlineClose,
} from 'react-icons/ai';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [guards, setGuards] = useState([]);
  const [clients, setClients] = useState([]);
  const [sites, setSites] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [view, setView] = useState('all'); // all, my-tasks, pending, in-progress, completed
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [validationMessage, setValidationMessage] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    assignedTo: '',
    clientId: '',
    siteId: '',
    shiftId: '',
    dueDate: '',
    dueTime: '',
    taskType: 'general',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      let guardsData = [];
      try {
        const tasksEnabled = Boolean(config.tasksCollectionId);
        const [guardsRes, clientsRes, sitesRes, shiftsRes, tasksRes] = await Promise.all([
          databases.listDocuments(config.databaseId, config.guardsCollectionId, [Query.limit(500)]),
          databases.listDocuments(config.databaseId, config.clientsCollectionId, [Query.limit(500)]),
          databases.listDocuments(config.databaseId, config.sitesCollectionId, [Query.limit(500)]),
          databases.listDocuments(config.databaseId, config.shiftsCollectionId, [Query.limit(500)]),
          tasksEnabled
            ? databases.listDocuments(config.databaseId, config.tasksCollectionId, [Query.limit(200), Query.orderDesc('updatedAt')])
            : Promise.resolve({ documents: [] }),
        ]);

        guardsData = guardsRes.documents;
        setClients(clientsRes.documents);
        setSites(sitesRes.documents);
        setShifts(shiftsRes.documents);
        setTasks(tasksRes.documents || []);
      } catch (error) {
        console.log('Unable to load guard data. Connect Appwrite to enable live tasks.', error);
        guardsData = [];
        setClients([]);
        setSites([]);
        setShifts([]);
        setTasks([]);
      }

      setGuards(guardsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load tasks data');
    } finally {
      setLoading(false);
    }
  };

  const getGuardName = (guardId) => {
    const guard = guards.find(g => g.$id === guardId);
    return guard ? `${guard.firstName} ${guard.lastName}` : 'Unassigned';
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.$id === clientId);
    return client ? client.companyName : '';
  };

  const getSiteName = (siteId) => {
    const site = sites.find(s => s.$id === siteId);
    return site ? site.siteName : '';
  };

  const handleOpenModal = (task = null) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        status: task.status || 'pending',
        assignedTo: task.assignedTo || '',
        clientId: task.clientId || '',
        siteId: task.siteId || '',
        shiftId: task.shiftId || '',
        dueDate: task.dueDate || '',
        dueTime: task.dueTime || '',
        taskType: task.taskType || 'general',
        notes: task.notes || '',
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        status: 'pending',
        assignedTo: '',
        clientId: '',
        siteId: '',
        shiftId: '',
        dueDate: '',
        dueTime: '',
        taskType: 'general',
        notes: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTask(null);
    setFormErrors({});
    setValidationMessage('');
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      status: 'pending',
      assignedTo: '',
      clientId: '',
      siteId: '',
      shiftId: '',
      dueDate: '',
      dueTime: '',
      taskType: 'general',
      notes: '',
    });
  };

  const validateTaskForm = () => {
    const errors = {};
    
    // Validate required fields
    const validation = validateRequired(formData, ['title']);
    if (!validation.isValid) {
      Object.assign(errors, validation.errors);
    }
    
    // Additional validations
    if (formData.title.trim().length < 3) {
      errors.title = 'Task title must be at least 3 characters';
    }
    
    if (formData.title.trim().length > 100) {
      errors.title = 'Task title must not exceed 100 characters';
    }
    
    if (formData.dueDate && formData.dueTime) {
      const dueDateTime = parseDate(`${formData.dueDate}T${formData.dueTime}`);
      if (dueDateTime < new Date() && formData.status !== 'completed') {
        errors.dueDate = 'Due date/time must be in the future for pending tasks';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateTaskForm()) {
      setValidationMessage('Please fix the errors above before submitting.');
      return;
    }
    
    try {
      const taskData = {
        ...formData,
        createdAt: editingTask?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editingTask) {
        // Update existing task
        const updatedTasks = tasks.map(t => 
          t.$id === editingTask.$id ? { ...t, ...taskData } : t
        );
        setTasks(updatedTasks);
        setValidationMessage('Task updated successfully!');
        
        // When collection exists, use:
        // await databases.updateDocument(config.databaseId, config.tasksCollectionId, editingTask.$id, taskData);
      } else {
        // Create new task
        const newTask = {
          $id: ID.unique(),
          ...taskData,
        };
        setTasks([newTask, ...tasks]);
        setValidationMessage('Task created successfully!');
        
        // When collection exists, use:
        // await databases.createDocument(config.databaseId, config.tasksCollectionId, ID.unique(), taskData);
      }

      setTimeout(() => handleCloseModal(), 1000);
    } catch (error) {
      console.error('Error saving task:', error);
      setValidationMessage(`Failed to save task: ${error.message}`);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      setTasks(tasks.filter(t => t.$id !== taskId));
      
      // When collection exists, use:
      // await databases.deleteDocument(config.databaseId, config.tasksCollectionId, taskId);
      
      alert('Task deleted successfully!');
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task');
    }
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      const updatedTasks = tasks.map(t => 
        t.$id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t
      );
      setTasks(updatedTasks);
      
      // When collection exists, use:
      // await databases.updateDocument(config.databaseId, config.tasksCollectionId, taskId, { status: newStatus });
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update task status');
    }
  };

  const filterTasks = () => {
    let filtered = [...tasks];

    // View filter
    if (view === 'pending') {
      filtered = filtered.filter(t => t.status === 'pending');
    } else if (view === 'in-progress') {
      filtered = filtered.filter(t => t.status === 'in-progress');
    } else if (view === 'completed') {
      filtered = filtered.filter(t => t.status === 'completed');
    }

    // Priority filter
    if (filterPriority) {
      filtered = filtered.filter(t => t.priority === filterPriority);
    }

    // Assignee filter
    if (filterAssignee) {
      filtered = filtered.filter(t => t.assignedTo === filterAssignee);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getGuardName(t.assignedTo).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by due date and priority
    filtered.sort((a, b) => {
      // First by status (pending/in-progress before completed)
      const statusOrder = { 'pending': 0, 'in-progress': 1, 'completed': 2 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      
      // Then by priority
      const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      
      // Then by due date
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      
      return 0;
    });

    return filtered;
  };

  const calculateStats = () => {
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const overdue = tasks.filter(t => {
      if (t.status === 'completed' || !t.dueDate) return false;
      return new Date(t.dueDate) < new Date();
    }).length;

    return { total, pending, inProgress, completed, overdue };
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'in-progress': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const isOverdue = (task) => {
    if (task.status === 'completed' || !task.dueDate) return false;
    return new Date(task.dueDate) < new Date();
  };

  const stats = calculateStats();
  const filteredTasks = filterTasks();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AiOutlineClockCircle className="mx-auto mb-4 h-12 w-12 animate-spin text-brand" />
          <p className="text-text-2">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fs-page space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="fs-title">Tasks</h1>
          <p className="fs-subtitle">Manage and track security tasks and assignments</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="fs-btn-primary px-4 py-2"
        >
          <AiOutlinePlus className="h-5 w-5" />
          New Task
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
        <div className="fs-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-3">Total Tasks</p>
              <p className="mt-2 text-3xl font-bold text-text">{stats.total}</p>
            </div>
            <AiOutlineCheckCircle className="h-8 w-8 text-brand" />
          </div>
        </div>

        <div className="fs-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-3">Pending</p>
              <p className="mt-2 text-3xl font-bold text-warning">{stats.pending}</p>
            </div>
            <AiOutlineClockCircle className="h-8 w-8 text-warning" />
          </div>
        </div>

        <div className="fs-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-3">In Progress</p>
              <p className="mt-2 text-3xl font-bold text-warning">{stats.inProgress}</p>
            </div>
            <AiOutlineClockCircle className="h-8 w-8 text-warning" />
          </div>
        </div>

        <div className="fs-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-3">Completed</p>
              <p className="mt-2 text-3xl font-bold text-success">{stats.completed}</p>
            </div>
            <AiOutlineCheckCircle className="h-8 w-8 text-success" />
          </div>
        </div>

        <div className="fs-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-3">Overdue</p>
              <p className="mt-2 text-3xl font-bold text-error">{stats.overdue}</p>
            </div>
            <AiOutlineWarning className="h-8 w-8 text-error" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="fs-card">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {/* Search */}
          <div className="relative">
            <AiOutlineSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-3" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-glass w-full pl-10"
            />
          </div>

          {/* View Filter */}
          <select
            value={view}
            onChange={(e) => setView(e.target.value)}
            className="rounded-lg border border-border bg-bg py-2 px-4 text-text focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand [&>option]:bg-bg [&>option]:text-text"
          >
            <option value="all">All Tasks</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="rounded-lg border border-border bg-bg py-2 px-4 text-text focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand [&>option]:bg-bg [&>option]:text-text"
          >
            <option value="">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          {/* Assignee Filter */}
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="rounded-lg border border-border bg-bg py-2 px-4 text-text focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand [&>option]:bg-bg [&>option]:text-text"
          >
            <option value="">All Assignees</option>
            {guards.map(guard => (
              <option key={guard.$id} value={guard.$id}>
                {guard.firstName} {guard.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredTasks.length === 0 ? (
          <div className="fs-card p-12 text-center">
            <AiOutlineCheckCircle className="mx-auto mb-4 h-16 w-16 text-text-3/20" />
            <p className="text-lg text-text-3">No tasks found</p>
            <p className="mt-2 text-sm text-text-3">Create your first task to get started</p>
            <button
              onClick={() => handleOpenModal()}
              className="mt-6 fs-btn-ghost"
            >
              <AiOutlinePlus className="h-4 w-4" />
              New Task
            </button>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div key={task.$id} className="glass-panel p-6 hover:border-accent/50 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className={`h-3 w-3 rounded-full ${getPriorityColor(task.priority)}`} title={`${task.priority} priority`}></span>
                    <h3 className="text-lg font-semibold text-white">{task.title}</h3>
                    {isOverdue(task) && (
                      <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
                        <AiOutlineWarning className="h-3 w-3" />
                        Overdue
                      </span>
                    )}
                  </div>
                  
                  <p className="mt-2 text-sm text-white/70">{task.description}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/50">
                    {task.assignedTo && (
                      <div className="flex items-center gap-1">
                        <AiOutlineUser className="h-4 w-4" />
                        {getGuardName(task.assignedTo)}
                      </div>
                    )}
                    
                    {task.dueDate && (
                      <div className="flex items-center gap-1">
                        <AiOutlineCalendar className="h-4 w-4" />
                        {new Date(task.dueDate).toLocaleDateString()}
                        {task.dueTime && ` at ${task.dueTime}`}
                      </div>
                    )}

                    {task.clientId && (
                      <div className="flex items-center gap-1">
                        <AiOutlineEnvironment className="h-4 w-4" />
                        {getClientName(task.clientId)}
                      </div>
                    )}

                    {task.siteId && (
                      <div className="text-white/40">
                        / {getSiteName(task.siteId)}
                      </div>
                    )}

                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs capitalize">
                      {task.taskType}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status Dropdown */}
                  <select
                    value={task.status}
                    onChange={(e) => handleUpdateStatus(task.$id, e.target.value)}
                    className={`rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white ${getStatusColor(task.status)} hover:opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-accent`}
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>

                  {/* Edit Button */}
                  <button
                    onClick={() => handleOpenModal(task)}
                    className="fs-btn-ghost p-2"
                  >
                    <AiOutlineEdit className="h-4 w-4" />
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteTask(task.$id)}
                    className="rounded-lg border border-error/30 bg-error/15 p-2 text-error hover:bg-error/20 transition-all"
                  >
                    <AiOutlineDelete className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="fs-card w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 border-b border-border bg-bg p-6 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-text">
                  {editingTask ? 'Edit Task' : 'New Task'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="fs-btn-ghost p-2"
                >
                  <AiOutlineClose className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Validation Message */}
              {validationMessage && (
                <div className={`p-3 rounded-lg text-sm border ${ 
                  validationMessage.includes('successfully')
                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                }`} role="alert">
                  {validationMessage}
                </div>
              )}

              {/* Title */}
              <div>
                <label htmlFor="task-title" className="mb-2 block text-sm font-medium text-text">
                  Task Title <span className="text-error">*</span>
                </label>
                <input
                  id="task-title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  aria-invalid={!!formErrors.title}
                  aria-describedby={formErrors.title ? 'title-error' : undefined}
                  className={`w-full rounded-lg border bg-bg px-4 py-2 text-text placeholder-text-3 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-bg transition-all ${
                    formErrors.title ? 'border-error/50 bg-error/10' : 'border-border'
                  }`}
                  placeholder="Enter task title (min 3 characters)"
                  required
                />
                {formErrors.title && (
                  <p id="title-error" className="mt-1 text-xs text-error">{formErrors.title}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-sm font-medium text-text">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-glass w-full"
                  placeholder="Enter task description"
                  rows="4"
                />
              </div>

              {/* Priority and Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-text">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full rounded-lg border border-border bg-bg py-2 px-4 text-text focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand [&>option]:bg-bg [&>option]:text-text"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-text">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full rounded-lg border border-border bg-bg py-2 px-4 text-text focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand [&>option]:bg-bg [&>option]:text-text"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Task Type and Assigned To */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-text">Task Type</label>
                  <select
                    value={formData.taskType}
                    onChange={(e) => setFormData({ ...formData, taskType: e.target.value })}
                    className="w-full rounded-lg border border-border bg-bg py-2 px-4 text-text focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand [&>option]:bg-bg [&>option]:text-text"
                  >
                    <option value="general">General</option>
                    <option value="patrol">Patrol</option>
                    <option value="inspection">Inspection</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="incident-response">Incident Response</option>
                    <option value="training">Training</option>
                    <option value="compliance">Compliance</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-text">Assign To</label>
                  <select
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    className="w-full rounded-lg border border-border bg-bg py-2 px-4 text-text focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand [&>option]:bg-bg [&>option]:text-text"
                  >
                    <option value="">Unassigned</option>
                    {guards.map(guard => (
                      <option key={guard.$id} value={guard.$id}>
                        {guard.firstName} {guard.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Due Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="due-date" className="mb-2 block text-sm font-medium text-text">Due Date</label>
                  <input
                    id="due-date"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    aria-invalid={!!formErrors.dueDate}
                    aria-describedby={formErrors.dueDate ? 'duedate-error' : undefined}
                    className={`w-full rounded-lg border bg-bg px-4 py-2 text-text focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-bg transition-all ${
                      formErrors.dueDate ? 'border-error/50 bg-error/10' : 'border-border'
                    }`}
                  />
                  {formErrors.dueDate && (
                    <p id="duedate-error" className="mt-1 text-xs text-error">{formErrors.dueDate}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="due-time" className="mb-2 block text-sm font-medium text-text">Due Time</label>
                  <input
                    id="due-time"
                    type="time"
                    value={formData.dueTime}
                    onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                    className="w-full rounded-lg border border-border bg-bg px-4 py-2 text-text focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-bg transition-all"
                  />
                </div>
              </div>

              {/* Client, Site, Shift */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-text">Client</label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="w-full rounded-lg border border-border bg-bg py-2 px-4 text-text focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand [&>option]:bg-bg [&>option]:text-text"
                  >
                    <option value="">None</option>
                    {clients.map(client => (
                      <option key={client.$id} value={client.$id}>
                        {client.companyName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-text">Site</label>
                  <select
                    value={formData.siteId}
                    onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
                    className="w-full rounded-lg border border-border bg-bg py-2 px-4 text-text focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand [&>option]:bg-bg [&>option]:text-text"
                    disabled={!formData.clientId}
                  >
                    <option value="">None</option>
                    {sites
                      .filter(site => !formData.clientId || site.clientId === formData.clientId)
                      .map(site => (
                        <option key={site.$id} value={site.$id}>
                          {site.siteName}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-text">Related Shift</label>
                  <select
                    value={formData.shiftId}
                    onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })}
                    className="w-full rounded-lg border border-border bg-bg py-2 px-4 text-text focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand [&>option]:bg-bg [&>option]:text-text"
                  >
                    <option value="">None</option>
                    {shifts
                      .filter(shift => !formData.siteId || shift.siteId === formData.siteId)
                      .map(shift => (
                        <option key={shift.$id} value={shift.$id}>
                          {shift.date} {shift.startTime}-{shift.endTime}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-2 block text-sm font-medium text-text">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-glass w-full"
                  placeholder="Additional notes..."
                  rows="3"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="fs-btn-ghost px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="fs-btn-primary px-4 py-2"
                >
                  {editingTask ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
