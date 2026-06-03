import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Field, Input, PrimaryButton, Textarea } from "@/components/ui/form";

export const Route = createFileRoute("/p/$agency_slug/tour/$id")({
  head: ({ params }) => ({ meta: [{ title: `Roteiro · ${params.agency_slug}` }] }),
  component: Page,
});

function Page() {
  const { agency_slug, id } = Route.useParams();
  const q = useQuery({
    queryKey: ["portal-tour", id],
    queryFn: async () => {
      const { data: tour } = await supabase.from("group_tours").select("*, agencies!inner(id, name, slug, logo_url)").eq("id", id).maybeSingle();
      return tour;
    },
  });

  const [form, setForm] = useState({ passenger_name: "", passenger_cpf: "", phone: "", notes: "" });
  const [busy, setBusy] = useState(false);

  if (q.isLoading) return <div className="p-10 text-center text-sm text-muted-foreground">Carregando…</div>;
  if (!q.data) return <div className="p-10 text-center text-sm">Roteiro não disponível</div>;
  const t = q.data;
  if (t.agencies.slug !== agency_slug) return <div className="p-10 text-center text-sm">Roteiro não pertence a esta agência</div>;

  async function enroll(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.from("group_tour_enrollments").insert({
      group_tour_id: t.id, agency_id: t.agencies.id,
      passenger_name: form.passenger_name, passenger_cpf: form.passenger_cpf || null,
      notes: form.notes || `tel: ${form.phone}`, status: "pending",
    });
    setBusy(false);
    if (error) toast.error(error.message); else { toast.success("Inscrição enviada! A agência entrará em contato."); setForm({ passenger_name: "", passenger_cpf: "", phone: "", notes: "" }); }
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-6 py-10">
      {t.cover_image_url && <img src={t.cover_image_url} alt={t.title} className="mb-6 w-full rounded-lg object-cover" />}
      <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
      <div className="text-sm text-muted-foreground">{t.destination} · {t.departure_date ? new Date(t.departure_date).toLocaleDateString("pt-BR") : "—"} → {t.return_date ? new Date(t.return_date).toLocaleDateString("pt-BR") : "—"}</div>
      <div className="mt-4 text-2xl font-mono">{Number(t.base_price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
      {t.description && <p className="mt-6 whitespace-pre-line text-sm">{t.description}</p>}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {(t.itinerary ?? []).length > 0 && (
          <section><h2 className="mb-2 text-sm font-semibold">Roteiro</h2>
            <ol className="space-y-2 text-sm">{(t.itinerary as Array<{ day?: number; title?: string; description?: string }>).map((d, i) => (
              <li key={i} className="rounded border border-border bg-surface p-3"><div className="font-medium">Dia {d.day ?? i + 1} — {d.title}</div><div className="text-xs text-muted-foreground">{d.description}</div></li>
            ))}</ol>
          </section>
        )}
        {(t.includes?.length > 0 || t.excludes?.length > 0) && (
          <section className="space-y-3">
            {t.includes?.length > 0 && <div><h3 className="text-sm font-semibold">Inclui</h3><ul className="text-sm">{t.includes.map((i: string) => <li key={i}>✓ {i}</li>)}</ul></div>}
            {t.excludes?.length > 0 && <div><h3 className="text-sm font-semibold">Não inclui</h3><ul className="text-sm">{t.excludes.map((i: string) => <li key={i}>✗ {i}</li>)}</ul></div>}
          </section>
        )}
      </div>
      <form onSubmit={enroll} className="mt-10 space-y-3 rounded-lg border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Quero me inscrever</h2>
        <Field label="Nome completo"><Input required value={form.passenger_name} onChange={(e) => setForm({ ...form, passenger_name: e.target.value })} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="CPF"><Input value={form.passenger_cpf} onChange={(e) => setForm({ ...form, passenger_cpf: e.target.value })} /></Field>
          <Field label="Telefone"><Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        </div>
        <Field label="Observações"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        <PrimaryButton disabled={busy} className="w-full">{busy ? "Enviando…" : "Reservar minha vaga"}</PrimaryButton>
      </form>
    </div>
  );
}
