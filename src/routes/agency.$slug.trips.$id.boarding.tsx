import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { StatusBadge, fmtDate } from "@/components/ui/form";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { updateBoardingCardChecklist } from "@/services/boarding";

export const Route = createFileRoute("/agency/$slug/trips/$id/boarding")({
  head: () => ({ meta: [{ title: "Check-in & Embarque · TravelOS" }] }),
  component: TripBoardingPage,
});

const STAGE_CONFIG: Record<string, { label: string; tone: "neutral" | "warning" | "info" | "success" }> = {
  pending: { label: "Pendente", tone: "neutral" },
  action_needed: { label: "Atenção (Docs/Vistos)", tone: "warning" },
  checked_in: { label: "Check-in Emitido", tone: "info" },
  completed: { label: "Embarcado", tone: "success" },
};

function TripBoardingPage() {
  const { id } = useParams({ from: "/agency/$slug/trips/$id/boarding" });
  const { agency } = useAgency();
  const qc = useQueryClient();

  // Fetch boarding cards specifically for this trip
  const { data: cards = [], isLoading } = useQuery({
    enabled: !!agency,
    queryKey: ["trip-boarding-cards-status", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boarding_cards")
        .select(`
          id, pnr, airline, status, departure_date, passengers_count, checklist,
          departure_airport, arrival_airport, flight_number, flight_date, flight_class,
          notes, briefing_date, briefing_url, alerts
        `)
        .eq("trip_id", id)
        .order("departure_date", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((c: any) => ({
        ...c,
        checklist: c.checklist ?? [],
      }));
    },
  });

  const toggleItemMut = useMutation({
    mutationFn: async ({ cardId, index, done }: { cardId: string; index: number; done: boolean }) => {
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

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header informativo */}
      <div className="rounded-xl border border-border bg-surface p-4 flex items-start gap-3">
        <Navigation className="h-4 w-4 text-brand mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-foreground">Check-in & Status de Embarque</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Monitore a emissão de bilhetes, realização de check-ins de passageiros e status de embarque em tempo real para os trechos desta viagem.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="text-sm text-muted-foreground animate-pulse py-8 text-center">
          Carregando status de embarque…
        </div>
      )}

      {!isLoading && cards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-2xl text-center">
          <Navigation className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">Nenhum controle de embarque para esta viagem</p>
          <p className="text-xs text-muted-foreground mt-1">
            Os cartões de embarque são gerados automaticamente na conversão ou criados pelo painel global.
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
                className="rounded-xl border border-border bg-surface overflow-hidden"
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
                    {/* Status Select */}
                    <select
                      value={card.status}
                      onChange={(e) => updateStatusMut.mutate({ cardId: card.id, status: e.target.value })}
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
                      <p className="text-xs text-muted-foreground italic">Nenhuma tarefa definida no checklist.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {card.checklist.map((item: any, idx: number) => {
                          const isPending = toggleItemMut.isPending && toggleItemMut.variables?.cardId === card.id && toggleItemMut.variables?.index === idx;
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
                                "flex items-center gap-2.5 p-2 rounded-lg border text-left transition-colors text-xs cursor-pointer",
                                item.done
                                  ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-950 dark:text-emerald-300"
                                  : "bg-surface border-border hover:bg-surface-alt text-foreground"
                              )}
                            >
                              {item.done ? (
                                <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                              ) : (
                                <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                              <span className={cn("truncate", item.done && "line-through opacity-70")}>
                                {item.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Alertas operacionais */}
                    {card.alerts && card.alerts.length > 0 && (
                      <div className="mt-3 p-2.5 rounded-lg border border-warning/30 bg-warning/5 space-y-1">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-warning-foreground flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Atenção & Alertas
                        </p>
                        {card.alerts.map((alert: string, idx: number) => (
                          <p key={idx} className="text-xs text-warning-foreground pl-4 relative">
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
    </div>
  );
}
