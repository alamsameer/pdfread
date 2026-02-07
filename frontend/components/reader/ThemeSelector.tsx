'use client';

import { 
  Palette, 
  Check 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { THEMES } from '@/lib/constants/themes';
import { documentsAPI } from '@/lib/api/documents';
import { useDocumentStore } from '@/lib/stores/useDocumentStore';

interface ThemeSelectorProps {
  currentTheme: string;
  docId: string;
}

export function ThemeSelector({ currentTheme, docId }: ThemeSelectorProps) {
  const setDocument = useDocumentStore((state) => state.setDocument);
  const currentDocument = useDocumentStore((state) => state.currentDocument);

  const handleThemeChange = async (themeId: string) => {
    try {
      // Optimistic update
      if (currentDocument) {
        setDocument({ ...currentDocument, theme: themeId });
      }

      // Backend update
      await documentsAPI.updateDocument(docId, { theme: themeId });
    } catch (error) {
      console.error('Failed to update theme:', error);
      // Revert if failed (optional, but good practice)
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" title="Change Theme">
          <Palette className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Reading Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEMES.map((theme) => (
          <DropdownMenuItem
            key={theme.id}
            onClick={() => handleThemeChange(theme.id)}
            className="flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <div 
                className={`h-4 w-4 rounded border border-gray-200 ${theme.className}`} 
                style={theme.id === 'ruled' || theme.id === 'grid' ? { height: '16px' } : undefined} // Fix for preview
              />
              {theme.name}
            </span>
            {currentTheme === theme.id && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
