import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Briefcase, Building2, Send, CheckCircle, XCircle, Search, Filter, Settings2, ChevronDown, } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { EmptyState } from "@/components/shell/PageHeader";
import { toast } from "sonner";
import { PageHeader, ModuleActionButton } from "@/components/shell/PageHeader";
import { ModuleAdminPanel } from "@/components/shell/ModuleAdminPanel";
import { NativeSelect as Select } from "@/components/ui/select";
import { FormInput as Input } from "@/components/ui/input";
import { PrimaryButton, GhostButton , Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/formatters";
import { NewCorporateRfpWizard } from "@/components/corporate/NewCorporateRfpWizard";
import { useDebounce } from "@/hooks/use-debounce";

export const Route = createFileRoute("/agency/$slug/corporate")({
  head: ({ context }: any) => ({ meta: [{ title: `Corporate B2B · ${context?.brand?.platform_name || 'Turis'}` }] }),
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
    <div className="flex h-full flex-col overflow-hidden">
              <PageHeader
          title="Corporativo B2B"
          search={{
            value: q,
            onChange: (v) => {
              setQ(v);
              setPage(1);
            },
            placeholder: "Buscar RFP..."
          }}
          actions={
            <div className="flex items-center gap-1">
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="h-7 text-[11px] font-semibold hover:bg-white/5 rounded-full text-white/70 hover:text-white px-2.5 cursor-pointer"
              >
                <option value="all" className="bg-neutral-900 text-white">Todos os Status</option>
                <option value="pending" className="bg-neutral-900 text-white">Pendente</option>
                <option value="quoting" className="bg-neutral-900 text-white">Em Cotação</option>
                <option value="sent_for_approval" className="bg-neutral-900 text-white">Aguardando</option>
                <option value="approved" className="bg-neutral-900 text-white">Aprovado</option>
                <option value="rejected" className="bg-neutral-900 text-white">Recusado</option>
              </Select>

              {isAgencyAdmin && (
                <Button
                  type="button"
                  onClick={() => setAdminPanelOpen(true)}
                  className="h-7 w-7 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Administrar Corporativo"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          }
          primaryAction={
            <ModuleActionButton
        label="Nova RFP"
        icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setNewOpen(true)}
            />
          }
        />

      <div className="flex-1 overflow-y-auto px-4  md:pr-6 py-4 min-h-0 flex flex-col gap-4 pb-24">
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
              className="rounded-full border-none glass-card border-none p-5 flex flex-col gap-3 hover:border-brand/50 transition-colors"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 p-3 glass bg-white/5 border-white/10 rounded-[var(--radius-card)] text-xs">
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
                className="h-9 px-4 text-xs font-semibold rounded-full border-none"
              >
                Anterior
              </GhostButton>
              <GhostButton
                disabled={page * pageSize >= (rfpsQ.data?.count ?? 0)}
                onClick={() => setPage((p) => p + 1)}
                className="h-9 px-4 text-xs font-semibold rounded-full border-none"
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
