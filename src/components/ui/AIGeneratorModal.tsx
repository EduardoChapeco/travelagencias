import { useState } from "react";

import { Field, Input, PrimaryButton, GhostButton, Select, Textarea } from "./form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wand2, Link as LinkIcon, Sparkles } from "lucide-react";

type AIGeneratorModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (html: string) => void;
};

export function AIGeneratorModal({ open, onOpenChange, onGenerate }: AIGeneratorModalProps) {
  const [tab, setTab] = useState<"topic" | "url">("topic");
  const [topic, setTopic] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [tone, setTone] = useState("profissional e engajador");

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (tab === "topic" && !topic) return toast.error("Digite um tema ou palavra-chave.");
    if (tab === "url" && !url) return toast.error("Cole uma URL válida.");

    setLoading(true);

    try {
      let context = "";

      // 1. Scrape se for URL
      if (tab === "url") {
        toast.loading("Lendo o conteúdo da URL (Scraping)...", { id: "ai-gen" });
        const { data: scrapeData, error: scrapeErr } = await supabase.functions.invoke("ai-orchestrator", {
          body: { action: "scrape", url },
        });
        if (scrapeErr) throw scrapeErr;
        if (scrapeData?.error) throw new Error(scrapeData.error);
        context = scrapeData.result;
        if (!context) throw new Error("Não foi possível extrair o conteúdo dessa URL.");
      } else {
        context = `O usuário solicitou um artigo sobre: ${topic}`;
      }

      // 2. Completion
      toast.loading("Escrevendo o artigo com IA...", { id: "ai-gen" });
      const systemPrompt = `Você é um redator especialista em turismo. 
Escreva um artigo otimizado para SEO com o tom: ${tone}.
Retorne APENAS HTML limpo compatível com Tiptap (sem markdown extra, sem bloco de código, sem head/body).
Use <h2>, <h3>, <p>, <ul>, <li>, <strong>.
Contexto fornecido: ${context}`;

      const { data: compData, error: compErr } = await supabase.functions.invoke("ai-orchestrator", {
        body: {
          action: "completion",
          prompt: tab === "topic" ? `Escreva sobre: ${topic}` : "Resuma e transforme este conteúdo raspado em um novo artigo original para nosso blog de turismo.",
          systemPrompt,
          modelPreference: "smart"
        },
      });

      if (compErr) throw compErr;
      if (compData?.error) throw new Error(compData.error);
      
      const html = compData.result;
      if (!html) throw new Error("A IA não retornou nenhum texto.");

      toast.success("Artigo gerado com sucesso!", { id: "ai-gen" });
      onGenerate(html);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Falha na geração com IA.", { id: "ai-gen" });
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex justify-end bg-background/80 backdrop-blur-sm" onClick={() => onOpenChange(false)}>
      <div className="flex h-full w-full max-w-md flex-col overflow-hidden border-l border-border bg-surface animate-in slide-in-from-right duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-border bg-surface-alt/30 p-6 shrink-0">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-brand" /> 
            Redator de Artigos IA
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Deixe a inteligência artificial escrever ou curar o conteúdo do seu blog.
          </p>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex border-b border-border mb-4">
          <button
            type="button"
            className={`py-2 px-4 text-sm font-medium border-b-2 flex items-center gap-2 ${tab === "topic" ? "border-brand text-foreground" : "border-transparent text-muted-foreground"}`}
            onClick={() => setTab("topic")}
          >
            <Sparkles className="w-4 h-4" /> Tema Livre
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
            <Field label="Sobre o que você quer escrever?">
              <Textarea 
                placeholder="Ex: Roteiro de 5 dias em Paris para casais focando em restaurantes românticos..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={4}
              />
            </Field>
          ) : (
            <Field label="URL do conteúdo base" hint="A IA vai ler esta página e reescrever o artigo para você.">
              <Input 
                placeholder="https://exemplo.com/materia-original"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                type="url"
              />
            </Field>
          )}

          <Field label="Tom de Voz">
            <Select value={tone} onChange={(e) => setTone(e.target.value)}>
              <option value="profissional e engajador">Profissional e Engajador</option>
              <option value="descontraído e aventureiro">Descontraído e Aventureiro</option>
              <option value="luxuoso e exclusivo">Luxuoso e Exclusivo</option>
              <option value="didático e informativo">Didático e Informativo</option>
            </Select>
          </Field>

          <div className="pt-4 flex justify-end gap-3 border-t border-border mt-4">
            <GhostButton type="button" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </GhostButton>
            <PrimaryButton type="submit" disabled={loading} className="gap-2">
              <Wand2 className="w-4 h-4" /> 
              {loading ? "Processando..." : "Gerar Artigo"}
            </PrimaryButton>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
