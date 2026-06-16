import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAgency } from "@/lib/agency-context";
import { supabase } from "@/integrations/supabase/client";
import { Search, AlertTriangle, Clock, CheckCircle2, Ticket, User, Star } from "lucide-react";
import { Input, Select, StatusBadge, PrimaryButton } from "@/components/ui/form";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
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
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-background overflow-hidden">
      <PageHeader
        title="Central de Atendimento"
        description="Gestão de chamados, SLAs e comunicação corporativa/B2B."
        actions={
          <PrimaryButton
            className="h-9 text-xs"
            onClick={() => setTicketSheetOpen(true)}
          >
            Novo Ticket Interno
          </PrimaryButton>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 flex flex-col space-y-6">
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

        {/* Filters & List */}
        <div className="flex flex-col space-y-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, assunto ou cliente..."
                className="pl-9 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="w-48 h-9 text-sm"
            >
              <option value="all">Todos os Estágios</option>
              {Object.entries(STAGE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            <Select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-48 h-9 text-sm"
            >
              <option value="all">Todas Prioridades</option>
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </Select>
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
