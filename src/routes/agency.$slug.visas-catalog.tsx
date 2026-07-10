import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { ArrowLeft, Plus, Save, Trash2, Calendar, DollarSign, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { toast } from "sonner";
import { PageHeader, ModuleActionButton } from "@/components/shell/PageHeader";
import { useConfirm } from "@/hooks/use-confirm";
import { Field } from "@/components/ui/field";
import { FormInput as Input } from "@/components/ui/input";
import { NativeSelect as Select } from "@/components/ui/select";
import { FormTextarea as Textarea } from "@/components/ui/textarea";
import { SimpleSheet as Sheet } from "@/components/ui/sheet";
import { PrimaryButton, GhostButton , Button } from "@/components/ui/button";

export const Route = createFileRoute("/agency/$slug/visas-catalog")({
  head: ({ context }: any) => ({ meta: [{ title: `Catálogo de Requisitos · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: VisasCatalogPage,
});

type Category = "visa" | "fee" | "health" | "insurance" | "other";

function VisasCatalogPage() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/visas-catalog" });
  const qc = useQueryClient();
  const { confirm, ConfirmDialog } = useConfirm();
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

  const filteredData = q.data?.filter((req) => activeTab === "all" || req.category === activeTab);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ConfirmDialog />

              <PageHeader
          title="Requisitos de Viagem"
          filters={[
            { label: "Todos", value: "all" },
            { label: "Vistos", value: "visa" },
            { label: "Taxas", value: "fee" },
            { label: "Saúde", value: "health" },
            { label: "Seguro", value: "insurance" },
            { label: "Outros", value: "other" },
          ]}
          activeFilter={activeTab}
          onFilterChange={(v) => setActiveTab(v as any)}
          actions={
            <Link
              to="/agency/$slug/visas"
              params={{ slug }}
              className="inline-flex h-7 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-[11px] font-bold text-white/90 hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3 h-3" /> Voltar
            </Link>
          }
          primaryAction={
            <ModuleActionButton
        label="Novo Catálogo"
        icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setOpen(true)}
            />
          }
        />

      <div className="flex-1 overflow-y-auto px-4  md:pr-6 py-4 min-h-0 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredData?.map((req) => (
            <div
              key={req.id}
              className={`rounded-[var(--radius-card)] border glass-card border-none p-5 flex flex-col justify-between ${
                req.agency_id === null ? "border-border/60 glass bg-white/5 border-white/10/10" : "border-border"
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
                              : "glass bg-white/5 border-white/10 text-muted-foreground"
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
                    <Button
                      type="button"
                      onClick={() => {
                        confirm({
                          title: "Remover do catálogo?",
                          description:
                            "Tem certeza de que deseja remover este requisito do catálogo?",
                          variant: "destructive",
                          onConfirm: () => removeMut.mutate(req.id),
                        });
                      }}
                      className="text-muted-foreground hover:text-danger p-0.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
                  <div className="text-[11px] italic text-muted-foreground/80 glass bg-white/5 border-white/10/30 rounded p-2.5 mt-3 border-none/30">
                    {req.notes}
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-4 text-xs border-t border-border/40 pt-3 text-muted-foreground">
                {req.processing_days && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      Prazo:{" "}
                      <span className="font-bold text-foreground">{req.processing_days} d</span>
                    </span>
                  </div>
                )}
                {req.price_estimate !== null && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span>
                      Custo:{" "}
                      <span className="font-bold text-foreground">
                        {req.price_estimate === 0 ? "Grátis" : `${req.price_estimate} USD`}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredData?.length === 0 && (
            <div className="col-span-full py-24 text-center border-2 border-dashed border-border rounded-[var(--radius-card)] text-muted-foreground">
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
      <form onSubmit={handleSubmit} className="space-y-5">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            placeholder="- Passaporte Válido\n- Certificado Nacional de Vacinação..."
            required
          />
        </Field>

        <Field label="Links Oficiais / Consulta">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
        </Field>

        <Field label="Notas e Avisos Importantes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Atenção: A vacina deve ser aplicada pelo menos 10 dias antes do embarque..."
          />
        </Field>

        <div className="border-t border-border pt-5 mt-6 flex justify-end gap-2">
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
