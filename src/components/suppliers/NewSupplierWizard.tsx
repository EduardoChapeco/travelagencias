import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  X, Check, ChevronRight, ChevronLeft, Building2, Percent, PhoneCall, Mail, FileText
} from "lucide-react";
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton } from "@/components/ui/form";
import { toast } from "sonner";

const STEPS = ["Identidade B2B", "Comercial & Markups", "Contatos (SLA)"];

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

  // Form State
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [kind, setKind] = useState("operator");
  const [document, setDocument] = useState("");
  
  const [commission, setCommission] = useState(0);
  // Optional: multiple markups
  const [notes, setNotes] = useState("");
  
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleNext = () => {
    if (step === 0 && !name) {
      toast.error("O Nome Fantasia é obrigatório.");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  async function submit() {
    setSubmitting(true);
    
    const { error } = await supabase.from("suppliers").insert({
      agency_id: agencyId,
      name,
      legal_name: legalName || null,
      kind: kind as never,
      document: document || null,
      email: email || null,
      phone: phone || null,
      commission_rate: commission,
      notes: notes || null,
      is_active: true
    });
    
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Fornecedor / Operador cadastrado com sucesso!");
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-border bg-surface animate-in slide-in-from-right duration-300" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface-alt/30 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-foreground">Novo Parceiro de Negócios (B2B)</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Cadastre operadoras, hotéis e consolidadoras com seus acordos.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-surface-alt hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

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
            
            {/* STEP 0: Identidade */}
            {step === 0 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <Field label="Nome Fantasia (Visível nos Relatórios) *">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: CVC Viagens" autoFocus className="text-lg font-semibold" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Razão Social (Contratos)">
                    <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="CVC Brasil Operadora Ltda" />
                  </Field>
                  <Field label="CNPJ / Documento">
                    <Input value={document} onChange={(e) => setDocument(e.target.value)} placeholder="00.000.000/0001-00" />
                  </Field>
                </div>
                <Field label="Categoria Principal do Fornecedor">
                  <Select value={kind} onChange={(e) => setKind(e.target.value)}>
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

            {/* STEP 1: Markups */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="rounded-xl border border-brand/20 bg-brand/5 p-6">
                  <Field label="Comissão Base ou Markup Acordado (%)">
                    <Input 
                      type="number" 
                      min="0" max="100" step="0.01" 
                      value={commission} 
                      onChange={(e) => setCommission(Number(e.target.value))} 
                      className="text-2xl font-mono text-brand h-12"
                    />
                    <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-widest">
                      Esta taxa será usada como padrão para calcular a rentabilidade dos pacotes deste fornecedor.
                    </p>
                  </Field>
                </div>

                <Field label="Política de Comissionamento & Condições">
                  <Textarea 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    rows={4} 
                    placeholder="Ex: Faturamento 30 dias. Aéreo com 8% e terrestre com 12%. Contato VIP: Roberto." 
                  />
                </Field>
              </div>
            )}

            {/* STEP 2: SLA e Contatos */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="E-mail de Reservas / Financeiro">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="reservas@fornecedor.com" className="pl-9" />
                    </div>
                  </Field>
                  <Field label="Telefone / SLA Helpdesk">
                    <div className="relative">
                      <PhoneCall className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0800 123 456" className="pl-9" />
                    </div>
                  </Field>
                </div>

                <div className="rounded-xl border border-border bg-surface-alt/20 p-5 mt-6">
                  <h4 className="text-sm font-semibold mb-3">Resumo B2B</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div><span className="text-muted-foreground block">Fornecedor:</span><strong className="text-foreground text-sm">{name || "—"}</strong></div>
                    <div><span className="text-muted-foreground block">Categoria:</span><strong className="text-foreground">{kind}</strong></div>
                    <div><span className="text-muted-foreground block">Comissão Geral:</span><strong className="text-brand font-mono text-sm">{commission}%</strong></div>
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
              <PrimaryButton onClick={submit} disabled={submitting} className="w-56 font-bold tracking-wider">
                {submitting ? "SALVANDO..." : "CADASTRAR PARCEIRO"}
              </PrimaryButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
