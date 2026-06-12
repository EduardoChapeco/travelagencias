import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton } from "@/components/ui/form";
import { SheetPage } from "@/components/ui/sheet";
import { createProposal, fetchClientsPick, fetchLeadsPick } from "@/services/proposals";

type NewProposalSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
};

export function NewProposalSheet({ isOpen, onClose, onCreated }: NewProposalSheetProps) {
  const { agency } = useAgency();
  const qc = useQueryClient();

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
    enabled: !!agency && isOpen,
    queryKey: ["clients-pick", agency?.id],
    queryFn: () => fetchClientsPick(agency!.id),
  });

  const leadsQ = useQuery({
    enabled: !!agency && isOpen,
    queryKey: ["leads-pick", agency?.id],
    queryFn: () => fetchLeadsPick(agency!.id),
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agency) return;
    setSubmitting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const payload = {
        title,
        destination: destination || undefined,
        client_id: clientId || undefined,
        lead_id: leadId || undefined,
        travel_start: travelStart || undefined,
        travel_end: travelEnd || undefined,
        pax_adults: adults,
        pax_children: children,
        pax_infants: infants,
        currency,
        valid_until: validUntil || undefined,
        notes: notes || undefined,
      };

      const { id } = await createProposal(agency.id, payload, u.user?.id);

      toast.success("Cotação criada com sucesso!");
      qc.invalidateQueries({ queryKey: ["proposals", agency.id] });
      onCreated(id);
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar cotação.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SheetPage isOpen={isOpen} onClose={onClose} title="Nova Cotação">
      <p className="text-xs text-muted-foreground mb-4">
        Preencha os dados básicos para iniciar a montagem da proposta.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Título *">
          <Input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Lua de mel em Maldivas"
          />
        </Field>

        <Field label="Destino">
          <Input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Ex: Maldivas"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Cliente">
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">— selecionar —</option>
              {(clientsQ.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Lead (CRM)">
            <Select value={leadId} onChange={(e) => setLeadId(e.target.value)}>
              <option value="">— nenhum —</option>
              {(leadsQ.data ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Início da Viagem">
            <Input
              type="date"
              value={travelStart}
              onChange={(e) => setTravelStart(e.target.value)}
            />
          </Field>
          <Field label="Fim da Viagem">
            <Input type="date" value={travelEnd} onChange={(e) => setTravelEnd(e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Adultos">
            <Input
              type="number"
              min={0}
              value={adults}
              onChange={(e) => setAdults(+e.target.value || 0)}
            />
          </Field>
          <Field label="Crianças">
            <Input
              type="number"
              min={0}
              value={children}
              onChange={(e) => setChildren(+e.target.value || 0)}
            />
          </Field>
          <Field label="Infantes">
            <Input
              type="number"
              min={0}
              value={infants}
              onChange={(e) => setInfants(+e.target.value || 0)}
            />
          </Field>
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

        <Field label="Observações Internas">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anotações para controle da agência..."
          />
        </Field>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <GhostButton type="button" onClick={onClose}>
            Cancelar
          </GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "Criando…" : "Criar cotação"}
          </PrimaryButton>
        </div>
      </form>
    </SheetPage>
  );
}
