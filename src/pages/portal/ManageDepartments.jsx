import React, { useMemo, useState } from 'react';
import PageHeader from '../../components/PageHeader.jsx';
import { useDepartments } from '../../hooks/useDepartments.js';

const ManageDepartments = () => {
  const {
    departments,
    departmentDocs,
    loading,
    error,
    source,
    canManage,
    createDepartment,
    updateDepartment,
    deleteDepartment,
  } = useDepartments();

  const [newDepartment, setNewDepartment] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [message, setMessage] = useState(null);

  const docsByName = useMemo(() => {
    const map = new Map();
    for (const doc of departmentDocs) {
      const name = doc.name || doc.title || doc.slug;
      if (name) {
        map.set(name, doc);
      }
    }
    return map;
  }, [departmentDocs]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setMessage(null);

    try {
      await createDepartment(newDepartment);
      setMessage({ type: 'success', text: 'Department created.' });
      setNewDepartment('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to create department.' });
    }
  };

  const startEditing = (departmentName) => {
    const doc = docsByName.get(departmentName);
    if (!doc) {
      return;
    }

    setEditingId(doc.$id);
    setEditingName(departmentName);
  };

  const handleSaveEdit = async () => {
    if (!editingId) {
      return;
    }

    try {
      await updateDepartment(editingId, editingName);
      setMessage({ type: 'success', text: 'Department updated.' });
      setEditingId(null);
      setEditingName('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update department.' });
    }
  };

  const handleDelete = async (departmentName) => {
    const doc = docsByName.get(departmentName);
    if (!doc) {
      return;
    }

    const confirmed = window.confirm(`Delete department "${departmentName}"?`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteDepartment(doc.$id);
      setMessage({ type: 'success', text: 'Department deleted.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete department.' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-night-sky to-night-sky p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          category="Admin"
          title="Manage Departments"
          subtitle="Configure department values used in profiles and staff records"
        />

        {message && (
          <div
            className={`mb-6 rounded-lg p-4 ${
              message.type === 'success'
                ? 'border border-green-500/20 bg-green-500/10 text-green-400'
                : 'border border-red-500/20 bg-red-500/10 text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        {!canManage && (
          <div className="mb-6 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-amber-300">
            Departments collection is not configured. Showing fallback constants list only.
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
            {error}
          </div>
        )}

        {canManage && (
          <form onSubmit={handleCreate} className="mb-6 grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 md:grid-cols-[1fr_auto]">
            <input
              type="text"
              value={newDepartment}
              onChange={(e) => setNewDepartment(e.target.value)}
              placeholder="Add department name"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              type="submit"
              className="rounded-lg bg-accent px-6 py-3 font-medium text-white hover:bg-accent/90"
            >
              Add Department
            </button>
          </form>
        )}

        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <table className="w-full text-left text-sm text-white/90">
            <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-white/60">
              <tr>
                <th className="px-4 py-3">Department</th>
                {canManage && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canManage ? 2 : 1} className="px-4 py-4 text-white/60">
                    Loading departments...
                  </td>
                </tr>
              ) : departments.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 2 : 1} className="px-4 py-4 text-white/60">
                    No departments found.
                  </td>
                </tr>
              ) : (
                departments.map((departmentName) => (
                  <tr key={departmentName} className="border-b border-white/5 last:border-b-0">
                    <td className="px-4 py-3">
                      {editingId && docsByName.get(departmentName)?.$id === editingId ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                      ) : (
                        departmentName
                      )}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {editingId && docsByName.get(departmentName)?.$id === editingId ? (
                            <>
                              <button type="button" onClick={handleSaveEdit} className="rounded bg-accent px-3 py-1 text-xs text-white">
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditingName('');
                                }}
                                className="rounded bg-white/10 px-3 py-1 text-xs text-white"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEditing(departmentName)}
                                className="rounded bg-white/10 px-3 py-1 text-xs text-white"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(departmentName)}
                                className="rounded bg-red-500/20 px-3 py-1 text-xs text-red-300"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-white/50">Source: {source === 'collection' ? 'Appwrite departments collection' : 'Fallback constants list'}.</p>
      </div>
    </div>
  );
};

export default ManageDepartments;
