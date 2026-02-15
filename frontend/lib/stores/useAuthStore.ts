import { create } from 'zustand';
import { supabase } from '../supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  initialize: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ session, user: session?.user || null, isLoading: false });

      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user || null });
      });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  signIn: async () => {
      // Just redirect to login page or implement logic
      // This is a placeholder as the user requested a specific screen
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },
  
  getToken: async () => {
      const { session } = get();
      if (!session) return null;
      return session.access_token;
  }
}));
