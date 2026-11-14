import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Square, AlertTriangle } from "lucide-react";
import { Field } from "@/components/ui/field";
import { FormInput as Input } from "@/components/ui/input";
import { NativeSelect as Select } from "@/components/ui/select";
import { FormTextarea as Textarea } from "@/components/ui/textarea";
import { SheetPage } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
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
    <SheetPage isOpen={true} onClose={onClose} title="Lançar Localizador no Embarque">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Viagem Atrelada *">
          <Select required value={tripId} onChange={(e) => setTripId(e.target.value)} className="h-9 rounded-xl bg-white/[0.04] border border-white/[0.08]">
            <option value="" className="bg-[#12141c] text-white">Selecione…</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id} className="bg-[#12141c] text-white">
                {t.code ? `${t.code} - ` : ""}
                {t.title}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Localizador (Código de Reserva)">
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
          <Field label="Qtd. Passageiros">
            <Input
              type="number"
              value={paxCount}
              onChange={(e) => setPaxCount(e.target.value)}
              placeholder="Ex: 2"
            />
          </Field>
        </div>
        <Field label="Alertas Especiais (1 por linha)">
          <Textarea
            value={alerts}
            onChange={(e) => setAlerts(e.target.value)}
            rows={3}
            placeholder="Ex: Assentos marcados na fila de emergência&#10;Bagagem despachada inclusa"
          />
        </Field>
        <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-3">
          <div className="mb-1.5 text-xs font-semibold text-zinc-400">
            {passengersList.length > 0
              ? `Checklist gerado de ${passengersList.length} passageiros reais:`
              : "Checklist padrão gerado automaticamente:"}
          </div>
          <div className="space-y-1">
            {passengersList.length > 0 ? (
              passengersList.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 text-xs text-zinc-300 font-medium"
                >
                  <Square className="h-3 w-3 text-brand" /> {p.full_name}
                </div>
              ))
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-amber-400">
                <AlertTriangle className="h-3 w-3 text-amber-400" /> Sem passageiros na viagem. Usando
                checklist genérico.
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.08]">
          <Button variant="ghost" type="button" onClick={onClose} className="h-9 px-4 rounded-full border border-white/[0.08] bg-white/[0.04] text-zinc-300 hover:text-white cursor-pointer">
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting} className="h-9 px-5 rounded-full bg-white text-black font-semibold hover:bg-white/90 shadow-sm cursor-pointer disabled:opacity-50">
            {submitting ? "Processando…" : "Adicionar à Fila"}
          </Button>
        </div>
      </form>
    </SheetPage>
  );
}
