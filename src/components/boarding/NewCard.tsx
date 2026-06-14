import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Square, AlertTriangle } from "lucide-react";
import {
  Field,
  Input,
  Select,
  Textarea,
  PrimaryButton,
  GhostButton,
  Sheet,
} from "@/components/ui/form";
import { fetchTripPassengersMin, createBoardingCard } from "@/services/boarding";

export function NewCard({
  agencyId,
  trips,
  onClose,
  onCreated,
}: {
  agencyId: string;
  trips: any[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [tripId, setTripId] = useState(trips[0]?.id ?? "");
  const [pnr, setPnr] = useState("");
  const [airline, setAirline] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [paxCount, setPaxCount] = useState("");
  const [alerts, setAlerts] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const paxQ = useQuery({
    enabled: !!tripId,
    queryKey: ["boarding-pax", tripId],
    queryFn: () => fetchTripPassengersMin(tripId),
  });

  const passengersList = paxQ.data ?? [];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!tripId) return toast.error("Selecione uma viagem");
    setSubmitting(true);
    const alertsArr = alerts
      .split("\n")
      .map((a) => a.trim())
      .filter(Boolean);

    try {
      await createBoardingCard({
        agencyId,
        tripId,
        pnr: pnr || null,
        airline: airline || null,
        departureDate: departureDate || null,
        paxCount: paxCount || null,
        alerts: alertsArr,
        passengersList,
      });
      toast.success("Card criado no Kanban");
      onCreated();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet onClose={onClose} title="Lançar PNR no Embarque">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Viagem Atrelada *">
          <Select required value={tripId} onChange={(e) => setTripId(e.target.value)}>
            <option value="">Selecione…</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.code ? `${t.code} - ` : ""}
                {t.title}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Localizador (PNR)">
            <Input value={pnr} onChange={(e) => setPnr(e.target.value)} placeholder="ABC123" />
          </Field>
          <Field label="Companhia / Operadora">
            <Input
              value={airline}
              onChange={(e) => setAirline(e.target.value)}
              placeholder="LATAM, GOL…"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data de embarque">
            <Input
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
            />
          </Field>
          <Field label="Nº de passageiros">
            <Input
              type="number"
              min={1}
              value={paxCount}
              onChange={(e) => setPaxCount(e.target.value)}
              placeholder="10"
            />
          </Field>
        </div>
        <Field label="Alertas (um por linha)" hint="Ex: Passaporte vencendo, visto pendente">
          <Textarea
            rows={2}
            value={alerts}
            onChange={(e) => setAlerts(e.target.value)}
            placeholder="Passaporte do João vence em 30 dias\nVisto pendente para EUA"
          />
        </Field>
        <div className="rounded-lg border border-border bg-surface-alt/40 p-3">
          <div className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
            {passengersList.length > 0
              ? `Checklist gerado de ${passengersList.length} passageiros reais:`
              : "Checklist padrão gerado automaticamente:"}
          </div>
          <div className="space-y-1">
            {passengersList.length > 0 ? (
              passengersList.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium"
                >
                  <Square className="h-3 w-3 text-brand" /> {p.full_name}
                </div>
              ))
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <AlertTriangle className="h-3 w-3 text-warning" /> Sem passageiros na viagem. Usando
                checklist genérico.
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
          <GhostButton type="button" onClick={onClose}>
            Cancelar
          </GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "Processando…" : "Adicionar à Fila"}
          </PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
