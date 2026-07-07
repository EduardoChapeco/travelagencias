import { create } from "zustand";
import type { ReactNode } from "react";
interface HeaderStore {
  toolbar: ReactNode | null;
  setToolbar: (toolbar: ReactNode | null) => void;
}
export const useHeaderStore = create<HeaderStore>((set) => ({
  toolbar: null,
  setToolbar: (toolbar) => set({ toolbar }),
}));
