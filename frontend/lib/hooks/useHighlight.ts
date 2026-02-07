'use client';

import { useCallback } from 'react';
import { annotationsAPI } from '@/lib/api/annotations';
import { useAnnotationStore } from '@/lib/stores/useAnnotationStore';
import { useReaderStore } from '@/lib/stores/useReaderStore';
import toast from 'react-hot-toast';

export function useHighlight(docId: string) {
  const addAnnotation = useAnnotationStore((state) => state.addAnnotation);
  const updateAnnotation = useAnnotationStore((state) => state.updateAnnotation);
  const deleteAnnotation = useAnnotationStore((state) => state.deleteAnnotation);
  const clearSelection = useReaderStore((state) => state.clearSelection);
  const closeMenu = useReaderStore((state) => state.closeMenu);
  const selection = useReaderStore((state) => state.selection);

  const createHighlight = useCallback(
    async (params: { color?: string; note?: string }) => {
      if (!selection.blockId || !selection.startTokenId) {
        return;
      }

      const startWordIndex = parseInt(selection.startTokenId.split('-').pop() || '0', 10);
      const endWordIndex = selection.endTokenId
        ? parseInt(selection.endTokenId.split('-').pop() || '0', 10)
        : startWordIndex;

      try {
        const annotation = await annotationsAPI.createAnnotation({
          doc_id: docId,
          block_id: selection.blockId,
          start_word_index: startWordIndex,
          end_word_index: endWordIndex,
          color: params.color || '#ffeb3b',
          note: params.note,
          user_id: 'anonymous',
        });
        addAnnotation(annotation);
        clearSelection();
        closeMenu();
        toast.success('Highlight created');
      } catch (error) {
        console.error('Create highlight error:', error);
        toast.error('Failed to create highlight');
      }
    },
    [docId, selection, addAnnotation, clearSelection, closeMenu]
  );

  const updateCurrentAnnotation = useCallback(
    async (annotationId: string, params: { color?: string; note?: string }) => {
      try {
        const updated = await annotationsAPI.updateAnnotation(annotationId, params);
        updateAnnotation(annotationId, updated);
        toast.success('Annotation updated');
      } catch (error) {
        console.error('Update annotation error:', error);
        toast.error('Failed to update annotation');
      }
    },
    [updateAnnotation]
  );

  const deleteCurrentAnnotation = useCallback(
    async (annotationId: string) => {
      try {
        await annotationsAPI.deleteAnnotation(annotationId);
        deleteAnnotation(annotationId);
        clearSelection();
        closeMenu();
        toast.success('Annotation deleted');
      } catch (error) {
        console.error('Delete annotation error:', error);
        toast.error('Failed to delete annotation');
      }
    },
    [deleteAnnotation, clearSelection, closeMenu]
  );

  return {
    createHighlight,
    updateAnnotation: updateCurrentAnnotation,
    deleteAnnotation: deleteCurrentAnnotation,
  };
}
