'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Home, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/lib/stores/useUIStore';
import { ThemeSelector } from './ThemeSelector';
import { cn } from '@/lib/utils/cn';

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
  const [isHovered, setIsHovered] = useState(false);

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    onPageChange(validPage);
    document.getElementById(`page-${validPage}`)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
      <div 
        className={cn(
          "flex items-center gap-1 rounded-full border border-gray-200 bg-white/90 p-1.5 shadow-xl backdrop-blur-sm transition-all duration-300 ease-in-out",
          isHovered ? "px-3" : "px-1.5"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Core Controls (Always Visible) */}
        <div className="flex items-center gap-1">
          <Button 
            onClick={() => router.push('/')} 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 rounded-full hover:bg-gray-100" 
            title="Home"
          >
            <Home className="h-4 w-4" />
          </Button>
          
          <Button 
            onClick={toggleSidebar} 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 rounded-full hover:bg-gray-100" 
            title="Toggle Sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>

          <ThemeSelector currentTheme={currentTheme} docId={docId} />
        </div>

        {/* Expandable Navigation Controls */}
        <div 
          className={cn(
            "flex items-center gap-2 overflow-hidden transition-all duration-300",
            isHovered ? "w-auto opacity-100 ml-2 border-l border-gray-200 pl-2" : "w-0 opacity-0"
          )}
        >
          <Button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-gray-100"
            title="Previous Page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="whitespace-nowrap text-xs font-medium text-gray-600 min-w-[80px] text-center">
            Page {currentPage} / {totalPages}
          </span>
          
          <Button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-gray-100"
            title="Next Page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

