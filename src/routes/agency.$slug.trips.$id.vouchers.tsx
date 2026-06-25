import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Plus,
  Ticket,
  Download,
  Plane,
  Hotel,
  Bus,
  Umbrella,
  Phone,
  User,
  MapPin,
  ChevronDown,
  ChevronRight,
  Upload,
  Trash2,
  Edit2,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/use-confirm";
import { useAgency } from "@/lib/agency-context";
import {
  StatusBadge,
  fmtDate,
  Field,
  Input,
  Select,
  GhostButton,
  PrimaryButton,
} from "@/components/ui/form";
import { processVoucherWithAI } from "@/lib/ocr-ai";
// html2canvas is loaded on-demand — see getHtml2Canvas() below
import { Instagram } from "lucide-react";
import {
  fetchVoucherTrip,
  fetchTripVouchers,
  fetchTripPassengers,
  saveVoucherData,
  deleteVoucherData,
  uploadVoucherSourceFile,
  uploadVoucherStoryImage,
  uploadVoucherPdf,
  type Voucher,
  type VoucherTrip as Trip,
  type TripPassenger as Passenger,
} from "@/services/vouchers";
import { VoucherStudio } from "@/components/vouchers/VoucherStudio";

export const Route = createFileRoute("/agency/$slug/trips/$id/vouchers")({
  head: () => ({ meta: [{ title: "Vouchers · TravelOS" }] }),
  component: TripVouchers,
});

// ─── Remove inlined types (now imported from service) ────────────────────────

// ─── Helpers ─────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

const TEMPLATE_LABELS = {
  navy: "Azul Marinho",
  minimal: "Minimalista",
  brand: "Cor da Agência",
};

// ─── Main component ───────────────────────────────────────────────────────────

