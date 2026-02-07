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
  onOpenChange?: (open: boolean) => void;
}

export function ThemeSelector({ currentTheme, docId, onOpenChange }: ThemeSelectorProps) {
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
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 rounded-full hover:bg-gray-100 text-gray-700" 
          title="Change Theme"
        >
          <Palette className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="center" 
        className="w-80 rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl animate-in fade-in zoom-in-95"
        sideOffset={15}
      >
        <div className="mb-5 flex items-center justify-between px-1">
            <span className="text-sm font-bold text-gray-900 tracking-tight">Appearance</span>
        </div>
        
        {/* Font Settings */}
        <div className="space-y-5">
            {/* Font Size */}
            <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <span>Text Size</span>
                    <span className="text-gray-900">{preferences.font_size}px</span>
                </div>
                <Slider
                    value={[preferences.font_size]}
                    min={12}
                    max={32}
                    step={1}
                    onValueChange={(vals: number[]) => setFontSize(vals[0])}
                    className="w-full cursor-pointer"
                />
            </div>

            {/* Font Family & Line Height Row */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Font</span>
                    <Select value={preferences.font_family} onValueChange={setFontFamily}>
                        <SelectTrigger className="h-10 w-full rounded-xl border-gray-300 bg-white text-sm font-medium text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                            <SelectValue placeholder="Font" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px] z-[100] bg-white border border-gray-200 shadow-xl rounded-xl">
                            <SelectItem value="Merriweather" className="font-serif">Merriweather</SelectItem>
                            <SelectItem value="Inter" className="font-sans">Inter</SelectItem>
                            <SelectItem value="Roboto" className="font-sans">Roboto</SelectItem>
                            <SelectItem value="Outfit" className="font-sans">Outfit</SelectItem>
                            <SelectItem value="Times New Roman" className="font-serif">Times</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Height</span>
                    <Select value={preferences.line_height} onValueChange={setLineHeight}>
                        <SelectTrigger className="h-10 w-full rounded-xl border-gray-300 bg-white text-sm font-medium text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                            <SelectValue placeholder="Height" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px] z-[100] bg-white border border-gray-200 shadow-xl rounded-xl">
                            <SelectItem value="1.2">Compact</SelectItem>
                            <SelectItem value="1.4">Normal</SelectItem>
                            <SelectItem value="1.6">Relaxed</SelectItem>
                            <SelectItem value="1.8">Loose</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>

        <DropdownMenuSeparator className="my-5 bg-gray-100" />

        {/* Themes Grid */}
        <div className="space-y-3">
            <span className="px-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Theme</span>
            <div className="grid grid-cols-3 gap-3">
                {THEMES.map((theme) => (
                <button
                    key={theme.id}
                    onClick={() => handleThemeChange(theme.id)}
                    className={`group relative flex flex-col items-center gap-2 rounded-xl border p-2 transition-all duration-200 hover:shadow-md ${
                        currentTheme === theme.id 
                            ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600' 
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                    {/* Color Preview Swatch */}
                    <div 
                        className={`h-8 w-full rounded-lg shadow-inner border border-black/5 ${theme.className}`} 
                    />
                    
                    {/* Label */}
                    <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-medium ${currentTheme === theme.id ? 'text-blue-700' : 'text-gray-700'}`}>
                            {theme.name}
                        </span>
                        {currentTheme === theme.id && (
                             <Check className="h-3 w-3 text-blue-600" />
                        )}
                    </div>
                </button>
                ))}
            </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
