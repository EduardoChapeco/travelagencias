import { createFileRoute, useParams } from "@tanstack/react-router";
import { Bed, Calendar, MapPin, Phone, Star } from "lucide-react";
import { fmtDate } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/trips/$id/lodging")({
  head: () => ({ meta: [{ title: "Hospedagem · TravelOS" }] }),
  component: TripLodgingPage,
});

function TripLodgingPage() {
  const { id } = useParams({ from: "/agency/$slug/trips/$id/lodging" });

  // Dummy lodging info for premium UI presentation
  const hotel = {
    name: "Grand Hyatt Rio de Janeiro",
    stars: 5,
    address: "Av. Lúcio Costa, 9600 - Barra da Tijuca, Rio de Janeiro - RJ, 22795-007",
    phone: "+55 (21) 3797-1234",
    checkin: "2026-10-12",
    checkout: "2026-10-19",
    roomType: "Apartamento Vista Mar - Cama King Size",
    board: "Café da manhã incluso",
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header Informativo */}
      <div className="rounded-xl border border-border bg-surface p-4 flex items-start gap-3">
        <Bed className="h-4 w-4 text-brand mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-foreground">Hospedagem & Acomodação</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Visualize os vouchers de hotéis, pousadas, resorts e estadias associadas a esta viagem. O gerenciamento completo de tarifas e contratos de hotéis estará disponível nas próximas fases.
          </p>
        </div>
      </div>

      {/* Hotel Card */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden max-w-3xl">
        <div className="p-4 border-b border-border/60 bg-surface-alt/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold bg-brand/10 text-brand px-2 py-0.5 rounded">
              Hotel Principal
            </span>
            <div className="flex gap-0.5 text-amber-500">
              {[...Array(hotel.stars)].map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-current" />
              ))}
            </div>
          </div>
          <span className="text-xs text-emerald-600 font-semibold">Reserva Confirmada</span>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-base font-bold text-foreground">{hotel.name}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-3.5 w-3.5" />
              {hotel.address}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-b border-border/60 py-4 text-xs">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                Período da Estadia
              </span>
              <span className="font-medium text-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {fmtDate(hotel.checkin)} até {fmtDate(hotel.checkout)}
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                Contato Fornecedor
              </span>
              <span className="font-medium text-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                {hotel.phone}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                Acomodação
              </span>
              <p className="font-semibold text-foreground">{hotel.roomType}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                Regime de Alimentação
              </span>
              <p className="font-semibold text-foreground">{hotel.board}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Banner */}
      <div className="rounded-xl border border-dashed border-brand/30 bg-brand/5 p-4 text-center max-w-3xl">
        <p className="text-xs font-semibold text-brand">Modulo de Hotelaria — Em Breve</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          A integração com canais de reservas de hotéis, regras de no-show, gerenciamento de rooming lists e políticas de cancelamento serão implementadas na Fase 7 da rearquitetura.
        </p>
      </div>
    </div>
  );
}
