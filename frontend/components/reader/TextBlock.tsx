'use client';

import { useMemo } from 'react';
import { TextToken } from './TextToken';
import type { Block } from '@/lib/types/block';
import type { Annotation } from '@/lib/types/annotation';
import { parseWordsMeta } from '@/lib/utils/selection';
import { useReaderStore } from '@/lib/stores/useReaderStore';
import { useAnnotationStore } from '@/lib/stores/useAnnotationStore';
import { usePreferencesStore } from '@/lib/stores/usePreferencesStore';

import { API_BASE_URL } from '@/lib/api/client';

interface TextBlockProps {
  block: Block;
}

export function TextBlock({ block }: TextBlockProps) {
  const selection = useReaderStore((state) => state.selection);
  const handleTokenClick = useReaderStore((state) => state.handleTokenClick);
  const allAnnotations = useAnnotationStore((state) => state.annotations);
  const { font_size, font_family, line_height } = usePreferencesStore((state) => state.preferences);

  const words = useMemo(() => parseWordsMeta(block.words_meta), [block.words_meta]);
  const annotations = useMemo(
    () => allAnnotations.filter(a => a.block_id === block.id),
    [block.id, allAnnotations]
  );

  const { selectionStart, selectionEnd, isBlockSelected } = useMemo(() => {
    if (selection.blockId !== block.id || !selection.startTokenId) {
      return { selectionStart: -1, selectionEnd: -1, isBlockSelected: false };
    }
    
    try {
      const startParts = selection.startTokenId.split('-');
      const start = parseInt(startParts[startParts.length - 1]);
      
      let end = start;
      if (selection.endTokenId) {
        const endParts = selection.endTokenId.split('-');
        end = parseInt(endParts[endParts.length - 1]);
      }
      
      return {
        selectionStart: Math.min(start, end),
        selectionEnd: Math.max(start, end),
        isBlockSelected: true
      };
    } catch (e) {
      return { selectionStart: -1, selectionEnd: -1, isBlockSelected: false };
    }
  }, [selection.blockId, selection.startTokenId, selection.endTokenId, block.id]);

  if (block.block_type === 'image') {
    // Construct full URL if it's a relative path from our API
    let imageUrl = block.image_path;
    if (imageUrl && !imageUrl.startsWith('http')) {
        // If it starts with /, append to base url. 
        // Note: API_BASE_URL might or might not have trailing slash.
        // Assuming API_BASE_URL is like 'http://localhost:8000'
        imageUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${imageUrl}`;
    }

    return (
      <div className="my-4 flex justify-center">
        {imageUrl ? (
            <img
            src={imageUrl}
            alt={`Block ${block.block_order}`}
            className="max-w-full h-auto"
            />
        ) : (
            <div className="text-gray-400">Image not found</div>
        )}
      </div>
    );
  }

  return (
    <div
      data-block-id={block.id}
      className="mb-4 leading-relaxed break-word-common w-full max-w-full"
      style={{
        fontSize: `${font_size}px`,
        fontFamily: font_family,
        lineHeight: line_height,
      }}
    >
      {words.map((word, index) => {
        const tokenId = `${block.id}-${index}`;
        const isSelected = isBlockSelected && index >= selectionStart && index <= selectionEnd;

        return (
          <TextToken
            key={tokenId}
            tokenId={tokenId}
            blockId={block.id}
            index={index}
            word={word}
            annotations={annotations}
            isSelected={isSelected}
            onClick={(tid, bid, aid, e) => handleTokenClick(tid, bid, block.doc_id, aid, e)}
          />
        );
      })}
    </div>
  );
}
