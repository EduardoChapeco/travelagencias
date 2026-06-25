import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { Field, Input, Select, Textarea, PrimaryButton, money } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/trips/$id/")({
  component: TripOverview,
});

function TripOverview() {
  const { slug, id } = Route.useParams();
  const { agency } = useAgency();
  const qc = useQueryClient();

  const tripQ = useQuery({
    enabled: !!agency,
    queryKey: ["trip", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("trips").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const clientsQ = useQuery({
    enabled: !!agency,
    queryKey: ["clients-pick", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name, document")
        .eq("agency_id", agency!.id)
        .order("full_name")
        .limit(5000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [form, setForm] = useState<any>(null);
  useEffect(() => {
    if (tripQ.data) setForm(tripQ.data);
  }, [tripQ.data]);

  const save = useMutation({
    mutationFn: async (patch: any) => {
      const { error } = await supabase.from("trips").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Salvo com sucesso");
      qc.invalidateQueries({ queryKey: ["trip", id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  if (tripQ.isLoading) return <div className="text-sm text-muted-foreground p-6">Carregando…</div>;
  if (!tripQ.data)
    return <div className="text-sm text-muted-foreground p-6">Viagem não encontrada.</div>;
  if (!form) return <div className="text-sm text-muted-foreground p-6">Carregando…</div>;

  const t = form;
  const margin = Number(t.total_sale || 0) - Number(t.total_cost || 0);

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 min-h-0">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <form
          className="space-y-4 rounded-lg border border-border bg-surface p-6 "
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
              client_id: t.client_id || null,
            });
          }}
        >
          <h2 className="text-sm font-semibold mb-2">Dados da Viagem</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Título (Uso Interno)">
              <Input
                value={t.title}
                onChange={(e) => setForm({ ...t, title: e.target.value })}
                className="bg-surface-alt"
              />
            </Field>
            <Field label="Código Interno (Opcional)">
              <Input
                value={t.code ?? ""}
                onChange={(e) => setForm({ ...t, code: e.target.value })}
                className="bg-surface-alt"
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Destino Principal">
              <Input
                value={t.destination ?? ""}
                onChange={(e) => setForm({ ...t, destination: e.target.value })}
                className="bg-surface-alt"
              />
            </Field>
            <Field label="Cliente Responsável">
              <Select
                value={t.client_id ?? ""}
                onChange={(e) => setForm({ ...t, client_id: e.target.value || null })}
                className="bg-surface-alt"
              >
                <option value="">— Sem cliente ainda —</option>
                {(clientsQ.data ?? []).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} {c.document ? `(${c.document})` : ""}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Data de Ida">
              <Input
                type="date"
                value={t.travel_start ?? ""}
                onChange={(e) => setForm({ ...t, travel_start: e.target.value || null })}
                className="bg-surface-alt"
              />
            </Field>
            <Field label="Data de Volta">
              <Input
                type="date"
                value={t.travel_end ?? ""}
                onChange={(e) => setForm({ ...t, travel_end: e.target.value || null })}
                className="bg-surface-alt"
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4 border-t border-border pt-4 mt-2">
            <Field label="Status Operacional">
              <Select
                value={t.status}
                onChange={(e) => setForm({ ...t, status: e.target.value })}
                className="bg-surface-alt"
              >
                <option value="planning">Em Planejamento</option>
                <option value="confirmed">Confirmada</option>
                <option value="in_progress">Em Andamento</option>
                <option value="completed">Concluída</option>
                <option value="cancelled">Cancelada</option>
              </Select>
            </Field>
            <Field label="Venda (R$)">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={t.total_sale}
                onChange={(e) => setForm({ ...t, total_sale: +e.target.value || 0 })}
                className="bg-surface-alt"
              />
            </Field>
            <Field label="Custo Líquido (R$)">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={t.total_cost}
                onChange={(e) => setForm({ ...t, total_cost: +e.target.value || 0 })}
                className="bg-surface-alt"
              />
            </Field>
          </div>
          <Field label="Anotações Internas (Não visíveis ao cliente)">
            <Textarea
              value={t.notes ?? ""}
              onChange={(e) => setForm({ ...t, notes: e.target.value })}
              className="bg-surface-alt min-h-[100px]"
            />
          </Field>
          <div className="pt-2 flex justify-end">
            <PrimaryButton type="submit" disabled={save.isPending}>
              {save.isPending ? (
                "Salvando…"
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Salvar Alterações
                </>
              )}
            </PrimaryButton>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-5 ">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Rentabilidade (P&L)
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Volume Vendido</span>
                <span className="font-mono">{money(Number(t.total_sale), t.currency)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Custo Fornecedores</span>
                <span className="font-mono">{money(Number(t.total_cost), t.currency)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm font-semibold">Lucro Líquido Estimado</span>
                <span
                  className={`font-mono text-base font-bold ${margin > 0 ? "text-success" : margin < 0 ? "text-danger" : "text-muted-foreground"}`}
                >
                  {margin > 0 ? "+" : ""}
                  {money(margin, t.currency)}
                </span>
              </div>
            </div>
          </div>

          {t.proposal_id && (
            <Link
              to="/agency/$slug/proposals/$id"
              params={{ slug, id: t.proposal_id }}
              className="block rounded-lg border border-border bg-surface p-4 text-sm hover:border-brand/50 hover:bg-brand/5 transition-colors "
            >
              <div className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">
                Origem
              </div>
              <div className="font-medium">Abrir Proposta Original →</div>
            </Link>
          )}
          {t.client_id && (
            <Link
              to="/agency/$slug/clients/$id"
              params={{ slug, id: t.client_id }}
              className="block rounded-lg border border-border bg-surface p-4 text-sm hover:border-brand/50 hover:bg-brand/5 transition-colors "
            >
              <div className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">
                Titular
              </div>
              <div className="font-medium">Ficha do Cliente →</div>
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
