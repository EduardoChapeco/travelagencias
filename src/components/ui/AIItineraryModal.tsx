import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Field, Input, PrimaryButton, GhostButton, Select, Textarea } from "./form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wand2, Link as LinkIcon, Sparkles } from "lucide-react";

export type AIItineraryDay = { day: string; title: string; description: string };

type AIItineraryModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (days: AIItineraryDay[]) => void;
};

export function AIItineraryModal({ open, onOpenChange, onGenerate }: AIItineraryModalProps) {
  const [tab, setTab] = useState<"topic" | "url">("topic");
  const [topic, setTopic] = useState("");
  const [url, setUrl] = useState("");
  const [daysCount, setDaysCount] = useState("5");
  const [loading, setLoading] = useState(false);
  const [tone, setTone] = useState("luxuoso e exclusivo");

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (tab === "topic" && !topic) return toast.error("Digite o destino ou ideia do roteiro.");
    if (tab === "url" && !url) return toast.error("Cole uma URL válida.");

    setLoading(true);

    try {
      let context = "";

      // 1. Scrape se for URL
      if (tab === "url") {
        toast.loading("Lendo o conteúdo da URL (Scraping)...", { id: "ai-itinerary" });
        const { data: scrapeData, error: scrapeErr } = await supabase.functions.invoke("ai-orchestrator", {
          body: { action: "scrape", url },
        });
        if (scrapeErr) throw scrapeErr;
        if (scrapeData?.error) throw new Error(scrapeData.error);
        context = scrapeData.result;
        if (!context) throw new Error("Não foi possível extrair o conteúdo dessa URL.");
      } else {
        context = `Destino ou tema: ${topic}`;
      }

      // 2. Completion
      toast.loading("Montando a curadoria do roteiro com IA...", { id: "ai-itinerary" });
      const systemPrompt = `Você é um curador e agente de viagens de altíssimo nível.
Crie um roteiro de viagem de ${daysCount} dias com o tom: ${tone}.
Baseie-se neste contexto se houver: ${context}

Retorne **SOMENTE** um array JSON válido sem markdown em volta. A estrutura EXATA deve ser:
[
  { "day": "Dia 01", "title": "Chegada e reconhecimento", "description": "Descrição envolvente do dia..." },
  { "day": "Dia 02", "title": "Tour histórico", "description": "..." }
]`;

      const { data: compData, error: compErr } = await supabase.functions.invoke("ai-orchestrator", {
        body: {
          action: "completion",
          prompt: "Por favor, gere o roteiro de viagem em formato JSON agora.",
          systemPrompt,
          modelPreference: "smart"
        },
      });

      if (compErr) throw compErr;
      if (compData?.error) throw new Error(compData.error);
      
      const resultText = compData.result || "";
      const jsonMatch = resultText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      let parsed = [];
      
      try {
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : resultText);
      } catch(e) {
        throw new Error("A IA não retornou um formato JSON válido. Tente novamente.");
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("Formato inválido retornado pela IA.");
      }

      toast.success("Roteiro mágico gerado com sucesso!", { id: "ai-itinerary" });
      onGenerate(parsed);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Falha na geração do roteiro.", { id: "ai-itinerary" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-brand" /> 
            Construtor de Roteiros IA
          </DialogTitle>
          <DialogDescription>
            Crie um itinerário completo em segundos a partir de uma ideia ou de um link de referência.
          </DialogDescription>
        </DialogHeader>

        <div className="flex border-b border-border mb-4">
          <button
            type="button"
            className={`py-2 px-4 text-sm font-medium border-b-2 flex items-center gap-2 ${tab === "topic" ? "border-brand text-foreground" : "border-transparent text-muted-foreground"}`}
            onClick={() => setTab("topic")}
          >
            <Sparkles className="w-4 h-4" /> Nova Ideia
          </button>
          <button
            type="button"
            className={`py-2 px-4 text-sm font-medium border-b-2 flex items-center gap-2 ${tab === "url" ? "border-brand text-foreground" : "border-transparent text-muted-foreground"}`}
            onClick={() => setTab("url")}
          >
            <LinkIcon className="w-4 h-4" /> A partir de um Link
          </button>
        </div>

        <form onSubmit={handleGenerate} className="space-y-4">
          {tab === "topic" ? (
            <Field label="Destino ou Tema do Roteiro">
              <Textarea 
                placeholder="Ex: 5 dias em Paris focado em alta gastronomia e moda..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
              />
            </Field>
          ) : (
            <Field label="URL de Referência" hint="A IA lerá o site (ex: roteiro de um concorrente ou blog) e o reescreverá para você.">
              <Input 
                placeholder="https://viagemeturismo.com/roteiro-paris"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                type="url"
              />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Quantidade de Dias">
              <Input 
                type="number"
                min={1}
                max={30}
                value={daysCount}
                onChange={(e) => setDaysCount(e.target.value)}
              />
            </Field>
            <Field label="Tom e Estilo">
              <Select value={tone} onChange={(e) => setTone(e.target.value)}>
                <option value="luxuoso e exclusivo">Luxuoso e Exclusivo</option>
                <option value="aventureiro e dinâmico">Aventureiro e Dinâmico</option>
                <option value="romântico e relaxante">Romântico e Relaxante</option>
                <option value="cultural e histórico">Cultural e Histórico</option>
                <option value="econômico e prático">Econômico e Prático</option>
              </Select>
            </Field>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border mt-4">
            <GhostButton type="button" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </GhostButton>
            <PrimaryButton type="submit" disabled={loading} className="gap-2">
              <Wand2 className="w-4 h-4" /> 
              {loading ? "Minerando..." : "Gerar Itinerário"}
            </PrimaryButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
