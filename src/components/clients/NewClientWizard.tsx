import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X, Check, ChevronRight, ChevronLeft, User, Building2, Phone, MapPin } from "lucide-react";
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton } from "@/components/ui/form";
import { SheetPage } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { validateCNPJ, formatCNPJ } from "@/lib/validations/document";

const STEPS = ["Perfil", "Contato", "Endereço e Classificação", "Revisão"];

const clientWizardSchema = z
  .object({
    kind: z.enum(["individual", "company"]).default("individual"),
    fullName: z.string().min(3, "O nome deve ter no mínimo 3 caracteres"),
    legalName: z.string().optional().nullable(),
    document: z.string().optional().nullable(),
    birthDate: z.string().optional().nullable(),
    email: z.string().email("E-mail inválido").optional().or(z.literal("")).nullable(),
    phone: z.string().optional().nullable(),
    tags: z.string().optional().nullable(),
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

type ClientWizardFormData = z.infer<typeof clientWizardSchema>;

export function NewClientWizard({
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
  } = useForm<ClientWizardFormData>({
    resolver: zodResolver(clientWizardSchema) as any,
    defaultValues: {
      kind: "individual",
      fullName: "",
      legalName: "",
      document: "",
      birthDate: "",
      email: "",
      phone: "",
      tags: "",
      notes: "",
    },
  });

  const watchKind = watch("kind");
  const watchFullName = watch("fullName");
  const watchLegalName = watch("legalName");
  const watchDocument = watch("document");
  const watchBirthDate = watch("birthDate");
  const watchEmail = watch("email");
  const watchPhone = watch("phone");
  const watchTags = watch("tags");
  const watchNotes = watch("notes");

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (watchKind === "company") {
      setValue("document", formatCNPJ(raw), { shouldValidate: true });
    } else {
      setValue("document", raw, { shouldValidate: true });
    }
  };

  const handleNext = async () => {
    let fieldsToValidate: Array<keyof ClientWizardFormData> = [];
    if (step === 0) {
      fieldsToValidate = ["kind", "fullName", "legalName", "document", "birthDate"];
    } else if (step === 1) {
      fieldsToValidate = ["email", "phone"];
    } else if (step === 2) {
      fieldsToValidate = ["tags", "notes"];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  async function onSubmit(data: ClientWizardFormData) {
    setSubmitting(true);
    try {
      const { data: u } = await supabase.auth.getUser();

      const parsedTags = (data.tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const { error } = await supabase.from("clients").insert({
        agency_id: agencyId,
        kind: data.kind,
        full_name: data.fullName,
        legal_name: data.legalName || null,
        document: data.document || null,
        email: data.email || null,
        phone: data.phone || null,
        birth_date: data.birthDate || null,
        notes: data.notes || null,
        tags: (parsedTags.length > 0 ? parsedTags : null) as any,
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
    <SheetPage
      isOpen={true}
      onClose={onClose}
      title="Novo Cliente"
      contentClassName="flex flex-col flex-1 min-h-0 overflow-hidden"
    >
      <div className="px-6 pt-4 pb-2 shrink-0">
        <p className="text-xs text-muted-foreground">
          Cadastre passageiros ou contas corporativas.
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
            {/* STEP 0: Perfil */}
            {step === 0 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setValue("kind", "individual", { shouldValidate: true })}
                    className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-colors ${watchKind === "individual" ? "border-brand bg-brand/5" : "border-border/50 bg-surface hover:border-brand/40"}`}
                  >
                    <User
                      className={`h-8 w-8 mb-2 ${watchKind === "individual" ? "text-brand" : "text-muted-foreground"}`}
                    />
                    <span
                      className={`font-bold ${watchKind === "individual" ? "text-brand" : "text-foreground"}`}
                    >
                      Pessoa Física
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue("kind", "company", { shouldValidate: true })}
                    className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-colors ${watchKind === "company" ? "border-brand bg-brand/5" : "border-border/50 bg-surface hover:border-brand/40"}`}
                  >
                    <Building2
                      className={`h-8 w-8 mb-2 ${watchKind === "company" ? "text-brand" : "text-muted-foreground"}`}
                    />
                    <span
                      className={`font-bold ${watchKind === "company" ? "text-brand" : "text-foreground"}`}
                    >
                      Empresa
                    </span>
                  </button>
                </div>

                <Field
                  label={watchKind === "individual" ? "Nome Completo *" : "Nome Fantasia *"}
                  error={errors.fullName?.message}
                >
                  <Input
                    {...register("fullName")}
                    placeholder={watchKind === "individual" ? "Ex: João da Silva" : "Ex: Acme Corp"}
                    autoFocus
                  />
                </Field>

                {watchKind === "company" && (
                  <Field label="Razão Social" error={errors.legalName?.message}>
                    <Input {...register("legalName")} placeholder="Ex: Acme Corporation LTDA" />
                  </Field>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label={watchKind === "individual" ? "CPF / Passaporte" : "CNPJ"}
                    error={errors.document?.message}
                  >
                    <Input
                      value={watchDocument || ""}
                      onChange={handleDocumentChange}
                      placeholder={
                        watchKind === "individual" ? "123.456.789-00" : "00.000.000/0001-00"
                      }
                    />
                  </Field>
                  {watchKind === "individual" && (
                    <Field label="Data de Nascimento" error={errors.birthDate?.message}>
                      <Input type="date" {...register("birthDate")} />
                    </Field>
                  )}
                </div>
              </div>
            )}

            {/* STEP 1: Contato */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <Field label="E-mail Principal" error={errors.email?.message}>
                  <Input type="email" {...register("email")} placeholder="contato@exemplo.com" />
                </Field>
                <Field label="Telefone / WhatsApp" error={errors.phone?.message}>
                  <Input {...register("phone")} placeholder="+55 11 99999-9999" />
                </Field>
                <div className="rounded-xl border border-border bg-surface-alt/40 p-4 mt-2">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Mais opções de contato e redes sociais poderão ser cadastradas na tela de
                    detalhes do cliente após a criação.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 2: Endereço e Classificação */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <Field
                  label="Tags de Classificação (separadas por vírgula)"
                  error={errors.tags?.message}
                >
                  <Input
                    {...register("tags")}
                    placeholder="VIP, Corporativo, Preferência Janela..."
                  />
                  {watchTags && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {watchTags.split(",").map(
                        (t, i) =>
                          t.trim() && (
                            <span
                              key={i}
                              className="bg-surface-alt border border-border px-2 py-0.5 rounded text-[10px] font-bold text-muted-foreground uppercase tracking-wider"
                            >
                              {t.trim()}
                            </span>
                          ),
                      )}
                    </div>
                  )}
                </Field>

                <Field label="Anotações e Preferências" error={errors.notes?.message}>
                  <Textarea
                    rows={4}
                    {...register("notes")}
                    placeholder="Restrições alimentares, assento preferido, necessidades especiais..."
                  />
                </Field>
              </div>
            )}

            {/* STEP 3: Revisão */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="rounded-xl border border-border bg-surface-alt/20 p-6">
                  <div className="flex items-center gap-3 mb-5 border-b border-border/50 pb-4">
                    {watchKind === "individual" ? (
                      <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                        <User className="h-6 w-6" />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                        <Building2 className="h-6 w-6" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-bold text-foreground">{watchFullName}</h3>
                      {watchKind === "company" && watchLegalName && (
                        <p className="text-xs text-muted-foreground">{watchLegalName}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-6 text-sm">
                    {watchDocument && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-semibold text-xs uppercase tracking-widest">
                          {watchKind === "individual" ? "Doc:" : "CNPJ:"}
                        </span>
                        <span className="font-mono">{watchDocument}</span>
                      </div>
                    )}
                    {watchBirthDate && watchKind === "individual" && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-semibold text-xs uppercase tracking-widest">
                          Nasc:
                        </span>
                        <span>{new Date(watchBirthDate).toLocaleDateString("pt-BR")}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 col-span-full">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        {watchPhone || "S/ Telefone"}
                      </span>
                      <span className="text-muted-foreground mx-2">•</span>
                      <span className="font-medium text-foreground">
                        {watchEmail || "S/ E-mail"}
                      </span>
                    </div>

                    {watchTags && (
                      <div className="col-span-full mt-2">
                        <div className="flex flex-wrap gap-1.5">
                          {watchTags.split(",").map(
                            (t, i) =>
                              t.trim() && (
                                <span
                                  key={i}
                                  className="bg-brand/10 text-brand border border-brand/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                                >
                                  {t.trim()}
                                </span>
                              ),
                          )}
                        </div>
                      </div>
                    )}
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
                className="w-48 font-bold tracking-wider"
              >
                {submitting ? "CRIANDO..." : "CRIAR CLIENTE"}
              </PrimaryButton>
            )}
          </div>
        </div>
      </form>
    </SheetPage>
  );
}
