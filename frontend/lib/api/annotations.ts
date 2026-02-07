import { apiClient } from './client';
import type {
  Annotation,
  AnnotationCreate,
  AnnotationUpdate,
} from '@/lib/types/annotation';

export const annotationsAPI = {
  // Get all annotations for a document
  getAnnotations: async (docId: string): Promise<Annotation[]> => {
    const response = await apiClient.get<Annotation[]>(
      `/api/documents/${docId}/annotations`
    );
    return response.data;
  },

  // Create annotation
  createAnnotation: async (data: AnnotationCreate): Promise<Annotation> => {
    const response = await apiClient.post<Annotation>('/api/annotations', data);
    return response.data;
  },

  // Update annotation
  updateAnnotation: async (
    id: string,
    data: AnnotationUpdate
  ): Promise<Annotation> => {
    const response = await apiClient.put<Annotation>(
      `/api/annotations/${id}`,
      data
    );
    return response.data;
  },

  // Delete annotation
  deleteAnnotation: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/annotations/${id}`);
  },
};
