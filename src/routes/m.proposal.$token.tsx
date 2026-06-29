import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { money, fmtDate, PrimaryButton, GhostButton } from "@/components/ui/form";
import {
  Calendar,
  Users,
  MapPin,
  Clock,
  Plane,
  Hotel,
  Car,
  Compass,
  Check,
  X,
  CreditCard,
  QrCode,
  AlertCircle,
  FileText,
  Sparkles,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

import { getProposalTemplate } from "@/components/proposals/templates";
import { CanvasFormat, CANVAS_DIMENSIONS } from "@/components/studio/StudioFrame";
import { logProposalActivity } from "@/services/proposals";

const proposalSearchSchema = z.object({
  export: z.preprocess((val) => val === "true" || val === true, z.boolean()).optional(),
});

export const Route = createFileRoute("/m/proposal/$token")({
  validateSearch: proposalSearchSchema,
  head: () => ({ meta: [{ title: "Proposta de Viagem · TravelOS" }] }),
  component: PublicProposalView,
});

type ProposalPublic = {
  id: string;
  number: number;
  title: string;
  destination: string | null;
  travel_start: string | null;
  travel_end: string | null;
  pax_adults: number;
  pax_children: number;
  pax_infants: number;
  pax_seniors: number;
  currency: string;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  terms: string | null;
  valid_until: string | null;
  decided_at: string | null;
  agency_id: string;
  flights: any[];
  hotels: any[];
  transfers: any[];
  tours: any[];
  itinerary: any[];
  includes: string[];
  excludes: string[];
  pix_discount_percent: number;
  installments_card: number;
  installments_boleto: number;
  template: string;
  canvas_format?: string | null;
  notes: string | null;
  agency?: {
    name: string;
    logo_url: string | null;
    brand_color: string | null;
    brand_color_fg: string | null;
    logo_white_url?: string | null;
    secondary_color?: string | null;
    accent_color?: string | null;
    font_heading?: string | null;
    font_body?: string | null;
  };
};

function ClientCanvasFrame({
  format,
  children,
}: {
  format: CanvasFormat;
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const dims = CANVAS_DIMENSIONS[format] ?? CANVAS_DIMENSIONS["a4-portrait"];

  useEffect(() => {
    if (!containerRef.current) return;

    const handleResize = () => {
      if (!containerRef.current) return;
      const availW = containerRef.current.clientWidth;

      let targetW = 794; // A4 portrait
      if (dims.width === "210mm") targetW = 794;
      else if (dims.width === "297mm") targetW = 1123;
      else if (dims.width === "1080px") targetW = 1080;
      else if (dims.width === "1920px") targetW = 1920;
      else if (dims.width === "215.9mm") targetW = 816;

      const scaleW = availW / targetW;
      setScale(Math.min(1, scaleW));
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);
    handleResize();
    return () => observer.disconnect();
  }, [dims.width]);

  const [height, setHeight] = useState<string | number>("auto");
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const handleHeight = () => {
      if (!canvasRef.current) return;
      const unscaledHeight =
        canvasRef.current.scrollHeight || canvasRef.current.offsetHeight || 1080;
      setHeight(unscaledHeight * scale);
    };
    const observer = new ResizeObserver(handleHeight);
    observer.observe(canvasRef.current);
    handleHeight();
    return () => observer.disconnect();
  }, [scale]);

  return (
    <div ref={containerRef} className="w-full relative overflow-visible" style={{ height }}>
      <div
        ref={canvasRef}
        id="proposal-canvas"
        style={{
          width: dims.width,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
          backgroundColor: "#ffffff",
        }}
        className="canvas-page select-text flex flex-col overflow-hidden"
      >
        {children}
      </div>
    </div>
  );
}

