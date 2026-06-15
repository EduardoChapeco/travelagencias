import { MapPin } from "lucide-react";
function money(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const INTEREST_TYPES = [
  { v: "Lazer / Férias", label: "Lazer / Férias" },
  { v: "Corporativo / Negócios", label: "Corporativo / Negócios" },
  { v: "Lua de Mel", label: "Lua de Mel" },
  { v: "Grupos / Excursão", label: "Grupos / Excursão" },
  { v: "Intercâmbio", label: "Intercâmbio" },
];

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-border/30 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-foreground text-right">{v}</span>
    </div>
  );
}

export function LeadInterestCard({ lead }: { lead: any }) {
  const interestPeriod = (lead.custom_fields as any)?.interest_period;
  const datesStr = lead.travel_start
    ? `${fmtDate(lead.travel_start)} até ${lead.travel_end ? fmtDate(lead.travel_end) : "Indefinido"}`
    : null;

  const travelPeriodDisplay = interestPeriod
    ? datesStr
      ? `${interestPeriod} (${datesStr})`
      : interestPeriod
    : datesStr || "Indefinido";

  const adults = lead.pax_adults || 0;
  const children = lead.pax_children || 0;
  const infants = lead.pax_infants || 0;
  const totalPax = lead.pax_count || adults + children + infants || 1;
  const parts = [];
  if (adults > 0) parts.push(`${adults} Adulto(s)`);
  if (children > 0) parts.push(`${children} Criança(s)`);
  if (infants > 0) parts.push(`${infants} Bebê(s)`);
  const paxBreakdown = parts.length > 0 ? parts.join(", ") : `${totalPax} Pax`;

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
      <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-2 flex items-center gap-1.5">
        <MapPin className="h-4 w-4 text-brand" /> Viagem & Interesse
      </h4>
      <div className="space-y-3 text-sm">
        <Row k="Destino" v={lead.destination || "Não definido"} />
        <Row
          k="Tipo de Interesse"
          v={INTEREST_TYPES.find((t) => t.v === lead.interest_type)?.label || "Não informado"}
        />
        <Row k="Orçamento Estimado" v={money(lead.estimated_value || 0)} />
        <Row k="Período" v={travelPeriodDisplay} />
        <Row k="Passageiros" v={paxBreakdown} />
        {lead.pax_ages && lead.pax_ages.length > 0 && (
          <Row k="Idades das Crianças" v={lead.pax_ages.join(", ") + " anos"} />
        )}
        <Row k="Canal / Origem" v={lead.source || "Direto"} />
        <Row
          k="Detalhe do Canal"
          v={lead.lead_source_detail ? lead.lead_source_detail.replace("_", " ") : "Orgânico"}
        />
      </div>
    </div>
  );
}
