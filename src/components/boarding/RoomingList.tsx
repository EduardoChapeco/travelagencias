import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BedDouble, Plus, Trash2, Check, X, Users, Hotel } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type RoomPassenger = {
  name: string;
  document?: string;
  meal_plan?: string;
};

type RoomEntry = {
  id: string;
  room_number: string;
  room_type: string;
  hotel_name: string | null;
  checkin_date: string | null;
  checkout_date: string | null;
  passengers: RoomPassenger[];
  notes: string | null;
  is_confirmed: boolean;
  order_index: number;
};

const ROOM_TYPE_LABELS: Record<string, string> = {
  single: "Single",
  double: "Duplo",
  triple: "Triplo",
  quad: "Quádruplo",
  suite: "Suíte",
};

const ROOM_TYPE_COLORS: Record<string, string> = {
  single: "bg-slate-100 text-slate-700",
  double: "bg-blue-100 text-blue-700",
  triple: "bg-purple-100 text-purple-700",
  quad: "bg-orange-100 text-orange-700",
  suite: "bg-amber-100 text-amber-700",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function RoomingList({
  cardId,
  agencyId,
  defaultHotel = "",
}: {
  cardId: string;
  agencyId: string;
  defaultHotel?: string;
}) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [roomNumber, setRoomNumber] = useState("");
  const [roomType, setRoomType] = useState("double");
  const [hotelName, setHotelName] = useState(defaultHotel);
  const [checkinDate, setCheckinDate] = useState("");
  const [checkoutDate, setCheckoutDate] = useState("");
  const [notes, setNotes] = useState("");
  const [passengers, setPassengers] = useState<RoomPassenger[]>([
    { name: "", document: "", meal_plan: "BB" },
  ]);

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ["rooming_list", cardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boarding_rooming_list")
        .select("*")
        .eq("card_id", cardId)
        .order("order_index");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        passengers: (r.passengers as RoomPassenger[]) ?? [],
      })) as RoomEntry[];
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("boarding_rooming_list").insert({
        card_id: cardId,
        agency_id: agencyId,
        room_number: roomNumber,
        room_type: roomType,
        hotel_name: hotelName || null,
        checkin_date: checkinDate || null,
        checkout_date: checkoutDate || null,
        notes: notes || null,
        passengers: passengers.filter((p) => p.name.trim()),
        order_index: rooms.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Quarto adicionado!");
      resetForm();
      qc.invalidateQueries({ queryKey: ["rooming_list", cardId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("boarding_rooming_list")
        .update({
          room_number: roomNumber,
          room_type: roomType,
          hotel_name: hotelName || null,
          checkin_date: checkinDate || null,
          checkout_date: checkoutDate || null,
          notes: notes || null,
          passengers: passengers.filter((p) => p.name.trim()),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Quarto atualizado!");
      resetForm();
      qc.invalidateQueries({ queryKey: ["rooming_list", cardId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const confirmMut = useMutation({
    mutationFn: async ({ id, confirmed }: { id: string; confirmed: boolean }) => {
      const { error } = await supabase
        .from("boarding_rooming_list")
        .update({ is_confirmed: confirmed })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rooming_list", cardId] }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("boarding_rooming_list").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Quarto removido.");
      qc.invalidateQueries({ queryKey: ["rooming_list", cardId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  function resetForm() {
    setRoomNumber("");
    setRoomType("double");
    setHotelName(defaultHotel);
    setCheckinDate("");
    setCheckoutDate("");
    setNotes("");
    setPassengers([{ name: "", document: "", meal_plan: "BB" }]);
    setShowForm(false);
    setEditingId(null);
  }

  function handleEdit(room: RoomEntry) {
    setEditingId(room.id);
    setRoomNumber(room.room_number);
    setRoomType(room.room_type);
    setHotelName(room.hotel_name ?? "");
    setCheckinDate(room.checkin_date ?? "");
    setCheckoutDate(room.checkout_date ?? "");
    setNotes(room.notes ?? "");
    setPassengers(
      room.passengers.length > 0 ? room.passengers : [{ name: "", document: "", meal_plan: "BB" }],
    );
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!roomNumber.trim()) {
      toast.error("Informe o número do quarto.");
      return;
    }
    if (editingId) {
      updateMut.mutate(editingId);
    } else {
      createMut.mutate();
    }
  }

  const totalPax = rooms.reduce((acc, r) => acc + r.passengers.length, 0);
  const confirmedCount = rooms.filter((r) => r.is_confirmed).length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BedDouble className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Rooming List</span>
          {rooms.length > 0 && (
            <span className="text-[10px] bg-surface-alt border border-border rounded-full px-1.5 py-0.5 font-mono text-muted-foreground">
              {confirmedCount}/{rooms.length} quartos · {totalPax} pax
            </span>
          )}
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
          >
            <Plus className="h-3 w-3" /> Quarto
          </button>
        )}
      </div>

      {/* Room Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-[24px] border border-border bg-surface p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              {editingId ? "Editar Quarto" : "Novo Quarto"}
            </span>
            <button
              type="button"
              onClick={resetForm}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Nº Quarto
              </label>
              <input
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="101"
                className="mt-0.5 h-7 w-full rounded border border-border bg-surface-alt px-2 text-xs outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Tipo
              </label>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="mt-0.5 h-7 w-full rounded border border-border bg-surface-alt px-2 text-xs outline-none focus:border-brand"
              >
                {Object.entries(ROOM_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Hotel
              </label>
              <input
                type="text"
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
                className="mt-0.5 h-7 w-full rounded border border-border bg-surface-alt px-2 text-xs outline-none focus:border-brand"
              />
            </div>
            <div className="grid grid-cols-2 gap-1">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Check-in
                </label>
                <input
                  type="date"
                  value={checkinDate}
                  onChange={(e) => setCheckinDate(e.target.value)}
                  className="mt-0.5 h-7 w-full rounded border border-border bg-surface-alt px-2 text-xs outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Check-out
                </label>
                <input
                  type="date"
                  value={checkoutDate}
                  onChange={(e) => setCheckoutDate(e.target.value)}
                  className="mt-0.5 h-7 w-full rounded border border-border bg-surface-alt px-2 text-xs outline-none focus:border-brand"
                />
              </div>
            </div>
          </div>

          {/* Passengers */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Users className="h-3 w-3" /> Passageiros no Quarto
              </label>
              <button
                type="button"
                onClick={() =>
                  setPassengers([...passengers, { name: "", document: "", meal_plan: "BB" }])
                }
                className="text-[10px] text-brand hover:underline"
              >
                + Passageiro
              </button>
            </div>
            <div className="space-y-1">
              {passengers.map((p, i) => (
                <div key={i} className="flex gap-1 items-center">
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) => {
                      const arr = [...passengers];
                      arr[i] = { ...p, name: e.target.value };
                      setPassengers(arr);
                    }}
                    placeholder="Nome completo"
                    className="flex-1 h-7 rounded border border-border bg-surface-alt px-2 text-xs outline-none focus:border-brand"
                  />
                  <input
                    type="text"
                    value={p.document ?? ""}
                    onChange={(e) => {
                      const arr = [...passengers];
                      arr[i] = { ...p, document: e.target.value };
                      setPassengers(arr);
                    }}
                    placeholder="Doc"
                    className="w-20 h-7 rounded border border-border bg-surface-alt px-2 text-xs outline-none focus:border-brand"
                  />
                  <select
                    value={p.meal_plan ?? "BB"}
                    onChange={(e) => {
                      const arr = [...passengers];
                      arr[i] = { ...p, meal_plan: e.target.value };
                      setPassengers(arr);
                    }}
                    className="w-14 h-7 rounded border border-border bg-surface-alt px-1 text-xs outline-none focus:border-brand"
                    title="Regime de refeição"
                  >
                    <option value="BB">BB</option>
                    <option value="HB">HB</option>
                    <option value="FB">FB</option>
                    <option value="AI">AI</option>
                    <option value="RO">RO</option>
                  </select>
                  {passengers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setPassengers(passengers.filter((_, x) => x !== i))}
                      className="text-danger hover:opacity-70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Observações
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-0.5 w-full rounded border border-border bg-surface-alt px-2 py-1.5 text-xs outline-none focus:border-brand resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={resetForm}
              className="h-7 px-3 text-xs rounded border border-border hover:bg-surface-alt transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMut.isPending || updateMut.isPending}
              className="h-7 px-3 text-xs rounded bg-brand text-white font-semibold disabled:opacity-60 hover:bg-brand/90 transition-colors"
            >
              {editingId ? "Salvar" : "Adicionar Quarto"}
            </button>
          </div>
        </form>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-4 text-muted-foreground text-xs gap-2">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          Carregando quartos...
        </div>
      )}

      {/* Room list */}
      {!isLoading && rooms.length === 0 && !showForm && (
        <div className="text-center py-6 border border-dashed border-border rounded-2xl text-xs text-muted-foreground">
          Nenhum quarto cadastrado. Clique em "+ Quarto" para começar.
        </div>
      )}

      {rooms.length > 0 && (
        <div className="space-y-2">
          {rooms.map((room) => (
            <div
              key={room.id}
              className={`border rounded-2xl p-3 transition-all ${
                room.is_confirmed
                  ? "border-success/40 bg-success-bg/20"
                  : "border-border bg-surface"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BedDouble className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-bold text-foreground">
                    Quarto {room.room_number}
                  </span>
                  <span
                    className={`text-[10px] rounded px-1.5 py-0.5 font-semibold ${
                      ROOM_TYPE_COLORS[room.room_type] ?? "bg-surface-alt text-muted-foreground"
                    }`}
                  >
                    {ROOM_TYPE_LABELS[room.room_type] ?? room.room_type}
                  </span>
                  {room.is_confirmed && (
                    <span className="text-[10px] text-success font-semibold flex items-center gap-0.5">
                      <Check className="h-3 w-3" /> Confirmado
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      confirmMut.mutate({ id: room.id, confirmed: !room.is_confirmed })
                    }
                    className={`text-[10px] font-semibold px-2 py-1 rounded border transition-colors ${
                      room.is_confirmed
                        ? "border-border text-muted-foreground hover:border-border-strong"
                        : "border-success/40 text-success hover:bg-success-bg/20"
                    }`}
                  >
                    {room.is_confirmed ? "Desconfirmar" : "Confirmar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEdit(room)}
                    className="p-1 rounded border border-border hover:bg-surface-alt text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Hotel className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Remover quarto ${room.room_number}?`)) {
                        deleteMut.mutate(room.id);
                      }
                    }}
                    className="p-1 rounded border border-border hover:bg-surface-alt text-muted-foreground hover:text-danger transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {room.hotel_name && (
                <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Hotel className="h-2.5 w-2.5" /> {room.hotel_name}
                  {room.checkin_date && ` · ${room.checkin_date} → ${room.checkout_date ?? "?"}`}
                </p>
              )}

              {room.passengers.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {room.passengers.map((p, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-[10px] bg-surface-alt border border-border rounded px-1.5 py-0.5"
                    >
                      <Users className="h-2.5 w-2.5 text-muted-foreground" />
                      {p.name}
                      {p.meal_plan && (
                        <span className="text-muted-foreground font-mono">·{p.meal_plan}</span>
                      )}
                    </span>
                  ))}
                </div>
              )}

              {room.notes && (
                <p className="mt-1.5 text-[10px] text-muted-foreground italic">{room.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
