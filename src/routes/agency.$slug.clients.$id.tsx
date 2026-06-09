import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { Field, Input, Select, Textarea, PrimaryButton, fmtDate, money, StatusBadge } from "@/components/ui/form";
import { MultiFileUploader } from "@/components/uploads/MultiFileUploader";
import { ShieldCheck, FileText, CheckCircle2, Ticket as TicketIcon, Calendar, FileSignature, Clock } from "lucide-react";

export const Route = createFileRoute("/agency/$slug/clients/$id")({
  head: () => ({ meta: [{ title: "Cliente · TravelOS" }] }),
  component: ClientDetail,
});

function ClientDetail() {
  const { slug, id } = useParams({ from: "/agency/$slug/clients/$id" });
  const { agency } = useAgency();
  const qc = useQueryClient();

  const clientQ = useQuery({
    enabled: !!agency,
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
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
        .select("id, number, title, status, travel_start, travel_end, total_sale, currency")
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
      toast.success("Salvo");
      qc.invalidateQueries({ queryKey: ["client", id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  if (clientQ.isLoading || !form) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  if (!clientQ.data) return <div className="text-sm text-muted-foreground">Cliente não encontrado.</div>;

  const c = form as {
    full_name: string;
    legal_name: string | null;
    kind: "individual" | "company";
    document: string | null;
    email: string | null;
    phone: string | null;
    birth_date: string | null;
    notes: string | null;
    cpf?: string | null;
    rg?: string | null;
    passport_number?: string | null;
    passport_expiry?: string | null;
    document_images?: string[];
    preferences?: { notes?: string, dietary?: string } | null;
  };

  return (
    <>
      <Link
        to="/agency/$slug/clients"
        params={{ slug }}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar para clientes
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{c.full_name}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {c.kind === "individual" ? "Pessoa física" : "Empresa"} · criado em {fmtDate(clientQ.data.created_at)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <form
          className="space-y-6 rounded-lg border border-border bg-surface p-5"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate({
              full_name: c.full_name,
              legal_name: c.legal_name || null,
              kind: c.kind,
              document: c.document || null,
              email: c.email || null,
              phone: c.phone || null,
              birth_date: c.birth_date || null,
              notes: c.notes || null,
              cpf: c.cpf || null,
              rg: c.rg || null,
              passport_number: c.passport_number || null,
              passport_expiry: c.passport_expiry || null,
              document_images: c.document_images || [],
              preferences: c.preferences || {},
            });
          }}
        >
          <div className="space-y-3 border-b border-border/50 pb-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"><FileText className="h-4 w-4" /> Dados do cliente</h2>
            <Field label="Nome completo">
              <Input value={c.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo">
                <Select value={c.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                  <option value="individual">Pessoa física</option>
                  <option value="company">Empresa</option>
                </Select>
              </Field>
              <Field label="Nascimento">
                <Input type="date" value={c.birth_date ?? ""} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
              </Field>
            </div>
            {c.kind === "company" && (
              <Field label="Razão social">
                <Input value={c.legal_name ?? ""} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email">
                <Input type="email" value={c.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label="Telefone / WhatsApp">
                <Input value={c.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
            </div>
          </div>

          <div className="space-y-3 border-b border-border/50 pb-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Documentação</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="CPF"><Input value={c.cpf ?? ""} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></Field>
              <Field label="RG"><Input value={c.rg ?? ""} onChange={(e) => setForm({ ...form, rg: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Passaporte"><Input value={c.passport_number ?? ""} onChange={(e) => setForm({ ...form, passport_number: e.target.value })} /></Field>
              <Field label="Vencimento do Passaporte"><Input type="date" value={c.passport_expiry ?? ""} onChange={(e) => setForm({ ...form, passport_expiry: e.target.value })} /></Field>
            </div>
          </div>

          <div className="space-y-3 border-b border-border/50 pb-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Arquivos e Fotos</h2>
            <MultiFileUploader
              bucket="passenger-documents"
              folder={`clients/${id}`}
              max={10}
              values={c.document_images ?? []}
              onChange={(urls) => setForm({ ...form, document_images: urls })}
            />
            <p className="text-[10px] text-muted-foreground mt-1">Armazenamento privado e criptografado. Faça upload de cópias de RG, Passaporte e Vistos.</p>
          </div>

          <div className="space-y-3 border-b border-border/50 pb-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Preferências de Viagem</h2>
            <div className="grid gap-3">
              <Field label="Restrições Alimentares / Alergias">
                <Input value={c.preferences?.dietary ?? ""} onChange={(e) => setForm({ ...form, preferences: { ...c.preferences, dietary: e.target.value } })} placeholder="Ex: Vegetariano, alergia a amendoim..." />
              </Field>
              <Field label="Anotações e Preferências Gerais">
                <Textarea rows={3} value={c.preferences?.notes ?? ""} onChange={(e) => setForm({ ...form, preferences: { ...c.preferences, notes: e.target.value } })} placeholder="Assento no corredor, hotel pet-friendly..." />
              </Field>
            </div>
          </div>

          <div className="space-y-3">
            <Field label="Notas internas (Staff)">
              <Textarea value={c.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>

          <div className="pt-2 sticky bottom-0 bg-surface border-t border-border mt-4 pb-2">
            <PrimaryButton type="submit" disabled={save.isPending}>
              <Save className="mr-1.5 inline h-3.5 w-3.5" />
              {save.isPending ? "Salvando…" : "Salvar alterações"}
            </PrimaryButton>
          </div>
        </form>

        <aside className="space-y-4">
          <RelatedCard title="Timeline 360" empty="Nenhum registro histórico">
            <div className="relative border-l border-border/50 ml-3 pl-4 space-y-5 py-2">
              {timelineEvents.map((event, i) => (
                <div key={`${event.type}-${i}`} className="relative">
                  <div className="absolute -left-6 top-1 bg-surface rounded-full p-0.5 border border-border">
                    {event.type === 'proposal' && <FileSignature className="h-3 w-3 text-brand" />}
                    {event.type === 'trip' && <Calendar className="h-3 w-3 text-primary" />}
                    {event.type === 'lgpd' && <ShieldCheck className="h-3 w-3 text-success" />}
                    {event.type === 'ticket' && <TicketIcon className="h-3 w-3 text-warning" />}
                  </div>
                  
                  {event.type === 'proposal' && (
                    <Link to="/agency/$slug/proposals/$id" params={{ slug, id: event.data.id }} className="block hover:bg-surface-alt/40 p-2 -my-2 rounded-md transition-colors">
                      <div className="flex items-center justify-between min-w-0">
                        <div className="font-medium text-xs truncate">Proposta #{event.data.number}</div>
                        <StatusBadge tone={event.data.status === "accepted" ? "success" : event.data.status === "rejected" ? "danger" : "neutral"}>{event.data.status}</StatusBadge>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 flex gap-2">
                        <span>{fmtDate(event.date)}</span>
                        <span>{money(Number(event.data.total), event.data.currency)}</span>
                      </div>
                    </Link>
                  )}
                  
                  {event.type === 'trip' && (
                    <Link to="/agency/$slug/trips/$id" params={{ slug, id: event.data.id }} className="block hover:bg-surface-alt/40 p-2 -my-2 rounded-md transition-colors">
                      <div className="flex items-center justify-between min-w-0">
                        <div className="font-medium text-xs truncate">Viagem #{event.data.number}</div>
                        <StatusBadge tone={event.data.status === "confirmed" ? "success" : event.data.status === "cancelled" ? "danger" : "info"}>{event.data.status}</StatusBadge>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 flex gap-2">
                        <span>{fmtDate(event.date)}</span>
                        <span>{event.data.title}</span>
                      </div>
                    </Link>
                  )}

                  {event.type === 'ticket' && (
                    <Link to="/agency/$slug/support/$ticket_id" params={{ slug, ticket_id: event.data.id }} className="block hover:bg-surface-alt/40 p-2 -my-2 rounded-md transition-colors">
                      <div className="flex items-center justify-between min-w-0">
                        <div className="font-medium text-xs truncate">Ticket {event.data.code}</div>
                        <StatusBadge tone={event.data.status === "resolved" ? "success" : "warning"}>{event.data.status}</StatusBadge>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 flex gap-2">
                        <span>{fmtDate(event.date)}</span>
                        <span>{event.data.title}</span>
                      </div>
                    </Link>
                  )}

                  {event.type === 'lgpd' && (
                    <div className="p-2 -my-2">
                      <div className="font-medium text-xs text-success flex items-center gap-1">Aceite de Termos LGPD</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {fmtDate(event.date)} via {event.data.context}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </RelatedCard>
        </aside>
      </div>
    </>
  );
}

function RelatedCard({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {hasChildren ? <div className="space-y-1.5">{children}</div> : <div className="text-xs text-muted-foreground">{empty}</div>}
    </div>
  );
}
