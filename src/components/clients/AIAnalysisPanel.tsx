import { useState } from "react";
import { toast } from "sonner";
import { Brain, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function AIAnalysisPanel({
  client,
  trips,
  proposals,
}: {
  client: any;
  trips: any[];
  proposals: any[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  async function runAnalysis() {
    setLoading(true);
    try {
      const clientSummaryInfo = {
        name: client.full_name,
        email: client.email,
        phone: client.phone,
        birth_date: client.birth_date,
        cpf: client.cpf,
        rg: client.rg,
        passport_number: client.passport_number,
        passport_expiry: client.passport_expiry,
        dietary: client.preferences?.dietary,
        preferences_notes: client.preferences?.notes,
        notes: client.notes,
        tags: client.tags,
      };

      const tripsSummary = trips.map((t: any) => ({
        destination: t.destination,
        total_sale: t.total_sale,
        status: t.status,
        travel_start: t.travel_start,
        title: t.title,
      }));

      const proposalsSummary = proposals.map((p: any) => ({
        title: p.title,
        status: p.status,
        total: p.total,
        created_at: p.created_at,
      }));

      const promptText = `Por favor, analise o perfil do seguinte cliente da agência de viagens e o histórico de interações dele.
Informações do Cliente:
${JSON.stringify(clientSummaryInfo, null, 2)}

Histórico de Viagens:
${JSON.stringify(tripsSummary, null, 2)}

Histórico de Cotações/Propostas:
${JSON.stringify(proposalsSummary, null, 2)}

Gere um objeto JSON contendo exatamente as seguintes chaves. Não inclua nenhuma formatação ou tags de bloco de código markdown como \`\`\`json, retorne apenas o objeto JSON puro:
{
  "summary": "Um resumo detalhado e profissional do comportamento e preferências de viagem do cliente.",
  "retentionScore": "alto" | "médio" | "baixo",
  "suggestions": [
    "Primeira sugestão de engajamento ou destino ideal baseado no perfil",
    "Segunda sugestão para fidelização ou oferta",
    "Terceira sugestão de ação interna para o agente de viagens"
  ],
  "nextAction": "Recomendação clara da próxima ação comercial com o cliente."
}`;

      const systemPromptText =
        "Você é uma IA analista de comportamento do cliente em uma agência de viagens premium. Sua tarefa é analisar o perfil, o histórico de compras, preferências e interesses para sugerir ações personalizadas.";

      const { data, error } = await supabase.functions.invoke("ai-orchestrator", {
        body: {
          action: "completion",
          prompt: promptText,
          systemPrompt: systemPromptText,
          agency_id: client.agency_id || client.agencyId,
          modelPreference: "smart",
        },
      });

      if (error) throw error;
      let resultText = data?.result;
      if (!resultText) throw new Error("Não foi possível obter uma resposta do assistente.");

      resultText = resultText.replace(/```json\s*|```\s*/g, "").trim();
      const parsed = JSON.parse(resultText);

      if (parsed && typeof parsed === "object") {
        setAnalysis(parsed);
      } else {
        throw new Error("Formato inválido retornado pelo assistente.");
      }
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Erro ao gerar análise.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-border bg-background overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-4 text-sm font-bold hover:bg-surface/50 transition-colors text-foreground cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-brand" />
          Análise de Perfil
        </div>
        <div className="text-[10px] font-bold text-brand opacity-70">BETA</div>
      </button>

      {open && (
        <div className="px-6 pb-6 border-t border-border/50 space-y-4 bg-background">
          {!analysis && !loading && (
            <div className="pt-4 text-center">
              <Sparkles className="h-8 w-8 text-brand mx-auto mb-3 opacity-60" />
              <p className="text-sm text-muted-foreground mb-4">
                O assistente analisará o histórico de viagens, cotações e padrões de comportamento
                do cliente.
              </p>
              <button
                onClick={runAnalysis}
                className="flex items-center gap-1.5 mx-auto h-9 rounded-lg bg-brand text-white px-4 text-xs font-bold hover:opacity-90 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" /> Analisar Perfil
              </button>
            </div>
          )}

          {loading && (
            <div className="pt-4 flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              <p className="text-sm text-muted-foreground">Analisando perfil do cliente...</p>
            </div>
          )}

          {analysis && (
            <div className="pt-4 space-y-4">
              <div className="rounded-xl bg-surface border border-border p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Resumo
                </div>
                <p className="text-sm leading-relaxed text-foreground">{analysis.summary}</p>
              </div>

              <div
                className={`rounded-xl border p-4 ${
                  analysis.retentionScore === "alto"
                    ? "border-success/30 bg-success/5"
                    : analysis.retentionScore === "médio"
                      ? "border-brand/30 bg-brand/5"
                      : "border-danger/30 bg-danger/5"
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Score de Retenção
                </div>
                <div
                  className={`text-2xl font-black capitalize ${
                    analysis.retentionScore === "alto"
                      ? "text-success"
                      : analysis.retentionScore === "médio"
                        ? "text-brand"
                        : "text-danger"
                  }`}
                >
                  {analysis.retentionScore} risco de churn
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Sugestões do Assistente
                </div>
                {analysis.suggestions.map((s: string, i: number) => (
                  <div key={i} className="flex gap-2 text-sm text-foreground">
                    <Sparkles className="h-4 w-4 text-brand flex-shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-brand/30 bg-brand/5 p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-brand mb-1">
                  Próxima ação recomendada
                </div>
                <p className="text-sm font-semibold text-foreground">{analysis.nextAction}</p>
              </div>

              <button
                onClick={runAnalysis}
                className="text-xs text-muted-foreground hover:text-brand underline cursor-pointer"
              >
                Regenerar análise
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
