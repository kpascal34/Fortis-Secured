import { useEffect, useState } from 'react';
import { config, databases } from '../lib/appwrite.js';
import { Query } from 'appwrite';

/**
 * useDepartments
 * Returns a list of departments to populate profile forms.
 * - If an Appwrite collection is available (VITE_APPWRITE_DEPARTMENTS_COLLECTION_ID), fetch from it.
 * - Otherwise, falls back to a static list.
 */
export function useDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        // If a dedicated departments collection exists and not in demo mode, fetch it
        const collectionId = import.meta.env.VITE_APPWRITE_DEPARTMENTS_COLLECTION_ID;
        const shouldFetch = Boolean(
          collectionId && databases && !config.isDemoMode && config.databaseId
        );

        if (shouldFetch) {
          const result = await databases.listDocuments(
            config.databaseId,
            collectionId,
            [Query.orderAsc('name')]
          );
          const items = (result?.documents || []).map((d) => d.name || d.title || d.slug).filter(Boolean);
          if (!cancelled) setDepartments(items);
        } else {
          // Static fallback list
          const fallback = [
            'Operations',
            'Management',
            'HR',
            'Compliance',
            'Finance',
            'Security',
            'IT',
            'Sales',
            'Marketing',
          ];
          if (!cancelled) setDepartments(fallback);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load departments');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { departments, loading, error };
}
