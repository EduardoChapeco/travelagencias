import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { Link2, Send, PlaneTakeoff, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { useAgency } from "@/lib/agency-context";
import { fetchProposal, updateProposal, type Proposal } from "@/services/proposals";

import { StudioToolbar } from "@/components/studio/StudioToolbar";
import { ProposalStudio } from "@/components/proposals/ProposalStudio";
import { OcrButton } from "@/components/proposals/OcrButton";
import { ExportPdfButton } from "@/components/proposals/ExportPdfButton";
import { MagicAIAssistant } from "@/components/proposals/MagicAIAssistant";
import { calculateQuoteTotals } from "@/lib/pricing";

export const Route = createFileRoute("/agency/$slug/proposals/$id")({
  head: ({ context }: any) => ({ meta: [{ title: `Editor de Proposta · ${context?.brand?.platform_name || 'Turis'}` }] }),
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
      const validFormats = [
        "a4-portrait",
        "a4-landscape",
        "story-916",
        "presentation-169",
        "letter-portrait",
      ];
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
        total: totals.total,
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

      // Usa a função RPC atômica que transfere voos, hotéis, itinerário, etc.
      const { data: tripId, error } = await (supabase.rpc as any)("convert_proposal_to_trip", {
        p_proposal_id: draft.id,
        p_agency_id: agency.id,
      });
      if (error) throw new Error(error.message);

      // ── Buscar dados reais do cliente para montar o contrato ──────────────────
      let clientDataArray: any[] = [];
      if (draft.client_id) {
        const { data: clientRow } = await supabase
          .from("clients")
          .select("id, full_name, email, phone, cpf, passport_number, address")
          .eq("id", draft.client_id)
          .maybeSingle();
        if (clientRow) {
          clientDataArray = [
            {
              name: clientRow.full_name ?? "",
              email: clientRow.email ?? "",
              phone: clientRow.phone ?? "",
              cpf: clientRow.cpf ?? "",
              passport_number: clientRow.passport_number ?? "",
              address: clientRow.address
                ? Object.values(clientRow.address as Record<string, string>)
                    .filter(Boolean)
                    .join(", ")
                : "",
            },
          ];
        }
      }

      // ── Buscar cláusulas do template ──────────────────────────────────────────
      const { data: templateClauses } = await (supabase.rpc as any)("contract_template_clauses");

      // ── Buscar dados da agência ───────────────────────────────────────────────
      const { data: agencyPrivate } = await supabase
        .from("agency_private")
        .select("email, phone, legal_name, document")
        .eq("agency_id", agency.id)
        .maybeSingle();

      const agency_data = {
        name: agency.name,
        legal_name: agencyPrivate?.legal_name ?? agency.name,
        document: agencyPrivate?.document ?? "",
        email: agencyPrivate?.email ?? "",
        phone: agencyPrivate?.phone ?? "",
      };

      // ── Criar contrato com dados completos e corretos ─────────────────────────
      const { error: contractError } = await supabase.from("contracts").insert({
        agency_id: agency.id,
        trip_id: tripId,
        status: "draft",
        version: "1.0",
        total_value: draft.total,
        package_summary: [
          draft.destination ? `Destino: ${draft.destination}` : null,
          draft.travel_start ? `Partida: ${draft.travel_start}` : null,
          draft.travel_end ? `Retorno: ${draft.travel_end}` : null,
          `Pax: ${(draft.pax_adults ?? 0) + (draft.pax_children ?? 0) + (draft.pax_infants ?? 0)} viajante(s)`,
        ]
          .filter(Boolean)
          .join(" · "),
        payment_terms: `Condições de pagamento conforme cotação #${draft.number}.`,
        // ✅ CORRETO: array de contratantes com dados reais
        client_data: clientDataArray,
        agency_data,
        passengers_data: [],
        fixed_clauses: templateClauses ?? [],
        custom_clauses: [],
      });
      if (contractError)
        toast.warning("Viagem criada, mas falha ao criar contrato: " + contractError.message);

      return { id: tripId };
    },
    onSuccess: (data) => {
      if (!data) return;
      toast.success("✈ Viagem criada com todos os dados da cotação!");
      qc.invalidateQueries({ queryKey: ["trips", agency?.id] });
      qc.invalidateQueries({ queryKey: ["proposal", id] });
      navigate({ to: "/agency/$slug/trips/$id", params: { slug, id: data.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao converter"),
  });

  if (propQ.isError) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center bg-background rounded-[24px] border border-red-200 bg-red-50/50 m-6">
        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <AlertCircle className="h-5 w-5 text-red-600" />
        </div>
        <h3 className="text-base font-bold text-red-800">Falha ao Carregar Proposta</h3>
        <p className="text-xs text-red-600 mt-1 max-w-md">
          {propQ.error instanceof Error ? propQ.error.message : "Erro desconhecido"}
        </p>
      </div>
    );
  }

  if (propQ.isLoading || !draft)
    return <div className="p-6 text-sm text-muted-foreground">Carregando proposta…</div>;

  if (!propQ.data) return <div className="p-6">Proposta não encontrada</div>;

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/m/proposal/${draft.public_token}`
      : "";

  return (
    <div className="flex h-full flex-col bg-surface-alt/10">
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
          className="flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium hover:bg-surface-alt transition-colors"
        >
          <Link2 className="h-3.5 w-3.5" /> Copiar link
        </button>

        {draft.status === "draft" && (
          <button
            onClick={() => sendProposal.mutate()}
            disabled={sendProposal.isPending}
            className="flex h-9 items-center gap-1.5 rounded-full bg-brand/10 border border-brand/30 px-3 text-xs font-semibold text-brand hover:bg-brand/20 disabled:opacity-60 transition-all"
          >
            <Send className="h-3.5 w-3.5" />
            {sendProposal.isPending ? "Enviando…" : "Enviar cotação"}
          </button>
        )}

        {draft.status === "accepted" && (
          <button
            onClick={() => convertToTrip.mutate()}
            disabled={convertToTrip.isPending}
            className="flex h-9 items-center gap-1.5 rounded-full bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition-all"
          >
            <PlaneTakeoff className="h-3.5 w-3.5" />
            {convertToTrip.isPending ? "Reservando…" : "Reservar"}
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
