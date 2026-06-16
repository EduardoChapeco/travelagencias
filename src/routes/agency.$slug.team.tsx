import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Copy, Percent, X, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import {
  fetchTeamMembers,
  fetchTeamInvites,
  inviteTeamMember,
  deleteTeamInvite,
  removeTeamMember,
  changeTeamMemberRole,
} from "@/services/settings";
import { useAgency } from "@/lib/agency-context";
import { EmptyState } from "@/components/shell/PageHeader";
import {
  Field,
  Input,
  Select,
  PrimaryButton,
  GhostButton,
  Sheet,
  StatusBadge,
  fmtDate,
} from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { useConfirm } from "@/hooks/use-confirm";

export const Route = createFileRoute("/agency/$slug/team")({
  head: () => ({ meta: [{ title: "Equipe · TravelOS" }] }),
  component: TeamPage,
});

type Member = {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};
type Invite = {
  id: string;
  email: string;
  role: string;
  token: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
};

function TeamPage() {
  const { agency } = useAgency();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Member | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();
  const [searchQuery, setSearchQuery] = useState("");

  const members = useQuery({
    enabled: !!agency,
    queryKey: ["team-members", agency?.id],
    queryFn: () => fetchTeamMembers(agency!.id),
  });

  const invites = useQuery({
    enabled: !!agency,
    queryKey: ["team-invites", agency?.id],
    queryFn: () => fetchTeamInvites(agency!.id),
  });

  const filteredMembers = (members.data ?? []).filter((m) => {
    const name = ((m as any).profile?.full_name ?? (m as any).full_name ?? "").toLowerCase();
    const email = (m as any).user_id.toLowerCase();
    return name.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
  });

  const filteredInvites = (invites.data ?? []).filter((i) => {
    return i.email.toLowerCase().includes(searchQuery.toLowerCase());
  });

  async function changeRole(userId: string, role: string) {
    if (!agency) return;
    try {
      await changeTeamMemberRole(agency.id, userId, role);
      toast.success("Papel atualizado");
      qc.invalidateQueries({ queryKey: ["team-members", agency.id] });
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  async function removeMember(userId: string) {
    if (!agency) return;
    confirm({
      title: "Remover Membro",
      description: "Deseja remover este membro da equipe?",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await removeTeamMember(agency.id, userId);
          toast.success("Removido");
          qc.invalidateQueries({ queryKey: ["team-members", agency.id] });
        } catch (error: any) {
          toast.error(error.message);
        }
      },
    });
  }

  async function deleteInviteById(id: string) {
    confirm({
      title: "Cancelar Convite",
      description: "Deseja cancelar este convite pendente?",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await deleteTeamInvite(id);
          qc.invalidateQueries({ queryKey: ["team-invites", agency?.id] });
        } catch (error: any) {
          toast.error(error.message);
        }
      },
    });
  }

  function copyInvite(token: string) {
    const url = `${window.location.origin}/m/invite/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  }

  return (
    <>
      {/* Unified Toolbar Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 p-4 bg-surface border border-border/80 rounded-xl shrink-0">
        <div className="relative flex-1 max-w-xs">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <svg
              className="h-4 w-4 text-muted-foreground/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-9 pr-4 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-brand/50 focus:ring-1 focus:ring-brand/50 outline-none transition-colors"
          />
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Convidar
        </button>
      </div>

      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Membros
      </h3>
      {filteredMembers.length === 0 ? (
        <EmptyState title="Sem membros" description="Nenhum membro encontrado ou cadastrado." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border mb-6">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt/40 text-left text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Papel</th>
                <th className="px-3 py-2">Comissão</th>
                <th className="px-3 py-2">Entrou</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m) => (
                <tr key={m.user_id} className="border-t border-border">
                  <td className="px-3 py-2.5 font-medium">
                    {(m as any).profile?.full_name ?? (m as any).full_name ?? (
                      <span className="font-mono text-xs text-muted-foreground">
                        {m.user_id.slice(0, 8)}…
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <Select
                      value={m.role}
                      onChange={(e) => changeRole(m.user_id, e.target.value)}
                      className="h-7 text-xs"
                    >
                      <option value="agency_admin">Admin</option>
                      <option value="agent">Agente</option>
                      <option value="agent_viewer">Visualizador</option>
                    </Select>
                  </td>
                  <td className="px-3 py-2.5">
                    {m.role === "agent" ? (
                      <button
                        onClick={() => setSelectedAgent(m)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                      >
                        <Percent className="h-3 w-3" /> Configurar
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {fmtDate(m.created_at)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      onClick={() => removeMember(m.user_id)}
                      className="text-xs text-destructive hover:underline inline-flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Convites
      </h3>
      {filteredInvites.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhum convite pendente.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt/40 text-left text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Papel</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Expira</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredInvites.map((i) => (
                <tr key={i.id} className="border-t border-border">
                  <td className="px-3 py-2.5 font-medium">{i.email}</td>
                  <td className="px-3 py-2.5 text-xs">{i.role}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge tone={i.accepted_at ? "success" : "warning"}>
                      {i.accepted_at ? "aceito" : "pendente"}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {fmtDate(i.expires_at)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {!i.accepted_at && (
                        <button
                          onClick={() => copyInvite(i.token)}
                          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <Copy className="h-3 w-3" /> Link
                        </button>
                      )}
                      <button
                        onClick={() => deleteInviteById(i.id)}
                        className="text-xs text-destructive hover:underline"
                      >
                        Cancelar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && agency && (
        <NewInvite
          agencyId={agency.id}
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ["team-invites", agency.id] });
          }}
        />
      )}

      {selectedAgent && agency && (
        <AgentCommissionSheet
          agencyId={agency.id}
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}
      <ConfirmDialog />
    </>
  );
}

function AgentCommissionSheet({
  agencyId,
  agent,
  onClose,
}: {
  agencyId: string;
  agent: Member;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [commissionType, setCommissionType] = useState<"fixed" | "scale">("scale");
  const [fixedPct, setFixedPct] = useState(0);
  const [scaleRanges, setScaleRanges] = useState<
    Array<{ min: number; max: number | null; pct: number }>
  >([]);
  const [submitting, setSubmitting] = useState(false);

  const { data: rule, isLoading } = useQuery({
    queryKey: ["agent-commission-rule", agencyId, agent.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_commission_rules" as any)
        .select("*")
        .eq("agency_id", agencyId)
        .eq("user_id", agent.user_id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    if (rule) {
      setCommissionType(rule.commission_type || "scale");
      setFixedPct(rule.fixed_pct || 0);
      setScaleRanges(rule.scale_ranges || []);
    } else {
      setScaleRanges([
        { min: 0, max: 50000, pct: 3 },
        { min: 50000, max: 100000, pct: 5 },
        { min: 100000, max: null, pct: 7 },
      ]);
    }
  }, [rule]);

  function handleAddRange() {
    const lastRange = scaleRanges[scaleRanges.length - 1];
    const newMin = lastRange ? lastRange.max || 0 : 0;
    setScaleRanges([...scaleRanges, { min: newMin, max: null, pct: 5 }]);
  }

  function handleRemoveRange(index: number) {
    setScaleRanges(scaleRanges.filter((_, i) => i !== index));
  }

  function handleRangeChange(index: number, field: "min" | "max" | "pct", val: number | null) {
    const newRanges = [...scaleRanges];
    newRanges[index] = { ...newRanges[index], [field]: val };
    setScaleRanges(newRanges);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.from("agent_commission_rules" as any).upsert(
        {
          agency_id: agencyId,
          user_id: agent.user_id,
          commission_type: commissionType,
          fixed_pct: fixedPct,
          scale_ranges: scaleRanges,
        },
        { onConflict: "agency_id,user_id" },
      );

      if (error) throw error;
      toast.success("Comissão configurada com sucesso!");
      qc.invalidateQueries({ queryKey: ["agent-commission-rule", agencyId, agent.user_id] });
      onClose();
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet onClose={onClose} title={`Comissão: ${agent.profile?.full_name || "Agente"}`}>
      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Carregando...</div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Tipo de Comissionamento">
            <Select
              value={commissionType}
              onChange={(e) => setCommissionType(e.target.value as "fixed" | "scale")}
            >
              <option value="scale">Escala Progressiva (Faturamento Mensal)</option>
              <option value="fixed">Taxa Fixa (%)</option>
            </Select>
          </Field>

          {commissionType === "fixed" ? (
            <Field
              label="Taxa de Comissão Fixa (%)"
              hint="Percentual fixo sobre a base comissionável"
            >
              <Input
                type="number"
                min={0}
                max={100}
                step={0.1}
                required
                value={fixedPct}
                onChange={(e) => setFixedPct(parseFloat(e.target.value) || 0)}
              />
            </Field>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Faixas de Faturamento
                </span>
                <button
                  type="button"
                  onClick={handleAddRange}
                  className="inline-flex items-center gap-1 text-xs text-brand hover:underline font-semibold"
                >
                  <PlusCircle className="h-3.5 w-3.5" /> Adicionar Faixa
                </button>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {scaleRanges.map((range, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-lg border border-border bg-surface p-2.5"
                  >
                    <div className="grid grid-cols-3 gap-2 flex-1">
                      <div>
                        <label className="text-[10px] text-muted-foreground font-semibold uppercase block">
                          Min (R$)
                        </label>
                        <Input
                          type="number"
                          min={0}
                          value={range.min}
                          onChange={(e) =>
                            handleRangeChange(index, "min", parseFloat(e.target.value) || 0)
                          }
                          className="h-8 text-xs px-2"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground font-semibold uppercase block">
                          Max (R$)
                        </label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="Sem limite"
                          value={range.max === null ? "" : range.max}
                          onChange={(e) =>
                            handleRangeChange(
                              index,
                              "max",
                              e.target.value === "" ? null : parseFloat(e.target.value),
                            )
                          }
                          className="h-8 text-xs px-2"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground font-semibold uppercase block">
                          Taxa (%)
                        </label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={range.pct}
                          onChange={(e) =>
                            handleRangeChange(index, "pct", parseFloat(e.target.value) || 0)
                          }
                          className="h-8 text-xs px-2"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveRange(index)}
                      className="mt-4 text-destructive hover:bg-destructive/10 p-1.5 rounded transition-colors self-center"
                      disabled={scaleRanges.length <= 1}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
            <GhostButton type="button" onClick={onClose}>
              Cancelar
            </GhostButton>
            <PrimaryButton type="submit" disabled={submitting}>
              {submitting ? "Salvando…" : "Salvar Configuração"}
            </PrimaryButton>
          </div>
        </form>
      )}
    </Sheet>
  );
}

function NewInvite({
  agencyId,
  onClose,
  onCreated,
}: {
  agencyId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("agent");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await inviteTeamMember(agencyId, email, role);
      toast.success("Convite criado");
      onCreated();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet onClose={onClose} title="Convidar membro">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Email *">
          <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Papel">
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="agency_admin">Admin</option>
            <option value="agent">Agente</option>
            <option value="agent_viewer">Visualizador</option>
          </Select>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>
            Cancelar
          </GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "Criando…" : "Criar convite"}
          </PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
