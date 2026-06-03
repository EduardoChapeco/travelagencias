import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { Field, Input, Select, Textarea, PrimaryButton, fmtDate, money, StatusBadge } from "@/components/ui/form";

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

  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    if (clientQ.data) setForm(clientQ.data);
  }, [clientQ.data]);

  const save = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase.from("clients").update(patch).eq("id", id);
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
          className="space-y-3 rounded-lg border border-border bg-surface p-5"
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
            });
          }}
        >
          <h2 className="text-sm font-semibold">Dados do cliente</h2>
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
            <Field label="Documento">
              <Input value={c.document ?? ""} onChange={(e) => setForm({ ...form, document: e.target.value })} />
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
          {c.kind === "individual" && (
            <Field label="Nascimento">
              <Input type="date" value={c.birth_date ?? ""} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
            </Field>
          )}
          <Field label="Notas internas">
            <Textarea value={c.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="pt-2">
            <PrimaryButton type="submit" disabled={save.isPending}>
              <Save className="mr-1.5 inline h-3.5 w-3.5" />
              {save.isPending ? "Salvando…" : "Salvar"}
            </PrimaryButton>
          </div>
        </form>

        <aside className="space-y-4">
          <RelatedCard title="Propostas" empty="Nenhuma proposta">
            {(proposalsQ.data ?? []).map((p) => (
              <Link
                key={p.id}
                to="/agency/$slug/proposals/$id"
                params={{ slug, id: p.id }}
                className="flex items-center justify-between rounded-md border border-border bg-surface p-2.5 text-xs hover:border-border-strong"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">#{p.number} · {p.title}</div>
                  <div className="text-muted-foreground">{fmtDate(p.created_at)}</div>
                </div>
                <div className="text-right">
                  <StatusBadge tone={p.status === "accepted" ? "success" : p.status === "rejected" ? "danger" : "neutral"}>{p.status}</StatusBadge>
                  <div className="mt-0.5 font-mono">{money(Number(p.total), p.currency)}</div>
                </div>
              </Link>
            ))}
          </RelatedCard>

          <RelatedCard title="Viagens" empty="Nenhuma viagem">
            {(tripsQ.data ?? []).map((t) => (
              <Link
                key={t.id}
                to="/agency/$slug/trips/$id"
                params={{ slug, id: t.id }}
                className="flex items-center justify-between rounded-md border border-border bg-surface p-2.5 text-xs hover:border-border-strong"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">#{t.number} · {t.title}</div>
                  <div className="text-muted-foreground">{fmtDate(t.travel_start)} → {fmtDate(t.travel_end)}</div>
                </div>
                <StatusBadge tone={t.status === "confirmed" ? "success" : t.status === "cancelled" ? "danger" : "info"}>{t.status}</StatusBadge>
              </Link>
            ))}
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
