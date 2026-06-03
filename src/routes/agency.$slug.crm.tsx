import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader } from "@/components/shell/PageHeader";
import { toast } from "sonner";

export const Route = createFileRoute("/agency/$slug/crm")({
  head: () => ({ meta: [{ title: "CRM · TravelOS" }] }),
  component: CRMPage,
});

type Stage = {
  id: string;
  name: string;
  position: number;
  color: string;
  is_won: boolean;
  is_lost: boolean;
};
type Lead = {
  id: string;
  stage_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  destination: string | null;
  estimated_value: number;
  pax_count: number;
  position: number;
  created_at: string;
};

function CRMPage() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/crm" });
  const qc = useQueryClient();
  const [newOpen, setNewOpen] = useState(false);

  const stagesQ = useQuery({
    enabled: !!agency,
    queryKey: ["stages", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_stages")
        .select("*")
        .eq("agency_id", agency!.id)
        .order("position");
      if (error) throw error;
      return data as Stage[];
    },
  });

  const leadsQ = useQuery({
    enabled: !!agency,
    queryKey: ["leads", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, stage_id, name, email, phone, destination, estimated_value, pax_count, position, created_at")
        .eq("agency_id", agency!.id)
        .order("position");
      if (error) throw error;
      return data as Lead[];
    },
  });

  const moveStage = useMutation({
    mutationFn: async ({ leadId, stageId }: { leadId: string; stageId: string }) => {
      const { error } = await supabase
        .from("leads")
        .update({ stage_id: stageId })
        .eq("id", leadId);
      if (error) throw error;
      await supabase.from("lead_activities").insert({
        lead_id: leadId,
        agency_id: agency!.id,
        author_id: (await supabase.auth.getUser()).data.user?.id ?? null,
        type: "stage_change",
        content: "Estágio alterado",
        metadata: { stage_id: stageId },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads", agency?.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao mover"),
  });

  return (
    <>
      <PageHeader
        title="CRM"
        description="Gerencie seus leads no Kanban."
        actions={
          <button
            onClick={() => setNewOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Novo lead
          </button>
        }
      />

      {(stagesQ.isLoading || leadsQ.isLoading) && (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      )}

      {stagesQ.data && leadsQ.data && (
        <div className="-mx-6 overflow-x-auto px-6">
          <div className="flex min-w-max gap-3 pb-4">
            {stagesQ.data.map((stage) => {
              const stageLeads = leadsQ.data!.filter((l) => l.stage_id === stage.id);
              return (
                <div
                  key={stage.id}
                  className="w-72 shrink-0 rounded-lg border border-border bg-surface-alt/40"
                >
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: stage.color }}
                      />
                      <span className="text-xs font-semibold uppercase tracking-wide">
                        {stage.name}
                      </span>
                      <span className="rounded bg-surface px-1.5 text-[10px] font-medium text-muted-foreground">
                        {stageLeads.length}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 px-2 pb-2">
                    {stageLeads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        stages={stagesQ.data!}
                        onMove={(stageId) =>
                          moveStage.mutate({ leadId: lead.id, stageId })
                        }
                      />
                    ))}
                    {stageLeads.length === 0 && (
                      <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                        Vazio
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {newOpen && agency && (
        <NewLeadSheet
          agencyId={agency.id}
          stages={stagesQ.data ?? []}
          onClose={() => setNewOpen(false)}
          onCreated={() => {
            setNewOpen(false);
            qc.invalidateQueries({ queryKey: ["leads", agency.id] });
          }}
        />
      )}
    </>
  );
}

function LeadCard({
  lead,
  stages,
  onMove,
}: {
  lead: Lead;
  stages: Stage[];
  onMove: (stageId: string) => void;
}) {
  return (
    <div className="group rounded-md border border-border bg-surface p-3 transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{lead.name}</div>
          {lead.destination && (
            <div className="mt-0.5 truncate text-xs text-muted-foreground">
              {lead.destination} · {lead.pax_count} pax
            </div>
          )}
        </div>
        {lead.estimated_value > 0 && (
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
            R${Math.round(lead.estimated_value).toLocaleString("pt-BR")}
          </span>
        )}
      </div>
      <select
        value={lead.stage_id}
        onChange={(e) => onMove(e.target.value)}
        className="mt-2 w-full rounded border border-border bg-surface px-2 py-1 text-[11px] text-muted-foreground outline-none focus:border-border-strong"
      >
        {stages.map((s) => (
          <option key={s.id} value={s.id}>
            Mover para: {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function NewLeadSheet({
  agencyId,
  stages,
  onClose,
  onCreated,
}: {
  agencyId: string;
  stages: Stage[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const firstStage = stages[0];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [destination, setDestination] = useState("");
  const [paxCount, setPaxCount] = useState(2);
  const [estValue, setEstValue] = useState(0);
  const [source, setSource] = useState("");
  const [stageId, setStageId] = useState(firstStage?.id ?? "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (firstStage && !stageId) setStageId(firstStage.id);
  }, [firstStage, stageId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stageId) return;
    setSubmitting(true);
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from("leads").insert({
      agency_id: agencyId,
      stage_id: stageId,
      owner_id: user?.id,
      name,
      email: email || null,
      phone: phone || null,
      destination: destination || null,
      pax_count: paxCount,
      estimated_value: estValue,
      source: source || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Lead criado");
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold tracking-tight">Novo lead</h2>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <L label="Nome *">
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </L>
          <L label="Email">
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </L>
          <L label="Telefone / WhatsApp">
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </L>
          <L label="Destino">
            <input className="input" value={destination} onChange={(e) => setDestination(e.target.value)} />
          </L>
          <div className="grid grid-cols-2 gap-3">
            <L label="Pax">
              <input
                type="number"
                min={1}
                className="input"
                value={paxCount}
                onChange={(e) => setPaxCount(parseInt(e.target.value) || 1)}
              />
            </L>
            <L label="Valor estimado (R$)">
              <input
                type="number"
                min={0}
                step="0.01"
                className="input"
                value={estValue}
                onChange={(e) => setEstValue(parseFloat(e.target.value) || 0)}
              />
            </L>
          </div>
          <L label="Origem">
            <input
              className="input"
              placeholder="instagram, whatsapp, site, indicação…"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </L>
          <L label="Estágio inicial">
            <select className="input" value={stageId} onChange={(e) => setStageId(e.target.value)}>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </L>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-md border border-border px-3 text-sm font-medium hover:bg-surface-alt"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {submitting ? "Criando…" : "Criar lead"}
            </button>
          </div>
        </form>
        <style>{`
          .input { width:100%; height:38px; padding:0 10px; border-radius:0.5rem; border:1px solid var(--color-border); background:var(--color-surface); font-size:0.875rem; outline:none; }
          .input:focus { border-color: var(--color-border-strong); }
        `}</style>
      </div>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
