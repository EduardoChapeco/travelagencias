import { create } from "zustand";
import type { ComponentType } from "react";

export type IconType = ComponentType<{ className?: string; strokeWidth?: number }>;

export type ContextItem = {
  label: string;
  to: string;
  icon: IconType;
  exact?: boolean;
  adminOnly?: boolean;
};

type SidebarState = {
  contextTitle: string | undefined;
  contextItems: ContextItem[];
  setContext: (title: string, items: ContextItem[]) => void;
  clearContext: () => void;
};

export const useSidebarStore = create<SidebarState>((set) => ({
  contextTitle: undefined,
  contextItems: [],
  setContext: (title, items) => set({ contextTitle: title, contextItems: items }),
  clearContext: () => set({ contextTitle: undefined, contextItems: [] }),
}));
