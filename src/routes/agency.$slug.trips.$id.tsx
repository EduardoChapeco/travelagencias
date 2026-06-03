import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { Field, Input, Select, Textarea, PrimaryButton, StatusBadge, money, fmtDate } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/trips/$id")({
  head: () => ({ meta: [{ title: "Viagem · TravelOS" }] }),
  component: TripDetail,
});

type Trip = {
  id: string; number: number; title: string; status: string;
  destination: string | null; travel_start: string | null; travel_end: string | null;
  currency: string; total_sale: number; total_cost: number;
  client_id: string | null; proposal_id: string | null; notes: string | null;
  code: string | null;
};

function TripDetail() {
  const { slug, id } = useParams({ from: "/agency/$slug/trips/$id" });
  const { agency } = useAgency();
  const qc = useQueryClient();

  const tripQ = useQuery({
    enabled: !!agency,
    queryKey: ["trip", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("trips").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Trip | null;
    },
  });

  const paxQ = useQuery({
    enabled: !!agency,
    queryKey: ["passengers", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_passengers")
        .select("*")
        .eq("trip_id", id)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [form, setForm] = useState<Trip | null>(null);
  useEffect(() => { if (tripQ.data) setForm(tripQ.data); }, [tripQ.data]);

  const save = useMutation({
    mutationFn: async (patch: Partial<Trip>) => {
      const { error } = await supabase.from("trips").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Salvo");
      qc.invalidateQueries({ queryKey: ["trip", id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  if (tripQ.isLoading || !form) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  if (!tripQ.data) return <div className="text-sm text-muted-foreground">Viagem não encontrada.</div>;

  const t = form;
  const margin = Number(t.total_sale || 0) - Number(t.total_cost || 0);

  return (
    <>
      <Link to="/agency/$slug/trips" params={{ slug }} className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">#{t.number}</span>
            <StatusBadge tone={t.status === "confirmed" ? "success" : t.status === "cancelled" ? "danger" : "info"}>{t.status}</StatusBadge>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{t.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{t.destination ?? "—"} · {fmtDate(t.travel_start)} → {fmtDate(t.travel_end)}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/agency/$slug/trips/$id/passengers" params={{ slug, id }} className="h-9 rounded-md border border-border px-3 text-sm font-medium hover:bg-surface-alt inline-flex items-center">
            Passageiros ({paxQ.data?.length ?? 0})
          </Link>
          <Link to="/agency/$slug/trips/$id/vouchers" params={{ slug, id }} className="h-9 rounded-md border border-border px-3 text-sm font-medium hover:bg-surface-alt inline-flex items-center">
            Vouchers
          </Link>
          <Link to="/agency/$slug/trips/$id/financial" params={{ slug, id }} className="h-9 rounded-md border border-border px-3 text-sm font-medium hover:bg-surface-alt inline-flex items-center">
            Financeiro
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <form
          className="space-y-3 rounded-lg border border-border bg-surface p-5"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate({
              title: t.title,
              destination: t.destination,
              travel_start: t.travel_start,
              travel_end: t.travel_end,
              status: t.status,
              currency: t.currency,
              total_sale: t.total_sale,
              total_cost: t.total_cost,
              notes: t.notes,
              code: t.code,
            });
          }}
        >
          <h2 className="text-sm font-semibold">Dados da viagem</h2>
          <Field label="Título"><Input value={t.title} onChange={(e) => setForm({ ...t, title: e.target.value })} /></Field>
          <Field label="Código interno"><Input value={t.code ?? ""} onChange={(e) => setForm({ ...t, code: e.target.value })} /></Field>
          <Field label="Destino"><Input value={t.destination ?? ""} onChange={(e) => setForm({ ...t, destination: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Início"><Input type="date" value={t.travel_start ?? ""} onChange={(e) => setForm({ ...t, travel_start: e.target.value || null })} /></Field>
            <Field label="Volta"><Input type="date" value={t.travel_end ?? ""} onChange={(e) => setForm({ ...t, travel_end: e.target.value || null })} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Status">
              <Select value={t.status} onChange={(e) => setForm({ ...t, status: e.target.value })}>
                <option value="planning">Planejamento</option>
                <option value="confirmed">Confirmada</option>
                <option value="in_progress">Em andamento</option>
                <option value="completed">Concluída</option>
                <option value="cancelled">Cancelada</option>
              </Select>
            </Field>
            <Field label="Venda (R$)">
              <Input type="number" min={0} step="0.01" value={t.total_sale} onChange={(e) => setForm({ ...t, total_sale: +e.target.value || 0 })} />
            </Field>
            <Field label="Custo (R$)">
              <Input type="number" min={0} step="0.01" value={t.total_cost} onChange={(e) => setForm({ ...t, total_cost: +e.target.value || 0 })} />
            </Field>
          </div>
          <Field label="Notas internas"><Textarea value={t.notes ?? ""} onChange={(e) => setForm({ ...t, notes: e.target.value })} /></Field>
          <div className="pt-2">
            <PrimaryButton type="submit" disabled={save.isPending}>
              <Save className="mr-1.5 inline h-3.5 w-3.5" />
              {save.isPending ? "Salvando…" : "Salvar"}
            </PrimaryButton>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Margem</h3>
            <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Venda</span><span className="font-mono">{money(Number(t.total_sale), t.currency)}</span></div>
            <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Custo</span><span className="font-mono">{money(Number(t.total_cost), t.currency)}</span></div>
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
              <span className="text-xs font-semibold">Lucro</span>
              <span className={`font-mono text-sm font-semibold ${margin >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {money(margin, t.currency)}
              </span>
            </div>
          </div>

          {t.proposal_id && (
            <Link
              to="/agency/$slug/proposals/$id"
              params={{ slug, id: t.proposal_id }}
              className="block rounded-lg border border-border bg-surface p-4 text-xs hover:border-border-strong"
            >
              <div className="text-muted-foreground">Originada da cotação</div>
              <div className="mt-1 font-medium">Ver proposta →</div>
            </Link>
          )}
          {t.client_id && (
            <Link
              to="/agency/$slug/clients/$id"
              params={{ slug, id: t.client_id }}
              className="block rounded-lg border border-border bg-surface p-4 text-xs hover:border-border-strong"
            >
              <div className="text-muted-foreground">Cliente</div>
              <div className="mt-1 font-medium">Ver cliente →</div>
            </Link>
          )}
        </aside>
      </div>
    </>
  );
}
