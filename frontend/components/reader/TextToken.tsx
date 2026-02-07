'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils/cn';
import type { WordMeta, Block } from '@/lib/types/block';
import type { Annotation } from '@/lib/types/annotation';
import { isTokenInAnnotation } from '@/lib/utils/selection';

interface TextTokenProps {
  tokenId: string;
  blockId: string;
  index: number;
  word: WordMeta;
  annotations: Annotation[];
  isSelected: boolean;
  onClick: (tokenId: string, blockId: string, annotationId: string | null, event: React.MouseEvent) => void;
}

export const TextToken = memo(function TextToken({
  tokenId,
  blockId,
  index,
  word,
  annotations,
  isSelected,
  onClick,
}: TextTokenProps) {
  // Find annotations that apply to this token
  const applicableAnnotations = annotations.filter((ann) =>
    isTokenInAnnotation(index, ann.start_word_index, ann.end_word_index)
  );

  // Get the first annotation's styles (you can enhance this to handle overlapping annotations)
  const annotation = applicableAnnotations[0];

  const hasNote = annotation?.note;

  return (
    <span
      id={`t-${tokenId}`}
      data-token-id={tokenId}
      data-block-id={blockId}
      data-index={index}
      data-ann-id={annotation?.id}
      className={cn(
        'token inline-block cursor-pointer px-[1px] transition-all duration-200',
        'hover:bg-yellow-100',
        isSelected && 'bg-blue-300',
        hasNote && 'border-b-2 border-dotted border-gray-600'
      )}
      style={{
        fontSize: annotation?.font_size || (word.fontSize && word.fontSize > 14 ? `${word.fontSize * 1.2}pt` : undefined),
        // fontFamily: word.fontFamily, // override with global serif for modern feel
        fontWeight: word.isBold || annotation?.font_style === 'bold' ? 'bold' : undefined,
        fontStyle: word.isItalic || annotation?.font_style === 'italic' ? 'italic' : undefined,
        color: word.color === '#000000' ? undefined : word.color,
        backgroundColor: isSelected ? '#93c5fd' : annotation?.color, // Priority to selection
        textDecoration: annotation?.font_style === 'underline' ? `underline ${annotation.color}` : undefined,
      }}
      title={annotation?.note}
      onClick={(e) => onClick(tokenId, blockId, annotation?.id || null, e)}
    >
      {word.text}
      {word.isNewline && <br />}
    </span>
  );
});
