import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  BedDouble,
  Search,
  Download,
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
  Plus,
  Trash2,
  Hotel,
  Users2,
  Check,
  XCircle,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { Input, PrimaryButton, GhostButton, StatusBadge, Field } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";
import {
  DndContext,
  useSensors,
  useSensor,
  PointerSensor,
  TouchSensor,
  DragOverlay,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import {
  fetchRoomingListByTour,
  createRoomRecord,
  deleteRoomRecord,
  updateRoomRecord,
  allocatePassengerToRoom,
  deallocatePassengerFromRoom,
  ROOM_TYPE_LABEL,
  ROOM_CAPACITY,
  type RoomRecord,
  type RoomingPassenger,
} from "@/services/rooming";
import {
  exportRoomingListXlsx,
  exportRoomingListDocx,
  exportRoomingListPdf,
} from "@/lib/exportRoomingList";
import { toast } from "sonner";

export const Route = createFileRoute("/agency/$slug/rooming-list")({
  head: () => ({ meta: [{ title: "Rooming List · TravelOS" }] }),
  component: RoomingListDashboard,
});

type Tour = Database["public"]["Tables"]["group_tours"]["Row"] & {
  rooms?: any[];
  enrollments?: any[];
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Drag and Drop Helper Components ──────────────────────────────────────────
function DraggablePassenger({
  id,
  name,
  isCompact = false,
  onRemove,
}: {
  id: string;
  name: string;
  isCompact?: boolean;
  onRemove?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `passenger_${id}`,
    data: { id, name },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 9999,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center justify-between py-1.5 px-3 rounded-lg bg-surface border border-border shadow-xs hover:border-brand/50 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all select-none",
        isDragging && "opacity-45 border-dashed border-brand",
        isCompact
          ? "text-xs font-semibold py-1 px-2.5 bg-brand/5 border-brand/10 text-foreground"
          : "text-xs font-semibold text-foreground bg-surface",
      )}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <Users2 className="h-3.5 w-3.5 text-brand shrink-0" />
        <span className="truncate">{name}</span>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-muted-foreground hover:text-danger transition-colors cursor-pointer ml-2 shrink-0 pointer-events-auto"
        >
          <XCircle className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function DroppableRoom({
  room,
  children,
  isFull,
}: {
  room: any;
  children: React.ReactNode;
  isFull: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `room_${room.id}`,
    data: { roomId: room.id, isFull },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl border bg-surface overflow-hidden transition-all duration-200",
        room.is_confirmed ? "border-success/40" : "border-border",
        isOver && !isFull && "ring-2 ring-brand border-brand bg-brand/5 scale-[1.01]",
        isOver && isFull && "ring-2 ring-danger border-danger bg-danger/5",
      )}
    >
      {children}
    </div>
  );
}

function DroppableUnallocated({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: "unallocated",
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl border border-dashed border-border bg-surface-alt/10 p-4 transition-all duration-200",
        isOver && "ring-2 ring-brand border-brand bg-brand/5",
      )}
    >
      {children}
    </div>
  );
}

// ─── Single Tour Panel Component ──────────────────────────────────────────────
interface TourPanelProps {
  tour: Tour;
  slug: string;
}

