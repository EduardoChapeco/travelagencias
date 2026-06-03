import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/proposals/new")({
  head: () => ({ meta: [{ title: "Nova cotação · TravelOS" }] }),
  component: NewProposal,
});

function NewProposal() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/proposals/new" });
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [leadId, setLeadId] = useState<string>("");
  const [travelStart, setTravelStart] = useState("");
  const [travelEnd, setTravelEnd] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [currency, setCurrency] = useState("BRL");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const clientsQ = useQuery({
    enabled: !!agency,
    queryKey: ["clients-pick", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name")
        .eq("agency_id", agency!.id)
        .order("full_name")
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const leadsQ = useQuery({
    enabled: !!agency,
    queryKey: ["leads-pick", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, name")
        .eq("agency_id", agency!.id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agency) return;
    setSubmitting(true);
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("proposals")
      .insert({
        agency_id: agency.id,
        title,
        destination: destination || null,
        client_id: clientId || null,
        lead_id: leadId || null,
        travel_start: travelStart || null,
        travel_end: travelEnd || null,
        pax_adults: adults,
        pax_children: children,
        pax_infants: infants,
        currency,
        valid_until: validUntil || null,
        notes: notes || null,
        owner_id: u.user?.id ?? null,
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Cotação criada");
    navigate({ to: "/agency/$slug/proposals/$id", params: { slug, id: data.id } });
  }

  return (
    <>
      <Link
        to="/agency/$slug/proposals"
        params={{ slug }}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </Link>
      <h1 className="mb-6 text-xl font-semibold tracking-tight">Nova cotação</h1>

      <form onSubmit={onSubmit} className="max-w-2xl space-y-3 rounded-lg border border-border bg-surface p-5">
        <Field label="Título *">
          <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Lua de mel em Maldivas" />
        </Field>
        <Field label="Destino">
          <Input value={destination} onChange={(e) => setDestination(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cliente">
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">— selecionar —</option>
              {(clientsQ.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Lead (CRM)">
            <Select value={leadId} onChange={(e) => setLeadId(e.target.value)}>
              <option value="">— nenhum —</option>
              {(leadsQ.data ?? []).map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Início">
            <Input type="date" value={travelStart} onChange={(e) => setTravelStart(e.target.value)} />
          </Field>
          <Field label="Volta">
            <Input type="date" value={travelEnd} onChange={(e) => setTravelEnd(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Adultos"><Input type="number" min={0} value={adults} onChange={(e) => setAdults(+e.target.value || 0)} /></Field>
          <Field label="Crianças"><Input type="number" min={0} value={children} onChange={(e) => setChildren(+e.target.value || 0)} /></Field>
          <Field label="Infantes"><Input type="number" min={0} value={infants} onChange={(e) => setInfants(+e.target.value || 0)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Moeda">
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="BRL">BRL — Real</option>
              <option value="USD">USD — Dólar</option>
              <option value="EUR">EUR — Euro</option>
            </Select>
          </Field>
          <Field label="Válida até">
            <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </Field>
        </div>
        <Field label="Observações">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={() => navigate({ to: "/agency/$slug/proposals", params: { slug } })}>
            Cancelar
          </GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "Criando…" : "Criar cotação"}
          </PrimaryButton>
        </div>
      </form>
    </>
  );
}
