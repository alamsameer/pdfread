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
  const { selection, handleTokenClick } = useReaderStore();
  const allAnnotations = useAnnotationStore((state) => state.annotations);
  const { font_size, font_family, line_height } = usePreferencesStore((state) => state.preferences);

  const words = useMemo(() => parseWordsMeta(block.words_meta), [block.words_meta]);
  const annotations = useMemo(
    () => allAnnotations.filter(a => a.block_id === block.id),
    [block.id, allAnnotations]
  );

  if (block.block_type === 'image') {
    const imageUrl = block.image_path?.startsWith('http') 
        ? block.image_path 
        : `${API_BASE_URL}${block.image_path}`;

    return (
      <div className="my-4 flex justify-center">
        <img
          src={imageUrl}
          alt={`Block ${block.block_order}`}
          className="max-w-full h-auto"
        />
      </div>
    );
  }

  return (
    <div
      data-block-id={block.id}
      className="mb-4 leading-relaxed"
      style={{
        fontSize: `${font_size}px`,
        fontFamily: font_family,
        lineHeight: line_height,
      }}
    >
      {words.map((word, index) => {
        const tokenId = `${block.id}-${index}`;
        const isSelected = Boolean(
          selection.blockId === block.id &&
          selection.startTokenId &&
          (
            // Case 1: Only start token selected (in progress)
            (!selection.endTokenId && selection.startTokenId === tokenId) ||
            // Case 2: Range selected
            (selection.endTokenId &&
              ((index >= parseInt(selection.startTokenId.split('-')[2]) &&
                index <= parseInt(selection.endTokenId.split('-')[2])) ||
                (index >= parseInt(selection.endTokenId.split('-')[2]) &&
                  index <= parseInt(selection.startTokenId.split('-')[2]))))
          )
        );

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
