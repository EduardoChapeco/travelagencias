import React, { useState } from "react";
import { Sparkles, ArrowRight, ShieldCheck, Car, Coffee, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UpsellItem {
  id: string;
  title: string;
  description: string;
  price: number;
  icon: React.ReactNode;
  tag?: string;
}

const UPSELL_OFFERS: UpsellItem[] = [
  {
    id: "insurance_premium",
    title: "Upgrade Seguro Viagem Premium",
    description: "Cobertura estendida de $100.000 para emergências médicas, cancelamento e extravio de bagagem VIP.",
    price: 349.0,
    icon: <ShieldCheck className="w-6 h-6 text-emerald-500" />,
    tag: "Recomendado"
  },
  {
    id: "transfer_exec",
    title: "Transfer Executivo Privativo",
    description: "Motorista bilíngue esperando no desembarque com placa nominal. Veículo SUV Premium (ex: Blindado).",
    price: 450.0,
    icon: <Car className="w-6 h-6 text-blue-500" />
  },
  {
    id: "lounge_access",
    title: "Acesso Sala VIP Aeroporto",
    description: "Aguarde seu voo com conforto. Open bar, buffet premium, banheiros privativos e Wi-Fi de alta velocidade.",
    price: 180.0,
    icon: <Coffee className="w-6 h-6 text-amber-500" />
  }
];

export function TabUpsell({ tripId, agencyId }: { tripId: string, agencyId?: string }) {
  const [requested, setRequested] = useState<string[]>([]);

  const requestUpsell = useMutation({
    mutationFn: async (upsell: UpsellItem) => {
      // In a real app, this would create an inbox message or an internal lead/order
      const { error } = await supabase.from("support_tickets").insert({
        trip_id: tripId,
        agency_id: agencyId || "",
        title: `[UPSELL] Interesse em: ${upsell.title}`,
        description: `O cliente solicitou a contratação do serviço adicional: ${upsell.title} pelo valor de R$ ${upsell.price.toFixed(2)}. Favor entrar em contato para confirmar a cobrança e emissão.`,
        status: "open",
        priority: "high"
      } as any);
      if (error) throw error;
      return upsell.id;
    },
    onSuccess: (id) => {
      setRequested(prev => [...prev, id]);
      toast.success("Solicitação enviada! Nosso time de concierges entrará em contato em instantes.");
    },
    onError: () => toast.error("Não foi possível solicitar o upgrade no momento. Tente novamente.")
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight">Eleve sua Experiência</h2>
          <p className="text-muted-foreground text-sm max-w-xl">
            Selecionamos serviços exclusivos que podem transformar sua viagem. Adicione conforto e segurança com um clique.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {UPSELL_OFFERS.map(offer => {
          const isRequested = requested.includes(offer.id);
          
          return (
            <div 
              key={offer.id} 
              className={`relative flex flex-col rounded-[var(--radius-card)] border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/50 ${isRequested ? 'border-primary/50 bg-primary/5' : 'border-border'}`}
            >
              {offer.tag && (
                <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                  {offer.tag}
                </div>
              )}
              
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                {offer.icon}
              </div>
              
              <h3 className="font-bold text-lg leading-tight mb-2">{offer.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                {offer.description}
              </p>
              
              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground ds-meta uppercase tracking-wider block">Investimento</span>
                  <span className="font-bold text-lg text-foreground">R$ {offer.price.toFixed(2)}</span>
                </div>
                
                <Button 
                  onClick={() => requestUpsell.mutate(offer)}
                  disabled={isRequested || requestUpsell.isPending}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${isRequested ? 'bg-primary/20 text-primary hover:bg-primary/20' : ''}`}
                  variant={isRequested ? "secondary" : "default"}
                >
                  {isRequested ? "Solicitado" : "Adicionar"}
                  {!isRequested && <ArrowRight className="w-4 h-4 ml-1.5" />}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-8 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-900 dark:text-blue-200">
          <strong>Como funciona?</strong> Ao clicar em "Adicionar", nossa equipe será notificada e entrará em contato via WhatsApp para confirmar a emissão e enviar o link de pagamento do serviço adicional. Nenhuma cobrança é feita automaticamente.
        </div>
      </div>
    </div>
  );
}
