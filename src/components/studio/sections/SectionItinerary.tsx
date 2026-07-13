import { useState } from "react";
import { type Proposal, type ItineraryDay } from "@/services/proposals";
import { Accordion, Card, AddBtn, L, Inp } from "@/components/proposals/ProposalFormFields";
import { replaceAt, SMALL_INPUT } from "@/components/proposals/ProposalFormFields";
import { supabase } from "@/integrations/supabase/client";
import { StudioUnsplashPicker } from "@/components/studio/StudioUnsplashPicker";

import { Sparkles, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { refineItineraryText } from "@/services/proposals";
import { Button } from "@/components/ui/button";
import { FormInput as Input } from "@/components/ui/input";
import { NativeSelect as Select } from "@/components/ui/select";
import { FormTextarea as Textarea } from "@/components/ui/textarea";

interface Props {
  draft: Proposal;
  save: (patch: Partial<Proposal>) => void;
}

const BLANK: ItineraryDay = { id: "", day: "", title: "", description: "" };

export function SectionItinerary({ draft, save }: Props) {
  const itinerary = draft.itinerary ?? [];
  const [refining, setRefining] = useState<number | null>(null);
  const [uploadingImage, setUploadingImage] = useState<number | null>(null);
  const [showUnsplash, setShowUnsplash] = useState<number | null>(null);

  async function handleImageUpload(i: number, file: File) {
    try {
      setUploadingImage(i);
      const uidVal = crypto.randomUUID();
      const fileExt = file.name.split(".").pop();
      const path = `${draft.agency_id}/studio/${draft.id}/itinerary-${i}-${uidVal}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from("agency-media").upload(path, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("agency-media").getPublicUrl(path);
      const publicUrl = data.publicUrl;

      const day = itinerary[i];
      const newImages = [...(day.images || []), publicUrl];
      upd(i, { images: newImages });
      toast.success("Imagem enviada com sucesso!");
    } catch (error: any) {
      toast.error(`Erro no upload: ${error.message}`);
    } finally {
      setUploadingImage(null);
    }
  }

  function add() {
    const dayNum = itinerary.length + 1;
    save({
      itinerary: [
        ...itinerary,
        { ...BLANK, id: crypto.randomUUID(), day: `Dia ${dayNum}`, title: "", description: "" },
      ],
    });
  }

  function upd(i: number, patch: Partial<ItineraryDay>) {
    save({ itinerary: replaceAt(itinerary, i, { ...itinerary[i], ...patch }) });
  }

  function remove(i: number) {
    save({ itinerary: itinerary.filter((_, x) => x !== i) });
  }

  async function refineWithAI(i: number) {
    const day = itinerary[i];
    if (!day.title && !day.description) {
      toast.error("Preencha título e descrição antes de refinar com IA.");
      return;
    }
    try {
      setRefining(i);
      const result = await refineItineraryText(day.title, day.description);
      upd(i, result);
      toast.success("Texto refinado com IA!");
    } catch (err) {
      toast.error("Erro ao refinar com IA");
    } finally {
      setRefining(null);
    }
  }

  return (
    <Accordion title={`Roteiro (${itinerary.length} dias)`}>
      {itinerary.map((d, i) => (
        <Card key={d.id || i} onRemove={() => remove(i)}>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <L label="Label">
              <Inp value={d.day} onChange={(v) => upd(i, { day: v })} ph={`Dia ${i + 1}`} />
            </L>
            <div className="col-span-2">
              <L label="Título">
                <Inp value={d.title} onChange={(v) => upd(i, { title: v })} ph="Chegada em Paris" />
              </L>
            </div>
          </div>
          <L label="Descrição">
            <Textarea
              className={SMALL_INPUT + " h-20 resize-none leading-relaxed"} value={d.description}
              placeholder="Descreva as atividades deste dia..."
              onChange={(e) => upd(i, { description: e.target.value })}
            />
          </L>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <L label="Cidade">
              <Inp value={d.city ?? ""} onChange={(v) => upd(i, { city: v })} ph="Ex: Paris" />
            </L>
            <L label="Pernoite (Hotel)">
              <Inp value={d.overnight ?? ""} onChange={(v) => upd(i, { overnight: v })} ph="Ex: Hotel Plaza" />
            </L>
            <L label="Refeições">
              <Inp 
                value={(d.meals ?? []).join(", ")} 
                onChange={(v) => upd(i, { meals: v.split(",").map(m => m.trim()).filter(Boolean) })} 
                ph="Ex: Café, Almoço" 
              />
            </L>
          </div>
          <div className="mt-2">
            <L label="Layout das Imagens">
              <Select
                className={SMALL_INPUT} value={d.imageLayout || "auto"}
                onChange={(e) => upd(i, { imageLayout: e.target.value })}
              >
                <option value="auto">Automático (Baseado na qtde)</option>
                <option value="none">Nenhuma Imagem</option>
                <option value="single">Destaque Único</option>
                <option value="stack">Mosaico (2 a 3)</option>
              </Select>
            </L>
          </div>
          <div className="mt-2 space-y-2 border-t border-border/50 pt-3">
            <div className="flex items-center justify-between">
              <span className="block ds-meta uppercase tracking-wide text-muted-foreground">Galeria do Dia</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => setShowUnsplash(showUnsplash === i ? null : i)}
                  className="flex h-6 items-center justify-center rounded border border-border/60 bg-surface px-2 ds-meta hover:bg-surface-alt transition-colors"
                  title="Buscar no Unsplash"
                >
                  <Search className="h-3 w-3 mr-1" /> Buscar
                </Button>
                <label className="flex h-6 cursor-pointer items-center justify-center rounded bg-brand/10 px-2 ds-meta font-bold text-brand hover:bg-brand/20 transition-colors">
                  {uploadingImage === i ? "Enviando..." : "+ Fazer Upload"}
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(i, file);
                    }}
                    disabled={uploadingImage === i}
                  />
                </label>
              </div>
            </div>
            
            {showUnsplash === i && (
              <div className="rounded-2xl border border-border bg-surface p-3 mb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="ds-meta uppercase tracking-wide font-semibold">
                    Buscar imagem para o dia
                  </span>
                  <Button
                    onClick={() => setShowUnsplash(null)}
                    className="text-muted-foreground hover:text-foreground ds-meta"
                  >
                    Fechar
                  </Button>
                </div>
                <StudioUnsplashPicker
                  agencyId={draft.agency_id}
                  proposalId={draft.id}
                  slot={`itinerary-${i}`}
                  defaultQuery={d.city || draft.destination || "travel destination"}
                  onImageSelected={(url) => {
                    const newImages = [...(d.images || []), url];
                    upd(i, { images: newImages });
                    setShowUnsplash(null);
                  }}
                />
              </div>
            )}

            {d.images && d.images.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {d.images.map((url, imgIdx) => (
                  <div key={imgIdx} className="relative h-12 w-12 overflow-hidden rounded border border-border">
                    <img src={url} alt={`Dia ${i + 1}`} className="h-full w-full object-cover" />
                    <Button
                      type="button"
                      onClick={() => {
                        const newArr = [...d.images!];
                        newArr.splice(imgIdx, 1);
                        upd(i, { images: newArr });
                      }}
                      className="absolute right-0 top-0 rounded bg-red-500/80 px-1 py-0.5 text-[8px] text-white hover:bg-red-500"
                    >
                      X
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ds-meta text-muted-foreground/60 italic">Nenhuma imagem. As URLs também podem ser coladas abaixo.</div>
            )}
            <Textarea
              className={SMALL_INPUT + " resize-none py-1.5 text-xs"} value={(d.images ?? []).join(",\n")}
              placeholder="Ou cole URLs de imagens aqui (separadas por vírgula)..."
              onChange={(e) => upd(i, { images: e.target.value.split(",").map(url => url.trim()).filter(Boolean) })}
            />
          </div>
          <div className="mt-3">
            <Button
              type="button"
              onClick={() => refineWithAI(i)}
              disabled={refining === i}
              className="flex items-center gap-1.5 ds-meta font-semibold text-brand hover:text-brand/80 disabled:opacity-60 transition-all"
            >
              {refining === i ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {refining === i ? "Refinando…" : "Melhorar com IA"}
            </Button>
          </div>
        </Card>
      ))}
      <AddBtn onClick={add}>Adicionar dia</AddBtn>
    </Accordion>
  );
}
