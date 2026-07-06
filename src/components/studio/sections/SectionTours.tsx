import { useState } from "react";
import { type Proposal, type Tour } from "@/services/proposals";
import {
  Accordion,
  Card,
  AddBtn,
  L,
  Inp,
  SMALL_INPUT,
} from "@/components/proposals/ProposalFormFields";
import { replaceAt } from "@/components/proposals/ProposalFormFields";
import { useAgency } from "@/lib/agency-context";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";
import { PrimaryButton } from "@/components/ui/form";
import { toast } from "sonner";

interface Props {
  draft: Proposal;
  save: (patch: Partial<Proposal>) => void;
}

const BLANK: Tour = {
  id: "",
  description: "",
  date: "",
  price: 0,
  image_url: "",
  notes: "",
};

export function SectionTours({ draft, save }: Props) {
  const { agency } = useAgency();
  const tours = draft.tours ?? [];

  // Local state for promotions search
  const [promoOpen, setPromoOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [promotions, setPromotions] = useState<any[]>([]);

  async function handleSearchPromotions() {
    if (!agency) return;
    setLoading(true);
    try {
      let q = supabase
        .from("group_tours")
        .select(
          "id, title, destination, departure_date, return_date, base_price, cover_image_url, status",
        )
        .eq("agency_id", agency.id)
        .in("status", ["draft", "open", "confirmed"]);

      if (searchTerm.trim()) {
        q = q.ilike("title", `%${searchTerm.trim()}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      setPromotions(data || []);
      if ((data || []).length === 0) {
        toast.info("Nenhuma promoção ou excursão localizada.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao consultar promoções.");
    } finally {
      setLoading(false);
    }
  }

  function importPromotion(promo: any) {
    save({
      tours: [
        ...tours,
        {
          id: crypto.randomUUID(),
          description: `${promo.title} (Promoção/Grupo)`,
          date: promo.departure_date || "",
          price: Number(promo.base_price) || 0,
          image_url: promo.cover_image_url || "",
          notes: `Destino: ${promo.destination || "Vários"} | Retorno: ${promo.return_date || "N/A"}`,
        },
      ],
    });
    setPromoOpen(false);
    toast.success(`Promoção "${promo.title}" adicionada com sucesso!`);
  }

  function add() {
    save({ tours: [...tours, { ...BLANK, id: crypto.randomUUID() }] });
  }

  function upd(i: number, patch: Partial<Tour>) {
    save({ tours: replaceAt(tours, i, { ...tours[i], ...patch }) });
  }

  function remove(i: number) {
    save({ tours: tours.filter((_, x) => x !== i) });
  }

  return (
    <Accordion title={`Passeios (${tours.length})`}>
      {tours.map((t, i) => (
        <Card key={t.id || i} onRemove={() => remove(i)}>
          <div className="mb-2">
            <L label="Descrição">
              <Inp
                value={t.description}
                onChange={(v) => upd(i, { description: v })}
                ph="ex. City Tour Roma"
              />
            </L>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <L label="Data">
              <Inp value={t.date} onChange={(v) => upd(i, { date: v })} type="date" ph="" />
            </L>
            <L label="Preço (R$)">
              <Inp
                value={String(t.price || "")}
                onChange={(v) => upd(i, { price: parseFloat(v) || 0 })}
                ph="0.00"
                type="number"
              />
            </L>
          </div>
          <L label="Observações">
            <Inp
              value={t.notes}
              onChange={(v) => upd(i, { notes: v })}
              ph="Ponto de encontro, duração..."
            />
          </L>
        </Card>
      ))}
      <div className="flex gap-2">
        <AddBtn onClick={add}>Adicionar passeio</AddBtn>
        <button
          type="button"
          onClick={() => {
            setPromoOpen(true);
            // Auto search on open
            setTimeout(() => handleSearchPromotions(), 50);
          }}
          className="flex-1 inline-flex items-center justify-center gap-1.5 h-[34px] rounded border border-border bg-surface text-xs font-semibold text-muted-foreground hover:bg-surface-alt hover:text-foreground transition-all cursor-pointer"
        >
          <Search className="h-3.5 w-3.5" /> Importar Promoção
        </button>
      </div>

      {promoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4">
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-surface p-5 flex flex-col max-h-[85vh] overflow-hidden shadow-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="ds-h3 text-foreground flex items-center gap-2">
                <Search className="h-4 w-4 text-brand" /> Buscar Promoção / Excursão
              </h3>
              <button
                type="button"
                onClick={() => setPromoOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar pr-1">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <L label="Filtro de Busca">
                    <input
                      className={SMALL_INPUT}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Ex: Nordeste, Europa, Itália..."
                      onKeyDown={(e) => e.key === "Enter" && handleSearchPromotions()}
                    />
                  </L>
                </div>
                <PrimaryButton
                  type="button"
                  disabled={loading}
                  onClick={handleSearchPromotions}
                  className="h-8"
                >
                  Filtrar
                </PrimaryButton>
              </div>

              <div className="space-y-2 pt-2">
                {promotions.length === 0 && !loading && (
                  <p className="text-center text-xs text-muted-foreground py-4 font-sans">
                    Nenhuma promoção ou excursão ativa cadastrada para sua agência.
                  </p>
                )}
                {promotions.map((promo) => (
                  <div
                    key={promo.id}
                    className="flex gap-3 p-3 rounded border border-border hover:border-brand/40 bg-surface-alt/25 transition-all group text-left"
                  >
                    {promo.cover_image_url && (
                      <img
                        src={promo.cover_image_url}
                        alt={promo.title}
                        className="w-16 h-16 object-cover rounded border border-border shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-foreground truncate group-hover:text-brand transition-colors">
                          {promo.title}
                        </h4>
                        <p className="text-[10px] text-muted-foreground font-sans truncate">
                          {promo.destination || "Vários destinos"}
                        </p>
                        {promo.departure_date && (
                          <p className="text-[9px] text-muted-foreground/80 font-sans mt-0.5">
                            Partida: {new Date(promo.departure_date).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-border/10">
                        <span className="text-xs font-bold text-foreground font-mono">
                          {Number(promo.base_price).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={() => importPromotion(promo)}
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
