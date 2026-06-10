import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { money, fmtDate, PrimaryButton, GhostButton } from "@/components/ui/form";

export const Route = createFileRoute("/m/proposal/$token")({
  head: () => ({ meta: [{ title: "Proposta · TravelOS" }] }),
  component: PublicProposalView,
});

type ProposalPublic = {
  id: string;
  number: number;
  title: string;
  destination: string | null;
  travel_start: string | null;
  travel_end: string | null;
  pax_adults: number;
  pax_children: number;
  currency: string;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  terms: string | null;
  valid_until: string | null;
  decided_at: string | null;
  agency_id: string;
  agency?: {
    name: string;
    logo_url: string | null;
    brand_color: string | null;
    brand_color_fg: string | null;
  };
  items: Array<{
    id: string;
    kind: string;
    title: string;
    description: string | null;
    quantity: number;
    unit_price: number;
    total: number;
    start_date: string | null;
    end_date: string | null;
  }>;
};

function PublicProposalView() {
  const { token } = useParams({ from: "/m/proposal/$token" });
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["public-proposal", token],
    queryFn: async () => {
      const { data: p, error } = await supabase
        .from("proposals")
        .select(
          "id, number, title, destination, travel_start, travel_end, pax_adults, pax_children, currency, subtotal, discount, total, status, terms, valid_until, decided_at, agency_id",
        )
        .eq("public_token", token)
        .maybeSingle();
      if (error) throw error;
      if (!p) return null;
      const [{ data: items }, { data: agency }] = await Promise.all([
        supabase
          .from("proposal_items")
          .select(
            "id, kind, title, description, quantity, unit_price, total, start_date, end_date, position",
          )
          .eq("proposal_id", p.id)
          .order("position"),
        supabase.rpc("get_public_agency_by_id", { _id: p.agency_id }).maybeSingle(),
      ]);
      // mark as viewed (fire-and-forget)
      if (!p.decided_at) {
        await supabase
          .from("proposals")
          .update({
            status: p.status === "draft" ? "draft" : "viewed",
            viewed_at: new Date().toISOString(),
          } as never)
          .eq("id", p.id);
      }
      return { ...p, items: items ?? [], agency: agency ?? undefined } as ProposalPublic;
    },
  });

  const decide = useMutation({
    mutationFn: async (status: "accepted" | "rejected") => {
      if (!q.data) return;
      const { error } = await supabase
        .from("proposals")
        .update({ status, decided_at: new Date().toISOString() } as never)
        .eq("id", q.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Decisão registrada. Obrigado!");
      qc.invalidateQueries({ queryKey: ["public-proposal", token] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  if (q.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando proposta…
      </div>
    );
  }
  if (!q.data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-lg font-semibold">Proposta não encontrada</h1>
          <p className="mt-1 text-sm text-muted-foreground">O link expirou ou é inválido.</p>
        </div>
      </div>
    );
  }
  const p = q.data;
  const brand = p.agency?.brand_color ?? "#1E293B";
  const brandFg = p.agency?.brand_color_fg ?? "#FFFFFF";
  const decided = !!p.decided_at;

  return (
    <div className="min-h-screen bg-surface-alt/30 text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            {p.agency?.logo_url ? (
              <img
                src={p.agency.logo_url}
                alt={p.agency.name}
                className="h-8 w-8 rounded object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded" style={{ background: brand, color: brandFg }} />
            )}
            <div>
              <div className="text-sm font-semibold">{p.agency?.name ?? "Agência"}</div>
              <div className="text-[11px] text-muted-foreground">Proposta #{p.number}</div>
            </div>
          </div>
          <span
            className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide"
            style={{ background: brand, color: brandFg }}
          >
            {p.status}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">{p.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {p.destination ?? "Destino a definir"} · {fmtDate(p.travel_start)} →{" "}
          {fmtDate(p.travel_end)} · {p.pax_adults + p.pax_children} pax
        </p>

        <section className="mt-8 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Itens inclusos
          </h2>
          {p.items.length === 0 && <p className="text-sm text-muted-foreground">Sem itens.</p>}
          {p.items.map((it) => (
            <div key={it.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-surface-alt px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {it.kind}
                    </span>
                    <span className="font-semibold">{it.title}</span>
                  </div>
                  {it.description && (
                    <p className="mt-1.5 text-sm text-muted-foreground">{it.description}</p>
                  )}
                  {(it.start_date || it.end_date) && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {fmtDate(it.start_date)} → {fmtDate(it.end_date)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-semibold">
                    {money(Number(it.total ?? 0), p.currency)}
                  </div>
                  {Number(it.quantity) > 1 && (
                    <div className="text-[11px] text-muted-foreground">
                      {it.quantity} × {money(Number(it.unit_price), p.currency)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-border bg-surface p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-mono">{money(Number(p.subtotal), p.currency)}</span>
          </div>
          {Number(p.discount) > 0 && (
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Desconto</span>
              <span className="font-mono">−{money(Number(p.discount), p.currency)}</span>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-base font-semibold">Total</span>
            <span className="font-mono text-2xl font-semibold" style={{ color: brand }}>
              {money(Number(p.total), p.currency)}
            </span>
          </div>
          {p.valid_until && (
            <p className="mt-3 text-[11px] text-muted-foreground">
              Válida até {fmtDate(p.valid_until)}
            </p>
          )}
        </section>

        {p.terms && (
          <section className="mt-6 rounded-lg border border-border bg-surface p-5 text-sm">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Condições
            </h3>
            <p className="whitespace-pre-wrap text-muted-foreground">{p.terms}</p>
          </section>
        )}

        <section className="mt-8">
          {decided ? (
            <div className="rounded-lg border border-border bg-surface p-5 text-center text-sm">
              {p.status === "accepted" && (
                <span className="font-semibold text-success">
                  Proposta aceita em {fmtDate(p.decided_at)}.
                </span>
              )}
              {p.status === "rejected" && (
                <span className="font-semibold text-danger">
                  Proposta recusada em {fmtDate(p.decided_at)}.
                </span>
              )}
              {!["accepted", "rejected"].includes(p.status) && (
                <span>Sua decisão foi registrada.</span>
              )}
            </div>
          ) : (
            <DecideActions
              onDecide={(s) => decide.mutate(s)}
              pending={decide.isPending}
              brand={brand}
              brandFg={brandFg}
            />
          )}
        </section>
      </main>
    </div>
  );
}

function DecideActions({
  onDecide,
  pending,
  brand,
  brandFg,
}: {
  onDecide: (s: "accepted" | "rejected") => void;
  pending: boolean;
  brand: string;
  brandFg: string;
}) {
  const [confirm, setConfirm] = useState<null | "accepted" | "rejected">(null);
  if (confirm) {
    return (
      <div className="rounded-lg border border-border bg-surface p-5">
        <p className="mb-3 text-sm">
          {confirm === "accepted"
            ? "Confirmar aceite da proposta?"
            : "Confirmar recusa da proposta?"}
        </p>
        <div className="flex justify-end gap-2">
          <GhostButton type="button" onClick={() => setConfirm(null)}>
            Voltar
          </GhostButton>
          <PrimaryButton
            type="button"
            onClick={() => onDecide(confirm)}
            disabled={pending}
            style={{ background: brand, color: brandFg }}
          >
            {pending ? "Enviando…" : "Confirmar"}
          </PrimaryButton>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
      <button
        onClick={() => setConfirm("rejected")}
        className="h-11 rounded-md border border-border px-5 text-sm font-medium hover:bg-surface-alt"
      >
        Recusar proposta
      </button>
      <button
        onClick={() => setConfirm("accepted")}
        className="h-11 rounded-md px-6 text-sm font-semibold"
        style={{ background: brand, color: brandFg }}
      >
        Aceitar proposta
      </button>
    </div>
  );
}
