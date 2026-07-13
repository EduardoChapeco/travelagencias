import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Save, Clock, Plane, MapPin, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { Field } from "@/components/ui/field";
import { FormInput as Input } from "@/components/ui/input";
import { NativeSelect as Select } from "@/components/ui/select";
import { FormTextarea as Textarea } from "@/components/ui/textarea";
import { PrimaryButton } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { TRIP_STATUS_MAP } from "@/lib/constants/status";
import { fmtDate, money } from "@/lib/formatters";
import { cn } from "@/lib/utils";

function getDaysToTrip(travelStart?: string | null): number | null {
  if (!travelStart) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(travelStart + "T00:00:00");
  const diff = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

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
  const t = form;
  const margin = Number(t.total_sale || 0) - Number(t.total_cost || 0);

  const daysToTrip = getDaysToTrip(t.travel_start);
  const isFuture = daysToTrip !== null && daysToTrip > 0;
  const isToday = daysToTrip === 0;

  return (
    <div className="page-content dock-offset">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <form
          className="space-y-4 rounded-[var(--radius-card)] border-none glass-card border-none p-6 "
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
                className="glass bg-white/5 border-white/10"
              />
            </Field>
            <Field label="Código Interno (Opcional)">
              <Input
                value={t.code ?? ""}
                onChange={(e) => setForm({ ...t, code: e.target.value })}
                className="glass bg-white/5 border-white/10"
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Destino Principal">
              <Input
                value={t.destination ?? ""}
                onChange={(e) => setForm({ ...t, destination: e.target.value })}
                className="glass bg-white/5 border-white/10"
              />
            </Field>
            <Field label="Cliente Responsável">
              <Select
                value={t.client_id ?? ""}
                onChange={(e) => setForm({ ...t, client_id: e.target.value || null })}
                className="glass bg-white/5 border-white/10"
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
                className="glass bg-white/5 border-white/10"
              />
            </Field>
            <Field label="Data de Volta">
              <Input
                type="date"
                value={t.travel_end ?? ""}
                onChange={(e) => setForm({ ...t, travel_end: e.target.value || null })}
                className="glass bg-white/5 border-white/10"
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4 border-t border-border pt-4 mt-2">
            <Field label="Status Operacional">
              <Select
                value={t.status}
                onChange={(e) => setForm({ ...t, status: e.target.value })}
                className="glass bg-white/5 border-white/10"
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
                className="glass bg-white/5 border-white/10"
              />
            </Field>
            <Field label="Custo Líquido (R$)">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={t.total_cost}
                onChange={(e) => setForm({ ...t, total_cost: +e.target.value || 0 })}
                className="glass bg-white/5 border-white/10"
              />
            </Field>
          </div>
          <Field label="Anotações Internas (Não visíveis ao cliente)">
            <Textarea
              value={t.notes ?? ""}
              onChange={(e) => setForm({ ...t, notes: e.target.value })}
              className="glass bg-white/5 border-white/10 min-h-[100px]"
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
          {/* Resumo da Viagem & Metadados */}
          <div className="rounded-[var(--radius-card)] border-none glass-card border-none p-5 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs text-brand font-bold bg-brand/10 px-2 py-0.5 rounded">
                  #{t.number}
                </span>
                <StatusBadge tone={TRIP_STATUS_MAP[t.status]?.tone ?? "neutral"}>
                  {TRIP_STATUS_MAP[t.status]?.label ?? t.status}
                </StatusBadge>
              </div>
              <h2 className="text-sm font-bold text-foreground truncate">{t.title}</h2>
            </div>

            <div className="space-y-2 text-xs text-muted-foreground border-t border-border pt-3">
              {t.destination && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                  <span className="truncate">{t.destination}</span>
                </div>
              )}
              {(t.travel_start || t.travel_end) && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                  <span>
                    {t.travel_start ? fmtDate(t.travel_start) : "—"} →{" "}
                    {t.travel_end ? fmtDate(t.travel_end) : "—"}
                  </span>
                </div>
              )}
            </div>

            {/* Countdown */}
            {t.status !== "cancelled" && daysToTrip !== null && (
              <div
                className={cn(
                  "flex items-center gap-2.5 rounded-[var(--radius-card)] border px-3 py-2 text-xs mt-1",
                  isToday
                    ? "border-warning/30 bg-warning/5 text-warning-foreground"
                    : isFuture
                      ? "border-brand/20 bg-brand/5 text-foreground"
                      : t.status === "completed"
                        ? "border-success/20 bg-success/5 text-success-foreground"
                        : "border-border glass bg-white/5 border-white/10/50 text-muted-foreground",
                )}
              >
                {isToday ? (
                  <>
                    <Plane className="h-3.5 w-3.5 text-warning animate-bounce" />
                    <span className="font-bold text-warning">Embarque hoje!</span>
                  </>
                ) : isFuture ? (
                  <>
                    <Clock className="h-3.5 w-3.5 text-brand" />
                    <span className="font-semibold text-foreground">
                      Faltam <span className="text-brand font-bold">{daysToTrip} dias</span>
                    </span>
                  </>
                ) : t.status === "completed" ? (
                  <>
                    <Plane className="h-3.5 w-3.5 text-success" />
                    <span className="font-semibold text-success">Concluída!</span>
                  </>
                ) : (
                  <>
                    <Plane className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Ocorreu há {Math.abs(daysToTrip)} dias</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="rounded-[var(--radius-card)] border-none glass-card border-none p-5 ">
            <h3 className="mb-4 ds-label-caps text-muted-foreground">
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
              className="block rounded-[var(--radius-card)] border-none glass-card border-none p-4 text-sm hover:border-brand/50 hover:bg-brand/5 transition-colors "
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
              className="block rounded-[var(--radius-card)] border-none glass-card border-none p-4 text-sm hover:border-brand/50 hover:bg-brand/5 transition-colors "
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
