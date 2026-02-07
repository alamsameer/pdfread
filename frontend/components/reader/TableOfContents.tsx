'use client';

import { useDocumentStore } from '@/lib/stores/useDocumentStore';
import { useReaderStore } from '@/lib/stores/useReaderStore';
import { ScrollText, ChevronRight } from 'lucide-react';

interface TOCItem {
  level: number;
  title: string;
  page: number; // 1-indexed
}

export function TableOfContents() {
  const currentDocument = useDocumentStore((state) => state.currentDocument);
  const jumpToPage = useReaderStore((state) => state.jumpToPage);

  if (!currentDocument?.toc) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500">
        <ScrollText className="mb-2 h-8 w-8 opacity-50" />
        <p className="text-sm">No table of contents available.</p>
      </div>
    );
  }

  let tocItems: TOCItem[] = [];
  try {
    // PyMuPDF get_toc returns [[lvl, title, page, dest], ...]
    // We only care about level, title, page
    const parsedToc = JSON.parse(currentDocument.toc);
    tocItems = parsedToc.map((item: any) => ({
      level: item[0],
      title: item[1],
      page: item[2],
    }));
  } catch (e) {
    console.error('Failed to parse TOC', e);
    return <div className="p-4 text-red-500">Error loading Table of Contents</div>;
  }

  const handleTOCClick = (pageNumber: number) => {
    jumpToPage(pageNumber);
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      <h3 className="mb-4 text-lg font-semibold text-gray-800">Contents</h3>
      <div className="space-y-1">
        {tocItems.map((item, index) => (
          <button
            key={index}
            onClick={() => handleTOCClick(item.page)}
            className="group flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 hover:text-blue-600"
            style={{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }}
          >
            <ChevronRight className="mt-0.5 h-3 w-3 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
            <span className="line-clamp-2">{item.title}</span>
            <span className="ml-auto text-xs text-gray-400">{item.page}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
