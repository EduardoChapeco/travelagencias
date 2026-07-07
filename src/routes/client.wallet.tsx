import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shell/PageHeader";
import { 
  Plane, 
  Ticket, 
  ShieldAlert, 
  Hotel, 
  QrCode, 
  WalletCards,
  X 
} from "lucide-react";

export const Route = createFileRoute("/client/wallet")({
  head: ({ context }: any) => ({ meta: [{ title: `Carteira Digital · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: ClientWallet,
});

type PassType = "boarding_pass" | "ticket" | "insurance" | "voucher";

function getPassConfig(type: PassType) {
  switch (type) {
    case "boarding_pass": return { icon: Plane, label: "Cartão de Embarque" };
    case "insurance": return { icon: ShieldAlert, label: "Seguro Viagem" };
    case "ticket": return { icon: Ticket, label: "Ingresso" };
    default: return { icon: Hotel, label: "Voucher de Reserva" };
  }
}

function ClientWallet() {
  const [selectedPass, setSelectedPass] = useState<any | null>(null);

  const q = useQuery({
    queryKey: ["client-wallet-passes"],
    queryFn: async () => {
      const auth = await supabase.auth.getUser();
      if (!auth.data.user) throw new Error("Não autenticado");

      // Buscar passes do cliente logado
      const { data, error } = await supabase
        .from("client_wallet_passes" as any)
        .select("*")
        .eq("client_id", auth.data.user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      // Tabela ainda não existente no ambiente (migration pendente): falha visível, não silenciosa
      if (error && error.code === '42P01') {
        throw new Error("[wallet] Tabela 'client_wallet_passes' não encontrada. Execute: supabase db push");
      }
      if (error) throw error;

      return data ?? [];
    },
  });

  return (
    <div className="max-w-md mx-auto space-y-6 pb-20 relative h-full">
      <PageHeader
        title="Carteira Digital"
        description="Seus cartões de embarque e vouchers prontos para uso offline."
      />

      {q.isLoading && (
        <div className="animate-pulse space-y-[-40px]">
          <div className="h-48 bg-surface rounded-2xl border border-border"></div>
          <div className="h-48 bg-surface rounded-2xl border border-border scale-95 origin-bottom"></div>
        </div>
      )}

      {!q.isLoading && q.data?.length === 0 && (
        <div className="rounded-[var(--radius-card)] border border-dashed border-border p-12 text-center text-muted-foreground bg-surface/50 mt-10">
          <WalletCards className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-1">Carteira Vazia</h3>
          <p className="text-sm">Os documentos das suas próximas viagens aparecerão aqui magicamente.</p>
        </div>
      )}

      {/* Efeito de Cartões Sobrepostos */}
      <div className="relative pt-4" style={{ perspective: "1000px" }}>
        {q.data?.map((pass: any, index: number) => {
          const config = getPassConfig(pass.pass_type as PassType);
          const Icon = config.icon;
          const isSelected = selectedPass?.id === pass.id;
          const isHidden = selectedPass && !isSelected;

          if (isHidden) return null;

          return (
            <div
              key={pass.id}
              onClick={() => setSelectedPass(isSelected ? null : pass)}
              className={`
                w-full rounded-[var(--radius-card)] p-6 text-white cursor-pointer shadow-xl transition-all duration-500 ease-spring
                ${isSelected ? "relative z-50 h-[500px]" : "h-56 mb-[-120px] hover:-translate-y-4"}
              `}
              style={{
                backgroundColor: pass.color || "#0f172a",
                transform: !isSelected ? `translateY(${index * 10}px) scale(${1 - index * 0.02})` : "none",
                zIndex: isSelected ? 50 : 40 - index
              }}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md">
                  <Icon className="h-3 w-3" />
                  {config.label}
                </div>
                {isSelected && (
                  <button onClick={(e) => { e.stopPropagation(); setSelectedPass(null); }} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="mt-6">
                <h2 className="text-3xl font-bold leading-tight">{pass.title}</h2>
                <p className="text-white/80 text-lg mt-1 font-medium">{pass.subtitle}</p>
              </div>

              {isSelected && (
                <div className="absolute bottom-6 left-6 right-6 bg-white text-black rounded-[var(--radius-card)] p-6 flex flex-col items-center shadow-inner animate-in fade-in slide-in-from-bottom-10 duration-500">
                  <QrCode className="h-48 w-48 text-zinc-900" strokeWidth={1} />
                  <div className="mt-4 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Código do Bilhete</p>
                    <p className="font-mono text-xl tracking-wider font-bold">{pass.barcode_value}</p>
                  </div>
                  <div className="mt-6 w-full flex justify-between text-xs font-medium border-t border-border pt-4">
                    <span className="text-muted-foreground">Status</span>
                    <span className="text-green-600 font-bold uppercase">Ativo</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
