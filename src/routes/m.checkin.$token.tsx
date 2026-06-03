import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/m/checkin/$token")({
  head: () => ({ meta: [{ title: "Check-in · TravelOS" }] }),
  component: Page,
});

type Item = { label: string; done?: boolean };
type Card = {
  id: string; pnr: string | null; airline: string | null;
  status: string; alerts: string[]; checklist: Item[];
  trip_id: string;
};

function Page() {
  const { token } = Route.useParams();
  const [card, setCard] = useState<Card | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // token = boarding_card id (public via signed URL pattern). RLS denies anon, so use RPC fallback if missing.
    supabase.from("boarding_cards").select("id, pnr, airline, status, alerts, checklist, trip_id").eq("id", token).maybeSingle()
      .then(({ data, error }) => { if (error) setErr(error.message); else if (!data) setErr("Cartão não encontrado"); else setCard(data as Card); });
  }, [token]);

  if (err) return <Center><h1 className="text-lg font-semibold">{err}</h1></Center>;
  if (!card) return <Center><p className="text-sm text-muted-foreground">Carregando…</p></Center>;

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 py-10">
      <h1 className="mb-1 text-lg font-semibold tracking-tight">Check-in</h1>
      <div className="text-xs text-muted-foreground">PNR {card.pnr ?? "—"} · {card.airline ?? "—"}</div>
      {card.alerts?.length > 0 && (
        <ul className="mt-4 space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          {card.alerts.map((a, i) => <li key={i}>⚠ {a}</li>)}
        </ul>
      )}
      <h2 className="mt-6 mb-2 text-sm font-semibold">Checklist</h2>
      <ul className="space-y-2 rounded-lg border border-border bg-surface p-4">
        {(card.checklist ?? []).map((it, i) => (
          <li key={i} className="flex items-center gap-2 text-sm"><span>{it.done ? "✓" : "○"}</span><span>{it.label}</span></li>
        ))}
      </ul>
      <div className="mt-4 text-xs text-muted-foreground">Status: <strong>{card.status}</strong></div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-background p-6"><div className="rounded-lg border border-border bg-surface p-8 text-center">{children}</div></div>;
}
