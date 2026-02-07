import { create } from 'zustand';
import type { Annotation } from '@/lib/types/annotation';

interface AnnotationState {
  annotations: Annotation[];
  isLoading: boolean;

  // Actions
  setAnnotations: (annotations: Annotation[]) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  getAnnotationsByBlock: (blockId: string) => Annotation[];
  setLoading: (loading: boolean) => void;
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  annotations: [],
  isLoading: false,

  setAnnotations: (annotations) => set({ annotations }),

  addAnnotation: (annotation) =>
    set((state) => ({
      annotations: [...state.annotations, annotation],
    })),

  updateAnnotation: (id, updates) =>
    set((state) => ({
      annotations: state.annotations.map((ann) =>
        ann.id === id ? { ...ann, ...updates } : ann
      ),
    })),

  deleteAnnotation: (id) =>
    set((state) => ({
      annotations: state.annotations.filter((ann) => ann.id !== id),
    })),

  getAnnotationsByBlock: (blockId) =>
    get().annotations.filter((ann) => ann.block_id === blockId),

  setLoading: (loading) => set({ isLoading: loading }),
}));
