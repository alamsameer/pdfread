import { create } from 'zustand';
import type { Document } from '@/lib/types/document';
import type { Block } from '@/lib/types/block';

interface DocumentState {
  // State
  currentDocument: Document | null;
  pages: Map<number, Block[]>;
  isLoading: boolean;
  error: string | null;

  // Actions
  setDocument: (doc: Document) => void;
  setPage: (pageNum: number, blocks: Block[]) => void;
  getPage: (pageNum: number) => Block[] | undefined;
  clearDocument: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  currentDocument: null,
  pages: new Map(),
  isLoading: false,
  error: null,

  setDocument: (doc) => set({ currentDocument: doc }),

  setPage: (pageNum, blocks) =>
    set((state) => {
      const newPages = new Map(state.pages);
      newPages.set(pageNum, blocks);
      return { pages: newPages };
    }),

  getPage: (pageNum) => get().pages.get(pageNum),

  clearDocument: () =>
    set({
      currentDocument: null,
      pages: new Map(),
      error: null,
    }),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
