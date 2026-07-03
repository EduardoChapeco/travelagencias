import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Briefcase,
  Building2,
  Send,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Settings2,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { EmptyState } from "@/components/shell/PageHeader";
import { toast } from "sonner";
import { HeaderPortal } from "@/components/shell/HeaderPortal";
import { ModuleAdminPanel } from "@/components/shell/ModuleAdminPanel";
import {
  PrimaryButton,
  StatusBadge,
  fmtDate,
  GhostButton,
  Select,
  Input,
} from "@/components/ui/form";
import { NewCorporateRfpWizard } from "@/components/corporate/NewCorporateRfpWizard";
import { useDebounce } from "@/hooks/use-debounce";

export const Route = createFileRoute("/agency/$slug/corporate")({
  head: () => ({ meta: [{ title: "Corporate B2B · TravelOS" }] }),
  component: CorporatePage,
});

type RFP = {
  id: string;
  client_id: string;
  title: string;
  requester_name: string;
  requester_email: string;
  destination: string;
  departure_date: string;
  budget: number | null;
  status: string;
  approval_token: string;
  created_at: string;
  client?: { full_name: string };
};

const STATUS_MAP: Record<string, { label: string; tone: any }> = {
  pending: { label: "Pendente", tone: "neutral" },
  quoting: { label: "Em cotação", tone: "warning" },
  sent_for_approval: { label: "Aguardando Aprovação", tone: "primary" },
  approved: { label: "Aprovado", tone: "success" },
  rejected: { label: "Recusado", tone: "danger" },
};

