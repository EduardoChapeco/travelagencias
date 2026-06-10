import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader } from "@/components/shell/PageHeader";
import { toast } from "sonner";
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton, Sheet } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/visas-catalog")({
  head: () => ({ meta: [{ title: "Catálogo de Vistos · TravelOS" }] }),
  component: VisasCatalogPage,
});

function VisasCatalogPage() {
  const { agency } = useAgency();
  const { slug } = Route.useParams();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["visa-requirements", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visa_requirements")
        .select("*")
        .eq("agency_id", agency!.id)
        .order("destination_country");
      if (error) throw error;
      return data;
    },
  });

  const removeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("visa_requirements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Catálogo removido.");
      qc.invalidateQueries({ queryKey: ["visa-requirements", agency?.id] });
    },
  });

  return (
    <div className="flex h-full flex-col">
      <div className="p-4 md:p-8">
        <div className="mb-4">
          <Link to="/agency/$slug/visas" params={{ slug }} className="text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-brand flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Vistos
          </Link>
        </div>
        <PageHeader
          title="Catálogo de Requisitos"
          description="Cadastre os requisitos consulares para agilizar a abertura de processos."
          actions={
            <PrimaryButton className="gap-1.5" onClick={() => setOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Novo Catálogo
            </PrimaryButton>
          }
        />

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {q.data?.map((req) => (
            <div key={req.id} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-lg">{req.destination_country}</h3>
                  <div className="text-sm font-medium text-brand">{req.visa_type}</div>
                </div>
                <button type="button" onClick={() => { if(confirm('Remover?')) removeMut.mutate(req.id) }} className="text-muted-foreground hover:text-danger">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="text-sm text-muted-foreground mt-4 whitespace-pre-line line-clamp-4">
                {Array.isArray(req.required_documents) ? req.required_documents.join("\n") : req.required_documents}
              </div>
            </div>
          ))}
          {q.data?.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-2xl text-muted-foreground">
              Nenhum catálogo cadastrado.
            </div>
          )}
        </div>
      </div>

      {open && agency && (
        <RequirementFormSheet
          agencyId={agency.id}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ["visa-requirements", agency.id] });
          }}
        />
      )}
    </div>
  );
}

function RequirementFormSheet({ agencyId, onClose, onSaved }: { agencyId: string; onClose: () => void; onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [country, setCountry] = useState("");
  const [visaType, setVisaType] = useState("Turismo");
  const [docs, setDocs] = useState("");
  const [days, setDays] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("visa_requirements").insert({
      agency_id: agencyId,
      destination_country: country,
      visa_type: visaType,
      required_documents: docs.split("\n").filter(Boolean),
      processing_days: days ? parseInt(days) : null,
      origin_nationality: "Brasileira",
      visa_required: true,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Catálogo criado!");
    onSaved();
  }

  return (
    <Sheet title="Novo Catálogo Consular" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col h-[calc(100vh-64px)]">
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <Field label="País *">
            <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Ex: Estados Unidos" required />
          </Field>
          <Field label="Tipo de Visto *">
            <Input value={visaType} onChange={(e) => setVisaType(e.target.value)} placeholder="Ex: Turismo (B1/B2)" required />
          </Field>
          <Field label="Prazo Estimado (Dias)" hint="Tempo médio de processamento do consulado">
            <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} placeholder="Ex: 30" />
          </Field>
          <Field label="Documentação Necessária *" hint="Lista completa de documentos e passos">
            <Textarea value={docs} onChange={(e) => setDocs(e.target.value)} rows={10} placeholder="- Passaporte Válido\n- DS-160 preenchido..." required />
          </Field>
        </div>
        <div className="border-t border-border p-4 bg-surface flex justify-end gap-2 shrink-0">
          <GhostButton type="button" onClick={onClose} disabled={busy}>Cancelar</GhostButton>
          <PrimaryButton type="submit" disabled={busy} className="gap-2">
            <Save className="h-4 w-4" /> Salvar Catálogo
          </PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
