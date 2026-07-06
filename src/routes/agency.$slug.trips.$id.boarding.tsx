import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { StatusBadge, fmtDate } from "@/components/ui/form";
import { useState } from "react";
import {
  Navigation,
  CheckCircle2,
  Clock,
  AlertCircle,
  UserCheck,
  Calendar,
  Hash,
  Plane,
  CheckSquare,
  Square,
  MapPin,
  ExternalLink,
  Link2,
  ListTodo,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { updateBoardingCardChecklist } from "@/services/boarding";

export const Route = createFileRoute("/agency/$slug/trips/$id/boarding")({
  head: ({ context }: any) => ({ meta: [{ title: `Check-in & Embarque · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: TripBoardingPage,
});

const STAGE_CONFIG: Record<
  string,
  { label: string; tone: "neutral" | "warning" | "info" | "success" }
> = {
  pending: { label: "Pendente", tone: "neutral" },
  action_needed: { label: "Atenção (Docs/Vistos)", tone: "warning" },
  checked_in: { label: "Check-in Emitido", tone: "info" },
  completed: { label: "Embarcado", tone: "success" },
};

function TripBoardingPage() {
  const { id } = useParams({ from: "/agency/$slug/trips/$id/boarding" });
  const { agency } = useAgency();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"cards" | "settings">("cards");
  const [overrideUrls, setOverrideUrls] = useState<Record<string, string>>({});

  // 1. Fetch boarding cards specifically for this trip
  const { data: cards = [], isLoading: isLoadingCards } = useQuery({
    enabled: !!agency,
    queryKey: ["trip-boarding-cards-status", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boarding_cards")
        .select(
          `
          id, pnr, airline, status, departure_date, passengers_count, checklist,
          departure_airport, arrival_airport, flight_number, flight_date, flight_class,
          notes, briefing_date, briefing_url, alerts
        `,
        )
        .eq("trip_id", id)
        .order("departure_date", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((c: any) => ({
        ...c,
        checklist: c.checklist ?? [],
      }));
    },
  });

  // 2. Fetch passengers for this trip
  const { data: passengers = [] } = useQuery({
    enabled: !!agency,
    queryKey: ["trip-passengers", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_passengers")
        .select("id, full_name")
        .eq("trip_id", id);
      if (error) throw error;
      return data ?? [];
    },
  });

  // 3. Fetch flight segments associated with active/confirmed itineraries
  const { data: segments = [], isLoading: isLoadingSegments } = useQuery({
    enabled: !!agency,
    queryKey: ["trip-flight-segments", id],
    queryFn: async () => {
      const { data: itineraries, error: itErr } = await supabase
        .from("flight_itineraries")
        .select("id")
        .eq("trip_id", id)
        .eq("status", "active");
      if (itErr) throw itErr;

      const itIds = (itineraries ?? []).map((i) => i.id);
      if (itIds.length === 0) return [];

      const { data, error } = await supabase
        .from("flight_segments")
        .select(
          `
          id, itinerary_id, airline_code, flight_number, origin_iata, destination_iata,
          departure_at, arrival_at, record_locator, status, segment_order
        `,
        )
        .in("itinerary_id", itIds)
        .order("segment_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  // 4. Fetch checkin overrides
  const { data: checkinLinks = [] } = useQuery({
    enabled: !!agency && segments.length > 0,
    queryKey: ["trip-checkin-links", id],
    queryFn: async () => {
      const segmentIds = segments.map((s) => s.id);
      const { data, error } = await supabase
        .from("checkin_links")
        .select("id, flight_segment_id, provider, link_type, raw_url")
        .in("flight_segment_id", segmentIds);
      if (error) throw error;

      // Sync override urls local state
      const urlMap: Record<string, string> = {};
      (data ?? []).forEach((link) => {
        urlMap[link.flight_segment_id || ""] = link.raw_url || "";
      });
      setOverrideUrls((prev) => ({ ...urlMap, ...prev }));

      return data ?? [];
    },
  });

  // 5. Fetch boarding events for timeline
  const { data: boardingEvents = [], isLoading: isLoadingEvents } = useQuery({
    enabled: !!agency,
    queryKey: ["trip-boarding-events", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boarding_events")
        .select("id, trip_id, traveler_id, flight_segment_id, event_type, occurred_at, metadata")
        .eq("trip_id", id)
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Toggle item in checklist mutation
  const toggleItemMut = useMutation({
    mutationFn: async ({
      cardId,
      index,
      done,
    }: {
      cardId: string;
      index: number;
      done: boolean;
    }) => {
      const card = cards.find((c) => c.id === cardId);
      if (!card) return;
      const nextChecklist = [...card.checklist];
      nextChecklist[index] = { ...nextChecklist[index], done };
      await updateBoardingCardChecklist(cardId, nextChecklist);
    },
    onSuccess: () => {
      toast.success("Checklist atualizado!");
      qc.invalidateQueries({ queryKey: ["trip-boarding-cards-status", id] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar checklist");
    },
  });

  // Update card status mutation
  const updateStatusMut = useMutation({
    mutationFn: async ({ cardId, status }: { cardId: string; status: string }) => {
      const { error } = await supabase
        .from("boarding_cards")
        .update({ status } as any)
        .eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado!");
      qc.invalidateQueries({ queryKey: ["trip-boarding-cards-status", id] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar status");
    },
  });

  // Upsert check-in link override mutation
  const saveCheckinLinkMut = useMutation({
    mutationFn: async ({
      segmentId,
      provider,
      rawUrl,
    }: {
      segmentId: string;
      provider: string;
      rawUrl: string;
    }) => {
      if (!agency) return;
      const existing = checkinLinks.find((l) => l.flight_segment_id === segmentId);

      if (existing) {
        const { error } = await supabase
          .from("checkin_links")
          .update({
            provider,
            raw_url: rawUrl,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("checkin_links").insert({
          flight_segment_id: segmentId,
          agency_id: agency.id,
          provider,
          link_type: "web_checkin",
          raw_url: rawUrl,
          source: "manual",
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Link de Check-in salvo!");
      qc.invalidateQueries({ queryKey: ["trip-checkin-links", id] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar link");
    },
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header informativo */}
      <div className="rounded-[24px] border border-border bg-surface p-4 flex items-start gap-3 justify-between">
        <div className="flex items-start gap-3">
          <Navigation className="h-4 w-4 text-brand mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-foreground">Check-in & Status de Embarque</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Monitore cartões de embarque, configure overrides de check-in e visualize a timeline
              de eventos dos passageiros.
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-surface-alt p-0.5 rounded-2xl border border-border/60 text-[11px] font-semibold">
          <button
            onClick={() => setActiveTab("cards")}
            className={cn(
              "px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5",
              activeTab === "cards"
                ? "bg-surface shadow text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ListTodo className="h-3.5 w-3.5" /> Cartões
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={cn(
              "px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5",
              activeTab === "settings"
                ? "bg-surface shadow text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Link2 className="h-3.5 w-3.5" /> e-Check-in & Timeline
          </button>
        </div>
      </div>

      {activeTab === "cards" ? (
        <>
          {isLoadingCards && (
            <div className="text-sm text-muted-foreground animate-pulse py-8 text-center">
              Carregando status de embarque…
            </div>
          )}

          {!isLoadingCards && cards.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-2xl text-center">
              <Navigation className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-semibold text-muted-foreground">
                Nenhum controle de embarque para esta viagem
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Os cartões de embarque são gerados automaticamente na conversão ou criados pelo
                painel global.
              </p>
            </div>
          )}

          {cards.length > 0 && (
            <div className="space-y-6">
              {cards.map((card) => {
                const st = STAGE_CONFIG[card.status] ?? { label: card.status, tone: "neutral" };
                const doneCount = card.checklist.filter((i: any) => i.done).length;
                const totalCount = card.checklist.length;
                const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

                return (
                  <div
                    key={card.id}
                    className="rounded-[24px] border border-border bg-surface overflow-hidden shadow-sm"
                  >
                    {/* Header do Card */}
                    <div className="p-4 border-b border-border/60 bg-surface-alt/20 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold bg-brand/10 text-brand px-2 py-0.5 rounded">
                          {card.airline || "Sem Cia"}
                        </span>
                        {card.flight_number && (
                          <span className="text-xs text-muted-foreground font-mono">
                            Voo {card.flight_number}
                          </span>
                        )}
                        {card.pnr && (
                          <span className="text-xs font-mono text-muted-foreground">
                            PNR: <strong className="text-foreground">{card.pnr}</strong>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <select
                          value={card.status}
                          onChange={(e) =>
                            updateStatusMut.mutate({ cardId: card.id, status: e.target.value })
                          }
                          className="text-xs border border-border rounded px-2 py-1 bg-surface cursor-pointer text-muted-foreground hover:text-foreground font-medium"
                        >
                          {Object.entries(STAGE_CONFIG).map(([val, conf]) => (
                            <option key={val} value={val}>
                              {conf.label}
                            </option>
                          ))}
                        </select>

                        <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                      </div>
                    </div>

                    {/* Grid de detalhes */}
                    <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Detalhes do Voo */}
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Trecho & Data
                        </p>
                        <div className="space-y-2">
                          {(card.departure_airport || card.arrival_airport) && (
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                              <span className="font-mono">{card.departure_airport || "—"}</span>
                              <span className="text-muted-foreground font-normal">→</span>
                              <span className="font-mono">{card.arrival_airport || "—"}</span>
                            </div>
                          )}

                          <div className="space-y-1 text-xs text-muted-foreground">
                            {card.departure_date && (
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                Embarque: {fmtDate(card.departure_date)}
                              </div>
                            )}
                            {card.flight_class && (
                              <div className="flex items-center gap-1.5">
                                <Plane className="h-3.5 w-3.5" />
                                Classe: {card.flight_class}
                              </div>
                            )}
                            {card.passengers_count != null && (
                              <div className="flex items-center gap-1.5">
                                <UserCheck className="h-3.5 w-3.5" />
                                Passageiros: {card.passengers_count} pax
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Briefing de Destino */}
                        {(card.briefing_date || card.briefing_url) && (
                          <div className="pt-2 border-t border-border/60 space-y-1">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                              Briefing operacional
                            </p>
                            <div className="text-xs">
                              {card.briefing_date && (
                                <p className="text-muted-foreground">
                                  Agendado: {fmtDate(card.briefing_date)}
                                </p>
                              )}
                              {card.briefing_url && (
                                <a
                                  href={card.briefing_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-brand hover:underline inline-flex items-center gap-1 font-medium mt-0.5"
                                >
                                  Acessar Briefing <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Checklist Operacional */}
                      <div className="md:col-span-2 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Checklist do Trecho
                          </p>
                          <span className="text-xs font-semibold text-brand">
                            {doneCount}/{totalCount} ({pct}%)
                          </span>
                        </div>

                        {totalCount === 0 ? (
                          <p className="text-xs text-muted-foreground italic">
                            Nenhuma tarefa definida no checklist.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {card.checklist.map((item: any, idx: number) => {
                              const isPending =
                                toggleItemMut.isPending &&
                                toggleItemMut.variables?.cardId === card.id &&
                                toggleItemMut.variables?.index === idx;
                              return (
                                <button
                                  key={idx}
                                  disabled={isPending}
                                  onClick={() =>
                                    toggleItemMut.mutate({
                                      cardId: card.id,
                                      index: idx,
                                      done: !item.done,
                                    })
                                  }
                                  className={cn(
                                    "flex items-center gap-2.5 p-2 rounded-2xl border text-left transition-colors text-xs cursor-pointer",
                                    item.done
                                      ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-950 dark:text-emerald-300"
                                      : "bg-surface border-border hover:bg-surface-alt text-foreground",
                                  )}
                                >
                                  {item.done ? (
                                    <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                                  ) : (
                                    <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                                  )}
                                  <span
                                    className={cn(
                                      "truncate",
                                      item.done && "line-through opacity-70",
                                    )}
                                  >
                                    {item.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Alertas operacionais */}
                        {card.alerts && card.alerts.length > 0 && (
                          <div className="mt-3 p-2.5 rounded-2xl border border-warning/30 bg-warning/5 space-y-1">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-warning-foreground flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> Atenção & Alertas
                            </p>
                            {card.alerts.map((alert: string, idx: number) => (
                              <p
                                key={idx}
                                className="text-xs text-warning-foreground pl-4 relative"
                              >
                                <span className="absolute left-1.5 top-1.5 h-1 w-1 rounded-full bg-warning-foreground" />
                                {alert}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Panel: Check-in overrides */}
          <div className="bg-surface rounded-[24px] border border-border p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
              <Link2 className="h-4 w-4 text-brand" />
              <span>Link de Check-in (Overrides)</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Substitua os deep links de check-in padrão por URLs customizadas para trechos
              específicos desta viagem.
            </p>

            {isLoadingSegments ? (
              <div className="text-xs text-muted-foreground animate-pulse py-4">
                Carregando trechos...
              </div>
            ) : segments.length === 0 ? (
              <div className="text-xs text-muted-foreground py-4 border border-dashed border-border rounded-2xl text-center">
                Nenhum trecho de voo confirmado ativo para esta viagem.
              </div>
            ) : (
              <div className="space-y-4 divide-y divide-border/40">
                {segments.map((seg, idx) => (
                  <div key={seg.id} className={cn("space-y-2", idx > 0 && "pt-4")}>
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold flex items-center gap-1.5">
                        <Plane className="h-3.5 w-3.5 text-brand" />
                        <span>
                          {seg.origin_iata} → {seg.destination_iata}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] bg-brand/10 text-brand px-2 py-0.5 rounded font-bold">
                        {seg.airline_code} {seg.flight_number}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://..."
                        value={overrideUrls[seg.id] ?? ""}
                        onChange={(e) =>
                          setOverrideUrls({ ...overrideUrls, [seg.id]: e.target.value })
                        }
                        className="flex-1 text-xs border border-border rounded-2xl px-2.5 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-brand font-medium text-foreground"
                      />
                      <button
                        onClick={() =>
                          saveCheckinLinkMut.mutate({
                            segmentId: seg.id,
                            provider: seg.airline_code,
                            rawUrl: overrideUrls[seg.id] ?? "",
                          })
                        }
                        disabled={saveCheckinLinkMut.isPending}
                        className="bg-brand text-brand-foreground hover:bg-brand/90 px-3 py-2 rounded-2xl text-xs font-bold transition-all disabled:opacity-50"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Panel: Boarding events timeline */}
          <div className="bg-surface rounded-[24px] border border-border p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
              <FileText className="h-4 w-4 text-brand" />
              <span>Eventos & Ocorrências de Embarque</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Linha do tempo de interações dos clientes no portal móvel e reportes de emergência.
            </p>

            {isLoadingEvents ? (
              <div className="text-xs text-muted-foreground animate-pulse py-4">
                Carregando timeline...
              </div>
            ) : boardingEvents.length === 0 ? (
              <div className="text-xs text-muted-foreground py-8 border border-dashed border-border rounded-2xl text-center">
                Nenhum evento registrado até o momento.
              </div>
            ) : (
              <div className="relative pl-4 border-l border-border/80 space-y-5">
                {boardingEvents.map((evt) => {
                  const p = passengers.find((p) => p.id === evt.traveler_id);
                  const travelerName = p ? p.full_name : "Passageiro";

                  const seg = segments.find((s) => s.id === evt.flight_segment_id);
                  const segmentDesc = seg
                    ? `${seg.airline_code} ${seg.flight_number} (${seg.origin_iata} → ${seg.destination_iata})`
                    : "";

                  let text = "";
                  let icon = <Clock className="h-3 w-3 text-muted-foreground" />;
                  let iconBg = "bg-surface-alt border-border";

                  if (evt.event_type === "checkin_link_clicked") {
                    text = `Check-in iniciado por ${travelerName}${segmentDesc ? ` para o voo ${segmentDesc}` : ""}.`;
                    icon = (
                      <ExternalLink className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    );
                    iconBg = "bg-emerald-500/10 border-emerald-500/20";
                  } else if (evt.event_type === "reaccommodation_accepted") {
                    text = `${travelerName} aceitou sugestão de reacomodação.`;
                    icon = (
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    );
                    iconBg = "bg-emerald-500/10 border-emerald-500/20";
                  } else if (evt.event_type === "flight_issue") {
                    const metadata = evt.metadata as any;
                    const issueType =
                      metadata?.issue_type === "delayed" ? "atraso" : "cancelamento";
                    const comment = metadata?.description
                      ? ` - Obs: "${metadata.description}"`
                      : "";
                    text = `EMERGÊNCIA: Voo reportado como ${issueType} por ${travelerName}${comment}.`;
                    icon = <AlertTriangle className="h-3 w-3 text-rose-600 dark:text-rose-400" />;
                    iconBg = "bg-rose-500/10 border-rose-500/20";
                  } else {
                    text = `Evento registrado (${evt.event_type}) por ${travelerName}.`;
                  }

                  return (
                    <div key={evt.id} className="relative space-y-1">
                      {/* Timeline dot */}
                      <span
                        className={cn(
                          "absolute -left-[24px] top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border text-xs shadow-sm",
                          iconBg,
                        )}
                      >
                        {icon}
                      </span>

                      <p className="text-xs font-medium text-foreground leading-normal">{text}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(evt.occurred_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
