import { SheetPage } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookOpen, Workflow, Settings2, Trash2, Edit2, Plus, ArrowLeft } from "lucide-react";
import { Field, Input, Textarea, PrimaryButton, GhostButton } from "@/components/ui/form";
import { useConfirm } from "@/hooks/use-confirm";
import { useAgency, DEFAULT_MODULE_NAMES } from "@/lib/agency-context";

interface ModuleAdminPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  moduleKey: string;
  moduleName: string;
  agencyId: string;
  customSettingsComponent?: React.ReactNode;
  isInline?: boolean;
}

type TabType = "kpis" | "settings";

export function ModuleAdminPanel({
  isOpen = false,
  onClose = () => {},
  moduleKey,
  moduleName,
  agencyId,
  customSettingsComponent,
  isInline = false,
}: ModuleAdminPanelProps) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("kpis");
  const [editingPlaybook, setEditingPlaybook] = useState<any | null>(null);
  const [isCreatingPlaybook, setIsCreatingPlaybook] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  const { agency, refresh, role } = useAgency();
  const currentCustomName = agency?.module_names?.[moduleKey] || "";
  const [customName, setCustomName] = useState(currentCustomName);
  const [savingName, setSavingName] = useState(false);
  const displayName = currentCustomName || moduleName;

  useEffect(() => {
    if (isOpen) {
      setCustomName(agency?.module_names?.[moduleKey] || "");
    }
  }, [isOpen, agency, moduleKey]);

  const handleSaveCustomName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingName(true);
    try {
      const currentModuleNames = agency?.module_names || {};
      const updatedModuleNames = {
        ...currentModuleNames,
        [moduleKey]: customName.trim() || undefined,
      };

      if (!customName.trim()) {
        delete updatedModuleNames[moduleKey];
      }

      const { error } = await supabase
        .from("agencies")
        .update({
          module_names: updatedModuleNames,
        } as any)
        .eq("id", agencyId);

      if (error) throw error;

      toast.success("Nome do módulo atualizado com sucesso!");
      qc.invalidateQueries({ queryKey: ["current-agency-live"] });
      refresh();
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar nome do módulo: " + err.message);
    } finally {
      setSavingName(false);
    }
  };

  // Scoped Playbooks Query
  const playbooksQ = useQuery({
    enabled: (isOpen || isInline) && !!agencyId,
    queryKey: ["playbooks-scoped", agencyId, moduleName],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("knowledge_playbooks" as any)
          .select("*, steps:knowledge_playbook_steps(*)")
          .eq("agency_id", agencyId)
          .ilike("category", moduleName);
        if (error) throw error;

        return (data || []).map((pb: any) => ({
          ...pb,
          steps: [...(pb.steps || [])].sort((a: any, b: any) => a.step_number - b.step_number),
        }));
      } catch (err) {
        console.warn("Failed to fetch scoped playbooks:", err);
        return [];
      }
    },
  });

  // Scoped Articles Query
  const articlesQ = useQuery({
    enabled: (isOpen || isInline) && !!agencyId,
    queryKey: ["articles-scoped", agencyId, moduleName],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("knowledge_articles" as any)
          .select("id, title, slug, views, category, is_internal, content, tags")
          .eq("agency_id", agencyId)
          .ilike("category", moduleName);
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn("Failed to fetch scoped articles:", err);
        return [];
      }
    },
  });

  // Delete Playbook Mutation
  const deletePlaybookMut = useMutation({
    mutationFn: async (playbookId: string) => {
      const { error } = await supabase
        .from("knowledge_playbooks" as any)
        .delete()
        .eq("id", playbookId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Procedimento/Playbook removido.");
      qc.invalidateQueries({ queryKey: ["playbooks-scoped"] });
    },
    onError: (err: any) => {
      toast.error("Erro ao remover playbook: " + err.message);
    },
  });

  const handleDeletePlaybook = (id: string) => {
    confirm({
      title: "Excluir Procedimento",
      description: "Deseja mesmo remover este playbook operacional do sistema?",
      variant: "destructive",
      onConfirm: () => deletePlaybookMut.mutate(id),
    });
  };

  return (
    <SheetPage
      isOpen={isOpen}
      onClose={onClose}
      title={`Painel do Administrador - Módulo ${displayName}`}
      width="clamp(520px, 50vw, 800px)"
    >
      <div className="flex flex-col h-full space-y-4">
        {/* Navigation Tabs */}
        {!editingPlaybook && !isCreatingPlaybook && (
          <div className="flex items-center gap-1 rounded-2xl border border-border bg-surface p-0.5 text-xs self-start mb-2">
            <button
              onClick={() => setActiveTab("kpis")}
              className={`rounded px-3.5 py-1.5 font-bold transition-all ${
                activeTab === "kpis"
                  ? "bg-surface-alt text-foreground border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Workflow className="w-3.5 h-3.5 inline mr-1" /> KIs & Playbooks do Módulo
            </button>
            {role === "super_admin" && (
              <button
                onClick={() => setActiveTab("settings")}
                className={`rounded px-3.5 py-1.5 font-bold transition-all ${
                  activeTab === "settings"
                    ? "bg-surface-alt text-foreground border border-border/40"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Settings2 className="w-3.5 h-3.5 inline mr-1" /> Configurações Avançadas
              </button>
            )}
          </div>
        )}

        {/* Tab Contents */}
        {activeTab === "kpis" && (
          <div className="flex-1 min-h-0">
            {isCreatingPlaybook || editingPlaybook ? (
              <PlaybookForm
                agencyId={agencyId}
                moduleName={moduleName}
                initialData={editingPlaybook}
                onClose={() => {
                  setEditingPlaybook(null);
                  setIsCreatingPlaybook(false);
                }}
                onSaved={() => {
                  setEditingPlaybook(null);
                  setIsCreatingPlaybook(false);
                  qc.invalidateQueries({ queryKey: ["playbooks-scoped"] });
                }}
              />
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Playbooks do Módulo</h3>
                    <p className="text-xs text-muted-foreground">
                      Defina instruções operacionais e scripts de IA específicos para o módulo{" "}
                      {displayName}.
                    </p>
                  </div>
                  <PrimaryButton
                    onClick={() => setIsCreatingPlaybook(true)}
                    className="h-8 text-[11px] font-bold gap-1 rounded-2xl"
                  >
                    <Plus className="w-3.5 h-3.5" /> Novo Playbook
                  </PrimaryButton>
                </div>

                {/* Scoped Playbooks List */}
                {playbooksQ.isLoading ? (
                  <div className="text-xs text-muted-foreground animate-pulse">
                    Carregando playbooks...
                  </div>
                ) : playbooksQ.data && playbooksQ.data.length === 0 ? (
                  <div className="text-xs text-center p-8 border border-dashed border-border rounded-[24px] text-muted-foreground">
                    Nenhum playbook operacional definido para este módulo.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {playbooksQ.data?.map((pb: any) => (
                      <div
                        key={pb.id}
                        className="p-4 rounded-[24px] border border-border bg-surface flex flex-col justify-between hover:border-brand/45 transition-colors group"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[9px] bg-brand/10 text-brand px-1.5 py-0.5 rounded font-extrabold uppercase">
                              {pb.category}
                            </span>
                            <h4 className="text-xs font-bold text-foreground mt-1.5">{pb.title}</h4>
                            {pb.description && (
                              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                {pb.description}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditingPlaybook(pb)}
                              className="p-1 hover:bg-surface-alt rounded text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePlaybook(pb.id)}
                              className="p-1 hover:bg-danger/10 rounded text-muted-foreground hover:text-danger transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{pb.steps?.length || 0} etapas definidas</span>
                          <span className="font-mono text-[9px]">
                            Atualizado em {new Date(pb.updated_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Scoped Articles List */}
                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-bold text-foreground mb-1">Artigos Relacionados</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Artigos de suporte e tutoriais da base de conhecimento categorizados sob{" "}
                    {displayName}.
                  </p>
                  {articlesQ.isLoading ? (
                    <div className="text-xs text-muted-foreground animate-pulse">
                      Carregando artigos...
                    </div>
                  ) : articlesQ.data && articlesQ.data.length === 0 ? (
                    <div className="text-xs text-center p-6 border border-dashed border-border rounded-[24px] text-muted-foreground">
                      Nenhum artigo da base de conhecimento encontrado nesta categoria.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5">
                      {articlesQ.data?.map((art: any) => (
                        <div
                          key={art.id}
                          className="p-3 rounded-2xl border border-border bg-surface-alt/10 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                            <div>
                              <span className="text-xs font-bold text-foreground block">
                                {art.title}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {art.is_internal ? "Apenas Interno" : "Visível no Portal"}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {art.views || 0} visualizações
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "settings" && role === "super_admin" && (
          <div className="flex-1 overflow-auto space-y-6">
            <form
              onSubmit={handleSaveCustomName}
              className="space-y-4 bg-surface-alt/10 border border-border p-4 rounded-[24px]"
            >
              <div>
                <h4 className="text-xs font-bold text-foreground">Identificação do Módulo</h4>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  Personalize o nome deste módulo no menu lateral, cabeçalhos e fluxos do sistema.
                  Deixe em branco para usar o nome padrão.
                </p>
              </div>

              <Field label="Nome Personalizado">
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={`Padrão: ${DEFAULT_MODULE_NAMES[moduleKey] || moduleKey}`}
                  className="text-xs h-9"
                />
              </Field>

              <div className="flex justify-end gap-2">
                {customName !== currentCustomName && (
                  <GhostButton
                    type="button"
                    onClick={() => setCustomName(currentCustomName)}
                    className="h-8 text-xs font-bold"
                  >
                    Descartar
                  </GhostButton>
                )}
                <PrimaryButton
                  type="submit"
                  disabled={savingName || customName === currentCustomName}
                  className="h-8 text-xs font-bold"
                >
                  {savingName ? "Salvando..." : "Salvar Nome"}
                </PrimaryButton>
              </div>
            </form>

            {customSettingsComponent ? (
              <div className="pt-4 border-t border-border space-y-4">
                <h4 className="text-xs font-bold text-foreground">Configurações Específicas</h4>
                {customSettingsComponent}
              </div>
            ) : (
              <div className="p-6 border border-dashed border-border rounded-[24px] text-center text-xs text-muted-foreground">
                Este módulo não possui configurações adicionais específicas além da identificação.
              </div>
            )}
          </div>
        )}
      </div>
      <ConfirmDialog />
    </SheetPage>
  );
}

/* Internal Playbook Form Component */
function PlaybookForm({
  agencyId,
  moduleName,
  initialData,
  onClose,
  onSaved,
}: {
  agencyId: string;
  moduleName: string;
  initialData: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [steps, setSteps] = useState<any[]>(
    initialData?.steps ? [...initialData.steps] : [{ step_number: 1, title: "", description: "" }],
  );
  const [submitting, setSubmitting] = useState(false);

  const addStep = () => {
    setSteps([...steps, { step_number: steps.length + 1, title: "", description: "" }]);
  };

  const removeStep = (idx: number) => {
    const next = steps.filter((_, i) => i !== idx).map((st, i) => ({ ...st, step_number: i + 1 }));
    setSteps(next);
  };

  const updateStep = (idx: number, field: string, val: string) => {
    const next = steps.map((st, i) => (i === idx ? { ...st, [field]: val } : st));
    setSteps(next);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error("O título é obrigatório");

    setSubmitting(true);
    try {
      const payload = {
        agency_id: agencyId,
        title: title.trim(),
        description: description.trim() || null,
        category: moduleName,
      };

      let pbId = initialData?.id;

      const { data: pb, error: pbErr } = initialData
        ? await (supabase
            .from("knowledge_playbooks" as any)
            .update(payload)
            .eq("id", initialData.id)
            .select("id")
            .single() as any)
        : await (supabase
            .from("knowledge_playbooks" as any)
            .insert(payload)
            .select("id")
            .single() as any);

      if (pbErr) throw pbErr;
      if (pb) pbId = pb.id;

      if (pbId) {
        // Delete old steps
        await supabase
          .from("knowledge_playbook_steps" as any)
          .delete()
          .eq("playbook_id", pbId);

        // Insert new steps
        const stepsPayload = steps
          .filter((st) => st.title.trim())
          .map((st) => ({
            playbook_id: pbId,
            step_number: st.step_number,
            title: st.title.trim(),
            description: st.description.trim() || null,
          }));

        if (stepsPayload.length > 0) {
          const { error: stepsErr } = await supabase
            .from("knowledge_playbook_steps" as any)
            .insert(stepsPayload);
          if (stepsErr) throw stepsErr;
        }
      }

      toast.success(initialData ? "Procedimento atualizado" : "Procedimento criado");
      onSaved();
    } catch (err: any) {
      console.error(err);
      toast.error("Falha ao salvar playbook: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={onClose}
          className="p-1 hover:bg-surface-alt rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider">
          {initialData ? "Editar Procedimento" : "Cadastrar Novo Procedimento"}
        </span>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Field label="Título do Procedimento *">
          <Input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Como lidar com cancelamentos ou Dúvidas Frequentes"
            className="text-xs h-9"
          />
        </Field>

        <Field label="Descrição Geral">
          <Textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Breve resumo sobre quando aplicar este procedimento..."
            className="text-xs resize-none"
          />
        </Field>

        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-extrabold text-foreground uppercase tracking-wider">
              Etapas e Diretrizes do Processo
            </label>
            <GhostButton
              type="button"
              onClick={addStep}
              className="h-7 text-[10px] font-bold cursor-pointer"
            >
              + Adicionar Etapa
            </GhostButton>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
            {steps.map((st, idx) => (
              <div
                key={idx}
                className="bg-surface-alt/20 border border-border/80 rounded-[24px] p-3 relative space-y-2.5"
              >
                <button
                  type="button"
                  onClick={() => removeStep(idx)}
                  disabled={steps.length === 1}
                  className="absolute right-2 top-2.5 text-muted-foreground hover:text-danger disabled:opacity-30 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground text-[10px] font-bold">
                    {st.step_number}
                  </div>
                  <input
                    type="text"
                    required
                    value={st.title}
                    onChange={(e) => updateStep(idx, "title", e.target.value)}
                    placeholder={`Título da Etapa (ex: Enviar e-mail de alerta)`}
                    className="flex-1 h-7 rounded-full border border-border bg-surface px-2 text-xs outline-none focus:border-brand text-foreground"
                  />
                </div>

                <textarea
                  rows={2}
                  value={st.description}
                  onChange={(e) => updateStep(idx, "description", e.target.value)}
                  placeholder="Diretrizes detalhadas para condução da etapa..."
                  className="w-full rounded-full border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-brand resize-none text-foreground"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-border flex justify-end gap-2">
          <GhostButton type="button" onClick={onClose} className="h-8 text-xs font-bold">
            Cancelar
          </GhostButton>
          <PrimaryButton type="submit" disabled={submitting} className="h-8 text-xs font-bold">
            {submitting ? "Salvando..." : "Salvar Playbook"}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
