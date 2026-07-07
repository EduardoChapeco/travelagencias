import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { Clock, User, Activity, FileText, Settings, Shield } from "lucide-react";
import { fmtDate } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/trips/$id/history")({
  head: ({ context }: any) => ({ meta: [{ title: `Histórico · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: TripHistoryPage,
});

interface UnifiedLog {
  id: string;
  date: string;
  actorName: string;
  action: string;
  details: string;
  source: "audit" | "boarding";
}

function TripHistoryPage() {
  const { id } = useParams({ from: "/agency/$slug/trips/$id/history" });
  const { agency } = useAgency();

  // 1. Fetch profiles to resolve names
  const { data: profiles = [] } = useQuery({
    enabled: !!agency,
    queryKey: ["agency-profiles", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const profileMap = new Map(profiles.map((p) => [p.id, p.full_name]));

  // 2. Fetch audit logs for this trip
  const auditLogsQ = useQuery({
    enabled: !!agency,
    queryKey: ["trip-audit-logs", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("id, created_at, action, actor_id, actor_type, entity_id, entity_type, metadata")
        .eq("entity_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // 3. Fetch boarding cards to resolve card activities
  const boardingCardsQ = useQuery({
    enabled: !!agency,
    queryKey: ["trip-boarding-cards-for-history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boarding_cards")
        .select("id, airline, flight_number, hotel_name")
        .eq("trip_id", id);
      if (error) throw error;
      return data ?? [];
    },
  });

  // 4. Fetch boarding card activities
  const cardIds = (boardingCardsQ.data ?? []).map((c) => c.id);
  const boardingActivitiesQ = useQuery({
    enabled: !!agency && cardIds.length > 0,
    queryKey: ["trip-boarding-activities", cardIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boarding_card_activities")
        .select("id, card_id, created_at, action, description, user_id")
        .in("card_id", cardIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const isLoading =
    auditLogsQ.isLoading || boardingCardsQ.isLoading || boardingActivitiesQ.isLoading;

  // Combine and sort logs
  const combinedLogs: UnifiedLog[] = [];

  // Add audit logs
  (auditLogsQ.data ?? []).forEach((log) => {
    const actorName = log.actor_id
      ? profileMap.get(log.actor_id) || `Agente (${log.actor_id.substring(0, 5)})`
      : "Sistema";

    // Parse details from metadata if available
    let details = "";
    if (log.metadata && typeof log.metadata === "object") {
      const meta = log.metadata as Record<string, any>;
      details = meta.details || meta.description || meta.notes || "";
    }

    combinedLogs.push({
      id: `audit-${log.id}`,
      date: log.created_at,
      actorName,
      action: log.action,
      details: details || `Operação realizada em ${log.entity_type}`,
      source: "audit",
    });
  });

  // Add boarding card activities
  (boardingActivitiesQ.data ?? []).forEach((act) => {
    const actorName = act.user_id
      ? profileMap.get(act.user_id) || `Agente (${act.user_id.substring(0, 5)})`
      : "Sistema";
    const card = (boardingCardsQ.data ?? []).find((c) => c.id === act.card_id);
    const context = card
      ? ` [Voo: ${card.airline || ""} ${card.flight_number || card.hotel_name || ""}]`
      : "";

    combinedLogs.push({
      id: `boarding-${act.id}`,
      date: act.created_at,
      actorName,
      action: act.action,
      details: `${act.description}${context}`,
      source: "boarding",
    });
  });

  // Sort chronologically descending
  combinedLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 flex items-start gap-3">
        <Clock className="h-4 w-4 text-brand mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-foreground">Histórico de Alterações</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Visualize o log de auditoria em tempo real para ações executadas nesta viagem, incluindo
            alterações operacionais e de embarque.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="text-sm text-muted-foreground animate-pulse py-8 text-center">
          Carregando histórico…
        </div>
      )}

      {/* Timeline */}
      {!isLoading && combinedLogs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-2xl text-center max-w-3xl">
          <Clock className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">
            Nenhuma atividade registrada
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            As alterações realizadas nas abas operacionais aparecerão listadas aqui automaticamente.
          </p>
        </div>
      )}

      {!isLoading && combinedLogs.length > 0 && (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 max-w-3xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-brand" /> Linha do Tempo da Viagem (
            {combinedLogs.length} logs)
          </h3>

          <div className="relative border-l border-border pl-4 ml-2 space-y-6">
            {combinedLogs.map((log) => (
              <div key={log.id} className="relative">
                {/* Timeline Bullet */}
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border border-surface bg-brand flex items-center justify-center" />

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-foreground">{log.action}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground font-mono text-[10px]">
                      {new Date(log.date).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{log.details}</p>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-0.5">
                    <User className="h-3 w-3" />
                    <span>Por {log.actorName}</span>
                    <span className="text-muted-foreground/60">·</span>
                    <span className="text-[9px] uppercase font-bold tracking-widest">
                      {log.source === "audit" ? "Sistema / Trip Log" : "Boarding Log"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
