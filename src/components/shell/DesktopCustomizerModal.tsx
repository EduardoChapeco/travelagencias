import { useState } from "react";
import { X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useDesktopTheme } from "@/hooks/use-desktop-theme";
import { Button } from "@/components/ui/button";
import { FormInput as Input } from "@/components/ui/input";

export function DesktopCustomizerModal({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const theme = useDesktopTheme();
  
  // Local state for the custom URL input
  const [customUrl, setCustomUrl] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 pointer-events-auto">
      <div className="w-full max-w-md glass dark:glass-dark rounded-[32px] border border-white/20 p-6 text-white flex flex-col gap-5 relative animate-fadeIn">
        <Button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </Button>

        <div>
          <h3 className="text-lg font-bold">Personalizar Desktop</h3>
          <p className="text-xs text-white/60">Configure as preferências da sua área de trabalho.</p>
        </div>

        {/* Wallpaper Custom URL */}
        <div className="space-y-2">
          <label className="ds-meta font-black uppercase tracking-widest text-white/70">Papel de Parede (URL)</label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Cole a URL de uma imagem..."
              value={customUrl || theme.wallpaper}
              onChange={(e) => {
                setCustomUrl(e.target.value);
                theme.setTheme({ wallpaper: e.target.value });
              }}
              className="flex-1 bg-white/10 border-white/20 rounded-full text-white placeholder:text-white/40 focus:ring-2 focus:ring-white/50"
            />
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-white/80">Blur do Wallpaper</span>
              <span>{theme.blurIntensity}px</span>
            </div>
            <Input
              type="range"
              min="0"
              max="30"
              value={theme.blurIntensity}
              onChange={(e) => theme.setTheme({ blurIntensity: Number(e.target.value) })}
              className="w-full h-1.5 bg-white/10 appearance-none cursor-pointer accent-white"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-white/80">Escurecimento de Fundo</span>
              <span>{theme.dimOpacity}%</span>
            </div>
            <Input
              type="range"
              min="0"
              max="80"
              value={theme.dimOpacity}
              onChange={(e) => theme.setTheme({ dimOpacity: Number(e.target.value) })}
              className="w-full h-1.5 bg-white/10 appearance-none cursor-pointer accent-white"
            />
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-white/80">Transparência do Glass</span>
              <span>{theme.glassOpacity}%</span>
            </div>
            <Input
              type="range"
              min="5"
              max="60"
              value={theme.glassOpacity}
              onChange={(e) => theme.setTheme({ glassOpacity: Number(e.target.value) })}
              className="w-full h-1.5 bg-white/10 appearance-none cursor-pointer accent-white"
            />
            <p className="ds-meta text-white/40">
              {theme.glassOpacity <= 15 ? "Blur intenso — wallpaper bem visível" : theme.glassOpacity <= 30 ? "Equilíbrio (recomendado)" : "Mais opaco"}
            </p>
          </div>
        </div>

        <Button
          onClick={async () => {
            try {
              await theme.saveTheme();
              toast.success("Área de trabalho personalizada!");
              setOpen(false);
            } catch (error) {
              toast.error("Erro ao salvar preferências");
            }
          }}
          className="w-full py-3 rounded-full bg-white text-black hover:bg-zinc-200 text-sm font-semibold transition-colors cursor-pointer text-center mt-2"
        >
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
