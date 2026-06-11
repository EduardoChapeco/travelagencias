import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  X, Check, ChevronRight, ChevronLeft, User, Building2, Phone, MapPin
} from "lucide-react";
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton } from "@/components/ui/form";
import { toast } from "sonner";

const STEPS = ["Perfil", "Contato", "Endereço e Classificação", "Revisão"];

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

  // Form State
  const [kind, setKind] = useState<"individual" | "company">("individual");
  const [fullName, setFullName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [document, setDocument] = useState("");
  const [birthDate, setBirthDate] = useState("");
  
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");

  const handleNext = () => {
    if (step === 0 && (!fullName || fullName.length < 3)) {
      toast.error("O nome deve ter no mínimo 3 caracteres.");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  async function submit() {
    setSubmitting(true);
    const { data: u } = await supabase.auth.getUser();
    
    // Parse tags safely
    const parsedTags = tags.split(",").map(t => t.trim()).filter(Boolean);

    const { error } = await supabase.from("clients").insert({
      agency_id: agencyId,
      kind,
      full_name: fullName,
      legal_name: legalName || null,
      document: document || null,
      email: email || null,
      phone: phone || null,
      birth_date: birthDate || null,
      notes: notes || null,
      tags: (parsedTags.length > 0 ? parsedTags : null) as any,
      owner_id: u.user?.id ?? null,
    });

    if (error) {
      toast.error(error.message || "Erro ao criar cliente.");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    toast.success("Cliente criado com sucesso!");
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-border bg-surface animate-in slide-in-from-right duration-300" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface-alt/30 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-foreground">Novo Cliente</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Cadastre passageiros ou contas corporativas.</p>
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
            
            {/* STEP 0: Perfil */}
            {step === 0 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex gap-4">
                  <div 
                    onClick={() => setKind("individual")}
                    className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-colors ${kind === 'individual' ? 'border-brand bg-brand/5' : 'border-border/50 bg-surface hover:border-brand/40'}`}
                  >
                    <User className={`h-8 w-8 mb-2 ${kind === 'individual' ? 'text-brand' : 'text-muted-foreground'}`} />
                    <span className={`font-bold ${kind === 'individual' ? 'text-brand' : 'text-foreground'}`}>Pessoa Física</span>
                  </div>
                  <div 
                    onClick={() => setKind("company")}
                    className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-colors ${kind === 'company' ? 'border-brand bg-brand/5' : 'border-border/50 bg-surface hover:border-brand/40'}`}
                  >
                    <Building2 className={`h-8 w-8 mb-2 ${kind === 'company' ? 'text-brand' : 'text-muted-foreground'}`} />
                    <span className={`font-bold ${kind === 'company' ? 'text-brand' : 'text-foreground'}`}>Empresa</span>
                  </div>
                </div>

                <Field label={kind === "individual" ? "Nome Completo *" : "Nome Fantasia *"}>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={kind === "individual" ? "Ex: João da Silva" : "Ex: Acme Corp"} autoFocus />
                </Field>
                
                {kind === "company" && (
                  <Field label="Razão Social">
                    <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Ex: Acme Corporation LTDA" />
                  </Field>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Field label={kind === "individual" ? "CPF / Passaporte" : "CNPJ"}>
                    <Input value={document} onChange={(e) => setDocument(e.target.value)} placeholder={kind === "individual" ? "123.456.789-00" : "00.000.000/0001-00"} />
                  </Field>
                  {kind === "individual" && (
                    <Field label="Data de Nascimento">
                      <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                    </Field>
                  )}
                </div>
              </div>
            )}

            {/* STEP 1: Contato */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <Field label="E-mail Principal">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@exemplo.com" />
                </Field>
                <Field label="Telefone / WhatsApp">
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+55 11 99999-9999" />
                </Field>
                <div className="rounded-xl border border-border bg-surface-alt/40 p-4 mt-2">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Mais opções de contato e redes sociais poderão ser cadastradas na tela de detalhes do cliente após a criação.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 2: Endereço e Classificação */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <Field label="Tags de Classificação (separadas por vírgula)">
                  <Input 
                    value={tags} 
                    onChange={(e) => setTags(e.target.value)} 
                    placeholder="VIP, Corporativo, Preferência Janela..." 
                  />
                  {tags && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {tags.split(",").map((t, i) => t.trim() && (
                        <span key={i} className="bg-surface-alt border border-border px-2 py-0.5 rounded text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          {t.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </Field>
                
                <Field label="Anotações e Preferências">
                  <Textarea 
                    rows={4}
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
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
                    {kind === "individual" ? (
                      <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                        <User className="h-6 w-6" />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                        <Building2 className="h-6 w-6" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-bold text-foreground">{fullName}</h3>
                      {kind === "company" && legalName && <p className="text-xs text-muted-foreground">{legalName}</p>}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-6 text-sm">
                    {document && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-semibold text-xs uppercase tracking-widest">{kind === "individual" ? "Doc:" : "CNPJ:"}</span>
                        <span className="font-mono">{document}</span>
                      </div>
                    )}
                    {birthDate && kind === "individual" && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-semibold text-xs uppercase tracking-widest">Nasc:</span>
                        <span>{new Date(birthDate).toLocaleDateString('pt-BR')}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 col-span-full">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">{phone || "S/ Telefone"}</span>
                      <span className="text-muted-foreground mx-2">•</span>
                      <span className="font-medium text-foreground">{email || "S/ E-mail"}</span>
                    </div>

                    {tags && (
                      <div className="col-span-full mt-2">
                        <div className="flex flex-wrap gap-1.5">
                          {tags.split(",").map((t, i) => t.trim() && (
                            <span key={i} className="bg-brand/10 text-brand border border-brand/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                              {t.trim()}
                            </span>
                          ))}
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
                {submitting ? "CRIANDO..." : "CRIAR CLIENTE"}
              </PrimaryButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
