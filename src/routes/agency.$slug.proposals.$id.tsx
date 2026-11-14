import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { Link2, Send, PlaneTakeoff, AlertCircle, Percent, Plane, Hotel, Car, MapPin } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { SheetPage } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/agency/$slug/proposals/$id")({
  head: ({ context }: any) => ({
    meta: [{ title: `Editor de Proposta · ${context?.brand?.platform_name || "Turis"}` }],
  }),
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
  const [isMarkupPanelOpen, setIsMarkupPanelOpen] = useState(false);
  const [markupRates, setMarkupRates] = useState({
    flights: 0,
    hotels: 0,
    transfers: 0,
    tours: 0,
  });

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

      // Removemos o envio de subtotal e total para o backend, pois
      // a autoridade do cálculo é inteiramente do servidor (via trigger recalculate_proposal_totals).
      const finalPatch = { ...patch };

      const finalState = { ...nextState };

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

      // ── Cláusulas Dinâmicas baseadas no pacote ───────────────────────────────────
      const dynamicClauses: string[] = [];
      if ((draft.flights ?? []).length > 0) {
        dynamicClauses.push(
          "Os bilhetes aéreos estão sujeitos às regras tarifárias da companhia aérea e podem sofrer alterações de malha sem aviso prévio. Em caso de reacomodação, a agência atuará como intermediária, sem responsabilidade direta sobre a decisão da operadora.",
        );
        dynamicClauses.push(
          "Qualquer alteração de nome em passagem aérea após a emissão poderá incorrer em taxa adicional cobrada pela companhia aérea, de responsabilidade exclusiva do passageiro.",
        );
      }
      if ((draft.hotels ?? []).length > 0) {
        dynamicClauses.push(
          "As reservas hoteleiras estão sujeitas às políticas de cancelamento do estabelecimento, conforme descrito em cada voucher emitido. Reembolsos por cancelamento seguem as regras do fornecedor.",
        );
      }
      if ((draft.transfers ?? []).length > 0) {
        dynamicClauses.push(
          "Os serviços de transfer são operados por parceiros locais. Atrasos decorrentes de tráfego, condições climáticas ou força maior não geram direito à indenização ou reembolso.",
        );
      }
      if ((draft.tours ?? []).length > 0) {
        dynamicClauses.push(
          "Passeios e excursões opcionais confirmados neste pacote estão sujeitos a condições climáticas e número mínimo de participantes. Em caso de cancelamento pelo operador local, será oferecida alternativa ou reembolso integral do item.",
        );
      }
      if (draft.destination?.toLowerCase().includes("intern") || (draft.destination ?? "").includes("EUA") || (draft.destination ?? "").includes("Europa")) {
        dynamicClauses.push(
          "Para destinos internacionais, é de responsabilidade exclusiva do viajante a obtenção de visto, seguro viagem (OBRIGATÓRIO), documentação vigente e cumprimento dos requisitos sanitários do país de destino.",
        );
      }

      // ── Criar contrato com dados completos e corretos ─────────────────────────────
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
        custom_clauses: dynamicClauses,
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
      <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center bg-background rounded-[var(--radius-card)] border border-red-200 bg-red-50/50 m-6">
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
    <div className="flex h-full flex-col glass/10">
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
        <Button
          onClick={() => {
            navigator.clipboard.writeText(publicUrl);
            toast.success("Link público copiado");
          }}
          className="flex h-9 items-center gap-1.5 rounded-full border-none px-3 text-xs font-medium hover:glass transition-colors"
        >
          <Link2 className="h-3.5 w-3.5" /> Copiar link
        </Button>

        {draft.status === "draft" && (
          <Button
            onClick={() => sendProposal.mutate()}
            disabled={sendProposal.isPending}
            className="flex h-9 items-center gap-1.5 rounded-full bg-brand/10 border border-brand/30 px-3 text-xs font-semibold text-brand hover:bg-brand/20 disabled:opacity-60 transition-all"
          >
            <Send className="h-3.5 w-3.5" />
            {sendProposal.isPending ? "Enviando…" : "Enviar cotação"}
          </Button>
        )}

        {draft.status === "accepted" && (
          <Button
            onClick={() => setIsMarkupPanelOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-full bg-violet-500/10 border border-violet-400/30 px-3 text-xs font-semibold text-violet-400 hover:bg-violet-500/20 transition-all"
          >
            <Percent className="h-3.5 w-3.5" />
            Markup
          </Button>
        )}

        {draft.status === "accepted" && (
          <Button
            onClick={() => convertToTrip.mutate()}
            disabled={convertToTrip.isPending}
            className="flex h-9 items-center gap-1.5 rounded-full bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition-all"
          >
            <PlaneTakeoff className="h-3.5 w-3.5" />
            {convertToTrip.isPending ? "Reservando…" : "Reservar"}
          </Button>
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

      {/* Markup Global Panel */}
      <SheetPage
        isOpen={isMarkupPanelOpen}
        onClose={() => setIsMarkupPanelOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-violet-400" />
            Painel de Markup Global
          </div>
        }
        width="clamp(360px, 30vw, 480px)"
      >
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Aplique um markup percentual por categoria de serviço antes de converter a proposta em
            viagem. Os valores serão recalculados e salvos na proposta.
          </p>

          {/* Markup por categoria */}
          {([
            { key: "flights", label: "Voos", icon: Plane, count: draft.flights?.length ?? 0 },
            { key: "hotels", label: "Hotéis", icon: Hotel, count: draft.hotels?.length ?? 0 },
            { key: "transfers", label: "Transfers", icon: Car, count: draft.transfers?.length ?? 0 },
            { key: "tours", label: "Passeios", icon: MapPin, count: draft.tours?.length ?? 0 },
          ] as const).map(({ key, label, icon: Icon, count }) => (
            <div key={key} className="flex items-center gap-4 p-4 rounded-2xl border border-border/40 glass/10">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-400">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs font-semibold">{label}</Label>
                  <span className="ds-meta text-muted-foreground">{count} item(s)</span>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="200"
                    step="0.5"
                    value={markupRates[key]}
                    onChange={(e) =>
                      setMarkupRates((prev) => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))
                    }
                    className="pr-8"
                    disabled={count === 0}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-violet-400/20 bg-violet-500/5 p-4 text-xs text-violet-300 space-y-1">
            <div className="font-semibold text-violet-200">Como funciona:</div>
            <p>Cada item da categoria terá seu preço multiplicado por <code>(1 + markup/100)</code>.</p>
            <p>Ex: Item R$1.000 com 15% → R$1.150 na proposta.</p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsMarkupPanelOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
              onClick={() => {
                if (!draft) return;
                const applyMarkup = (price: number, pct: number) =>
                  pct > 0 ? Math.round(price * (1 + pct / 100)) : price;

                save({
                  flights: (draft.flights ?? []).map((f) => ({
                    ...f,
                    price: applyMarkup(f.price ?? 0, markupRates.flights),
                  })),
                  hotels: (draft.hotels ?? []).map((h) => ({
                    ...h,
                    price: applyMarkup((h as any).price ?? 0, markupRates.hotels),
                  })),
                  transfers: (draft.transfers ?? []).map((t) => ({
                    ...t,
                    price: applyMarkup((t as any).price ?? 0, markupRates.transfers),
                  })),
                  tours: (draft.tours ?? []).map((t) => ({
                    ...t,
                    price: applyMarkup((t as any).price ?? 0, markupRates.tours),
                  })),
                });
                toast.success("Markup aplicado! Os valores foram atualizados na proposta.");
                setIsMarkupPanelOpen(false);
              }}
            >
              Aplicar Markup
            </Button>
          </div>
        </div>
      </SheetPage>
    </div>
  );
}
