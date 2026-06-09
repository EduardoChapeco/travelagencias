import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus, CheckCircle2, AlertCircle, FileText, Globe, BookUser, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton, Sheet, StatusBadge, fmtDate, money } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agency/$slug/visas")({
  head: () => ({ meta: [{ title: "Tracker Consular · TravelOS" }] }),
  component: VisasPage,
});

type Visa = {
  id: string; country: string; visa_type: string | null; status: string;
  travel_date: string | null; price: number; agency_handling: boolean;
  passport_number: string | null; client_id: string | null; trip_id: string | null;
  notes: string | null; clients: { full_name: string } | null;
};

const STATUS_INFO: Record<string, { label: string; color: string; bg: string }> = {
  pending_docs: { label: "Aguardando Documentos", color: "text-warning-text", bg: "bg-warning-bg" },
  docs_ready: { label: "Documentação Pronta", color: "text-info-text", bg: "bg-info-bg" },
  submitted: { label: "Em Análise Consular", color: "text-brand", bg: "bg-brand/10" },
  approved: { label: "Visto Aprovado", color: "text-success", bg: "bg-success/10" },
  denied: { label: "Visto Negado", color: "text-danger", bg: "bg-danger/10" },
  cancelled: { label: "Cancelado", color: "text-muted-foreground", bg: "bg-surface-alt" },
};

function VisasPage() {
  const { agency } = useAgency();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["visas", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visa_requests")
        .select(`
          id, country, visa_type, status, travel_date, price, agency_handling, 
          passport_number, client_id, trip_id, notes,
          clients(full_name)
        `)
        .eq("agency_id", agency!.id)
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return data as Visa[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const now = new Date().toISOString();
      const patch = {
        status,
        submitted_at: status === "submitted" ? now : null,
        approved_at: status === "approved" ? now : null,
        denied_at: status === "denied" ? now : null,
      };
      const { error } = await supabase.from("visa_requests").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Progresso consular atualizado");
      qc.invalidateQueries({ queryKey: ["visas", agency?.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar status"),
  });

  return (
    <div className="flex h-[calc(100vh-4.5rem)] flex-col overflow-hidden">
      <PageHeader
        title="Tracker Consular"
        description="Acompanhamento rigoroso de Burocracia, Passaportes e Vistos Despachantes."
        actions={
          <PrimaryButton onClick={() => setOpen(true)} className="gap-2 text-[11px] uppercase tracking-widest font-bold">
            <Plus className="h-4 w-4" /> Novo Processo
          </PrimaryButton>
        }
      />

      {q.isLoading && (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      )}

      {q.data?.length === 0 && <EmptyState title="Sem processos consulares" description="Inicie um pedido de Visto para um cliente." />}

      {q.data && q.data.length > 0 && (
        <div className="mt-4 flex-1 overflow-y-auto px-1 no-scrollbar pb-10">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {q.data.map((v) => {
               const statusStyle = STATUS_INFO[v.status] || STATUS_INFO.pending_docs;
               
               return (
                  <div key={v.id} className="group flex flex-col justify-between rounded-xl border border-border/50 bg-surface p-5 shadow-sm transition-all hover:border-brand/30 hover:shadow-md">
                     <div>
                        <div className="mb-4 flex items-start justify-between">
                           <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-alt ring-1 ring-border shadow-sm">
                                 <Globe className="h-5 w-5 text-brand" />
                              </div>
                              <div>
                                 <div className="font-bold text-foreground text-sm">{v.country}</div>
                                 <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{v.visa_type || "Geral"}</div>
                              </div>
                           </div>
                        </div>

                        <div className="space-y-3 mb-5">
                           <div className="flex items-center gap-2">
                              <BookUser className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{v.clients?.full_name || "Cliente sem cadastro"}</span>
                           </div>
                           <div className="flex justify-between items-center bg-surface-alt/30 p-2.5 rounded-lg border border-border/50">
                              <span className="text-xs text-muted-foreground">Passaporte</span>
                              <span className="font-mono text-xs font-semibold">{v.passport_number || "A Confirmar"}</span>
                           </div>
                        </div>
                     </div>

                     <div className="pt-4 border-t border-border/50">
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Progresso do Visto</div>
                        <Select 
                          value={v.status} 
                          onChange={(e) => updateStatus.mutate({ id: v.id, status: e.target.value })}
                          className={cn("h-8 text-xs font-semibold border-none font-sans", statusStyle.bg, statusStyle.color)}
                        >
                          {Object.entries(STATUS_INFO).map(([k, info]) => (
                             <option key={k} value={k}>{info.label}</option>
                          ))}
                        </Select>
                     </div>
                  </div>
               );
            })}
          </div>
        </div>
      )}

      {open && agency && (
        <NewVisa agencyId={agency.id} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["visas", agency.id] }); }} />
      )}
    </div>
  );
}

