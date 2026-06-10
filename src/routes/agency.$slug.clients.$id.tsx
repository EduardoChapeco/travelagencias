import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ArrowLeft, Save, Edit3, Trash2, Merge, X, Check, FileText, Calendar, FileSignature, ShieldCheck, Ticket as TicketIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { Field, Input, Select, Textarea, PrimaryButton, fmtDate, money, StatusBadge } from "@/components/ui/form";
import { MultiFileUploader } from "@/components/uploads/MultiFileUploader";

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
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const allClientsQ = useQuery({
    enabled: isMerging,
    queryKey: ["clients-for-merge", agency?.id, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name, email, document")
        .eq("agency_id", agency!.id)
        .is("deleted_at", null)
        .neq("id", id)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    }
  });

  const proposalsQ = useQuery({
    enabled: !!agency,
    queryKey: ["client-proposals", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("id, number, title, status, total, currency, created_at")
        .eq("client_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const tripsQ = useQuery({
    enabled: !!agency,
    queryKey: ["client-trips", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("id, number, title, status, travel_start, travel_end, total_sale, currency, created_at")
        .eq("client_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const lgpdQ = useQuery({
    enabled: !!id,
    queryKey: ["client-lgpd", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_acceptances")
        .select("id, accepted_at, context, document_id")
        .eq("client_id", id)
        .order("accepted_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const ticketsQ = useQuery({
    enabled: !!agency,
    queryKey: ["client-tickets", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, code, title, status, created_at")
        .eq("client_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const timelineEvents = [
    ...(proposalsQ.data ?? []).map(p => ({ type: "proposal", date: p.created_at, data: p })),
    ...(tripsQ.data ?? []).map(t => ({ type: "trip", date: t.created_at, data: t })),
    ...(lgpdQ.data ?? []).map(l => ({ type: "lgpd", date: l.accepted_at, data: l })),
    ...(ticketsQ.data ?? []).map(t => ({ type: "ticket", date: t.created_at, data: t })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    if (clientQ.data) setForm(clientQ.data);
  }, [clientQ.data]);

  const save = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase.from("clients").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil atualizado");
      setIsEditing(false);
      qc.invalidateQueries({ queryKey: ["client", id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const softDelete = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clients").update({ deleted_at: new Date().toISOString() } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente arquivado com segurança.");
      navigate({ to: "/agency/$slug/clients", params: { slug } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao deletar"),
  });

  const mergeClients = useMutation({
    mutationFn: async () => {
      if (!mergeTargetId) throw new Error("Selecione o cliente para unificar.");
      // this client (id) will be merged INTO mergeTargetId
      const { error } = await supabase.rpc("merge_clients", { p_target_id: mergeTargetId, p_source_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Clientes unificados com sucesso!");
      navigate({ to: "/agency/$slug/clients/$id", params: { slug, id: mergeTargetId } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao unificar"),
  });

  if (clientQ.isLoading || !form) return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;
  if (!clientQ.data) return <div className="p-8 text-sm text-muted-foreground">Cliente não encontrado.</div>;

  const c = form as any;
  const tags = c.tags || [];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header Premium */}
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-border">
        <div>
          <Link to="/agency/$slug/clients" params={{ slug }} className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Base de Clientes
          </Link>
          
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{c.full_name}</h1>
            <StatusBadge tone={c.kind === "company" ? "primary" : "neutral"}>
              {c.kind === "company" ? "B2B" : "B2C"}
            </StatusBadge>
            {c.deleted_at && <StatusBadge tone="danger">Arquivado</StatusBadge>}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {tags.map((t: string) => (
              <span key={t} className="px-3 py-1 bg-foreground text-background text-xs font-bold rounded-full">{t}</span>
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
              <button onClick={() => setIsMerging(true)} className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-semibold hover:bg-surface transition-colors">
                <Merge className="w-4 h-4" /> Unificar Cadastro
              </button>
              <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity">
                <Edit3 className="w-4 h-4" /> Editar Perfil
              </button>
            </>
          ) : (
            <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-semibold hover:bg-surface transition-colors">
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
            Aviso: Este cliente <strong>({c.full_name})</strong> será transferido e unido a outro cadastro. Todo o histórico, viagens e tickets serão movidos, e este registro será arquivado (Soft Delete).
          </p>
          <div className="flex items-end gap-4 max-w-xl">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-2">Mover tudo para o cliente:</label>
              <select 
                className="w-full h-12 px-4 rounded-2xl border border-border bg-background text-sm outline-none"
                value={mergeTargetId}
                onChange={(e) => setMergeTargetId(e.target.value)}
              >
                <option value="">Selecione um cliente de destino...</option>
                {allClientsQ.data?.map(cli => (
                  <option key={cli.id} value={cli.id}>{cli.full_name} {cli.email ? `(${cli.email})` : ''}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={() => { if(confirm("Confirmar a unificação? Esta ação moverá todo o histórico.")) mergeClients.mutate(); }}
              disabled={!mergeTargetId || mergeClients.isPending}
              className="h-12 px-6 rounded-full bg-warning text-warning-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {mergeClients.isPending ? "Unificando..." : "Confirmar Unificação"}
            </button>
            <button onClick={() => setIsMerging(false)} className="h-12 px-4 rounded-full border border-border text-sm font-bold">Cancelar</button>
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
                <InfoBlock label="Contato" value={c.phone || c.email ? <>{c.phone} <br/><span className="text-muted-foreground">{c.email}</span></> : "Sem contato"} />
                <InfoBlock label="Nascimento" value={c.birth_date ? fmtDate(c.birth_date) : "Não informado"} />
                <InfoBlock label="Documentos Nacionais" value={c.cpf || c.rg ? <>{c.cpf ? `CPF: ${c.cpf}` : ''} {c.rg ? ` / RG: ${c.rg}` : ''}</> : "Não informado"} />
                <InfoBlock label="Passaporte" value={c.passport_number ? <>{c.passport_number} <br/><span className="text-muted-foreground text-xs">Vence em: {c.passport_expiry ? fmtDate(c.passport_expiry) : "?"}</span></> : "Não informado"} />
              </div>
              
              <div className="rounded-3xl border border-border bg-surface p-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Preferências e Observações</h3>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{c.notes || "Sem anotações internas."}</p>
                {c.preferences?.dietary && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <span className="text-xs font-bold text-danger uppercase">Restrições Alimentares:</span>
                    <p className="text-sm font-medium mt-1">{c.preferences.dietary}</p>
                  </div>
                )}
                {c.preferences?.notes && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Outras Preferências:</span>
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
                <Field label="Nome completo"><Input value={c.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Tipo"><Select value={c.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}><option value="individual">Pessoa física</option><option value="company">Empresa</option></Select></Field>
                  <Field label="Nascimento"><Input type="date" value={c.birth_date ?? ""} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></Field>
                </div>
                <Field label="Email"><Input type="email" value={c.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
                <Field label="Telefone / WhatsApp"><Input value={c.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
                <Field label="CPF"><Input value={c.cpf ?? ""} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></Field>
                <Field label="Passaporte"><Input value={c.passport_number ?? ""} onChange={(e) => setForm({ ...form, passport_number: e.target.value })} /></Field>
                <Field label="Vencimento do Passaporte"><Input type="date" value={c.passport_expiry ?? ""} onChange={(e) => setForm({ ...form, passport_expiry: e.target.value })} /></Field>
              </div>

              <div className="border-t border-border/50 pt-4">
                <Field label="Arquivos e Fotos Privados (RG, Passaporte)"><MultiFileUploader bucket="passenger-documents" folder={`clients/${id}`} max={10} values={c.document_images ?? []} onChange={(urls) => setForm({ ...form, document_images: urls })} /></Field>
              </div>

              <div className="border-t border-border/50 pt-4 grid gap-4">
                <Field label="Restrições Alimentares / Alergias"><Input value={c.preferences?.dietary ?? ""} onChange={(e) => setForm({ ...form, preferences: { ...c.preferences, dietary: e.target.value } })} /></Field>
                <Field label="Anotações e Preferências Gerais"><Textarea rows={3} value={c.preferences?.notes ?? ""} onChange={(e) => setForm({ ...form, preferences: { ...c.preferences, notes: e.target.value } })} /></Field>
                <Field label="Notas internas (Visíveis só para Agência)"><Textarea rows={3} value={c.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
              </div>

              <div className="flex items-center justify-between border-t border-border/50 pt-4">
                <button type="button" onClick={() => { if(confirm("Deseja realmente arquivar este cliente?")) softDelete.mutate(); }} className="text-danger hover:underline text-sm font-semibold flex items-center gap-1.5"><Trash2 className="w-4 h-4"/> Arquivar Cliente</button>
                <button type="submit" disabled={save.isPending} className="h-12 px-8 rounded-full bg-foreground text-background text-sm font-bold flex items-center gap-2 hover:opacity-90">
                  <Check className="w-4 h-4" /> {save.isPending ? "Salvando..." : "Salvar Edição"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Painel Direito: Timeline Premium */}
        <aside className="rounded-3xl border border-border bg-background p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6">Linha do Tempo 360</h2>
          
          {timelineEvents.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-10">Nenhum histórico registrado ainda.</div>
          ) : (
            <div className="relative border-l border-border ml-3 pl-6 space-y-8 py-2">
              {timelineEvents.map((event, i) => (
                <div key={`${event.type}-${i}`} className="relative group">
                  {/* Ícone Flutuante */}
                  <div className="absolute -left-[37px] top-0 bg-background border-2 border-border w-8 h-8 rounded-full flex items-center justify-center shadow-sm">
                    {event.type === 'proposal' && <FileSignature className="h-3.5 w-3.5 text-primary" />}
                    {event.type === 'trip' && <Calendar className="h-3.5 w-3.5 text-success" />}
                    {event.type === 'lgpd' && <ShieldCheck className="h-3.5 w-3.5 text-warning" />}
                    {event.type === 'ticket' && <TicketIcon className="h-3.5 w-3.5 text-danger" />}
                  </div>
                  
                  {/* Conteúdo da Timeline */}
                  {event.type === 'proposal' && (
                    <Link to="/agency/$slug/proposals/$id" params={{ slug, id: event.data.id }} className="block bg-surface p-4 rounded-2xl border border-border/50 hover:border-border transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-primary mb-1">Cotação Enviada</div>
                          <div className="font-semibold text-sm">#{event.data.number} {event.data.title}</div>
                        </div>
                        <StatusBadge tone={event.data.status === "accepted" ? "success" : event.data.status === "rejected" ? "danger" : "neutral"}>{event.data.status}</StatusBadge>
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground flex items-center gap-3">
                        <span>{fmtDate(event.date)}</span>
                        <span className="font-medium text-foreground">{money(Number(event.data.total), event.data.currency)}</span>
                      </div>
                    </Link>
                  )}
                  
                  {event.type === 'trip' && (
                    <Link to="/agency/$slug/trips/$id" params={{ slug, id: event.data.id }} className="block bg-surface p-4 rounded-2xl border border-border/50 hover:border-border transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-success mb-1">Viagem Confirmada</div>
                          <div className="font-semibold text-sm">#{event.data.number} {event.data.title}</div>
                        </div>
                        <StatusBadge tone={event.data.status === "confirmed" ? "success" : event.data.status === "cancelled" ? "danger" : "info"}>{event.data.status}</StatusBadge>
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground flex items-center gap-3">
                        <span>Emissão: {fmtDate(event.date)}</span>
                        <span>Embarque: {fmtDate(event.data.travel_start)}</span>
                      </div>
                    </Link>
                  )}

                  {event.type === 'ticket' && (
                    <Link to="/agency/$slug/support/$ticket_id" params={{ slug, ticket_id: event.data.id }} className="block bg-surface p-4 rounded-2xl border border-border/50 hover:border-border transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-danger mb-1">Ticket de Suporte</div>
                          <div className="font-semibold text-sm">{event.data.code} - {event.data.title}</div>
                        </div>
                        <StatusBadge tone={event.data.status === "resolved" ? "success" : "warning"}>{event.data.status}</StatusBadge>
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground">{fmtDate(event.date)}</div>
                    </Link>
                  )}

                  {event.type === 'lgpd' && (
                    <div className="bg-surface p-4 rounded-2xl border border-border/50">
                      <div className="text-xs font-bold text-warning mb-1">Aceite Legal LGPD</div>
                      <div className="font-semibold text-sm">Aceitou Política via {event.data.context}</div>
                      <div className="mt-3 text-xs text-muted-foreground">{fmtDate(event.date)}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </aside>

      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string, value: React.ReactNode }) {
  return (
    <div className="bg-surface p-5 rounded-3xl border border-border">
      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5">{label}</div>
      <div className="text-sm font-medium leading-relaxed text-foreground">{value}</div>
    </div>
  );
}
