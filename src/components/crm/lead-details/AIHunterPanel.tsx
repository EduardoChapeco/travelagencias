import { useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles,
  Bot,
  Pencil,
  Send,
  FileText,
  ExternalLink,
  Heart,
  AlertCircle,
  ShieldAlert,
  DollarSign,
} from "lucide-react";

type LeadInsight = {
  fears: string[];
  desires: string[];
  objections: string[];
  budget_signals: string[];
  general_profile: string | null;
  next_best_action: string | null;
  updated_at: string;
};

export function AIHunterPanel({ leadId, agencyId }: { leadId: string; agencyId: string }) {
  const { slug } = useParams({ from: "/agency/$slug/crm/$lead_id" });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [insights, setInsights] = useState<LeadInsight | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [createdProposal, setCreatedProposal] = useState<{ id: string; number: string; publicToken: string } | null>(null);
  const [sendingWa, setSendingWa] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    supabase
      .from("lead_insights")
      .select("*")
      .eq("lead_id", leadId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) setInsights(data as LeadInsight);
      });
  }, [leadId]);

  async function triggerAnalysis() {
    setAnalyzing(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/ai-message-processor`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ record: { lead_id: leadId, agency_id: agencyId } }),
      });
      if (!res.ok) throw new Error("Falha na análise");
      const { data } = await supabase
        .from("lead_insights")
        .select("*")
        .eq("lead_id", leadId)
        .maybeSingle();
      if (data) setInsights(data as LeadInsight);
      toast.success("Análise da IA concluída!");
    } catch (e: any) {
      toast.error(e.message || "Falha ao analisar");
    } finally {
      setAnalyzing(false);
    }
  }

  async function generateAIProposal() {
    setGeneratingProposal(true);
    setErrorMsg("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-message-processor", {
        body: { action: "create_proposal", lead_id: leadId, agency_id: agencyId }
      });
      if (error) throw error;
      if (!data || !data.proposal_id) throw new Error("ID da proposta não retornado pela IA.");
      
      setCreatedProposal({
        id: data.proposal_id,
        number: data.number,
        publicToken: data.public_token
      });
      toast.success(`Cotação #${data.number} gerada com sucesso!`);
      // Invalida a lista de cotações para que atualize na aba de cotações
      qc.invalidateQueries({ queryKey: ["proposals", agencyId] });
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Erro ao gerar proposta com IA.");
      toast.error(e.message || "Erro ao gerar proposta");
    } finally {
      setGeneratingProposal(false);
    }
  }

  function editProposal() {
    if (!createdProposal) return;
    navigate({
      to: "/agency/$slug/proposals/$id",
      params: { slug, id: createdProposal.id }
    });
  }

  async function sendProposalToWhatsApp() {
    if (!createdProposal || sendingWa) return;
    setSendingWa(true);
    try {
      const url = `${window.location.origin}/m/proposal/${createdProposal.publicToken}`;
      const content = `Olá! Preparamos uma proposta personalizada de viagem para você. Você pode acessá-la e detalhar todos os serviços por este link: ${url}`;
      
      const { error } = await supabase.from("omnichannel_messages").insert({
        agency_id: agencyId,
        lead_id: leadId,
        channel: "whatsapp",
        direction: "outbound",
        content,
        status: "pending",
      });
      if (error) throw error;
      toast.success("Mensagem adicionada à fila de envio do WhatsApp!");
      qc.invalidateQueries({ queryKey: ["lead-activities", leadId] });
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao enviar link da cotação.");
    } finally {
      setSendingWa(false);
    }
  }

  function copyProposalLink() {
    if (!createdProposal) return;
    const url = `${window.location.origin}/m/proposal/${createdProposal.publicToken}`;
    navigator.clipboard.writeText(url);
    toast.success("Link da cotação copiado para a área de transferência!");
  }

  const Tag = ({ label, cls }: { label: string; cls: string }) => (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cls}`}
    >
      {label}
    </span>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand" />
          <span className="font-bold text-sm text-foreground">
            Inteligência de Lead — Hunter Sênior
          </span>
        </div>
        <button
          onClick={triggerAnalysis}
          disabled={analyzing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-brand/40 text-brand bg-brand/5 rounded-lg hover:bg-brand/10 transition-colors disabled:opacity-50"
        >
          <Bot className="h-3.5 w-3.5" />
          {analyzing ? "Analisando..." : "Analisar Agora"}
        </button>
      </div>

      {/* Bloco de Criação de Cotação por IA */}
      <div className="rounded-xl border border-brand/20 bg-brand/[0.02] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand text-xs font-bold uppercase tracking-widest">
            <Sparkles className="h-4 w-4" /> Geração de Proposta por IA
          </div>
          {createdProposal && (
            <span className="text-[10px] font-extrabold uppercase bg-success/10 text-success border border-success/20 px-2 py-0.5 rounded">
              Cotação #{createdProposal.number} Criada
            </span>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground leading-relaxed">
          O Copiloto de IA analisa as últimas 30 mensagens deste lead no chat do WhatsApp para extrair o roteiro, voos, hotéis e passeios citados, e cria uma proposta completa no formato de rascunho com apenas 1 clique.
        </p>

        {errorMsg && (
          <p className="text-xs text-danger font-medium">{errorMsg}</p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={generateAIProposal}
            disabled={generatingProposal}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-brand/30 bg-brand text-brand-foreground px-4 text-xs font-bold transition-all hover:opacity-90 disabled:opacity-50"
          >
            <Sparkles className={`h-3.5 w-3.5 ${generatingProposal ? 'animate-spin' : ''}`} />
            {generatingProposal ? "Gerando Proposta..." : "Gerar Proposta com IA"}
          </button>

          {createdProposal && (
            <>
              <button
                onClick={editProposal}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface hover:bg-surface-alt px-3 text-xs font-bold transition-all text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" /> Editar no Studio
              </button>

              <button
                onClick={sendProposalToWhatsApp}
                disabled={sendingWa}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 px-3 text-xs font-bold transition-all disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" /> 
                {sendingWa ? "Enviando..." : "Enviar por WhatsApp"}
              </button>

              <button
                onClick={copyProposalLink}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface hover:bg-surface-alt px-3 text-xs font-bold transition-all text-foreground"
              >
                <FileText className="h-3.5 w-3.5" /> Copiar Link
              </button>
              
              <a
                href={`${window.location.origin}/m/proposal/${createdProposal.publicToken}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface hover:bg-surface-alt px-3 text-xs font-bold transition-all text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Visualizar
              </a>
            </>
          )}
        </div>
      </div>

      {!insights ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/30 p-10 text-center space-y-3">
          <Bot className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
          <p className="text-sm text-muted-foreground">Nenhum insight gerado ainda.</p>
          <p className="text-xs text-muted-foreground/70 max-w-xs mx-auto">
            Quando o lead enviar mensagens via WhatsApp, a IA Hunter mapeará o perfil
            automaticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {insights.general_profile && (
            <div className="rounded-xl border border-brand/20 bg-brand/5 p-5 space-y-2">
              <div className="flex items-center gap-2 text-brand text-xs font-bold uppercase tracking-widest">
                <Bot className="h-4 w-4" /> Perfil Comportamental
              </div>
              <p className="text-sm text-foreground leading-relaxed">{insights.general_profile}</p>
              <p className="text-[10px] text-muted-foreground">
                Atualizado em {new Date(insights.updated_at).toLocaleString("pt-BR")}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: "Desejos & Sonhos",
                items: insights.desires,
                icon: <Heart className="h-4 w-4" />,
                cls: "bg-success/10 text-success border-success/20",
                color: "text-success",
              },
              {
                title: "Medos & Bloqueios",
                items: insights.fears,
                icon: <AlertCircle className="h-4 w-4" />,
                cls: "bg-danger/10 text-danger border-danger/20",
                color: "text-danger",
              },
              {
                title: "Objeções Comerciais",
                items: insights.objections,
                icon: <ShieldAlert className="h-4 w-4" />,
                cls: "bg-warning/10 text-warning border-warning/20",
                color: "text-warning",
              },
              {
                title: "Sinais de Orçamento",
                items: insights.budget_signals,
                icon: <DollarSign className="h-4 w-4" />,
                cls: "bg-brand/10 text-brand border-brand/20",
                color: "text-brand",
              },
            ].map(({ title, items, icon, cls, color }) => (
              <div
                key={title}
                className="rounded-xl border border-border/80 bg-surface p-5 space-y-3"
              >
                <div
                  className={`flex items-center gap-2 ${color} text-xs font-bold uppercase tracking-widest`}
                >
                  {icon} {title}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(items ?? []).length > 0 ? (
                    items.map((item, i) => <Tag key={i} label={item} cls={cls} />)
                  ) : (
                    <span className="text-xs text-muted-foreground">Nenhum mapeado</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {insights.next_best_action && (
            <div className="rounded-xl border border-success/30 bg-success/5 p-5 space-y-2">
              <div className="flex items-center gap-2 text-success text-xs font-bold uppercase tracking-widest">
                <Sparkles className="h-4 w-4" /> Próxima Melhor Ação (NBA)
              </div>
              <p className="text-sm text-foreground font-medium leading-relaxed">
                {insights.next_best_action}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
