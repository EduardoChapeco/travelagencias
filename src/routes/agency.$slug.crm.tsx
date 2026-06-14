import { createFileRoute, useParams, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus, Settings2, X, Trash2, KanbanSquare, Archive, FolderOpen } from "lucide-react";
import { useAgency } from "@/lib/agency-context";
import { EmptyState } from "@/components/shell/PageHeader";
import {
  Field,
  Input,
  Select,
  Textarea,
  PrimaryButton,
  GhostButton,
  Sheet,
} from "@/components/ui/form";
import { toast } from "sonner";
import { useCrmKanban } from "@/hooks/use-crm-kanban";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fetchStages,
  fetchLeads,
  fetchAgencyUsers,
  initDefaultStages,
  persistLeadMove,
  archiveLead as archiveLeadService,
  transferLead as transferLeadService,
  createLead,
  saveStageUpdates,
  getLeadsCountInStage,
  moveLeadsToStage,
  deleteStage as deleteStageService,
  fetchArchivedLeads,
  restoreLead,
  deleteLeadPermanently,
  type Stage,
  type Lead,
} from "@/services/crm";
import { CrmFilterBar } from "@/components/crm/CrmFilterBar";
import { CrmKanbanBoard } from "@/components/crm/CrmKanbanBoard";
import { NewProposalSheet } from "@/components/proposals/NewProposalSheet";

export const Route = createFileRoute("/agency/$slug/crm")({
  head: () => ({ meta: [{ title: "CRM · TravelOS" }] }),
  component: CRMPage,
});

