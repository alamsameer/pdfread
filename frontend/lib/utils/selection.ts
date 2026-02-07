import type { WordMeta, Block } from '@/lib/types/block';

// Parse words_meta JSON string
export function parseWordsMeta(wordsMetaStr: string): WordMeta[] {
  try {
    const parsed = JSON.parse(wordsMetaStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Parse style_runs JSON string
export function parseStyleRuns(styleRunsStr: string) {
  try {
    const parsed = JSON.parse(styleRunsStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Parse position_meta JSON string
export function parsePositionMeta(positionMetaStr: string): [number, number, number, number] {
  try {
    const parsed = JSON.parse(positionMetaStr);
    return Array.isArray(parsed) && parsed.length === 4 ? parsed as [number, number, number, number] : [0, 0, 0, 0];
  } catch {
    return [0, 0, 0, 0];
  }
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
