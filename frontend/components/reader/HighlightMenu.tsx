'use client';

import { useState, useEffect } from 'react';
import { useReaderStore } from '@/lib/stores/useReaderStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils/cn';
import { Bold, Underline, MessageSquare } from 'lucide-react';

const COLORS = [
  { name: 'Yellow', value: '#ffeb3b' },
  { name: 'Pink', value: '#ffcdd2' },
  { name: 'Green', value: '#c8e6c9' },
  { name: 'Blue', value: '#bbdefb' },
  { name: 'Purple', value: '#e1bee7' },
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
  
  const [note, setNote] = useState('');
  const [mode, setMode] = useState<'default' | 'note'>('default');

  useEffect(() => {
    if (!isMenuOpen) {
      setNote('');
      setMode('default');
    }
  }, [isMenuOpen]);

  if (!isMenuOpen || !menuPosition) return null;

  const handleAction = async (params: { color?: string; font_style?: string; note?: string }) => {
    if (editingAnnotationId) {
      await updateAnnotation(editingAnnotationId, params);
    } else {
      await createAnnotation({
        color: params.color || '#ffeb3b',
        font_style: params.font_style,
        note: params.note,
        annotation_type: 'highlight' 
      });
    }
  };

  const handleDelete = async () => {
    if (editingAnnotationId) {
      await deleteAnnotation(editingAnnotationId);
    }
  };

  return (
    <div
      className={cn(
        'fixed z-50 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-xl font-sans',
        'animate-in fade-in zoom-in-95 duration-200'
      )}
      style={{
        top: `${menuPosition.y}px`,
        left: `${menuPosition.x}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {mode === 'default' ? (
        <div className="space-y-4">
          {/* Colors */}
          <div className="flex justify-between items-center gap-2 border-b pb-3 border-gray-100">
            {COLORS.map((color) => (
              <button
                key={color.value}
                className="h-6 w-6 rounded-full border border-gray-300 shadow-sm transition-transform hover:scale-125 hover:rotate-12"
                style={{ backgroundColor: color.value }}
                onClick={() => handleAction({ color: color.value })}
                title={color.name}
              />
            ))}
          </div>

          {/* Styles & Tools */}
          <div className="flex gap-2 justify-between">
            <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={() => handleAction({ color: 'transparent', font_style: 'bold' })}
            >
                <Bold className="h-4 w-4" /> Bold
            </Button>
            <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={() => handleAction({ color: 'transparent', font_style: 'underline' })}
            >
                <Underline className="h-4 w-4" /> Underline
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setMode('note')}
                title="Add Note"
            >
                <MessageSquare className="h-4 w-4" />
            </Button>
          </div>

          {editingAnnotationId && (
             <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleDelete}
            >
                Delete Highlight
             </Button>
          )}
        </div>
      ) : (
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
      )}
    </div>
  );
}

