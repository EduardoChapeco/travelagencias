import { create } from "zustand";
import { type ReactNode } from "react";

export type PrimaryActionConfig = {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
};

interface LayoutStore {
  backgroundImage: string | null;
  setBackgroundImage: (url: string | null) => void;
  primaryAction: PrimaryActionConfig | null;
  setPrimaryAction: (action: PrimaryActionConfig | null) => void;
}

export const useLayoutStore = create<LayoutStore>((set) => ({
  backgroundImage: null,
  setBackgroundImage: (url) => set({ backgroundImage: url }),
  primaryAction: null,
  setPrimaryAction: (action) => set({ primaryAction: action }),
}));
