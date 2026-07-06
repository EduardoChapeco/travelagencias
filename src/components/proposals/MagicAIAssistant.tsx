import { useState } from "react";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { type Proposal } from "@/services/proposals";
import { SheetPage } from "@/components/ui/sheet";

type Props = {
  draft: Proposal;
  onApply: (patch: Partial<Proposal>) => void;
};

export function MagicAIAssistant({ draft, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState(
    "Reescreva os textos desta proposta para que fiquem mais persuasivos, luxuosos e voltados para venda. Mantenha os dias do roteiro fiéis à estrutura original.",
  );
  const [busy, setBusy] = useState(false);

  async function handleMagic() {
    if (!prompt.trim()) return toast.error("Digite as instruções de escrita");
    setBusy(true);

    try {
      const payload = {
        title: draft.title,
        destination: draft.destination,
        notes: draft.notes || "",
        itinerary: draft.itinerary || [],
      };

      const systemPrompt = `Você é um copywriter especialista em turismo de luxo. Seu objetivo é pegar o JSON fornecido e reescrevê-lo baseado nas instruções do usuário.
Retorne EXATAMENTE um JSON válido com o mesmo formato de entrada: { title, destination, notes, itinerary: [{ day, title, description }] }.
Não inclua crases markdown nem texto adicional.`;

      const { data, error } = await supabase.functions.invoke("ai-orchestrator", {
        body: {
          action: "completion",
          prompt: `Instrução do Agente: ${prompt}\n\nDados Atuais:\n${JSON.stringify(payload, null, 2)}`,
          systemPrompt,
          modelPreference: "smart",
        },
      });

      if (error) throw error;

      const text = data?.result || "";
      const match = text.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : text);

      onApply({
        title: parsed.title || draft.title,
        destination: parsed.destination || draft.destination,
        notes: parsed.notes || draft.notes,
        itinerary: Array.isArray(parsed.itinerary) ? parsed.itinerary : draft.itinerary,
      });

      toast.success("Mágica aplicada com sucesso!");
      setOpen(false);
    } catch (e) {
      toast.error("Falha ao gerar o roteiro. Tente novamente.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 text-xs font-semibold text-amber-600 hover:bg-amber-500/20 transition-all"
      >
        <Sparkles className="h-3.5 w-3.5" /> Assistente de Escrita
      </button>

      <SheetPage
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Assistente de Escrita"
        width="450px"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Deixe o Turis reescrever e enriquecer os textos do seu roteiro e proposta para você.
          </p>

          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-2 block">
              Instruções para o Assistente
            </label>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full rounded-[24px] border border-border bg-surface-alt/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
              placeholder="Como o assistente deve reescrever esta proposta?"
            />
          </div>

          <button
            onClick={handleMagic}
            disabled={busy}
            className="w-full flex h-10 items-center justify-center gap-2 rounded-[24px] bg-amber-500 text-white font-bold hover:bg-amber-600 transition-all disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Gerando Textos...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" /> Aplicar Mágica
              </>
            )}
          </button>
        </div>
      </SheetPage>
    </>
  );
}
