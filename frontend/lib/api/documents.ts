import { apiClient } from './client';
import type {
  Document,
  DocumentListResponse,
  UploadResponse,
} from '@/lib/types/document';
import type { Block } from '@/lib/types/block';

export const documentsAPI = {
  // Get all documents
  getDocuments: async (): Promise<DocumentListResponse> => {
    const response = await apiClient.get<DocumentListResponse>('/api/documents');
    return response.data;
  },

  // Get single document
  getDocument: async (docId: string): Promise<Document> => {
    const response = await apiClient.get<Document>(`/api/documents/${docId}`);
    return response.data;
  },

  // Get page blocks
  getPageBlocks: async (docId: string, pageNum: number): Promise<Block[]> => {
    const response = await apiClient.get<Block[]>(
      `/api/documents/${docId}/pages/${pageNum}/blocks`
    );
    return response.data;
  },

  // Delete document
  deleteDocument: async (docId: string): Promise<void> => {
    await apiClient.delete(`/api/documents/${docId}`);
  },

  // Upload document
  uploadDocument: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<UploadResponse>('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Update document metadata
  updateDocument: async (docId: string, data: { theme?: string; title?: string }): Promise<Document> => {
    const response = await apiClient.patch<Document>(`/api/documents/${docId}`, data);
    return response.data;
  },

  // Split block
  splitBlock: async (docId: string, blockId: string, splitIndex: number): Promise<Block[]> => {
    const response = await apiClient.post<Block[]>(
      `/api/documents/${docId}/blocks/${blockId}/split`, 
      { split_index: splitIndex }
    );
    return response.data;
  },
};
