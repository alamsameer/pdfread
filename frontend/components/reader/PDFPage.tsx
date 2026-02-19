'use client';

import { useDocumentStore } from '@/lib/stores/useDocumentStore';
import { TextBlock } from './TextBlock';
import { Loader2 } from 'lucide-react';
import type { Block } from '@/lib/types/block';

interface PDFPageProps {
  docId: string;
  pageNumber: number;
  currentTheme: string;
}

export function PDFPage({ docId, pageNumber, currentTheme }: PDFPageProps) {
  // Subscribe directly to the store map for this page
  // Note: pageNumber is 1-based, but store keys/DB are 0-based
  const blocks = useDocumentStore((state) => state.pages.get(pageNumber - 1));

  if (!blocks) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="relative w-full font-serif text-base sm:text-lg leading-relaxed">
      {/* Page Content */}
      <div className="min-h-[400px] sm:min-h-[800px]">
        {blocks.map((block) => (
          <TextBlock key={block.id} block={block} />
        ))}
      </div>
      
      {/* Subtle Page Indicator on Hover or Side? For now, hidden for seamless feel */}
    </div>
  );
}
