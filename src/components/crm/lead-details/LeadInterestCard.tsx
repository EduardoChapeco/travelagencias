import { MapPin } from "lucide-react";
function money(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
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
  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
      <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-2 flex items-center gap-1.5">
        <MapPin className="h-4 w-4 text-brand" /> Viagem & Interesse
      </h4>
      <div className="space-y-3 text-sm">
        <Row k="Destino" v={lead.destination || "Não definido"} />
        <Row
          k="Tipo de Interesse"
          v={
            INTEREST_TYPES.find((t) => t.v === lead.interest_type)?.label ||
            "Não informado"
          }
        />
        <Row k="Orçamento Estimado" v={money(lead.estimated_value || 0)} />
        <Row
          k="Período"
          v={
            lead.travel_start
              ? `${fmtDate(lead.travel_start)} até ${lead.travel_end ? fmtDate(lead.travel_end) : "Indefinido"}`
              : "Indefinido"
          }
        />
        <Row k="Canal / Origem" v={lead.source || "Direto"} />
        <Row
          k="Detalhe do Canal"
          v={
            lead.lead_source_detail
              ? lead.lead_source_detail.replace("_", " ")
              : "Orgânico"
          }
        />
      </div>
    </div>
  );
}
