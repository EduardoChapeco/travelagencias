import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Save,
  Edit3,
  Trash2,
  Merge,
  X,
  Check,
  FileText,
  Calendar,
  FileSignature,
  ShieldCheck,
  Ticket as TicketIcon,
  FileUp,
  AlertTriangle,
  Brain,
  Sparkles,
  Plane,
  CreditCard,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAgency } from "@/lib/agency-context";
import {
  Field,
  Input,
  Select,
  Textarea,
  PrimaryButton,
  fmtDate,
  money,
  StatusBadge,
} from "@/components/ui/form";
import { MultiFileUploader } from "@/components/uploads/MultiFileUploader";
import {
  fetchClient,
  fetchClientsForMerge,
  fetchClientProposals,
  fetchClientTrips,
  fetchClientLegalAcceptances,
  fetchClientTickets,
  updateClientProfile,
  archiveClient,
  mergeClients,
} from "@/services/clients";

export const Route = createFileRoute("/agency/$slug/clients/$id")({
  head: () => ({ meta: [{ title: "Cliente · TravelOS" }] }),
  component: ClientDetail,
});

function ClientDetail() {
  const { slug, id } = useParams({ from: "/agency/$slug/clients/$id" });
  const { agency } = useAgency();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState("");

  const clientQ = useQuery({
    enabled: !!agency,
    queryKey: ["client", id],
    queryFn: () => fetchClient(id),
  });

  const allClientsQ = useQuery({
    enabled: isMerging,
    queryKey: ["clients-for-merge", agency?.id, id],
    queryFn: () => fetchClientsForMerge(agency!.id, id),
  });

  const proposalsQ = useQuery({
    enabled: !!agency,
    queryKey: ["client-proposals", id],
    queryFn: () => fetchClientProposals(id),
  });

  const tripsQ = useQuery({
    enabled: !!agency,
    queryKey: ["client-trips", id],
    queryFn: () => fetchClientTrips(id),
  });

  const lgpdQ = useQuery({
    enabled: !!id,
    queryKey: ["client-lgpd", id],
    queryFn: () => fetchClientLegalAcceptances(id),
  });

  const ticketsQ = useQuery({
    enabled: !!agency,
    queryKey: ["client-tickets", id],
    queryFn: () => fetchClientTickets(id),
  });

  const timelineEvents = [
    ...(proposalsQ.data ?? []).map((p) => ({ type: "proposal", date: p.created_at, data: p })),
    ...(tripsQ.data ?? []).map((t) => ({ type: "trip", date: t.created_at, data: t })),
    ...(lgpdQ.data ?? []).map((l: any) => ({ type: "lgpd", date: l.accepted_at, data: l })),
    ...(ticketsQ.data ?? []).map((t) => ({ type: "ticket", date: t.created_at, data: t })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    if (clientQ.data) setForm(clientQ.data);
  }, [clientQ.data]);

  const save = useMutation({
    mutationFn: (patch: Record<string, unknown>) => updateClientProfile(id, patch),
    onSuccess: () => {
      toast.success("Perfil atualizado");
      setIsEditing(false);
      qc.invalidateQueries({ queryKey: ["client", id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const softDelete = useMutation({
    mutationFn: () => archiveClient(id),
    onSuccess: () => {
      toast.success("Cliente arquivado com segurança.");
      navigate({ to: "/agency/$slug/clients", params: { slug } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao deletar"),
  });

  const mergeClientsMutation = useMutation({
    mutationFn: async () => {
      if (!mergeTargetId) throw new Error("Selecione o cliente para unificar.");
      await mergeClients(id, mergeTargetId);
    },
    onSuccess: () => {
      toast.success("Clientes unificados com sucesso!");
      navigate({ to: "/agency/$slug/clients/$id", params: { slug, id: mergeTargetId } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao unificar"),
  });

  if (clientQ.isLoading || !form)
    return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;
  if (!clientQ.data)
    return <div className="p-8 text-sm text-muted-foreground">Cliente não encontrado.</div>;

  const c = form as any;
  const tags = c.tags || [];

  return (
    <div className="space-y-6">
      {/* Header Premium */}
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-border">
        <div>
          <Link
            to="/agency/$slug/clients"
            params={{ slug }}
            className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Base de Clientes
          </Link>

          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              {c.full_name}
            </h1>
            <StatusBadge tone={c.kind === "company" ? "info" : "neutral"}>
              {c.kind === "company" ? "B2B" : "B2C"}
            </StatusBadge>
            {c.deleted_at && <StatusBadge tone="danger">Arquivado</StatusBadge>}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {tags.map((t: string) => (
              <span
                key={t}
                className="px-3 py-1 bg-foreground text-background text-xs font-bold rounded-full"
              >
                {t}
              </span>
            ))}
            <button
              onClick={() => {
                const newTag = prompt("Nome da nova Tag:");
                if (newTag) save.mutate({ tags: [...tags, newTag] });
              }}
              className="px-3 py-1 border border-dashed border-border text-muted-foreground hover:text-foreground text-xs font-semibold rounded-full transition-colors"
            >
              + Tag
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsMerging(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-semibold hover:bg-surface transition-colors"
              >
                <Merge className="w-4 h-4" /> Unificar Cadastro
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <Edit3 className="w-4 h-4" /> Editar Perfil
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-semibold hover:bg-surface transition-colors"
            >
              <X className="w-4 h-4" /> Cancelar
            </button>
          )}
        </div>
      </header>

      {/* Modal de Merge */}
      {isMerging && (
        <div className="p-6 rounded-3xl border border-warning/50 bg-warning/5 mb-6 space-y-4">
          <div className="flex items-center gap-2 text-warning font-bold">
            <Merge className="w-5 h-5" /> Unificar Cadastros
          </div>
          <p className="text-sm text-muted-foreground">
            Aviso: Este cliente <strong>({c.full_name})</strong> será transferido e unido a outro
            cadastro. Todo o histórico, viagens e tickets serão movidos, e este registro será
            arquivado (Soft Delete).
          </p>
          <div className="flex items-end gap-4 max-w-xl">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-2">
                Mover tudo para o cliente:
              </label>
              <select
                className="w-full h-12 px-4 rounded-2xl border border-border bg-background text-sm outline-none"
                value={mergeTargetId}
                onChange={(e) => setMergeTargetId(e.target.value)}
              >
                <option value="">Selecione um cliente de destino...</option>
                {allClientsQ.data?.map((cli) => (
                  <option key={cli.id} value={cli.id}>
                    {cli.full_name} {cli.email ? `(${cli.email})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                if (confirm("Confirmar a unificação? Esta ação moverá todo o histórico."))
                  mergeClientsMutation.mutate();
              }}
              disabled={!mergeTargetId || mergeClientsMutation.isPending}
              className="h-12 px-6 rounded-full bg-warning text-warning-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {mergeClientsMutation.isPending ? "Unificando..." : "Confirmar Unificação"}
            </button>
            <button
              onClick={() => setIsMerging(false)}
              className="h-12 px-4 rounded-full border border-border text-sm font-bold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        {/* Painel Esquerdo: Dados */}
        <div className="space-y-6">
          {!isEditing ? (
            <div className="space-y-6">
              {/* Leitura Limpa */}
              <div className="grid md:grid-cols-2 gap-4">
                <InfoBlock
                  label="Contato"
                  value={
                    c.phone || c.email ? (
                      <>
                        {c.phone} <br />
                        <span className="text-muted-foreground">{c.email}</span>
                      </>
                    ) : (
                      "Sem contato"
                    )
                  }
                />
                <InfoBlock
                  label="Nascimento"
                  value={c.birth_date ? fmtDate(c.birth_date) : "Não informado"}
                />
                <InfoBlock
                  label="Documentos Nacionais"
                  value={
                    c.cpf || c.rg ? (
                      <>
                        {c.cpf ? `CPF: ${c.cpf}` : ""} {c.rg ? ` / RG: ${c.rg}` : ""}
                      </>
                    ) : (
                      "Não informado"
                    )
                  }
                />
                <InfoBlock
                  label="Passaporte"
                  value={
                    c.passport_number ? (
                      <>
                        {c.passport_number} <br />
                        <span className="text-muted-foreground text-xs">
                          Vence em: {c.passport_expiry ? fmtDate(c.passport_expiry) : "?"}
                        </span>
                      </>
                    ) : (
                      "Não informado"
                    )
                  }
                />
              </div>

              <div className="rounded-3xl border border-border bg-surface p-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  Preferências e Observações
                </h3>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {c.notes || "Sem anotações internas."}
                </p>
                {c.preferences?.dietary && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <span className="text-xs font-bold text-danger uppercase">
                      Restrições Alimentares:
                    </span>
                    <p className="text-sm font-medium mt-1">{c.preferences.dietary}</p>
                  </div>
                )}
                {c.preferences?.notes && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <span className="text-xs font-bold text-muted-foreground uppercase">
                      Outras Preferências:
                    </span>
                    <p className="text-sm font-medium mt-1">{c.preferences.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form
              className="space-y-6 bg-surface p-6 rounded-3xl border border-border"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate(form as any);
              }}
            >
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Nome completo">
                  <Input
                    value={c.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Tipo">
                    <Select
                      value={c.kind}
                      onChange={(e) => setForm({ ...form, kind: e.target.value })}
                    >
                      <option value="individual">Pessoa física</option>
                      <option value="company">Empresa</option>
                    </Select>
                  </Field>
                  <Field label="Nascimento">
                    <Input
                      type="date"
                      value={c.birth_date ?? ""}
                      onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                    />
                  </Field>
                </div>
                <Field label="Email">
                  <Input
                    type="email"
                    value={c.email ?? ""}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </Field>
                <Field label="Telefone / WhatsApp">
                  <Input
                    value={c.phone ?? ""}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </Field>
                <Field label="CPF">
                  <Input
                    value={c.cpf ?? ""}
                    onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                  />
                </Field>
                <Field label="Passaporte">
                  <Input
                    value={c.passport_number ?? ""}
                    onChange={(e) => setForm({ ...form, passport_number: e.target.value })}
                  />
                </Field>
                <Field label="Vencimento do Passaporte">
                  <Input
                    type="date"
                    value={c.passport_expiry ?? ""}
                    onChange={(e) => setForm({ ...form, passport_expiry: e.target.value })}
                  />
                </Field>
              </div>

              <div className="border-t border-border/50 pt-4">
                <Field label="Arquivos e Fotos Privados (RG, Passaporte)">
                  <MultiFileUploader
                    bucket="passenger-documents"
                    folder={`clients/${id}`}
                    max={10}
                    values={c.document_images ?? []}
                    onChange={(urls) => setForm({ ...form, document_images: urls })}
                  />
                </Field>
              </div>

              <div className="border-t border-border/50 pt-4 grid gap-4">
                <Field label="Restrições Alimentares / Alergias">
                  <Input
                    value={c.preferences?.dietary ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        preferences: { ...c.preferences, dietary: e.target.value },
                      })
                    }
                  />
                </Field>
                <Field label="Anotações e Preferências Gerais">
                  <Textarea
                    rows={3}
                    value={c.preferences?.notes ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, preferences: { ...c.preferences, notes: e.target.value } })
                    }
                  />
                </Field>
                <Field label="Notas internas (Visíveis só para Agência)">
                  <Textarea
                    rows={3}
                    value={c.notes ?? ""}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </Field>
              </div>

              <div className="flex items-center justify-between border-t border-border/50 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Deseja realmente arquivar este cliente?")) softDelete.mutate();
                  }}
                  className="text-danger hover:underline text-sm font-semibold flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Arquivar Cliente
                </button>
                <button
                  type="submit"
                  disabled={save.isPending}
                  className="h-12 px-8 rounded-full bg-foreground text-background text-sm font-bold flex items-center gap-2 hover:opacity-90"
                >
                  <Check className="w-4 h-4" /> {save.isPending ? "Salvando..." : "Salvar Edição"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Painel Direito: Abas adicionais */}
        <div className="space-y-6">
          {/* Aba Documentos */}
          <DocumentsPanel clientId={id} agencyId={agency?.id ?? ""} />

          {/* Aba Análise IA */}
          <AIAnalysisPanel client={c} trips={tripsQ.data ?? []} proposals={proposalsQ.data ?? []} />

          {/* Timeline Premium */}
          <aside className="rounded-3xl border border-border bg-background p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6">
            Linha do Tempo 360
          </h2>

          {timelineEvents.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-10">
              Nenhum histórico registrado ainda.
            </div>
          ) : (
            <div className="relative border-l border-border ml-3 pl-6 space-y-8 py-2">
              {timelineEvents.map((event: any, i) => (
                <div key={`${event.type}-${i}`} className="relative group">
                  {/* Ícone Flutuante */}
                  <div className="absolute -left-[37px] top-0 bg-background border-2 border-border w-8 h-8 rounded-full flex items-center justify-center ">
                    {event.type === "proposal" && (
                      <FileSignature className="h-3.5 w-3.5 text-primary" />
                    )}
                    {event.type === "trip" && <Calendar className="h-3.5 w-3.5 text-success" />}
                    {event.type === "lgpd" && <ShieldCheck className="h-3.5 w-3.5 text-warning" />}
                    {event.type === "ticket" && <TicketIcon className="h-3.5 w-3.5 text-danger" />}
                  </div>

                  {/* Conteúdo da Timeline */}
                  {event.type === "proposal" && (
                    <Link
                      to="/agency/$slug/proposals/$id"
                      params={{ slug, id: event.data.id }}
                      className="block bg-surface p-4 rounded-2xl border border-border/50 hover:border-border transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-primary mb-1">Cotação Enviada</div>
                          <div className="font-semibold text-sm">
                            #{event.data.number} {event.data.title}
                          </div>
                        </div>
                        <StatusBadge
                          tone={
                            event.data.status === "accepted"
                              ? "success"
                              : event.data.status === "rejected"
                                ? "danger"
                                : "neutral"
                          }
                        >
                          {event.data.status}
                        </StatusBadge>
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground flex items-center gap-3">
                        <span>{fmtDate(event.date)}</span>
                        <span className="font-medium text-foreground">
                          {money(Number(event.data.total), event.data.currency)}
                        </span>
                      </div>
                    </Link>
                  )}

                  {event.type === "trip" && (
                    <Link
                      to="/agency/$slug/trips/$id"
                      params={{ slug, id: event.data.id }}
                      className="block bg-surface p-4 rounded-2xl border border-border/50 hover:border-border transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-success mb-1">
                            Viagem Confirmada
                          </div>
                          <div className="font-semibold text-sm">
                            #{event.data.number} {event.data.title}
                          </div>
                        </div>
                        <StatusBadge
                          tone={
                            event.data.status === "confirmed"
                              ? "success"
                              : event.data.status === "cancelled"
                                ? "danger"
                                : "info"
                          }
                        >
                          {event.data.status}
                        </StatusBadge>
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground flex items-center gap-3">
                        <span>Emissão: {fmtDate(event.date)}</span>
                        <span>Embarque: {fmtDate(event.data.travel_start)}</span>
                      </div>
                    </Link>
                  )}

                  {event.type === "ticket" && (
                    <Link
                      to="/agency/$slug/support/$ticket_id"
                      params={{ slug, ticket_id: event.data.id }}
                      className="block bg-surface p-4 rounded-2xl border border-border/50 hover:border-border transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-danger mb-1">
                            Ticket de Suporte
                          </div>
                          <div className="font-semibold text-sm">
                            {event.data.code} - {event.data.title}
                          </div>
                        </div>
                        <StatusBadge
                          tone={event.data.status === "resolved" ? "success" : "warning"}
                        >
                          {event.data.status}
                        </StatusBadge>
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground">
                        {fmtDate(event.date)}
                      </div>
                    </Link>
                  )}

                  {event.type === "lgpd" && (
                    <div className="bg-surface p-4 rounded-2xl border border-border/50">
                      <div className="text-xs font-bold text-warning mb-1">Aceite Legal LGPD</div>
                      <div className="font-semibold text-sm">
                        Aceitou Política via {event.data.context}
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground">
                        {fmtDate(event.date)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-surface p-5 rounded-3xl border border-border">
      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
        {label}
      </div>
      <div className="text-sm font-medium leading-relaxed text-foreground">{value}</div>
    </div>
  );
}

// ─── DocumentsPanel ───────────────────────────────────────────────────────────

const DOC_TYPES: { value: string; label: string }[] = [
  { value: "passport", label: "Passaporte" },
  { value: "rg", label: "RG" },
  { value: "cpf", label: "CPF" },
  { value: "birth_cert", label: "Certidão de Nascimento" },
  { value: "cnh", label: "CNH" },
  { value: "visa", label: "Visto" },
  { value: "vaccination_card", label: "Cartão de Vacinação" },
  { value: "insurance", label: "Seguro" },
  { value: "other", label: "Outro" },
];

function DocumentsPanel({ clientId, agencyId }: { clientId: string; agencyId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ doc_type: "passport", doc_number: "", issued_at: "", expires_at: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const docsQ = useQuery({
    queryKey: ["client-documents", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_documents" as any)
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data ?? []) as any[];
    },
  });

  async function saveDoc() {
    setSaving(true);
    const { error } = await supabase.from("client_documents" as any).insert({
      client_id: clientId,
      agency_id: agencyId,
      doc_type: form.doc_type,
      doc_number: form.doc_number || null,
      issued_at: form.issued_at || null,
      expires_at: form.expires_at || null,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) return toast.error("Erro ao salvar documento: " + error.message);
    toast.success("Documento adicionado!");
    setAdding(false);
    setForm({ doc_type: "passport", doc_number: "", issued_at: "", expires_at: "", notes: "" });
    qc.invalidateQueries({ queryKey: ["client-documents", clientId] });
  }

  async function deleteDoc(docId: string) {
    if (!confirm("Remover este documento?")) return;
    await supabase.from("client_documents" as any).delete().eq("id", docId);
    qc.invalidateQueries({ queryKey: ["client-documents", clientId] });
    toast.success("Documento removido.");
  }

  const today = new Date();
  const soon = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

  function expiryStatus(expiresAt?: string) {
    if (!expiresAt) return null;
    const d = new Date(expiresAt + "T00:00:00");
    if (d < today) return "expired";
    if (d < soon) return "soon";
    return "ok";
  }

  const docs = docsQ.data ?? [];
  const expiredCount = docs.filter((d: any) => expiryStatus(d.expires_at) === "expired").length;
  const soonCount = docs.filter((d: any) => expiryStatus(d.expires_at) === "soon").length;

  return (
    <div className="rounded-3xl border border-border bg-background overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-4 text-sm font-bold hover:bg-surface/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-brand" />
          Documentos ({docs.length})
        </div>
        <div className="flex items-center gap-2">
          {expiredCount > 0 && (
            <span className="text-[10px] font-bold bg-danger/10 text-danger border border-danger/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {expiredCount} vencido(s)
            </span>
          )}
          {soonCount > 0 && (
            <span className="text-[10px] font-bold bg-warning/10 text-warning border border-warning/30 px-2 py-0.5 rounded-full">
              {soonCount} vence em breve
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-4 border-t border-border/50">
          {docs.length === 0 && !adding && (
            <p className="pt-4 text-sm text-muted-foreground text-center">Nenhum documento cadastrado.</p>
          )}

          {docs.map((doc: any) => {
            const status = expiryStatus(doc.expires_at);
            return (
              <div
                key={doc.id}
                className={`flex items-start justify-between gap-3 rounded-xl border p-3 ${
                  status === "expired"
                    ? "border-danger/30 bg-danger/5"
                    : status === "soon"
                      ? "border-warning/30 bg-warning/5"
                      : "border-border bg-surface"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-foreground">
                      {DOC_TYPES.find((t) => t.value === doc.doc_type)?.label ?? doc.doc_type}
                    </span>
                    {status === "expired" && (
                      <span className="text-[10px] font-bold text-danger">⚠ VENCIDO</span>
                    )}
                    {status === "soon" && (
                      <span className="text-[10px] font-bold text-warning">⏰ Vence em breve</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {doc.doc_number && <span>Nº {doc.doc_number} · </span>}
                    {doc.expires_at && <span>Vence: {new Date(doc.expires_at + "T00:00:00").toLocaleDateString("pt-BR")}</span>}
                    {doc.notes && <span> · {doc.notes}</span>}
                  </div>
                </div>
                <button
                  onClick={() => deleteDoc(doc.id)}
                  className="text-muted-foreground hover:text-danger transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}

          {adding && (
            <div className="rounded-xl border border-brand/30 bg-brand/5 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Tipo</label>
                  <select
                    value={form.doc_type}
                    onChange={(e) => setForm({ ...form, doc_type: e.target.value })}
                    className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs outline-none"
                  >
                    {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Número</label>
                  <input
                    value={form.doc_number}
                    onChange={(e) => setForm({ ...form, doc_number: e.target.value })}
                    className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs outline-none"
                    placeholder="Ex: AB123456"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Emissão</label>
                  <input
                    type="date"
                    value={form.issued_at}
                    onChange={(e) => setForm({ ...form, issued_at: e.target.value })}
                    className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Vencimento</label>
                  <input
                    type="date"
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                    className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveDoc}
                  disabled={saving}
                  className="flex-1 h-9 rounded-lg bg-brand text-white text-xs font-bold hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
                <button
                  onClick={() => setAdding(false)}
                  className="h-9 px-4 rounded-lg border border-border text-xs font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
            >
              <FileUp className="h-3.5 w-3.5" /> Adicionar documento
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── AIAnalysisPanel ──────────────────────────────────────────────────────────

function AIAnalysisPanel({
  client,
  trips,
  proposals,
}: {
  client: any;
  trips: any[];
  proposals: any[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  async function runAnalysis() {
    setLoading(true);
    try {
      const clientSummaryInfo = {
        name: client.full_name,
        email: client.email,
        phone: client.phone,
        birth_date: client.birth_date,
        cpf: client.cpf,
        rg: client.rg,
        passport_number: client.passport_number,
        passport_expiry: client.passport_expiry,
        dietary: client.preferences?.dietary,
        preferences_notes: client.preferences?.notes,
        notes: client.notes,
        tags: client.tags,
      };

      const tripsSummary = trips.map((t: any) => ({
        destination: t.destination,
        total_sale: t.total_sale,
        status: t.status,
        travel_start: t.travel_start,
        title: t.title,
      }));

      const proposalsSummary = proposals.map((p: any) => ({
        title: p.title,
        status: p.status,
        total: p.total,
        created_at: p.created_at,
      }));

      const promptText = `Por favor, analise o perfil do seguinte cliente da agência de viagens e o histórico de interações dele.
Informações do Cliente:
${JSON.stringify(clientSummaryInfo, null, 2)}

Histórico de Viagens:
${JSON.stringify(tripsSummary, null, 2)}

Histórico de Cotações/Propostas:
${JSON.stringify(proposalsSummary, null, 2)}

Gere um objeto JSON contendo exatamente as seguintes chaves. Não inclua nenhuma formatação ou tags de bloco de código markdown como \`\`\`json, retorne apenas o objeto JSON puro:
{
  "summary": "Um resumo detalhado e profissional do comportamento e preferências de viagem do cliente.",
  "retentionScore": "alto" | "médio" | "baixo",
  "suggestions": [
    "Primeira sugestão de engajamento ou destino ideal baseado no perfil",
    "Segunda sugestão para fidelização ou oferta",
    "Terceira sugestão de ação interna para o agente de viagens"
  ],
  "nextAction": "Recomendação clara da próxima ação comercial com o cliente."
}`;

      const systemPromptText = "Você é uma IA analista de comportamento do cliente em uma agência de viagens premium. Sua tarefa é analisar o perfil, o histórico de compras, preferências e interesses para sugerir ações personalizadas.";

      const { data, error } = await supabase.functions.invoke("ai-orchestrator", {
        body: {
          action: "completion",
          prompt: promptText,
          systemPrompt: systemPromptText,
          agency_id: client.agency_id || client.agencyId,
          modelPreference: "smart"
        }
      });

      if (error) throw error;
      let resultText = data?.result;
      if (!resultText) throw new Error("Não foi possível obter uma resposta da IA.");

      // Clean markdown code blocks if the AI model returned them
      resultText = resultText.replace(/```json\s*|```\s*/g, "").trim();
      const parsed = JSON.parse(resultText);

      if (parsed && typeof parsed === "object") {
        setAnalysis(parsed);
      } else {
        throw new Error("Formato inválido de JSON retornado pela IA.");
      }
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Erro ao gerar análise.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-border bg-background overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-4 text-sm font-bold hover:bg-surface/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-brand" />
          Análise IA do Perfil
        </div>
        <div className="text-[10px] font-bold text-brand opacity-70">BETA</div>
      </button>

      {open && (
        <div className="px-6 pb-6 border-t border-border/50 space-y-4">
          {!analysis && !loading && (
            <div className="pt-4 text-center">
              <Sparkles className="h-8 w-8 text-brand mx-auto mb-3 opacity-60" />
              <p className="text-sm text-muted-foreground mb-4">
                A IA analisará o histórico de viagens, cotações e padrões de comportamento do cliente.
              </p>
              <button
                onClick={runAnalysis}
                className="flex items-center gap-1.5 mx-auto h-9 rounded-lg bg-brand text-white px-4 text-xs font-bold hover:opacity-90"
              >
                <Sparkles className="h-3.5 w-3.5" /> Analisar Perfil
              </button>
            </div>
          )}

          {loading && (
            <div className="pt-4 flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              <p className="text-sm text-muted-foreground">Analisando perfil do cliente...</p>
            </div>
          )}

          {analysis && (
            <div className="pt-4 space-y-4">
              {/* Resumo */}
              <div className="rounded-xl bg-surface border border-border p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Resumo</div>
                <p className="text-sm leading-relaxed">{analysis.summary}</p>
              </div>

              {/* Score de Retenção */}
              <div className={`rounded-xl border p-4 ${
                analysis.retentionScore === "alto"
                  ? "border-success/30 bg-success/5"
                  : analysis.retentionScore === "médio"
                    ? "border-brand/30 bg-brand/5"
                    : "border-danger/30 bg-danger/5"
              }`}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Score de Retenção</div>
                <div className={`text-2xl font-black capitalize ${
                  analysis.retentionScore === "alto" ? "text-success" : analysis.retentionScore === "médio" ? "text-brand" : "text-danger"
                }`}>
                  {analysis.retentionScore} risco de churn
                </div>
              </div>

              {/* Sugestões */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sugestões da IA</div>
                {analysis.suggestions.map((s: string, i: number) => (
                  <div key={i} className="flex gap-2 text-sm">
                    <Sparkles className="h-4 w-4 text-brand flex-shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </div>
                ))}
              </div>

              {/* Próxima Ação */}
              <div className="rounded-xl border border-brand/30 bg-brand/5 p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-brand mb-1">Próxima ação recomendada</div>
                <p className="text-sm font-semibold">{analysis.nextAction}</p>
              </div>

              <button
                onClick={runAnalysis}
                className="text-xs text-muted-foreground hover:text-brand underline"
              >
                Regenerar análise
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
