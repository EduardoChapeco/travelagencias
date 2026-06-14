import { AlertTriangle } from "lucide-react";
import { money, fmtDate } from "@/components/ui/form";

type Client = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  passport_number: string | null;
};

type Passenger = {
  id: string;
  full_name: string;
  document: string | null;
  cpf: string | null;
};

type Trip = {
  id: string;
  title: string;
  destination: string | null;
  travel_start: string | null;
  travel_end: string | null;
  total_sale: number;
  currency: string;
  client_id: string | null;
};

export function ContractSidebar({
  client,
  passengers,
  trip,
  totalPax,
}: {
  client?: Client | null;
  passengers: Passenger[];
  trip: Trip;
  totalPax: number;
}) {
  return (
    <div className="space-y-4">
      {/* Client info */}
      {client && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Contratante
          </h3>
          <div className="space-y-1.5 text-xs text-foreground font-medium">
            <div className="font-bold text-foreground">{client.full_name}</div>
            {client.cpf && (
              <div className="text-muted-foreground">CPF: {client.cpf}</div>
            )}
            {client.passport_number && (
              <div className="text-muted-foreground">
                Passaporte: {client.passport_number}
              </div>
            )}
            {client.email && (
              <div className="text-muted-foreground">{client.email}</div>
            )}
            {client.phone && (
              <div className="text-muted-foreground">{client.phone}</div>
            )}
          </div>
        </div>
      )}

      {/* Passengers */}
      {passengers && passengers.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Passageiros ({passengers.length})
          </h3>
          <ul className="space-y-1.5 text-foreground font-medium">
            {passengers.map((p) => (
              <li key={p.id} className="text-xs">
                <span className="font-medium text-foreground">{p.full_name}</span>
                {(p.cpf || p.document) && (
                  <span className="ml-1 text-muted-foreground">· {p.cpf ?? p.document}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Trip summary */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Viagem
        </h3>
        <div className="space-y-1.5 text-xs text-foreground font-medium">
          <div>
            <span className="text-muted-foreground">Destino: </span>
            {trip.destination ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Embarque: </span>
            {fmtDate(trip.travel_start)}
          </div>
          <div>
            <span className="text-muted-foreground">Retorno: </span>
            {fmtDate(trip.travel_end)}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-foreground font-bold">
            <span>Valor total</span>
            <span className="font-mono">
              {money(trip.total_sale, trip.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Warning: no client */}
      {!trip.client_id && (
        <div className="rounded-lg border border-warning bg-warning-bg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div className="text-xs text-warning font-medium">
              <div className="font-bold">Sem cliente vinculado</div>
              <div className="mt-0.5 text-warning/90 leading-relaxed">
                Vincule um cliente à viagem antes de gerar o contrato para preencher os dados
                automaticamente.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
