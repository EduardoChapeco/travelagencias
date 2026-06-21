import { useState } from "react";
import { toast } from "sonner";
import { X, UserPlus, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Field, Input, Select, PrimaryButton, GhostButton } from "@/components/ui/form";
import { SheetPage } from "@/components/ui/sheet";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const passengerSchema = z.object({
  fullName: z.string().min(3, "Nome completo deve ter no mínimo 3 caracteres"),
  kind: z.enum(["adult", "child", "infant"]),
  document: z.string().optional().nullable(),
  documentType: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  isLead: z.boolean().default(false),
});

type PassengerFormData = z.infer<typeof passengerSchema>;

export function NewPassengerSheet({
  tripId,
  agencyId,
  onClose,
  onCreated,
}: {
  tripId: string;
  agencyId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PassengerFormData>({
    resolver: zodResolver(passengerSchema) as any,
    defaultValues: {
      fullName: "",
      kind: "adult",
      document: "",
      documentType: "passport",
      birthDate: "",
      nationality: "",
      email: "",
      phone: "",
      isLead: false,
    },
  });

  async function onSubmit(data: PassengerFormData) {
    setSubmitting(true);
    const { error } = await supabase.from("trip_passengers").insert({
      trip_id: tripId,
      agency_id: agencyId,
      full_name: data.fullName,
      kind: data.kind,
      document: data.document || null,
      document_type: data.documentType || null,
      birth_date: data.birthDate || null,
      nationality: data.nationality || null,
      email: data.email || null,
      phone: data.phone || null,
      is_lead_passenger: data.isLead,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Passageiro adicionado");
    onCreated();
  }

  return (
    <SheetPage
      isOpen={true}
      onClose={onClose}
      title="Novo Passageiro"
      contentClassName="flex flex-col flex-1 min-h-0 overflow-hidden"
    >
      <div className="p-6 pb-0 flex items-center gap-3 shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
          <UserPlus className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Adicionar à Rooming List</p>
      </div>

      {/* Content Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden mt-4">
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5 min-h-0">
          <Field label="Nome Completo *" error={errors.fullName?.message}>
            <Input {...register("fullName")} placeholder="Nome conforme o documento" autoFocus />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tipo de Viajante" error={errors.kind?.message}>
              <Select {...register("kind")}>
                <option value="adult">Adulto</option>
                <option value="child">Criança (CHD)</option>
                <option value="infant">Infante (INF)</option>
              </Select>
            </Field>
            <Field label="Data de Nascimento" error={errors.birthDate?.message}>
              <Input type="date" {...register("birthDate")} />
            </Field>
          </div>

          <div className="rounded-xl border border-border p-4 bg-surface-alt/20 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold mb-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Documentação Primária
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Tipo de Documento" error={errors.documentType?.message}>
                <Select {...register("documentType")}>
                  <option value="passport">Passaporte</option>
                  <option value="rg">Identidade (RG)</option>
                  <option value="cpf">CPF</option>
                  <option value="cnh">CNH</option>
                </Select>
              </Field>
              <Field label="Número do Documento" error={errors.document?.message}>
                <Input {...register("document")} placeholder="Ex: AB123456" />
              </Field>
            </div>
            <Field label="Nacionalidade Emissora" error={errors.nationality?.message}>
              <Input {...register("nationality")} placeholder="Ex: Brasileiro" />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Email (Opcional)" error={errors.email?.message}>
              <Input type="email" {...register("email")} placeholder="passageiro@email.com" />
            </Field>
            <Field label="Telefone (Opcional)" error={errors.phone?.message}>
              <Input {...register("phone")} placeholder="+55 11 99999-9999" />
            </Field>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-brand/20 bg-brand/5 p-4 cursor-pointer hover:border-brand/40 transition-colors">
            <input
              type="checkbox"
              {...register("isLead")}
              className="h-4 w-4 rounded border-brand/30 bg-surface text-brand focus:ring-brand"
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground">Passageiro Principal (Lead)</span>
              <span className="text-xs text-muted-foreground">
                Responsável financeiro ou líder da reserva no destino.
              </span>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border bg-surface-alt/30 px-6 py-4 shrink-0">
          <GhostButton type="button" onClick={onClose}>
            Cancelar
          </GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "Salvando..." : "Adicionar Passageiro"}
          </PrimaryButton>
        </div>
      </form>
    </SheetPage>
  );
}
