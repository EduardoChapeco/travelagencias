import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  BedDouble,
  Search,
  Download,
  Filter,
  Users,
  Calendar,
  ChevronDown,
  ChevronRight,
  Plane,
  Phone,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/agency/$slug/rooming-list")({
  head: () => ({ meta: [{ title: "Rooming List · TravelOS" }] }),
  component: RoomingListPage,
});

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Passenger = Database["public"]["Tables"]["trip_passengers"]["Row"] & {
  seat_number?: string | null;
  room_type?: string | null;
  room_number?: string | null;
  dietary_restrictions?: string | null;
  special_needs?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
};

type Trip = {
  id: string;
  number: number;
  title: string;
  destination: string | null;
  travel_start: string | null;
  travel_end: string | null;
  status: string | null;
};

type TripWithPassengers = Trip & { passengers: Passenger[] };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function statusColor(status: string | null) {
  switch (status) {
    case "confirmed": return "text-green-500";
    case "pending":   return "text-amber-500";
    case "cancelled": return "text-red-500";
    default:          return "text-muted-foreground";
  }
}

function statusIcon(status: string | null) {
  switch (status) {
    case "confirmed": return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    case "pending":   return <Clock        className="h-3.5 w-3.5 text-amber-500" />;
    case "cancelled": return <AlertCircle  className="h-3.5 w-3.5 text-red-500"   />;
    default:          return <Clock        className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
function RoomingListPage() {
  const { slug } = Route.useParams();
  const { agency } = useAgency();

  const [search,     setSearch]     = useState("");
  const [tripFilter, setTripFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expanded,   setExpanded]   = useState<Record<string, boolean>>({});

  // ── Fetch all upcoming/active trips with passengers ────────────────────────
  const tripsQ = useQuery({
    enabled: !!agency,
    queryKey: ["rooming-list-trips", agency?.id],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("id, number, title, destination, travel_start, travel_end, status")
        .eq("agency_id", agency!.id)
        .in("status", ["planning", "confirmed", "in_progress"])
        .order("travel_start", { ascending: true })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Trip[];
    },
  });

  const passengersQ = useQuery({
    enabled: !!agency && (tripsQ.data?.length ?? 0) > 0,
    queryKey: ["rooming-list-passengers", agency?.id],
    staleTime: 30_000,
    queryFn: async () => {
      const tripIds = tripsQ.data!.map((t) => t.id);
      const { data, error } = await supabase
        .from("trip_passengers")
        .select("*")
        .in("trip_id", tripIds)
        .is("deleted_at", null)
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as Passenger[];
    },
  });

  // ── Aggregate trips with their passengers ─────────────────────────────────
  const trips: TripWithPassengers[] = useMemo(() => {
    const trips = tripsQ.data ?? [];
    const passengers = passengersQ.data ?? [];
    return trips.map((t) => ({
      ...t,
      passengers: passengers.filter((p) => p.trip_id === t.id),
    }));
  }, [tripsQ.data, passengersQ.data]);

  // ── Filtered view ─────────────────────────────────────────────────────────
  const filtered: TripWithPassengers[] = useMemo(() => {
    let result = trips;
    if (tripFilter !== "all") result = result.filter((t) => t.id === tripFilter);

    const q = search.toLowerCase().trim();
    if (q) {
      result = result
        .map((t) => ({
          ...t,
          passengers: t.passengers.filter(
            (p) =>
              p.full_name?.toLowerCase().includes(q) ||
              p.cpf?.includes(q) ||
              p.passport_number?.toLowerCase().includes(q) ||
              p.email?.toLowerCase().includes(q),
          ),
        }))
        .filter((t) => t.passengers.length > 0);
    }

    if (statusFilter !== "all") {
      result = result
        .map((t) => ({
          ...t,
          passengers: t.passengers.filter((p) => p.status === statusFilter),
        }))
        .filter((t) => t.passengers.length > 0);
    }

    return result;
  }, [trips, search, tripFilter, statusFilter]);

  const totalPassengers = filtered.reduce((s, t) => s + t.passengers.length, 0);

  const toggleTrip = (id: string) =>
    setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const isLoading = tripsQ.isLoading || passengersQ.isLoading;

  // ── Print handler ──────────────────────────────────────────────────────────
  const handlePrint = () => window.print();

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4 shrink-0 print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10">
            <BedDouble className="h-5 w-5 text-brand" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Rooming List</h1>
            <p className="text-xs text-muted-foreground">
              {totalPassengers} passageiro{totalPassengers !== 1 ? "s" : ""} em{" "}
              {filtered.length} viagem{filtered.length !== 1 ? "ns" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="h-3.5 w-3.5" />
            Imprimir
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Exportar
          </Button>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-3 shrink-0 print:hidden bg-surface/50">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF, passaporte..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-xs"
          />
        </div>

        <Select value={tripFilter} onValueChange={setTripFilter}>
          <SelectTrigger className="h-8 text-xs w-[220px]">
            <SelectValue placeholder="Filtrar por viagem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Viagens</SelectItem>
            {(tripsQ.data ?? []).map((t) => (
              <SelectItem key={t.id} value={t.id}>
                #{t.number} · {t.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 text-xs w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="confirmed">Confirmado</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        {(search || tripFilter !== "all" || statusFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => { setSearch(""); setTripFilter("all"); setStatusFilter("all"); }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            Carregando...
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <BedDouble className="h-12 w-12 opacity-20" />
            <p className="text-sm">Nenhuma viagem encontrada</p>
            {search && <p className="text-xs">Tente uma busca diferente</p>}
          </div>
        )}

        {filtered.map((trip) => {
          const isOpen = expanded[trip.id] !== false; // default open
          const confirmed = trip.passengers.filter((p) => p.status === "confirmed").length;
          const pending   = trip.passengers.filter((p) => p.status === "pending").length;

          return (
            <div key={trip.id} className="rounded-xl border border-border bg-card overflow-hidden shadow-sm print:break-inside-avoid">
              {/* Trip header row */}
              <button
                onClick={() => toggleTrip(trip.id)}
                className="flex w-full items-center gap-4 px-5 py-3.5 hover:bg-accent/40 transition-colors print:hidden"
              >
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                  "bg-brand/10 text-brand",
                )}>
                  #{trip.number}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold leading-tight">{trip.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                    {trip.destination && (
                      <span className="flex items-center gap-1">
                        <Plane className="h-3 w-3" />
                        {trip.destination}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {fmtDate(trip.travel_start)} → {fmtDate(trip.travel_end)}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span className="font-medium text-foreground">{trip.passengers.length}</span>
                    pax
                  </div>
                  {confirmed > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-5 bg-green-500/10 text-green-600 border-green-500/20">
                      {confirmed} conf.
                    </Badge>
                  )}
                  {pending > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-5 bg-amber-500/10 text-amber-600 border-amber-500/20">
                      {pending} pend.
                    </Badge>
                  )}
                  <Link
                    to="/agency/$slug/trips/$id/passengers"
                    params={{ slug, id: trip.id }}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] text-brand hover:underline"
                  >
                    Ver Viagem →
                  </Link>
                  {isOpen
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  }
                </div>
              </button>

              {/* Print-only trip header */}
              <div className="hidden print:flex items-center gap-3 px-5 py-3 border-b border-border">
                <span className="font-bold text-sm">#{trip.number} · {trip.title}</span>
                <span className="text-xs text-muted-foreground">
                  {fmtDate(trip.travel_start)} → {fmtDate(trip.travel_end)} · {trip.destination}
                </span>
              </div>

              {/* Passenger table */}
              {(isOpen || true) && trip.passengers.length > 0 && (
                <div className={cn("overflow-x-auto", !isOpen && "hidden print:block")}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-t border-border bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-2 text-left font-medium w-6">#</th>
                        <th className="px-4 py-2 text-left font-medium">Passageiro</th>
                        <th className="px-4 py-2 text-left font-medium">CPF / Passaporte</th>
                        <th className="px-4 py-2 text-left font-medium">Nasc.</th>
                        <th className="px-4 py-2 text-left font-medium">Quarto</th>
                        <th className="px-4 py-2 text-left font-medium">Poltrona</th>
                        <th className="px-4 py-2 text-left font-medium">Contato Emergência</th>
                        <th className="px-4 py-2 text-left font-medium">Status</th>
                        <th className="px-4 py-2 text-left font-medium print:hidden">Obs.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trip.passengers.map((p, idx) => (
                        <tr
                          key={p.id}
                          className={cn(
                            "border-t border-border/50 transition-colors",
                            idx % 2 === 0 ? "bg-background" : "bg-muted/20",
                            "hover:bg-accent/30",
                            p.is_lead_passenger && "ring-1 ring-inset ring-brand/20",
                          )}
                        >
                          <td className="px-4 py-2.5 text-muted-foreground font-mono">
                            {idx + 1}
                            {p.is_lead_passenger && (
                              <span className="ml-1 text-[9px] font-bold text-brand uppercase">lead</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-foreground">{p.full_name ?? "—"}</div>
                            {p.email && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">{p.email}</div>
                            )}
                            {p.phone && (
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Phone className="h-2.5 w-2.5" />{p.phone}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5 font-mono">
                            <div className="text-foreground">{p.cpf ?? "—"}</div>
                            {p.passport_number && (
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <FileText className="h-2.5 w-2.5" />
                                {p.passport_number}
                                {p.passport_expiry && (
                                  <span className="text-[9px] opacity-60">exp. {fmtDate(p.passport_expiry)}</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">
                            {fmtDate(p.birth_date)}
                          </td>
                          <td className="px-4 py-2.5">
                            {p.room_number || p.room_type || p.accommodation_notes ? (
                              <div>
                                {p.room_number && (
                                  <span className="font-medium text-foreground">{p.room_number}</span>
                                )}
                                {p.room_type && (
                                  <div className="text-[10px] text-muted-foreground">{p.room_type}</div>
                                )}
                                {p.accommodation_notes && (
                                  <div className="text-[10px] text-muted-foreground italic">{p.accommodation_notes}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            {p.seat_number ? (
                              <span className="font-mono font-medium text-foreground">{p.seat_number}</span>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            {p.emergency_contact_name ? (
                              <div>
                                <div className="text-foreground">{p.emergency_contact_name}</div>
                                {p.emergency_contact_phone && (
                                  <div className="text-[10px] text-muted-foreground">{p.emergency_contact_phone}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className={cn("flex items-center gap-1", statusColor(p.status))}>
                              {statusIcon(p.status)}
                              <span className="capitalize text-[10px]">{p.status ?? "—"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 print:hidden max-w-[160px]">
                            {(p.meal_preference || p.disabilities || p.notes) ? (
                              <div className="text-[10px] text-amber-600 leading-tight">
                                {[p.meal_preference, p.disabilities, p.notes].filter(Boolean).join(" · ")}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border bg-muted/20">
                        <td colSpan={9} className="px-4 py-2 text-[10px] text-muted-foreground">
                          Total: <strong className="text-foreground">{trip.passengers.length}</strong> passageiros
                          {" · "}Confirmados: <strong className="text-green-600">{confirmed}</strong>
                          {" · "}Pendentes: <strong className="text-amber-600">{pending}</strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {isOpen && trip.passengers.length === 0 && (
                <div className="px-5 py-6 text-center text-xs text-muted-foreground border-t border-border">
                  Nenhum passageiro cadastrado ainda.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:break-inside-avoid, .print\\:break-inside-avoid * { visibility: visible; }
          .print\\:break-inside-avoid { position: relative; }
          @page { margin: 15mm; }
        }
      `}</style>
    </div>
  );
}
