import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton, Sheet } from "@/components/ui/form";
import { toast } from "sonner";

type VisaFormSheetProps = {
  agencyId: string;
  onClose: () => void;
  onSaved: () => void;
};

export function VisaFormSheet({ agencyId, onClose, onSaved }: VisaFormSheetProps) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  
  const [clientId, setClientId] = useState("");
  const [country, setCountry] = useState("");
  const [category, setCategory] = useState("Turismo");
  const [requirementId, setRequirementId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");

  const clientsQ = useQuery({
    queryKey: ["clients-minimal", agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name, document")
        .eq("agency_id", agencyId)
        .is("deleted_at", null)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const stagesQ = useQuery({
    queryKey: ["visa-stages", agencyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("visa_stages").select("*").eq("agency_id", agencyId).order("position").limit(1);
      if (error) throw error;
      return data;
    },
  });

  const requirementsQ = useQuery({
    queryKey: ["visa-requirements", agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visa_requirements")
        .select("id, country, visa_type")
        .eq("agency_id", agencyId)
        .order("country");
      if (error) throw error;
      return data;
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || !country) {
      toast.error("Preencha cliente e país de destino.");
      return;
    }

    const firstStageId = stagesQ.data?.[0]?.id;
    if (!firstStageId) {
      toast.error("Nenhum estágio configurado. Recarregue a página.");
      return;
    }

    setBusy(true);
    const { error } = await (supabase as any).from("visas").insert({
      agency_id: agencyId,
      client_id: clientId,
      stage_id: firstStageId,
      requirement_id: requirementId || null,
      country,
      category,
      expected_date: expectedDate || null,
      notes,
    });

    setBusy(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Processo de visto iniciado");
      onSaved();
    }
  }

  return (
    <Sheet title="Novo Processo de Visto" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col h-[calc(100vh-64px)]">
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <Field label="Cliente" required>
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Selecione um cliente...</option>
              {clientsQ.data?.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name} {c.document ? `(${c.document})` : ""}</option>
              ))}
            </Select>
          </Field>

          <Field label="País de Destino" required>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Ex: Estados Unidos" />
          </Field>

          <Field label="Categoria">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Turismo">Turismo</option>
              <option value="Estudante">Estudante</option>
              <option value="Trabalho / Negócios">Trabalho / Negócios</option>
              <option value="Residência">Residência</option>
            </Select>
          </Field>

          <Field label="Requisito / Catálogo (Opcional)">
            <Select value={requirementId} onChange={(e) => setRequirementId(e.target.value)}>
              <option value="">Sem catálogo predefinido</option>
              {requirementsQ.data?.map((req) => (
                <option key={req.id} value={req.id}>{req.country} - {req.visa_type}</option>
              ))}
            </Select>
          </Field>

          <Field label="Data Esperada da Viagem (Opcional)">
            <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
          </Field>

          <Field label="Observações">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Ex: Cliente tem viagem marcada e urgência..." />
          </Field>
        </div>

        <div className="border-t border-border p-4 bg-surface flex justify-end gap-2 shrink-0">
          <GhostButton type="button" onClick={onClose} disabled={busy}>Cancelar</GhostButton>
          <PrimaryButton type="submit" disabled={busy} className="gap-2">
            <Save className="h-4 w-4" /> Iniciar Processo
          </PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
