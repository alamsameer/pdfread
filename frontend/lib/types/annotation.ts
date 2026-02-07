export interface Annotation {
  id: string;
  doc_id: string;
  block_id: string;
  start_word_index: number;
  end_word_index: number;
  annotation_type: string;
  color?: string;
  font_size?: string;
  font_style?: string;
  note?: string;
  user_id: string;
  is_shared: number;
  created_at: string;
}

export interface AnnotationCreate {
  doc_id: string;
  block_id: string;
  start_word_index: number;
  end_word_index: number;
  color?: string;
  font_size?: string;
  font_style?: string;
  note?: string;
  user_id?: string;
}

export interface AnnotationUpdate {
  color?: string;
  font_size?: string;
  font_style?: string;
  note?: string;
}
