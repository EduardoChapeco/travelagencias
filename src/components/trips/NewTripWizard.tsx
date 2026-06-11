import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  X, Check, ChevronRight, ChevronLeft, Plane, User, MapPin, CalendarDays, DollarSign, Tag
} from "lucide-react";
import { Field, Input, Select, PrimaryButton, GhostButton } from "@/components/ui/form";
import { SheetPage } from "@/components/ui/sheet";
import { toast } from "sonner";

const STEPS = ["Destino e Datas", "Passageiros", "Financeiro e Status", "Revisão"];

export function NewTripWizard({
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
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [travelStart, setTravelStart] = useState("");
  const [travelEnd, setTravelEnd] = useState("");
  
  const [clientId, setClientId] = useState("");
  
  const [currency, setCurrency] = useState("BRL");
  const [totalSale, setTotalSale] = useState(0);
  const [status, setStatus] = useState<"planning" | "confirmed" | "in_progress" | "completed">("planning");

  const clientsQ = useQuery({
    queryKey: ["clients-pick", agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name, document")
        .eq("agency_id", agencyId)
        .order("full_name")
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const handleNext = () => {
    if (step === 0 && (!title || title.length < 3)) {
      toast.error("O título da viagem precisa ter pelo menos 3 caracteres.");
      return;
    }
    if (step === 0 && travelStart && travelEnd) {
      if (new Date(travelEnd) < new Date(travelStart)) {
        toast.error("A data de volta deve ser posterior à data de ida.");
        return;
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  async function submit() {
    setSubmitting(true);
    const { data: u } = await supabase.auth.getUser();
    
    const { data: tripData, error } = await supabase.from("trips").insert({
      agency_id: agencyId,
      title,
      destination: destination || null,
      travel_start: travelStart || null,
      travel_end: travelEnd || null,
      client_id: clientId || null,
      status,
      currency,
      total_sale: totalSale,
      owner_id: u.user?.id ?? null,
    }).select("id").single();

    if (error || !tripData) {
      toast.error(error?.message || "Erro ao criar viagem.");
      setSubmitting(false);
      return;
    }

    // If client was selected, auto-add them as the first passenger
    if (clientId) {
      const client = clientsQ.data?.find(c => c.id === clientId);
      if (client) {
        await supabase.from("trip_passengers").insert({
          agency_id: agencyId,
          trip_id: tripData.id,
          full_name: client.full_name,
          document: client.document || null,
        });
      }
    }

    setSubmitting(false);
    toast.success("Viagem criada com sucesso!");
    onCreated();
  }

  const selectedClient = clientsQ.data?.find(c => c.id === clientId);

  return (
    <SheetPage isOpen={true} onClose={onClose} title="Novo Roteiro de Viagem">
      <p className="text-xs text-muted-foreground mb-4">Gestão completa de viagens, orçamentos e passageiros.</p>

        {/* Stepper progress */}
        <div className="flex items-center justify-between border-b border-border bg-surface px-8 py-3">
          {STEPS.map((s, i) => (
            <div key={i} className={`flex items-center gap-2 ${i === step ? "opacity-100" : "opacity-40"}`}>
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                i < step ? "bg-success text-success-foreground" : i === step ? "bg-brand text-brand-foreground" : "bg-surface-alt text-muted-foreground"
              }`}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-xs font-semibold uppercase tracking-widest hidden md:block ${
                i < step ? "text-success" : i === step ? "text-brand" : "text-muted-foreground"
              }`}>{s}</span>
              {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground/30 mx-2" />}
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-surface/30">
          <div className="mx-auto max-w-xl space-y-6">
            
            {/* STEP 0: Destino e Datas */}
            {step === 0 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <Field label="Título do Roteiro *">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Férias em Cancún, Corporativo SP..." autoFocus />
                </Field>
                <Field label="Destino (País, Cidade ou Região)">
                  <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Ex: Cancún, México" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Data de Ida Prevista">
                    <Input type="date" value={travelStart} onChange={(e) => setTravelStart(e.target.value)} />
                  </Field>
                  <Field label="Data de Retorno Prevista">
                    <Input type="date" value={travelEnd} onChange={(e) => setTravelEnd(e.target.value)} />
                  </Field>
                </div>
              </div>
            )}

            {/* STEP 1: Passageiros */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="rounded-xl border border-border bg-surface-alt/40 p-5 text-sm text-muted-foreground">
                  O cliente responsável é aquele que realiza o pagamento ou responde pela viagem.
                  Se ele também viajar, será automaticamente adicionado como o primeiro passageiro do roteiro.
                </div>
                <Field label="Cliente Responsável (Opcional)">
                  <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                    <option value="">— Sem cliente ainda —</option>
                    {(clientsQ.data ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} {c.document ? `(${c.document})` : ""}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}

            {/* STEP 2: Financeiro */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Status Inicial">
                    <Select value={status} onChange={(e) => setStatus(e.target.value as any)}>
                      <option value="planning">Planejamento</option>
                      <option value="confirmed">Confirmada</option>
                      <option value="in_progress">Em andamento</option>
                      <option value="completed">Concluída</option>
                    </Select>
                  </Field>
                  <Field label="Moeda Principal">
                    <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                      <option value="BRL">BRL (Real)</option>
                      <option value="USD">USD (Dólar)</option>
                      <option value="EUR">EUR (Euro)</option>
                      <option value="GBP">GBP (Libra)</option>
                    </Select>
                  </Field>
                </div>
                <Field label="Meta de Orçamento / Valor de Venda">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">
                      {currency === "BRL" ? "R$" : currency === "USD" ? "$" : currency === "EUR" ? "€" : "£"}
                    </span>
                    <Input 
                      type="number" 
                      min={0} 
                      step="0.01" 
                      className="pl-10" 
                      value={totalSale} 
                      onChange={(e) => setTotalSale(parseFloat(e.target.value) || 0)} 
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
                    <Plane className="h-5 w-5 text-brand" /> {title}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">{destination || "Sem destino definido"}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">{selectedClient?.full_name || "Sem cliente"}</span>
                    </div>

                    {(travelStart || travelEnd) && (
                      <div className="flex items-center gap-2 col-span-full">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Ida e Volta:</span>
                        <span className="font-medium text-foreground">
                          {travelStart ? new Date(travelStart).toLocaleDateString('pt-BR') : "Indefinido"} 
                          {" "}→{" "} 
                          {travelEnd ? new Date(travelEnd).toLocaleDateString('pt-BR') : "Indefinido"}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium text-foreground uppercase tracking-widest text-[10px] bg-surface-alt px-2 py-0.5 rounded">
                        {status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Venda:</span>
                      <span className="font-bold text-brand">
                        {currency} {totalSale.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border bg-surface-alt/30 px-6 py-4">
          <GhostButton onClick={handleBack} disabled={step === 0} className="gap-2 w-28">
            <ChevronLeft className="h-4 w-4" /> Voltar
          </GhostButton>
          
          <div className="flex gap-3">
            <GhostButton onClick={onClose} disabled={submitting}>Cancelar</GhostButton>
            {step < STEPS.length - 1 ? (
              <PrimaryButton onClick={handleNext} className="gap-2 w-32">
                Próximo <ChevronRight className="h-4 w-4" />
              </PrimaryButton>
            ) : (
              <PrimaryButton onClick={submit} disabled={submitting} className="w-48 font-bold tracking-wider">
                {submitting ? "CRIANDO..." : "CRIAR ROTEIRO"}
              </PrimaryButton>
            )}
          </div>
        </div>
    </SheetPage>
  );
}
