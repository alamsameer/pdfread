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
import { usePreferencesStore } from '@/lib/stores/usePreferencesStore';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ThemeSelectorProps {
  currentTheme: string;
  docId: string;
}

export function ThemeSelector({ currentTheme, docId }: ThemeSelectorProps) {
  const setDocument = useDocumentStore((state) => state.setDocument);
  const currentDocument = useDocumentStore((state) => state.currentDocument);
  const { 
    preferences, 
    setFontSize, 
    setFontFamily, 
    setLineHeight 
  } = usePreferencesStore();

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
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 rounded-full hover:bg-gray-100" 
          title="Change Theme"
        >
          <Palette className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuSeparator />
        
        {/* Font Size */}
        <div className="px-2 py-2">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-gray-500">
                <span>Font Size</span>
                <span>{preferences.font_size}px</span>
            </div>
            <Slider
                value={[preferences.font_size]}
                min={12}
                max={32}
                step={1}
                onValueChange={(vals: number[]) => setFontSize(vals[0])}
                className="w-full"
            />
        </div>

        {/* Font Family */}
        <div className="px-2 py-2">
            <div className="mb-1 text-xs font-medium text-gray-500">Font Family</div>
            <Select value={preferences.font_family} onValueChange={setFontFamily}>
                <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue placeholder="Font" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Merriweather">Merriweather</SelectItem>
                    <SelectItem value="Inter">Inter</SelectItem>
                    <SelectItem value="Roboto">Roboto</SelectItem>
                    <SelectItem value="Outfit">Outfit</SelectItem>
                    <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                </SelectContent>
            </Select>
        </div>

        {/* Line Height */}
        <div className="px-2 py-2 mb-2">
            <div className="mb-1 text-xs font-medium text-gray-500">Line Height</div>
            <Select value={preferences.line_height} onValueChange={setLineHeight}>
                <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue placeholder="Line Height" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="1.2">Compact (1.2)</SelectItem>
                    <SelectItem value="1.4">Normal (1.4)</SelectItem>
                    <SelectItem value="1.6">Relaxed (1.6)</SelectItem>
                    <SelectItem value="1.8">Loose (1.8)</SelectItem>
                    <SelectItem value="2.0">Double (2.0)</SelectItem>
                </SelectContent>
            </Select>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>Reading Theme</DropdownMenuLabel>
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
