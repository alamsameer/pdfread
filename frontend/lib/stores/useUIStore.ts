import { create } from 'zustand';

interface UIState {
  // Modal state
  isUploadModalOpen: boolean;

  // Sidebar
  isSidebarOpen: boolean;

  // Actions
  openUploadModal: () => void;
  closeUploadModal: () => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isUploadModalOpen: false,
  isSidebarOpen: false,

  openUploadModal: () => set({ isUploadModalOpen: true }),
  closeUploadModal: () => set({ isUploadModalOpen: false }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}));
