import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, ArrowLeft, Clock, FileText } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { KycSignature } from "@/components/client-portal/KycSignature";
import { getProposalTemplate } from "@/components/proposals/templates";
import { CanvasFormat } from "@/components/studio/StudioFrame";
import { Button } from "@/components/ui/button";
type ProposalPublic = any;
function ClientCanvasFrame({ children, format }: { children: React.ReactNode, format: string }) {
  return <div className={`canvas-frame ${format}`}>{children}</div>;
}

export const Route = createFileRoute("/client/quotes/$id")({
  head: ({ context }: any) => ({ meta: [{ title: `Visualizar Cotação · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: ClientQuoteView,
});

function ClientQuoteView() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [isSigning, setIsSigning] = useState(false);

  const q = useQuery({
    queryKey: ["client-quote", id],
    queryFn: async () => {
      // Confirmação de segurança via RLS do app
      const { data: p, error } = await (supabase as any)
        .from("proposals")
        .select(`
          id, number, title, destination, travel_start, travel_end, pax_adults, 
          pax_children, pax_infants, pax_seniors, currency, subtotal, discount, 
          total, status, terms, valid_until, decided_at, agency_id, flights, 
          hotels, transfers, tours, itinerary, includes, excludes, 
          pix_discount_percent, installments_card, installments_boleto, 
          template, canvas_format, notes, public_token,
          agency:agencies(name, logo_url, brand_color, brand_color_fg, logo_white_url, secondary_color, accent_color, font_heading, font_body)
        `)
        .eq("id", id)
        .single();
        
      if (error) throw error;
      if (!p) return null;

      // Update status to viewed if not decided
      if (!p.decided_at && p.status !== "draft") {
        await (supabase as any)
          .from("proposals")
          .update({ status: "viewed" })
          .eq("id", p.id);
      }

      return p as unknown as ProposalPublic;
    },
  });

  const decide = useMutation({
    onMutate: () => toast.loading("Registrando sua decisão..."),
    mutationFn: async (status: "approved" | "rejected") => {
      const { error } = await (supabase as any)
        .from("proposals")
        .update({ status, decided_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.dismiss();
      toast.success("Decisão registrada com sucesso!");
      qc.invalidateQueries({ queryKey: ["client-quote", id] });
      qc.invalidateQueries({ queryKey: ["client-quotes"] });
    },
    onError: (e) => {
      toast.dismiss();
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    },
  });

  const handleKycSign = async (kycData: { photoBlob: Blob; latitude: number; longitude: number }) => {
    try {
      const auth = await supabase.auth.getUser();
      const userId = auth.data.user?.id;
      if (!userId || !q.data) throw new Error("Não autorizado");

      // 1. Upload photo
      const fileName = `${userId}/${Date.now()}-kyc.jpg`;
      const { data: uploadData, error: uploadErr } = await supabase
        .storage
        .from("identity_proofs")
        .upload(fileName, kycData.photoBlob, { contentType: "image/jpeg" });
      
      if (uploadErr) throw uploadErr;

      const { data: publicUrlData } = supabase.storage.from("identity_proofs").getPublicUrl(fileName);

      // 2. Insert signature log
      const { error: signErr } = await (supabase as any).from("client_signatures").insert({
        agency_id: q.data.agency_id,
        client_id: userId,
        document_type: "proposal",
        document_id: q.data.id,
        latitude: kycData.latitude,
        longitude: kycData.longitude,
        photo_url: publicUrlData.publicUrl
      });
      if (signErr) throw signErr;

      // 3. Approve quote
      await decide.mutateAsync("approved");
      setIsSigning(false);
    } catch (e: any) {
      toast.error(e.message || "Erro no KYC");
    }
  };

  if (q.isLoading) return <div className="p-8 text-center animate-pulse">Carregando cotação...</div>;
  if (!q.data) return <div className="p-8 text-center text-red-500">Cotação não encontrada.</div>;

  const quote = q.data;
  const isPending = quote.status === "sent" || quote.status === "viewed";
  const TemplateComponent = getProposalTemplate(quote.template);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between mb-4">
        <Button 
          onClick={() => navigate({ to: "/client/quotes" })}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
      </div>

      <PageHeader
        title={quote.title}
        description={`Cotação #${quote.number} enviada por ${quote.agency?.name || 'sua agência'}`}
      />

      {isPending && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-[var(--radius-card)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Esta proposta aguarda sua aprovação.</p>
              <p className="text-xs opacity-80">Você pode aceitar ou recusar a oferta da agência.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => decide.mutate("rejected")}
              disabled={decide.isPending || isSigning}
              className="px-4 py-2 text-sm font-semibold text-red-600 bg-red-100 hover:bg-red-200 rounded-full transition-colors disabled:opacity-50"
            >
              Recusar
            </Button>
            <Button
              onClick={() => setIsSigning(true)}
              disabled={decide.isPending || isSigning}
              className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-full flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> Aceitar Proposta
            </Button>
          </div>
        </div>
      )}

      {isSigning && (
        <div className="glass-card border-none rounded-[var(--radius-card)] p-4 shadow-none border-none">
          <KycSignature onSign={handleKycSign} isLoading={decide.isPending} />
        </div>
      )}

      {quote.status === "approved" && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-600 rounded-[var(--radius-card)] p-4 flex items-center gap-3">
          <Check className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Você aceitou esta proposta!</p>
            <p className="text-xs opacity-80">A agência entrará em contato com os próximos passos, ou você será redirecionado para a assinatura.</p>
          </div>
        </div>
      )}

      {quote.status === "rejected" && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 rounded-[var(--radius-card)] p-4 flex items-center gap-3">
          <X className="h-5 w-5 shrink-0" />
          <p className="font-semibold text-sm">Esta proposta foi recusada.</p>
        </div>
      )}

      <div className="bg-white rounded-[var(--radius-card)] shadow-none border-none overflow-hidden">
        <div className="p-4 glass-card border-none border-b border-border flex items-center gap-2 text-muted-foreground text-sm font-medium">
          <FileText className="h-4 w-4" /> Visualização do Documento
        </div>
        <div className="w-full overflow-x-auto bg-zinc-100 p-4 md:p-8 flex justify-center">
          <ClientCanvasFrame format={(quote.canvas_format as CanvasFormat) || "presentation-169"}>
            <TemplateComponent proposal={quote as any} agency={quote.agency} />
          </ClientCanvasFrame>
        </div>
      </div>
    </div>
  );
}
