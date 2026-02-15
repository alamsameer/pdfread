'use client';

import { useEffect, useState, useRef } from 'react';
import { PDFViewer } from '@/components/reader/PDFViewer';
import { HighlightMenu } from '@/components/reader/HighlightMenu';
import { AnnotationPanel } from '@/components/reader/AnnotationPanel';
import { TableOfContents } from '@/components/reader/TableOfContents';
import { useDocumentStore } from '@/lib/stores/useDocumentStore';
import { useAnnotationStore } from '@/lib/stores/useAnnotationStore';
import { useReaderStore } from '@/lib/stores/useReaderStore';
import { useUIStore } from '@/lib/stores/useUIStore';
import { documentsAPI } from '@/lib/api/documents';
import { annotationsAPI } from '@/lib/api/annotations';
import { useHighlight } from '@/lib/hooks/useHighlight';
import { useReadingSession } from '@/lib/hooks/useReadingSession';
import { usePreferencesStore } from '@/lib/stores/usePreferencesStore';
import { Loader2 } from 'lucide-react';

export default function ReaderPage({ params }: { params: { docId: string } }) {
  const { docId } = params;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isSidebarOpen, activeTab, setActiveTab } = useUIStore();
  const currentDocument = useDocumentStore((state) => state.currentDocument);
  const setAnnotations = useAnnotationStore((state) => state.setAnnotations);
  const { openMenu, setEditingAnnotation, selection, isSelecting, closeMenu } = useReaderStore();
  const { createHighlight, updateAnnotation, deleteAnnotation } = useHighlight(docId);
  const fetchPreferences = usePreferencesStore((state) => state.fetchPreferences);
  const hasOpenedMenuRef = useRef(false);

  // Track reading time
  useReadingSession(docId);

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

  // Fetch preferences
  useEffect(() => {
      fetchPreferences();
  }, [fetchPreferences]);

  // Open menu when selection is complete

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
        <div className="absolute md:relative inset-0 md:inset-auto z-30 md:z-20 flex">
          {/* Backdrop on mobile */}
          <div className="flex-1 bg-black/30 md:hidden" onClick={() => useUIStore.getState().toggleSidebar()} />
          <div className="flex h-full flex-col w-[85vw] sm:w-80 md:w-80 border-l border-gray-200 bg-white shadow-lg ml-auto md:ml-0">
            <div className="flex border-b border-gray-200">
               <button
                  className={`flex-1 py-3 text-sm font-medium ${activeTab === 'annotations' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setActiveTab('annotations')}
               >
                  Annotations
               </button>
               <button
                  className={`flex-1 py-3 text-sm font-medium ${activeTab === 'toc' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setActiveTab('toc')}
               >
                  Table of Contents
               </button>
            </div>
            
            <div className="flex-1 overflow-hidden">
               {activeTab === 'annotations' ? (
                  <AnnotationPanel
                    docId={docId}
                    onEditAnnotation={handleEditAnnotation}
                    onDeleteAnnotation={handleDeleteAnnotation}
                  />
               ) : (
                  <TableOfContents />
               )}
            </div>
          </div>
        </div>
      )}

      {/* Highlight Menu */}
      <HighlightMenu />
    </div>
  );
}
