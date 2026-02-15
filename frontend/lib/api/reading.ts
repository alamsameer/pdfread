import { apiClient } from './client';

export interface ReadingSessionResponse {
  id: string;
  document_id: string;
  start_time: string;
  duration_seconds: number;
}

export interface ReadingStatsResponse {
  total_seconds: number;
  total_sessions: number;
  last_session_date: string | null;
}

export const readingAPI = {
  startSession: async (documentId: string): Promise<ReadingSessionResponse> => {
    const response = await apiClient.post<ReadingSessionResponse>('/api/reading/start', {
      document_id: documentId,
    });
    return response.data;
  },

  heartbeat: async (sessionId: string): Promise<ReadingSessionResponse> => {
    const response = await apiClient.post<ReadingSessionResponse>(
      `/api/reading/${sessionId}/heartbeat`
    );
    return response.data;
  },

  getStats: async (docId: string): Promise<ReadingStatsResponse> => {
    const response = await apiClient.get<ReadingStatsResponse>(
      `/api/documents/${docId}/stats`
    );
    return response.data;
  },
};
