import { useEffect, useState } from 'react';
import { config, databases } from '../lib/appwrite.js';
import { ID, Query } from 'appwrite';
import { DEFAULT_DEPARTMENTS } from '../constants/departments.js';

/**
 * useDepartments
 * Returns a list of departments to populate profile forms.
 * - If an Appwrite collection is available (VITE_APPWRITE_DEPARTMENTS_COLLECTION_ID), fetch from it.
 * - Otherwise, falls back to a static list.
 */
export function useDepartments() {
  const [departments, setDepartments] = useState([]);
  const [departmentDocs, setDepartmentDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [source, setSource] = useState('fallback');

  const collectionId = config.departmentsCollectionId;
  const canManage = Boolean(collectionId && databases && !config.isDemoMode && config.databaseId);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      setError(null);

      if (canManage) {
        const result = await databases.listDocuments(
          config.databaseId,
          collectionId,
          [Query.orderAsc('name')]
        );
        const items = (result?.documents || [])
          .map((d) => d.name || d.title || d.slug)
          .filter(Boolean);

        setDepartments(items);
        setDepartmentDocs(result?.documents || []);
        setSource('collection');
      } else {
        setDepartments(DEFAULT_DEPARTMENTS);
        setDepartmentDocs([]);
        setSource('fallback');
      }
    } catch (e) {
      setDepartments(DEFAULT_DEPARTMENTS);
      setDepartmentDocs([]);
      setSource('fallback');
      setError(e.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, [canManage, collectionId]);

  const createDepartment = async (name) => {
    if (!canManage) {
      throw new Error('Departments collection is not configured');
    }
    const cleanName = name?.trim();
    if (!cleanName) {
      throw new Error('Department name is required');
    }

    await databases.createDocument(
      config.databaseId,
      collectionId,
      ID.unique(),
      {
        name: cleanName,
      }
    );

    await loadDepartments();
  };

  const updateDepartment = async (documentId, name) => {
    if (!canManage) {
      throw new Error('Departments collection is not configured');
    }
    const cleanName = name?.trim();
    if (!cleanName) {
      throw new Error('Department name is required');
    }

    await databases.updateDocument(config.databaseId, collectionId, documentId, { name: cleanName });
    await loadDepartments();
  };

  const deleteDepartment = async (documentId) => {
    if (!canManage) {
      throw new Error('Departments collection is not configured');
    }

    await databases.deleteDocument(config.databaseId, collectionId, documentId);
    await loadDepartments();
  };

  return {
    departments,
    departmentDocs,
    loading,
    error,
    source,
    canManage,
    refresh: () => loadDepartments(),
    createDepartment,
    updateDepartment,
    deleteDepartment,
  };
}