function CRMPage() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/crm" });
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [newOpen, setNewOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [proposalLeadId, setProposalLeadId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  const [localLeads, setLocalLeads] = useState<Lead[] | null>(null);

  const stagesQ = useQuery({
    enabled: !!agency,
    queryKey: ["stages", agency?.id],
    queryFn: () => fetchStages(agency!.id),
  });

  const leadsQ = useQuery({
    enabled: !!agency,
    queryKey: ["leads", agency?.id, showArchived],
    queryFn: () => (showArchived ? fetchArchivedLeads(agency!.id) : fetchLeads(agency!.id)),
  });

  const usersQ = useQuery({
    enabled: !!agency,
    queryKey: ["agency-users", agency?.id],
    queryFn: () => fetchAgencyUsers(agency!.id),
  });

  useEffect(() => {
    if (leadsQ.data) setLocalLeads(leadsQ.data);
  }, [leadsQ.data]);

  const filteredLeads = useMemo(() => {
    if (!localLeads) return null;
    return localLeads.filter((l) => {
      if (
        searchQuery &&
        !l.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !l.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      if (ownerFilter && l.owner_id !== ownerFilter) return false;
      if (sourceFilter && l.source !== sourceFilter) return false;
      return true;
    });
  }, [localLeads, searchQuery, ownerFilter, sourceFilter]);

  const persistMove = useMutation({
    mutationFn: (payload: {
      leadId: string;
      fromStageId: string;
      toStageId: string;
      reorderedIds: string[];
    }) => {
      return persistLeadMove({ ...payload, agencyId: agency!.id, stages: stagesQ.data ?? [] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar posição");
      qc.invalidateQueries({ queryKey: ["leads", agency?.id] });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads", agency?.id] }),
  });

  const { sensors, activeLead, stagesById, onDragStart, onDragEnd } = useCrmKanban({
    localLeads,
    setLocalLeads,
    filteredLeads,
    stages: stagesQ.data ?? [],
    onPersistMove: (payload) => persistMove.mutate(payload),
  });

  const initStages = useMutation({
    mutationFn: () => initDefaultStages(agency!.id),
    onSuccess: () => {
      toast.success("Funil inicializado com sucesso!");
      qc.invalidateQueries({ queryKey: ["stages", agency?.id] });
    },
    onError: (e) => toast.error("Falha ao inicializar funil: " + e.message),
  });

  async function archiveLead(leadId: string) {
    if (!confirm("Arquivar este lead? Ele não aparecerá mais no Kanban.")) return;
    try {
      await archiveLeadService(leadId);
      toast.success("Lead arquivado com sucesso!");
      qc.invalidateQueries({ queryKey: ["leads", agency?.id] });
    } catch (error) {
      toast.error("Falha ao arquivar");
    }
  }

  async function transferLead(leadId: string, newOwnerId: string) {
    try {
      await transferLeadService(leadId, newOwnerId);
      toast.success("Lead transferido com sucesso!");
      qc.invalidateQueries({ queryKey: ["leads", agency?.id] });
    } catch (error) {
      toast.error("Falha ao transferir");
    }
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col overflow-hidden bg-background">
      <div className="px-6 pt-4 pb-2 border-b border-border/50 bg-surface/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Pipeline CRM</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestão inteligente de oportunidades e vendas.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <GhostButton
              onClick={() => setShowArchived((v) => !v)}
              className={`gap-2 text-[11px] uppercase tracking-widest font-bold ${
                showArchived ? "bg-brand/10 border-brand text-brand hover:bg-brand/20" : ""
              }`}
            >
              {showArchived ? (
                <>
                  <FolderOpen className="h-4 w-4" /> Ver Funil Ativo
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4" /> Pasta de Arquivados
                </>
              )}
            </GhostButton>
            <GhostButton
              onClick={() => setSettingsOpen(true)}
              className="gap-2 text-[11px] uppercase tracking-widest font-bold"
            >
              <Settings2 className="h-4 w-4" /> Configurar Estágios
            </GhostButton>
            <PrimaryButton
              onClick={() => setNewOpen(true)}
              className="gap-2 text-[11px] uppercase tracking-widest font-bold"
            >
              <Plus className="h-4 w-4" /> Novo Lead
            </PrimaryButton>
          </div>
        </div>

        {!showArchived && (
          <CrmFilterBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            ownerFilter={ownerFilter}
            setOwnerFilter={setOwnerFilter}
            sourceFilter={sourceFilter}
            setSourceFilter={setSourceFilter}
            users={usersQ.data ?? []}
          />
        )}
      </div>

      {(stagesQ.isLoading || leadsQ.isLoading) && (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            <p className="text-sm text-muted-foreground">Carregando CRM...</p>
          </div>
        </div>
      )}

      {(stagesQ.isError || leadsQ.isError || usersQ.isError) && (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="flex flex-col items-center max-w-md text-center space-y-3 bg-danger/10 p-6 rounded-2xl border border-danger/20">
            <div className="h-12 w-12 rounded-full bg-danger/20 flex items-center justify-center text-danger mb-2">
              <X className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Erro ao carregar o Kanban</h3>
            <p className="text-sm text-muted-foreground">
              Não foi possível carregar as informações do CRM.
            </p>
          </div>
        </div>
      )}

      {showArchived && leadsQ.data && (
        <div className="flex-1 overflow-auto p-6 bg-surface/30">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Leads Arquivados</h2>
            {leadsQ.data.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                Nenhum lead arquivado encontrado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground text-xs uppercase tracking-wider font-bold">
                      <th className="py-3 px-4">Nome</th>
                      <th className="py-3 px-4">Destino</th>
                      <th className="py-3 px-4">Valor Estimado</th>
                      <th className="py-3 px-4">Arquivado em</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {leadsQ.data.map((l) => (
                      <tr key={l.id} className="hover:bg-surface-alt/40 transition-colors">
                        <td className="py-4 px-4 font-bold text-foreground">
                          <Link
                            to="/agency/$slug/crm/$lead_id"
                            params={{ slug, lead_id: l.id }}
                            className="hover:text-brand transition-colors"
                          >
                            {l.name}
                          </Link>
                        </td>
                        <td className="py-4 px-4 text-muted-foreground">{l.destination || "—"}</td>
                        <td className="py-4 px-4 font-mono text-brand font-bold">
                          {l.estimated_value && l.estimated_value > 0
                            ? `R$ ${l.estimated_value.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                              })}`
                            : "—"}
                        </td>
                        <td className="py-4 px-4 text-muted-foreground">
                          {l.deleted_at ? new Date(l.deleted_at).toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td className="py-4 px-4 text-right space-x-2">
                          <GhostButton
                            onClick={async () => {
                              try {
                                await restoreLead(l.id);
                                toast.success("Lead restaurado com sucesso!");
                                qc.invalidateQueries({ queryKey: ["leads", agency?.id] });
                              } catch (e) {
                                toast.error("Falha ao restaurar lead");
                              }
                            }}
                            className="h-8 px-3 text-xs border-success/30 hover:bg-success/10 text-success font-semibold"
                          >
                            Restaurar
                          </GhostButton>
                          <GhostButton
                            onClick={async () => {
                              if (
                                confirm(
                                  "Tem certeza que deseja excluir permanentemente este lead? Esta ação não pode ser desfeita.",
                                )
                              ) {
                                try {
                                  await deleteLeadPermanently(l.id);
                                  toast.success("Lead excluído permanentemente!");
                                  qc.invalidateQueries({ queryKey: ["leads", agency?.id] });
                                } catch (e) {
                                  toast.error("Falha ao excluir permanentemente");
                                }
                              }
                            }}
                            className="h-8 px-3 text-xs border-danger/30 hover:bg-danger/10 text-danger font-semibold"
                          >
                            Excluir
                          </GhostButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {!showArchived && stagesQ.data && stagesQ.data.length === 0 && (
        <div className="flex-1 p-6">
          <EmptyState
            icon={KanbanSquare}
            title="CRM Não Configurado"
            description="Seu funil de vendas não possui nenhuma coluna configurada. Inicialize-o agora para começar a gerenciar seus leads."
            action={
              <PrimaryButton onClick={() => initStages.mutate()} disabled={initStages.isPending}>
                {initStages.isPending ? "Inicializando..." : "Criar Funil Padrão"}
              </PrimaryButton>
            }
          />
        </div>
      )}

      {!showArchived && stagesQ.data && stagesQ.data.length > 0 && localLeads && (
        <CrmKanbanBoard
          stages={stagesQ.data}
          stagesById={stagesById}
          slug={slug}
          users={usersQ.data ?? []}
          sensors={sensors}
          activeLead={activeLead}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onArchive={archiveLead}
          onTransfer={transferLead}
          onCreateProposal={(id) => setProposalLeadId(id)}
        />
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

      {settingsOpen && agency && (
        <StageSettingsModal
          agencyId={agency.id}
          stages={stagesQ.data ?? []}
          onClose={() => setSettingsOpen(false)}
          onUpdated={() => qc.invalidateQueries({ queryKey: ["stages", agency.id] })}
        />
      )}

      {proposalLeadId && agency && (
        <NewProposalSheet
          isOpen={!!proposalLeadId}
          onClose={() => setProposalLeadId(null)}
          preSelectedLeadId={proposalLeadId}
          onCreated={(newProposalId) => {
            setProposalLeadId(null);
            toast.success("Redirecionando para editor de cotações...");
            navigate({
              to: "/agency/$slug/proposals/$id",
              params: { slug, id: newProposalId },
            });
          }}
        />
      )}

      <Outlet />
    </div>
  );
}

const leadSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido").or(z.literal("")).optional().nullable(),
  phone: z.string().optional().nullable(),
  destination: z.string().optional().nullable(),
  travel_start: z.string().optional().nullable(),
  travel_end: z.string().optional().nullable(),
  pax_count: z.number().min(1, "Deve ter pelo menos 1 passageiro").default(2),
  estimated_value: z.number().min(0, "O valor não pode ser negativo").default(0),
  source: z.string().optional().nullable(),
  stage_id: z.string().min(1, "Selecione o estágio do funil"),
  notes: z.string().optional().nullable(),
});

type LeadFormData = z.infer<typeof leadSchema>;

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

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema) as any,
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      destination: "",
      travel_start: "",
      travel_end: "",
      pax_count: 2,
      estimated_value: 0,
      source: "",
      stage_id: firstStage?.id ?? "",
      notes: "",
    },
  });

  useEffect(() => {
    if (firstStage) {
      setValue("stage_id", firstStage.id);
    }
  }, [firstStage, setValue]);

  async function onSubmit(data: LeadFormData) {
    try {
      await createLead(agencyId, data);
      toast.success("Lead criado com sucesso!");
      onCreated();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar lead");
    }
  }

  return (
    <Sheet onClose={onClose} title="Novo lead">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
        <Field label="Nome Completo *" error={errors.name?.message}>
          <Input
            {...register("name")}
            autoFocus
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="E-mail" error={errors.email?.message}>
            <Input
              type="email"
              {...register("email")}
            />
          </Field>
          <Field label="WhatsApp / Telefone" error={errors.phone?.message}>
            <Input {...register("phone")} />
          </Field>
        </div>
        <Field label="Destino" error={errors.destination?.message}>
          <Input
            {...register("destination")}
            placeholder="Ex: Paris, França"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Ida Prevista" error={errors.travel_start?.message}>
            <Input
              type="date"
              {...register("travel_start")}
            />
          </Field>
          <Field label="Retorno Previsto" error={errors.travel_end?.message}>
            <Input
              type="date"
              {...register("travel_end")}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Passageiros (Pax)" error={errors.pax_count?.message}>
            <Input
              type="number"
              min={1}
              {...register("pax_count", { valueAsNumber: true })}
            />
          </Field>
          <Field label="Orçamento Estimado (R$)" error={errors.estimated_value?.message}>
            <Input
              type="number"
              min={0}
              step="0.01"
              {...register("estimated_value", { valueAsNumber: true })}
            />
          </Field>
        </div>
        <Field label="Origem / Canal" error={errors.source?.message}>
          <Select {...register("source")}>
            <option value="">Não informado</option>
            <option value="whatsapp">WhatsApp / Telefone</option>
            <option value="instagram">Instagram / Meta</option>
            <option value="website">Site / Landing Page</option>
            <option value="referral">Indicação</option>
            <option value="walkin">Presencial</option>
          </Select>
        </Field>
        <Field label="Estágio do Funil" error={errors.stage_id?.message}>
          <Select {...register("stage_id")}>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Anotações Iniciais" error={errors.notes?.message}>
          <Textarea
            rows={4}
            {...register("notes")}
            placeholder="Informações cruciais para o primeiro contato..."
          />
        </Field>
        <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
          <GhostButton type="button" onClick={onClose}>
            Cancelar
          </GhostButton>
          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Criando..." : "Salvar Lead"}
          </PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}

function StageSettingsModal({
  agencyId,
  stages,
  onClose,
  onUpdated,
}: {
  agencyId: string;
  stages: Stage[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [localStages, setLocalStages] = useState<Stage[]>(stages);

  async function handleSave() {
    setBusy(true);
    try {
      await saveStageUpdates(agencyId, localStages);
      toast.success("Funil atualizado com sucesso.");
      onUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Falha ao salvar estágios.");
      setBusy(false);
    }
  }

  async function handleDelete(stageId: string) {
    if (stageId.startsWith("temp_")) {
      setLocalStages((curr) => curr.filter((s) => s.id !== stageId));
      return;
    }

    try {
      const count = await getLeadsCountInStage(stageId);
      if (count > 0) {
        const targetStageId = prompt(
          `Este estágio possui ${count} leads ativos. Para deletá-lo, você deve transferi-los. Digite o NOME EXATO do estágio de destino:`,
        );
        if (!targetStageId) return;
        const targetStage = localStages.find(
          (s) => s.name.toLowerCase() === targetStageId.toLowerCase() && s.id !== stageId,
        );
        if (!targetStage || targetStage.id.startsWith("temp_")) {
          toast.error("Estágio de destino inválido ou inexistente.");
          return;
        }

        setBusy(true);
        await moveLeadsToStage(stageId, targetStage.id);
        await deleteStageService(stageId);
        toast.success(`${count} leads transferidos para ${targetStage.name} e estágio excluído.`);
        onUpdated();
        onClose();
      } else {
        if (confirm("Tem certeza que deseja excluir este estágio vazio?")) {
          setBusy(true);
          await deleteStageService(stageId);
          toast.success("Estágio excluído.");
          onUpdated();
          onClose();
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Erro na operação");
      setBusy(false);
    }
  }

  function handleAdd() {
    setLocalStages((curr) => [
      ...curr,
      {
        id: "temp_" + Date.now(),
        name: "Novo Estágio",
        color: "#9ca3af",
        position: curr.length,
        is_won: false,
        is_lost: false,
      },
    ]);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-border bg-surface animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-border flex shrink-0 items-center justify-between bg-surface-alt/30">
          <div>
            <h2 className="text-lg font-bold text-foreground">Configurar Funil (Kanban)</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Renomeie, mude cores ou crie novas colunas.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface-alt rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-surface/50">
          <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Colunas do Pipeline
          </div>

          {localStages.map((s, idx) => (
            <div
              key={s.id}
              className="flex items-center gap-4 bg-background p-3 rounded-lg border border-border"
            >
              <div className="flex flex-col gap-1 items-center justify-center px-1">
                <button
                  disabled={idx === 0}
                  onClick={() => {
                    const arr = [...localStages];
                    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                    setLocalStages(arr);
                  }}
                  className="text-muted-foreground hover:text-brand disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  disabled={idx === localStages.length - 1}
                  onClick={() => {
                    const arr = [...localStages];
                    [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
                    setLocalStages(arr);
                  }}
                  className="text-muted-foreground hover:text-brand disabled:opacity-30"
                >
                  ▼
                </button>
              </div>

              <input
                type="color"
                value={s.color}
                onChange={(e) =>
                  setLocalStages((curr) =>
                    curr.map((x) => (x.id === s.id ? { ...x, color: e.target.value } : x)),
                  )
                }
                className="h-8 w-8 rounded cursor-pointer border-0 p-0"
              />

              <Input
                value={s.name}
                onChange={(e) =>
                  setLocalStages((curr) =>
                    curr.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x)),
                  )
                }
                className="flex-1"
                disabled={s.is_won || s.is_lost}
              />

              <div className="flex items-center w-24">
                {s.is_won && (
                  <span className="text-[10px] bg-success/20 text-success px-2 py-1 rounded font-bold">
                    GANHO
                  </span>
                )}
                {s.is_lost && (
                  <span className="text-[10px] bg-danger/20 text-danger px-2 py-1 rounded font-bold">
                    PERDIDO
                  </span>
                )}
              </div>

              {!s.is_won && !s.is_lost && (
                <button
                  onClick={() => handleDelete(s.id)}
                  className="p-2 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-md transition-colors"
                  title="Excluir Coluna"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}

          <GhostButton
            type="button"
            onClick={handleAdd}
            className="w-full mt-4 border-2 border-dashed border-border text-xs uppercase tracking-widest font-bold animate-pulse"
          >
            <Plus className="h-4 w-4 mr-2 inline" /> Adicionar Estágio
          </GhostButton>
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-surface-alt/30">
          <p className="text-xs text-muted-foreground">
            Nota: Não é possível excluir estágios de sistema (Ganho/Perdido).
          </p>
          <div className="flex gap-3">
            <GhostButton type="button" onClick={onClose} disabled={busy}>
              Cancelar
            </GhostButton>
            <PrimaryButton type="button" onClick={handleSave} disabled={busy} className="w-32">
              {busy ? "Salvando..." : "Salvar Funil"}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
