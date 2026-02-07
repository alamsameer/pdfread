import { create } from 'zustand';

interface UIState {
  // Modal state
  isUploadModalOpen: boolean;

  // Sidebar
  isSidebarOpen: boolean;
  activeTab: 'annotations' | 'toc';

  // Actions
  openUploadModal: () => void;
  closeUploadModal: () => void;
  toggleSidebar: () => void;
  setActiveTab: (tab: 'annotations' | 'toc') => void;
}

export const useUIStore = create<UIState>((set) => ({
  isUploadModalOpen: false,
  isSidebarOpen: false,
  activeTab: 'annotations',

  openUploadModal: () => set({ isUploadModalOpen: true }),
  closeUploadModal: () => set({ isUploadModalOpen: false }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
