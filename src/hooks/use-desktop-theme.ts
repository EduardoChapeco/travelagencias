import { useEffect } from "react";
import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

interface DesktopThemeState {
  wallpaper: string;
  blurIntensity: number;
  dimOpacity: number;
  glassOpacity: number;
  setTheme: (theme: Partial<DesktopThemeState>) => void;
  saveTheme: () => Promise<void>;
  loadTheme: () => Promise<void>;
}

export const useDesktopTheme = create<DesktopThemeState>((set, get) => ({
  wallpaper: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=2020&auto=format&fit=crop",
  blurIntensity: 0,
  dimOpacity: 25,
  glassOpacity: 20,
  setTheme: (theme) => set((state) => ({ ...state, ...theme })),
  saveTheme: async () => {
    const { wallpaper, blurIntensity, dimOpacity, glassOpacity } = get();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase.from("profiles").update({
      preferences: {
        desktop_wallpaper: wallpaper,
        desktop_blur_intensity: blurIntensity,
        desktop_dim_opacity: dimOpacity,
        desktop_glass_opacity: glassOpacity
      }
    }).eq("id", user.id);
  },
  loadTheme: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("preferences")
      .eq("id", user.id)
      .maybeSingle();
      
    if (data?.preferences && typeof data.preferences === 'object') {
      const prefs = data.preferences as any;
      set({
        wallpaper: prefs.desktop_wallpaper || get().wallpaper,
        blurIntensity: prefs.desktop_blur_intensity !== undefined ? Number(prefs.desktop_blur_intensity) : get().blurIntensity,
        dimOpacity: prefs.desktop_dim_opacity !== undefined ? Number(prefs.desktop_dim_opacity) : get().dimOpacity,
        glassOpacity: prefs.desktop_glass_opacity !== undefined ? Number(prefs.desktop_glass_opacity) : get().glassOpacity,
      });
    }
  }
}));

export function useDesktopThemeInitializer() {
  const loadTheme = useDesktopTheme(s => s.loadTheme);
  
  useEffect(() => {
    loadTheme();
  }, [loadTheme]);
}
