import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Field, Input, PrimaryButton, Textarea } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/p/$agency_slug/tour/$id")({
  head: ({ params }) => ({ meta: [{ title: `Roteiro · ${params.agency_slug}` }] }),
  component: Page,
});

type TourDay = { day_number: number; title: string; description_md?: string };
type SeatCell = { r: number; c: number; label: string; type: string };

function Page() {
  const { agency_slug, id } = Route.useParams();

  const q = useQuery({
    queryKey: ["portal-tour", agency_slug, id],
    queryFn: async () => {
      const { data: agency } = await supabase
        .from("agencies")
        .select("id, name, slug, brand_color, brand_color_fg")
        .eq("slug", agency_slug)
        .maybeSingle();
      if (!agency) return null;

      const { data: tour } = await supabase
        .from("group_tours")
        .select("*")
        .eq("id", id)
        .eq("agency_id", agency.id)
        .maybeSingle();
      if (!tour) return { agency, tour: null, days: [] as TourDay[], layout: null as any, assignedSeats: [] as string[] };

      const days: TourDay[] = Array.isArray(tour.itinerary) ? (tour.itinerary as unknown as TourDay[]) : [];

      let layout: any = null;
      let assignedSeats: string[] = [];
      if (tour.bus_layout_id) {
        const { data: l } = await supabase.from("bus_layouts").select("*").eq("id", tour.bus_layout_id).maybeSingle();
        if (l) layout = l;
        const { data: assigned } = await supabase
          .from("group_tour_enrollments")
          .select("seat_number")
          .eq("group_tour_id", id)
          .not("seat_number", "is", null);
        assignedSeats = (assigned || []).map((a) => a.seat_number).filter((s): s is string => !!s);
      }

      return { agency, tour, days, layout, assignedSeats };
    },
  });

  const [form, setForm] = useState({ passenger_name: "", passenger_cpf: "", email: "", phone: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  if (q.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }
  if (!q.data || !q.data.tour) return <div className="p-10 text-center text-sm">Roteiro não disponível</div>;

  const { agency, tour: t, days, layout, assignedSeats } = q.data;
  const seatMap: SeatCell[] = layout && Array.isArray(layout.seat_map) ? (layout.seat_map as unknown as SeatCell[]) : [];

  async function enroll(e: React.FormEvent) {
    e.preventDefault();
    if (seatMap.length > 0 && selectedSeats.length === 0) {
      return toast.error("Por favor, selecione pelo menos uma poltrona no ônibus.");
    }
    setBusy(true);

    const pax = Math.max(1, selectedSeats.length);
    const unitPrice = Number(t.base_price) || 0;

    // 1. One enrollment row per seat/passenger (matches schema).
    const rows = (selectedSeats.length > 0 ? selectedSeats : [null]).map((seat) => ({
      agency_id: agency.id,
      group_tour_id: t.id,
      passenger_name: form.passenger_name,
      passenger_cpf: form.passenger_cpf || null,
      seat_number: seat,
      total_paid: 0,
      status: "pending",
      notes: form.notes || null,
    }));
    const { error: bErr } = await supabase.from("group_tour_enrollments").insert(rows);

    // 2. CRM lead for the salesperson
    const { data: stages } = await supabase
      .from("lead_stages")
      .select("id")
      .eq("agency_id", agency.id)
      .order("position")
      .limit(1);
    if (stages && stages.length > 0) {
      await supabase.from("leads").insert({
        agency_id: agency.id,
        stage_id: stages[0].id,
        name: form.passenger_name,
        email: form.email || null,
        phone: form.phone || null,
        destination: `Interesse: ${t.title}`,
        estimated_value: unitPrice * pax,
      });
    }

    // 3. Reserve seat counter on the tour.
    const { data: cur } = await supabase.from("group_tours").select("reserved_seats").eq("id", t.id).maybeSingle();
    if (cur) {
      await supabase.from("group_tours").update({ reserved_seats: (cur.reserved_seats || 0) + pax }).eq("id", t.id);
    }

    setBusy(false);
    if (bErr) toast.error(bErr.message);
    else {
      toast.success("Inscrição recebida! Nossa equipe vai entrar em contato.");
      setForm({ passenger_name: "", passenger_cpf: "", email: "", phone: "", notes: "" });
      setSelectedSeats([]);
    }
  }

  const includes = Array.isArray(t.includes) ? t.includes : [];
  const excludes = Array.isArray(t.excludes) ? t.excludes : [];

  return (
    <div
      className="mx-auto min-h-screen bg-background"
      style={{ "--color-brand": agency.brand_color, "--color-brand-foreground": agency.brand_color_fg } as React.CSSProperties}
    >
      <div className="relative w-full bg-surface">
        {t.cover_image_url ? (
          <div className="relative h-64 md:h-80 w-full overflow-hidden">
            <img src={t.cover_image_url} alt={t.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 md:left-12 max-w-4xl mx-auto flex items-end">
              <div className="text-white">
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2">{t.title}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm md:text-base font-medium opacity-90">
                  <span>{t.destination}</span>
                  {t.departure_date && (<><span className="w-1.5 h-1.5 rounded-full bg-white/50" /><span>{new Date(t.departure_date).toLocaleDateString("pt-BR")}</span></>)}
                  {t.return_date && (<><span>→</span><span>{new Date(t.return_date).toLocaleDateString("pt-BR")}</span></>)}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-6 py-12">
            <h1 className="text-4xl font-extrabold tracking-tight">{t.title}</h1>
            <div className="mt-2 text-muted-foreground">{t.destination}</div>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6 mb-10">
          <div>
            <div className="text-3xl font-mono font-bold tracking-tight text-brand">
              {Number(t.base_price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1 font-semibold">Por Passageiro</div>
          </div>
          {t.important_notes && (
            <div className="bg-brand/5 border border-brand/20 p-4 rounded-xl text-sm leading-relaxed max-w-lg shadow-sm">
              {t.important_notes}
            </div>
          )}
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {days.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-bold tracking-tight border-b border-border/50 pb-2">Roteiro Dia a Dia</h2>
              <ol className="space-y-3">
                {days.map((d, i) => (
                  <li key={i} className="rounded-xl border border-border bg-surface p-4 shadow-sm relative overflow-hidden group hover:border-brand/30 transition-colors">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-surface-alt group-hover:bg-brand transition-colors" />
                    <div className="font-bold text-sm text-foreground ml-2">Dia {d.day_number} — {d.title}</div>
                    <div className="text-xs text-muted-foreground ml-2 mt-2 leading-relaxed">{d.description_md}</div>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {(includes.length > 0 || excludes.length > 0) && (
            <section className="space-y-3">
              {includes.length > 0 && <div><h3 className="text-sm font-semibold">Inclui</h3><ul className="text-sm">{includes.map((i) => <li key={i}>✓ {i}</li>)}</ul></div>}
              {excludes.length > 0 && <div><h3 className="text-sm font-semibold">Não inclui</h3><ul className="text-sm">{excludes.map((i) => <li key={i}>✗ {i}</li>)}</ul></div>}
            </section>
          )}
        </div>

        {seatMap.length > 0 && (
          <div className="mt-8 rounded-lg border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold mb-4 text-center">Escolha suas Poltronas</h2>
            <div className="flex justify-center">
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`, gap: "8px" }}>
                {seatMap.map((cell, idx) => {
                  if (cell.type !== "seat") {
                    return (
                      <div key={idx} className={cn("h-10 w-10 flex items-center justify-center text-[10px] rounded", cell.type === "aisle" && "text-transparent", cell.type === "wc" && "bg-blue-50 text-blue-500", cell.type === "door" && "bg-orange-50 text-orange-500")}>
                        {cell.type === "wc" ? "WC" : cell.type === "door" ? "Porta" : ""}
                      </div>
                    );
                  }
                  const isAssigned = assignedSeats.includes(cell.label);
                  const isSelected = selectedSeats.includes(cell.label);
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isAssigned}
                      onClick={() => setSelectedSeats((prev) => (isSelected ? prev.filter((s) => s !== cell.label) : [...prev, cell.label]))}
                      className={cn(
                        "h-10 w-10 rounded-md border text-xs font-semibold transition-colors flex flex-col items-center justify-center",
                        isAssigned ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50" : isSelected ? "border-brand bg-brand text-brand-foreground shadow-sm" : "border-border bg-surface hover:border-brand/50 hover:bg-brand/5",
                      )}
                    >
                      <span>{cell.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-surface border border-border" /> Livre</div>
              <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-brand" /> Selecionada</div>
              <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-muted" /> Ocupada</div>
            </div>
          </div>
        )}

        <form onSubmit={enroll} className="mt-12 space-y-4 rounded-2xl border-2 border-brand/20 bg-surface p-6 shadow-xl shadow-brand/5">
          <div className="mb-2 border-b border-border/50 pb-4">
            <h2 className="text-xl font-bold tracking-tight">Garanta a sua vaga</h2>
            <p className="text-sm text-muted-foreground">Preencha seus dados e nossa equipe de vendas entrará em contato.</p>
          </div>

          <Field label="Nome completo *"><Input required value={form.passenger_name} onChange={(e) => setForm({ ...form, passenger_name: e.target.value })} className="h-11" /></Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="E-mail *"><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-11" /></Field>
            <Field label="WhatsApp *"><Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-11" placeholder="(11) 9..." /></Field>
          </div>

          <Field label="CPF"><Input value={form.passenger_cpf} onChange={(e) => setForm({ ...form, passenger_cpf: e.target.value })} className="h-11" /></Field>
          <Field label="Dúvidas ou Observações?"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-[80px]" /></Field>

          <PrimaryButton disabled={busy} className="w-full h-12 text-sm uppercase tracking-widest font-bold shadow-md shadow-brand/20 hover:shadow-brand/40 transition-shadow">
            {busy ? "Enviando…" : selectedSeats.length > 0
              ? `Comprar ${selectedSeats.length} vaga(s) — ${(Number(t.base_price) * selectedSeats.length).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
              : "Enviar Interesse"}
          </PrimaryButton>
        </form>
      </div>
    </div>
  );
}
