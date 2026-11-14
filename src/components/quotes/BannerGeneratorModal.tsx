import { useState } from "react";
import { Sparkles, Download, Copy, Check } from "lucide-react";
import { SheetPage } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";

interface BannerGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destination: string;
  hotelName: string;
  airlineName: string;
  totalPrice: number;
  pricePerPerson: number;
  installments10x: number;
  nightsCount: number;
  mealPlan: string;
  agencyName?: string;
  agencyPhone?: string;
  imageUrl?: string;
}

export function BannerGeneratorModal({
  open,
  onOpenChange,
  destination,
  hotelName,
  airlineName,
  totalPrice,
  pricePerPerson,
  installments10x,
  nightsCount,
  mealPlan,
  agencyName = "TravelOS Agência",
  agencyPhone = "(49) 99999-9999",
  imageUrl,
}: BannerGeneratorModalProps) {
  const [aspect, setAspect] = useState<"feed" | "story">("feed");
  const [copied, setCopied] = useState(false);

  const defaultImg =
    imageUrl ||
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80";

  const handleCopyText = () => {
    const text = `🔥 *OFERTA EXCLUSIVA - PACOTE COMPLETO* 🔥\n\n🌴 *Destino:* ${destination}\n🏨 *Hospedagem:* ${hotelName} (${nightsCount} Noites)\n🍳 *Regime:* ${mealPlan}\n✈️ *Aéreo:* Voo ${airlineName} Ida e Volta com taxas inclusas\n\n💳 *Valor por pessoa:* ${formatCurrency(pricePerPerson)}\n💰 *Total:* ${formatCurrency(totalPrice)} ou *10x de ${formatCurrency(installments10x)} sem juros*\n\n📲 Solicite agora: ${agencyPhone}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Texto copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <SheetPage
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Gerador de Banner Promocional</span>
        </div>
      }
      actions={
        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-full border border-border/80">
          <button
            type="button"
            onClick={() => setAspect("feed")}
            className={`px-3 py-1 text-[11px] font-semibold rounded-full transition-all cursor-pointer ${
              aspect === "feed" ? "bg-card text-foreground shadow-none" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Feed (1:1)
          </button>
          <button
            type="button"
            onClick={() => setAspect("story")}
            className={`px-3 py-1 text-[11px] font-semibold rounded-full transition-all cursor-pointer ${
              aspect === "story" ? "bg-card text-foreground shadow-none" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Story (9:16)
          </button>
        </div>
      }
      width="clamp(480px, 45vw, 640px)"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopyText}
            className="rounded-full text-[12px] flex items-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado!" : "Copiar Texto WhatsApp"}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-full text-[12px]"
            >
              Fechar
            </Button>
            <Button
              type="button"
              onClick={() => {
                toast.success("Download do banner iniciado em alta resolução!");
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-5 text-[12px] font-bold flex items-center gap-1.5 shadow-none cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Baixar (.PNG)
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6 flex flex-col items-center">
        <div className="flex justify-center w-full">
          <div
            className={`relative rounded-[var(--radius-2xl)] overflow-hidden border border-white/20 text-white flex flex-col justify-between p-6 transition-all shadow-none ${
              aspect === "feed" ? "w-[360px] h-[360px]" : "w-[280px] h-[480px]"
            }`}
            style={{
              backgroundImage: `linear-gradient(to top, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.4) 50%, rgba(15, 23, 42, 0.2) 100%), url(${defaultImg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="bg-amber-500 text-white text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full">
                OFERTA DA SEMANA
              </span>
              <span className="text-[10px] font-bold tracking-wide uppercase opacity-90">
                {agencyName}
              </span>
            </div>

            <div className="space-y-1 my-auto">
              <div className="text-[11px] uppercase tracking-widest text-amber-300 font-bold">
                Pacote Completo Aéreo + Hotel
              </div>
              <h2 className="text-[24px] font-black leading-none tracking-tight">
                {destination}
              </h2>
              <p className="text-[12px] text-white/90 font-medium">
                {hotelName} · {nightsCount} Noites com {mealPlan}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-[var(--radius-lg)] p-3 space-y-1">
              <div className="text-[10px] text-white/80 uppercase">Por pessoa a partir de:</div>
              <div className="flex items-baseline gap-2">
                <span className="text-[20px] font-black text-amber-300 font-mono leading-none">
                  10x {formatCurrency(installments10x)}
                </span>
                <span className="text-[11px] text-white/80">ou {formatCurrency(totalPrice)}</span>
              </div>
              <div className="text-[9px] text-white/60">Taxas inclusas · Voo {airlineName}</div>
            </div>
          </div>
        </div>
      </div>
    </SheetPage>
  );
}
