import type { WordMeta, Block } from '@/lib/types/block';

// Parse words_meta JSON string
// Parse words_meta JSON string (or object)
export function parseWordsMeta(wordsMeta: WordMeta[] | string): WordMeta[] {
  if (typeof wordsMeta === 'string') {
    try {
      const parsed = JSON.parse(wordsMeta);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return wordsMeta || [];
}

// Parse style_runs JSON string (or object)
export function parseStyleRuns(styleRuns: any[] | string) {
  if (typeof styleRuns === 'string') {
    try {
      const parsed = JSON.parse(styleRuns);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return styleRuns || [];
}

// Parse position_meta JSON string (or object)
export function parsePositionMeta(positionMeta: [number, number, number, number] | string): [number, number, number, number] {
  if (typeof positionMeta === 'string') {
    try {
      const parsed = JSON.parse(positionMeta);
      return Array.isArray(parsed) && parsed.length === 4 ? parsed as [number, number, number, number] : [0, 0, 0, 0];
    } catch {
      return [0, 0, 0, 0];
    }
  }
  return positionMeta || [0, 0, 0, 0];
}

// Check if a token index is within an annotation range
export function isTokenInAnnotation(
  tokenIndex: number,
  startWordIndex: number,
  endWordIndex: number
): boolean {
  const min = Math.min(startWordIndex, endWordIndex);
  const max = Math.max(startWordIndex, endWordIndex);
  return tokenIndex >= min && tokenIndex <= max;
}

// Get full image URL from path
export function getImageUrl(imagePath: string): string {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  return imagePath.startsWith('http')
    ? imagePath
    : `${apiBaseUrl}${imagePath}`;
}