function CorporatePage() {
  const { agency, isAgencyAdmin } = useAgency();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const debouncedQ = useDebounce(q, 400);
  const pageSize = 20;

  const rfpsQ = useQuery({
    enabled: !!agency,
    queryKey: ["corporate-rfps", agency?.id, page, debouncedQ, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("corporate_rfps")
        .select("*, client:clients(full_name)", { count: "exact" })
        .eq("agency_id", agency!.id);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (debouncedQ.trim()) {
        query = query.ilike("title", `%${debouncedQ}%`);
      }

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;
      return { data: (data as unknown as RFP[]) || [], count: count ?? 0 };
    },
  });

  const rfps = rfpsQ.data?.data || [];

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any)
        .from("corporate_rfps")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["corporate-rfps", agency?.id] });
    },
    onError: (e) => toast.error(e.message),
  });

  const sendForApproval = async (rfp: RFP) => {
    updateStatus.mutate({ id: rfp.id, status: "sent_for_approval" });
    toast.success("E-mail com o link de aprovação enviado com sucesso!");
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <HeaderPortal>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNewOpen(true)}
            className="flex h-8 items-center justify-center gap-1.5 rounded-md bg-primary px-2 sm:px-3 text-xs font-semibold text-primary-foreground cursor-pointer"
            title="Nova RFP"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Nova RFP</span>
          </button>

          {isAgencyAdmin && (
            <button
              onClick={() => setAdminPanelOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-foreground hover:bg-surface-alt transition-colors cursor-pointer"
              title="Administrar Corporativo"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </HeaderPortal>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center border-b border-border bg-surface/50 px-4 md:px-6 py-3 shrink-0">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar RFP..."
            className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-xs outline-none focus:border-border-strong placeholder:text-muted-foreground"
          />
        </div>
        <div className="relative w-full sm:w-40">
          <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-8 w-full appearance-none rounded-md border border-border bg-surface pl-8 pr-8 text-xs outline-none focus:border-border-strong text-foreground text-[11px]"
          >
            <option value="all">Todos os Status</option>
            <option value="pending">Pendente</option>
            <option value="quoting">Em Cotação</option>
            <option value="sent_for_approval">Aguardando</option>
            <option value="approved">Aprovado</option>
            <option value="rejected">Recusado</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0 flex flex-col gap-4">
        {!rfpsQ.isLoading && rfps.length === 0 && (
          <EmptyState
            title="Nenhuma requisição corporativa"
            description="Inicie um processo de RFP corporativa vinculando uma empresa."
          />
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rfps.map((rfp) => (
            <div
              key={rfp.id}
              className="rounded-md border border-border bg-surface p-5 flex flex-col gap-3 hover:border-brand/50 transition-colors"
            >
              <div
                onClick={() =>
                  navigate({
                    to: "/agency/$slug/corporate/$rfp_id",
                    params: { slug: agency!.slug, rfp_id: rfp.id },
                  })
                }
                className="flex justify-between items-start group cursor-pointer"
              >
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-brand transition-colors">
                    {rfp.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {rfp.client?.full_name}
                  </div>
                </div>
                <StatusBadge tone={STATUS_MAP[rfp.status]?.tone || "neutral"}>
                  {STATUS_MAP[rfp.status]?.label || rfp.status}
                </StatusBadge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 p-3 bg-surface-alt rounded-lg text-xs">
                <div>
                  <div className="text-muted-foreground mb-0.5">Solicitante</div>
                  <div className="font-medium truncate" title={rfp.requester_email}>
                    {rfp.requester_name}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-0.5">Destino</div>
                  <div className="font-medium truncate">{rfp.destination}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-0.5">Partida</div>
                  <div className="font-medium">{fmtDate(rfp.departure_date)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-0.5">Orçamento Máx</div>
                  <div className="font-medium">
                    {rfp.budget
                      ? rfp.budget.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                      : "Em aberto"}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-auto pt-2 border-t border-border/50">
                {rfp.status === "pending" && (
                  <GhostButton
                    className="text-xs h-8 flex-1"
                    onClick={() => updateStatus.mutate({ id: rfp.id, status: "quoting" })}
                  >
                    Iniciar Cotação
                  </GhostButton>
                )}
                {rfp.status === "quoting" && (
                  <GhostButton
                    className="text-xs h-8 flex-1 text-primary hover:text-primary"
                    onClick={() => sendForApproval(rfp)}
                  >
                    <Send className="h-3 w-3 mr-1" /> Enviar p/ Aprovação
                  </GhostButton>
                )}
                <div className="w-full text-center mt-2">
                  <Link
                    to="/p/corporate/approve"
                    search={{ token: rfp.approval_token }}
                    target="_blank"
                    className="text-[10px] text-muted-foreground hover:underline"
                  >
                    Abrir link do cliente
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {rfps.length > 0 && (
          <div className="mt-8 flex items-center justify-between border-t border-border/40 pt-6">
            <div className="text-xs text-muted-foreground font-medium">
              Mostrando página <span className="font-bold text-foreground">{page}</span> de{" "}
              {Math.ceil((rfpsQ.data?.count ?? 0) / pageSize) || 1}
            </div>
            <div className="flex items-center gap-2">
              <GhostButton
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-9 px-4 text-xs font-semibold rounded-full border border-border"
              >
                Anterior
              </GhostButton>
              <GhostButton
                disabled={page * pageSize >= (rfpsQ.data?.count ?? 0)}
                onClick={() => setPage((p) => p + 1)}
                className="h-9 px-4 text-xs font-semibold rounded-full border border-border"
              >
                Próxima
              </GhostButton>
            </div>
          </div>
        )}
      </div>

      {newOpen && agency && (
        <NewCorporateRfpWizard
          agencyId={agency.id}
          onClose={() => setNewOpen(false)}
          onCreated={() => {
            setNewOpen(false);
            qc.invalidateQueries({ queryKey: ["corporate-rfps", agency.id] });
          }}
        />
      )}

      {adminPanelOpen && agency && (
        <ModuleAdminPanel
          isOpen={adminPanelOpen}
          onClose={() => setAdminPanelOpen(false)}
          moduleKey="corporate"
          moduleName="Corporativo"
          agencyId={agency.id}
        />
      )}
    </div>
  );
}
