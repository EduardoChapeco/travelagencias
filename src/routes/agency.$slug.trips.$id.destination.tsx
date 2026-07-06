import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { StatusBadge } from "@/components/ui/form";
import {
  Globe,
  ShieldAlert,
  Heart,
  Zap,
  DollarSign,
  Languages,
  Plug,
  Clock,
  Thermometer,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
} from "lucide-react";

export const Route = createFileRoute("/agency/$slug/trips/$id/destination")({
  head: ({ context }: any) => ({ meta: [{ title: `Destino & Segurança · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: TripDestinationPage,
});

const SAFETY_CONFIG: Record<
  string,
  { label: string; tone: "success" | "warning" | "danger" | "info" }
> = {
  safe: { label: "Destino Seguro", tone: "success" },
  moderate: { label: "Atenção Moderada", tone: "warning" },
  caution: { label: "Atenção Necessária", tone: "warning" },
  high_risk: { label: "Alto Risco", tone: "danger" },
};

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p className="text-xs text-foreground mt-0.5 leading-relaxed">{value}</p>
      </div>
    </div>
  );
}

function TripDestinationPage() {
  const { id } = useParams({ from: "/agency/$slug/trips/$id/destination" });
  const { agency } = useAgency();

  // First fetch the trip to get destination
  const tripQ = useQuery({
    enabled: !!agency,
    queryKey: ["trip-dest", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("id, title, destination")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Then fetch destination_info matching this trip's destination
  const destQ = useQuery({
    enabled: !!tripQ.data?.destination,
    queryKey: ["destination-info-trip", tripQ.data?.destination],
    queryFn: async () => {
      const destination = tripQ.data!.destination!;
      const { data, error } = await supabase
        .from("destination_info")
        .select("*")
        .ilike("destination", `%${destination}%`)
        .not("reviewed_at", "is", null)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const trip = tripQ.data;
  const dest = destQ.data;
  const isLoading = tripQ.isLoading || destQ.isLoading;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-sm text-muted-foreground animate-pulse">
          Buscando informações do destino…
        </p>
      </div>
    );
  }

  if (!trip?.destination) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <Globe className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-semibold text-muted-foreground">Destino não definido</p>
        <p className="text-xs text-muted-foreground mt-1">
          Adicione um destino à viagem para visualizar as informações de segurança e destino.
        </p>
      </div>
    );
  }

  if (!dest) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <div className="rounded-[24px] border border-dashed border-warning/40 bg-warning/5 p-5 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-foreground">
              Nenhuma informação revisada para "{trip.destination}"
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Acesse{" "}
              <span className="text-brand font-medium">
                Identidade &amp; Templates → Destination Intelligence
              </span>{" "}
              para cadastrar e revisar as informações deste destino. Apenas informações revisadas
              aparecem para os clientes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const safety = dest.safety_level ? SAFETY_CONFIG[dest.safety_level] : null;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {dest.country_code && (
              <span className="text-xl leading-none">
                {dest.country_code
                  .toUpperCase()
                  .replace(/./g, (c) => String.fromCodePoint(c.codePointAt(0)! + 127397))}
              </span>
            )}
            <h2 className="text-lg font-bold text-foreground">{dest.destination}</h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {safety && <StatusBadge tone={safety.tone}>{safety.label}</StatusBadge>}
            <StatusBadge tone="success">
              <CheckCircle className="h-2.5 w-2.5 inline mr-0.5" />
              Revisado
            </StatusBadge>
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground text-right shrink-0">
          <p>Revisado em</p>
          <p className="font-medium text-foreground">
            {dest.reviewed_at ? new Date(dest.reviewed_at).toLocaleDateString("pt-BR") : "—"}
          </p>
        </div>
      </div>

      {/* Grid de informações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vistos & Entrada */}
        <div className="rounded-[24px] border border-border bg-surface p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" /> Vistos &amp; Entrada
          </h3>
          <div className="space-y-0">
            <div className="py-2.5 border-b border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Visto Necessário
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {dest.visa_required ? (
                  <XCircle className="h-3.5 w-3.5 text-danger" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5 text-success" />
                )}
                <span className="text-xs font-semibold text-foreground">
                  {dest.visa_required ? "Sim, visto obrigatório" : "Não é necessário visto"}
                </span>
              </div>
            </div>
            <InfoRow icon={Info} label="Informações de Visto" value={dest.visa_info} />
            <InfoRow icon={Info} label="Requisitos de Entrada" value={dest.entry_requirements} />
          </div>
        </div>

        {/* Saúde */}
        <div className="rounded-[24px] border border-border bg-surface p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5" /> Saúde
          </h3>
          <div className="space-y-0">
            {dest.vaccinations_required && dest.vaccinations_required.length > 0 && (
              <div className="py-2.5 border-b border-border">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Vacinas Obrigatórias
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {dest.vaccinations_required.map((v, i) => (
                    <span
                      key={i}
                      className="text-[10px] bg-danger/10 text-danger px-2 py-0.5 rounded-full font-medium"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {dest.vaccinations_recommended && dest.vaccinations_recommended.length > 0 && (
              <div className="py-2.5 border-b border-border">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Vacinas Recomendadas
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {dest.vaccinations_recommended.map((v, i) => (
                    <span
                      key={i}
                      className="text-[10px] bg-warning/10 text-warning px-2 py-0.5 rounded-full font-medium"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <InfoRow icon={Heart} label="Notas de Saúde" value={dest.health_notes} />
          </div>
        </div>

        {/* Informações Práticas */}
        <div className="rounded-[24px] border border-border bg-surface p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Informações Práticas
          </h3>
          <div className="space-y-0">
            <InfoRow
              icon={DollarSign}
              label="Moeda"
              value={dest.currency ? `${dest.currency} (${dest.currency_code})` : null}
            />
            <InfoRow icon={Languages} label="Idioma" value={dest.language} />
            <InfoRow
              icon={Clock}
              label="Fuso Horário"
              value={dest.time_zone ? `${dest.time_zone} (UTC ${dest.utc_offset})` : null}
            />
            <InfoRow icon={Plug} label="Tipo de Tomada" value={dest.plug_type} />
            <InfoRow
              icon={DollarSign}
              label="Taxa Turística"
              value={
                dest.tourist_tax_amount
                  ? `${dest.tourist_tax_currency} ${dest.tourist_tax_amount} — ${dest.tourist_tax}`
                  : dest.tourist_tax
              }
            />
          </div>
        </div>

        {/* Segurança & Cultura */}
        <div className="rounded-[24px] border border-border bg-surface p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" /> Segurança &amp; Cultura
          </h3>
          <div className="space-y-0">
            <InfoRow icon={ShieldAlert} label="Notas de Segurança" value={dest.safety_notes} />
            <InfoRow icon={Globe} label="Dicas Culturais" value={dest.cultural_tips} />
            <InfoRow icon={Thermometer} label="Melhor Época" value={dest.best_season} />
            <InfoRow icon={DollarSign} label="Faixa de Orçamento" value={dest.budget_range} />
          </div>
        </div>
      </div>

      {/* Aviso ao agente */}
      <div className="rounded-[24px] border border-dashed border-brand/30 bg-brand/5 p-3 flex items-start gap-2.5">
        <Info className="h-3.5 w-3.5 text-brand shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground">
          Estas informações são visíveis para o cliente no portal da viagem. Mantenha-as atualizadas
          em{" "}
          <span className="font-medium text-foreground">
            Identidade &amp; Templates → Destination Intelligence
          </span>
          .
        </p>
      </div>
    </div>
  );
}
