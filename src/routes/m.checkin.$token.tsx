import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Plane,
  AlertTriangle,
  CheckCircle2,
  Square,
  CheckSquare,
  Loader2,
  ExternalLink,
  Users,
  AlertOctagon,
  Clock,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { getLastName, getAirlineCheckinUrl } from "@/utils/airline-deeplinks";

export const Route = createFileRoute("/m/checkin/$token")({
  head: ({ context }: any) => ({ meta: [{ title: `Meu Embarque · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: MobileCheckinPage,
});

type Item = { label: string; done?: boolean; passenger_id?: string };

type Passenger = {
  id: string;
  full_name: string;
  document: string | null;
};

type CheckinLink = {
  id: string;
  raw_url: string;
  provider: string;
  link_type: string;
};

type Segment = {
  id: string;
  airline_code: string;
  flight_number: string;
  origin_iata: string;
  destination_iata: string;
  departure_at: string;
  arrival_at: string;
  cabin: string | null;
  baggage: string | null;
  record_locator: string | null;
  airport_terminal: string | null;
  status: string;
  checkin_link: CheckinLink | null;
};

type Reaccommodation = {
  itinerary_id: string;
  version: number;
  segments: {
    id: string;
    airline_code: string;
    flight_number: string;
    origin_iata: string;
    destination_iata: string;
    departure_at: string;
    arrival_at: string;
  }[];
};

type BoardingCardDetails = {
  card: {
    id: string;
    pnr: string | null;
    airline: string | null;
    status: string;
    alerts: string[];
    checklist: Item[];
    trip_id: string;
    agency_id: string;
  };
  passengers: Passenger[];
  segments: Segment[];
  reaccommodations: Reaccommodation[];
};

function MobileCheckinPage() {
  const { token } = Route.useParams();
  const [details, setDetails] = useState<BoardingCardDetails | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [checklist, setChecklist] = useState<Item[]>([]);
  const [selectedPassengerId, setSelectedPassengerId] = useState<string>("");

  // Reaccommodation state
  const [acceptingReac, setAcceptingReac] = useState(false);

  // Emergency state
  const [emergencyType, setEmergencyType] = useState<"delayed" | "cancelled" | null>(null);
  const [emergencyComment, setEmergencyComment] = useState("");
  const [submittingEmergency, setSubmittingEmergency] = useState(false);

  async function loadDetails() {
    const { data, error } = await supabase.rpc("get_public_boarding_card_details", {
      p_id: token,
    });

    if (error) {
      setErr(error.message);
    } else if (!data || !(data as unknown as BoardingCardDetails)?.card) {
      setErr("Cartão de embarque não encontrado ou expirado.");
    } else {
      const d = data as unknown as BoardingCardDetails;
      setDetails(d);
      setChecklist(d.card.checklist || []);

      // Auto-select first passenger if none selected
      if (d.passengers && d.passengers.length > 0 && !selectedPassengerId) {
        setSelectedPassengerId(d.passengers[0].id);
      }
    }
  }

  useEffect(() => {
    loadDetails();
  }, [token]);

  async function toggle(idx: number) {
    const next = checklist.map((c, i) => (i === idx ? { ...c, done: !c.done } : c));
    setChecklist(next);
    setSaving(true);
    const { error } = await supabase.rpc("update_public_boarding_card_checklist", {
      p_id: token,
      p_checklist: next as unknown as import("@/integrations/supabase/types").Json,
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao sincronizar. Tente novamente.");
      setChecklist(checklist); // revert
    } else {
      toast.success("Progresso salvo");
    }
  }

  async function handleCheckinClick(segment: Segment, url: string) {
    window.open(url, "_blank");

    // Log event in database
    await supabase.rpc("create_public_boarding_event", {
      p_boarding_card_id: token,
      p_traveler_id: selectedPassengerId || "",
      p_flight_segment_id: segment.id,
      p_event_type: "checkin_link_clicked",
      p_metadata: {
        segment_id: segment.id,
        url,
      } as unknown as import("@/integrations/supabase/types").Json,
    });
  }

  async function handleAcceptReaccommodation(itineraryId: string) {
    setAcceptingReac(true);
    const { error } = await supabase.rpc("accept_public_reaccommodation", {
      p_boarding_card_id: token,
      p_itinerary_id: itineraryId,
    });
    setAcceptingReac(false);

    if (error) {
      toast.error("Erro ao aceitar reacomodação. Tente novamente ou fale com o agente.");
    } else {
      toast.success("Novo itinerário confirmado com sucesso!");
      loadDetails();
    }
  }

  async function handleSubmitEmergency() {
    if (!emergencyType) return;
    setSubmittingEmergency(true);

    const { error } = await supabase.rpc("submit_emergency_flight_issue", {
      p_boarding_card_id: token,
      p_issue_type: emergencyType,
      p_description: emergencyComment,
    });
    setSubmittingEmergency(false);

    if (error) {
      toast.error("Erro ao enviar notificação. Tente novamente.");
    } else {
      toast.success("Sua agência foi notificada em caráter de urgência!");
      setEmergencyType(null);
      setEmergencyComment("");
    }
  }

  if (err)
    return (
      <Center>
        <AlertTriangle className="w-8 h-8 text-danger mb-3" />
        <h1 className="text-lg font-semibold">{err}</h1>
      </Center>
    );

  if (!details)
    return (
      <Center>
        <Loader2 className="w-8 h-8 text-brand animate-spin mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Carregando seu embarque…</p>
      </Center>
    );

  const doneCount = checklist.filter((c) => c.done).length;
  const isAllDone = doneCount === checklist.length && checklist.length > 0;

  const activePassenger = details.passengers.find((p) => p.id === selectedPassengerId);
  const passengerLastName = activePassenger ? getLastName(activePassenger.full_name) : "";

  return (
    <div className="mx-auto min-h-screen max-w-md bg-surface text-foreground font-sans pb-12">
      {/* Header */}
      <div className="bg-brand text-brand-foreground px-6 py-8 rounded-b-[2.5rem] relative overflow-hidden">
        <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="relative z-10">
          <h1 className="mb-1 text-2xl font-black tracking-tight ">Meu Embarque</h1>
          <p className="text-brand-foreground/80 font-medium text-sm">
            Portal oficial do passageiro para e-checkin e assistência.
          </p>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Passenger Selector */}
        {details.passengers.length > 1 && (
          <div className="bg-background border border-border/60 rounded-2xl p-4 space-y-2">
            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Passageiro para Check-in
            </label>
            <select
              value={selectedPassengerId}
              onChange={(e) => setSelectedPassengerId(e.target.value)}
              className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-surface focus:outline-none focus:ring-1 focus:ring-brand font-medium text-foreground"
            >
              {details.passengers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Reaccommodation Widget */}
        {details.reaccommodations && details.reaccommodations.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
              <AlertOctagon className="w-5 h-5 shrink-0" />
              <span>Aviso de Reacomodação de Voo</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A agência disponibilizou uma alternativa para os seus voos. Verifique e confirme o
              aceite abaixo:
            </p>

            {details.reaccommodations.map((reac, rIdx) => (
              <div
                key={reac.itinerary_id}
                className="space-y-3 bg-surface border border-border/40 rounded-xl p-3"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Proposta Alternativa (V{reac.version})
                </div>
                <div className="space-y-2">
                  {reac.segments.map((seg, sIdx) => (
                    <div key={seg.id} className="text-xs space-y-1 border-l-2 border-brand/40 pl-2">
                      <div className="font-semibold flex items-center gap-1">
                        <span className="font-mono text-[10px] bg-brand/10 text-brand px-1 py-0.5 rounded">
                          {seg.airline_code} {seg.flight_number}
                        </span>
                        <span>
                          {seg.origin_iata} → {seg.destination_iata}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Partida: {new Date(seg.departure_at).toLocaleString("pt-BR")}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleAcceptReaccommodation(reac.itinerary_id)}
                  disabled={acceptingReac}
                  className="w-full text-xs bg-brand text-brand-foreground hover:bg-brand/90 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {acceptingReac ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Aceitar e Confirmar Novo Voo
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Flight Segments List (E-Checkin) */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Voos & e-Check-in
          </h2>

          {details.segments.length === 0 ? (
            <div className="bg-background border border-border/60 rounded-2xl p-5 text-center text-xs text-muted-foreground">
              Nenhum trecho de voo confirmado ativo para esta viagem.
            </div>
          ) : (
            <div className="space-y-4">
              {details.segments.map((seg, idx) => {
                // Determine check-in url
                let checkinUrl = "";
                if (seg.checkin_link && seg.checkin_link.raw_url) {
                  checkinUrl = seg.checkin_link.raw_url;
                } else {
                  checkinUrl = getAirlineCheckinUrl(
                    seg.airline_code || details.card.airline || "",
                    seg.record_locator || details.card.pnr || "",
                    passengerLastName || "Passageiro",
                    seg.origin_iata,
                  );
                }

                return (
                  <div
                    key={seg.id}
                    className="bg-background border border-border/60 rounded-2xl p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Plane className="w-4 h-4 text-brand" />
                        <span className="text-sm font-bold text-foreground">Trecho {idx + 1}</span>
                      </div>
                      <span className="font-mono text-xs font-bold bg-brand/10 text-brand px-2 py-0.5 rounded">
                        {seg.airline_code} {seg.flight_number}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-y border-border/40 py-3">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          Origem
                        </div>
                        <div className="font-bold text-sm">{seg.origin_iata}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(seg.departure_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          (
                          {new Date(seg.departure_at).toLocaleDateString("pt-BR", {
                            day: "numeric",
                            month: "short",
                          })}
                          )
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          Destino
                        </div>
                        <div className="font-bold text-sm">{seg.destination_iata}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(seg.arrival_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          (
                          {new Date(seg.arrival_at).toLocaleDateString("pt-BR", {
                            day: "numeric",
                            month: "short",
                          })}
                          )
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      {seg.record_locator && (
                        <div>
                          Loc:{" "}
                          <span className="font-mono font-bold text-foreground">
                            {seg.record_locator}
                          </span>
                        </div>
                      )}
                      {seg.airport_terminal && (
                        <div>
                          Terminal:{" "}
                          <span className="font-bold text-foreground">{seg.airport_terminal}</span>
                        </div>
                      )}
                      {seg.cabin && (
                        <div>
                          Cabine: <span className="font-bold text-foreground">{seg.cabin}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleCheckinClick(seg, checkinUrl)}
                      className="w-full bg-brand text-brand-foreground hover:bg-brand/90 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      Iniciar Check-in na {seg.airline_code}{" "}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Interactive Checklist */}
        <div>
          <div className="flex justify-between items-end mb-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Etapas Necessárias
            </h2>
            <span className="text-xs font-bold text-brand">
              {doneCount}/{checklist.length}
            </span>
          </div>

          <div className="bg-background border border-border/60 rounded-2xl overflow-hidden ">
            {checklist.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Nenhuma etapa definida.
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {checklist.map((it, i) => (
                  <button
                    key={i}
                    onClick={() => toggle(i)}
                    disabled={saving}
                    className={`w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-surface-alt/50 active:bg-surface-alt ${it.done ? "bg-surface-alt/20" : ""}`}
                  >
                    {it.done ? (
                      <CheckSquare className="w-5 h-5 text-success shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-muted-foreground shrink-0" />
                    )}
                    <span
                      className={`text-xs font-medium ${it.done ? "line-through text-muted-foreground" : "text-foreground"}`}
                    >
                      {it.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Alerts */}
        {details.card.alerts?.length > 0 && (
          <div className="bg-warning/10 border border-warning/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-warning font-bold text-xs mb-2">
              <AlertTriangle className="w-4 h-4" /> Atenção Operacional
            </div>
            <ul className="space-y-1.5 text-xs text-warning-foreground font-medium pl-6 list-disc">
              {details.card.alerts.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        )}

        {isAllDone && (
          <div className="bg-success/10 border border-success/20 rounded-2xl p-5 text-center">
            <h3 className="font-bold text-success text-xs mb-1">Tudo Pronto!</h3>
            <p className="text-[11px] text-success/80 font-medium">
              Sua documentação e check-in estão finalizados. Boa viagem!
            </p>
          </div>
        )}

        {/* Emergency Section */}
        <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
            <AlertOctagon className="w-4 h-4 shrink-0 animate-pulse" />
            <span>Precisa de Ajuda Urgente?</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Se o seu voo sofreu alterações no aeroporto, reporte à agência imediatamente para
            assistência operacional rápida.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setEmergencyType("delayed");
                setEmergencyComment("");
              }}
              className={`py-2 rounded-xl text-xs font-bold border transition-colors ${emergencyType === "delayed" ? "bg-amber-500 text-white border-amber-600" : "bg-surface border-border text-foreground hover:bg-surface-alt"}`}
            >
              Voo Atrasou
            </button>
            <button
              onClick={() => {
                setEmergencyType("cancelled");
                setEmergencyComment("");
              }}
              className={`py-2 rounded-xl text-xs font-bold border transition-colors ${emergencyType === "cancelled" ? "bg-rose-600 text-white border-rose-700" : "bg-surface border-border text-foreground hover:bg-surface-alt"}`}
            >
              Voo Cancelado
            </button>
          </div>

          {emergencyType && (
            <div className="space-y-3 pt-3 border-t border-border/40">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                Detalhes adicionais (opcional)
              </label>
              <textarea
                value={emergencyComment}
                onChange={(e) => setEmergencyComment(e.target.value)}
                placeholder="Ex: Novo portão, previsão de novo voo..."
                rows={3}
                className="w-full text-xs border border-border rounded-xl p-2.5 bg-surface focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium text-foreground resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setEmergencyType(null)}
                  className="flex-1 bg-surface border border-border hover:bg-surface-alt py-2 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitEmergency}
                  disabled={submittingEmergency}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {submittingEmergency ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  Enviar Alerta
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-6">
      <div className="flex flex-col items-center justify-center text-center p-8">{children}</div>
    </div>
  );
}
