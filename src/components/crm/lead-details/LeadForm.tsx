import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updateLead, type Lead, type Stage } from "@/services/crm";
import { Field } from "@/components/ui/field";
import { FormInput as Input } from "@/components/ui/input";
import { NativeSelect as Select } from "@/components/ui/select";
import { FormTextarea as Textarea } from "@/components/ui/textarea";
import { PrimaryButton, GhostButton } from "@/components/ui/button";

const INTEREST_TYPES = [
  { v: "flights", label: "Passagens Aéreas" },
  { v: "hotel", label: "Somente Hotel" },
  { v: "package_flight", label: "Pacote Aéreo Completo" },
  { v: "package_ground", label: "Pacote Terrestre Completo" },
  { v: "other", label: "Outros Serviços" },
] as const;

const leadEditSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido").or(z.literal("")).optional().nullable(),
  phone: z.string().optional().nullable(),
  destination: z.string().optional().nullable(),
  travel_start: z.string().optional().nullable(),
  travel_end: z.string().optional().nullable(),
  pax_adults: z.number().min(1, "Mínimo 1 adulto").default(1),
  pax_children: z.number().min(0).default(0),
  pax_infants: z.number().min(0).default(0),
  pax_ages_str: z.string().optional().nullable(),
  estimated_value: z.number().min(0, "O valor não pode ser negativo").default(0),
  source: z.string().optional().nullable(),
  stage_id: z.string().min(1, "Selecione o estágio"),
  interest_type: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  lost_reason: z.string().optional().nullable(),
  interest_period: z.string().optional().nullable(),
});

type LeadEditFormData = z.infer<typeof leadEditSchema>;

export function LeadForm({
  lead,
  stages,
  onCancel,
  onSaved,
}: {
  lead: Lead;
  stages: Stage[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LeadEditFormData>({
    resolver: zodResolver(leadEditSchema) as any,
    defaultValues: {
      name: lead.name,
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      destination: lead.destination ?? "",
      travel_start: lead.travel_start ?? "",
      travel_end: lead.travel_end ?? "",
      pax_adults: lead.pax_adults || 1,
      pax_children: lead.pax_children || 0,
      pax_infants: lead.pax_infants || 0,
      pax_ages_str: ((lead.pax_ages as number[]) || []).join(", "),
      estimated_value: lead.estimated_value || 0,
      source: lead.source ?? "",
      notes: lead.notes ?? "",
      stage_id: lead.stage_id,
      interest_type: lead.interest_type ?? "",
      lost_reason: lead.lost_reason ?? "",
      interest_period: (lead.custom_fields as any)?.interest_period ?? "",
    },
  });

  async function onSubmit(data: LeadEditFormData) {
    const paxAges = (data.pax_ages_str || "")
      .split(",")
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n));

    const customFields = {
      ...(lead.custom_fields || {}),
      interest_period: data.interest_period || null,
    };

    try {
      await updateLead(lead.id, {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        destination: data.destination || null,
        travel_start: data.travel_start || null,
        travel_end: data.travel_end || null,
        pax_adults: data.pax_adults,
        pax_children: data.pax_children,
        pax_infants: data.pax_infants,
        pax_count:
          Number(data.pax_adults) + Number(data.pax_children) + Number(data.pax_infants) || 1,
        pax_ages: paxAges,
        estimated_value: data.estimated_value,
        source: data.source || null,
        notes: data.notes || null,
        stage_id: data.stage_id,
        interest_type: data.interest_type || null,
        lost_reason: data.lost_reason || null,
        custom_fields: customFields,
      });
      toast.success("Lead atualizado com sucesso!");
      onSaved();
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 rounded-[var(--radius-card)] border border-border bg-surface p-6"
    >
      <h3 className="text-sm font-bold text-foreground">Editar Lead</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nome completo *" error={errors.name?.message}>
          <Input {...register("name")}  />
        </Field>
        <Field label="E-mail" error={errors.email?.message}>
          <Input type="email" {...register("email")}  />
        </Field>
        <Field label="Telefone / WhatsApp" error={errors.phone?.message}>
          <Input {...register("phone")}  />
        </Field>
        <Field label="Destino de interesse" error={errors.destination?.message}>
          <Input {...register("destination")}  />
        </Field>
        <Field label="Período/Mês Flexível de Interesse" error={errors.interest_period?.message}>
          <Input
            {...register("interest_period")}
            
            placeholder="Ex: Julho/2026, Outubro"
          />
        </Field>
        <Field label="Data de início (Se houver data)" error={errors.travel_start?.message}>
          <Input type="date" {...register("travel_start")}  />
        </Field>
        <Field label="Data de término (Se houver data)" error={errors.travel_end?.message}>
          <Input type="date" {...register("travel_end")}  />
        </Field>

        <div className="grid grid-cols-3 gap-2">
          <Field label="Adultos" error={errors.pax_adults?.message}>
            <Input
              type="number"
              min={1}
              {...register("pax_adults", { valueAsNumber: true })}
              
            />
          </Field>
          <Field label="Crianças" error={errors.pax_children?.message}>
            <Input
              type="number"
              min={0}
              {...register("pax_children", { valueAsNumber: true })}
              
            />
          </Field>
          <Field label="Bebês" error={errors.pax_infants?.message}>
            <Input
              type="number"
              min={0}
              {...register("pax_infants", { valueAsNumber: true })}
              
            />
          </Field>
        </div>

        <Field label="Idades das Crianças (ex: 5, 8)" error={errors.pax_ages_str?.message}>
          <Input
            {...register("pax_ages_str")}
            
            placeholder="Separadas por vírgula"
          />
        </Field>

        <div className="col-span-1 md:col-span-2 ds-meta bg-brand/5 border border-brand/10 p-3.5 rounded-[var(--radius-card)] text-muted-foreground space-y-1">
          <span className="font-bold text-foreground block">Regras de Tarifa da Aviação:</span>
          <ul className="list-disc list-inside space-y-0.5">
            <li>
              <strong>Adultos (ADT):</strong> 12 anos completos ou mais.
            </li>
            <li>
              <strong>Crianças (CHD):</strong> 2 a 11 anos completos (2 anos completos já pagam
              tarifa CHD).
            </li>
            <li>
              <strong>Bebês (INF):</strong> 0 a 23 meses (deve viajar no colo).
            </li>
          </ul>
        </div>

        <Field label="Orçamento Estimado (R$)" error={errors.estimated_value?.message}>
          <Input
            type="number"
            min={0}
            step="0.01"
            {...register("estimated_value", { valueAsNumber: true })}
            
          />
        </Field>

        <Field label="Tipo de Interesse" error={errors.interest_type?.message}>
          <Select {...register("interest_type")} >
            <option value="">Não informado</option>
            {INTEREST_TYPES.map((t) => (
              <option key={t.v} value={t.v}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Origem / Canal" error={errors.source?.message}>
          <Input {...register("source")}  />
        </Field>

        <Field label="Estágio do Funil" error={errors.stage_id?.message}>
          <Select {...register("stage_id")} >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Anotações gerais" error={errors.notes?.message}>
        <Textarea rows={3} {...register("notes")}  />
      </Field>

      <Field label="Motivo da Perda (Se perdido)" error={errors.lost_reason?.message}>
        <Input {...register("lost_reason")}  />
      </Field>

      <div className="flex justify-end gap-2.5 pt-4 border-t border-border">
        <GhostButton type="button" onClick={onCancel}>
          Cancelar
        </GhostButton>
        <PrimaryButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar Alterações"}
        </PrimaryButton>
      </div>
    </form>
  );
}