function PublicProposalView() {
  const { token } = useParams({ from: "/m/proposal/$token" });
  const { export: isExport } = Route.useSearch();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["public-proposal", token],
    queryFn: async () => {
      const { data: p, error } = await supabase
        .from("proposals")
        .select(
          "id, number, title, destination, travel_start, travel_end, pax_adults, pax_children, pax_infants, pax_seniors, currency, subtotal, discount, total, status, terms, valid_until, decided_at, agency_id, flights, hotels, transfers, tours, itinerary, includes, excludes, pix_discount_percent, installments_card, installments_boleto, template, canvas_format, notes",
        )
        .eq("public_token", token)
        .maybeSingle();
      if (error) throw error;
      if (!p) return null;

      const { data: agency } = await supabase
        .rpc("get_public_agency_by_id", { _id: p.agency_id })
        .maybeSingle();

      // mark as viewed (fire-and-forget)
      if (!p.decided_at && p.status !== "draft") {
        await supabase
          .from("proposals")
          .update({
            status: "viewed",
            viewed_at: new Date().toISOString(),
          } as never)
          .eq("id", p.id);

        // Log client view in history
        await logProposalActivity(p.id, p.agency_id, "viewed");
      }
      return { ...p, agency: agency ?? undefined } as unknown as ProposalPublic;
    },
  });

  const decide = useMutation({
    onMutate: () => {
      toast.loading("Registrando sua decisão...", { id: "decide-proposal" });
    },
    mutationFn: async (status: "accepted" | "rejected") => {
      if (!q.data) return;
      const { error } = await supabase
        .from("proposals")
        .update({ status, decided_at: new Date().toISOString() } as never)
        .eq("id", q.data.id);
      if (error) throw error;

      // Log client decision in history
      await logProposalActivity(q.data.id, q.data.agency_id, status);
    },
    onSuccess: () => {
      toast.success("Decisão registrada com sucesso! Obrigado.", { id: "decide-proposal" });
      qc.invalidateQueries({ queryKey: ["public-proposal", token] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro", { id: "decide-proposal" }),
  });

  // Automatically handle landscape styles for browser print / Puppeteer PDF
  useEffect(() => {
    if (q.data) {
      const p = q.data;
      const isLandscape =
        p.canvas_format === "presentation-169" ||
        p.canvas_format === "a4-landscape" ||
        p.template === "landscape-presentation";

      if (isLandscape) {
        document.body.classList.add("print-landscape");
      } else {
        document.body.classList.remove("print-landscape");
      }
    }
    return () => {
      document.body.classList.remove("print-landscape");
    };
  }, [q.data]);

  if (q.isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface-alt/30 text-sm text-muted-foreground">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Carregando proposta premium…
      </div>
    );
  }

  if (q.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-alt/30 px-6 text-center">
        <div className="max-w-md rounded-2xl border border-red-200 bg-red-50/50 p-8 flex flex-col items-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-650 mb-4" />
          <h1 className="text-xl font-bold tracking-tight text-red-800">Falha na Conexão</h1>
          <p className="mt-2 text-sm text-red-650 leading-relaxed">
            {q.error instanceof Error ? q.error.message : "Erro ao obter dados da proposta do servidor."}
          </p>
        </div>
      </div>
    );
  }

  if (!q.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-alt/30 px-6 text-center">
        <div className="max-w-md rounded-2xl border border-border bg-surface p-8">
          <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground/60 mb-4" />
          <h1 className="text-xl font-bold tracking-tight">Proposta não encontrada</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            O link de acesso expirou, foi desativado ou é inválido. Por favor, solicite um novo link
            ao seu agente de viagens.
          </p>
        </div>
      </div>
    );
  }

  const p = q.data;
  const brand = p.agency?.brand_color ?? "#3b82f6";
  const brandFg = p.agency?.brand_color_fg ?? "#FFFFFF";
  const decided = !!p.decided_at;
  const totalPax =
    (p.pax_adults || 0) + (p.pax_seniors || 0) + (p.pax_children || 0) + (p.pax_infants || 0);

  const currentFormat = (p.canvas_format as CanvasFormat) || "a4-portrait";
  const currentTemplate = p.template || "editorial-flat";
  const TemplateComponent = getProposalTemplate(currentTemplate);

  // Load Google Fonts dynamically for public proposal
  useEffect(() => {
    if (!p?.agency) return;
    const fontHeading = p.agency.font_heading || "Inter";
    const fontBody = p.agency.font_body || "Inter";

    const linkId = "google-fonts-proposal-head";
    let linkEl = document.getElementById(linkId) as HTMLLinkElement;
    if (!linkEl) {
      linkEl = document.createElement("link");
      linkEl.id = linkId;
      linkEl.rel = "stylesheet";
      document.head.appendChild(linkEl);
    }
    const headingFormatted = fontHeading.replace(/\s+/g, "+");
    const bodyFormatted = fontBody.replace(/\s+/g, "+");
    linkEl.href = `https://fonts.googleapis.com/css2?family=${headingFormatted}:wght@400;600;700;800&family=${bodyFormatted}:wght@400;500;700&display=swap`;

    return () => {
      const el = document.getElementById(linkId);
      if (el) el.remove();
    };
  }, [p?.agency]);

  const primaryColor = p.agency?.brand_color || "#3b82f6";
  const secondaryColor = p.agency?.secondary_color || "#D4AF37";
  const accentColor = p.agency?.accent_color || "#E63946";
  const fontHeading = p.agency?.font_heading || "Inter";
  const fontBody = p.agency?.font_body || "Inter";

  const brandStyles = {
    "--agency-brand": primaryColor,
    "--agency-brand-fg": p.agency?.brand_color_fg || "#ffffff",
    "--brand-primary": primaryColor,
    "--brand-secondary": secondaryColor,
    "--brand-accent": accentColor,
    "--brand-bg": "#FFFFFF",
    "--brand-text": "#111827",
    "--brand-heading-font": `"${fontHeading}", sans-serif`,
    "--brand-body-font": `"${fontBody}", sans-serif`,
  } as React.CSSProperties;

  // ─── Export Mode (Puppeteer headless server-side print) ─────────────────────
  if (isExport) {
    return (
      <div
        className="w-full flex flex-col items-center bg-white print:bg-transparent"
        style={brandStyles}
      >
        <div id="proposal-canvas" className="w-full flex flex-col">
          <TemplateComponent proposal={p as any} agency={p.agency} />
        </div>
      </div>
    );
  }

  // ─── Standard Client Interactive View ───────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-[#f8fafc] dark:bg-[#0b0f19] text-foreground font-sans pb-20"
      style={brandStyles}
    >
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex items-center gap-3">
            {p.agency?.logo_url ? (
              <img
                src={p.agency.logo_url}
                alt={p.agency.name}
                className="h-9 w-9 rounded-lg object-cover border border-border/40"
              />
            ) : (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg font-bold text-sm"
                style={{ background: brand, color: brandFg }}
              >
                {p.agency?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-sm font-bold leading-tight">{p.agency?.name ?? "Agência"}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                Proposta #{p.number}
              </div>
            </div>
          </div>
          <span
            className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
            style={{ background: `${brand}15`, color: brand }}
          >
            {p.status === "draft"
              ? "Rascunho"
              : p.status === "sent"
                ? "Enviada"
                : p.status === "viewed"
                  ? "Visualizada"
                  : p.status === "accepted"
                    ? "Aceita"
                    : p.status}
          </span>
        </div>
      </header>

      {/* Main Content Layout Grid */}
      <main className="mx-auto max-w-7xl px-4 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Template Canvas with responsive wrapper */}
        <div className="lg:col-span-8 flex flex-col items-center w-full min-w-0">
          <div className="w-full overflow-hidden border border-border rounded-2xl bg-surface">
            <ClientCanvasFrame format={currentFormat}>
              <TemplateComponent proposal={p as any} agency={p.agency} />
            </ClientCanvasFrame>
          </div>
        </div>

        {/* Right Column: Actions and Decision Panel */}
        <div className="lg:col-span-4 space-y-6 w-full">
          {/* Decision Box */}
          <div className="rounded-2xl border border-border bg-surface p-5">
            {decided ? (
              <div className="text-center text-xs space-y-2">
                {p.status === "accepted" && (
                  <div className="space-y-2">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Check className="h-5 w-5" />
                    </div>
                    <div className="font-bold text-emerald-600 text-sm">Proposta Aceita!</div>
                    <p className="text-muted-foreground leading-normal">
                      Aprovada em {fmtDate(p.decided_at)}. Nosso agente de viagens entrará em
                      contato para os trâmites do contrato de viagem.
                    </p>
                  </div>
                )}
                {p.status === "rejected" && (
                  <div className="space-y-2">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                      <X className="h-5 w-5" />
                    </div>
                    <div className="font-bold text-rose-600 text-sm">Proposta Recusada</div>
                    <p className="text-muted-foreground leading-normal">
                      Recusada em {fmtDate(p.decided_at)}. Entraremos em contato para ajustar as
                      condições de acordo com suas preferências.
                    </p>
                  </div>
                )}
                {!["accepted", "rejected"].includes(p.status) && (
                  <div>Sua decisão foi registrada.</div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">
                  Decidir Proposta
                </h3>
                <DecideActions
                  onDecide={(s) => decide.mutate(s)}
                  pending={decide.isPending}
                  brand={brand}
                  brandFg={brandFg}
                />
              </div>
            )}
          </div>

          {/* Quick Info Box / Action Box */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Resumo da Viagem
            </h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>
                <strong>Destino:</strong> {p.destination ?? "—"}
              </div>
              <div>
                <strong>Período:</strong> {p.travel_start ? fmtDate(p.travel_start) : ""} —{" "}
                {p.travel_end ? fmtDate(p.travel_end) : ""}
              </div>
              <div>
                <strong>Passageiros:</strong> {totalPax} passageiro(s)
              </div>
            </div>
            {p.valid_until && (
              <div className="rounded-lg bg-amber-500/15 p-2.5 text-[10px] text-amber-700 dark:text-amber-500 font-medium">
                Condições de tarifas garantidas até {fmtDate(p.valid_until)}.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function DecideActions({
  onDecide,
  pending,
  brand,
  brandFg,
}: {
  onDecide: (s: "accepted" | "rejected") => void;
  pending: boolean;
  brand: string;
  brandFg: string;
}) {
  const [confirm, setConfirm] = useState<null | "accepted" | "rejected">(null);
  if (confirm) {
    return (
      <div className="text-center space-y-3 p-2">
        <p className="text-xs font-semibold text-foreground leading-normal">
          {confirm === "accepted"
            ? "Confirmar aceite desta proposta de viagem?"
            : "Confirmar recusa desta proposta de viagem?"}
        </p>
        <div className="flex items-center justify-center gap-2">
          <GhostButton type="button" onClick={() => setConfirm(null)} className="h-8 text-[11px]">
            Voltar
          </GhostButton>
          <PrimaryButton
            type="button"
            onClick={() => onDecide(confirm)}
            disabled={pending}
            className="h-8 text-[11px] font-bold"
            style={{ background: brand, color: brandFg }}
          >
            {pending ? "Enviando…" : "Confirmar"}
          </PrimaryButton>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setConfirm("accepted")}
        className="h-10 w-full rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
        style={{ background: brand, color: brandFg }}
      >
        Aceitar proposta
      </button>
      <button
        onClick={() => setConfirm("rejected")}
        className="h-10 w-full rounded-xl border border-border bg-surface text-xs font-medium text-muted-foreground hover:text-foreground transition-all hover:bg-slate-50 cursor-pointer"
      >
        Recusar proposta
      </button>
    </div>
  );
}
