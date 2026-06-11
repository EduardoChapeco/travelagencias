import { useState } from "react";
import { SheetPage } from "./sheet";
import { Field, PrimaryButton, GhostButton, Textarea } from "./form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wand2 } from "lucide-react";
type PortalBlock = any;

type AILandingPageModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (blocks: PortalBlock[]) => void;
};

export function AILandingPageModal({ open, onOpenChange, onGenerate }: AILandingPageModalProps) {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return toast.warning("Digite o tema ou objetivo da sua Landing Page.");

    setLoading(true);
    toast.loading("O arquiteto IA está construindo sua página...", { id: "ai-lp" });

    try {
      const systemPrompt = `Você é um Growth Hacker e Web Designer Especialista em Turismo.
Crie a estrutura de uma Landing Page focada em alta conversão.
O usuário quer uma página sobre: "${topic}".

Você DEVE retornar **APENAS UM ARRAY JSON VÁLIDO**. NADA MAIS. SEM MARKDOWN (\`\`\`json).
Os objetos do array devem usar EXATAMENTE uma das seguintes interfaces de blocos:

1. Hero Block:
{ "id": "gerado_por_vc", "type": "hero", "title": "Títulão", "subtitle": "Subtítulo atraente", "bg_image_url": "", "cta_label": "Comprar Agora", "cta_link": "/contato" }

2. Features Block (Diferenciais):
{ "id": "gerado", "type": "features", "title": "Por que nos escolher?", "items": [{ "icon": "✨", "title": "Diferencial", "description": "Texto" }] }

3. Text Block:
{ "id": "gerado", "type": "text", "content": "Seu texto em html simples com <p> e <strong>...", "align": "center", "image_url": "" }

4. FAQ Block:
{ "id": "gerado", "type": "faq", "title": "Dúvidas Comuns", "items": [{ "question": "Pergunta", "answer": "Resposta" }] }

5. CTA Block:
{ "id": "gerado", "type": "cta", "title": "Fale com um consultor", "subtitle": "Não perca tempo", "button_label": "WhatsApp", "button_link": "https://wa.me/..." }

Regra: A página deve ter uma narrativa vendedora. Comece com um Hero, coloque Textos/Features, resolva objeções no FAQ e feche com um CTA. Responda apenas com o Array JSON.`;

      const { data, error } = await supabase.functions.invoke("ai-orchestrator", {
        body: {
          action: "completion",
          prompt: "Por favor, retorne agora o array JSON contendo todos os blocos.",
          systemPrompt,
          modelPreference: "smart"
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const resultText = data.result || "";
      const jsonMatch = resultText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (!jsonMatch) throw new Error("A IA não retornou um formato estruturado válido.");

      let blocks: PortalBlock[] = [];
      try {
        blocks = JSON.parse(jsonMatch[0]);
      } catch (err) {
        throw new Error("Erro ao interpretar a resposta da IA.");
      }

      toast.success("Página mágica gerada com sucesso!", { id: "ai-lp" });
      onGenerate(blocks);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro na geração", { id: "ai-lp" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SheetPage 
      isOpen={open} 
      onClose={() => onOpenChange(false)} 
      title="Arquiteto de Landing Pages IA"
      width="clamp(400px, 40vw, 600px)"
    >
      <div className="mb-6 bg-surface-alt/50 p-4 rounded-xl border border-border">
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-brand" />
          Deixe o Growth Hacker da Inteligência Artificial desenhar sua página focada em conversão em poucos segundos.
        </p>
      </div>

      <form onSubmit={handleGenerate} className="space-y-4">
        <Field label="Descreva o que quer vender" hint="Ex: Landing page para Pacote Neve em Bariloche 2026, com foco em casais.">
          <Textarea 
            placeholder="Digite o objetivo da sua página..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={4}
          />
        </Field>

        <div className="pt-4 flex justify-end gap-3 border-t border-border mt-4">
          <GhostButton type="button" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </GhostButton>
          <PrimaryButton type="submit" disabled={loading} className="gap-2">
            <Wand2 className="w-4 h-4" /> 
            {loading ? "Montando Estrutura..." : "Gerar Landing Page Inteira"}
          </PrimaryButton>
        </div>
      </form>
    </SheetPage>
  );
}
