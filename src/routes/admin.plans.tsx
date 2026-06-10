import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Zap,
  Users,
  HardDrive,
  BarChart3,
  Globe,
  Star,
  Shield,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import {
  Field,
  Input,
  Textarea,
  PrimaryButton,
  GhostButton,
  StatusBadge,
} from "@/components/ui/form";

export const Route = createFileRoute("/admin/plans")({
  head: () => ({ meta: [{ title: "Planos · TravelOS Admin" }] }),
  component: Page,
});

type Feature = { label: string; included: boolean };
type Plan = {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_annual: number;
  max_agents: number;
  max_trips_per_month: number;
  max_storage_gb: number;
  features: Feature[];
  is_active: boolean;
  is_featured: boolean;
  badge?: string;
};

const EMPTY_PLAN: Omit<Plan, "id"> = {
  name: "",
  description: "",
  price_monthly: 0,
  price_annual: 0,
  max_agents: 3,
  max_trips_per_month: 50,
  max_storage_gb: 5,
  features: [
    { label: "CRM de Leads", included: true },
    { label: "Portal Público", included: true },
    { label: "Blog", included: true },
    { label: "Contratos digitais", included: false },
    { label: "Vouchers com AI", included: false },
    { label: "Suporte prioritário", included: false },
  ],
  is_active: true,
  is_featured: false,
};

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Page() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);

  const q = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("price_monthly", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Plan[];
    },
  });

  const plans: Plan[] = q.data ?? [];

  async function handleDelete(id: string) {
    if (!confirm("Remover este plano?")) return;
    const { error } = await supabase.from("plans").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Plano removido");
      qc.invalidateQueries({ queryKey: ["admin-plans"] });
    }
  }

  async function handleToggleActive(plan: Plan) {
    const { error } = await supabase
      .from("plans")
      .update({ is_active: !plan.is_active })
      .eq("id", plan.id);
    if (error) toast.error(error.message);
    else {
      toast.success(!plan.is_active ? "Plano ativado" : "Plano desativado");
      qc.invalidateQueries({ queryKey: ["admin-plans"] });
    }
  }

  return (
    <>
      <PageHeader
        title="Planos"
        description="Gestão de planos e limites de uso da plataforma."
        actions={
          <PrimaryButton onClick={() => setCreating(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Novo plano
          </PrimaryButton>
        }
      />

      {!q.isLoading && plans.length === 0 && (
        <EmptyState
          title="Nenhum plano criado"
          description="Crie planos para controlar o acesso das agências."
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-xl border bg-surface p-5 flex flex-col gap-4 ${
              plan.is_featured ? "border-brand/50 ring-1 ring-brand/20" : "border-border"
            } ${!plan.is_active ? "opacity-60" : ""}`}
          >
            {plan.is_featured && (
              <div className="absolute -top-2.5 left-4">
                <span className="flex items-center gap-1 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-semibold text-brand-foreground">
                  <Star className="h-2.5 w-2.5" /> Destaque
                </span>
              </div>
            )}
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-base">{plan.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{plan.description}</div>
              </div>
              <div className="flex gap-1">
                <StatusBadge tone={plan.is_active ? "success" : "neutral"}>
                  {plan.is_active ? "ativo" : "inativo"}
                </StatusBadge>
              </div>
            </div>

            <div className="flex items-end gap-2">
              <div className="text-2xl font-bold tracking-tight">{brl(plan.price_monthly)}</div>
              <div className="text-xs text-muted-foreground mb-1">/mês</div>
              {plan.price_annual > 0 && (
                <div className="text-xs text-success mb-1">{brl(plan.price_annual)}/ano</div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-lg bg-surface-alt p-3">
              <LimitBadge icon={Users} label="Agentes" value={plan.max_agents} />
              <LimitBadge icon={BarChart3} label="Viagens/mês" value={plan.max_trips_per_month} />
              <LimitBadge icon={HardDrive} label="Storage GB" value={plan.max_storage_gb} />
            </div>

            <div className="space-y-1.5">
              {plan.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {f.included ? (
                    <Check className="h-3.5 w-3.5 text-success shrink-0" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className={f.included ? "" : "text-muted-foreground"}>{f.label}</span>
                </div>
              ))}
            </div>

            <div className="mt-auto flex gap-2 pt-2 border-t border-border">
              <GhostButton
                type="button"
                onClick={() => setEditing(plan)}
                className="flex-1 gap-1.5 text-xs"
              >
                <Edit2 className="h-3.5 w-3.5" /> Editar
              </GhostButton>
              <button
                type="button"
                onClick={() => handleToggleActive(plan)}
                className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs hover:bg-surface-alt"
              >
                {plan.is_active ? "Desativar" : "Ativar"}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(plan.id)}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-danger/30 text-danger hover:bg-danger-bg"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {(creating || editing) && (
        <PlanEditor
          initial={editing ?? { id: crypto.randomUUID(), ...EMPTY_PLAN }}
          isNew={!editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSave={async (plan) => {
            let error;
            if (editing) {
              const res = await supabase.from("plans").update(plan).eq("id", plan.id);
              error = res.error;
            } else {
              // we don't pass an id if it's new so supabase generates it, or we pass the generated one
              // wait, empty plan has a generated id: crypto.randomUUID(), but plans table has id DEFAULT gen_random_uuid()
              // better to let supabase generate it or use the one we generated. Let's just insert everything.
              const res = await supabase.from("plans").insert(plan);
              error = res.error;
            }
            if (error) {
              toast.error(error.message);
            } else {
              toast.success(editing ? "Plano atualizado" : "Plano criado");
              setCreating(false);
              setEditing(null);
              qc.invalidateQueries({ queryKey: ["admin-plans"] });
            }
          }}
        />
      )}
    </>
  );
}

function LimitBadge({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <div className="text-xs font-bold">{value === -1 ? "∞" : value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function PlanEditor({
  initial,
  isNew,
  onClose,
  onSave,
}: {
  initial: Plan;
  isNew: boolean;
  onClose: () => void;
  onSave: (plan: Plan) => Promise<void>;
}) {
  const [plan, setPlan] = useState<Plan>(initial);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof Plan>(k: K, v: Plan[K]) => setPlan((p) => ({ ...p, [k]: v }));

  const setFeature = (i: number, field: keyof Feature, v: string | boolean) =>
    setPlan((p) => ({
      ...p,
      features: p.features.map((f, j) => (j === i ? { ...f, [field]: v } : f)),
    }));

  const addFeature = () =>
    setPlan((p) => ({ ...p, features: [...p.features, { label: "", included: true }] }));

  const removeFeature = (i: number) =>
    setPlan((p) => ({ ...p, features: p.features.filter((_, j) => j !== i) }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await onSave(plan);
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-overlay" onClick={onClose}>
      <div
        className="h-full w-full max-w-lg overflow-y-auto border-l border-border bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-5 text-base font-semibold tracking-tight">
          {isNew ? "Novo plano" : `Editar: ${initial.name}`}
        </h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome do plano *">
              <Input
                required
                value={plan.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Starter, Pro, Enterprise…"
              />
            </Field>
            <Field label="Badge (opcional)">
              <Input
                value={plan.badge ?? ""}
                onChange={(e) => set("badge", e.target.value)}
                placeholder="Mais popular"
              />
            </Field>
          </div>
          <Field label="Descrição">
            <Textarea
              rows={2}
              value={plan.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Preço mensal (R$)">
              <Input
                type="number"
                min={0}
                step={0.01}
                value={plan.price_monthly}
                onChange={(e) => set("price_monthly", +e.target.value)}
              />
            </Field>
            <Field label="Preço anual (R$)">
              <Input
                type="number"
                min={0}
                step={0.01}
                value={plan.price_annual}
                onChange={(e) => set("price_annual", +e.target.value)}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Max agentes">
              <Input
                type="number"
                min={1}
                value={plan.max_agents}
                onChange={(e) => set("max_agents", +e.target.value)}
              />
            </Field>
            <Field label="Viagens/mês">
              <Input
                type="number"
                min={-1}
                value={plan.max_trips_per_month}
                onChange={(e) => set("max_trips_per_month", +e.target.value)}
              />
            </Field>
            <Field label="Storage (GB)">
              <Input
                type="number"
                min={1}
                value={plan.max_storage_gb}
                onChange={(e) => set("max_storage_gb", +e.target.value)}
              />
            </Field>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={plan.is_active}
                onChange={(e) => set("is_active", e.target.checked)}
              />
              Ativo
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={plan.is_featured}
                onChange={(e) => set("is_featured", e.target.checked)}
              />
              Destaque (badge)
            </label>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-medium text-muted-foreground">Features</div>
              <button
                type="button"
                onClick={addFeature}
                className="text-xs text-brand hover:underline"
              >
                + Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {plan.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={f.included}
                    onChange={(e) => setFeature(i, "included", e.target.checked)}
                    className="h-3.5 w-3.5"
                  />
                  <Input
                    value={f.label}
                    onChange={(e) => setFeature(i, "label", e.target.value)}
                    placeholder="Nome da feature"
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeFeature(i)}
                    className="text-danger hover:text-danger/80"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <GhostButton type="button" onClick={onClose}>
              Cancelar
            </GhostButton>
            <PrimaryButton type="submit" disabled={busy}>
              {busy ? "Salvando…" : isNew ? "Criar plano" : "Salvar"}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
