import { create } from "zustand";

interface LayoutStore {
  backgroundImage: string | null;
  setBackgroundImage: (url: string | null) => void;
}

export const useLayoutStore = create<LayoutStore>((set) => ({
  backgroundImage: null,
  setBackgroundImage: (url) => set({ backgroundImage: url }),
}));
