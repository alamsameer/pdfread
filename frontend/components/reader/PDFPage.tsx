'use client';

import { useEffect, useState } from 'react';
import { useDocumentStore } from '@/lib/stores/useDocumentStore';
import { documentsAPI } from '@/lib/api/documents';
import { TextBlock } from './TextBlock';
import { Loader2 } from 'lucide-react';
import type { Block } from '@/lib/types/block';

interface PDFPageProps {
  docId: string;
  pageNumber: number;
  currentTheme: string;
}

export function PDFPage({ docId, pageNumber, currentTheme }: PDFPageProps) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const getPage = useDocumentStore((state) => state.getPage);
  const setPage = useDocumentStore((state) => state.setPage);

  useEffect(() => {
    // Check if page is already cached
    const cachedBlocks = getPage(pageNumber);
    if (cachedBlocks) {
      setBlocks(cachedBlocks);
      setIsLoading(false);
      return;
    }

    // Fetch page blocks
    const fetchBlocks = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await documentsAPI.getPageBlocks(docId, pageNumber);
        setBlocks(data);
        setPage(pageNumber, data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load page');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlocks();
  }, [docId, pageNumber, getPage, setPage]);

  if (isLoading) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="relative w-full font-serif text-lg leading-relaxed">
      {/* Page Content */}
      <div className="min-h-[800px]">
        {blocks.map((block) => (
          <TextBlock key={block.id} block={block} />
        ))}
      </div>
      
      {/* Subtle Page Indicator on Hover or Side? For now, hidden for seamless feel */}
    </div>
  );
}
