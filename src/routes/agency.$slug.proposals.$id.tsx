import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { Link2, Send, PlaneTakeoff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { useAgency } from "@/lib/agency-context";
import {
  fetchProposal,
  updateProposal,
  type Proposal,
} from "@/services/proposals";

import { StudioToolbar } from "@/components/studio/StudioToolbar";
import { ProposalStudio } from "@/components/proposals/ProposalStudio";
import { OcrButton } from "@/components/proposals/OcrButton";
import { ExportPdfButton } from "@/components/proposals/ExportPdfButton";
import { MagicAIAssistant } from "@/components/proposals/MagicAIAssistant";
import { calculateQuoteTotals } from "@/lib/pricing";

export const Route = createFileRoute("/agency/$slug/proposals/$id")({
  head: () => ({ meta: [{ title: "Editor de Proposta · TravelOS" }] }),
  component: ProposalEditor,
});

function ProposalEditor() {
  const { slug, id } = useParams({ from: "/agency/$slug/proposals/$id" });
  const { agency } = useAgency();
  const qc = useQueryClient();

  const propQ = useQuery({
    queryKey: ["proposal", id],
    queryFn: () => fetchProposal(id),
  });

  const [draft, setDraft] = useState<Proposal | null>(null);

  useEffect(() => {
    if (propQ.data) {
      const raw = propQ.data;
      // Normalize canvas_format: fallback to a4-portrait if unset or invalid
      const validFormats = ["a4-portrait","a4-landscape","story-916","presentation-169","letter-portrait"];
      const canvas_format = validFormats.includes(raw.canvas_format as string)
        ? raw.canvas_format
        : "a4-portrait";

      setDraft({
        ...raw,
        canvas_format,
        flights: raw.flights ?? [],
        hotels: raw.hotels ?? [],
        transfers: raw.transfers ?? [],
        tours: raw.tours ?? [],
        itinerary: raw.itinerary ?? [],
        includes: raw.includes ?? [],
        excludes: raw.excludes ?? [],
      });
    }
  }, [propQ.data]);

  const persist = useMutation({
    mutationFn: (patch: Partial<Proposal>) => updateProposal(id, patch),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposal", id] }),
  });

  const save = useCallback(
    (patch: Partial<Proposal>) => {
      if (!draft) return;
      
      const nextState = { ...draft, ...patch };
      
      // Auto-calculate totals if there is any change that affects them
      const totals = calculateQuoteTotals(nextState);
      
      // We only merge subtotal, total, and discount to the backend, the rest are derived view models
      const finalPatch = { 
        ...patch, 
        subtotal: totals.subtotal, 
        total: totals.total 
      };
      
      const finalState = { ...nextState, subtotal: totals.subtotal, total: totals.total };

      setDraft(finalState);
      persist.mutate(finalPatch);
    },
    [draft, persist],
  );

  const navigate = useNavigate();

  const sendProposal = useMutation({
    mutationFn: async () => {
      if (!draft) return;
      await updateProposal(id, { status: "sent" });
    },
    onSuccess: () => {
      toast.success("Cotação marcada como enviada!");
      qc.invalidateQueries({ queryKey: ["proposal", id] });
      if (draft) setDraft({ ...draft, status: "sent" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao enviar"),
  });

  const convertToTrip = useMutation({
    mutationFn: async () => {
      if (!draft || !agency) return null;
      const { data: u } = await supabase.auth.getUser();
      const { data: tripData, error } = await supabase
        .from("trips")
        .insert({
          agency_id: agency.id,
          proposal_id: draft.id,
          client_id: (draft as any).client_id ?? null,
          title: draft.title,
          destination: draft.destination,
          travel_start: draft.travel_start,
          travel_end: draft.travel_end,
          currency: draft.currency,
          total_sale: draft.total,
          status: "planning",
          owner_id: u.user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      
      const { error: contractError } = await supabase
        .from("contracts")
        .insert({
          agency_id: agency.id,
          trip_id: tripData.id,
          status: "draft",
          version: "1.0",
          total_value: draft.total,
          package_summary: `Contrato gerado a partir da cotação #${draft.number} - ${draft.title}`,
          client_data: { name: draft.title }
        });
      if (contractError) throw new Error("Viagem criada, mas falha ao criar contrato: " + contractError.message);
      
      await updateProposal(id, { status: "converted" });
      return tripData;
    },
    onSuccess: (data) => {
      if (!data) return;
      toast.success("Viagem criada a partir da cotação!");
      qc.invalidateQueries({ queryKey: ["trips", agency?.id] });
      navigate({ to: "/agency/$slug/trips/$id", params: { slug, id: data.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao converter"),
  });

  if (propQ.isLoading || !draft)
    return <div className="p-6 text-sm text-muted-foreground">Carregando proposta…</div>;
  if (!propQ.data) return <div className="p-6">Proposta não encontrada</div>;

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/m/proposal/${draft.public_token}`
      : "";

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-surface-alt/10">
      <StudioToolbar
        title={draft.title}
        subtitle={`Cotação #${draft.number}`}
        onTitleChange={(v) => setDraft({ ...draft, title: v })}
        onTitleBlur={(v) => save({ title: v })}
        backTo="/agency/$slug/proposals"
        backParams={{ slug }}
        saving={persist.isPending}
        status={
          draft.status === "draft"
            ? "Rascunho"
            : draft.status === "sent"
              ? "Enviada"
              : draft.status === "viewed"
                ? "Visualizada"
                : draft.status === "accepted"
                  ? "Aceita"
                  : draft.status
        }
      >
        <button
          onClick={() => {
            navigator.clipboard.writeText(publicUrl);
            toast.success("Link público copiado");
          }}
          className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-surface-alt transition-colors"
        >
          <Link2 className="h-3.5 w-3.5" /> Copiar link
        </button>

        {draft.status === "draft" && (
          <button
            onClick={() => sendProposal.mutate()}
            disabled={sendProposal.isPending}
            className="flex h-9 items-center gap-1.5 rounded-md bg-brand/10 border border-brand/30 px-3 text-xs font-semibold text-brand hover:bg-brand/20 disabled:opacity-60 transition-all"
          >
            <Send className="h-3.5 w-3.5" />
            {sendProposal.isPending ? "Enviando…" : "Enviar cotação"}
          </button>
        )}

        {draft.status === "accepted" && (
          <button
            onClick={() => convertToTrip.mutate()}
            disabled={convertToTrip.isPending}
            className="flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60 shadow-sm transition-all"
          >
            <PlaneTakeoff className="h-3.5 w-3.5" />
            {convertToTrip.isPending ? "Convertendo…" : "Converter em Viagem"}
          </button>
        )}

        <ExportPdfButton proposal={draft} />

        <MagicAIAssistant draft={draft} onApply={save} />

        <OcrButton
          proposalId={draft.id}
          agencyId={agency?.id ?? ""}
          onExtracted={(data) => {
            const merged: Partial<Proposal> = {
              flights: [...(draft.flights ?? []), ...(data.flights ?? [])],
              hotels: [...(draft.hotels ?? []), ...(data.hotels ?? [])],
              transfers: [...(draft.transfers ?? []), ...(data.transfers ?? [])],
              tours: [...(draft.tours ?? []), ...(data.tours ?? [])],
              itinerary: [...(draft.itinerary ?? []), ...(data.itinerary ?? [])],
              includes: [...(draft.includes ?? []), ...(data.includes ?? [])],
              excludes: [...(draft.excludes ?? []), ...(data.excludes ?? [])],
            };
            
            // For simple string/array fields, overwrite if they were empty
            if (!draft.destination && data.destination) merged.destination = data.destination;
            if (!draft.notes && data.notes) merged.notes = data.notes;
            
            save(merged);
            toast.success("Dados extraídos e mesclados");
          }}
        />
      </StudioToolbar>

      <ProposalStudio draft={draft} save={save} agency={agency} />
    </div>
  );
}
