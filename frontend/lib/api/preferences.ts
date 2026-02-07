
import { apiClient } from './client';
import type { UserPreference, UserPreferenceUpdate } from '@/lib/types/preference';

export const preferencesAPI = {
  // Get user preferences
  getPreferences: async (userId: string = 'user'): Promise<UserPreference> => {
    const response = await apiClient.get<UserPreference>(`/api/preferences/${userId}`);
    return response.data;
  },

  // Update user preferences
  updatePreferences: async (userId: string = 'user', data: UserPreferenceUpdate): Promise<UserPreference> => {
    const response = await apiClient.patch<UserPreference>(`/api/preferences/${userId}`, data);
    return response.data;
  },
};
