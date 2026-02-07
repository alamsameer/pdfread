'use client';

import { useEffect } from 'react';
import { useDocumentStore } from '@/lib/stores/useDocumentStore';
import { documentsAPI } from '@/lib/api/documents';

export function useDocumentData(docId: string) {
  const setDocument = useDocumentStore((state) => state.setDocument);
  const setLoading = useDocumentStore((state) => state.setLoading);
  const setError = useDocumentStore((state) => state.setError);

  useEffect(() => {
    const fetchDocument = async () => {
      setLoading(true);
      setError(null);
      try {
        const doc = await documentsAPI.getDocument(docId);
        setDocument(doc);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load document');
        console.error('Document fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    if (docId) {
      fetchDocument();
    }
  }, [docId, setDocument, setLoading, setError]);
}
