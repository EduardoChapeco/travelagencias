import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Search,
  Radar,
  TrendingUp,
  Users,
  MessageSquare,
  Crosshair,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { PrimaryButton, Input } from "@/components/ui/form";
import { HeaderPortal } from "@/components/shell/HeaderPortal";
import { ModuleToolbar } from "@/components/shell/ModuleToolbar";

export const Route = createFileRoute("/agency/$slug/competitors")({
  head: ({ context }: any) => ({ meta: [{ title: `Espião de Mercado · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: CompetitorSpy,
});

type CompetitorAnalysis = {
  name: string;
  city: string;
  niche: string;
  target_audience: string;
  estimated_pricing: string;
  communication_tone: string;
  mental_triggers: string[];
  strengths: string[];
  weaknesses: string[];
  opportunities_for_us: string[];
};

function CompetitorSpy() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<CompetitorAnalysis | null>(null);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return toast.warning("Forneça a URL do concorrente.");

    setLoading(true);
    setAnalysis(null);

    try {
      toast.loading("Lendo site do concorrente...", { id: "spy" });
      const { data: scrapeData, error: scrapeErr } = await supabase.functions.invoke(
        "ai-orchestrator",
        {
          body: { action: "scrape", url },
        },
      );
      if (scrapeErr) throw scrapeErr;
      if (scrapeData?.error) throw new Error(scrapeData.error);

      const context = scrapeData.result;
      if (!context) throw new Error("Conteúdo não encontrado ou bloqueado.");

      toast.loading("Processando dados de mercado...", { id: "spy" });

      const systemPrompt = `Você é um estrategista de negócios de turismo.
Analise os dados extraídos do site/perfil de uma agência de viagens concorrente.
Retorne EXATAMENTE UM JSON com as seguintes chaves precisas (sem markdown em volta, só o JSON):
{
  "name": "Nome da Agência",
  "city": "Cidade/Região Base (se encontrada, senão 'Não informado')",
  "niche": "Nicho principal (ex: Luxo, Corporativo, Neve, Disney)",
  "target_audience": "Descrição do público-alvo e nível de renda estimado",
  "estimated_pricing": "Estratégia de preço aparente (Premium, Popular, Desconto)",
  "communication_tone": "Como eles se comunicam (Formal, Engraçado, Inspiracional)",
  "mental_triggers": ["Gatilho 1", "Gatilho 2"],
  "strengths": ["Ponto forte 1", "Ponto forte 2"],
  "weaknesses": ["Possível fraqueza 1", "Possível fraqueza 2"],
  "opportunities_for_us": ["Como podemos vencê-los 1", "Como podemos superá-los 2"]
}`;

      const { data: compData, error: compErr } = await supabase.functions.invoke(
        "ai-orchestrator",
        {
          body: {
            action: "completion",
            prompt: `Dados extraídos do concorrente (${url}):\n\n${context}`,
            systemPrompt,
            modelPreference: "smart",
          },
        },
      );

      if (compErr) throw compErr;
      if (compData?.error) throw new Error(compData.error);

      const text = compData.result || "";
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Não foi possível gerar a análise.");

      const parsed = JSON.parse(match[0]) as CompetitorAnalysis;
      setAnalysis(parsed);

      toast.success("Análise de concorrente concluída!", { id: "spy" });
    } catch (err: any) {
      toast.error(err.message || "Erro ao espiar concorrente.", { id: "spy" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <HeaderPortal>
        <ModuleToolbar title="Espião de Mercado" />
      </HeaderPortal>

      <div className="flex-1 overflow-y-auto px-4 md:pl-[64px] md:pr-6 py-4 min-h-0 space-y-6 pb-24">

      <form
        onSubmit={handleAnalyze}
        className="relative flex items-center rounded-[24px] bg-surface border border-border p-2"
      >
        <Search className="absolute left-5 w-5 h-5 text-muted-foreground" />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.agenciaconcorrente.com.br"
          className="flex-1 bg-transparent px-12 py-3 outline-none text-sm placeholder:text-muted-foreground/60"
          type="url"
          required
        />
        <PrimaryButton type="submit" disabled={loading} className="gap-2 shrink-0 rounded-2xl px-6">
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}
          {loading ? "Espiando..." : "Analisar Concorrente"}
        </PrimaryButton>
      </form>

      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header Card */}
          <div className="md:col-span-12 rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="bg-brand/5 p-6 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">{analysis.name}</h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Crosshair className="w-4 h-4" /> {analysis.city}
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" /> {analysis.niche}
                  </span>
                </div>
              </div>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-sm font-medium text-brand hover:underline"
              >
                Visitar Site <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
              <div className="p-6 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  <Users className="w-4 h-4" /> Público Alvo
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {analysis.target_audience}
                </p>
              </div>
              <div className="p-6 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  <MessageSquare className="w-4 h-4" /> Comunicação
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {analysis.communication_tone}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {analysis.mental_triggers.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-1 text-[10px] font-semibold bg-surface-alt border border-border rounded-full"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-6 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  <TrendingUp className="w-4 h-4" /> Posicionamento
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {analysis.estimated_pricing}
                </p>
              </div>
            </div>
          </div>

          {/* SWOT-ish Analysis */}
          <div className="md:col-span-6 space-y-6">
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success"></div>O que eles fazem bem
              </h3>
              <ul className="space-y-3">
                {analysis.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground leading-relaxed">
                    <span className="text-success font-bold">✓</span> {s}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-danger"></div>
                Onde eles deixam a desejar
              </h3>
              <ul className="space-y-3">
                {analysis.weaknesses.map((w, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground leading-relaxed">
                    <span className="text-danger font-bold">✗</span> {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Opportunities */}
          <div className="md:col-span-6">
            <div className="rounded-2xl border border-brand/30 bg-brand/5 p-6 h-full">
              <h3 className="text-sm font-bold uppercase tracking-wider text-brand mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Como Superá-los (Oportunidades)
              </h3>
              <ul className="space-y-4">
                {analysis.opportunities_for_us.map((o, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <div className="w-6 h-6 shrink-0 rounded-full bg-brand text-brand-foreground flex items-center justify-center text-xs font-bold mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-sm font-medium text-foreground leading-relaxed">{o}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
