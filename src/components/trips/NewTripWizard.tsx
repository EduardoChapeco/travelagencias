import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  Plane,
  User,
  MapPin,
  CalendarDays,
  DollarSign,
  Tag,
} from "lucide-react";
import { Field, Input, Select, PrimaryButton, GhostButton } from "@/components/ui/form";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const STEPS = ["Destino e Datas", "Passageiros", "Financeiro e Status", "Revisão"];

const tripWizardSchema = z
  .object({
    title: z.string().min(3, "O título da viagem precisa ter pelo menos 3 caracteres"),
    destination: z.string().optional().nullable(),
    travel_start: z.string().optional().nullable(),
    travel_end: z.string().optional().nullable(),
    client_id: z.string().optional().nullable(),
    new_client_name: z.string().optional().nullable(),
    new_client_document: z.string().optional().nullable(),
    new_client_email: z.string().optional().nullable(),
    new_client_phone: z.string().optional().nullable(),
    currency: z.string().default("BRL"),
    total_sale: z
      .number({ invalid_type_error: "Insira um número válido" })
      .min(0, "O valor de venda não pode ser negativo")
      .default(0),
    status: z.enum(["planning", "confirmed", "in_progress", "completed"]).default("planning"),
  })
  .refine(
    (data) => {
      if (
        data.travel_start &&
        data.travel_end &&
        data.travel_start.trim() !== "" &&
        data.travel_end.trim() !== ""
      ) {
        return new Date(data.travel_end) >= new Date(data.travel_start);
      }
      return true;
    },
    {
      message: "A data de volta deve ser posterior à data de ida",
      path: ["travel_end"],
    },
  );

type TripWizardFormData = z.infer<typeof tripWizardSchema>;

