import { useState } from "react";

import { Field, Input, PrimaryButton, GhostButton, Select, Textarea } from "./form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wand2, Link as LinkIcon, Sparkles } from "lucide-react";

import { SheetPage } from "./sheet";

type AIGeneratorSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (html: string) => void;
};

export function AIGeneratorSheet({ open, onOpenChange, onGenerate }: AIGeneratorSheetProps) {
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
        toast.loading("Lendo o conteúdo da URL...", { id: "ai-gen" });
        const { data: scrapeData, error: scrapeErr } = await supabase.functions.invoke(
          "ai-orchestrator",
          {
            body: { action: "scrape", url },
          },
        );
        if (scrapeErr) throw scrapeErr;
        if (scrapeData?.error) throw new Error(scrapeData.error);
        context = scrapeData.result;
        if (!context) throw new Error("Não foi possível extrair o conteúdo dessa URL.");
      } else {
        context = `O usuário solicitou um artigo sobre: ${topic}`;
      }

      // 2. Completion
      toast.loading("Estruturando o texto do artigo...", { id: "ai-gen" });
      const systemPrompt = `Você é um redator especialista em turismo. 
Escreva um artigo otimizado para SEO com o tom: ${tone}.
Retorne APENAS HTML limpo compatível com Tiptap (sem markdown extra, sem bloco de código, sem head/body).
Use <h2>, <h3>, <p>, <ul>, <li>, <strong>.
Contexto fornecido: ${context}`;

      const { data: compData, error: compErr } = await supabase.functions.invoke(
        "ai-orchestrator",
        {
          body: {
            action: "completion",
            prompt:
              tab === "topic"
                ? `Escreva sobre: ${topic}`
                : "Resuma e transforme este conteúdo raspado em um novo artigo original para nosso blog de turismo.",
            systemPrompt,
            modelPreference: "smart",
          },
        },
      );

      if (compErr) throw compErr;
      if (compData?.error) throw new Error(compData.error);

      const html = compData.result;
      if (!html) throw new Error("Não foi possível gerar o texto.");

      toast.success("Artigo gerado com sucesso!", { id: "ai-gen" });
      onGenerate(html);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Falha ao gerar texto.", { id: "ai-gen" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SheetPage
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title="Assistente de Escrita de Artigos"
      width="450px"
    >
      <div className="mb-6 space-y-1">
        <div className="flex items-center gap-2 text-brand font-bold">
          <Wand2 className="w-5 h-5" />
          Gerador Inteligente
        </div>
        <p className="text-xs text-muted-foreground">
          Deixe o assistente estruturar ou curar o conteúdo do seu blog.
        </p>
      </div>
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
          <Field
            label="URL do conteúdo base"
            hint="O assistente vai ler esta página e reescrever o artigo para você."
          >
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
    </SheetPage>
  );
}
