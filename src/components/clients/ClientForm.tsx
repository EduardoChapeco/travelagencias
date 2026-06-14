import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2, Check } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { MultiFileUploader } from "@/components/uploads/MultiFileUploader";
import { useConfirm } from "@/hooks/use-confirm";

const clientFormSchema = z.object({
  full_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  kind: z.enum(["individual", "company"]),
  birth_date: z.string().optional().nullable(),
  email: z.string().email("E-mail inválido").or(z.literal("")).optional().nullable(),
  phone: z.string().optional().nullable(),
  cpf: z.string().optional().nullable(),
  passport_number: z.string().optional().nullable(),
  passport_expiry: z.string().optional().nullable(),
  dietary: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  preferences_notes: z.string().optional().nullable(),
});

type ClientFormData = z.infer<typeof clientFormSchema>;

export function ClientForm({
  client,
  onCancel,
  onSaved,
  onDelete,
  saving,
}: {
  client: any;
  onCancel: () => void;
  onSaved: (patch: any) => Promise<void>;
  onDelete: () => void;
  saving: boolean;
}) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [documentImages, setDocumentImages] = useState<string[]>(client.document_images ?? []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      full_name: client.full_name || "",
      kind: client.kind || "individual",
      birth_date: client.birth_date || "",
      email: client.email || "",
      phone: client.phone || "",
      cpf: client.cpf || "",
      passport_number: client.passport_number || "",
      passport_expiry: client.passport_expiry || "",
      dietary: client.preferences?.dietary || "",
      preferences_notes: client.preferences?.notes || "",
      notes: client.notes || "",
    },
  });

  const onSubmit = async (data: ClientFormData) => {
    const patch = {
      full_name: data.full_name,
      kind: data.kind,
      birth_date: data.birth_date || null,
      email: data.email || null,
      phone: data.phone || null,
      cpf: data.cpf || null,
      passport_number: data.passport_number || null,
      passport_expiry: data.passport_expiry || null,
      document_images: documentImages,
      preferences: {
        dietary: data.dietary || null,
        notes: data.preferences_notes || null,
      },
      notes: data.notes || null,
    };
    await onSaved(patch);
  };

  return (
    <form
      className="space-y-6 bg-surface p-6 rounded-3xl border border-border"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Nome completo" error={errors.full_name?.message}>
          <Input {...register("full_name")} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Tipo" error={errors.kind?.message}>
            <Select {...register("kind")}>
              <option value="individual">Pessoa física</option>
              <option value="company">Empresa</option>
            </Select>
          </Field>
          <Field label="Nascimento" error={errors.birth_date?.message}>
            <Input type="date" {...register("birth_date")} />
          </Field>
        </div>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" {...register("email")} />
        </Field>
        <Field label="Telefone / WhatsApp" error={errors.phone?.message}>
          <Input {...register("phone")} />
        </Field>
        <Field label="CPF" error={errors.cpf?.message}>
          <Input {...register("cpf")} />
        </Field>
        <Field label="Passaporte" error={errors.passport_number?.message}>
          <Input {...register("passport_number")} />
        </Field>
        <Field label="Vencimento do Passaporte" error={errors.passport_expiry?.message}>
          <Input type="date" {...register("passport_expiry")} />
        </Field>
      </div>

      <div className="border-t border-border/50 pt-4">
        <Field label="Arquivos e Fotos Privados (RG, Passaporte)">
          <MultiFileUploader
            bucket="passenger-documents"
            folder={`clients/${client.id}`}
            max={10}
            values={documentImages}
            onChange={(urls) => setDocumentImages(urls)}
          />
        </Field>
      </div>

      <div className="border-t border-border/50 pt-4 grid gap-4">
        <Field label="Restrições Alimentares / Alergias" error={errors.dietary?.message}>
          <Input {...register("dietary")} />
        </Field>
        <Field label="Anotações e Preferências Gerais" error={errors.preferences_notes?.message}>
          <Textarea rows={3} {...register("preferences_notes")} />
        </Field>
        <Field label="Notas internas (Visíveis só para Agência)" error={errors.notes?.message}>
          <Textarea rows={3} {...register("notes")} />
        </Field>
      </div>

      <div className="flex items-center justify-between border-t border-border/50 pt-4">
        <button
          type="button"
          onClick={() => {
            confirm({
              title: "Arquivar Cliente",
              description: "Deseja realmente arquivar este cliente?",
              variant: "destructive",
              onConfirm: () => onDelete(),
            });
          }}
          className="text-danger hover:underline text-sm font-semibold flex items-center gap-1.5 cursor-pointer bg-transparent border-none"
        >
          <Trash2 className="w-4 h-4" /> Arquivar Cliente
        </button>
        <button
          type="submit"
          disabled={saving}
          className="h-12 px-8 rounded-full bg-foreground text-background text-sm font-bold flex items-center gap-2 hover:opacity-90 cursor-pointer"
        >
          <Check className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar Edição"}
        </button>
      </div>
      <ConfirmDialog />
    </form>
  );
}
