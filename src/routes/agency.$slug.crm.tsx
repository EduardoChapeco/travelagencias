import { createFileRoute, useParams, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus, Settings2, X, Trash2, KanbanSquare, Archive, FolderOpen } from "lucide-react";
import { useAgency } from "@/lib/agency-context";
import { EmptyState } from "@/components/shell/PageHeader";
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton } from "@/components/ui/form";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SheetPage } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useCrmKanban } from "@/hooks/use-crm-kanban";
import { useConfirm } from "@/hooks/use-confirm";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/agency/$slug/crm")({
  head: () => ({ meta: [{ title: "CRM · TravelOS" }] }),
  component: CRMPage,
});

function CRMPage() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/crm" });
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { confirm, ConfirmDialog } = useConfirm();

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
    confirm({
      title: "Arquivar Lead",
      description: "Ele não aparecerá mais no Kanban ativo. Tem certeza?",
      onConfirm: async () => {
        try {
          await archiveLeadService(leadId);
          toast.success("Lead arquivado com sucesso!");
          qc.invalidateQueries({ queryKey: ["leads", agency?.id] });
        } catch (error) {
          toast.error("Falha ao arquivar");
        }
      },
    });
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
            <h1 className="text-xl font-bold text-foreground">Negociações & Leads</h1>
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
                            onClick={() => {
                              confirm({
                                title: "Excluir Permanentemente",
                                description:
                                  "Deseja EXCLUIR este lead permanentemente? Essa ação não pode ser desfeita.",
                                variant: "destructive",
                                onConfirm: async () => {
                                  try {
                                    await deleteLeadPermanently(l.id);
                                    toast.success("Lead excluído permanentemente!");
                                    qc.invalidateQueries({ queryKey: ["leads", agency?.id] });
                                  } catch (e) {
                                    toast.error("Falha ao excluir permanentemente");
                                  }
                                },
                              });
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

      <ConfirmDialog />
      <Outlet />
    </div>
  );
}

import { supabase } from "@/integrations/supabase/client";

