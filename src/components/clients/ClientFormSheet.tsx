import { Sheet, Field, Input, Select, Textarea, PrimaryButton, GhostButton } from "@/components/ui/form";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const clientSchema = z.object({
  kind: z.enum(["individual", "company"]),
  fullName: z.string().min(3, "O nome deve ter no mínimo 3 caracteres"),
  legalName: z.string().optional(),
  document: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  notes: z.string().optional(),
});

type ClientForm = z.infer<typeof clientSchema>;

export function ClientFormSheet({
  agencyId,
  onClose,
  onCreated,
}: {
  agencyId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      kind: "individual",
      fullName: "",
      legalName: "",
      document: "",
      email: "",
      phone: "",
      birthDate: "",
      notes: "",
    }
  });

  const kind = watch("kind");

  async function onSubmit(form: ClientForm) {
    setSubmitting(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("clients").insert({
      agency_id: agencyId,
      kind: form.kind,
      full_name: form.fullName,
      legal_name: form.legalName || null,
      document: form.document || null,
      email: form.email || null,
      phone: form.phone || null,
      birth_date: form.birthDate || null,
      notes: form.notes || null,
      owner_id: u.user?.id ?? null,
    });
    setSubmitting(false);
    
    if (error) {
      toast.error(error.message);
      return;
    }
    
    toast.success("Cliente criado com sucesso!");
    onCreated();
  }

  return (
    <Sheet onClose={onClose} title="Novo cliente">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <Field label="Tipo">
          <Select {...register("kind")}>
            <option value="individual">Pessoa física</option>
            <option value="company">Empresa</option>
          </Select>
        </Field>
        
        <Field label={kind === "individual" ? "Nome completo *" : "Nome fantasia *"}>
          <Input {...register("fullName")} />
          {errors.fullName && <span className="text-xs text-danger">{errors.fullName.message}</span>}
        </Field>
        
        {kind === "company" && (
          <Field label="Razão social">
            <Input {...register("legalName")} />
          </Field>
        )}
        
        <div className="grid grid-cols-2 gap-3">
          <Field label={kind === "individual" ? "CPF" : "CNPJ"}>
            <Input {...register("document")} />
          </Field>
          {kind === "individual" && (
            <Field label="Nascimento">
              <Input type="date" {...register("birthDate")} />
            </Field>
          )}
        </div>
        
        <Field label="Email">
          <Input type="email" {...register("email")} />
          {errors.email && <span className="text-xs text-danger">{errors.email.message}</span>}
        </Field>
        
        <Field label="Telefone / WhatsApp">
          <Input {...register("phone")} />
        </Field>
        
        <Field label="Notas">
          <Textarea {...register("notes")} />
        </Field>
        
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "Criando…" : "Criar cliente"}
          </PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
