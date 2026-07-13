import { useState } from "react";

import { Field } from "@/components/ui/field";
import { FormInput as Input } from "@/components/ui/input";
import { FormTextarea as Textarea } from "@/components/ui/textarea";
import { NativeSelect as Select } from "@/components/ui/select";
import { PrimaryButton, GhostButton , Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wand2, Link as LinkIcon, Sparkles, X } from "lucide-react";

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
    <div
      className={`fixed inset-y-0 right-0 z-50 flex h-full w-[450px] flex-col border-l border-white/10 bg-glass-dark backdrop-blur-3xl shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${open ? "translate-x-0" : "translate-x-full"}`}
    >
      <div className="flex justify-between items-center p-6 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 text-white">
          <div className="h-10 w-10 rounded-full bg-brand/20 flex items-center justify-center text-brand-light">
            <Wand2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Gerador Inteligente</h2>
            <p className="text-xs text-white/60">Escreva ou faça upload (OCR)</p>
          </div>
        </div>
        <Button 
          onClick={() => onOpenChange(false)}
          className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex border-b border-white/10 shrink-0">
        <Button
          type="button"
          className={`py-3 flex-1 text-sm font-medium border-b-2 flex items-center justify-center gap-2 transition-colors ${tab === "topic" ? "border-brand-light text-white" : "border-transparent text-white/50 hover:text-white"}`}
          onClick={() => setTab("topic")}
        >
          <Sparkles className="w-4 h-4" /> Tema Livre
        </Button>
        <Button
          type="button"
          className={`py-3 flex-1 text-sm font-medium border-b-2 flex items-center justify-center gap-2 transition-colors ${tab === "url" ? "border-brand-light text-white" : "border-transparent text-white/50 hover:text-white"}`}
          onClick={() => setTab("url")}
        >
          <LinkIcon className="w-4 h-4" /> Ler Link/Arquivo
        </Button>
      </div>

      <form onSubmit={handleGenerate} className="flex-1 overflow-y-auto p-6 space-y-6">
        {tab === "topic" ? (
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/90">Sobre o que você quer escrever?</label>
            <Textarea
              placeholder="Ex: Roteiro de 5 dias em Paris para casais..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={5}
              className="w-full bg-white/5 border-white/10 p-4 text-white placeholder:text-white/30 focus:ring-2 focus:ring-brand-light resize-none"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/90">URL do conteúdo base</label>
              <Input
                placeholder="https://exemplo.com/materia-original"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                type="url"
                className="w-full bg-white/5 border-white/10 rounded-full text-white placeholder:text-white/30 focus:ring-2 focus:ring-brand-light"
              />
            </div>
            
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 text-center hover:bg-white/10 transition-colors cursor-pointer group">
              <div className="flex flex-col items-center justify-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity text-white">
                 <LinkIcon className="w-8 h-8 mb-2" />
                 <span className="font-semibold text-sm">Upload de Arquivo (OCR)</span>
                 <span className="text-xs text-white/60">Arraste um PDF ou Imagem aqui para extrair o texto automaticamente.</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-white/90">Tom de Voz</label>
          <Select 
            value={tone} 
            onChange={(e) => setTone(e.target.value)}
            className="w-full bg-white/5 border-white/10 rounded-full text-white focus:ring-2 focus:ring-brand-light appearance-none"
          >
            <option value="profissional e engajador" className="bg-neutral-900 text-white">Profissional e Engajador</option>
            <option value="descontraído e aventureiro" className="bg-neutral-900 text-white">Descontraído e Aventureiro</option>
            <option value="luxuoso e exclusivo" className="bg-neutral-900 text-white">Luxuoso e Exclusivo</option>
            <option value="didático e informativo" className="bg-neutral-900 text-white">Didático e Informativo</option>
          </Select>
        </div>
      </form>

      <div className="p-6 border-t border-white/10 bg-white/5 shrink-0 flex gap-3">
        <Button 
          type="button" 
          onClick={() => onOpenChange(false)} 
          disabled={loading}
          className="h-12 flex-1 rounded-full border border-white/10 text-white font-medium hover:bg-white/10 transition-colors"
        >
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={loading} 
          onClick={handleGenerate}
          className="h-12 flex-1 rounded-full bg-brand text-white font-semibold hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
        >
          <Wand2 className="w-4 h-4" />
          {loading ? "Processando..." : "Gerar"}
        </Button>
      </div>
    </div>
  );
}
