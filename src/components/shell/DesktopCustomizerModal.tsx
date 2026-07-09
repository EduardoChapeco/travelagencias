import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function DesktopCustomizerModal({
  open,
  setOpen,
  wallpaper,
  setWallpaper,
  blurIntensity,
  setBlurIntensity,
  dimOpacity,
  setDimOpacity,
  glassOpacity,
  setGlassOpacity,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  wallpaper: string;
  setWallpaper: (wallpaper: string) => void;
  blurIntensity: number;
  setBlurIntensity: (val: number) => void;
  dimOpacity: number;
  setDimOpacity: (val: number) => void;
  glassOpacity: number;
  setGlassOpacity: (val: number) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 pointer-events-auto">
      <div className="w-full max-w-md glass dark:glass-dark rounded-[32px] border border-white/20 p-6 text-white flex flex-col gap-5 relative animate-fadeIn">
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div>
          <h3 className="text-lg font-bold">Personalizar Desktop</h3>
          <p className="text-xs text-white/60">Configure as preferências da sua área de trabalho.</p>
        </div>

        {/* Preset Wallpapers */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/70">Papel de Parede</label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { name: "Paris", url: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=200&auto=format&fit=crop" },
              { name: "Aurora", url: "https://images.unsplash.com/photo-1579033461380-adb47c3eb938?q=80&w=200&auto=format&fit=crop" },
              { name: "Mountain", url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=200&auto=format&fit=crop" },
              { name: "Space", url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=200&auto=format&fit=crop" },
            ].map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => setWallpaper(preset.url.replace("w=200", "w=2020"))}
                className={cn(
                  "aspect-video rounded-[var(--radius-card)] bg-cover bg-center border border-white/10 hover:border-white/40 hover:scale-105 active:scale-95 transition-all cursor-pointer",
                  wallpaper.includes(preset.name.toLowerCase()) ? "ring-2 ring-white border-transparent" : "",
                )}
                style={{ backgroundImage: `url('${preset.url}')` }}
                title={preset.name}
              />
            ))}
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-white/80">Blur do Wallpaper</span>
              <span>{blurIntensity}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              value={blurIntensity}
              onChange={(e) => setBlurIntensity(Number(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-2xl appearance-none cursor-pointer accent-white"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-white/80">Escurecimento de Fundo</span>
              <span>{dimOpacity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="80"
              value={dimOpacity}
              onChange={(e) => setDimOpacity(Number(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-2xl appearance-none cursor-pointer accent-white"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-white/80">Transparência do Glass</span>
              <span>{glassOpacity}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="60"
              value={glassOpacity}
              onChange={(e) => setGlassOpacity(Number(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-2xl appearance-none cursor-pointer accent-white"
            />
            <p className="text-[10px] text-white/40">
              {glassOpacity <= 15 ? "Blur intenso — wallpaper bem visível" : glassOpacity <= 30 ? "Equilíbrio (recomendado)" : "Mais opaco"}
            </p>
          </div>
        </div>

        <button
          onClick={async () => {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await (supabase as any)
              .from("profiles")
              .select("preferences")
              .eq("id", user.id)
              .maybeSingle();

            const currentPrefs = data?.preferences && typeof data.preferences === "object" ? (data.preferences as any) : {};

            const updatedPrefs = {
              ...currentPrefs,
              desktop_wallpaper: wallpaper,
              desktop_blur_intensity: blurIntensity,
              desktop_dim_opacity: dimOpacity,
              desktop_glass_opacity: glassOpacity,
            };

            const { error } = await (supabase as any)
              .from("profiles")
              .update({ preferences: updatedPrefs })
              .eq("id", user.id);

            if (error) {
              toast.error("Erro ao salvar preferências");
            } else {
              toast.success("Área de trabalho personalizada!");
              setOpen(false);
            }
          }}
          className="w-full py-3 rounded-full bg-white text-black hover:bg-zinc-200 text-sm font-semibold transition-colors cursor-pointer text-center mt-2"
        >
          Salvar Configurações
        </button>
      </div>
    </div>
  );
}
