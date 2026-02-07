'use client';

import { useState, useEffect } from 'react';
import { useReaderStore } from '@/lib/stores/useReaderStore';
import { usePreferencesStore } from '@/lib/stores/usePreferencesStore';
import { useDocumentStore } from '@/lib/stores/useDocumentStore';
import { documentsAPI } from '@/lib/api/documents';
import { THEMES } from '@/lib/constants/themes';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils/cn';
import { 
  Bold, 
  Underline, 
  Italic,
  MessageSquare, 
  Trash2, 
  Palette,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

const COLORS = [
  { name: 'Yellow', value: '#ffeb3b', class: 'bg-[#ffeb3b]' },
  { name: 'Pink', value: '#ffcdd2', class: 'bg-[#ffcdd2]' },
  { name: 'Green', value: '#c8e6c9', class: 'bg-[#c8e6c9]' },
  { name: 'Blue', value: '#bbdefb', class: 'bg-[#bbdefb]' },
  { name: 'Purple', value: '#e1bee7', class: 'bg-[#e1bee7]' },
];

const FONT_FAMILIES = [
  'Merriweather',
  'Inter',
  'Roboto',
  'Outfit',
  'Times New Roman'
];

export function HighlightMenu() {
  const { 
    menuPosition, 
    isMenuOpen, 
    editingAnnotationId, 
    createAnnotation,
    updateAnnotation,
    deleteAnnotation
  } = useReaderStore();

  const { preferences, setFontFamily, setFontSize } = usePreferencesStore();
  const { currentDocument, setDocument } = useDocumentStore();
  
  const [note, setNote] = useState('');
  const [mode, setMode] = useState<'default' | 'note'>('default');
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value);
  const [activeStyles, setActiveStyles] = useState<string[]>([]);

  useEffect(() => {
    if (!isMenuOpen) {
      setNote('');
      setMode('default');
      setActiveStyles([]);
    }
  }, [isMenuOpen]);

  if (!isMenuOpen || !menuPosition) return null;

  const handleAction = async (params: { color?: string; font_style?: string; note?: string; annotation_type?: string }) => {
    // If it's a style toggle, manage local state for visual feedback
    if (params.font_style) {
        let newStyles = [...activeStyles];
        if (newStyles.includes(params.font_style)) {
            newStyles = newStyles.filter(s => s !== params.font_style);
        } else {
            newStyles.push(params.font_style);
        }
        setActiveStyles(newStyles);
    }

    if (editingAnnotationId) {
      await updateAnnotation(editingAnnotationId, params);
    } else {
      await createAnnotation({
        color: params.color || selectedColor,
        font_style: params.font_style, // In a real app this might need to be a combination string
        note: params.note,
        annotation_type: 'highlight' 
      });
    }
  };

  const handleCreateHighlight = async (color: string) => {
      setSelectedColor(color);
      await handleAction({ color });
  };

  const handleDelete = async () => {
    if (editingAnnotationId) {
      await deleteAnnotation(editingAnnotationId);
    }
  };

  const handleThemeChange = async (themeId: string) => {
    if (!currentDocument) return;
    try {
      setDocument({ ...currentDocument, theme: themeId });
      await documentsAPI.updateDocument(currentDocument.id, { theme: themeId });
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  };

  if (mode === 'note') {
      return (
        <div
            className="fixed z-50 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-xl font-sans animate-in fade-in zoom-in-95 duration-200"
            style={{ top: `${menuPosition.y}px`, left: `${menuPosition.x}px` }}
            onClick={(e) => e.stopPropagation()}
        >
             <div className="space-y-3">
                 <label className="text-xs font-semibold uppercase text-gray-500">Note</label>
                 <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a note..."
                    autoFocus
                    className="min-h-[80px]"
                 />
                 <div className="flex gap-2">
                     <Button size="sm" onClick={() => setMode('default')} variant="ghost">Back</Button>
                     <Button size="sm" onClick={() => handleAction({ note: note })} className="flex-1">Save</Button>
                 </div>
            </div>
        </div>
      );
  }

  return (
    <div
      className={cn(
        'fixed z-50 flex items-center gap-1 rounded-full border border-gray-200 bg-white p-1.5 shadow-xl font-sans text-gray-700',
        'animate-in fade-in zoom-in-95 duration-200'
      )}
      style={{
        top: `${menuPosition.y}px`,
        left: `${menuPosition.x}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Font Family Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1 rounded-full px-3 text-sm font-medium hover:bg-gray-100">
            {preferences.font_family}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
            {FONT_FAMILIES.map(font => (
                <DropdownMenuItem key={font} onClick={() => setFontFamily(font)}>
                    <span style={{ fontFamily: font }}>{font}</span>
                </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Font Size Selector */}
      <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1 rounded-full px-2 text-sm font-medium hover:bg-gray-100">
                {preferences.font_size}px
                <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[4rem]">
                {[12, 14, 16, 18, 20, 24, 30].map(size => (
                    <DropdownMenuItem key={size} onClick={() => setFontSize(size)}>
                        {size}px
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mx-1 h-4 w-px bg-gray-200" />

      {/* Formatting Tools */}
      <div className="flex items-center gap-0.5">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full hover:bg-gray-100"
            onClick={() => handleAction({ font_style: 'bold' })}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full hover:bg-gray-100"
            onClick={() => handleAction({ font_style: 'italic' })}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full hover:bg-gray-100"
            onClick={() => handleAction({ font_style: 'underline' })}
          >
            <Underline className="h-4 w-4" />
          </Button>
      </div>

      <div className="mx-1 h-4 w-px bg-gray-200" />

      {/* Theme Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-100" title="Change Theme">
                <Palette className="h-4 w-4" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            {THEMES.map(theme => (
                <DropdownMenuItem key={theme.id} onClick={() => handleThemeChange(theme.id)} className="gap-2">
                     <div className={cn("h-4 w-4 rounded border border-gray-200", theme.className)} />
                     {theme.name}
                </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="mx-1 h-4 w-px bg-gray-200" />

      {/* Highlight Color */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 gap-1 rounded-full hover:bg-gray-100" title="Highlight Color">
                 <div className="h-4 w-4 rounded-full border border-gray-300" style={{ backgroundColor: selectedColor }} />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="p-2">
            <div className="flex gap-2">
                {COLORS.map(color => (
                    <button
                        key={color.value}
                        className={cn(
                            "h-6 w-6 rounded-full border border-gray-200 transition-transform hover:scale-110",
                            selectedColor === color.value && "ring-2 ring-blue-500 ring-offset-2"
                        )}
                        style={{ backgroundColor: color.value }}
                        onClick={() => handleCreateHighlight(color.value)}
                    />
                ))}
            </div>
        </DropdownMenuContent>
      </DropdownMenu>


      {/* Note Action */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 rounded-full hover:bg-gray-100"
        onClick={() => setMode('note')}
        title="Add Note"
      >
        <MessageSquare className="h-4 w-4" />
      </Button>

      {/* Delete (if editing) */}
      {editingAnnotationId && (
        <>
            <div className="mx-1 h-4 w-px bg-gray-200" />
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full hover:bg-red-50 text-red-500 hover:text-red-600"
                onClick={handleDelete}
                title="Delete Highlight"
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </>
      )}

    </div>
  );
}