export function NewTripWizard({
  agencyId,
  onClose,
  onCreated,
}: {
  agencyId: string;
  onClose: () => void;
  onCreated: (tripId: string) => void;
}) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [isNewClientMode, setIsNewClientMode] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<TripWizardFormData>({
    resolver: zodResolver(tripWizardSchema) as any,
    defaultValues: {
      title: "",
      destination: "",
      travel_start: "",
      travel_end: "",
      client_id: "",
      new_client_name: "",
      new_client_document: "",
      new_client_email: "",
      new_client_phone: "",
      currency: "BRL",
      total_sale: 0,
      status: "planning",
    },
  });

  const watchCurrency = watch("currency");
  const watchClientId = watch("client_id");
  const watchTitle = watch("title");
  const watchDestination = watch("destination");
  const watchTravelStart = watch("travel_start");
  const watchTravelEnd = watch("travel_end");
  const watchStatus = watch("status");
  const watchTotalSale = watch("total_sale");

  const clientsQ = useQuery({
    queryKey: ["clients-pick", agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name, document")
        .eq("agency_id", agencyId)
        .order("full_name")
        .limit(5000);
      if (error) throw error;
      return data;
    },
  });

  const handleNext = async () => {
    let fieldsToValidate: Array<keyof TripWizardFormData> = [];
    if (step === 0) {
      fieldsToValidate = ["title", "travel_start", "travel_end", "destination"];
    } else if (step === 1) {
      if (isNewClientMode) {
        const nameVal = watch("new_client_name");
        if (!nameVal || nameVal.trim().length < 3) {
          toast.error("Por favor, informe o nome do novo cliente (mínimo 3 caracteres)");
          return;
        }
      } else {
        fieldsToValidate = ["client_id"];
      }
    } else if (step === 2) {
      fieldsToValidate = ["status", "currency", "total_sale"];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  async function onSubmit(data: TripWizardFormData) {
    setSubmitting(true);
    try {
      const { data: u } = await supabase.auth.getUser();

      let targetClientId = data.client_id || null;
      let clientName = "";
      let clientDocument = "";

      if (isNewClientMode && data.new_client_name) {
        // Verificar se CPF/CNPJ já existe na agência
        if (data.new_client_document) {
          const cleanDoc = data.new_client_document.replace(/[^\d]/g, "");
          const { data: existing } = await supabase
            .from("clients")
            .select("id, full_name, document")
            .eq("agency_id", agencyId)
            .ilike("document", `%${cleanDoc}%`)
            .maybeSingle();

          if (existing) {
            targetClientId = existing.id;
            clientName = existing.full_name;
            clientDocument = existing.document || "";
            toast.info(`Cliente existente localizado pelo documento: ${clientName}`);
          }
        }

        if (!targetClientId) {
          const { data: newClient, error: clientErr } = await supabase
            .from("clients")
            .insert({
              agency_id: agencyId,
              full_name: data.new_client_name,
              document: data.new_client_document || null,
              email: data.new_client_email || null,
              phone: data.new_client_phone || null,
              kind: "individual",
            })
            .select("id, full_name, document")
            .single();

          if (clientErr) throw clientErr;
          targetClientId = newClient.id;
          clientName = newClient.full_name;
          clientDocument = newClient.document || "";
        }
      } else if (data.client_id) {
        const client = clientsQ.data?.find((c) => c.id === data.client_id);
        if (client) {
          clientName = client.full_name;
          clientDocument = client.document || "";
        }
      }

      const { data: tripData, error } = await supabase
        .from("trips")
        .insert({
          agency_id: agencyId,
          title: data.title,
          destination: data.destination || null,
          travel_start: data.travel_start || null,
          travel_end: data.travel_end || null,
          client_id: targetClientId,
          status: data.status,
          currency: data.currency,
          total_sale: data.total_sale,
          owner_id: u.user?.id ?? null,
        })
        .select("id")
        .single();

      if (error || !tripData) {
        throw error || new Error("Erro ao criar viagem.");
      }

      // Se cliente selecionado ou criado, adicionar como 1º passageiro
      if (targetClientId) {
        await supabase.from("trip_passengers").insert({
          agency_id: agencyId,
          trip_id: tripData.id,
          client_id: targetClientId,
          is_lead_passenger: true,
          full_name: clientName,
          document: clientDocument || null,
        });
      }

      toast.success("Viagem criada com sucesso!");
      onCreated(tripData.id);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar viagem.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedClient = clientsQ.data?.find((c) => c.id === watchClientId);

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-overlay" onClick={onClose} />
      <div className="relative flex h-full flex-col bg-surface border-l border-border transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] w-[clamp(480px,45vw,700px)]">
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6">
          <div>
            <h2 className="text-base font-semibold">Novo Roteiro de Viagem</h2>
            <p className="text-[11px] text-muted-foreground">
              Gestão completa de viagens, orçamentos e passageiros.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-alt hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-1 border-b border-border bg-surface-alt/30 px-6 py-3">
          {STEPS.map((s, i) => (
            <React.Fragment key={i}>
              <div className={cn("flex items-center gap-2", i !== step && "opacity-40")}>
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                    i < step
                      ? "bg-success text-success-foreground"
                      : i === step
                        ? "bg-brand text-brand-foreground"
                        : "bg-surface-alt text-muted-foreground",
                  )}
                >
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-xs font-semibold uppercase tracking-widest hidden md:block",
                    i < step ? "text-success" : i === step ? "text-brand" : "text-muted-foreground",
                  )}
                >
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 mx-1 shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
            <div className="mx-auto max-w-xl space-y-6">
              {/* STEP 0: Destino e Datas */}
              {step === 0 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <Field label="Título do Roteiro *" error={errors.title?.message}>
                    <Input
                      {...register("title")}
                      placeholder="Ex: Férias em Cancún, Corporativo SP..."
                      autoFocus
                    />
                  </Field>
                  <Field
                    label="Destino (País, Cidade ou Região)"
                    error={errors.destination?.message}
                  >
                    <Input {...register("destination")} placeholder="Ex: Cancún, México" />
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Data de Ida Prevista" error={errors.travel_start?.message}>
                      <Input type="date" {...register("travel_start")} />
                    </Field>
                    <Field label="Data de Retorno Prevista" error={errors.travel_end?.message}>
                      <Input type="date" {...register("travel_end")} />
                    </Field>
                  </div>
                </div>
              )}

              {/* STEP 1: Passageiros */}
              {step === 1 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="rounded-xl border border-border bg-surface-alt/40 p-5 text-sm text-muted-foreground">
                    O cliente responsável é aquele que realiza o pagamento ou responde pela viagem.
                    Se ele também viajar, será automaticamente adicionado como o primeiro passageiro
                    do roteiro.
                  </div>

                  <div className="flex items-center justify-between border-b border-border/60 pb-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Cliente Responsável
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewClientMode(!isNewClientMode);
                        setValue("client_id", "");
                        setValue("new_client_name", "");
                        setValue("new_client_document", "");
                        setValue("new_client_email", "");
                        setValue("new_client_phone", "");
                      }}
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      {isNewClientMode ? "Selecionar Existente" : "Cadastrar Novo"}
                    </button>
                  </div>

                  {!isNewClientMode ? (
                    <Field label="Cliente Responsável (Opcional)" error={errors.client_id?.message}>
                      <Select {...register("client_id")}>
                        <option value="">— Sem cliente ainda —</option>
                        {(clientsQ.data ?? []).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.full_name} {c.document ? `(${c.document})` : ""}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  ) : (
                    <div className="space-y-4 rounded-xl border border-border bg-surface/50 p-4">
                      <Field label="Nome Completo *" error={errors.new_client_name?.message}>
                        <Input {...register("new_client_name")} placeholder="Ex: João da Silva" />
                      </Field>
                      <Field
                        label="Documento (CPF/CNPJ)"
                        error={errors.new_client_document?.message}
                      >
                        <Input {...register("new_client_document")} placeholder="000.000.000-00" />
                      </Field>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="E-mail" error={errors.new_client_email?.message}>
                          <Input
                            type="email"
                            {...register("new_client_email")}
                            placeholder="joao@email.com"
                          />
                        </Field>
                        <Field label="Telefone" error={errors.new_client_phone?.message}>
                          <Input {...register("new_client_phone")} placeholder="(00) 99999-9999" />
                        </Field>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Financeiro */}
              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Status Inicial" error={errors.status?.message}>
                      <Select {...register("status")}>
                        <option value="planning">Planejamento</option>
                        <option value="confirmed">Confirmada</option>
                        <option value="in_progress">Em andamento</option>
                        <option value="completed">Concluída</option>
                      </Select>
                    </Field>
                    <Field label="Moeda Principal" error={errors.currency?.message}>
                      <Select {...register("currency")}>
                        <option value="BRL">BRL (Real)</option>
                        <option value="USD">USD (Dólar)</option>
                        <option value="EUR">EUR (Euro)</option>
                        <option value="GBP">GBP (Libra)</option>
                      </Select>
                    </Field>
                  </div>
                  <Field
                    label="Meta de Orçamento / Valor de Venda"
                    error={errors.total_sale?.message}
                  >
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">
                        {watchCurrency === "BRL"
                          ? "R$"
                          : watchCurrency === "USD"
                            ? "$"
                            : watchCurrency === "EUR"
                              ? "€"
                              : "£"}
                      </span>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="pl-10"
                        {...register("total_sale", { valueAsNumber: true })}
                      />
                    </div>
                  </Field>
                </div>
              )}

              {/* STEP 3: Revisão */}
              {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="rounded-xl border border-border bg-surface-alt/20 p-6">
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
                      <Plane className="h-5 w-5 text-brand" /> {watchTitle}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          {watchDestination || "Sem destino definido"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          {isNewClientMode
                            ? watch("new_client_name") || "Novo Cliente"
                            : selectedClient?.full_name || "Sem cliente"}
                        </span>
                      </div>
                      {((watchTravelStart && watchTravelStart.trim() !== "") ||
                        (watchTravelEnd && watchTravelEnd.trim() !== "")) && (
                        <div className="flex items-center gap-2 col-span-full">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Ida e Volta:</span>
                          <span className="font-medium text-foreground">
                            {watchTravelStart && watchTravelStart.trim() !== ""
                              ? new Date(watchTravelStart + "T00:00:00").toLocaleDateString("pt-BR")
                              : "Indefinido"}{" "}
                            →{" "}
                            {watchTravelEnd && watchTravelEnd.trim() !== ""
                              ? new Date(watchTravelEnd + "T00:00:00").toLocaleDateString("pt-BR")
                              : "Indefinido"}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Status:</span>
                        <span className="font-medium text-foreground uppercase tracking-widest text-[10px] bg-surface-alt px-2 py-0.5 rounded">
                          {watchStatus}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Venda:</span>
                        <span className="font-bold text-brand">
                          {watchCurrency}{" "}
                          {(watchTotalSale || 0).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-brand/20 bg-brand/5 p-4 text-sm text-muted-foreground">
                    <span className="font-semibold text-brand">Tudo certo!</span> Você poderá
                    adicionar passageiros, voos, vouchers e contratos após criar o roteiro.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
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
                  {submitting ? "CRIANDO..." : "✈ CRIAR ROTEIRO"}
                </PrimaryButton>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
