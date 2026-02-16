'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Home, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/lib/stores/useUIStore';
import { useReaderStore } from '@/lib/stores/useReaderStore';
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
  const { jumpToPage } = useReaderStore();
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isExpanded = isHovered || isMenuOpen; // Expand if hovered OR menu is open

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    onPageChange(validPage);
    jumpToPage(validPage);
  };

  return (
    <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
      <div 
        className={cn(
          "flex items-center gap-1 rounded-full border p-1.5 shadow-xl backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
          isExpanded ? "glass-blue px-4" : "bg-white/95 border-gray-200 px-2"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setIsHovered(!isHovered)} // Toggle on click/tap
      >
        {/* Core Controls (Always Visible) */}
        <div className="flex items-center gap-1">
          <Button 
            onClick={() => router.push('/')} 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 rounded-full hover:bg-gray-100 text-gray-700" 
            title="Home"
          >
            <Home className="h-5 w-5" />
          </Button>
          
          <Button 
            onClick={toggleSidebar} 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 rounded-full hover:bg-gray-100 text-gray-700" 
            title="Toggle Sidebar"
          >
            <PanelLeft className="h-5 w-5" />
          </Button>

          <ThemeSelector 
            currentTheme={currentTheme} 
            docId={docId} 
            onOpenChange={setIsMenuOpen} 
          />
        </div>

        {/* Expandable Navigation Controls */}
        <div 
          className={cn(
            "flex items-center gap-2 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
            isExpanded ? "w-auto opacity-100 ml-1" : "w-0 opacity-0"
          )}
        >
          {/* Vertical Divider */}
          <div className="h-6 w-px bg-gray-200 mx-1" />

          <Button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-gray-100 text-gray-500"
            title="Previous Page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="whitespace-nowrap text-xs font-medium text-gray-400 min-w-[80px] text-center select-none">
            Page {currentPage} / {totalPages}
          </span>
          
          <Button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-gray-100 text-gray-500"
            title="Next Page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