const leadSchema = z.object({
  client_id: z.string().optional().nullable(),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido").or(z.literal("")).optional().nullable(),
  phone: z.string().optional().nullable(),
  destination: z.string().optional().nullable(),
  travel_start: z.string().optional().nullable(),
  travel_end: z.string().optional().nullable(),
  pax_count: z.number().min(1, "Deve ter pelo menos 1 passageiro").default(2),
  pax_adults: z.number().min(0).default(0),
  pax_children: z.number().min(0).default(0),
  pax_infants: z.number().min(0).default(0),
  interest_type: z.string().optional().nullable(),
  estimated_value: z.number().min(0, "O valor não pode ser negativo").default(0),
  source: z.string().optional().nullable(),
  stage_id: z.string().min(1, "Selecione o estágio do funil"),
  notes: z.string().optional().nullable(),
  interest_period: z.string().optional().nullable(),
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
  const [showAdvanced, setShowAdvanced] = useState(false);

  const clientsQ = useQuery({
    queryKey: ["agency-clients", agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name, email, phone")
        .eq("agency_id", agencyId)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema) as any,
    defaultValues: {
      client_id: "",
      name: "",
      email: "",
      phone: "",
      destination: "",
      travel_start: "",
      travel_end: "",
      pax_count: 2,
      pax_adults: 2,
      pax_children: 0,
      pax_infants: 0,
      interest_type: "Não informado",
      estimated_value: 0,
      source: "",
      stage_id: firstStage?.id ?? "",
      notes: "",
      interest_period: "",
    },
  });

  const watchClientId = watch("client_id");

  useEffect(() => {
    if (watchClientId && clientsQ.data) {
      const c = clientsQ.data.find((x: any) => x.id === watchClientId);
      if (c) {
        setValue("name", c.full_name || "");
        setValue("email", c.email || "");
        setValue("phone", c.phone || "");
      }
    }
  }, [watchClientId, clientsQ.data, setValue]);

  useEffect(() => {
    if (firstStage) {
      setValue("stage_id", firstStage.id);
    }
  }, [firstStage, setValue]);

  async function onSubmit(data: LeadFormData) {
    const adults = Number(data.pax_adults) || 0;
    const children = Number(data.pax_children) || 0;
    const infants = Number(data.pax_infants) || 0;
    const computedPaxCount = adults + children + infants || 1;

    const payload = {
      ...data,
      pax_count: computedPaxCount,
      custom_fields: {
        interest_period: data.interest_period || null,
      },
    };

    try {
      await createLead(agencyId, payload);
      toast.success("Lead criado com sucesso!");
      onCreated();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar lead");
    }
  }

  return (
    <SheetPage
      isOpen={true}
      onClose={onClose}
      title="Novo Lead / Oportunidade"
      width="clamp(480px, 45vw, 640px)"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2 pb-20">
        {/* Seção Cliente */}
        <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            1. Perfil do Cliente
          </h3>
          <Field label="Vincular a Cliente Existente (Opcional)" error={errors.client_id?.message}>
            <SearchableSelect
              value={watch("client_id") ?? ""}
              onChange={(val) => setValue("client_id", val, { shouldValidate: true })}
              placeholder="Novo cliente (sem vínculo)"
              searchPlaceholder="Buscar por nome, e-mail..."
              options={[
                { value: "", label: "Novo cliente (sem vínculo)" },
                ...(clientsQ.data?.map((c: any) => ({
                  value: c.id,
                  label: c.full_name,
                  sublabel: c.email || c.phone || undefined,
                })) ?? []),
              ]}
              loading={clientsQ.isLoading}
              clearable={true}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Vincular preencherá os dados de contato automaticamente.
            </p>
          </Field>

          <Field label="Nome Completo *" error={errors.name?.message}>
            <Input {...register("name")} autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="E-mail" error={errors.email?.message}>
              <Input type="email" {...register("email")} />
            </Field>
            <Field label="WhatsApp / Telefone" error={errors.phone?.message}>
              <Input {...register("phone")} />
            </Field>
          </div>
        </div>

        {/* Seção Oportunidade */}
        <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            2. Detalhes do Interesse
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Destino de Interesse" error={errors.destination?.message}>
              <Input {...register("destination")} placeholder="Ex: Paris, Orlando" />
            </Field>
            <Field
              label="Período/Mês Flexível de Interesse"
              error={errors.interest_period?.message}
            >
              <Input {...register("interest_period")} placeholder="Ex: Julho/2026, Outubro" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Orçamento Estimado (R$)" error={errors.estimated_value?.message}>
              <Input
                type="number"
                min={0}
                step="0.01"
                {...register("estimated_value", { valueAsNumber: true })}
              />
            </Field>
            <Field label="Tipo de Interesse" error={errors.interest_type?.message}>
              <Select {...register("interest_type")}>
                <option value="Não informado">Não informado</option>
                <option value="Lazer / Férias">Lazer / Férias</option>
                <option value="Corporativo / Negócios">Corporativo / Negócios</option>
                <option value="Lua de Mel">Lua de Mel</option>
                <option value="Grupos / Excursão">Grupos / Excursão</option>
                <option value="Intercâmbio">Intercâmbio</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Estágio no Funil *" error={errors.stage_id?.message}>
              <Select {...register("stage_id")}>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
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
          </div>

          <div className="pt-3 border-t border-border space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Ida Prevista (Se houver data)" error={errors.travel_start?.message}>
                <Input type="date" {...register("travel_start")} />
              </Field>
              <Field label="Retorno Previsto (Se houver data)" error={errors.travel_end?.message}>
                <Input type="date" {...register("travel_end")} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Adultos" error={errors.pax_adults?.message}>
                <Input type="number" min={0} {...register("pax_adults", { valueAsNumber: true })} />
              </Field>
              <Field label="Crianças (2 a 11)" error={errors.pax_children?.message}>
                <Input
                  type="number"
                  min={0}
                  {...register("pax_children", { valueAsNumber: true })}
                />
              </Field>
              <Field label="Bebês (0 a 2)" error={errors.pax_infants?.message}>
                <Input
                  type="number"
                  min={0}
                  {...register("pax_infants", { valueAsNumber: true })}
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Anotações */}
        <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
          <Field label="Anotações Iniciais" error={errors.notes?.message}>
            <Textarea
              rows={4}
              {...register("notes")}
              placeholder="Informações cruciais para o primeiro contato (ex: restrições, vontades específicas)..."
            />
          </Field>
        </div>

        <div className="sticky bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md p-4 border-t border-border flex justify-end gap-3 z-10 -mx-6 -mb-6">
          <GhostButton type="button" onClick={onClose}>
            Cancelar
          </GhostButton>
          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar Oportunidade"}
          </PrimaryButton>
        </div>
      </form>
    </SheetPage>
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
  const { confirm, ConfirmDialog } = useConfirm();
  const [deletePrompt, setDeletePrompt] = useState<{ id: string; count: number } | null>(null);
  const [transferTargetId, setTransferTargetId] = useState<string>("");

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
        setDeletePrompt({ id: stageId, count });
      } else {
        confirm({
          title: "Excluir Estágio",
          description: "Tem certeza que deseja excluir este estágio vazio?",
          variant: "destructive",
          onConfirm: async () => {
            setBusy(true);
            try {
              await deleteStageService(stageId);
              toast.success("Estágio excluído.");
              onUpdated();
              onClose();
            } catch (err: any) {
              toast.error(err.message || "Erro na operação");
              setBusy(false);
            }
          },
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao verificar leads do estágio");
    }
  }

  async function confirmTransferAndDelete() {
    if (!deletePrompt || !transferTargetId) return;
    setBusy(true);
    try {
      const targetStage = localStages.find((s) => s.id === transferTargetId);
      if (!targetStage) throw new Error("Estágio de destino inválido.");

      await moveLeadsToStage(deletePrompt.id, transferTargetId);
      await deleteStageService(deletePrompt.id);
      toast.success(
        `${deletePrompt.count} leads transferidos para ${targetStage.name} e estágio excluído.`,
      );
      setDeletePrompt(null);
      setTransferTargetId("");
      onUpdated();
      onClose();
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
    <SheetPage
      isOpen={true}
      onClose={onClose}
      title="Configurar Funil (Kanban)"
      width="clamp(480px, 45vw, 640px)"
    >
      <div className="flex flex-col h-full justify-between pb-20 space-y-6">
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground -mt-3">
            Renomeie, mude cores ou crie novas colunas.
          </p>
          <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground pt-2">
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

        <div className="pt-4 border-t border-border flex items-center justify-between">
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

      <ConfirmDialog />

      <AlertDialog open={!!deletePrompt} onOpenChange={(open) => !open && setDeletePrompt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir e Transferir Leads</AlertDialogTitle>
            <AlertDialogDescription>
              Este estágio possui {deletePrompt?.count} leads ativos. Para deletá-lo, você deve
              transferi-los para outro estágio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={transferTargetId} onChange={(e) => setTransferTargetId(e.target.value)}>
              <option value="">Selecione o estágio de destino...</option>
              {localStages
                .filter((s) => s.id !== deletePrompt?.id && !s.id.startsWith("temp_"))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletePrompt(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmTransferAndDelete}
              disabled={!transferTargetId || busy}
              className="bg-danger hover:bg-danger/90 text-white"
            >
              Transferir e Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SheetPage>
  );
}
