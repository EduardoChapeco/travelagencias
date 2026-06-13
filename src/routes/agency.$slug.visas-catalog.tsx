import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Save, Trash2, Calendar, DollarSign, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader } from "@/components/shell/PageHeader";
import { toast } from "sonner";
import {
  Field,
  Input,
  Select,
  Textarea,
  PrimaryButton,
  GhostButton,
  Sheet,
} from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/visas-catalog")({
  head: () => ({ meta: [{ title: "Catálogo de Requisitos · TravelOS" }] }),
  component: VisasCatalogPage,
});

type Category = "visa" | "fee" | "health" | "insurance" | "other";

function VisasCatalogPage() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/visas-catalog" });
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | Category>("all");

  // Buscar requisitos da agência + requisitos globais do sistema (onde agency_id is null)
  const q = useQuery({
    enabled: !!agency,
    queryKey: ["visa-requirements", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visa_requirements")
        .select("*")
        .or(`agency_id.eq.${agency!.id},agency_id.is.null`)
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

  const filteredData = q.data?.filter(
    (req) => activeTab === "all" || req.category === activeTab
  );

  return (
    <div className="flex h-full flex-col">
      <div className="p-4 md:p-8">
        <div className="mb-4">
          <Link
            to="/agency/$slug/visas"
            params={{ slug }}
            className="text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-brand flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Vistos
          </Link>
        </div>
        <PageHeader
          title="Catálogo de Requisitos"
          description="Consulte e cadastre regras consulares, vacinas de saúde, taxas turísticas e exigências de seguros."
          actions={
            <PrimaryButton className="gap-1.5" onClick={() => setOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Novo Catálogo
            </PrimaryButton>
          }
        />

        {/* Category Tabs */}
        <div className="mt-6 flex border-b border-border overflow-x-auto no-scrollbar">
          {[
            { id: "all", label: "Todos os Requisitos" },
            { id: "visa", label: "Vistos Consulares" },
            { id: "fee", label: "Taxas Locais" },
            { id: "health", label: "Saúde & Vacinas" },
            { id: "insurance", label: "Seguros Obrigatórios" },
            { id: "other", label: "Outros" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`border-b-2 px-4 py-2 text-xs font-bold transition-all shrink-0 ${
                activeTab === tab.id
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredData?.map((req) => (
            <div
              key={req.id}
              className={`rounded-2xl border bg-surface p-5 flex flex-col justify-between ${
                req.agency_id === null ? "border-border/60 bg-surface-alt/10" : "border-border"
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      req.category === "visa"
                        ? "bg-brand/10 text-brand"
                        : req.category === "health"
                          ? "bg-success/15 text-success"
                          : req.category === "fee"
                            ? "bg-warning/15 text-warning"
                            : req.category === "insurance"
                              ? "bg-info/15 text-info"
                              : "bg-surface-alt text-muted-foreground"
                    }`}
                  >
                    {req.category === "visa"
                      ? "Visto"
                      : req.category === "health"
                        ? "Saúde"
                        : req.category === "fee"
                          ? "Taxa"
                          : req.category === "insurance"
                            ? "Seguro"
                            : "Outro"}
                  </span>
                  {req.agency_id !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Remover do catálogo?")) removeMut.mutate(req.id);
                      }}
                      className="text-muted-foreground hover:text-danger p-0.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="mb-2">
                  <h3 className="font-bold text-base flex items-center gap-1.5">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    {req.destination_country}
                  </h3>
                  <div className="text-xs font-semibold text-muted-foreground mt-0.5">
                    {req.rule_title || req.visa_type}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground mt-4 whitespace-pre-line border-t border-border/40 pt-3">
                  <span className="font-bold text-[10px] uppercase text-foreground/80 tracking-wide block mb-1">
                    Exigências:
                  </span>
                  {Array.isArray(req.required_documents)
                    ? req.required_documents.join("\n")
                    : req.required_documents}
                </div>

                {req.notes && (
                  <div className="text-[11px] italic text-muted-foreground/80 bg-surface-alt/30 rounded p-2.5 mt-3 border border-border/30">
                    {req.notes}
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-4 text-xs border-t border-border/40 pt-3 text-muted-foreground">
                {req.processing_days && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Prazo: <span className="font-bold text-foreground">{req.processing_days} d</span></span>
                  </div>
                )}
                {req.price_estimate !== null && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span>Custo: <span className="font-bold text-foreground">{req.price_estimate === 0 ? 'Grátis' : `${req.price_estimate} USD`}</span></span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredData?.length === 0 && (
            <div className="col-span-full py-24 text-center border-2 border-dashed border-border rounded-2xl text-muted-foreground">
              Nenhum requisito nesta categoria.
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

function RequirementFormSheet({
  agencyId,
  onClose,
  onSaved,
}: {
  agencyId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [country, setCountry] = useState("");
  const [category, setCategory] = useState<Category>("visa");
  const [ruleTitle, setRuleTitle] = useState("");
  const [docs, setDocs] = useState("");
  const [days, setDays] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [url, setUrl] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("visa_requirements").insert({
      agency_id: agencyId,
      destination_country: country,
      category,
      rule_title: ruleTitle || null,
      visa_type: ruleTitle || (category === "visa" ? "Visto Requisito" : "Outros Requisitos"),
      required_documents: docs.split("\n").filter(Boolean),
      processing_days: days ? parseInt(days) : null,
      price_estimate: price ? parseFloat(price) : 0,
      notes: notes || null,
      official_url: url || null,
      origin_nationality: "Brasileira",
      visa_required: true,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Catálogo de requisitos criado!");
    onSaved();
  }

  return (
    <Sheet title="Novo Requisito Operacional" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col h-[calc(100vh-64px)]">
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <Field label="Categoria *">
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              required
            >
              <option value="visa">Visto Consular</option>
              <option value="fee">Taxa Turística</option>
              <option value="health">Saúde & Vacinas</option>
              <option value="insurance">Seguro Obrigatório</option>
              <option value="other">Outros</option>
            </Select>
          </Field>

          <Field label="País / Destino *">
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Ex: México"
              required
            />
          </Field>

          <Field label="Título da Regra" hint="Ex: Visitax Quintana Roo, CIVP Febre Amarela">
            <Input
              value={ruleTitle}
              onChange={(e) => setRuleTitle(e.target.value)}
              placeholder="Ex: Certificado de Febre Amarela"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Prazo Estimado (Dias)" hint="Tempo médio de liberação">
              <Input
                type="number"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                placeholder="Ex: 5"
              />
            </Field>
            <Field label="Custo Estimado (USD)" hint="Taxa oficial aproximada">
              <Input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Ex: 25.00"
              />
            </Field>
          </div>

          <Field label="Documentação / Passos *" hint="Insira um item por linha">
            <Textarea
              value={docs}
              onChange={(e) => setDocs(e.target.value)}
              rows={6}
              placeholder="- Passaporte Válido&#10;- Certificado Nacional de Vacinação..."
              required
            />
          </Field>

          <Field label="Links Oficiais / Consulta">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </Field>

          <Field label="Notas e Avisos Importantes">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Atenção: A vacina deve ser aplicada pelo menos 10 dias antes do embarque..."
            />
          </Field>
        </div>
        <div className="border-t border-border p-4 bg-surface flex justify-end gap-2 shrink-0">
          <GhostButton type="button" onClick={onClose} disabled={busy}>
            Cancelar
          </GhostButton>
          <PrimaryButton type="submit" disabled={busy} className="gap-2">
            <Save className="h-4 w-4" /> Salvar Requisito
          </PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
