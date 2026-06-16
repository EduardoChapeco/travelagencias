import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAgency } from "@/lib/agency-context";
import { supabase } from "@/integrations/supabase/client";
import { Search, AlertTriangle, Clock, CheckCircle2, Ticket, User, Star } from "lucide-react";
import { Input, Select, StatusBadge, PrimaryButton } from "@/components/ui/form";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HeaderPortal } from "@/components/shell/HeaderPortal";
import { EmptyState } from "@/components/shell/PageHeader";
import { NewTicketSheet } from "@/components/support/NewTicketSheet";

export const Route = createFileRoute("/agency/$slug/support")({
  head: () => ({ meta: [{ title: "Central de Suporte · TravelOS" }] }),
  component: SupportRoute,
});

const STAGE_LABELS: Record<string, string> = {
  new: "Novo",
  open: "Aberto",
  pending_supplier: "Aguardando Fornecedor",
  pending_client: "Aguardando Cliente",
  resolved: "Resolvido",
  closed: "Fechado",
};

function SupportRoute() {
  const { agency } = useAgency();
  const navigate = useNavigate({ from: "/agency/$slug/support" });
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [ticketSheetOpen, setTicketSheetOpen] = useState(false);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["support_tickets_advanced", agency?.id],
    enabled: !!agency,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select(
          `
          *,
          client:clients(full_name, email),
          assignee:agency_members(users(raw_user_meta_data))
        `,
        )
        .eq("agency_id", agency!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  if (!agency) return null;

  const filteredTickets = (tickets || []).filter((t: any) => {
    const matchesSearch =
      t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.client?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = stageFilter === "all" || (t.stage || t.status) === stageFilter;
    const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
    return matchesSearch && matchesStage && matchesPriority;
  });

  const kpiNew = tickets?.filter((t: any) => (t.stage || t.status) === "new").length || 0;
  const kpiOpen =
    tickets?.filter((t: any) =>
      ["open", "pending_supplier", "pending_client"].includes(t.stage || t.status),
    ).length || 0;
  const kpiResolved =
    tickets?.filter((t: any) => ["resolved", "closed"].includes(t.stage || t.status)).length || 0;

  const csatTickets = tickets?.filter((t: any) => t.csat_score) || [];
  const avgCsat =
    csatTickets.length > 0
      ? csatTickets.reduce((acc: number, t: any) => acc + t.csat_score, 0) / csatTickets.length
      : 0;

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] bg-background overflow-hidden">
      <HeaderPortal>
        <div className="flex items-center gap-2">
          <PrimaryButton
            className="h-8 text-[11px] font-bold rounded-lg cursor-pointer"
            onClick={() => setTicketSheetOpen(true)}
          >
            Novo Ticket Interno
          </PrimaryButton>
        </div>
      </HeaderPortal>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center border-b border-border bg-surface/50 p-2 shrink-0">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, assunto ou cliente..."
            className="pl-8 h-8 text-xs w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="w-full sm:w-40 shrink-0">
            <Select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="h-8 text-xs w-full"
            >
              <option value="all">Todos os Estágios</option>
              {Object.entries(STAGE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-full sm:w-36 shrink-0">
            <Select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-8 text-xs w-full"
            >
              <option value="all">Todas Prioridades</option>
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 flex flex-col space-y-4">
        {/* KPI Dashboards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
          <div className="bg-surface-alt/50 border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{kpiNew}</p>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                Novos / Sem Triagem
              </p>
            </div>
          </div>
          <div className="bg-surface-alt/50 border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-warning/10 text-warning flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{kpiOpen}</p>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                Em Andamento
              </p>
            </div>
          </div>
          <div className="bg-surface-alt/50 border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-success/10 text-success flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{kpiResolved}</p>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                Resolvidos
              </p>
            </div>
          </div>
          <div className="bg-surface-alt/50 border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {avgCsat === 0 ? "0.0" : avgCsat.toFixed(1)}{" "}
                <span className="text-sm font-normal text-muted-foreground">/ 5</span>
              </p>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                CSAT Médio
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl flex-1 overflow-hidden flex flex-col shadow-sm">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-surface-alt/50 sticky top-0 z-10 border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-semibold">Código</th>
                  <th className="px-4 py-3 font-semibold">Assunto / Cliente</th>
                  <th className="px-4 py-3 font-semibold">Estágio</th>
                  <th className="px-4 py-3 font-semibold">Prioridade</th>
                  <th className="px-4 py-3 font-semibold">Responsável</th>
                  <th className="px-4 py-3 font-semibold">Aberto em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-muted-foreground">
                      Carregando tickets...
                    </td>
                  </tr>
                )}
                {!isLoading && filteredTickets.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10">
                      <EmptyState
                        title="Nenhum ticket encontrado"
                        description="Nenhum ticket atende aos filtros atuais."
                      />
                    </td>
                  </tr>
                )}
                {filteredTickets.map((t: any) => (
                  <tr
                    key={t.id}
                    className="hover:bg-surface-alt/30 cursor-pointer transition-colors"
                    onClick={() =>
                      navigate({
                        to: "/agency/$slug/support/$ticket_id",
                        params: { slug: agency.slug, ticket_id: t.id },
                      })
                    }
                  >
                    <td className="px-4 py-4 font-mono text-xs font-semibold text-muted-foreground">
                      #{t.code || t.id.substring(0, 8)}
                    </td>
                    <td className="px-4 py-4">
                      <p
                        className="font-semibold text-foreground truncate max-w-xs"
                        title={t.title}
                      >
                        {t.title}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3" /> {t.client?.full_name || "Anônimo"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge
                        tone={
                          ["resolved", "closed"].includes(t.stage || t.status)
                            ? "success"
                            : (t.stage || t.status) === "new"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {STAGE_LABELS[t.stage || t.status] || t.stage || t.status}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge
                        tone={
                          t.priority === "urgent"
                            ? "danger"
                            : t.priority === "high"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {t.priority}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-medium text-muted-foreground">
                        {(t.assignee?.users as any)?.raw_user_meta_data?.name || "Não atribuído"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-muted-foreground">
                      {format(new Date(t.created_at), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <NewTicketSheet
        isOpen={ticketSheetOpen}
        onClose={() => setTicketSheetOpen(false)}
      />
    </div>
  );
}
