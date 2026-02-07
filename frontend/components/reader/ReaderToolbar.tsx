'use client';

import { ChevronLeft, ChevronRight, Home, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/lib/stores/useUIStore';
import { ThemeSelector } from './ThemeSelector';

interface ReaderToolbarProps {
  docId: string;
  totalPages: number;
  currentPage: number;
  currentTheme: string;
  onPageChange: (page: number) => void;
}

export function ReaderToolbar({
  docId,
  totalPages,
  currentPage,
  currentTheme,
  onPageChange,
}: ReaderToolbarProps) {
  const router = useRouter();
  const { toggleSidebar } = useUIStore();

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    onPageChange(validPage);
    document.getElementById(`page-${validPage}`)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <Button onClick={() => router.push('/')} variant="ghost" title="Home">
          <Home className="h-5 w-5" />
        </Button>
        <Button onClick={toggleSidebar} variant="ghost" title="Toggle Sidebar">
          <PanelLeft className="h-5 w-5" />
        </Button>
        <ThemeSelector currentTheme={currentTheme} docId={docId} />
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          variant="ghost"
          title="Previous Page"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <span className="mx-4 text-sm font-medium text-gray-700">
          Page {currentPage} of {totalPages}
        </span>
        
        <Button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          variant="ghost"
          title="Next Page"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="w-24">{/* Spacer for balance */}</div>
    </div>
  );
}
