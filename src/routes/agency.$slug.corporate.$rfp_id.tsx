import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, CheckCircle2, Clock, Send, Users, Building2, MapPin, DollarSign, Edit, AlertCircle, CheckSquare, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { toast } from "sonner";
import { useState } from "react";
import { PrimaryButton, GhostButton, Textarea, Input, Select, StatusBadge, fmtDate } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/corporate/$rfp_id")({
  head: () => ({ meta: [{ title: "RFP Detail · TravelOS" }] }),
  component: RfpDetailPage,
});

const STATUS_STEPS = ["new", "scoping", "quoting", "negotiating", "approved"];

function RfpDetailPage() {
  const { slug, rfp_id } = useParams({ from: "/agency/$slug/corporate/$rfp_id" });
  const { agency } = useAgency();
  const qc = useQueryClient();
  const [addingOption, setAddingOption] = useState(false);
  const [newOptTitle, setNewOptTitle] = useState("");
  const [newOptPrice, setNewOptPrice] = useState("");
  const [newOptDesc, setNewOptDesc] = useState("");

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["corporate-rfp", rfp_id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("corporate_rfps")
        .select("*, client:corporate_clients(company_name)")
        .eq("id", rfp_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const updateMut = useMutation({
    mutationFn: async (patch: any) => {
      const { error } = await (supabase as any).from("corporate_rfps").update(patch).eq("id", rfp_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["corporate-rfp", rfp_id] }),
  });

  if (q.isLoading) return <div className="p-8 text-muted-foreground">Carregando...</div>;
  if (!q.data) return <div className="p-8 text-danger">RFP não encontrada.</div>;

  const rfp = q.data;
  const options = rfp.proposed_options || [];

  function addOption() {
    if(!newOptTitle || !newOptPrice) return;
    const next = [...options, { 
      id: crypto.randomUUID(), 
      title: newOptTitle, 
      price: parseFloat(newOptPrice), 
      description: newOptDesc 
    }];
    updateMut.mutate({ proposed_options: next });
    setAddingOption(false);
    setNewOptTitle(""); setNewOptPrice(""); setNewOptDesc("");
  }

  function removeOption(id: string) {
    if(!confirm("Remover opção?")) return;
    updateMut.mutate({ proposed_options: options.filter((o: any) => o.id !== id) });
  }

  const currentStepIndex = STATUS_STEPS.indexOf(rfp.status);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="p-4 md:p-8">
        <Link to="/agency/$slug/corporate" params={{ slug }} className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-brand transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para RFPs
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 bg-surface p-6 rounded-2xl border border-border">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">RFP-{rfp.id.split('-')[0]}</span>
              <StatusBadge tone={rfp.status === 'approved' ? 'success' : rfp.status === 'lost' ? 'danger' : 'neutral'}>
                {rfp.status}
              </StatusBadge>
            </div>
            <h1 className="text-2xl font-bold">{rfp.title || "Solicitação de Orçamento"}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2">
              <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4"/> {rfp.client?.company_name}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
             <Select 
               value={rfp.status} 
               onChange={(e) => updateMut.mutate({ status: e.target.value })}
               className="h-9 w-48 text-xs font-medium"
             >
               <option value="new">Novo / Recebido</option>
               <option value="scoping">Definindo Escopo</option>
               <option value="quoting">Cotando Fornecedores</option>
               <option value="negotiating">Em Negociação</option>
               <option value="approved">Aprovado (Ganho)</option>
               <option value="lost">Perdido / Recusado</option>
             </Select>
             {rfp.status === 'negotiating' && (
                <PrimaryButton className="h-9 text-xs gap-1.5 bg-success hover:bg-success/90 text-success-foreground border-none" onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/p/corporate/approve?token=${rfp.approval_token}`);
                  toast.success("Link de aprovação copiado!");
                }}>
                  <Send className="w-3.5 h-3.5" /> Link do Cliente
                </PrimaryButton>
             )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-8 mb-8 px-2">
          <div className="flex items-center justify-between relative">
             <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-surface-alt rounded-full overflow-hidden">
               <div 
                 className="h-full bg-primary transition-all duration-500 ease-in-out" 
                 style={{ width: currentStepIndex >= 0 ? `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` : '0%' }}
               />
             </div>
             {STATUS_STEPS.map((step, idx) => {
               const isCompleted = currentStepIndex >= idx;
               const isCurrent = currentStepIndex === idx;
               return (
                 <div key={step} className={`relative flex flex-col items-center gap-2 z-10 ${isCompleted ? 'text-primary' : 'text-muted-foreground'}`}>
                   <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-background ${isCompleted ? 'bg-primary text-primary-foreground' : 'bg-surface-alt'}`}>
                     {isCompleted && !isCurrent ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                   </div>
                   <span className="text-[10px] uppercase tracking-widest font-bold bg-background px-1">{step}</span>
                 </div>
               )
             })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface border border-border p-6 rounded-2xl">
               <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><CheckSquare className="w-4 h-4 text-brand" /> Requisitos & Escopo</h3>
               
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-surface-alt/50 p-3 rounded-lg">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5"><MapPin className="w-3 h-3"/> Destino</div>
                    <div className="font-medium text-sm">{rfp.destination || '—'}</div>
                  </div>
                  <div className="bg-surface-alt/50 p-3 rounded-lg">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5"><Users className="w-3 h-3"/> Pax</div>
                    <div className="font-medium text-sm">{rfp.pax_count} pessoas</div>
                  </div>
                  <div className="bg-surface-alt/50 p-3 rounded-lg">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5"><DollarSign className="w-3 h-3"/> Budget Estimado</div>
                    <div className="font-medium text-sm">{rfp.budget_estimated ? `R$ ${rfp.budget_estimated}` : 'Aberto'}</div>
                  </div>
                  <div className="bg-surface-alt/50 p-3 rounded-lg">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5"><Clock className="w-3 h-3"/> Viagem</div>
                    <div className="font-medium text-sm truncate">{rfp.travel_dates ? JSON.stringify(rfp.travel_dates) : '—'}</div>
                  </div>
               </div>

               <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed p-4 bg-surface-alt/30 rounded-xl border border-border/50">
                 {typeof rfp.requirements === 'string' ? rfp.requirements : JSON.stringify(rfp.requirements, null, 2)}
               </div>
            </div>

            <div className="bg-surface border border-border p-6 rounded-2xl">
               <div className="flex items-center justify-between mb-6">
                 <h3 className="text-sm font-semibold flex items-center gap-2"><DollarSign className="w-4 h-4 text-brand" /> Opções Propostas</h3>
                 {!addingOption && rfp.status !== 'approved' && (
                   <GhostButton className="h-8 text-xs gap-1.5" onClick={() => setAddingOption(true)}>
                     <Plus className="w-3.5 h-3.5" /> Nova Opção
                   </GhostButton>
                 )}
               </div>

               {addingOption && (
                 <div className="bg-surface-alt/50 border border-brand/30 p-4 rounded-xl mb-4 space-y-3">
                   <div className="grid grid-cols-3 gap-3">
                     <div className="col-span-2">
                       <label className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1 block">Título da Opção</label>
                       <Input value={newOptTitle} onChange={e => setNewOptTitle(e.target.value)} placeholder="Ex: Voo LATAM + Hotel Ibis" />
                     </div>
                     <div>
                       <label className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1 block">Valor Total</label>
                       <Input type="number" value={newOptPrice} onChange={e => setNewOptPrice(e.target.value)} placeholder="0.00" />
                     </div>
                   </div>
                   <div>
                     <label className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1 block">Detalhes</label>
                     <Textarea value={newOptDesc} onChange={e => setNewOptDesc(e.target.value)} rows={2} />
                   </div>
                   <div className="flex justify-end gap-2 pt-2">
                     <GhostButton className="h-8 text-xs" onClick={() => setAddingOption(false)}>Cancelar</GhostButton>
                     <PrimaryButton className="h-8 text-xs" onClick={addOption}>Adicionar</PrimaryButton>
                   </div>
                 </div>
               )}

               <div className="space-y-4">
                 {options.length === 0 && !addingOption && (
                   <div className="text-center p-6 border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm font-medium">
                     Nenhuma cotação adicionada ainda.
                   </div>
                 )}
                 {options.map((opt: any) => (
                   <div key={opt.id} className={`p-4 rounded-xl border ${rfp.approved_option_id === opt.id ? 'bg-success/5 border-success/30 ring-1 ring-success/20' : 'bg-surface border-border'} relative group`}>
                     {rfp.approved_option_id === opt.id && (
                       <div className="absolute top-4 right-4 text-success font-bold text-[10px] uppercase tracking-widest flex items-center gap-1">
                         <CheckCircle2 className="w-3.5 h-3.5" /> Aprovada
                       </div>
                     )}
                     <div className="font-bold text-base mb-1 pr-24">{opt.title}</div>
                     <div className="text-brand font-semibold text-sm mb-3">R$ {opt.price?.toLocaleString('pt-BR')}</div>
                     <div className="text-sm text-muted-foreground whitespace-pre-wrap">{opt.description}</div>
                     
                     <div className="mt-4 pt-3 border-t border-border/50 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => removeOption(opt.id)} className="text-xs font-medium text-danger hover:underline">Remover</button>
                       {rfp.status !== 'approved' && (
                         <button onClick={() => updateMut.mutate({ approved_option_id: opt.id, status: 'approved' })} className="text-xs font-medium text-success hover:underline">Marcar como Aprovada</button>
                       )}
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-surface border border-border p-5 rounded-2xl">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Anotações Internas</h3>
              <Textarea 
                placeholder="Anotações visíveis apenas para a agência..."
                className="w-full h-40 text-sm resize-none border-transparent bg-surface-alt focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
