import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/use-confirm";
import {
  Globe,
  Plus,
  Trash2,
  Edit2,
  Search,
  ShieldAlert,
  Heart,
  Zap,
  DollarSign,
  Languages,
  Plug,
  Clock,
  Thermometer,
  CheckCircle,
  XCircle,
  RefreshCw,
  Save,
  X,
} from "lucide-react";
import {
  Field,
  Input,
  Select,
  Textarea,
  PrimaryButton,
  GhostButton,
  StatusBadge,
} from "@/components/ui/form";
import { HeaderPortal } from "@/components/shell/HeaderPortal";
import { ModuleToolbar, ModuleActionButton } from "@/components/shell/ModuleToolbar";

export const Route = createFileRoute("/agency/$slug/destination-intelligence")({
  head: ({ context }: any) => ({ meta: [{ title: `Informações de Destinos · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: DestinationIntelligencePage,
});

type DestinationInfo = {
  id: string;
  destination: string;
  country_code: string | null;
  slug: string | null;
  visa_required: boolean | null;
  visa_info: string | null;
  entry_requirements: string | null;
  tourist_tax: string | null;
  tourist_tax_amount: number | null;
  tourist_tax_currency: string | null;
  vaccinations_required: string[] | null;
  vaccinations_recommended: string[] | null;
  health_notes: string | null;
  currency: string | null;
  currency_code: string | null;
  plug_type: string | null;
  language: string | null;
  time_zone: string | null;
  utc_offset: string | null;
  safety_level: string | null;
  safety_notes: string | null;
  cultural_tips: string | null;
  best_season: string | null;
  budget_range: string | null;
  ai_generated_at: string | null;
  ai_model: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  agency_id: string | null;
  source: string | null;
  source_url: string | null;
  expires_at: string | null;
  confidence_level: string | null;
  created_at: string;
  updated_at: string;
};

const SAFETY_LABELS: Record<
  string,
  { label: string; tone: "success" | "warning" | "danger" | "info" }
> = {
  safe: { label: "Seguro", tone: "success" },
  moderate: { label: "Moderado", tone: "warning" },
  caution: { label: "Atenção", tone: "warning" },
  high_risk: { label: "Alto Risco", tone: "danger" },
};

const EMPTY_FORM: Partial<DestinationInfo> = {
  destination: "",
  country_code: "",
  visa_required: false,
  visa_info: "",
  entry_requirements: "",
  tourist_tax: "",
  tourist_tax_amount: null,
  tourist_tax_currency: "USD",
  vaccinations_required: [],
  vaccinations_recommended: [],
  health_notes: "",
  currency: "",
  currency_code: "",
  plug_type: "",
  language: "",
  time_zone: "",
  utc_offset: "",
  safety_level: "safe",
  safety_notes: "",
  cultural_tips: "",
  best_season: "",
  budget_range: "",
  source: "",
  source_url: "",
  expires_at: null,
  confidence_level: "high",
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function DestinationIntelligencePage() {
  const { slug } = useParams({ strict: false });
  const { agency } = useAgency();
  const qc = useQueryClient();
  const { confirm, ConfirmDialog } = useConfirm();

  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DestinationInfo | null>(null);
  const [form, setForm] = useState<Partial<DestinationInfo>>(EMPTY_FORM);
  const [vacReqText, setVacReqText] = useState("");
  const [vacRecText, setVacRecText] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["destination-info"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("destination_info")
        .select("*")
        .order("destination");
      if (error) throw error;
      return (data ?? []) as DestinationInfo[];
    },
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        destination: form.destination ?? "",
        country_code: form.country_code || null,
        slug: slugify(form.destination ?? ""),
        visa_required: form.visa_required ?? false,
        visa_info: form.visa_info || null,
        entry_requirements: form.entry_requirements || null,
        tourist_tax: form.tourist_tax || null,
        tourist_tax_amount: form.tourist_tax_amount || null,
        tourist_tax_currency: form.tourist_tax_currency || null,
        vaccinations_required: vacReqText
          ? vacReqText
              .split("\n")
              .map((v) => v.trim())
              .filter(Boolean)
          : [],
        vaccinations_recommended: vacRecText
          ? vacRecText
              .split("\n")
              .map((v) => v.trim())
              .filter(Boolean)
          : [],
        health_notes: form.health_notes || null,
        currency: form.currency || null,
        currency_code: form.currency_code || null,
        plug_type: form.plug_type || null,
        language: form.language || null,
        time_zone: form.time_zone || null,
        utc_offset: form.utc_offset || null,
        safety_level: form.safety_level || null,
        safety_notes: form.safety_notes || null,
        cultural_tips: form.cultural_tips || null,
        best_season: form.best_season || null,
        budget_range: form.budget_range || null,
        agency_id: agency?.id || null,
        source: form.source || null,
        source_url: form.source_url || null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        confidence_level: form.confidence_level || null,
      };

      let destinationId: string;
      if (editing) {
        const { error } = await supabase
          .from("destination_info")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        destinationId = editing.id;
      } else {
        const { data, error } = await supabase
          .from("destination_info")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        destinationId = data.id;
      }

      // Log manual edit or create
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase.from("destination_review_logs").insert({
        destination_id: destinationId,
        agency_id: agency?.id || null,
        reviewed_by: user?.id || null,
        action: editing ? "manual_edit" : "create",
        details: editing ? "Edição manual de informações" : "Criação manual do destino",
      });
    },
    onSuccess: () => {
      toast.success(editing ? "Destino atualizado!" : "Destino criado!");
      qc.invalidateQueries({ queryKey: ["destination-info"] });
      closeForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("destination_info").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Destino removido.");
      qc.invalidateQueries({ queryKey: ["destination-info"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function generateWithAI(destination: string) {
    setGenerating(destination);
    const toastId = "ai-dest";
    toast.loading(`Atualizando informações para ${destination}…`, { id: toastId });
    try {
      // Call edge function for AI generation
      const { data, error } = await supabase.functions.invoke("destination-intelligence", {
        body: { destination },
      });
      if (error) throw new Error(error.message);

      // Update the record with AI-generated data
      const existing = q.data?.find((d) => d.destination === destination);
      if (existing) {
        await supabase
          .from("destination_info")
          .update({
            ...data,
            ai_generated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        qc.invalidateQueries({ queryKey: ["destination-info"] });
        toast.success(`Informações de ${destination} atualizadas!`, { id: toastId });
      }
    } catch (e: any) {
      toast.error(e.message || "Falha ao atualizar dados", { id: toastId });
    } finally {
      setGenerating(null);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setVacReqText("");
    setVacRecText("");
    setShowForm(true);
  }

  function openEdit(dest: DestinationInfo) {
    setEditing(dest);
    setForm({ ...dest });
    setVacReqText((dest.vaccinations_required ?? []).join("\n"));
    setVacRecText((dest.vaccinations_recommended ?? []).join("\n"));
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  const filtered = (q.data ?? []).filter(
    (d) => !searchQuery || d.destination.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <HeaderPortal>
        <ModuleToolbar
          title="Inteligência de Destinos"
          search={{
            value: searchQuery,
            onChange: setSearchQuery,
            placeholder: "Buscar destino…"
          }}
          actions={
            <div className="flex items-center gap-1.5 text-[11px] text-white/50">
              <span><strong className="text-white">{q.data?.length ?? 0}</strong> destinos</span>
              <span className="hidden sm:inline"><strong className="text-white">{q.data?.filter((d) => d.ai_generated_at).length ?? 0}</strong> com IA</span>
              <span className="hidden sm:inline"><strong className="text-white">{q.data?.filter((d) => d.visa_required).length ?? 0}</strong> exigem visto</span>
            </div>
          }
        />
      </HeaderPortal>

      <ModuleActionButton
        label="Novo Destino"
        icon={<Plus className="h-3.5 w-3.5" />}
        onClick={openCreate}
      />

      <ConfirmDialog />

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4  md:pr-6 py-4 min-h-0 pb-24">
        {q.isLoading ? (
          <div className="text-center py-12 text-sm text-muted-foreground animate-pulse">
            Carregando destinos…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-border rounded-2xl text-center">
            <Globe className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm font-semibold text-muted-foreground">
              {searchQuery ? "Nenhum destino encontrado" : "Nenhum destino cadastrado ainda"}
            </p>
            {!searchQuery && (
              <button
                onClick={openCreate}
                className="mt-3 flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground"
              >
                <Plus className="h-3.5 w-3.5" /> Cadastrar primeiro destino
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((dest) => {
              const safety = dest.safety_level ? SAFETY_LABELS[dest.safety_level] : null;
              return (
                <div
                  key={dest.id}
                  className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-3 hover:border-border-strong transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        {dest.country_code && (
                          <span className="text-lg leading-none">
                            {dest.country_code
                              .toUpperCase()
                              .replace(/./g, (c) =>
                                String.fromCodePoint(c.codePointAt(0)! + 127397),
                              )}
                          </span>
                        )}
                        <h3 className="font-bold text-base text-foreground">{dest.destination}</h3>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {safety && (
                          <StatusBadge tone={safety.tone}>
                            <ShieldAlert className="h-2.5 w-2.5 inline mr-0.5" />
                            {safety.label}
                          </StatusBadge>
                        )}
                        {dest.reviewed_at ? (
                          <StatusBadge tone="success">
                            <CheckCircle className="h-2.5 w-2.5 inline mr-0.5" />
                            Publicado
                          </StatusBadge>
                        ) : (
                          <StatusBadge tone="warning">
                            <XCircle className="h-2.5 w-2.5 inline mr-0.5" />
                            Rascunho
                          </StatusBadge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={async () => {
                          try {
                            const {
                              data: { user },
                            } = await supabase.auth.getUser();
                            const nextReviewedAt = dest.reviewed_at
                              ? null
                              : new Date().toISOString();
                            const { error } = await supabase
                              .from("destination_info")
                              .update({
                                reviewed_at: nextReviewedAt,
                                reviewed_by: dest.reviewed_at ? null : user?.id || null,
                              })
                              .eq("id", dest.id);
                            if (error) throw error;

                            // Inserir log de auditoria
                            await supabase.from("destination_review_logs").insert({
                              destination_id: dest.id,
                              agency_id: agency?.id || null,
                              reviewed_by: user?.id || null,
                              action: dest.reviewed_at ? "unreview" : "review",
                              details: dest.reviewed_at
                                ? "Destino desmarcado como revisado"
                                : "Destino marcado como revisado",
                            });

                            toast.success(
                              dest.reviewed_at
                                ? "Destino desmarcado como revisado!"
                                : "Destino marcado como revisado!",
                            );
                            qc.invalidateQueries({ queryKey: ["destination-info"] });
                          } catch (err: any) {
                            toast.error(err.message);
                          }
                        }}
                        className={`h-6 w-6 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                          dest.reviewed_at
                            ? "text-success bg-success/10 border-success/30"
                            : "text-muted-foreground hover:text-success hover:border-success border-border"
                        }`}
                        title={
                          dest.reviewed_at
                            ? "Revisado (Clique para remover revisão)"
                            : "Marcar como Revisado"
                        }
                      >
                        <CheckCircle className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => generateWithAI(dest.destination)}
                        disabled={generating === dest.destination}
                        className="h-6 w-6 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-brand hover:border-brand transition-colors"
                        title="Atualizar dados automaticamente"
                      >
                        <RefreshCw
                          className={`h-3 w-3 ${generating === dest.destination ? "animate-spin" : ""}`}
                        />
                      </button>
                      <button
                        onClick={() => openEdit(dest)}
                        className="h-6 w-6 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() =>
                          confirm({
                            title: "Remover destino?",
                            description: `Tem certeza de que deseja remover "${dest.destination}"?`,
                            variant: "destructive",
                            onConfirm: () => deleteMut.mutate(dest.id),
                          })
                        }
                        className="h-6 w-6 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-danger hover:border-danger transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {dest.visa_required !== null && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        {dest.visa_required ? (
                          <XCircle className="h-3 w-3 text-danger shrink-0" />
                        ) : (
                          <CheckCircle className="h-3 w-3 text-success shrink-0" />
                        )}
                        Visto: {dest.visa_required ? "Exigido" : "Livre"}
                      </div>
                    )}
                    {dest.language && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Languages className="h-3 w-3 shrink-0" />
                        {dest.language}
                      </div>
                    )}
                    {dest.currency && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <DollarSign className="h-3 w-3 shrink-0" />
                        {dest.currency} ({dest.currency_code})
                      </div>
                    )}
                    {dest.plug_type && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Plug className="h-3 w-3 shrink-0" />
                        {dest.plug_type}
                      </div>
                    )}
                    {dest.utc_offset && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3 shrink-0" />
                        UTC{dest.utc_offset}
                      </div>
                    )}
                    {dest.best_season && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Thermometer className="h-3 w-3 shrink-0" />
                        {dest.best_season}
                      </div>
                    )}
                  </div>

                  {/* Vaccinations */}
                  {(dest.vaccinations_required ?? []).length > 0 && (
                    <div className="bg-danger/5 border border-danger/20 rounded-2xl px-3 py-2 text-[10px]">
                      <span className="font-bold text-danger uppercase tracking-wide block mb-0.5">
                        Vacinas Obrigatórias
                      </span>
                      <span className="text-muted-foreground">
                        {(dest.vaccinations_required ?? []).join(" · ")}
                      </span>
                    </div>
                  )}

                  {/* Budget */}
                  {dest.budget_range && (
                    <div className="text-[10px] text-muted-foreground border-t border-border/50 pt-2">
                      <Zap className="h-3 w-3 inline mr-1 text-warning" />
                      {dest.budget_range}
                    </div>
                  )}

                  {/* Metadata and Review status */}
                  <div className="text-[9px] text-muted-foreground/60 pt-1 border-t border-border/30 flex flex-wrap gap-x-3 gap-y-1">
                    {dest.ai_generated_at && (
                      <span>
                        Atualizado: {new Date(dest.ai_generated_at).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                    {dest.reviewed_at && (
                      <span className="text-success font-semibold flex items-center gap-0.5">
                        <CheckCircle className="h-2 w-2" /> Revisado em{" "}
                        {new Date(dest.reviewed_at).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form Sheet */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end bg-overlay" onClick={closeForm}>
          <div
            className="h-full w-full max-w-xl overflow-y-auto border-l border-border bg-surface"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-surface z-10">
              <h2 className="text-sm font-bold text-foreground">
                {editing ? `Editar: ${editing.destination}` : "Novo Destino"}
              </h2>
              <button
                onClick={closeForm}
                className="rounded border border-border p-1 hover:bg-surface-alt"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Destino *">
                  <Input
                    value={form.destination ?? ""}
                    onChange={(e) => setForm({ ...form, destination: e.target.value })}
                    placeholder="Ex: México"
                    required
                  />
                </Field>
                <Field label="Código do País (ISO)">
                  <Input
                    value={form.country_code ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, country_code: e.target.value.toUpperCase() })
                    }
                    placeholder="Ex: MX"
                    maxLength={2}
                  />
                </Field>
              </div>

              {/* Visa */}
              <div className="border border-border rounded-[24px] p-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" /> Visto & Entrada
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="visa_required"
                    checked={form.visa_required ?? false}
                    onChange={(e) => setForm({ ...form, visa_required: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <label htmlFor="visa_required" className="text-xs font-semibold">
                    Visto Obrigatório
                  </label>
                </div>
                <Field label="Informações de Visto">
                  <Textarea
                    value={form.visa_info ?? ""}
                    onChange={(e) => setForm({ ...form, visa_info: e.target.value })}
                    rows={2}
                    placeholder="Ex: e-Visa disponível online…"
                  />
                </Field>
                <Field label="Requisitos de Entrada">
                  <Textarea
                    value={form.entry_requirements ?? ""}
                    onChange={(e) => setForm({ ...form, entry_requirements: e.target.value })}
                    rows={2}
                    placeholder="Passaporte válido por 6 meses, bilhete de retorno…"
                  />
                </Field>
              </div>

              {/* Health */}
              <div className="border border-border rounded-[24px] p-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5" /> Saúde
                </div>
                <Field label="Vacinas Obrigatórias (uma por linha)">
                  <Textarea
                    value={vacReqText}
                    onChange={(e) => setVacReqText(e.target.value)}
                    rows={3}
                    placeholder="Febre Amarela (CIVP)&#10;Hepatite A"
                  />
                </Field>
                <Field label="Vacinas Recomendadas (uma por linha)">
                  <Textarea
                    value={vacRecText}
                    onChange={(e) => setVacRecText(e.target.value)}
                    rows={2}
                    placeholder="Tétano&#10;Hepatite B"
                  />
                </Field>
                <Field label="Notas de Saúde">
                  <Textarea
                    value={form.health_notes ?? ""}
                    onChange={(e) => setForm({ ...form, health_notes: e.target.value })}
                    rows={2}
                  />
                </Field>
              </div>

              {/* Safety */}
              <div className="border border-border rounded-[24px] p-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5" /> Segurança
                </div>
                <Field label="Nível de Segurança">
                  <Select
                    value={form.safety_level ?? "safe"}
                    onChange={(e) => setForm({ ...form, safety_level: e.target.value })}
                  >
                    <option value="safe">Seguro</option>
                    <option value="moderate">Moderado</option>
                    <option value="caution">Atenção</option>
                    <option value="high_risk">Alto Risco</option>
                  </Select>
                </Field>
                <Field label="Notas de Segurança">
                  <Textarea
                    value={form.safety_notes ?? ""}
                    onChange={(e) => setForm({ ...form, safety_notes: e.target.value })}
                    rows={2}
                  />
                </Field>
              </div>

              {/* Practical */}
              <div className="border border-border rounded-[24px] p-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" /> Informações Práticas
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Moeda">
                    <Input
                      value={form.currency ?? ""}
                      onChange={(e) => setForm({ ...form, currency: e.target.value })}
                      placeholder="Peso Mexicano"
                    />
                  </Field>
                  <Field label="Código Moeda">
                    <Input
                      value={form.currency_code ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, currency_code: e.target.value.toUpperCase() })
                      }
                      placeholder="MXN"
                      maxLength={3}
                    />
                  </Field>
                  <Field label="Tomada / Tensão">
                    <Input
                      value={form.plug_type ?? ""}
                      onChange={(e) => setForm({ ...form, plug_type: e.target.value })}
                      placeholder="Tipo A/B (127V)"
                    />
                  </Field>
                  <Field label="Idioma">
                    <Input
                      value={form.language ?? ""}
                      onChange={(e) => setForm({ ...form, language: e.target.value })}
                      placeholder="Espanhol"
                    />
                  </Field>
                  <Field label="Fuso Horário">
                    <Input
                      value={form.time_zone ?? ""}
                      onChange={(e) => setForm({ ...form, time_zone: e.target.value })}
                      placeholder="América/Mexico_City"
                    />
                  </Field>
                  <Field label="UTC Offset">
                    <Input
                      value={form.utc_offset ?? ""}
                      onChange={(e) => setForm({ ...form, utc_offset: e.target.value })}
                      placeholder="-06:00"
                    />
                  </Field>
                </div>
              </div>

              {/* Tax */}
              <div className="border border-border rounded-[24px] p-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" /> Taxa Turística
                </div>
                <Field label="Descrição da Taxa">
                  <Input
                    value={form.tourist_tax ?? ""}
                    onChange={(e) => setForm({ ...form, tourist_tax: e.target.value })}
                    placeholder="Ex: Visitax — Taxa de Turismo Quintana Roo"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Valor">
                    <Input
                      type="number"
                      step="0.01"
                      value={form.tourist_tax_amount ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, tourist_tax_amount: parseFloat(e.target.value) || null })
                      }
                      placeholder="42.00"
                    />
                  </Field>
                  <Field label="Moeda">
                    <Input
                      value={form.tourist_tax_currency ?? "USD"}
                      onChange={(e) => setForm({ ...form, tourist_tax_currency: e.target.value })}
                      placeholder="USD"
                      maxLength={3}
                    />
                  </Field>
                </div>
              </div>

              {/* Curadoria e Controle */}
              <div className="border border-border rounded-[24px] p-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Curadoria e Qualidade
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Fonte das Informações">
                    <Input
                      value={form.source ?? ""}
                      onChange={(e) => setForm({ ...form, source: e.target.value })}
                      placeholder="Ex: AI Engine / Consulado"
                    />
                  </Field>
                  <Field label="Nível de Confiança">
                    <Select
                      value={form.confidence_level ?? "high"}
                      onChange={(e) => setForm({ ...form, confidence_level: e.target.value })}
                    >
                      <option value="low">Baixo (Rascunho / Não verificado)</option>
                      <option value="medium">Médio (Verificação parcial)</option>
                      <option value="high">Alto (Verificado e revisado)</option>
                    </Select>
                  </Field>
                </div>
                <Field label="URL da Fonte">
                  <Input
                    value={form.source_url ?? ""}
                    onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                    placeholder="https://..."
                  />
                </Field>
                <Field label="Expira em">
                  <Input
                    type="date"
                    value={form.expires_at ? String(form.expires_at).slice(0, 10) : ""}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value || null })}
                  />
                </Field>
              </div>

              {/* Tips */}
              <div className="border border-border rounded-[24px] p-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Dicas e Contexto
                </div>
                <Field label="Dicas Culturais">
                  <Textarea
                    value={form.cultural_tips ?? ""}
                    onChange={(e) => setForm({ ...form, cultural_tips: e.target.value })}
                    rows={3}
                  />
                </Field>
                <Field label="Melhor Época para Visitar">
                  <Input
                    value={form.best_season ?? ""}
                    onChange={(e) => setForm({ ...form, best_season: e.target.value })}
                    placeholder="Ex: Nov–Mar (seca e quente)"
                  />
                </Field>
                <Field label="Orçamento Estimado">
                  <Input
                    value={form.budget_range ?? ""}
                    onChange={(e) => setForm({ ...form, budget_range: e.target.value })}
                    placeholder="Ex: R$ 8.000–15.000 por pessoa (7 dias)"
                  />
                </Field>
              </div>

              <div className="flex gap-2 pt-2">
                <GhostButton onClick={closeForm} className="flex-1">
                  Cancelar
                </GhostButton>
                <PrimaryButton
                  onClick={() => saveMut.mutate()}
                  disabled={saveMut.isPending || !form.destination?.trim()}
                  className="flex-1 gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saveMut.isPending ? "Salvando…" : "Salvar Destino"}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
