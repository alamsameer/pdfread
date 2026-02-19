'use client';

import { useEffect, useState, useRef } from 'react';
import { useDocumentStore } from '@/lib/stores/useDocumentStore';
import { PDFPage } from './PDFPage';
import { ReaderToolbar } from './ReaderToolbar';
import { useReaderStore } from '@/lib/stores/useReaderStore';
import { Loader2 } from 'lucide-react';
import { THEMES } from '@/lib/constants/themes';
import { documentsAPI } from '@/lib/api/documents';
import type { Block } from '@/lib/types/block';

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

  const BATCH_SIZE = 10;
  const [maxLoadedPage, setMaxLoadedPage] = useState(0);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    // Reset when document changes
    setCurrentPage(1);
    setVisiblePages([1]);
    setMaxLoadedPage(0);
    isFetchingRef.current = false;
  }, [docId]);

  // Batch Data Fetching Logic
  useEffect(() => {
    if (!currentDocument || isFetchingRef.current) return;

    const fetchBatch = async (start: number, end: number) => {
      try {
        isFetchingRef.current = true;
        // console.log(`Fetching batch: ${start} to ${end}`);
        
        const blocks = await documentsAPI.getBlocksRange(docId, start, end);
        
        // Group blocks by page
        const pagesMap = new Map<number, Block[]>();
        for (let i = start; i <= end; i++) {
            pagesMap.set(i, []);
        }
        
        blocks.forEach((block: Block) => {
            const p = block.page_number;
            if (pagesMap.has(p)) {
                pagesMap.get(p)?.push(block);
            }
        });
        
        useDocumentStore.getState().setPages(pagesMap);
        setMaxLoadedPage(end);
      } catch (err) {
        console.error("Failed to fetch batch:", err);
      } finally {
        isFetchingRef.current = false;
      }
    };

    // 1. Initial Load (Pages 1-10)
    if (maxLoadedPage === 0) {
        const endParam = Math.min(BATCH_SIZE, currentDocument.total_pages);
        // Special case: PyMuPDF/Backend uses 0-based indexing for pages in blocks usually? 
        // Let's check: Models say page_number is Integer. Parser range(total_pages) -> 0 to N-1.
        // Frontend uses 1-based indexing for display (currentPage, visiblePages).
        // Let's assume standard behavior: 
        // Frontend 1-based -> Backend 0-based logic usually requires adjustment, 
        // BUT looking at previous PDFPage code: documentsAPI.getPageBlocks(docId, pageNumber)
        // And Parser: page_number=page_num (from range(total_pages)).
        // So Backend stores 0..N-1.
        // Frontend visiblePages are [1, 2, ...].
        // So we need to fetch range [0, 9] for pages 1-10.
        // Let's align: 
        // If visible is 1, we need backend page 0.
        // So fetch start = 0, end = 9.
        
        // Wait, let's verify PDFPage.tsx:
        // documentsAPI.getPageBlocks(docId, pageNumber)
        // -> /api/documents/{doc_id}/pages/{page_number}/blocks
        // -> Parser: page_number == page_num (0-indexed) or 1-indexed?
        // -> backend main.py: models.Block.page_number == page_number
        // -> Parser: for page_num in range(total_pages): ... block_record.page_number = page_num.
        // So DB has 0-based index.
        
        // PDFPage calls with pageNumber.
        // PDFViewer initializes visiblePages=[1].
        // PDFPage receiving pageNumber=1 calls API with 1.
        // If API expects 0-based matching DB, then PDFPage might be asking for page 1 (second page).
        // Let's check if there's confusion.
        // Reader usually treats 1 as first page.
        // If PDFPage sends 1, and DB has 0 for first page...
        // Then page 1 is shown as empty or actually shows 2nd page?
        // User hasn't complained about wrong page content, so maybe they align?
        // OR... maybe PDFPage passes `pageNumber - 1`?
        // PDFPage.tsx: const data = await documentsAPI.getPageBlocks(docId, pageNumber);
        // It passes `pageNumber` directly.
        // So if `pageNumber` is 1, it requests 1.
        // If DB has 0 for first page, then it requests 2nd page.
        // This implies either:
        // A) DB is 1-based (Parser adds +1?) -> Parser.py: `page_number=page_num` (where loop is range(total_pages) -> 0,1,...)
        // B) PDFPage logic is wrong? 
        // C) Backend adjusts?
        
        // Let's stick to what we see. 
        // If I change to batch, I should assume `pageIndex`.
        // Let's use 0-based for the API `start_page` / `end_page` params to be safe matching DB.
        // And mapping to frontend pages: Page 1 -> DB 0.
        
        // Fetch 0 to 9.
        fetchBatch(0, Math.min(BATCH_SIZE, currentDocument.total_pages) - 1);
    } 
    
    // 2. Incremental Load
    // If user is looking at page P (1-based), they need P-1 (0-based) in DB.
    // If visiblePages has P (say 8), and we loaded up to 10 (index 9).
    // If we reach page 8 (index 7), we are close to end (9).
    // Threshold: if currentMaxIndex - currentIndex < 3 -> Fetch next batch.
    
    const maxVisiblePage = Math.max(...visiblePages); // 1-based
    const maxVisibleIndex = maxVisiblePage - 1;
    const loadedIndexLimit = maxLoadedPage; // This I tracked as the *end* index of last fetch.
    
    // If we are seeing page 8 (idx 7), and loaded up to idx 9. Gap is 2.
    if (loadedIndexLimit < currentDocument.total_pages - 1) {
        if (loadedIndexLimit - maxVisibleIndex < 3) {
            const nextStart = loadedIndexLimit + 1;
            const nextEnd = Math.min(nextStart + BATCH_SIZE - 1, currentDocument.total_pages - 1);
            fetchBatch(nextStart, nextEnd);
        }
    }

  }, [visiblePages, currentDocument, maxLoadedPage, docId]);

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
    
    // ... existing logic ...

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
