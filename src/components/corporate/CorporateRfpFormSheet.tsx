import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton, Sheet } from "@/components/ui/form";
import { toast } from "sonner";

type CorporateRfpFormSheetProps = {
  agencyId: string;
  onClose: () => void;
  onSaved: () => void;
};

export function CorporateRfpFormSheet({ agencyId, onClose, onSaved }: CorporateRfpFormSheetProps) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [paxCount, setPaxCount] = useState("");
  const [budget, setBudget] = useState("");
  const [description, setDescription] = useState("");

  const clientsQ = useQuery({
    queryKey: ["clients-companies", agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name")
        .eq("agency_id", agencyId)
        .eq("kind", "company")
        .is("deleted_at", null)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || !title || !requesterName || !requesterEmail || !destination || !departureDate) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    setBusy(true);
    const { error } = await supabase.from("corporate_rfps").insert({
      agency_id: agencyId,
      client_id: clientId,
      title,
      requester_name: requesterName,
      requester_email: requesterEmail,
      destination,
      departure_date: departureDate,
      return_date: returnDate || null,
      budget: budget ? Number(budget) : null,
      budget_estimated: budget ? Number(budget) : null,
      pax_count: paxCount ? parseInt(paxCount) : 1,
      description,
      requirements: description,
      status: "pending",
    });

    setBusy(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("RFP criada com sucesso");
      onSaved();
    }
  }

  return (
    <Sheet title="Nova Requisição (RFP)" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col h-[calc(100vh-64px)]">
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <Field label="Empresa Cliente" required>
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Selecione uma empresa...</option>
              {clientsQ.data?.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </Select>
          </Field>

          <Field label="Título da Requisição" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Viagem Comercial SP" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Nome Solicitante" required>
              <Input value={requesterName} onChange={(e) => setRequesterName(e.target.value)} />
            </Field>
            <Field label="E-mail Solicitante" required>
              <Input type="email" value={requesterEmail} onChange={(e) => setRequesterEmail(e.target.value)} />
            </Field>
          </div>

          <Field label="Destino" required>
            <Input value={destination} onChange={(e) => setDestination(e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Data Partida" required>
              <Input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
            </Field>
            <Field label="Data Retorno">
              <Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Orçamento Máximo (Opcional)">
              <Input type="number" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0.00" />
            </Field>
            <Field label="Nº Passageiros" required>
              <Input type="number" min="1" value={paxCount} onChange={(e) => setPaxCount(e.target.value)} placeholder="1" />
            </Field>
          </div>

          <Field label="Detalhes / Descrição">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </Field>
        </div>

        <div className="border-t border-border p-4 bg-surface flex justify-end gap-2 shrink-0">
          <GhostButton type="button" onClick={onClose} disabled={busy}>Cancelar</GhostButton>
          <PrimaryButton type="submit" disabled={busy} className="gap-2">
            <Save className="h-4 w-4" /> Criar RFP
          </PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
