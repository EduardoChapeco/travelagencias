import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAgency } from "@/lib/agency-context";
import { supabase } from "@/integrations/supabase/client";
import { Search, AlertTriangle, Clock, CheckCircle2, Ticket, User, Star, Plus, AlertCircle } from "lucide-react";
import { Input, Select, StatusBadge, PrimaryButton } from "@/components/ui/form";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HeaderPortal } from "@/components/shell/HeaderPortal";
import { ModuleToolbar, ModuleActionButton } from "@/components/shell/ModuleToolbar";
import { EmptyState } from "@/components/shell/PageHeader";
import { NewTicketSheet } from "@/components/support/NewTicketSheet";

export const Route = createFileRoute("/agency/$slug/support")({
  head: ({ context }: any) => ({ meta: [{ title: `Central de Suporte · ${context?.brand?.platform_name || 'Turis'}` }] }),
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

  const { data: tickets, isLoading, isError, error } = useQuery({
    queryKey: ["support_tickets_advanced", agency?.id],
    enabled: !!agency,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select(
          `
          *,
          client:clients(full_name, email),
          assignee:profiles(id, full_name, avatar_url)
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
    <div className="flex flex-col h-full overflow-hidden">
      <HeaderPortal>
        <ModuleToolbar
          title="Suporte"
          search={{
            value: searchTerm,
            onChange: setSearchTerm,
            placeholder: "Buscar por código, assunto ou cliente...",
          }}
          filters={[
            { label: "Todos", value: "all" },
            { label: "Novo", value: "new" },
            { label: "Aberto", value: "open" },
            { label: "Ag. Fornecedor", value: "pending_supplier" },
            { label: "Ag. Cliente", value: "pending_client" },
            { label: "Resolvido", value: "resolved" },
            { label: "Fechado", value: "closed" },
          ]}
          activeFilter={stageFilter}
          onFilterChange={setStageFilter}
        />
      </HeaderPortal>

      <ModuleActionButton
        label="Novo Ticket"
        icon={<Plus className="h-3.5 w-3.5" />}
        onClick={() => setTicketSheetOpen(true)}
      />

      <div className="flex-1 overflow-hidden px-4  md:pr-6 py-4 flex flex-col min-h-0 space-y-4 pb-24">
        {isError && (
          <div className="flex flex-col items-center justify-center py-10 px-6 text-center rounded-[var(--radius-card)] border border-red-200 bg-red-50/60 shrink-0">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center mb-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="text-sm font-bold text-red-800">Falha ao Carregar Tickets</h3>
            <p className="text-xs text-red-600 mt-1 max-w-sm">
              {error instanceof Error ? error.message : "Erro desconhecido ao buscar tickets."}
            </p>
          </div>
        )}
        {/* KPI Dashboards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
          <div className="bg-surface-alt/50 border border-border rounded-[var(--radius-card)] p-4 flex items-center gap-4">
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
          <div className="bg-surface-alt/50 border border-border rounded-[var(--radius-card)] p-4 flex items-center gap-4">
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
          <div className="bg-surface-alt/50 border border-border rounded-[var(--radius-card)] p-4 flex items-center gap-4">
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
          <div className="bg-surface-alt/50 border border-border rounded-[var(--radius-card)] p-4 flex items-center gap-4">
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

        <div className="bg-surface border border-border rounded-[var(--radius-card)] flex-1 overflow-hidden flex flex-col">
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
                        {t.assignee?.full_name || "Não atribuído"}
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

      <NewTicketSheet isOpen={ticketSheetOpen} onClose={() => setTicketSheetOpen(false)} />
    </div>
  );
}
