import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Building2, Percent, PhoneCall, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton, Sheet, StatusBadge } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agency/$slug/suppliers")({
  head: () => ({ meta: [{ title: "Comissões e Fornecedores · TravelOS" }] }),
  component: SuppliersPage,
});

type Supplier = {
  id: string; name: string; legal_name: string | null; kind: string;
  document: string | null; email: string | null; phone: string | null;
  commission_rate: number; is_active: boolean;
};

function SuppliersPage() {
  const { agency } = useAgency();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["suppliers", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name, legal_name, kind, document, email, phone, commission_rate, is_active")
        .eq("agency_id", agency!.id)
        .order("name");
      if (error) throw error;
      return data as unknown as Supplier[];
    },
  });

  return (
    <>
      <PageHeader
        title="Painel B2B: Fornecedores e Comissionamentos"
        description="Gerencie Operadoras, Hotéis e Cias Aéreas. Defina o seu markup e controle seus acordos de SLA (Acordo de Nível de Serviço)."
        actions={
          <PrimaryButton onClick={() => setOpen(true)} className="gap-1.5 text-[11px] uppercase tracking-widest font-bold">
            <Plus className="h-4 w-4" /> Novo Fornecedor
          </PrimaryButton>
        }
      />

      {q.isLoading && <div className="text-sm text-muted-foreground p-8">Carregando cadeia de suprimentos…</div>}
      {q.data?.length === 0 && <EmptyState title="Sem fornecedores" description="Cadastre operadoras e hotéis para começar a montar pacotes." />}

      {q.data && q.data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
           {q.data.map((s) => (
              <div key={s.id} className={cn("group rounded-2xl border border-border/50 bg-surface p-5 shadow-sm transition-all hover:shadow-md", s.is_active ? "hover:border-brand/40" : "opacity-70")}>
                 <div className="flex justify-between items-start mb-4 border-b border-border/50 pb-4">
                    <div className="flex items-center gap-3">
                       <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-alt border border-border/50">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                       </div>
                       <div>
                          <h3 className="font-bold text-foreground leading-tight group-hover:text-brand transition-colors">{s.name}</h3>
                          <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">{s.kind}</div>
                       </div>
                    </div>
                    <StatusBadge tone={s.is_active ? "success" : "neutral"}>{s.is_active ? "Ativo" : "Inativo"}</StatusBadge>
                 </div>

                 <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                       <span className="flex items-center gap-2 text-muted-foreground"><PhoneCall className="h-3 w-3" /> Telefone</span>
                       <span className="font-medium">{s.phone || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                       <span className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3 w-3" /> E-mail (SLA)</span>
                       <span className="font-medium truncate max-w-[150px]" title={s.email || ""}>{s.email || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                       <span className="flex items-center gap-2 text-muted-foreground"><Building2 className="h-3 w-3" /> Documento</span>
                       <span className="font-mono text-xs">{s.document || "—"}</span>
                    </div>
                 </div>

                 <div className="pt-4 border-t border-border/50 flex justify-between items-center bg-brand/5 -mx-5 -mb-5 px-5 py-4 rounded-b-2xl">
                    <div className="text-xs font-bold text-brand uppercase tracking-widest flex items-center gap-1.5"><Percent className="h-3 w-3"/> Markup / Comissão Base</div>
                    <div className="font-mono text-lg font-bold text-brand">{Number(s.commission_rate).toFixed(2)}%</div>
                 </div>
              </div>
           ))}
        </div>
      )}

      {open && agency && (
        <NewSupplier agencyId={agency.id} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["suppliers", agency.id] }); }} />
      )}
    </>
  );
}

function NewSupplier({ agencyId, onClose, onCreated }: { agencyId: string; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [kind, setKind] = useState("operator");
  const [document, setDocument] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [commission, setCommission] = useState(0);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Fornecedor criado");
    onCreated();
  }

  return (
    <Sheet onClose={onClose} title="Novo Fornecedor B2B">
      <form onSubmit={submit} className="space-y-4">
        <div className="bg-surface-alt/30 border border-border/50 p-4 rounded-xl space-y-3">
           <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Dados Cadastrais</h3>
           <Field label="Nome fantasia (Visível em relatórios) *"><Input required value={name} onChange={(e) => setName(e.target.value)} /></Field>
           <div className="grid grid-cols-2 gap-3">
             <Field label="Razão social (Para Contratos)"><Input value={legalName} onChange={(e) => setLegalName(e.target.value)} /></Field>
             <Field label="CNPJ / Documento"><Input value={document} onChange={(e) => setDocument(e.target.value)} /></Field>
           </div>
           <Field label="Categoria do Fornecedor">
             <Select value={kind} onChange={(e) => setKind(e.target.value)}>
               <option value="operator">Operadora Turística</option>
               <option value="airline">Companhia Aérea</option>
               <option value="hotel">Rede de Hotéis / Acomodação</option>
               <option value="car_rental">Locadora de Veículos</option>
               <option value="insurance">Seguradora</option>
               <option value="transfer">Receptivo / Transfer</option>
               <option value="tour">DMC / Passeios Locais</option>
               <option value="visa">Despachante de Vistos</option>
               <option value="other">Outros</option>
             </Select>
           </Field>
        </div>

        <div className="bg-brand/5 border border-brand/20 p-4 rounded-xl space-y-3">
           <h3 className="text-xs font-bold uppercase tracking-widest text-brand mb-2">Contato e Acordos Comerciais</h3>
           <div className="grid grid-cols-2 gap-3">
             <Field label="Markup / Comissão Base (%)"><Input type="number" min={0} max={100} step="0.01" value={commission} onChange={(e) => setCommission(+e.target.value || 0)} className="h-10 text-lg font-mono font-bold text-brand" /></Field>
             <Field label="Telefone / SLA Helpdesk"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
           </div>
           <Field label="E-mail (Financeiro / Reservas)"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
           <Field label="Anotações (Condições Especiais)"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: Faturamento 30 dias. Contato do gerente da conta: João." /></Field>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
          <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>{submitting ? "Gravando Acordo…" : "Criar Fornecedor"}</PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
