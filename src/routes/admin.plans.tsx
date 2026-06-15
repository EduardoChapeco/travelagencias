import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/use-confirm";
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
import { fetchPlans, deletePlan, togglePlanActive, savePlan } from "@/services/admin";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import {
  Field,
  Input,
  Textarea,
  PrimaryButton,
  GhostButton,
  StatusBadge,
} from "@/components/ui/form";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

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
  slug?: string;
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
  const { confirm, ConfirmDialog } = useConfirm();
  const [editing, setEditing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);

  const q = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const data = await fetchPlans();
      return data as Plan[];
    },
  });

  const plans: Plan[] = q.data ?? [];

  async function handleDelete(id: string) {
    confirm({
      title: "Remover este plano?",
      description: "Tem certeza de que deseja remover este plano da plataforma?",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await deletePlan(id);
          toast.success("Plano removido");
          qc.invalidateQueries({ queryKey: ["admin-plans"] });
        } catch (error: any) {
          toast.error(error.message);
        }
      },
    });
  }

  async function handleToggleActive(plan: Plan) {
    try {
      await togglePlanActive(plan.id, !plan.is_active);
      toast.success(!plan.is_active ? "Plano ativado" : "Plano desativado");
      qc.invalidateQueries({ queryKey: ["admin-plans"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  return (
    <>
      <ConfirmDialog />
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
            try {
              // We omit the auto-generated slug in new inserts to let service/DB handle it
              // or let savePlan do the upsert. In plans schema, slug is a unique required text.
              // So we slugify the name if it is a new plan, or generate one in service.
              // Let's pass a slug if it doesn't have one.
              const payload = { ...plan };
              if (!payload.slug) {
                payload.slug = plan.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
              }
              await savePlan(payload);
              toast.success(editing ? "Plano atualizado" : "Plano criado");
              setCreating(false);
              setEditing(null);
              qc.invalidateQueries({ queryKey: ["admin-plans"] });
            } catch (error: any) {
              toast.error(error.message);
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

const planSchema = z.object({
  id: z.string(),
  name: z.string().min(3, "Nome do plano deve ter pelo menos 3 caracteres"),
  badge: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  price_monthly: z.coerce.number().min(0, "O preço mensal deve ser maior ou igual a zero"),
  price_annual: z.coerce.number().min(0, "O preço anual deve ser maior ou igual a zero"),
  max_agents: z.coerce.number().min(1, "O número máximo de agentes deve ser pelo menos 1"),
  max_trips_per_month: z.coerce
    .number()
    .min(-1, "O número máximo de viagens deve ser pelo menos -1"),
  max_storage_gb: z.coerce.number().min(1, "O espaço mínimo de armazenamento é 1 GB"),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  features: z.array(
    z.object({
      label: z.string().min(1, "Nome da feature é obrigatório"),
      included: z.boolean(),
    }),
  ),
});

type PlanFormData = z.infer<typeof planSchema>;

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
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: initial,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "features",
  });

  async function onSubmit(data: PlanFormData) {
    await onSave(data as Plan);
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome do plano *" error={errors.name?.message}>
              <Input placeholder="Starter, Pro, Enterprise…" {...register("name")} />
            </Field>
            <Field label="Badge (opcional)" error={errors.badge?.message}>
              <Input placeholder="Mais popular" {...register("badge")} />
            </Field>
          </div>
          <Field label="Descrição" error={errors.description?.message}>
            <Textarea rows={2} {...register("description")} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Preço mensal (R$)" error={errors.price_monthly?.message}>
              <Input type="number" step="0.01" {...register("price_monthly")} />
            </Field>
            <Field label="Preço anual (R$)" error={errors.price_annual?.message}>
              <Input type="number" step="0.01" {...register("price_annual")} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Max agentes" error={errors.max_agents?.message}>
              <Input type="number" {...register("max_agents")} />
            </Field>
            <Field label="Viagens/mês" error={errors.max_trips_per_month?.message}>
              <Input type="number" {...register("max_trips_per_month")} />
            </Field>
            <Field label="Storage (GB)" error={errors.max_storage_gb?.message}>
              <Input type="number" {...register("max_storage_gb")} />
            </Field>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("is_active")} />
              Ativo
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("is_featured")} />
              Destaque (badge)
            </label>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-medium text-muted-foreground">Features</div>
              <button
                type="button"
                onClick={() => append({ label: "", included: true })}
                className="text-xs text-brand hover:underline"
              >
                + Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {fields.map((field, i) => (
                <div key={field.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register(`features.${i}.included` as const)}
                    className="h-3.5 w-3.5"
                  />
                  <Input
                    placeholder="Nome da feature"
                    className="flex-1"
                    {...register(`features.${i}.label` as const)}
                  />
                  <button
                    type="button"
                    onClick={() => remove(i)}
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
            <PrimaryButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando…" : isNew ? "Criar plano" : "Salvar"}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
