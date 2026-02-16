'use client';

import { useEffect, useState, useRef } from 'react';
import { useDocumentStore } from '@/lib/stores/useDocumentStore';
import { PDFPage } from './PDFPage';
import { ReaderToolbar } from './ReaderToolbar';
import { useReaderStore } from '@/lib/stores/useReaderStore';
import { Loader2 } from 'lucide-react';
import { THEMES } from '@/lib/constants/themes';

interface PDFViewerProps {
  docId: string;
}

export function PDFViewer({ docId }: PDFViewerProps) {
  const currentDocument = useDocumentStore((state) => state.currentDocument);
  const { targetPage, jumpToPage } = useReaderStore((state) => ({ targetPage: state.targetPage, jumpToPage: state.jumpToPage }));
  const [currentPage, setCurrentPage] = useState(1);
  const [visiblePages, setVisiblePages] = useState<number[]>([1]);
  const observerTarget = useRef<HTMLDivElement>(null);

  const themeClass = THEMES.find(t => t.id === (currentDocument?.theme || 'plain'))?.className || 'bg-white';

  useEffect(() => {
    // Reset to page 1 when document changes
    setCurrentPage(1);
    setVisiblePages([1]);
  }, [docId]);

  useEffect(() => {
    // Infinite scroll observer
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && currentDocument) {
          const nextPage = visiblePages.length + 1;
          if (nextPage <= currentDocument.total_pages) {
            setVisiblePages((prev) => [...prev, nextPage]);
          }
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [visiblePages, currentDocument]);

  // Handle TOC Navigation
  useEffect(() => {
    if (targetPage) {
      // Ensure target page is visible
      if (targetPage > visiblePages[visiblePages.length - 1]) {
        const newPages = Array.from({ length: targetPage }, (_, i) => i + 1);
        setVisiblePages(newPages);
      }

      // Scroll to page
      setTimeout(() => {
        const element = document.getElementById(`page-${targetPage}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          jumpToPage(null);
        }
      }, 100);
    }
  }, [targetPage, visiblePages, jumpToPage]);

  // Handle Block Splitting (Enter Key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const { selection, splitBlock } = useReaderStore.getState();
        
        if (selection.blockId && selection.startTokenId && selection.docId) {
          const parts = selection.startTokenId.split('-');
          const index = parseInt(parts[parts.length - 1]);
          
          if (!isNaN(index)) {
            // Split AFTER the selected word
            splitBlock(selection.blockId, index + 1, selection.docId);
            // Clear selection after split to avoid repeated splits? 
            // Or keep it? keeping it might be confusing if the token moves.
            // Let's clear it for safety.
            useReaderStore.getState().clearSelection();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!currentDocument) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <ReaderToolbar
        docId={docId}
        totalPages={currentDocument.total_pages}
        currentPage={currentPage}
        currentTheme={currentDocument.theme || 'plain'}
        onPageChange={setCurrentPage}
      />

      <div className={`flex-1 w-full h-full overflow-y-auto overflow-x-hidden transition-colors duration-300 ${themeClass}`}>
        <div className="mx-auto max-w-3xl w-full px-3 sm:px-8 py-4 sm:py-12">
          {visiblePages.map((pageNum) => (
            <div key={pageNum} id={`page-${pageNum}`}>
              <PDFPage docId={docId} pageNumber={pageNum} currentTheme={currentDocument.theme || 'plain'} />
            </div>
          ))}
          <div ref={observerTarget} className="h-10" />
        </div>
      </div>
    </div>
  );
}
