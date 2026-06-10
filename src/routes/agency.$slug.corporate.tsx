import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Briefcase, Building2, Send, CheckCircle, XCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { toast } from "sonner";
import { PrimaryButton, StatusBadge, fmtDate, GhostButton } from "@/components/ui/form";
import { NewCorporateRfpWizard } from "@/components/corporate/NewCorporateRfpWizard";

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

const STATUS_MAP: Record<string, { label: string, tone: any }> = {
  pending: { label: "Pendente", tone: "neutral" },
  quoting: { label: "Em cotação", tone: "warning" },
  sent_for_approval: { label: "Aguardando Aprovação", tone: "primary" },
  approved: { label: "Aprovado", tone: "success" },
  rejected: { label: "Recusado", tone: "danger" },
};

function CorporatePage() {
  const { agency } = useAgency();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [newOpen, setNewOpen] = useState(false);
  const [q, setQ] = useState("");

  const rfpsQ = useQuery({
    enabled: !!agency,
    queryKey: ["corporate-rfps", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("corporate_rfps")
        .select("*, client:clients(full_name)")
        .eq("agency_id", agency!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RFP[];
    },
  });

  const rfps = (rfpsQ.data || []).filter(r => 
    r.title.toLowerCase().includes(q.toLowerCase()) || 
    r.client?.full_name?.toLowerCase().includes(q.toLowerCase())
  );

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { error } = await supabase.from("corporate_rfps").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["corporate-rfps", agency?.id] });
    },
    onError: (e) => toast.error(e.message),
  });

  const sendForApproval = async (rfp: RFP) => {
    // Simulando o envio de e-mail alterando o status
    updateStatus.mutate({ id: rfp.id, status: "sent_for_approval" });
    toast.success(`E-mail com link de aprovação (Token: ${rfp.approval_token}) simulado.`);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <PageHeader
        title="Corporate B2B"
        description="Gestão de RFPs (Request for Proposal) e solicitações corporativas."
        actions={
          <PrimaryButton className="gap-1.5" onClick={() => setNewOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Nova RFP
          </PrimaryButton>
        }
      />

      <div className="mt-6 mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pl-9 h-10 bg-surface border border-border rounded-lg text-sm"
            placeholder="Buscar RFP ou empresa..."
          />
        </div>
      </div>

      {!rfpsQ.isLoading && rfps.length === 0 && (
        <EmptyState
          title="Nenhuma requisição corporativa"
          description="Inicie um processo de RFP corporativa vinculando uma empresa."
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rfps.map((rfp) => (
          <div key={rfp.id} className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-3 hover:border-brand/50 transition-colors">
            <div onClick={() => navigate({ to: "/agency/$slug/corporate/$rfp_id", params: { slug: agency!.slug, rfp_id: rfp.id } })} className="flex justify-between items-start group cursor-pointer">
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-brand transition-colors">{rfp.title}</h3>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {rfp.client?.full_name}
                </div>
              </div>
              <StatusBadge tone={STATUS_MAP[rfp.status]?.tone || "neutral"}>
                {STATUS_MAP[rfp.status]?.label || rfp.status}
              </StatusBadge>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-2 p-3 bg-surface-alt rounded-lg text-xs">
              <div>
                <div className="text-muted-foreground mb-0.5">Solicitante</div>
                <div className="font-medium truncate" title={rfp.requester_email}>{rfp.requester_name}</div>
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
                  {rfp.budget ? rfp.budget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Em aberto'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-auto pt-2 border-t border-border/50">
              {rfp.status === 'pending' && (
                <GhostButton className="text-xs h-8 flex-1" onClick={() => updateStatus.mutate({ id: rfp.id, status: "quoting" })}>
                  Iniciar Cotação
                </GhostButton>
              )}
              {rfp.status === 'quoting' && (
                <GhostButton className="text-xs h-8 flex-1 text-primary hover:text-primary" onClick={() => sendForApproval(rfp)}>
                  <Send className="h-3 w-3 mr-1" /> Enviar p/ Aprovação
                </GhostButton>
              )}
              <div className="w-full text-center">
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
    </div>
  );
}
