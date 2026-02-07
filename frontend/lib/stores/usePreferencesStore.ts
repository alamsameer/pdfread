
import { create } from 'zustand';
import { preferencesAPI } from '@/lib/api/preferences';
import type { UserPreference } from '@/lib/types/preference';

interface PreferencesState {
  preferences: UserPreference;
  isLoading: boolean;
  
  // Actions
  fetchPreferences: (userId?: string) => Promise<void>;
  updatePreferences: (userId: string | undefined, data: Partial<UserPreference>) => Promise<void>;
  setFontSize: (size: number) => void; // Optimistic update
  setFontFamily: (family: string) => void; // Optimistic update
  setLineHeight: (height: string) => void; // Optimistic update
}

const DEFAULT_PREFERENCES: UserPreference = {
  user_id: 'user',
  font_size: 18,
  font_family: 'Merriweather',
  line_height: '1.6',
};

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  preferences: DEFAULT_PREFERENCES,
  isLoading: false,

  fetchPreferences: async (userId = 'user') => {
    set({ isLoading: true });
    try {
      const prefs = await preferencesAPI.getPreferences(userId);
      set({ preferences: prefs, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
      set({ isLoading: false });
    }
  },

  updatePreferences: async (userId = 'user', data) => {
    // Optimistic update
    set((state) => ({
      preferences: { ...state.preferences, ...data },
    }));

    try {
      await preferencesAPI.updatePreferences(userId, data);
    } catch (error) {
      console.error('Failed to update preferences:', error);
      // Revert could be implemented here if needed
    }
  },

  setFontSize: (size) => {
      const current = get().preferences;
      get().updatePreferences(current.user_id, { font_size: size });
  },

  setFontFamily: (family) => {
      const current = get().preferences;
      get().updatePreferences(current.user_id, { font_family: family });
  },

  setLineHeight: (height) => {
      const current = get().preferences;
      get().updatePreferences(current.user_id, { line_height: height });
  }
}));
