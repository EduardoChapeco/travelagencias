import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  Building2,
  Percent,
  PhoneCall,
  Mail,
  MapPin,
} from "lucide-react";
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton } from "@/components/ui/form";
import { SheetPage } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { validateCNPJ, formatCNPJ } from "@/lib/validations/document";

const STEPS = ["Identidade B2B", "Localização", "Comercial & Markups", "Contatos (SLA)"];

const supplierWizardSchema = z
  .object({
    name: z.string().min(2, "Nome fantasia deve ter no mínimo 2 caracteres"),
    legalName: z.string().optional().nullable(),
    kind: z
      .enum([
        "operator",
        "airline",
        "hotel",
        "car_rental",
        "insurance",
        "transfer",
        "visa",
        "other",
      ])
      .default("operator"),
    document: z.string().optional().nullable(),
    zip: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    commission: z
      .number({ invalid_type_error: "Insira um número válido" })
      .min(0, "Comissão mínima é 0%")
      .max(100, "Comissão máxima é 100%")
      .default(0),
    notes: z.string().optional().nullable(),
    email: z.string().email("E-mail inválido").optional().or(z.literal("")).nullable(),
    phone: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.document) {
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

type SupplierWizardFormData = z.infer<typeof supplierWizardSchema>;

export function NewSupplierWizard({
  agencyId,
  onClose,
  onCreated,
}: {
  agencyId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<SupplierWizardFormData>({
    resolver: zodResolver(supplierWizardSchema) as any,
    defaultValues: {
      name: "",
      legalName: "",
      kind: "operator",
      document: "",
      zip: "",
      address: "",
      city: "",
      state: "",
      country: "",
      commission: 0,
      notes: "",
      email: "",
      phone: "",
    },
  });

  const watchName = watch("name");
  const watchLegalName = watch("legalName");
  const watchKind = watch("kind");
  const watchDocument = watch("document");
  const watchZip = watch("zip");
  const watchAddress = watch("address");
  const watchCity = watch("city");
  const watchState = watch("state");
  const watchCountry = watch("country");
  const watchCommission = watch("commission");
  const watchNotes = watch("notes");
  const watchEmail = watch("email");
  const watchPhone = watch("phone");

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setValue("document", formatCNPJ(raw), { shouldValidate: true });
  };

  const handleNext = async () => {
    let fieldsToValidate: Array<keyof SupplierWizardFormData> = [];
    if (step === 0) {
      fieldsToValidate = ["name", "legalName", "kind", "document"];
    } else if (step === 1) {
      fieldsToValidate = ["zip", "address", "city", "state", "country"];
    } else if (step === 2) {
      fieldsToValidate = ["commission", "notes"];
    } else if (step === 3) {
      fieldsToValidate = ["email", "phone"];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  async function onSubmit(data: SupplierWizardFormData) {
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from("suppliers").insert({
        agency_id: agencyId,
        name: data.name,
        legal_name: data.legalName || null,
        kind: data.kind as any,
        document: data.document || null,
        zip: data.zip || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || null,
        email: data.email || null,
        phone: data.phone || null,
        commission_rate: data.commission,
        notes: data.notes || null,
        is_active: true,
      });

      if (error) {
        throw error;
      }

      toast.success("Fornecedor / Operador cadastrado com sucesso!");
      onCreated();
    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar parceiro.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SheetPage
      isOpen={true}
      onClose={onClose}
      title="Novo Parceiro de Negócios (B2B)"
      contentClassName="flex flex-col flex-1 min-h-0 overflow-hidden"
    >
      <div className="px-6 pt-4 pb-2 shrink-0">
        <p className="text-xs text-muted-foreground">
          Cadastre operadoras, hotéis e consolidadoras com seus acordos.
        </p>
      </div>

      {/* Stepper progress */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-8 py-3 shrink-0">
        {STEPS.map((s, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 ${i === step ? "opacity-100" : "opacity-40"}`}
          >
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                i < step
                  ? "bg-success text-success-foreground"
                  : i === step
                    ? "bg-brand text-brand-foreground"
                    : "bg-surface-alt text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span
              className={`text-xs font-semibold uppercase tracking-widest hidden md:block ${
                i < step ? "text-success" : i === step ? "text-brand" : "text-muted-foreground"
              }`}
            >
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground/30 mx-2" />
            )}
          </div>
        ))}
      </div>

      {/* Content Area */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 bg-surface/30 min-h-0">
          <div className="mx-auto max-w-xl space-y-6">
            {/* STEP 0: Identidade */}
            {step === 0 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <Field
                  label="Nome Fantasia (Visível nos Relatórios) *"
                  error={errors.name?.message}
                >
                  <Input
                    {...register("name")}
                    placeholder="Ex: CVC Viagens"
                    autoFocus
                    className="text-lg font-semibold"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Razão Social (Contratos)" error={errors.legalName?.message}>
                    <Input {...register("legalName")} placeholder="CVC Brasil Operadora Ltda" />
                  </Field>
                  <Field label="CNPJ / Documento" error={errors.document?.message}>
                    <Input
                      value={watchDocument || ""}
                      onChange={handleDocumentChange}
                      placeholder="00.000.000/0001-00"
                    />
                  </Field>
                </div>
                <Field label="Categoria Principal do Fornecedor" error={errors.kind?.message}>
                  <Select {...register("kind")}>
                    <option value="operator">Operadora Turística (DMC)</option>
                    <option value="airline">Companhia Aérea / Consolidador</option>
                    <option value="hotel">Rede de Hotéis / Acomodação</option>
                    <option value="car_rental">Locadora de Veículos</option>
                    <option value="insurance">Seguradora / Assistência Viagem</option>
                    <option value="transfer">Receptivo / Transfer</option>
                    <option value="visa">Despachante de Vistos</option>
                    <option value="other">Outros Serviços</option>
                  </Select>
                </Field>
              </div>
            )}

            {/* STEP 1: Localização */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <Field label="CEP / ZIP" error={errors.zip?.message}>
                      <Input {...register("zip")} placeholder="00000-000" />
                    </Field>
                  </div>
                  <div className="col-span-2">
                    <Field label="Endereço / Logradouro" error={errors.address?.message}>
                      <Input {...register("address")} placeholder="Av. Paulista, 1000" />
                    </Field>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Cidade" error={errors.city?.message}>
                    <Input {...register("city")} placeholder="São Paulo" />
                  </Field>
                  <Field label="Estado" error={errors.state?.message}>
                    <Input {...register("state")} placeholder="SP" />
                  </Field>
                  <Field label="País" error={errors.country?.message}>
                    <Input {...register("country")} placeholder="Brasil" />
                  </Field>
                </div>
              </div>
            )}

            {/* STEP 2: Markups */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="rounded-[var(--radius-card)] border border-brand/20 bg-brand/5 p-6">
                  <Field
                    label="Comissão Base ou Markup Acordado (%)"
                    error={errors.commission?.message}
                  >
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      {...register("commission", { valueAsNumber: true })}
                      className="text-2xl font-mono text-brand h-12"
                    />
                    <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-widest">
                      Esta taxa será usada como padrão para calcular a rentabilidade dos pacotes
                      deste fornecedor.
                    </p>
                  </Field>
                </div>

                <Field
                  label="Política de Comissionamento & Condições"
                  error={errors.notes?.message}
                >
                  <Textarea
                    {...register("notes")}
                    rows={4}
                    placeholder="Ex: Faturamento 30 dias. Aéreo com 8% e terrestre com 12%. Contato VIP: Roberto."
                  />
                </Field>
              </div>
            )}

            {/* STEP 3: SLA e Contatos */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="E-mail de Reservas / Financeiro" error={errors.email?.message}>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        {...register("email")}
                        placeholder="reservas@fornecedor.com"
                        className="pl-9"
                      />
                    </div>
                  </Field>
                  <Field label="Telefone / SLA Helpdesk" error={errors.phone?.message}>
                    <div className="relative">
                      <PhoneCall className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input {...register("phone")} placeholder="0800 123 456" className="pl-9" />
                    </div>
                  </Field>
                </div>

                <div className="rounded-[var(--radius-card)] border border-border bg-surface-alt/20 p-5 mt-6">
                  <h4 className="text-sm font-semibold mb-3">Resumo B2B</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Fornecedor:</span>
                      <strong className="text-foreground text-sm">{watchName || "—"}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Categoria:</span>
                      <strong className="text-foreground">{watchKind}</strong>
                    </div>
                    {watchCity && (
                      <div>
                        <span className="text-muted-foreground block">Localização:</span>
                        <strong className="text-foreground">
                          {watchCity} / {watchState || "—"} ({watchCountry || "—"})
                        </strong>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground block">Comissão Geral:</span>
                      <strong className="text-brand font-mono text-sm">{watchCommission}%</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border bg-surface-alt/30 px-6 py-4 shrink-0">
          <GhostButton
            type="button"
            onClick={handleBack}
            disabled={step === 0}
            className="gap-2 w-28"
          >
            <ChevronLeft className="h-4 w-4" /> Voltar
          </GhostButton>

          <div className="flex gap-3">
            <GhostButton type="button" onClick={onClose} disabled={submitting}>
              Cancelar
            </GhostButton>
            {step < STEPS.length - 1 ? (
              <PrimaryButton type="button" onClick={handleNext} className="gap-2 w-32">
                Próximo <ChevronRight className="h-4 w-4" />
              </PrimaryButton>
            ) : (
              <PrimaryButton
                type="submit"
                disabled={submitting}
                className="w-56 font-bold tracking-wider"
              >
                {submitting ? "SALVANDO..." : "CADASTRAR PARCEIRO"}
              </PrimaryButton>
            )}
          </div>
        </div>
      </form>
    </SheetPage>
  );
}
