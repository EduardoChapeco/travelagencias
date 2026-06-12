import { type Proposal, type Hotel, type HotelRoom } from "@/services/proposals";
import {
  Accordion,
  Card,
  AddBtn,
  L,
  Inp,
  SMALL_INPUT,
} from "@/components/proposals/ProposalFormFields";
import { replaceAt } from "@/components/proposals/ProposalFormFields";
import { FileUploadList } from "@/components/proposals/ProposalFormFields";
import { useAgency } from "@/lib/agency-context";
import { Trash2, Plus, Search } from "lucide-react";
import { useState } from "react";
import { StudioUnsplashPicker } from "@/components/studio/StudioUnsplashPicker";

interface Props {
  draft: Proposal;
  save: (patch: Partial<Proposal>) => void;
}

const BLANK: Hotel = {
  id: "",
  name: "",
  city: "",
  checkin: "",
  checkout: "",
  meal_plan: "Somente Hospedagem",
  rooms: [{ type: "Duplo Standard", qty: 1 }],
  images: [],
  price: 0,
};

const MEAL_PLANS = [
  "Somente Hospedagem",
  "Café da Manhã",
  "Meia Pensão",
  "Pensão Completa",
  "All Inclusive",
];

export function SectionHotels({ draft, save }: Props) {
  const { agency } = useAgency();
  const hotels = draft.hotels ?? [];
  const [unsplashOpenIndex, setUnsplashOpenIndex] = useState<number | null>(null);

  function add() {
    save({
      hotels: [
        ...hotels,
        { ...BLANK, id: crypto.randomUUID(), rooms: [{ type: "Duplo Standard", qty: 1 }] },
      ],
    });
  }

  function upd(i: number, patch: Partial<Hotel>) {
    save({ hotels: replaceAt(hotels, i, { ...hotels[i], ...patch }) });
  }

  function remove(i: number) {
    save({ hotels: hotels.filter((_, x) => x !== i) });
  }

  function addRoom(i: number) {
    const rooms = [...(hotels[i].rooms ?? []), { type: "Standard", qty: 1 }];
    upd(i, { rooms });
  }

  function updRoom(hotelIdx: number, roomIdx: number, patch: Partial<HotelRoom>) {
    const rooms = [...(hotels[hotelIdx].rooms ?? [])];
    rooms[roomIdx] = { ...rooms[roomIdx], ...patch };
    upd(hotelIdx, { rooms });
  }

  function removeRoom(hotelIdx: number, roomIdx: number) {
    const rooms = (hotels[hotelIdx].rooms ?? []).filter((_, x) => x !== roomIdx);
    upd(hotelIdx, { rooms });
  }

  return (
    <Accordion title={`Hotéis (${hotels.length})`}>
      {hotels.map((h, i) => (
        <Card key={h.id || i} onRemove={() => remove(i)}>
          <div className="grid grid-cols-1 gap-2 mb-2">
            <L label="Nome do hotel">
              <Inp value={h.name} onChange={(v) => upd(i, { name: v })} ph="ex. Grand Hyatt" />
            </L>
            <L label="Cidade">
              <Inp value={h.city} onChange={(v) => upd(i, { city: v })} ph="ex. Nova York" />
            </L>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <L label="Check-in">
              <Inp value={h.checkin} onChange={(v) => upd(i, { checkin: v })} type="date" ph="" />
            </L>
            <L label="Check-out">
              <Inp value={h.checkout} onChange={(v) => upd(i, { checkout: v })} type="date" ph="" />
            </L>
          </div>
          <L label="Regime">
            <select
              className={SMALL_INPUT + " mb-2"}
              value={h.meal_plan}
              onChange={(e) => upd(i, { meal_plan: e.target.value })}
            >
              {MEAL_PLANS.map((mp) => (
                <option key={mp} value={mp}>
                  {mp}
                </option>
              ))}
            </select>
          </L>

          {/* Rooms */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                Quartos
              </span>
              <button
                type="button"
                onClick={() => addRoom(i)}
                className="flex items-center gap-1 text-[10px] text-brand hover:underline"
              >
                <Plus className="h-3 w-3" /> Adicionar
              </button>
            </div>
            {(h.rooms ?? []).map((r, ri) => (
              <div key={ri} className="flex items-center gap-2 mb-1">
                <input
                  className={SMALL_INPUT + " flex-1"}
                  value={r.type}
                  placeholder="Tipo do quarto"
                  onChange={(e) => updRoom(i, ri, { type: e.target.value })}
                />
                <input
                  type="number"
                  min={1}
                  className={SMALL_INPUT + " w-14"}
                  value={r.qty}
                  onChange={(e) => updRoom(i, ri, { qty: parseInt(e.target.value) || 1 })}
                />
                <button
                  type="button"
                  onClick={() => removeRoom(i, ri)}
                  className="rounded p-1 text-muted-foreground hover:text-danger transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Image uploads */}
          <FileUploadList
            agencyId={agency?.id ?? ""}
            images={h.images ?? []}
            onChange={(imgs) => upd(i, { images: imgs })}
          />

          {/* Unsplash picker */}
          <div className="mt-2">
            {unsplashOpenIndex === i ? (
              <div className="rounded-lg border border-border bg-surface p-3 mt-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wide font-semibold">
                    Buscar imagem
                  </span>
                  <button
                    type="button"
                    onClick={() => setUnsplashOpenIndex(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Fechar
                  </button>
                </div>
                <StudioUnsplashPicker
                  agencyId={agency?.id ?? ""}
                  proposalId={draft.id}
                  slot="hotel"
                  itemId={h.id || String(i)}
                  defaultQuery={h.name || h.city || "hotel"}
                  onImageSelected={(url) => {
                    upd(i, { images: [...(h.images ?? []), url] });
                    setUnsplashOpenIndex(null);
                  }}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setUnsplashOpenIndex(i)}
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-[10px] text-muted-foreground hover:bg-surface-alt transition-colors mt-1"
              >
                <Search className="h-3 w-3" /> Buscar foto do hotel no Unsplash
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 mt-2 pt-2 border-t border-border/30">
            <L label="Valor da Hospedagem (Soma no total)">
              <Inp
                value={h.price?.toString() || ""}
                onChange={(v) => upd(i, { price: parseFloat(v) || 0 })}
                type="number"
                ph="0.00"
              />
            </L>
          </div>
        </Card>
      ))}
      <AddBtn onClick={add}>Adicionar hotel</AddBtn>
    </Accordion>
  );
}
