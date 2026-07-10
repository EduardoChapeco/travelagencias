import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  Building2,
  Briefcase,
  MapPin,
  Calendar,
  CircleDollarSign,
} from "lucide-react";
import { Field } from "@/components/ui/field";
import { FormInput as Input } from "@/components/ui/input";
import { NativeSelect as Select } from "@/components/ui/select";
import { FormTextarea as Textarea } from "@/components/ui/textarea";
import { PrimaryButton, GhostButton } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SheetPage } from "@/components/ui/sheet";
import { toast } from "sonner";

const STEPS = ["Identificação", "Roteiro & Datas", "Orçamento & SLA", "Revisão"];

export function NewCorporateRfpWizard({
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

  // Form State
  const [clientId, setClientId] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");

  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");

  const [budget, setBudget] = useState("");
  const [description, setDescription] = useState("");

  const clientsQ = useQuery({
    queryKey: ["clients-companies", agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name, document")
        .eq("agency_id", agencyId)
        .eq("kind", "company")
        .is("deleted_at", null)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const handleNext = () => {
    if (step === 0 && (!clientId || !requesterName || !requesterEmail)) {
      toast.error("Preencha a empresa e os dados do solicitante.");
      return;
    }
    if (step === 1 && (!title || !destination || !departureDate)) {
      toast.error("Preencha o título, destino e data de partida.");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  async function submit() {
    setSubmitting(true);

    const payload = {
      agency_id: agencyId,
      client_id: clientId,
      requester_name: requesterName,
      requester_email: requesterEmail,
      title,
      destination,
      departure_date: departureDate,
      return_date: returnDate || null,
      budget: budget ? Number(budget) : null,
      description: description || null,
      status: "pending",
    };

    const { error } = await (supabase as any).from("corporate_rfps").insert(payload);

    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("RFP corporativa criada e registrada!");
    onCreated();
  }

  const selectedClient = clientsQ.data?.find((c) => c.id === clientId);

  return (
    <SheetPage
      isOpen={true}
      onClose={onClose}
      title="Nova Requisição (RFP) Corporativa"
      contentClassName="flex flex-col flex-1 min-h-0 overflow-hidden"
    >
      <div className="px-6 pt-4 pb-2 shrink-0">
        <p className="text-xs text-muted-foreground">
          Módulo B2B: Cotação estruturada para clientes empresariais.
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
      <div className="flex-1 overflow-y-auto p-6 bg-surface/30 min-h-0">
        <div className="mx-auto max-w-xl space-y-6">
          {/* STEP 0: Identificação */}
          {step === 0 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <Field label="Empresa Cliente (CNPJ) *">
                <SearchableSelect
                  value={clientId}
                  onChange={setClientId}
                  placeholder="Buscar empresa cadastrada..."
                  searchPlaceholder="Razão social, CNPJ..."
                  options={clientsQ.data?.map((c) => ({
                    value: c.id,
                    label: c.full_name,
                    sublabel: c.document ?? undefined,
                  }))}
                  loading={clientsQ.isLoading}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nome do Solicitante (Passageiro) *">
                  <Input
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    placeholder="Ex: João Silva"
                  />
                </Field>
                <Field label="E-mail Corporativo do Solicitante *">
                  <Input
                    type="email"
                    value={requesterEmail}
                    onChange={(e) => setRequesterEmail(e.target.value)}
                    placeholder="joao.silva@empresa.com"
                  />
                </Field>
              </div>
            </div>
          )}

          {/* STEP 1: Roteiro & Datas */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <Field label="Título da Requisição *">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Reunião Anual SP 2026"
                  className="font-semibold text-lg"
                  autoFocus
                />
              </Field>
              <Field label="Destino da Viagem *">
                <Input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Ex: São Paulo, SP"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Data de Partida *">
                  <Input
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                  />
                </Field>
                <Field label="Data de Retorno (Opcional)">
                  <Input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* STEP 2: Orçamento & SLA */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <Field label="Orçamento Máximo Aprovado (R$ / Opcional)">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="0.00"
                  className="text-lg font-mono text-brand"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Ao definir o orçamento, o sistema alertará se a cotação violar a política da
                  empresa.
                </p>
              </Field>

              <Field label="Descritivo / Necessidades Especiais">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  placeholder="Quais as necessidades de voo? Preferência de assento? Hotel precisa ter sala de reuniões?"
                />
              </Field>
            </div>
          )}

          {/* STEP 3: Revisão */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="rounded-[var(--radius-card)] border border-border bg-surface-alt/20 p-6">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
                  <Briefcase className="h-5 w-5 text-brand" /> {title}
                </h3>

                <div className="grid grid-cols-2 gap-y-4 text-sm mt-4 border-t border-border pt-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" /> Empresa
                    </div>
                    <div className="font-medium">{selectedClient?.full_name || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1 uppercase tracking-widest font-semibold">
                      Solicitante
                    </div>
                    <div className="font-medium">
                      {requesterName}{" "}
                      <span className="text-xs text-muted-foreground">({requesterEmail})</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> Destino
                    </div>
                    <div className="font-medium">{destination}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> Datas
                    </div>
                    <div className="font-medium">
                      {departureDate ? new Date(departureDate).toLocaleDateString("pt-BR") : "—"}{" "}
                      {returnDate ? `até ${new Date(returnDate).toLocaleDateString("pt-BR")}` : ""}
                    </div>
                  </div>
                </div>

                {budget && (
                  <div className="mt-4 p-4 bg-brand/5 border border-brand/20 rounded-2xl flex justify-between items-center">
                    <div className="flex items-center gap-2 text-brand font-semibold text-sm">
                      <CircleDollarSign className="h-4 w-4" /> Orçamento Limite
                    </div>
                    <div className="font-mono font-bold text-brand text-lg">
                      R$ {Number(budget).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between border-t border-border bg-surface-alt/30 px-6 py-4 shrink-0">
        <GhostButton onClick={handleBack} disabled={step === 0} className="gap-2 w-28">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </GhostButton>

        <div className="flex gap-3">
          <GhostButton onClick={onClose} disabled={submitting}>
            Cancelar
          </GhostButton>
          {step < STEPS.length - 1 ? (
            <PrimaryButton onClick={handleNext} className="gap-2 w-32">
              Próximo <ChevronRight className="h-4 w-4" />
            </PrimaryButton>
          ) : (
            <PrimaryButton
              onClick={submit}
              disabled={submitting}
              className="w-56 font-bold tracking-wider"
            >
              {submitting ? "CRIANDO..." : "ABRIR REQUISIÇÃO (RFP)"}
            </PrimaryButton>
          )}
        </div>
      </div>
    </SheetPage>
  );
}
