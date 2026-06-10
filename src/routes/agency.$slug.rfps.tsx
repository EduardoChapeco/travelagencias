import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Briefcase, FileText, ArrowRight, User, Calendar, MapPin, Building2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton, Sheet, StatusBadge, money } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/rfps")({
  head: () => ({ meta: [{ title: "RFPs B2B · TravelOS" }] }),
  component: RfpsPage,
});

type Rfp = {
  id: string;
  company_name: string;
  passenger_name: string | null;
  destination: string;
  travel_dates: string | null;
  passengers_count: number;
  budget: number | null;
  status: string;
  trip_id: string | null;
  corporate_client_id: string | null;
};

const STATUS_INFO: Record<string, { label: string; tone: "info" | "warning" | "success" | "danger" | "neutral" }> = {
  pending: { label: "Nova Solicitação", tone: "warning" },
  quoted: { label: "Cotado", tone: "info" },
  approved: { label: "Aprovado pelo Cliente", tone: "success" },
  rejected: { label: "Declinado", tone: "danger" },
  converted: { label: "Convertido em Viagem", tone: "neutral" }
};

function RfpsPage() {
  const { agency, slug } = useAgency();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["rfps", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("corporate_rfps")
        .select("*")
        .eq("agency_id", agency!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Rfp[];
    },
  });

  const convertRfp = useMutation({
    mutationFn: async (rfp: Rfp) => {
      // 1. Create trip
      const { data: trip, error: tripError } = await supabase.from("trips").insert({
        agency_id: agency!.id,
        title: `Viagem Corp - ${rfp.passenger_name || rfp.company_name}`,
        destination: rfp.destination,
        status: "quote", // Starts as quote or confirmed? Starts as confirmed if approved
        budget: rfp.budget || 0,
      }).select("id").single();
      
      if (tripError) throw tripError;

      // 2. Update RFP
      const { error: rfpError } = await supabase.from("corporate_rfps").update({
        status: "converted",
        trip_id: trip.id
      }).eq("id", rfp.id);

      if (rfpError) throw rfpError;

      return trip.id;
    },
    onSuccess: (tripId) => {
      toast.success("RFP convertida em Viagem!");
      qc.invalidateQueries({ queryKey: ["rfps", agency?.id] });
      navigate({ to: "/agency/$slug/trips/$id", params: { slug, id: tripId } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao converter RFP")
  });

  const updateStatus = useMutation({
     mutationFn: async ({ id, status }: { id: string; status: string }) => {
        const { error } = await supabase.from("corporate_rfps").update({ status }).eq("id", id);
        if (error) throw error;
     },
     onSuccess: () => {
        toast.success("Status atualizado");
        qc.invalidateQueries({ queryKey: ["rfps", agency?.id] });
     }
  });

  return (
    <>
      <PageHeader
        title="Requests for Proposal (B2B)"
        description="Gestão de cotações corporativas e conversão em viagens de negócios."
        actions={
          <PrimaryButton onClick={() => setOpen(true)} className="gap-2 text-[11px] uppercase tracking-widest font-bold">
            <Plus className="h-4 w-4" /> Nova Cotação B2B
          </PrimaryButton>
        }
      />

      {q.isLoading && <div className="p-10 text-center text-sm text-muted-foreground">Carregando…</div>}
      {q.data?.length === 0 && <EmptyState title="Sem RFPs corporativos" description="Abra uma solicitação de cotação de viagens a negócios." />}

      {q.data && q.data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
           {q.data.map(rfp => {
              const info = STATUS_INFO[rfp.status] || STATUS_INFO.pending;
              return (
                 <div key={rfp.id} className="bg-surface border border-border/60 rounded-xl p-5 shadow-sm transition-all hover:border-brand/40 flex flex-col justify-between">
                    <div>
                       <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-2">
                             <div className="bg-surface-alt w-8 h-8 flex items-center justify-center rounded-lg ring-1 ring-border/50">
                                <Briefcase className="w-4 h-4 text-brand" />
                             </div>
                             <div>
                                <h3 className="font-bold text-foreground text-sm line-clamp-1">{rfp.company_name}</h3>
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">RFP Corporativo</div>
                             </div>
                          </div>
                          <StatusBadge tone={info.tone}>{info.label}</StatusBadge>
                       </div>

                       <div className="space-y-2 mb-6">
                          <div className="flex items-center gap-2 text-sm text-foreground">
                             <MapPin className="w-4 h-4 text-muted-foreground" /> {rfp.destination}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                             <User className="w-3.5 h-3.5" /> {rfp.passenger_name || "A Definir"} ({rfp.passengers_count} pax)
                          </div>
                          {rfp.travel_dates && (
                             <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                <Calendar className="w-3.5 h-3.5" /> {rfp.travel_dates}
                             </div>
                          )}
                          {rfp.budget && (
                             <div className="mt-2 text-xs font-mono font-semibold bg-brand/5 text-brand w-max px-2 py-1 rounded">
                                Budget: {money(rfp.budget)}
                             </div>
                          )}
                       </div>
                    </div>

                    <div className="pt-4 border-t border-border/50 flex gap-2">
                       {rfp.status !== "converted" ? (
                          <>
                             <Select 
                               value={rfp.status} 
                               onChange={(e) => updateStatus.mutate({ id: rfp.id, status: e.target.value })}
                               className="h-8 text-xs font-semibold"
                             >
                                <option value="pending">Pendente</option>
                                <option value="quoted">Cotado</option>
                                <option value="approved">Aprovado pelo Cliente</option>
                                <option value="rejected">Declinado</option>
                             </Select>
                             {rfp.status === "approved" && (
                                <PrimaryButton 
                                   onClick={() => convertRfp.mutate(rfp)} 
                                   disabled={convertRfp.isPending}
                                   className="h-8 text-xs font-bold gap-1 px-3 shadow-sm"
                                >
                                   Converter <ArrowRight className="w-3 h-3"/>
                                </PrimaryButton>
                             )}
                          </>
                       ) : (
                          <div className="w-full flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground bg-surface-alt/40 h-8 rounded-md">
                             <CheckCircle2 className="w-4 h-4 text-success" /> Convertido
                          </div>
                       )}
                    </div>
                 </div>
              )
           })}
        </div>
      )}

      {open && agency && (
        <NewRfp 
          agencyId={agency.id} 
          onClose={() => setOpen(false)} 
          onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["rfps", agency.id] }); }} 
        />
      )}
    </>
  );
}