function TourPanel({ tour, slug }: TourPanelProps) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomRecord | null>(null);

  const [newRoom, setNewRoom] = useState({
    room_number: "",
    room_type: "double",
    hotel_name: "",
    checkin_date: tour.departure_date ? String(tour.departure_date).slice(0, 10) : "",
    checkout_date: tour.return_date ? String(tour.return_date).slice(0, 10) : "",
    notes: "",
  });

  // Queries
  const roomsQ = useQuery({
    queryKey: ["rooming-list", tour.id],
    queryFn: () => fetchRoomingListByTour(tour.id),
  });

  const enrolQ = useQuery({
    queryKey: ["group-enrollments", tour.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("group_tour_enrollments")
        .select("id, passenger_name, passenger_cpf, status, seat_number, room_type")
        .eq("group_tour_id", tour.id)
        .eq("status", "confirmed");
      if (error) throw error;
      return data ?? [];
    },
  });

  const rooms = roomsQ.data ?? tour.rooms ?? [];
  const passengers = enrolQ.data ?? (tour.enrollments?.filter((e: any) => e.status === "confirmed") ?? []);

  const allocatedIds = new Set(
    rooms.flatMap((r) =>
      ((r.passengers ?? []) as unknown as RoomingPassenger[]).map((p) => p.passenger_id),
    ),
  );

  const unallocated = passengers.filter((p: any) => !allocatedIds.has(p.id));
  const totalBeds = rooms.reduce((sum, r) => sum + (ROOM_CAPACITY[r.room_type] ?? 2), 0);
  const totalOccupied = rooms.reduce(
    (sum, r) => sum + ((r.passengers as unknown as RoomingPassenger[]) ?? []).length,
    0,
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["rooming-list", tour.id] });
    qc.invalidateQueries({ queryKey: ["group-tours"] });
  };

  // Mutations
  const toggleSentHotel = async () => {
    const nextVal = !tour.rooming_list_sent_hotel;
    const { error } = await supabase
      .from("group_tours")
      .update({ rooming_list_sent_hotel: nextVal } as any)
      .eq("id", tour.id);
    if (error) return toast.error(error.message);
    toast.success(
      nextVal ? "Marcado como enviado para hotel" : "Marcado como não enviado para hotel",
    );
    qc.invalidateQueries({ queryKey: ["group-tours"] });
  };

  const toggleSentBus = async () => {
    const nextVal = !tour.rooming_list_sent_bus;
    const { error } = await supabase
      .from("group_tours")
      .update({ rooming_list_sent_bus: nextVal } as any)
      .eq("id", tour.id);
    if (error) return toast.error(error.message);
    toast.success(
      nextVal ? "Marcado como enviado para ônibus" : "Marcado como não enviado para ônibus",
    );
    qc.invalidateQueries({ queryKey: ["group-tours"] });
  };

  const toggleListStatus = async () => {
    const nextVal = tour.rooming_list_status === "closed" ? "open" : "closed";
    const { error } = await supabase
      .from("group_tours")
      .update({ rooming_list_status: nextVal } as any)
      .eq("id", tour.id);
    if (error) return toast.error(error.message);
    toast.success(nextVal === "closed" ? "Rooming list fechada" : "Rooming list reaberta");
    qc.invalidateQueries({ queryKey: ["group-tours"] });
  };

  const addRoomMutation = useMutation({
    mutationFn: async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newRoom.room_number.trim()) throw new Error("Informe o número/nome do quarto.");
      await createRoomRecord({
        agency_id: tour.agency_id,
        group_tour_id: tour.id,
        card_id: null as any,
        room_number: newRoom.room_number,
        room_type: newRoom.room_type,
        hotel_name: newRoom.hotel_name || null,
        checkin_date: newRoom.checkin_date || null,
        checkout_date: newRoom.checkout_date || null,
        notes: newRoom.notes || null,
        is_confirmed: false,
        passengers: [],
        order_index: rooms.length,
      });
    },
    onSuccess: () => {
      toast.success("Quarto adicionado!");
      setAddOpen(false);
      setNewRoom({
        room_number: "",
        room_type: "double",
        hotel_name: "",
        checkin_date: tour.departure_date ? String(tour.departure_date).slice(0, 10) : "",
        checkout_date: tour.return_date ? String(tour.return_date).slice(0, 10) : "",
        notes: "",
      });
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateRoomMutation = useMutation({
    mutationFn: async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingRoom) return;
      await updateRoomRecord(editingRoom.id, {
        room_number: editingRoom.room_number,
        room_type: editingRoom.room_type,
        hotel_name: editingRoom.hotel_name,
        checkin_date: editingRoom.checkin_date,
        checkout_date: editingRoom.checkout_date,
        notes: editingRoom.notes,
      });
    },
    onSuccess: () => {
      toast.success("Quarto atualizado!");
      setEditingRoom(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function removeRoom(roomId: string) {
    if (!confirm("Excluir este quarto? Todos os passageiros alocados serão liberados.")) return;
    try {
      await deleteRoomRecord(roomId);
      toast.success("Quarto removido.");
      invalidate();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function toggleConfirmed(roomId: string, current: boolean) {
    try {
      await updateRoomRecord(roomId, { is_confirmed: !current });
      invalidate();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function assignPassengerToRoom(roomId: string, passengerId: string) {
    const pax = passengers.find((p: any) => p.id === passengerId);
    if (!pax) return;
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    const cap = ROOM_CAPACITY[room.room_type] ?? 2;
    const roomPax = (room.passengers as unknown as RoomingPassenger[]) ?? [];

    const currentRoom = rooms.find((r) =>
      ((r.passengers as unknown as RoomingPassenger[]) ?? []).some(
        (p) => p.passenger_id === passengerId,
      ),
    );

    if (currentRoom && currentRoom.id === roomId) return;

    if (roomPax.length >= cap) {
      return toast.error(`Quarto ${room.room_number} está lotado (máx. ${cap} pax).`);
    }

    try {
      if (currentRoom) {
        const curRoomPax = (currentRoom.passengers as unknown as RoomingPassenger[]) ?? [];
        await deallocatePassengerFromRoom(
          currentRoom.id,
          curRoomPax,
          passengerId,
          (currentRoom as any).version ?? 1,
        );
      }

      await allocatePassengerToRoom(
        roomId,
        roomPax,
        {
          passenger_id: passengerId,
          name: pax.passenger_name,
        },
        (room as any).version ?? 1,
      );
      toast.success(`${pax.passenger_name} alocado no quarto ${room.room_number}.`);
      invalidate();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function removePassengerFromRoom(roomId: string, passengerId: string) {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    const roomPax = (room.passengers as unknown as RoomingPassenger[]) ?? [];
    try {
      await deallocatePassengerFromRoom(roomId, roomPax, passengerId, (room as any).version ?? 1);
      invalidate();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const [exporting, setExporting] = useState(false);

  async function handleExportExcel() {
    if (rooms.length === 0) {
      return toast.warning("Nenhum quarto cadastrado para exportar.");
    }
    setExporting(true);
    try {
      await exportRoomingListXlsx(rooms as any, {
        filename: `rooming-list-${tour.slug}`,
        tourTitle: tour.title,
        departureDate: tour.departure_date,
      });
      toast.success("Rooming List exportada com sucesso!");
    } catch (err: any) {
      toast.error(`Erro ao exportar: ${err.message}`);
    } finally {
      setExporting(false);
    }
  }

  async function handleExportWord() {
    if (rooms.length === 0) {
      return toast.warning("Nenhum quarto cadastrado para exportar.");
    }
    setExporting(true);
    try {
      await exportRoomingListDocx(rooms as any, {
        filename: `rooming-list-${tour.slug}`,
        tourTitle: tour.title,
        departureDate: tour.departure_date,
      });
      toast.success("Rooming List exportada para Word com sucesso!");
    } catch (err: any) {
      toast.error(`Erro ao exportar: ${err.message}`);
    } finally {
      setExporting(false);
    }
  }

  async function handleExportPdf() {
    if (rooms.length === 0) {
      return toast.warning("Nenhum quarto cadastrado para exportar.");
    }
    setExporting(true);
    try {
      await exportRoomingListPdf(rooms as any, {
        filename: `rooming-list-${tour.slug}`,
        tourTitle: tour.title,
        departureDate: tour.departure_date,
      });
      toast.success("Rooming List exportada para PDF com sucesso!");
    } catch (err: any) {
      toast.error(`Erro ao exportar PDF: ${err.message}`);
    } finally {
      setExporting(false);
    }
  }

  // DND Handlers
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragName, setActiveDragName] = useState<string | null>(null);

  function handleDragStart(event: any) {
    const { active } = event;
    setActiveDragId(active.id);
    setActiveDragName(active.data.current?.name || "");
  }

  function handleDragEnd(event: any) {
    const { active, over } = event;
    setActiveDragId(null);
    setActiveDragName(null);
    if (!over) return;

    const passengerId = (active.id as string).replace("passenger_", "");

    if (over.id.startsWith("room_")) {
      const roomId = over.id.replace("room_", "");
      assignPassengerToRoom(roomId, passengerId);
    } else if (over.id === "unallocated") {
      const currentRoom = rooms.find((r) =>
        ((r.passengers as unknown as RoomingPassenger[]) ?? []).some(
          (p) => p.passenger_id === passengerId,
        ),
      );
      if (currentRoom) {
        removePassengerFromRoom(currentRoom.id, passengerId);
      }
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs print:break-inside-avoid">
      {/* Header Panel Summary Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-border bg-surface/30">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex flex-1 items-start gap-3.5 text-left cursor-pointer hover:opacity-85 transition-opacity"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/5 text-brand">
            <BedDouble className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold leading-tight text-foreground">{tour.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{tour.destination || "Destino não informado"}</span>
              <span className="text-muted-foreground/30">•</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {fmtDate(tour.departure_date)} → {fmtDate(tour.return_date)}
              </span>
            </p>
          </div>
        </button>

        {/* Status toggles & stats */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 border border-border/80 rounded-lg p-1 bg-surface/50 text-[10px] font-bold">
            {/* Status (Open / Closed) */}
            <button
              onClick={toggleListStatus}
              className={cn(
                "px-2 py-0.5 rounded cursor-pointer transition-colors",
                tour.rooming_list_status === "closed"
                  ? "bg-slate-900 text-white"
                  : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
              )}
            >
              Rooming: {tour.rooming_list_status === "closed" ? "Fechado" : "Aberto"}
            </button>

            {/* Sent Hotel Toggle */}
            <button
              onClick={toggleSentHotel}
              className={cn(
                "px-2 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1",
                tour.rooming_list_sent_hotel
                  ? "bg-green-600 text-white"
                  : "text-muted-foreground hover:bg-surface-alt",
              )}
            >
              {tour.rooming_list_sent_hotel && <Check className="h-2.5 w-2.5" />}
              Hotel
            </button>

            {/* Sent Bus Toggle */}
            <button
              onClick={toggleSentBus}
              className={cn(
                "px-2 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1",
                tour.rooming_list_sent_bus
                  ? "bg-blue-600 text-white"
                  : "text-muted-foreground hover:bg-surface-alt",
              )}
            >
              {tour.rooming_list_sent_bus && <Check className="h-2.5 w-2.5" />}
              Ônibus
            </button>
          </div>

          <div className="text-[10px] text-muted-foreground font-semibold flex gap-2">
            <span>
              Quartos:{" "}
              {roomsQ.isLoading ? (
                <span className="animate-pulse">...</span>
              ) : (
                <strong className="text-foreground">{rooms.length}</strong>
              )}
            </span>
            <span>
              Alocados:{" "}
              {roomsQ.isLoading || enrolQ.isLoading ? (
                <span className="animate-pulse">...</span>
              ) : (
                <strong className="text-brand">
                  {totalOccupied}/{passengers.length}
                </strong>
              )}
            </span>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Rooming Grid & Drag'n'Drop Area */}
      {expanded && (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="p-5 space-y-6 bg-surface/10 border-b border-border">
            {(roomsQ.isLoading || enrolQ.isLoading) && (
              <div className="text-center py-4 text-xs text-muted-foreground animate-pulse">
                Carregando dados dos quartos e passageiros...
              </div>
            )}

            {(roomsQ.isError || enrolQ.isError) && (
              <div className="flex items-center gap-2 p-3 text-xs border border-red-200 bg-red-50 text-red-700 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  Falha ao carregar dados dos quartos:{" "}
                  {roomsQ.isError && roomsQ.error instanceof Error ? roomsQ.error.message : enrolQ.isError && enrolQ.error instanceof Error ? enrolQ.error.message : "Erro desconhecido."}
                </span>
              </div>
            )}

            {/* Unallocated section */}
            <DroppableUnallocated>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-brand" /> Passageiros Confirmados Sem Quarto (
                  {unallocated.length})
                </h4>
                {unallocated.length > 0 && (
                  <span className="text-[9px] text-muted-foreground font-semibold">
                    Arrastar passageiro para o quarto desejado
                  </span>
                )}
              </div>
              {unallocated.length === 0 ? (
                <p className="text-xs text-success font-semibold py-1">
                  ✓ Todos os passageiros da excursão foram alocados!
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {unallocated.map((p: any) => (
                    <DraggablePassenger key={p.id} id={p.id} name={p.passenger_name} />
                  ))}
                </div>
              )}
            </DroppableUnallocated>

            {/* Room cards grid header */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                <Hotel className="h-4 w-4 text-brand" /> Quartos Cadastrados
              </h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={exporting || rooms.length === 0}
                  className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border bg-surface text-[10px] font-bold text-foreground hover:bg-surface-alt hover:border-brand transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Download className="h-3 w-3" /> Exportar Excel
                </button>
                <button
                  type="button"
                  onClick={handleExportWord}
                  disabled={exporting || rooms.length === 0}
                  className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border bg-surface text-[10px] font-bold text-foreground hover:bg-surface-alt hover:border-brand transition-colors cursor-pointer disabled:opacity-50"
                >
                  <FileText className="h-3 w-3" /> Exportar Word
                </button>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={exporting || rooms.length === 0}
                  className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border bg-surface text-[10px] font-bold text-foreground hover:bg-surface-alt hover:border-brand transition-colors cursor-pointer disabled:opacity-50"
                >
                  <FileText className="h-3 w-3 text-rose-500" /> Exportar PDF
                </button>
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-brand text-[10px] font-bold text-brand-foreground hover:opacity-90 cursor-pointer"
                >
                  <Plus className="h-3 w-3" /> Novo Quarto
                </button>
              </div>
            </div>

            {/* Add Room Inline Form */}
            {addOpen && (
              <div className="rounded-xl border border-brand/20 bg-brand/5 p-4">
                <h5 className="text-xs font-bold text-foreground mb-3">Novo Quarto</h5>
                <form onSubmit={(e) => addRoomMutation.mutate(e)} className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Field label="Número/Nome *">
                      <input
                        value={newRoom.room_number}
                        onChange={(e) => setNewRoom({ ...newRoom, room_number: e.target.value })}
                        placeholder="ex: 201 ou Master Suite"
                        className="h-8 rounded border border-border bg-surface px-2.5 text-xs text-foreground focus:border-brand focus:outline-none"
                        required
                      />
                    </Field>
                    <Field label="Tipo *">
                      <select
                        value={newRoom.room_type}
                        onChange={(e) => setNewRoom({ ...newRoom, room_type: e.target.value })}
                        className="h-8 rounded border border-border bg-surface px-2.5 text-xs text-foreground focus:border-brand focus:outline-none"
                      >
                        {Object.entries(ROOM_TYPE_LABEL).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Hotel/Pousada">
                      <input
                        value={newRoom.hotel_name}
                        onChange={(e) => setNewRoom({ ...newRoom, hotel_name: e.target.value })}
                        placeholder="Nome do hotel"
                        className="h-8 rounded border border-border bg-surface px-2.5 text-xs text-foreground focus:border-brand focus:outline-none"
                      />
                    </Field>
                    <Field label="Check-in">
                      <input
                        type="date"
                        value={newRoom.checkin_date}
                        onChange={(e) => setNewRoom({ ...newRoom, checkin_date: e.target.value })}
                        className="h-8 rounded border border-border bg-surface px-2.5 text-xs text-foreground focus:border-brand focus:outline-none"
                      />
                    </Field>
                    <Field label="Check-out">
                      <input
                        type="date"
                        value={newRoom.checkout_date}
                        onChange={(e) => setNewRoom({ ...newRoom, checkout_date: e.target.value })}
                        className="h-8 rounded border border-border bg-surface px-2.5 text-xs text-foreground focus:border-brand focus:outline-none"
                      />
                    </Field>
                    <Field label="Notas">
                      <input
                        value={newRoom.notes}
                        onChange={(e) => setNewRoom({ ...newRoom, notes: e.target.value })}
                        placeholder="Observações..."
                        className="h-8 rounded border border-border bg-surface px-2.5 text-xs text-foreground focus:border-brand focus:outline-none"
                      />
                    </Field>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <GhostButton
                      type="button"
                      onClick={() => setAddOpen(false)}
                      className="h-8 text-xs"
                    >
                      Cancelar
                    </GhostButton>
                    <PrimaryButton
                      type="submit"
                      disabled={addRoomMutation.isPending}
                      className="h-8 text-xs"
                    >
                      Salvar
                    </PrimaryButton>
                  </div>
                </form>
              </div>
            )}

            {/* Room cards grid */}
            {rooms.length === 0 && !addOpen ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                Nenhum quarto cadastrado para esta excursão.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {rooms.map((room) => {
                  const cap = ROOM_CAPACITY[room.room_type] ?? 2;
                  const roomPax = (room.passengers as unknown as RoomingPassenger[]) ?? [];
                  const isFull = roomPax.length >= cap;
                  const pct = roomPax.length / cap;

                  return (
                    <DroppableRoom key={room.id} room={room} isFull={isFull}>
                      {/* Room Card Title */}
                      <div
                        className={cn(
                          "flex items-center justify-between px-3 py-2 border-b border-border bg-surface/50",
                          room.is_confirmed &&
                            "bg-success/5 border-success/20 text-success-foreground",
                        )}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <BedDouble className="h-3.5 w-3.5 text-brand shrink-0" />
                          <span className="font-bold text-xs truncate">
                            Quarto {room.room_number}
                          </span>
                          <span className="text-[9px] text-muted-foreground shrink-0 bg-surface px-1.5 py-0.5 rounded border border-border">
                            {ROOM_TYPE_LABEL[room.room_type] ?? room.room_type}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleConfirmed(room.id, room.is_confirmed)}
                            title={room.is_confirmed ? "Confirmado" : "Confirmar com hotel"}
                            className={cn(
                              "p-1 rounded cursor-pointer",
                              room.is_confirmed
                                ? "text-success"
                                : "text-muted-foreground hover:text-success",
                            )}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingRoom(room)}
                            className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <FileText className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRoom(room.id)}
                            className="p-1 rounded text-muted-foreground hover:text-danger cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Room Occupancy bar */}
                      <div className="px-3 pt-2">
                        <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground uppercase mb-1">
                          <span>Ocupação</span>
                          <span>
                            {roomPax.length}/{cap}
                          </span>
                        </div>
                        <div className="h-1 bg-surface-alt rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              isFull
                                ? "bg-success"
                                : pct >= 0.5
                                  ? "bg-brand"
                                  : "bg-muted-foreground/30",
                            )}
                            style={{ width: `${Math.min(100, pct * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Room passengers list */}
                      <div className="p-3 space-y-1.5">
                        {roomPax.map((p) => (
                          <DraggablePassenger
                            key={p.passenger_id}
                            id={p.passenger_id}
                            name={p.name}
                            isCompact={true}
                            onRemove={() => removePassengerFromRoom(room.id, p.passenger_id)}
                          />
                        ))}

                        {/* Dropdown helper to assign passenger quickly */}
                        {!isFull && (
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                assignPassengerToRoom(room.id, e.target.value);
                                e.target.value = "";
                              }
                            }}
                            className="w-full h-7 rounded border border-dashed border-brand/35 bg-transparent text-[10px] text-muted-foreground focus:outline-none focus:border-brand cursor-pointer px-1"
                          >
                            <option value="">+ Alocar Passageiro...</option>
                            {unallocated.map((p: any) => (
                              <option key={p.id} value={p.id}>
                                {p.passenger_name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Hotel detail Footer */}
                      {(room.hotel_name || room.checkin_date) && (
                        <div className="px-3 py-1.5 border-t border-border/50 bg-surface-alt/10 text-[9px] text-muted-foreground font-medium flex flex-wrap gap-x-2 gap-y-0.5">
                          {room.hotel_name && (
                            <span className="flex items-center gap-0.5">
                              <Hotel className="h-2 w-2" />
                              {room.hotel_name}
                            </span>
                          )}
                          {room.checkin_date && <span>In: {fmtDate(room.checkin_date)}</span>}
                          {room.checkout_date && <span>Out: {fmtDate(room.checkout_date)}</span>}
                        </div>
                      )}
                    </DroppableRoom>
                  );
                })}
              </div>
            )}

            {/* Validation Closure checklist */}
            {rooms.length > 0 && (
              <div className="rounded-xl border border-border bg-surface p-4">
                <h5 className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-success" /> Checklist de Fechamento do Grupo
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-bold">
                  {[
                    {
                      ok: unallocated.length === 0,
                      label: `Todos os passageiros alocados (${allocatedIds.size}/${passengers.length})`,
                    },
                    {
                      ok: rooms.every((r) => r.is_confirmed),
                      label: `Quartos confirmados pelo hotel (${rooms.filter((r) => r.is_confirmed).length}/${rooms.length})`,
                    },
                    {
                      ok: rooms.every((r) => !!r.hotel_name),
                      label: "Hotéis informados em todos os quartos",
                    },
                    {
                      ok: rooms.every((r) => !!r.checkin_date),
                      label: "Datas de check-in / check-out preenchidas",
                    },
                  ].map((check, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border",
                        check.ok
                          ? "bg-success/5 text-success border-success/10"
                          : "bg-warning/5 text-warning border-warning/10",
                      )}
                    >
                      {check.ok ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      )}
                      <span>{check.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeDragId ? (
              <div className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-surface border border-brand shadow-md text-xs font-semibold text-foreground cursor-grabbing opacity-90 select-none">
                <Users2 className="h-3.5 w-3.5 text-brand" />
                <span>{activeDragName}</span>
              </div>
            ) : null}
          </DragOverlay>

          {/* Edit Room Modal */}
          {editingRoom && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-xl bg-background p-6 border border-border shadow-lg">
                <h4 className="text-sm font-bold text-foreground mb-4">
                  Editar Quarto {editingRoom.room_number}
                </h4>
                <form onSubmit={(e) => updateRoomMutation.mutate(e)} className="space-y-4">
                  <Field label="Número / Nome *">
                    <input
                      value={editingRoom.room_number}
                      onChange={(e) =>
                        setEditingRoom({ ...editingRoom, room_number: e.target.value })
                      }
                      className="h-9 w-full rounded border border-border bg-surface px-2.5 text-xs text-foreground focus:border-brand focus:outline-none"
                      required
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Tipo *">
                      <select
                        value={editingRoom.room_type}
                        onChange={(e) =>
                          setEditingRoom({ ...editingRoom, room_type: e.target.value })
                        }
                        className="h-9 w-full rounded border border-border bg-surface px-2.5 text-xs text-foreground focus:border-brand focus:outline-none"
                      >
                        {Object.entries(ROOM_TYPE_LABEL).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Hotel/Pousada">
                      <input
                        value={editingRoom.hotel_name || ""}
                        onChange={(e) =>
                          setEditingRoom({ ...editingRoom, hotel_name: e.target.value })
                        }
                        className="h-9 w-full rounded border border-border bg-surface px-2.5 text-xs text-foreground focus:border-brand focus:outline-none"
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Check-in">
                      <input
                        type="date"
                        value={editingRoom.checkin_date || ""}
                        onChange={(e) =>
                          setEditingRoom({ ...editingRoom, checkin_date: e.target.value })
                        }
                        className="h-9 w-full rounded border border-border bg-surface px-2.5 text-xs text-foreground focus:border-brand focus:outline-none"
                      />
                    </Field>
                    <Field label="Check-out">
                      <input
                        type="date"
                        value={editingRoom.checkout_date || ""}
                        onChange={(e) =>
                          setEditingRoom({ ...editingRoom, checkout_date: e.target.value })
                        }
                        className="h-9 w-full rounded border border-border bg-surface px-2.5 text-xs text-foreground focus:border-brand focus:outline-none"
                      />
                    </Field>
                  </div>
                  <Field label="Notas / Obs.">
                    <input
                      value={editingRoom.notes || ""}
                      onChange={(e) => setEditingRoom({ ...editingRoom, notes: e.target.value })}
                      className="h-9 w-full rounded border border-border bg-surface px-2.5 text-xs text-foreground focus:border-brand focus:outline-none"
                      placeholder="Observações..."
                    />
                  </Field>
                  <div className="flex gap-2 justify-end pt-2">
                    <GhostButton
                      type="button"
                      onClick={() => setEditingRoom(null)}
                      className="h-9 text-xs"
                    >
                      Cancelar
                    </GhostButton>
                    <PrimaryButton
                      type="submit"
                      disabled={updateRoomMutation.isPending}
                      className="h-9 text-xs"
                    >
                      Salvar Alterações
                    </PrimaryButton>
                  </div>
                </form>
              </div>
            </div>
          )}
        </DndContext>
      )}
    </div>
  );
}

// ─── Dashboard Main Page ──────────────────────────────────────────────────────
function RoomingListDashboard() {
  const { slug } = Route.useParams();
  const { agency } = useAgency();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Query: Group Tours
  const toursQ = useQuery({
    enabled: !!agency,
    queryKey: ["group-tours-basic", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_tours")
        .select(`
          id, title, slug, departure_date, return_date, destination, rooming_list_status, rooming_list_sent_hotel, rooming_list_sent_bus, agency_id
        `)
        .eq("agency_id", agency!.id)
        .order("departure_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Tour[];
    },
  });

  const filteredTours = useMemo(() => {
    let result = toursQ.data ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) => t.title.toLowerCase().includes(q) || (t.destination ?? "").toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((t) => t.rooming_list_status === statusFilter);
    }
    return result;
  }, [toursQ.data, search, statusFilter]);

  const handlePrint = () => window.print();

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 md:px-6 py-4 shrink-0 print:hidden bg-surface/20">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <BedDouble className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Rooming List Geral</h1>
            <p className="text-xs text-muted-foreground">
              Monitore a alocação de quartos em {filteredTours.length} grupo
              {filteredTours.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <GhostButton
            onClick={handlePrint}
            className="gap-1.5 h-8 text-xs border border-border bg-surface"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimir Dashboard
          </GhostButton>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 md:px-6 py-3 shrink-0 print:hidden bg-surface/50">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            placeholder="Buscar por nome da excursão ou destino..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-xs w-full bg-surface border border-border rounded-md outline-none focus:border-brand"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 text-xs w-[160px] bg-surface border border-border rounded-md px-2 outline-none focus:border-brand"
        >
          <option value="all">Status: Todos</option>
          <option value="open">Aberto</option>
          <option value="closed">Fechado</option>
        </select>

        {(search || statusFilter !== "all") && (
          <button
            className="h-8 text-xs text-muted-foreground hover:text-foreground font-semibold cursor-pointer"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
            }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Content list */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {toursQ.isError && (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center rounded-xl border border-red-200 bg-red-50/60 max-w-2xl mx-auto">
            <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center mb-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
            <h3 className="text-sm font-bold text-red-800">Falha ao Carregar Grupos</h3>
            <p className="text-xs text-red-600 mt-1">
              {toursQ.error instanceof Error ? toursQ.error.message : "Erro desconhecido."}
            </p>
          </div>
        )}

        {toursQ.isLoading && (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            Carregando grupos...
          </div>
        )}

        {!toursQ.isLoading && filteredTours.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <BedDouble className="h-12 w-12 opacity-20" />
            <p className="text-sm font-semibold">Nenhuma excursão encontrada</p>
          </div>
        )}

        {!toursQ.isLoading &&
          filteredTours.map((tour) => <TourPanel key={tour.id} tour={tour} slug={slug} />)}
      </div>
    </div>
  );
}
