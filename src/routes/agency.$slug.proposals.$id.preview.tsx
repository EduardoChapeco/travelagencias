import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Copy, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { money, fmtDate } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/proposals/$id/preview")({
  head: ({ context }: any) => ({ meta: [{ title: `Pré-visualização da Proposta · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: ProposalPreview,
});

type Proposal = {
  id: string;
  number: number;
  title: string;
  destination: string | null;
  travel_start: string | null;
  travel_end: string | null;
  pax_adults: number;
  pax_seniors: number;
  pax_children: number;
  pax_infants: number;
  currency: string;
  subtotal: number;
  discount: number;
  total: number;
  pix_discount_percent: number;
  installments_card: number;
  installments_boleto: number;
  status: string;
  valid_until: string | null;
  notes: string | null;
  flights: Array<{
    id: string;
    origin: string;
    destination: string;
    date: string;
    departure_time: string;
    arrival_time: string;
    airline: string;
    flight_number: string;
    stops: number;
    baggage_rules: string;
    price: number;
  }>;
  hotels: Array<{
    id: string;
    name: string;
    city: string;
    checkin: string;
    checkout: string;
    meal_plan: string;
    rooms: Array<{ type: string; qty: number }>;
    images: string[];
    price: number;
  }>;
  transfers: Array<{
    id: string;
    description: string;
    date: string;
    type: string;
    vehicle: string;
    price: number;
    notes: string;
  }>;
  tours: Array<{
    id: string;
    description: string;
    date: string;
    price: number;
    image_url: string;
    notes: string;
  }>;
  itinerary: Array<{ id: string; day: string; title: string; description: string }>;
  includes: string[];
  excludes: string[];
  public_token: string;
  agency_id: string;
};

type Agency = {
  name: string;
  logo_url: string | null;
};

type BrandKit = {
  brand_color: string;
  brand_color_fg: string;
  font_heading: string;
};

function ProposalPreview() {
  const { slug, id } = useParams({ from: "/agency/$slug/proposals/$id/preview" });

  const propQ = useQuery({
    queryKey: ["proposal_preview", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Proposal | null;
    },
  });

  const agencyQ = useQuery({
    enabled: !!propQ.data?.agency_id,
    queryKey: ["agency_preview", propQ.data?.agency_id],
    queryFn: async () => {
      const [{ data: ag }, { data: brand }] = await Promise.all([
        supabase
          .from("agencies")
          .select("name, logo_url")
          .eq("id", propQ.data!.agency_id)
          .maybeSingle(),
        supabase
          .from("brand_kit")
          .select("brand_color, brand_color_fg, font_heading")
          .eq("agency_id", propQ.data!.agency_id)
          .maybeSingle(),
      ]);
      return { agency: ag as Agency | null, brand: brand as BrandKit | null };
    },
  });

  if (propQ.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  if (!propQ.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Proposta não encontrada.</p>
        <Link
          to="/agency/$slug/proposals"
          params={{ slug }}
          className="text-xs text-primary hover:underline"
        >
          ← Voltar às propostas
        </Link>
      </div>
    );
  }

  const p = propQ.data;
  const agency = agencyQ.data?.agency;
  const brand = agencyQ.data?.brand;
  const accentColor = brand?.brand_color ?? "#1E293B";
  const accentFg = brand?.brand_color_fg ?? "#FFFFFF";
  const publicUrl = `${window.location.origin}/m/proposal/${p.public_token}`;
  const totalPax = p.pax_adults + p.pax_seniors + p.pax_children + p.pax_infants;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* ── Toolbar interno ──────────────────────────────────────────────────── */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border glass-card border-none px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/agency/$slug/proposals/$id"
            params={{ slug, id }}
            className="flex h-7 items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            title="Voltar ao editor"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Voltar ao editor</span>
          </Link>
          <span className="text-xs text-muted-foreground">·</span>
          <span
            className="flex items-center gap-1 text-xs text-muted-foreground"
            title="Pré-visualização do cliente"
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Pré-visualização do cliente</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              navigator.clipboard.writeText(publicUrl);
              toast.success("Link copiado");
            }}
            className="flex h-7 items-center justify-center gap-1.5 rounded-full border-none px-2 sm:px-3 text-xs hover:glass bg-white/5 border-white/10 cursor-pointer"
            title="Copiar link público"
          >
            <Copy className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Copiar link</span>
          </button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-7 items-center justify-center gap-1.5 rounded-full border-none px-2 sm:px-3 text-xs hover:glass bg-white/5 border-white/10"
            title="Abrir como cliente"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Abrir como cliente</span>
          </a>
        </div>
      </div>

      {/* ── Preview iframe-like area ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto glass bg-white/5 border-white/10 py-8 px-4">
        <div className="mx-auto max-w-2xl rounded-[var(--radius-card)] border-none glass-card border-none  overflow-hidden">
          {/* Agency header */}
          <div className="px-8 pt-8 pb-6 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {agency?.logo_url ? (
                  <img
                    src={agency.logo_url}
                    alt={agency.name ?? ""}
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  <div
                    className="h-10 w-10 rounded flex items-center justify-center text-sm font-bold"
                    style={{ background: accentColor, color: accentFg }}
                  >
                    {(agency?.name ?? "A").slice(0, 1)}
                  </div>
                )}
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {agency?.name ?? "Agência"}
                  </div>
                  <div className="text-xs text-muted-foreground">Cotação #{p.number}</div>
                </div>
              </div>
              <div
                className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
                style={{ background: accentColor, color: accentFg }}
              >
                {p.status}
              </div>
            </div>
          </div>

          {/* Hero */}
          <div className="px-8 pt-7 pb-5">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{p.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {p.destination ?? "Destino a confirmar"}
              {p.travel_start && (
                <>
                  {" "}
                  · {fmtDate(p.travel_start)} → {fmtDate(p.travel_end)}
                </>
              )}
              {totalPax > 0 && (
                <>
                  {" "}
                  · {totalPax} {totalPax === 1 ? "passageiro" : "passageiros"}
                </>
              )}
            </p>
          </div>

          {/* Voos */}
          {p.flights.length > 0 && (
            <Section title="Voos" color={accentColor}>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50 text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Trecho</th>
                    <th className="pb-2 font-medium">Cia / Voo</th>
                    <th className="pb-2 font-medium">Data</th>
                    <th className="pb-2 font-medium">Horários</th>
                    <th className="pb-2 text-right font-medium">Bagagem</th>
                  </tr>
                </thead>
                <tbody>
                  {p.flights.map((f) => (
                    <tr key={f.id} className="border-b border-border/20">
                      <td className="py-2 font-medium text-foreground">
                        {f.origin} → {f.destination}
                        {f.stops > 0 && (
                          <span className="ml-1 text-muted-foreground">
                            ({f.stops} parada{f.stops > 1 ? "s" : ""})
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {f.airline} {f.flight_number}
                      </td>
                      <td className="py-2 text-muted-foreground">{fmtDate(f.date)}</td>
                      <td className="py-2 text-muted-foreground">
                        {f.departure_time} – {f.arrival_time}
                      </td>
                      <td className="py-2 text-right text-muted-foreground">{f.baggage_rules}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* Hotéis */}
          {p.hotels.length > 0 && (
            <Section title="Hospedagem" color={accentColor}>
              <div className="space-y-3">
                {p.hotels.map((h) => (
                  <div key={h.id} className="rounded-[var(--radius-card)] border-none/50 overflow-hidden">
                    {h.images[0] && (
                      <img src={h.images[0]} alt={h.name} className="h-32 w-full object-cover" />
                    )}
                    <div className="p-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-semibold text-foreground">{h.name}</span>
                        <span className="text-xs text-muted-foreground">{h.city}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {fmtDate(h.checkin)} → {fmtDate(h.checkout)} · {h.meal_plan}
                      </div>
                      {h.rooms.length > 0 && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {h.rooms.map((r, i) => (
                            <span key={i}>
                              {r.qty}× {r.type}
                              {i < h.rooms.length - 1 ? ", " : ""}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Itinerário */}
          {p.itinerary.length > 0 && (
            <Section title="Itinerário" color={accentColor}>
              <div className="space-y-3">
                {p.itinerary.map((d) => (
                  <div key={d.id} className="border-l-2 pl-3" style={{ borderColor: accentColor }}>
                    <div className="text-xs font-semibold text-foreground">
                      {d.day} — {d.title}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground whitespace-pre-wrap">
                      {d.description}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Inclui/Exclui */}
          {(p.includes.length > 0 || p.excludes.length > 0) && (
            <Section title="O que está incluso" color={accentColor}>
              <div className="grid grid-cols-2 gap-4">
                {p.includes.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-success">
                      Inclui
                    </div>
                    <ul className="space-y-1 text-xs">
                      {p.includes.map((item, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-muted-foreground">
                          <span className="text-success mt-0.5">✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {p.excludes.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-danger">
                      Não inclui
                    </div>
                    <ul className="space-y-1 text-xs">
                      {p.excludes.map((item, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-muted-foreground">
                          <span className="text-danger mt-0.5">✗</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Financial summary */}
          <div className="mx-8 mb-8 rounded-[var(--radius-card)] p-5" style={{ background: accentColor }}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium" style={{ color: `${accentFg}cc` }}>
                Total à vista (Pix)
              </span>
              <span className="font-mono text-2xl font-bold" style={{ color: accentFg }}>
                {money(p.total, p.currency)}
              </span>
            </div>
            {p.pix_discount_percent > 0 && (
              <div className="mt-1 text-xs" style={{ color: `${accentFg}99` }}>
                Desconto de {p.pix_discount_percent}% no pagamento via Pix já aplicado
              </div>
            )}
            {p.installments_card > 1 && (
              <div className="mt-1 text-xs" style={{ color: `${accentFg}cc` }}>
                ou em até {p.installments_card}× no cartão de crédito
              </div>
            )}
            {p.installments_boleto > 1 && (
              <div className="mt-0.5 text-xs" style={{ color: `${accentFg}cc` }}>
                ou em até {p.installments_boleto}× no boleto
              </div>
            )}
            {p.valid_until && (
              <div className="mt-3 text-[11px]" style={{ color: `${accentFg}88` }}>
                Válida até {fmtDate(p.valid_until)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-8 py-5 border-t border-border/50">
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
