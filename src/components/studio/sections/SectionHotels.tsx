import { type Proposal, type Hotel, type HotelRoom } from "@/services/proposals";
import {
  Accordion,
  Card,
  AddBtn,
  L,
  Inp,
  SMALL_INPUT,
  FileUploadList,
} from "@/components/proposals/ProposalFormFields";
import { replaceAt } from "@/components/proposals/ProposalFormFields";
import { useAgency } from "@/lib/agency-context";
import { Trash2, Plus, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { StudioUnsplashPicker } from "@/components/studio/StudioUnsplashPicker";
import { infotravelSearchHotels } from "@/services/infotravel";
import { toast } from "sonner";
import { PrimaryButton } from "@/components/ui/form";
import { SupplierAutocomplete, type SupplierOption } from "@/components/suppliers/SupplierAutocomplete";

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

  // Infotravel States
  const [infotravelOpen, setInfotravelOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchParams, setSearchParams] = useState({
    city: draft.destination || "",
    checkin: draft.travel_start || "",
    checkout: draft.travel_end || "",
    rooms: 1,
  });
  const [results, setResults] = useState<Hotel[]>([]);

  useEffect(() => {
    setSearchParams({
      city: draft.destination || "",
      checkin: draft.travel_start || "",
      checkout: draft.travel_end || "",
      rooms: 1,
    });
  }, [draft.destination, draft.travel_start, draft.travel_end]);

  async function handleSearch() {
    if (!agency) return;
    setSearching(true);
    try {
      const data = await infotravelSearchHotels(agency.id, searchParams);
      setResults(data);
      if (data.length === 0) {
        toast.info("Nenhum hotel disponível para esta busca.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao consultar Infotravel.");
    } finally {
      setSearching(false);
    }
  }

  function importHotel(h: Hotel) {
    const markup = (agency as any)?.integrations_config?.infotravel_markup || 0;
    const finalPrice = Math.round(h.price * (1 + markup / 100));

    save({
      hotels: [
        ...hotels,
        {
          ...h,
          id: crypto.randomUUID(),
          price: finalPrice,
        },
      ],
    });
    setInfotravelOpen(false);
    toast.success(`${h.name} importado com sucesso!`);
  }

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
            <div className="mb-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Buscar Hotel no Catálogo da Agência
              </span>
              <SupplierAutocomplete
                agencyId={agency?.id ?? ""}
                value={null}
                onChange={(s: SupplierOption | null) => {
                  if (!s) return;
                  upd(i, {
                    name: s.name,
                    city: s.city ?? h.city,
                  });
                }}
                filterKind="hotel"
                placeholder="Buscar hotel cadastrado..."
              />
            </div>
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
            onChange={(imgs: string[]) => upd(i, { images: imgs })}
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
      <div className="flex gap-2">
        <AddBtn onClick={add}>Adicionar hotel</AddBtn>
        <button
          type="button"
          onClick={() => setInfotravelOpen(true)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 h-[34px] rounded border border-border bg-surface text-xs font-semibold text-muted-foreground hover:bg-surface-alt hover:text-foreground transition-all cursor-pointer"
        >
          <Search className="h-3.5 w-3.5" /> Buscar no Infotravel
        </button>
      </div>

      {infotravelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4">
          <div
            className="w-full max-w-lg rounded-lg border border-border bg-surface p-5 flex flex-col max-h-[85vh] overflow-hidden shadow-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="ds-h3 text-foreground flex items-center gap-2">
                <Search className="h-4 w-4 text-brand" /> Buscar Hotel no Infotravel
              </h3>
              <button
                type="button"
                onClick={() => setInfotravelOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar pr-1">
              <div className="grid grid-cols-2 gap-2">
                <L label="Cidade de Destino">
                  <input
                    className={SMALL_INPUT}
                    value={searchParams.city}
                    onChange={(e) => setSearchParams({ ...searchParams, city: e.target.value })}
                    placeholder="Ex: Orlando"
                  />
                </L>
                <L label="Quartos">
                  <input
                    type="number"
                    min={1}
                    className={SMALL_INPUT}
                    value={searchParams.rooms}
                    onChange={(e) =>
                      setSearchParams({ ...searchParams, rooms: parseInt(e.target.value) || 1 })
                    }
                  />
                </L>
                <L label="Check-in">
                  <input
                    type="date"
                    className={SMALL_INPUT}
                    value={searchParams.checkin}
                    onChange={(e) => setSearchParams({ ...searchParams, checkin: e.target.value })}
                  />
                </L>
                <L label="Check-out">
                  <input
                    type="date"
                    className={SMALL_INPUT}
                    value={searchParams.checkout}
                    onChange={(e) => setSearchParams({ ...searchParams, checkout: e.target.value })}
                  />
                </L>
              </div>

              <PrimaryButton
                type="button"
                className="w-full"
                disabled={
                  searching || !searchParams.city || !searchParams.checkin || !searchParams.checkout
                }
                onClick={handleSearch}
              >
                {searching ? "Buscando tarifas..." : "Pesquisar Tarifas"}
              </PrimaryButton>

              <div className="space-y-2 pt-2">
                {results.length === 0 && !searching && (
                  <p className="text-center text-xs text-muted-foreground py-4 font-sans">
                    Insira os filtros acima para buscar disponibilidade.
                  </p>
                )}
                {results.map((hotel) => (
                  <div
                    key={hotel.id}
                    className="flex gap-3 p-3 rounded border border-border hover:border-brand/40 bg-surface-alt/25 transition-all group text-left"
                  >
                    {hotel.images?.[0] && (
                      <img
                        src={hotel.images[0]}
                        alt={hotel.name}
                        className="w-20 h-20 object-cover rounded border border-border shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-foreground truncate group-hover:text-brand transition-colors">
                          {hotel.name}
                        </h4>
                        <p className="text-[10px] text-muted-foreground font-sans truncate">
                          {hotel.meal_plan} • {hotel.rooms?.[0]?.type}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs font-bold text-foreground font-mono">
                          {hotel.price.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={() => importHotel(hotel)}
                          className="px-2.5 py-1 text-[10px] bg-primary text-primary-foreground font-semibold rounded hover:bg-primary/95 transition-all cursor-pointer"
                        >
                          Selecionar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Accordion>
  );
}
