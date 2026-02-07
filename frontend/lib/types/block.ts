export interface WordMeta {
  start: number;
  end: number;
  text: string;
  fontSize?: number;
  fontFamily?: string;
  isBold?: boolean;
  isItalic?: boolean;
  color?: string;
  isNewline?: boolean;
  x?: number;
  y?: number;
}

export interface StyleRun {
  start: number;
  end: number;
  fontSize?: number;
  font?: string;
  isBold?: boolean;
  isItalic?: boolean;
  color?: string;
}

export interface Block {
  id: string;
  doc_id: string;
  page_number: number;
  block_order: number;
  block_type: 'text' | 'image';
  text?: string;
  image_path?: string;
  words_meta: string; // JSON string of WordMeta[]
  style_runs: string; // JSON string of StyleRun[]
  position_meta: string; // JSON string [x0, y0, x1, y1]
}

export interface ParsedBlock extends Block {
  parsedWords: WordMeta[];
  parsedStyles: StyleRun[];
  parsedPosition: [number, number, number, number];
}
