'use client';

import { useEffect, useState, useRef } from 'react';
import { PDFViewer } from '@/components/reader/PDFViewer';
import { HighlightMenu } from '@/components/reader/HighlightMenu';
import { AnnotationPanel } from '@/components/reader/AnnotationPanel';
import { useDocumentStore } from '@/lib/stores/useDocumentStore';
import { useAnnotationStore } from '@/lib/stores/useAnnotationStore';
import { useReaderStore } from '@/lib/stores/useReaderStore';
import { useUIStore } from '@/lib/stores/useUIStore';
import { documentsAPI } from '@/lib/api/documents';
import { annotationsAPI } from '@/lib/api/annotations';
import { useHighlight } from '@/lib/hooks/useHighlight';
import { Loader2 } from 'lucide-react';

export default function ReaderPage({ params }: { params: { docId: string } }) {
  const { docId } = params;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isSidebarOpen } = useUIStore();
  const currentDocument = useDocumentStore((state) => state.currentDocument);
  const setAnnotations = useAnnotationStore((state) => state.setAnnotations);
  const { openMenu, setEditingAnnotation, selection, isSelecting, closeMenu } = useReaderStore();
  const { createHighlight, updateAnnotation, deleteAnnotation } = useHighlight(docId);
  const hasOpenedMenuRef = useRef(false);

  // Fetch document
  useEffect(() => {
    const fetchDocument = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const doc = await documentsAPI.getDocument(docId);
        useDocumentStore.getState().setDocument(doc);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocument();
  }, [docId]);

  // Fetch annotations
  useEffect(() => {
    const fetchAnnotations = async () => {
      try {
        const data = await annotationsAPI.getAnnotations(docId);
        setAnnotations(data);
      } catch (err) {
        console.error('Failed to load annotations:', err);
      }
    };

    fetchAnnotations();
  }, [docId, setAnnotations]);

  // Open menu when selection is complete
  useEffect(() => {
    if (
      selection.startTokenId &&
      selection.endTokenId &&
      !isSelecting &&
      !hasOpenedMenuRef.current
    ) {
      const endToken = document.getElementById(`t-${selection.endTokenId}`);
      if (endToken) {
        const rect = endToken.getBoundingClientRect();
        openMenu(rect.left, rect.bottom + 8);
        hasOpenedMenuRef.current = true;
      }
    } else if (!selection.startTokenId) {
      hasOpenedMenuRef.current = false;
    }
  }, [selection.startTokenId, selection.endTokenId, isSelecting, openMenu]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-red-700">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!currentDocument) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">Document not found</div>
      </div>
    );
  }

  const handleEditAnnotation = (annotationId: string) => {
    setEditingAnnotation(annotationId);
    openMenu(window.innerWidth / 2 - 160, window.innerHeight / 2 - 100);
  };

  const handleDeleteAnnotation = (annotationId: string) => {
    deleteAnnotation(annotationId);
  };

  const handleUpdateAnnotation = (params: { color?: string; note?: string }) => {
    const editingId = useReaderStore.getState().editingAnnotationId;
    if (editingId) {
      updateAnnotation(editingId, params);
      setEditingAnnotation(null);
    }
  };

  const handleMenuDeleteAnnotation = () => {
    const editingId = useReaderStore.getState().editingAnnotationId;
    if (editingId) {
      handleDeleteAnnotation(editingId);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Main Content */}
      <div className="flex-1">
        <PDFViewer docId={docId} />
      </div>

      {/* Sidebar */}
      {isSidebarOpen && (
        <div className="w-80 border-l border-gray-200 bg-white">
          <AnnotationPanel
            docId={docId}
            onEditAnnotation={handleEditAnnotation}
            onDeleteAnnotation={handleDeleteAnnotation}
          />
        </div>
      )}

      {/* Highlight Menu */}
      <HighlightMenu />
    </div>
  );
}
