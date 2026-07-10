import { SimpleSheet as Sheet } from "@/components/ui/sheet";
import { Field } from "@/components/ui/field";
import { FormInput as Input } from "@/components/ui/input";
import { NativeSelect as Select } from "@/components/ui/select";
import { FormTextarea as Textarea } from "@/components/ui/textarea";
import { PrimaryButton, GhostButton } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { validateCNPJ, formatCNPJ } from "@/lib/validations/document";

const clientSchema = z
  .object({
    kind: z.enum(["individual", "company"]),
    fullName: z.string().min(3, "O nome deve ter no mínimo 3 caracteres"),
    legalName: z.string().optional().nullable(),
    document: z.string().optional().nullable(),
    email: z.string().email("E-mail inválido").optional().or(z.literal("")).nullable(),
    phone: z.string().optional().nullable(),
    birthDate: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.kind === "company" && (!data.legalName || data.legalName.trim() === "")) {
        return false;
      }
      return true;
    },
    {
      message: "Razão social é obrigatória para empresas",
      path: ["legalName"],
    },
  )
  .refine(
    (data) => {
      if (data.kind === "company" && data.document) {
        const raw = data.document.replace(/[^\d]/g, "");
        if (raw.length > 0) {
          return validateCNPJ(raw);
        }
      }
      return true;
    },
    {
      message: "CNPJ inválido",
      path: ["document"],
    },
  );

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

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ClientForm>({
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
    },
  });

  const kind = watch("kind");
  const watchDocument = watch("document");

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (kind === "company") {
      setValue("document", formatCNPJ(raw), { shouldValidate: true });
    } else {
      setValue("document", raw, { shouldValidate: true });
    }
  };

  async function onSubmit(form: ClientForm) {
    setSubmitting(true);
    try {
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

      if (error) {
        throw error;
      }

      toast.success("Cliente criado com sucesso!");
      onCreated();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar cliente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet onClose={onClose} title="Novo cliente">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <Field label="Tipo" error={errors.kind?.message}>
          <Select {...register("kind")}>
            <option value="individual">Pessoa física</option>
            <option value="company">Empresa</option>
          </Select>
        </Field>

        <Field
          label={kind === "individual" ? "Nome completo *" : "Nome fantasia *"}
          error={errors.fullName?.message}
        >
          <Input {...register("fullName")} />
        </Field>

        {kind === "company" && (
          <Field label="Razão social" error={errors.legalName?.message}>
            <Input {...register("legalName")} />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label={kind === "individual" ? "CPF" : "CNPJ"} error={errors.document?.message}>
            <Input value={watchDocument || ""} onChange={handleDocumentChange} />
          </Field>
          {kind === "individual" && (
            <Field label="Nascimento" error={errors.birthDate?.message}>
              <Input type="date" {...register("birthDate")} />
            </Field>
          )}
        </div>

        <Field label="Email" error={errors.email?.message}>
          <Input type="email" {...register("email")} />
        </Field>

        <Field label="Telefone / WhatsApp" error={errors.phone?.message}>
          <Input {...register("phone")} />
        </Field>

        <Field label="Notas" error={errors.notes?.message}>
          <Textarea {...register("notes")} />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>
            Cancelar
          </GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "Criando…" : "Criar cliente"}
          </PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
