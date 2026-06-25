import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { StatusBadge, fmtDate } from "@/components/ui/form";
import {
  Bed,
  Calendar,
  MapPin,
  Phone,
  Star,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  PlusCircle,
} from "lucide-react";
import { toast } from "sonner";
import { logTripAudit } from "@/services/audit";

export const Route = createFileRoute("/agency/$slug/trips/$id/lodging")({
  head: () => ({ meta: [{ title: "Hospedagem · TravelOS" }] }),
  component: TripLodgingPage,
});

function TripLodgingPage() {
  const { id } = useParams({ from: "/agency/$slug/trips/$id/lodging" });
  const { agency } = useAgency();
  const qc = useQueryClient();

  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [hotelName, setHotelName] = useState("");
  const [hotelAddress, setHotelAddress] = useState("");
  const [hotelPhone, setHotelPhone] = useState("");
  const [hotelCheckin, setHotelCheckin] = useState("");
  const [hotelCheckout, setHotelCheckout] = useState("");
  const [roomType, setRoomType] = useState("");
  const [stars, setStars] = useState(5);

  // Fetch boarding cards that have hotel details or represent hotel bookings
  const { data: cards = [], isLoading } = useQuery({
    enabled: !!agency,
    queryKey: ["trip-lodgings", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boarding_cards")
        .select(
          `
          id, agency_id, status, hotel_name, hotel_address, hotel_checkin, hotel_checkout, hotel_phone,
          flight_class, notes, hotel_stars
        `,
        )
        .eq("trip_id", id)
        .not("hotel_name", "is", null);
      if (error) throw error;
      return data ?? [];
    },
  });

  const addLodgingMut = useMutation({
    mutationFn: async () => {
      if (!hotelName) {
        throw new Error("Nome do hotel é obrigatório");
      }
      const { error } = await supabase.from("boarding_cards").insert({
        agency_id: agency!.id,
        trip_id: id,
        status: "pending",
        hotel_name: hotelName,
        hotel_address: hotelAddress || null,
        hotel_phone: hotelPhone || null,
        hotel_checkin: hotelCheckin || null,
        hotel_checkout: hotelCheckout || null,
        notes: roomType || null,
        hotel_stars: stars || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      logTripAudit({
        agencyId: agency!.id,
        tripId: id,
        action: "adicionar_hospedagem",
        details: `Hospedagem adicionada: ${hotelName}`,
      });
      toast.success("Hospedagem adicionada!");
      setShowAddForm(false);
      resetForm();
      qc.invalidateQueries({ queryKey: ["trip-lodgings", id] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Erro ao adicionar hospedagem");
    },
  });

  const updateLodgingMut = useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase
        .from("boarding_cards")
        .update({
          hotel_name: hotelName,
          hotel_address: hotelAddress || null,
          hotel_phone: hotelPhone || null,
          hotel_checkin: hotelCheckin || null,
          hotel_checkout: hotelCheckout || null,
          notes: roomType || null,
          hotel_stars: stars || null,
        })
        .eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      logTripAudit({
        agencyId: agency!.id,
        tripId: id,
        action: "atualizar_hospedagem",
        details: `Hospedagem atualizada: ${hotelName}`,
      });
      toast.success("Hospedagem atualizada!");
      setEditingCardId(null);
      resetForm();
      qc.invalidateQueries({ queryKey: ["trip-lodgings", id] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar");
    },
  });

  const deleteLodgingMut = useMutation({
    mutationFn: async (cardId: string) => {
      // We can either delete the boarding card or set its hotel fields to null.
      // Since this card is specifically for hotel, we can delete it.
      const { error } = await supabase.from("boarding_cards").delete().eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      logTripAudit({
        agencyId: agency!.id,
        tripId: id,
        action: "remover_hospedagem",
        details: `Hospedagem removida.`,
      });
      toast.success("Hospedagem removida.");
      qc.invalidateQueries({ queryKey: ["trip-lodgings", id] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Erro ao remover");
    },
  });

  const resetForm = () => {
    setHotelName("");
    setHotelAddress("");
    setHotelPhone("");
    setHotelCheckin("");
    setHotelCheckout("");
    setRoomType("");
    setStars(5);
  };

  const startEdit = (card: any) => {
    setEditingCardId(card.id);
    setHotelName(card.hotel_name || "");
    setHotelAddress(card.hotel_address || "");
    setHotelPhone(card.hotel_phone || "");
    setHotelCheckin(card.hotel_checkin || "");
    setHotelCheckout(card.hotel_checkout || "");
    setRoomType(card.notes || "");
    setStars(card.hotel_stars || 5);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-border bg-surface p-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Bed className="h-4 w-4 text-brand mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-foreground">Hospedagem & Acomodação</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Gerencie a lista de hotéis, estadias e acomodações confirmadas para esta viagem de
              forma dinâmica.
            </p>
          </div>
        </div>

        {!showAddForm && !editingCardId && (
          <button
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand text-brand-foreground px-3 text-xs font-medium hover:bg-brand/90 transition-colors cursor-pointer shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Adicionar Hospedagem</span>
          </button>
        )}
      </div>

      {isLoading && (
        <div className="text-sm text-muted-foreground animate-pulse py-8 text-center">
          Carregando hospedagens…
        </div>
      )}

      {/* Form de Cadastro / Edição */}
      {(showAddForm || editingCardId) && (
        <div className="rounded-xl border border-border bg-surface p-4 space-y-4 max-w-3xl">
          <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">
            {editingCardId ? "Editar Hospedagem" : "Nova Hospedagem"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Nome do Hotel *
              </label>
              <input
                type="text"
                placeholder="Ex: Copacabana Palace"
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
                className="w-full text-xs border border-border rounded p-2 bg-surface"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Telefone do Hotel
              </label>
              <input
                type="text"
                placeholder="+55 (21) 2548-7070"
                value={hotelPhone}
                onChange={(e) => setHotelPhone(e.target.value)}
                className="w-full text-xs border border-border rounded p-2 bg-surface"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Endereço Completo
              </label>
              <input
                type="text"
                placeholder="Av. Atlântica, 1702 - Copacabana"
                value={hotelAddress}
                onChange={(e) => setHotelAddress(e.target.value)}
                className="w-full text-xs border border-border rounded p-2 bg-surface"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Data de Check-in
              </label>
              <input
                type="date"
                value={hotelCheckin}
                onChange={(e) => setHotelCheckin(e.target.value)}
                className="w-full text-xs border border-border rounded p-2 bg-surface"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Data de Check-out
              </label>
              <input
                type="date"
                value={hotelCheckout}
                onChange={(e) => setHotelCheckout(e.target.value)}
                className="w-full text-xs border border-border rounded p-2 bg-surface"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Acomodação / Notas
              </label>
              <input
                type="text"
                placeholder="Ex: Quarto Duplo Standard Vista Mar, Café incluso"
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="w-full text-xs border border-border rounded p-2 bg-surface"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Classificação (Estrelas)
              </label>
              <select
                value={stars}
                onChange={(e) => setStars(Number(e.target.value))}
                className="w-full text-xs border border-border rounded p-2 bg-surface"
              >
                <option value="1">1 Estrela</option>
                <option value="2">2 Estrelas</option>
                <option value="3">3 Estrelas</option>
                <option value="4">4 Estrelas</option>
                <option value="5">5 Estrelas</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingCardId(null);
                resetForm();
              }}
              className="px-3 py-1.5 border border-border text-xs rounded hover:bg-surface-alt cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (editingCardId) {
                  updateLodgingMut.mutate(editingCardId);
                } else {
                  addLodgingMut.mutate();
                }
              }}
              className="px-3 py-1.5 bg-brand text-brand-foreground text-xs rounded hover:bg-brand/90 cursor-pointer"
            >
              Salvar
            </button>
          </div>
        </div>
      )}

      {/* Lista de Hospedagens */}
      {!isLoading && cards.length === 0 && !showAddForm && (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-2xl text-center max-w-3xl">
          <Bed className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">
            Nenhuma hospedagem vinculada
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Clique em "Adicionar Hospedagem" para registrar o hotel desta viagem.
          </p>
        </div>
      )}

      {!isLoading && cards.length > 0 && (
        <div className="grid grid-cols-1 gap-4 max-w-3xl">
          {cards.map((card) => (
            <div
              key={card.id}
              className="rounded-xl border border-border bg-surface overflow-hidden hover:shadow-sm transition-all"
            >
              <div className="p-4 border-b border-border/60 bg-surface-alt/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-brand/10 text-brand px-2 py-0.5 rounded">
                    Hotel
                  </span>
                  <div className="flex gap-0.5 text-amber-500">
                    {card.hotel_stars && card.hotel_stars > 0
                      ? [...Array(card.hotel_stars)].map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-current" />
                        ))
                      : null}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => startEdit(card)}
                    className="h-7 w-7 inline-flex items-center justify-center border border-border hover:bg-surface-alt rounded transition-colors text-muted-foreground cursor-pointer"
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Deseja realmente excluir esta hospedagem?")) {
                        deleteLodgingMut.mutate(card.id);
                      }
                    }}
                    className="h-7 w-7 inline-flex items-center justify-center border border-rose-100 hover:bg-rose-50 hover:text-rose-600 rounded transition-colors text-muted-foreground cursor-pointer"
                    title="Excluir"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <StatusBadge tone={card.status === "confirmed" ? "success" : "warning"}>
                    {card.status === "confirmed" ? "Confirmada" : "Pendente"}
                  </StatusBadge>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">{card.hotel_name}</h3>
                  {card.hotel_address && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {card.hotel_address}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-b border-border/60 py-4 text-xs">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                      Período da Estadia
                    </span>
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {card.hotel_checkin ? fmtDate(card.hotel_checkin) : "—"} até{" "}
                      {card.hotel_checkout ? fmtDate(card.hotel_checkout) : "—"}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                      Contato Fornecedor
                    </span>
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {card.hotel_phone || "—"}
                    </span>
                  </div>
                </div>

                {card.notes && (
                  <div className="text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                      Acomodação / Notas
                    </span>
                    <p className="font-semibold text-foreground">{card.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
