'use client';

import { useCallback } from 'react';
import { useReaderStore } from '@/lib/stores/useReaderStore';

export function useSelection() {
  const { selection, setSelection, clearSelection, setSelecting } = useReaderStore();

  const handleTokenClick = useCallback(
    (tokenId: string, blockId: string, event: React.MouseEvent) => {
      event.stopPropagation();

      // Extract the index from tokenId (format: "blockId-index")
      const index = parseInt(tokenId.split('-').pop() || '0', 10);

      // First click or different block
      if (!selection.startTokenId || selection.blockId !== blockId) {
        clearSelection();
        setSelection({
          startTokenId: tokenId,
          blockId,
        });
        setSelecting(true);
        return;
      }

      // Second click - complete selection
      if (selection.startTokenId && !selection.endTokenId) {
        setSelection({
          endTokenId: tokenId,
        });
        setSelecting(false);
      } else {
        // Reset selection
        clearSelection();
        setSelection({
          startTokenId: tokenId,
          blockId,
        });
        setSelecting(true);
      }
    },
    [selection, setSelection, clearSelection, setSelecting]
  );

  return {
    selection,
    handleTokenClick,
    clearSelection,
  };
}
