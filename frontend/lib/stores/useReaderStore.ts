import { create } from 'zustand';
import { annotationsAPI } from '@/lib/api/annotations';
import { useAnnotationStore } from './useAnnotationStore';
import toast from 'react-hot-toast';

interface Selection {
  startTokenId: string | null;
  endTokenId: string | null;
  blockId: string | null;
  docId: string | null;
}

interface ReaderState {
  // Selection state
  selection: Selection;
  isSelecting: boolean;

  // Menu state
  menuPosition: { x: number; y: number } | null;
  isMenuOpen: boolean;

  // Current annotation being edited
  editingAnnotationId: string | null;

  // Navigation
  targetPage: number | null;

  // Actions
  setSelection: (selection: Partial<Selection>) => void;
  clearSelection: () => void;
  setSelecting: (isSelecting: boolean) => void;
  openMenu: (x: number, y: number) => void;
  closeMenu: () => void;
  setEditingAnnotation: (id: string | null) => void;
  createAnnotation: (params: { color: string; annotation_type?: string; note?: string; font_style?: string }) => Promise<void>;
  updateAnnotation: (id: string, params: { color?: string; annotation_type?: string; note?: string; font_style?: string }) => Promise<void>;
  deleteAnnotation: (id: string) => Promise<void>;
  handleTokenClick: (tokenId: string, blockId: string, docId: string, annotationId: string | null, event: React.MouseEvent) => void;
  jumpToPage: (page: number | null) => void;
}

export const useReaderStore = create<ReaderState>((set, get) => ({
  selection: {
    startTokenId: null,
    endTokenId: null,
    blockId: null,
    docId: null,
  },
  isSelecting: false,
  menuPosition: null,
  isMenuOpen: false,
  editingAnnotationId: null,
  targetPage: null,

  setSelection: (newSelection) =>
    set((state) => ({
      selection: { ...state.selection, ...newSelection },
    })),

  clearSelection: () =>
    set({
      selection: {
        startTokenId: null,
        endTokenId: null,
        blockId: null,
        docId: null,
      },
      isSelecting: false,
    }),

  setSelecting: (isSelecting) => set({ isSelecting }),

  openMenu: (x, y) =>
    set({
      menuPosition: { x, y },
      isMenuOpen: true,
    }),

  closeMenu: () =>
    set({
      menuPosition: null,
      isMenuOpen: false,
    }),

  setEditingAnnotation: (id) => set({ editingAnnotationId: id }),

  createAnnotation: async ({ color, annotation_type = 'highlight', note, font_style }) => {
    const state = get();
    const { selection } = state;
    
    if (!selection.startTokenId || !selection.endTokenId || !selection.blockId || !selection.docId) {
        console.error("Missing selection data", selection);
        return;
    }

    const startIdParts = selection.startTokenId.split('-');
    const endIdParts = selection.endTokenId.split('-');
    const startIdx = parseInt(startIdParts[startIdParts.length - 1]);
    const endIdx = parseInt(endIdParts[endIdParts.length - 1]);
    const finalStart = Math.min(startIdx, endIdx);
    const finalEnd = Math.max(startIdx, endIdx);

     // Create annotation in background
     const newAnnotationData = {
        doc_id: selection.docId,
        block_id: selection.blockId,
        start_word_index: finalStart,
        end_word_index: finalEnd,
        color: color,
        annotation_type: annotation_type,
        font_style: font_style,
        note: note,
        user_id: 'user',
      };

      // Optimistic UI
      const tempId = `temp-${Date.now()}`;
      const tempAnnotation = {
          id: tempId,
          ...newAnnotationData,
          is_shared: 0,
          created_at: new Date().toISOString()
      };

      // 1. Update Store Optimistically
      useAnnotationStore.getState().addAnnotation(tempAnnotation);

      // 2. Clear Selection & Close Menu
      set({
          selection: { startTokenId: null, endTokenId: null, blockId: null, docId: null },
          isSelecting: false,
          isMenuOpen: false,
          menuPosition: null
      });

      // 3. API Call in Background
      try {
        const newAnnotation = await annotationsAPI.createAnnotation(newAnnotationData);
        useAnnotationStore.getState().deleteAnnotation(tempId);
        useAnnotationStore.getState().addAnnotation(newAnnotation);
        toast.success('Highlight created');
      } catch (err) {
        console.error("Failed to save annotation:", err);
        useAnnotationStore.getState().deleteAnnotation(tempId);
        toast.error('Failed to create highlight');
      }
  },

  updateAnnotation: async (id, params) => {
    // Optimistic Update
    useAnnotationStore.getState().updateAnnotation(id, params);
    
    // Close menu
    set({ isMenuOpen: false, editingAnnotationId: null, menuPosition: null });

    // API Call
    try {
        await annotationsAPI.updateAnnotation(id, params);
        toast.success('Annotation updated');
    } catch (err) {
        console.error("Failed to update annotation:", err);
        // Revert (could be implemented by fetching or undoing)
        toast.error('Failed to update annotation');
    }
  },

  deleteAnnotation: async (id) => {
      // Optimistic Delete
      useAnnotationStore.getState().deleteAnnotation(id);

      // Close menu
      set({ isMenuOpen: false, editingAnnotationId: null, menuPosition: null });

      // API Call
      try {
          await annotationsAPI.deleteAnnotation(id);
          toast.success('Annotation deleted');
      } catch (err) {
          console.error("Failed to delete annotation:", err);
          toast.error('Failed to delete annotation');
      }
  },

  handleTokenClick: (tokenId, blockId, docId, annotationId, event) => {
    event.stopPropagation();

    // If clicking an existing annotation, open menu in edit mode
    if (annotationId) {
        set({
            selection: { startTokenId: null, endTokenId: null, blockId, docId }, // Clear text selection
            isSelecting: false,
            editingAnnotationId: annotationId,
            menuPosition: { x: event.clientX, y: event.clientY - 50 },
            isMenuOpen: true
        });
        return;
    }

    set((state) => {
      // First click or different block
      if (!state.selection.startTokenId || state.selection.blockId !== blockId) {
        return {
          selection: { startTokenId: tokenId, endTokenId: null, blockId, docId }, // Add docId here
          isSelecting: true,
          menuPosition: null, // Close menu on new selection
          isMenuOpen: false,
        };
      }

       // Second click - complete selection
       if (state.selection.startTokenId && !state.selection.endTokenId) {
        // Just set end token and open menu
        return {
          selection: { ...state.selection, endTokenId: tokenId },
          isSelecting: false,
          menuPosition: { x: event.clientX, y: event.clientY - 50 }, // Position above cursor
          isMenuOpen: true,
        };
      }

      // Reset
      return {
        selection: { startTokenId: tokenId, endTokenId: null, blockId, docId },
        isSelecting: true,
        menuPosition: null,
        isMenuOpen: false,
      };
    });
  },

  jumpToPage: (page) => set({ targetPage: page }),
}));

