import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Check,
  X,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { SheetPage } from "@/components/ui/sheet";
import { Field } from "@/components/ui/field";
import { FormInput as Input } from "@/components/ui/input";
import { NativeSelect as Select } from "@/components/ui/select";
import { FormTextarea as Textarea } from "@/components/ui/textarea";
import { PrimaryButton, GhostButton , Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { toast } from "sonner";

const CLAUSE_KIND_LABELS: Record<string, string> = {
  general: "Geral",
  cancellation: "Cancelamento",
  liability: "Responsabilidade",
  payment: "Pagamentos",
  insurance: "Seguros",
  lgpd: "Proteção de Dados (LGPD)",
  custom: "Personalizadas",
};

type Clause = {
  id: string;
  agency_id: string | null;
  title: string;
  body: string;
  kind: "general" | "cancellation" | "liability" | "payment" | "insurance" | "lgpd" | "custom";
  is_default: boolean;
  is_active: boolean;
  version: number;
  order_index: number;
  created_at: string;
};

export function ContractClauseLibrary({
  agencyId,
  isOpen = false,
  onClose = () => {},
  isInline = false,
}: {
  agencyId: string;
  isOpen?: boolean;
  onClose?: () => void;
  isInline?: boolean;
}) {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingClause, setEditingClause] = useState<Clause | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<Clause["kind"]>("general");
  const [isActive, setIsActive] = useState(true);

  const q = useQuery({
    enabled: isOpen && !!agencyId,
    queryKey: ["contract_clauses", agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_clauses")
        .select("*")
        .or(`agency_id.is.null,agency_id.eq.${agencyId}`)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Clause[];
    },
  });

  const createMut = useMutation({
    mutationFn: async (payload: Omit<Clause, "id" | "created_at">) => {
      const { error } = await supabase.from("contract_clauses").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cláusula adicionada com sucesso!");
      resetForm();
      qc.invalidateQueries({ queryKey: ["contract_clauses", agencyId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: async (payload: { id: string; patch: Partial<Clause> }) => {
      const { error } = await supabase
        .from("contract_clauses")
        .update(payload.patch)
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cláusula atualizada!");
      resetForm();
      qc.invalidateQueries({ queryKey: ["contract_clauses", agencyId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contract_clauses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cláusula excluída.");
      qc.invalidateQueries({ queryKey: ["contract_clauses", agencyId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  function resetForm() {
    setTitle("");
    setBody("");
    setKind("general");
    setIsActive(true);
    setEditingClause(null);
    setFormOpen(false);
  }

  function handleEdit(clause: Clause) {
    setEditingClause(clause);
    setTitle(clause.title);
    setBody(clause.body);
    setKind(clause.kind);
    setIsActive(clause.is_active);
    setFormOpen(true);
  }

  function handleDuplicate(clause: Clause) {
    setTitle(`Cópia - ${clause.title}`);
    setBody(clause.body);
    setKind(clause.kind);
    setIsActive(true);
    setEditingClause(null);
    setFormOpen(true);
    toast.info("Ajuste as informações da cláusula duplicada e salve para persistir.");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error("Por favor, preencha o título e o texto da cláusula.");
      return;
    }

    if (editingClause) {
      updateMut.mutate({
        id: editingClause.id,
        patch: {
          title,
          body,
          kind,
          is_active: isActive,
          version: editingClause.version + 1,
        },
      });
    } else {
      createMut.mutate({
        agency_id: agencyId,
        title,
        body,
        kind,
        is_default: false,
        is_active: isActive,
        version: 1,
        order_index: (q.data?.length ?? 0) + 1,
      });
    }
  }

  // Group clauses by kind
  const groupedClauses = useMemo<Record<string, Clause[]>>(() => {
    const groups: Record<string, Clause[]> = {
      general: [],
      cancellation: [],
      liability: [],
      payment: [],
      insurance: [],
      lgpd: [],
      custom: [],
    };
    (q.data ?? []).forEach((c) => {
      if (groups[c.kind]) {
        groups[c.kind].push(c);
      } else {
        groups.custom.push(c);
      }
    });
    return groups;
  }, [q.data]);

  const content = (
    <div className={isInline ? "flex flex-col flex-1 min-h-0 h-full overflow-hidden bg-background" : "flex flex-col flex-1 min-h-0 overflow-hidden"}>
      {/* Intro section */}
      <div className="px-6 py-4 border-b border-border bg-surface-alt/20 shrink-0 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            Gerencie as cláusulas utilizadas para gerar novos contratos de viagens na agência.
          </p>
        </div>
        {!formOpen && (
          <PrimaryButton
            onClick={() => setFormOpen(true)}
            className="gap-1.5 h-8 text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar Cláusula
          </PrimaryButton>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 min-h-0 relative bg-surface/30">
        {formOpen ? (
          <form
            onSubmit={handleSubmit}
            className="mx-auto max-w-xl space-y-5 border border-border rounded-[var(--radius-card)] p-5 bg-surface animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                {editingClause
                  ? `Editar Cláusula: ${editingClause.title}`
                  : "Nova Cláusula Customizada"}
              </h3>
              <Button
                type="button"
                onClick={resetForm}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Field label="Título da Cláusula">
              <Input
                placeholder="Ex: Condições de Cancelamento por Força Maior"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Classificação/Tipo">
                <Select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as Clause["kind"])}
                  
                >
                  {Object.entries(CLAUSE_KIND_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Status">
                <Select
                  value={isActive ? "active" : "inactive"}
                  onChange={(e) => setIsActive(e.target.value === "active")}
                  
                >
                  <option value="active">Ativa (Visível ao Gerar)</option>
                  <option value="inactive">Inativa (Oculta)</option>
                </Select>
              </Field>
            </div>

            <Field label="Texto da Cláusula">
              <Textarea
                placeholder="Texto legal que será inserido no corpo do contrato..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                className="resize-none"
              />
            </Field>

            <div className="flex items-center justify-between border-t border-border pt-4">
              {editingClause && (
                <div className="ds-meta text-muted-foreground">
                  Versão Atual: {editingClause.version} · Criada por:{" "}
                  {editingClause.agency_id ? "Sua Agência" : "Global"}
                </div>
              )}
              <div className="flex gap-2 ml-auto">
                <GhostButton type="button" onClick={resetForm} className="h-8 text-xs font-semibold">
                  Cancelar
                </GhostButton>
                <PrimaryButton
                  type="submit"
                  disabled={createMut.isPending || updateMut.isPending}
                  className="h-8 text-xs font-semibold"
                >
                  {createMut.isPending || updateMut.isPending ? "Salvando..." : "Salvar Cláusula"}
                </PrimaryButton>
              </div>
            </div>
          </form>
        ) : q.isLoading ? (
          <div className="text-xs text-muted-foreground p-4">Carregando biblioteca...</div>
        ) : q.data?.length === 0 ? (
          <div className="text-center py-12 text-xs text-muted-foreground">
            Nenhuma cláusula cadastrada. Cadastre cláusulas personalizadas para sua agência.
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
            {Object.entries(groupedClauses).map(([groupKey, clauses]) => {
              if (clauses.length === 0) return null;
              return (
                <div key={groupKey} className="space-y-2.5">
                  <h3 className="ds-label-caps tracking-wider text-muted-foreground border-b border-border/60 pb-1.5">
                    {CLAUSE_KIND_LABELS[groupKey]} ({clauses.length})
                  </h3>
                  <div className="space-y-3">
                    {clauses.map((clause: Clause) => {
                      const isGlobal = clause.agency_id === null;
                      return (
                        <div
                          key={clause.id}
                          className={`group border rounded-[var(--radius-card)] bg-surface p-4 transition-all hover:border-border-strong ${
                            !clause.is_active ? "opacity-60 border-dashed" : "border-border"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                {clause.title}
                                {isGlobal ? (
                                  <span className="inline-flex items-center rounded bg-brand/5 border border-brand/10 px-1.5 py-0.5 text-[9px] font-semibold text-brand">
                                    Padrão Global
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded bg-success-bg text-success border border-success/20 px-1.5 py-0.5 text-[9px] font-semibold">
                                    Personalizada Agência
                                  </span>
                                )}
                                {!clause.is_active && (
                                  <span className="inline-flex items-center rounded bg-surface-alt text-muted-foreground border border-border px-1.5 py-0.5 text-[9px] font-semibold">
                                    Inativa
                                  </span>
                                )}
                              </h4>
                              <p className="ds-meta text-muted-foreground font-mono mt-0.5">
                                Versão {clause.version} · Classificação:{" "}
                                {CLAUSE_KIND_LABELS[clause.kind]}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                              {isGlobal ? (
                                <Button
                                  onClick={() => handleDuplicate(clause)}
                                  className="flex h-7 px-2.5 items-center gap-1 rounded border border-border bg-surface ds-meta font-semibold text-foreground hover:bg-surface-alt transition-colors"
                                  title="Duplicar para personalizar esta cláusula padrão"
                                >
                                  <Copy className="h-3 w-3 text-muted-foreground" /> Personalizar
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    onClick={() => handleEdit(clause)}
                                    className="p-1.5 rounded border border-border hover:bg-surface-alt text-muted-foreground hover:text-foreground transition-colors"
                                    title="Editar Cláusula"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      if (
                                        confirm(
                                          `Deseja realmente excluir a cláusula "${clause.title}"?`,
                                        )
                                      ) {
                                        deleteMut.mutate(clause.id);
                                      }
                                    }}
                                    className="p-1.5 rounded border border-border hover:bg-surface-alt text-muted-foreground hover:text-danger transition-colors"
                                    title="Excluir Cláusula"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-foreground/80 leading-relaxed font-medium bg-surface-alt/20 rounded-full p-3 border border-border/40 max-h-36 overflow-y-auto no-scrollbar whitespace-pre-wrap">
                            {clause.body}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  if (isInline) {
    return content;
  }

  return (
    <SheetPage
      isOpen={isOpen}
      onClose={onClose}
      title="Biblioteca de Cláusulas Contratuais"
      width="clamp(500px, 50vw, 850px)"
      contentClassName="flex flex-col flex-1 min-h-0 overflow-hidden"
    >
      {content}
    </SheetPage>
  );
}
