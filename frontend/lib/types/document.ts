export interface Document {
  id: string;
  title: string;
  file_path: string;
  total_pages: number;
  created_at: string;
  theme?: string;
  toc?: any[]; // JSON object
}

export interface DocumentListResponse {
  total: number;
  documents: Document[];
}

export interface UploadResponse {
  status: string;
  document_id: string;
  title: string;
  total_pages: number;
}

export interface StatusResponse {
  status: string;
  message?: string;
}