function NewVisa({ agencyId, onClose, onCreated }: { agencyId: string; onClose: () => void; onCreated: () => void }) {
  const [country, setCountry] = useState("");
  const [type, setType] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [passport, setPassport] = useState("");
  const [price, setPrice] = useState(0);
  const [clientId, setClientId] = useState("");
  const [handling, setHandling] = useState(true);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const clientsQ = useQuery({
     queryKey: ["clients-min", agencyId],
     queryFn: async () => {
        const { data } = await supabase.from("clients").select("id, full_name, document").eq("agency_id", agencyId).order("full_name");
        return data || [];
     }
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) return toast.error("Por favor, selecione um cliente.");
    setSubmitting(true);
    const { error } = await supabase.from("visa_requests").insert({
      agency_id: agencyId, country, visa_type: type || null, travel_date: travelDate || null,
      passport_number: passport || null, price, agency_handling: handling, notes: notes || null,
      client_id: clientId || null, status: "pending_docs"
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Processo Consular Iniciado");
    onCreated();
  }

  return (
    <Sheet onClose={onClose} title="Novo Processo Consular">
      <form onSubmit={submit} className="space-y-4 p-2">
        
        <div className="bg-brand/5 border border-brand/20 p-4 rounded-xl space-y-3">
           <h3 className="text-xs font-bold uppercase tracking-widest text-brand mb-2">Dados do Requerente</h3>
           <Field label="Cliente (CRM) *">
             <Select required value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Selecione o Titular...</option>
                {clientsQ.data?.map(c => <option key={c.id} value={c.id}>{c.full_name} ({c.document || "S/Doc"})</option>)}
             </Select>
           </Field>
           <Field label="Nº do Passaporte (Opcional agora)"><Input value={passport} onChange={(e) => setPassport(e.target.value)} placeholder="AB123456" /></Field>
        </div>

        <div className="bg-surface-alt/30 border border-border/50 p-4 rounded-xl space-y-3">
           <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Alvo do Visto</h3>
           <div className="grid grid-cols-2 gap-3">
              <Field label="País de destino *"><Input required value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Estados Unidos" /></Field>
              <Field label="Tipo de visto"><Input value={type} onChange={(e) => setType(e.target.value)} placeholder="B1/B2 (Turismo)" /></Field>
           </div>
           <Field label="Data Prevista da Viagem"><Input type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} /></Field>
        </div>

        <div className="grid grid-cols-2 gap-3 px-1">
          <Field label="Taxa / Preço do Serviço"><Input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(+e.target.value || 0)} /></Field>
          <Field label="Quem processa o DS?">
            <Select value={handling ? "agency" : "client"} onChange={(e) => setHandling(e.target.value === "agency")}>
              <option value="agency">Agência (Despachante)</option>
              <option value="client">O próprio passageiro</option>
            </Select>
          </Field>
        </div>

        <Field label="Anotações / Login Consular">
           <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Use este espaço para salvar o Application ID do CEAC, Senhas provisórias..." className="min-h-[100px] font-mono text-xs" />
        </Field>
        
        <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
          <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>{submitting ? "Iniciando Processo…" : "Abrir Processo"}</PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