function TripVouchers() {
  const { slug, id: tripId } = Route.useParams();
  const { agency } = useAgency();
  const qc = useQueryClient();
  const { confirm, ConfirmDialog } = useConfirm();

  const [selected, setSelected] = useState<Voucher | null>(null);
  const [creating, setCreating] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>("flights");
  const [storyVoucher, setStoryVoucher] = useState<Voucher | null>(null);
  const [generatingStory, setGeneratingStory] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────────

  const tripQ = useQuery({
    enabled: !!agency,
    queryKey: ["trip", tripId],
    queryFn: () => fetchVoucherTrip(tripId),
  });

  const vouchersQ = useQuery({
    enabled: !!agency,
    queryKey: ["vouchers_trip", tripId],
    queryFn: () => fetchTripVouchers(tripId),
  });

  const passengersQ = useQuery({
    enabled: !!agency,
    queryKey: ["passengers", tripId],
    queryFn: () => fetchTripPassengers(tripId),
  });

  // ── Draft state for new/editing voucher ──────────────────────────────────────

  const [draft, setDraft] = useState<Partial<Voucher>>({
    source_type: "manual",
    template: "navy",
    destination: "",
    general_locator: "",
    observations: "",
    flights: [],
    accommodation: [],
    transfers: [],
    tours: [],
    passengers: [],
    insurance: {},
    emergency_contacts: [],
  });

  function initNewVoucher(trip: Trip, pax: Passenger[]) {
    setDraft({
      source_type: "manual",
      template: "navy",
      destination: trip.destination ?? "",
      general_locator: trip.pnr ?? "",
      observations: "",
      flights: trip.airline
        ? [
            {
              locator: trip.pnr ?? "",
              airline: trip.airline,
              flight_number: "",
              origin: "",
              destination: trip.destination ?? "",
              date: trip.travel_start ?? "",
              departure_time: "",
              arrival_time: "",
              class: "Economy",
              baggage: "23kg",
            },
          ]
        : [],
      accommodation: [],
      transfers: [],
      tours: [],
      passengers: pax.map((p) => ({
        name: p.full_name,
        document: p.document ?? p.cpf ?? "",
        seat: "",
      })),
      insurance: {},
      emergency_contacts: [],
    });
    setCreating(true);
    setSelected(null);
    setOpenSection("flights");
  }

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const saveVoucher = useMutation({
    mutationFn: async () => {
      if (!agency) throw new Error("Sem agência");
      const payload = {
        agency_id: agency.id,
        trip_id: tripId,
        source_type: draft.source_type ?? "manual",
        destination: draft.destination ?? null,
        general_locator: draft.general_locator ?? null,
        observations: draft.observations ?? null,
        template: draft.template ?? "navy",
        passengers: draft.passengers ?? [],
        flights: draft.flights ?? [],
        accommodation: draft.accommodation ?? [],
        transfers: draft.transfers ?? [],
        tours: draft.tours ?? [],
        insurance: draft.insurance ?? {},
        emergency_contacts: draft.emergency_contacts ?? [],
      };

      await saveVoucherData(payload, selected?.id);
    },
    onSuccess: () => {
      toast.success(selected?.id ? "Voucher atualizado" : "Voucher criado");
      setCreating(false);
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["vouchers_trip", tripId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const deleteVoucher = useMutation({
    mutationFn: (id: string) => deleteVoucherData(id),
    onSuccess: () => {
      toast.success("Voucher removido");
      if (selected?.id === deleteVoucher.variables) {
        setSelected(null);
        setCreating(false);
      }
      qc.invalidateQueries({ queryKey: ["vouchers_trip", tripId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const uploadSourcePdf = useMutation({
    mutationFn: async (file: File) => {
      if (!agency) throw new Error("Sem agência");

      toast.loading("Enviando arquivo original…", { id: "ocr" });
      const signedUrl = await uploadVoucherSourceFile(agency.id, tripId, file);

      // Leitura automática via Inteligência Artificial
      toast.loading("Realizando leitura inteligente do documento…", { id: "ocr" });

      try {
        const aiResult = await processVoucherWithAI(file, agency.id);

        // Convertendo o resultado da leitura em preenchimento de Voucher
        setDraft((d) => ({
          ...d,
          destination: aiResult.title || d.destination,
          general_locator: aiResult.locator || d.general_locator,
          observations:
            "Importado via leitura automática de documento\n\nProvedor original: " +
            (aiResult.provider || "") +
            "\n\nTexto extraído:\n" +
            (aiResult.raw_extracted_text?.substring(0, 400) || ""),
          source_file_url: signedUrl,
          source_type: "operator_pdf" as const,
        }));

        toast.success("Leitura inteligente concluída com sucesso!", { id: "ocr" });
      } catch (err: any) {
        toast.warning(
          "Leitura automática temporariamente indisponível - Modo manual ativo. O arquivo original foi anexado.",
          { id: "ocr", duration: 6000 },
        );
        setDraft((d) => ({
          ...d,
          source_file_url: signedUrl,
          source_type: "operator_pdf" as const,
        }));
      }
    },
    onError: (e) =>
      toast.error(
        e instanceof Error ? e.message : "Não foi possível enviar o documento de origem.",
        { id: "ocr" },
      ),
  });

  // ── Edit existing ─────────────────────────────────────────────────────────────

  function editVoucher(v: Voucher) {
    setDraft({ ...v });
    setSelected(v);
    setCreating(true);
    setOpenSection("flights");
  }

  async function downloadStory() {
    const el = document.getElementById("story-canvas");
    if (!el || !agency) return;
    setGeneratingStory(true);
    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: null });
      const dataUrl = canvas.toDataURL("image/png");

      // Upload to Supabase Storage
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        if (storyVoucher?.id) {
          await uploadVoucherStoryImage(agency.id, tripId, storyVoucher.id, blob);
        }
        toast.success("Story salvo na nuvem com sucesso!");
      } catch (err) {
        console.error("Upload error", err);
        toast.warning("Não foi possível salvar na nuvem, mas o download será feito.");
      }

      // Download
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `voucher-story-${storyVoucher?.id}.png`;
      a.click();
    } catch (e) {
      toast.error("Falha ao gerar o Story.");
    } finally {
      setGeneratingStory(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const trip = tripQ.data;

  if (tripQ.isLoading) return <div className="p-4 text-sm text-muted-foreground">Carregando…</div>;

  // ── Editor mode ───────────────────────────────────────────────────────────────
  if (creating) {
    return (
      <VoucherStudio
        draft={draft}
        setDraft={setDraft}
        agency={{
          name: agency!.name,
          slug: agency!.slug,
          logo_url: agency!.logo_url ?? undefined,
          brand_color: agency!.brand_color ?? undefined,
        }}
        onSave={() => saveVoucher.mutate()}
        saving={saveVoucher.isPending}
        onCancel={() => {
          setCreating(false);
          setSelected(null);
        }}
        onUploadPdf={(file) => uploadSourcePdf.mutate(file)}
        onPdfGenerated={async (blob: Blob) => {
          if (!agency || !draft.id) return;
          try {
            const url = await uploadVoucherPdf(agency.id, tripId, draft.id, blob);
            qc.invalidateQueries({ queryKey: ["vouchers", tripId] });
            toast.success("PDF salvo na nuvem!");
            window.open(url, "_blank", "noopener");
          } catch (e: any) {
            toast.error(`Falha ao salvar PDF: ${e.message}`);
          }
        }}
        isEdit={!!selected?.id}
      />
    );
  }

  // ── List mode ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 min-h-0">
      <ConfirmDialog />
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Vouchers & Guias</h2>
        <button
          onClick={() => {
            if (trip) initNewVoucher(trip, passengersQ.data ?? []);
          }}
          className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-brand"
        >
          <Plus className="h-3.5 w-3.5" />
          Novo voucher
        </button>
      </div>

      {vouchersQ.isLoading && (
        <div className="text-sm text-muted-foreground">Carregando vouchers…</div>
      )}

      {vouchersQ.data?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Ticket className="mb-3 h-8 w-8 text-muted-foreground" />
          <div className="text-sm font-medium">Nenhum voucher emitido</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Crie um voucher manualmente ou importe um PDF da operadora.
          </div>
          <button
            onClick={() => {
              if (trip) initNewVoucher(trip, passengersQ.data ?? []);
            }}
            className="mt-4 flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Criar voucher
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(vouchersQ.data ?? []).map((v) => (
          <div
            key={v.id}
            className="group relative rounded-lg border border-border bg-surface p-4 transition hover:border-border-strong"
          >
            {/* Template badge */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {TEMPLATE_LABELS[v.template] ?? v.template}
                </span>
              </div>
              <StatusBadge tone={v.source_type === "operator_pdf" ? "info" : "neutral"}>
                {v.source_type === "operator_pdf" ? "PDF op." : "Manual"}
              </StatusBadge>
            </div>

            {/* Destination */}
            <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              {v.destination ?? "Sem destino"}
            </div>

            {/* Locator */}
            {v.general_locator && (
              <div className="mb-2 font-mono text-xs text-muted-foreground">
                Localizador: {v.general_locator}
              </div>
            )}

            {/* Summary */}
            <div className="flex gap-3 text-[11px] text-muted-foreground">
              {v.passengers.length > 0 && (
                <span className="flex items-center gap-0.5">
                  <User className="h-3 w-3" />
                  {v.passengers.length} pax
                </span>
              )}
              {v.flights.length > 0 && (
                <span className="flex items-center gap-0.5">
                  <Plane className="h-3 w-3" />
                  {v.flights.length} voo{v.flights.length > 1 ? "s" : ""}
                </span>
              )}
              {v.accommodation.length > 0 && (
                <span className="flex items-center gap-0.5">
                  <Hotel className="h-3 w-3" />
                  {v.accommodation.length} hotel{v.accommodation.length > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
              <button
                onClick={() => editVoucher(v)}
                className="flex h-7 flex-1 items-center justify-center gap-1 rounded-md border border-border text-xs hover:bg-surface-alt"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Editar
              </button>
              {v.pdf_url && (
                <a
                  href={v.pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs hover:bg-surface-alt"
                >
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </a>
              )}
              <button
                onClick={() => setStoryVoucher(v)}
                className="flex h-7 flex-1 items-center justify-center gap-1 rounded-md border border-border text-xs bg-brand text-brand-foreground hover:opacity-90 font-semibold"
              >
                <Instagram className="h-3.5 w-3.5" />
                Story
              </button>
              <button
                onClick={() => {
                  confirm({
                    title: "Excluir voucher?",
                    description: "Tem certeza que deseja excluir permanentemente este voucher?",
                    variant: "destructive",
                    onConfirm: () => deleteVoucher.mutate(v.id),
                  });
                }}
                className="flex h-7 items-center justify-center rounded-md border border-border px-2 text-muted-foreground hover:bg-danger-bg hover:text-danger hover:border-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {storyVoucher && trip && (
        <div
          className="fixed inset-0 z-[100] flex justify-end bg-black/80 backdrop-blur-sm"
          onClick={() => setStoryVoucher(null)}
        >
          <div
            className="relative flex h-full w-full max-w-md flex-col overflow-y-auto items-center gap-4 border-l border-border bg-surface p-6 animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold tracking-tight">Gerador de Story 9:16</h3>
            <p className="text-sm text-muted-foreground text-center">
              Faça o download desta imagem em alta resolução e envie pro seu cliente postar nas
              redes sociais.
            </p>

            <div className="relative flex items-center justify-center w-full bg-neutral-100 rounded-xl overflow-hidden py-4">
              {/* This is the invisible scaled canvas we take a snapshot of */}
              <div
                id="story-canvas"
                className="relative overflow-hidden shrink-0 flex flex-col bg-indigo-950"
                style={{ width: "400px", height: "711px" }}
              >
                {/* Decorative Background */}
                <div className="absolute top-[-100px] right-[-100px] w-64 h-64 bg-brand/20 blur-[80px] rounded-full" />
                <div className="absolute bottom-[-100px] left-[-100px] w-64 h-64 bg-pink-500/20 blur-[80px] rounded-full" />

                <div className="relative z-10 flex flex-col h-full p-8 text-white">
                  <div className="flex items-center gap-3 mb-auto">
                    {agency?.logo_url ? (
                      <img
                        src={agency.logo_url}
                        alt="Logo"
                        className="h-10 w-auto object-contain bg-white rounded-md p-1"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <span className="font-black text-xl tracking-tighter">{agency?.name}</span>
                    )}
                  </div>

                  <div className="mt-8 mb-4">
                    <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest mb-1">
                      Meu próximo destino
                    </h2>
                    <h1 className="text-4xl font-black leading-tight ">
                      {storyVoucher.destination || trip.destination || "Vou Viajar!"}
                    </h1>
                  </div>

                  <div className="flex flex-col gap-3 mt-6">
                    {storyVoucher.flights.length > 0 && (
                      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                        <div className="flex justify-between items-center text-xs text-white/70 font-semibold mb-2">
                          <span>Voo Confirmado</span>
                          <Plane className="w-4 h-4" />
                        </div>
                        <div className="flex justify-between items-center text-lg font-bold">
                          <span>{storyVoucher.flights[0].origin || "Origem"}</span>
                          <ArrowLeft className="w-4 h-4 rotate-180 text-white/50" />
                          <span>{storyVoucher.flights[0].destination || "Destino"}</span>
                        </div>
                        <div className="text-xs mt-1 text-white/60">
                          {storyVoucher.flights[0].airline} •{" "}
                          {storyVoucher.flights[0].flight_number}
                        </div>
                      </div>
                    )}

                    {storyVoucher.accommodation.length > 0 && (
                      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                        <div className="flex justify-between items-center text-xs text-white/70 font-semibold mb-1">
                          <span>Hospedagem</span>
                          <Hotel className="w-4 h-4" />
                        </div>
                        <div className="text-base font-bold truncate">
                          {storyVoucher.accommodation[0].name}
                        </div>
                        <div className="text-xs mt-1 text-white/60 truncate">
                          {storyVoucher.accommodation[0].city}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-6 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">
                      Planejado com perfeição por
                    </p>
                    <p className="text-xs font-bold text-white/80">@{agency?.slug}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex w-full justify-between items-center mt-2">
              <GhostButton onClick={() => setStoryVoucher(null)}>Fechar</GhostButton>
              <PrimaryButton onClick={downloadStory} disabled={generatingStory}>
                {generatingStory ? "Gerando..." : "Baixar Imagem 9:16"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// VoucherEditor foi removido e substituído por VoucherStudio.