function NewRfp({ agencyId, onClose, onCreated }: { agencyId: string; onClose: () => void; onCreated: () => void }) {
  const [clientId, setClientId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [passengerName, setPassengerName] = useState("");
  const [destination, setDestination] = useState("");
  const [travelDates, setTravelDates] = useState("");
  const [paxCount, setPaxCount] = useState(1);
  const [budget, setBudget] = useState(0);
  const [reqs, setReqs] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const corpsQ = useQuery({
     queryKey: ["corps-min", agencyId],
     queryFn: async () => {
        const { data } = await supabase.from("corporate_clients").select("id, company_name").eq("agency_id", agencyId).order("company_name");
        return data || [];
     }
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    
    let finalCompany = companyName;
    if (clientId && corpsQ.data) {
       const matched = corpsQ.data.find(c => c.id === clientId);
       if (matched) finalCompany = matched.company_name;
    }

    if (!finalCompany) {
       toast.error("Informe a empresa.");
       setSubmitting(false);
       return;
    }

    const { error } = await supabase.from("corporate_rfps").insert({
      agency_id: agencyId, 
      corporate_client_id: clientId || null,
      company_name: finalCompany,
      passenger_name: passengerName || null,
      destination,
      travel_dates: travelDates || null,
      passengers_count: paxCount,
      budget: budget || null,
      requirements: reqs || null
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("RFP Cadastrada");
    onCreated();
  }

  return (
    <Sheet onClose={onClose} title="Nova RFP B2B">
      <form onSubmit={submit} className="space-y-4 px-2">
        
        <div className="bg-surface-alt/40 border border-border/50 p-4 rounded-xl space-y-3">
           <Field label="Cliente Corporativo (Base)">
             <Select value={clientId} onChange={(e) => {
                setClientId(e.target.value);
                if (e.target.value) setCompanyName(""); // Clear manual name if using link
             }}>
                <option value="">Sem vínculo (Prospect)...</option>
                {corpsQ.data?.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
             </Select>
           </Field>
           
           {!clientId && (
              <Field label="Nome da Empresa (Prospect) *">
                 <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Corp" required />
              </Field>
           )}
           <Field label="Nome do Colaborador (Pax)"><Input value={passengerName} onChange={(e) => setPassengerName(e.target.value)} placeholder="João Silva" /></Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
           <Field label="Destino *"><Input required value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="São Paulo, SP" /></Field>
           <Field label="Período/Datas"><Input value={travelDates} onChange={(e) => setTravelDates(e.target.value)} placeholder="10/10 a 15/10" /></Field>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
           <Field label="Qtd Passageiros"><Input type="number" min={1} value={paxCount} onChange={(e) => setPaxCount(+e.target.value || 1)} /></Field>
           <Field label="Budget Estimado (R$)"><Input type="number" min={0} step="100" value={budget} onChange={(e) => setBudget(+e.target.value || 0)} /></Field>
        </div>

        <Field label="Requisitos (Políticas, Preferências)">
           <Textarea value={reqs} onChange={(e) => setReqs(e.target.value)} placeholder="Ex: Voo direto, hotel próximo ao evento..." className="min-h-[100px]" />
        </Field>

        <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
          <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>{submitting ? "Salvando…" : "Salvar RFP"}</PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
