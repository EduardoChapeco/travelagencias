// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, ArrowLeft, Calendar, Info, CheckCircle2 } from "lucide-react";
import { money } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import DOMPurify from "dompurify";

export const Route = createFileRoute("/p/$agency_slug/loja/$item_id")({
  component: PublicStoreItemDetail,
});

function PublicStoreItemDetail() {
  const { agency_slug, item_id } = Route.useParams();
  const search = Route.useSearch() as { type?: string };
  const itemType = search.type || "group_tour"; // default fallback

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formSubmitted, setFormSubmitted] = useState(false);

  const { data: agencyData } = useQuery({
    queryKey: ["agency-id-from-slug", agency_slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("agencies")
        .select("id, name, brand_color")
        .eq("slug", agency_slug)
        .single();
      return data;
    },
  });

  const agencyId = agencyData?.id;

  const { data: item, isLoading } = useQuery({
    queryKey: ["public-store-item", item_id, itemType],
    queryFn: async () => {
      if (itemType === "group_tour") {
        const { data, error } = await supabase
          .from("group_tours")
          .select("id, title, description, store_cover, store_price, destination, departure_date")
          .eq("id", item_id)
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("proposals")
          .select("id, title, store_cover, store_price")
          .eq("id", item_id)
          .single();
        if (error) throw error;
        return data;
      }
    },
  });

  const leadMutation = useMutation({
    mutationFn: async () => {
      if (!agencyId) throw new Error("Agência não encontrada");
      
      const { data, error } = await supabase.from("public_leads").insert({
        agency_id: agencyId,
        name: formName,
        email: formEmail,
        phone: formPhone,
        message: `[Interesse pela Loja Virtual]\nItem: ${item?.title}\nLink ID: ${item_id}\n\nMensagem do cliente: ${formNotes}`,
                      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Interesse enviado com sucesso!");
      setFormSubmitted(true);
    },
    onError: (err) => {
      toast.error("Erro ao enviar interesse: " + err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-12 md:py-16 space-y-8">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-[400px] w-full rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-24 text-center">
        <h2 className="text-2xl font-bold text-foreground">Pacote não encontrado</h2>
        <p className="text-muted-foreground mt-2 mb-6">
          O item que você procura não está mais disponível ou o link é inválido.
        </p>
        <Link
          to="/p/$agency_slug/loja"
          params={{ agency_slug }}
          className="inline-flex items-center gap-2 bg-brand text-brand-foreground px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para a loja
        </Link>
      </div>
    );
  }

  const handleInterestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || (!formEmail && !formPhone)) {
      toast.error("Preencha nome e um meio de contato (email ou telefone)");
      return;
    }
    leadMutation.mutate();
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 md:py-16">
      <Link
        to="/p/$agency_slug/loja"
        params={{ agency_slug }}
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para todos os pacotes
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          {item.store_cover ? (
            <div className="aspect-video w-full overflow-hidden rounded-2xl bg-surface-muted border border-border/60">
              <img
                src={item.store_cover}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-video w-full rounded-2xl bg-surface-alt flex flex-col items-center justify-center text-muted-foreground/30 border border-border/60">
              <MapPin className="h-16 w-16 mb-4" />
              <span className="font-semibold tracking-widest uppercase text-sm">Sem Imagem</span>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-brand/10 text-brand px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                {itemType === "group_tour" ? "Grupo de Viagem" : "Pacote Personalizado"}
              </span>
            </div>
            
            <h1 className="text-3xl font-black text-foreground sm:text-4xl leading-tight mb-4">
              {item.title}
            </h1>

            {(item as any).destination && (
              <div className="flex items-center gap-2 text-muted-foreground mb-6 font-medium">
                <MapPin className="h-5 w-5 text-brand" />
                <span>Destino: {(item as any).destination}</span>
              </div>
            )}
            
            <div className="prose prose-neutral dark:prose-invert max-w-none prose-p:leading-relaxed">
              {false ? (
                <div dangerouslySetInnerHTML={{ __html: '' }} />
              ) : (
                <p className="italic text-muted-foreground">Nenhuma descrição detalhada fornecida.</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-surface border border-border/80 rounded-2xl p-6 sticky top-24 shadow-sm">
            <h3 className="text-xl font-bold text-foreground mb-2">Investimento</h3>
            
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">A partir de</span>
              <span className="text-3xl font-black text-brand">
                {item.store_price ? money(item.store_price) : "Sob consulta"}
              </span>
            </div>

            <div className="border-t border-border/40 pt-6">
              <h4 className="font-bold text-foreground mb-4">Tenho interesse neste pacote</h4>
              
              {formSubmitted ? (
                <div className="bg-success-bg border border-success/20 rounded-xl p-6 text-center">
                  <div className="mx-auto w-12 h-12 bg-success/20 text-success rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h5 className="font-bold text-success mb-2">Interesse Enviado!</h5>
                  <p className="text-sm text-success/80">
                    Nossa equipe recebeu seu contato e retornará em breve com mais detalhes.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleInterestSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Seu Nome</label>
                    <Input 
                      placeholder="Nome completo" 
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">E-mail</label>
                    <Input 
                      type="email"
                      placeholder="seu@email.com" 
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">WhatsApp</label>
                    <Input 
                      placeholder="(11) 99999-9999" 
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Observações (opcional)</label>
                    <Textarea 
                      placeholder="Alguma dúvida ou detalhe específico?" 
                      className="min-h-[80px] bg-background resize-none"
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full font-bold text-base h-12 bg-brand text-brand-foreground hover:opacity-90 transition-opacity"
                    disabled={leadMutation.isPending}
                  >
                    {leadMutation.isPending ? "Enviando..." : "Solicitar Contato"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
