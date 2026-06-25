import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Sparkles,
  Loader2,
  Calendar,
  Users,
  Compass,
  ArrowRight,
  Brain,
  Trash2,
  BookOpen,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { useAgency } from "@/lib/agency-context";
import { HeaderPortal } from "@/components/shell/HeaderPortal";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { StatusBadge, fmtDate, GhostButton, PrimaryButton, Input, Select, Textarea, Field } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { fetchQuoteRequestsList, createQuoteRequest } from "@/services/quotes";
import { fetchClientsPick, fetchLeadsPick } from "@/services/proposals";
import { ingestKnowledgeDocument } from "@/services/quotes-rag";

export const Route = createFileRoute("/agency/$slug/quotes/")({
  head: () => ({ meta: [{ title: "Workspace de Cotações · TravelOS" }] }),
  component: QuotesIndexPage,
});

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  draft: "neutral",
  planning: "info",
  searching: "warning",
  completed: "success",
  converted: "success",
  cancelled: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  planning: "Planejando",
  searching: "Buscando",
  completed: "Concluído",
  converted: "Convertido",
  cancelled: "Cancelado",
};

const CATEGORY_LABEL: Record<string, string> = {
  gateway_rules: "Regras de Conexão (Gateway)",
  destinations: "Informações do Destino",
  guidelines: "Políticas Internas",
  hotel_reviews: "Avaliações de Hotéis",
};

function QuotesIndexPage() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/quotes/" });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"quotes" | "knowledge">("quotes");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);

  // Quote Creation Drawer State
  const [newOpen, setNewOpen] = useState(false);
  const [interpreting, setInterpreting] = useState(false);
  const [aiText, setAiText] = useState("");

  // RAG / Knowledge Base State
  const [newKnowledgeOpen, setNewKnowledgeOpen] = useState(false);
  const [knowledgeTitle, setKnowledgeTitle] = useState("");
  const [knowledgeContent, setKnowledgeContent] = useState("");
  const [knowledgeCategory, setKnowledgeCategory] = useState("gateway_rules");
  const [knowledgeScope, setKnowledgeScope] = useState<"global" | "agency">("agency");
  const [ingesting, setIngesting] = useState(false);
  const [feedingDefaults, setFeedingDefaults] = useState(false);

  // Form states for manual additions
  const [clientId, setClientId] = useState("");
  const [leadId, setLeadId] = useState("");
  const [title, setTitle] = useState("");
  const [origin, setOrigin] = useState("CXP");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [budget, setBudget] = useState(10000);

  // Queries
  const { data: quotes = [], isLoading } = useQuery({
    enabled: !!agency && activeTab === "quotes",
    queryKey: ["quote-requests", agency?.id],
    queryFn: () => fetchQuoteRequestsList(agency!.id),
  });

  const { data: clients = [] } = useQuery({
    enabled: !!agency,
    queryKey: ["clients-pick", agency?.id],
    queryFn: () => fetchClientsPick(agency!.id),
  });

  const { data: leads = [] } = useQuery({
    enabled: !!agency,
    queryKey: ["leads-pick", agency?.id],
    queryFn: () => fetchLeadsPick(agency!.id),
  });

  // Query user role to check if super admin (only super admins can publish global rules)
  const { data: userRole = "agent" } = useQuery({
    enabled: !!agency,
    queryKey: ["user-role", agency?.id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "agent";
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("agency_id", agency!.id)
        .maybeSingle();
      return data?.role || "agent";
    }
  });
  const isSuperAdmin = userRole === "super_admin";

  // Query existing RAG documents
  const { data: knowledgeDocs = [], isLoading: isDocsLoading } = useQuery({
    enabled: !!agency && activeTab === "knowledge",
    queryKey: ["knowledge-documents", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_documents" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const filteredQuotes = quotes.filter((q) => {
    const term = debouncedSearch.toLowerCase();
    if (!term) return true;
    const clientName = q.client?.full_name?.toLowerCase() || "";
    const leadName = q.lead?.name?.toLowerCase() || "";
    const destName = (q.normalized_intent as any)?.destinations?.[0]?.name?.toLowerCase() || "";
    return clientName.includes(term) || leadName.includes(term) || destName.includes(term);
  });

  const filteredDocs = knowledgeDocs.filter((d: any) => {
    const term = debouncedSearch.toLowerCase();
    if (!term) return true;
    return d.title.toLowerCase().includes(term) || d.content.toLowerCase().includes(term);
  });

  // AI intent interpreter
  async function handleAiInterpret() {
    if (!aiText.trim()) return toast.error("Escreva um texto para interpretar");
    setInterpreting(true);
    try {
      const prompt = `Traduza a intenção de viagem em linguagem natural fornecida abaixo em um JSON estruturado seguindo este formato exato:
{
  "title": "Cotação para [Destino]",
  "origin": [{"code": "CXP", "name": "Chapecó"}],
  "destinations": [{"code": "[Código IATA ou Nome]", "name": "[Nome do Destino]"}],
  "dateWindow": {
    "start": "YYYY-MM-DD",
    "end": "YYYY-MM-DD",
    "flexDays": 3
  },
  "duration": {
    "minNights": 5,
    "maxNights": 7
  },
  "travelers": {
    "adults": 2,
    "children": 0,
    "infants": 0
  },
  "budget": {
    "amount": 10000,
    "currency": "BRL",
    "priority": "medium"
  },
  "productTypes": ["flight", "hotel", "transfer"]
}
Texto: "${aiText}"`;

      const { data, error } = await supabase.functions.invoke("ai-orchestrator", {
        body: {
          action: "completion",
          prompt,
          systemPrompt: "Você é o assistente inteligente de viagens do TravelOS. Extraia informações de voos, hotéis, datas, viajantes e orçamento e monte exatamente o JSON solicitado.",
          modelPreference: "smart",
        },
      });

      if (error) throw error;
      const text = data?.result || "";
      const match = text.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : text);

      if (parsed.title) setTitle(parsed.title);
      if (parsed.destinations?.[0]?.name) setDestination(parsed.destinations[0].name);
      if (parsed.origin?.[0]?.code) setOrigin(parsed.origin[0].code);
      if (parsed.dateWindow?.start) setStartDate(parsed.dateWindow.start);
      if (parsed.dateWindow?.end) setEndDate(parsed.dateWindow.end);
      if (parsed.travelers?.adults) setAdults(parsed.travelers.adults);
      if (parsed.travelers?.children) setChildren(parsed.travelers.children);
      if (parsed.budget?.amount) setBudget(parsed.budget.amount);

      toast.success("Intenção de viagem interpretada com sucesso! Ajuste os campos se necessário.");
    } catch (e: any) {
      console.error(e);
      toast.error("Não foi possível interpretar o texto com IA. Preencha os campos manualmente.");
    } finally {
      setInterpreting(false);
    }
  }

  // Save Mutation
  const saveMut = useMutation({
    mutationFn: async () => {
      if (!agency) throw new Error("Agência não identificada");
      if (!destination) throw new Error("Destino é obrigatório");

      const normalized_intent = {
        agencyId: agency.id,
        clientId: clientId || undefined,
        leadId: leadId || undefined,
        requestedBy: "agent",
        origin: [{ code: origin, name: origin === "CXP" ? "Chapecó" : origin }],
        destinations: [{ code: destination.substring(0, 3).toUpperCase(), name: destination }],
        dateWindow: {
          start: startDate || new Date().toISOString().split("T")[0],
          end: endDate || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
          flexDays: 3,
        },
        duration: {
          minNights: 5,
          maxNights: 7,
        },
        travelers: {
          adults,
          children,
          infants: 0,
        },
        budget: {
          amount: budget,
          currency: "BRL",
          priority: "medium" as const,
        },
        productTypes: ["flight", "hotel", "transfer"],
        source: "manual" as const,
      };

      const result = await createQuoteRequest(
        agency.id,
        {
          lead_id: leadId || undefined,
          client_id: clientId || undefined,
          source: "manual",
          raw_request: aiText || undefined,
          normalized_intent,
        },
        [
          { traveler_type: "adult", age: 30 },
          ...(children > 0 ? Array.from({ length: children }).map(() => ({ traveler_type: "child", age: 8 })) : []),
        ],
        [
          { key: "comfort", value: "high", priority: 1 },
          { key: "stops", value: "0", priority: 2 },
        ]
      );
      return result;
    },
    onSuccess: (data) => {
      toast.success("Cotação criada com sucesso!");
      qc.invalidateQueries({ queryKey: ["quote-requests"] });
      setNewOpen(false);
      navigate({ to: "/agency/$slug/quotes/$id", params: { slug, id: data.id } });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Ingest Knowledge Base
  async function handleIngestKnowledge() {
    if (!agency) return;
    if (!knowledgeTitle.trim() || !knowledgeContent.trim()) {
      return toast.error("Título e conteúdo são obrigatórios");
    }
    setIngesting(true);
    try {
      await ingestKnowledgeDocument(
        agency.id,
        knowledgeTitle.trim(),
        knowledgeContent.trim(),
        knowledgeCategory,
        knowledgeScope
      );
      toast.success("Diretriz indexada e auto-alimentada com embeddings RAG!");
      qc.invalidateQueries({ queryKey: ["knowledge-documents", agency.id] });
      setNewKnowledgeOpen(false);
      setKnowledgeTitle("");
      setKnowledgeContent("");
    } catch (e: any) {
      toast.error(e.message || "Erro ao indexar diretriz");
    } finally {
      setIngesting(false);
    }
  }

  // Preencher Cérebro Semântico com Diretrizes Padrão
  async function handleFeedDefaultGuidelines() {
    if (!agency) return;
    setFeedingDefaults(true);
    try {
      const defaults = [
        {
          title: "Diretrizes Logísticas: Jericoacoara via Fortaleza",
          content: "Fortaleza (FOR) para Jericoacoara (JJD): O último horário de transfer direto por dunas seguro é 18:00. O percurso dura 240 minutos (4 horas). Chegadas em Fortaleza após as 18:00 exigem pernoite intermediário no gateway para segurança.",
          category: "gateway_rules"
        },
        {
          title: "Diretrizes Logísticas: São Miguel dos Milagres via Maceió",
          content: "Maceió (MCZ) para São Miguel dos Milagres: O último horário de transfer direto seguro é 20:00. O percurso dura 120 minutos (2 horas). Chegadas em Maceió após as 20:00 exigem pernoite intermediário no gateway.",
          category: "gateway_rules"
        },
        {
          title: "Diretrizes Logísticas: Morro de São Paulo via Salvador",
          content: "Salvador (SSA) para Morro de São Paulo: O último catamarã do dia parte às 16:30. O percurso dura 150 minutos (2,5 horas). Chegadas em Salvador após as 16:30 exigem pernoite intermediário no gateway.",
          category: "gateway_rules"
        }
      ];

      const scope = isSuperAdmin ? "global" : "agency";

      for (const item of defaults) {
        await ingestKnowledgeDocument(
          agency.id,
          item.title,
          item.content,
          item.category,
          scope
        );
      }

      toast.success("Diretrizes padrão indexadas e alimentadas com sucesso!");
      qc.invalidateQueries({ queryKey: ["knowledge-documents", agency.id] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao alimentar diretrizes padrão");
    } finally {
      setFeedingDefaults(false);
    }
  }

  // Delete Mutation
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quote_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cotação excluída com sucesso");
      qc.invalidateQueries({ queryKey: ["quote-requests"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Delete Knowledge Mutation
  const deleteKnowledgeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("knowledge_documents" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Diretriz excluída com sucesso");
      qc.invalidateQueries({ queryKey: ["knowledge-documents", agency?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="flex h-[calc(100vh-var(--header-h))] flex-col overflow-hidden bg-background">
      <HeaderPortal>
        <div className="flex items-center gap-2">
          {activeTab === "quotes" ? (
            <PrimaryButton onClick={() => setNewOpen(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Nova Cotação VibeTour
            </PrimaryButton>
          ) : (
            <div className="flex gap-2">
              <GhostButton
                onClick={handleFeedDefaultGuidelines}
                disabled={feedingDefaults}
                className="gap-1.5 border border-border"
              >
                {feedingDefaults ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Carregar Regras Padrão
              </GhostButton>
              <PrimaryButton onClick={() => setNewKnowledgeOpen(true)} className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90">
                <Sparkles className="h-3.5 w-3.5" />
                Auto-Alimentar Diretriz (IA)
              </PrimaryButton>
            </div>
          )}
        </div>
      </HeaderPortal>

      <PageHeader
        title="Motor Inteligente de Cotações VibeTour"
        description="Analise rotas, regras logísticas de gateways, configure o cérebro semântico RAG e tome decisões em tempo real."
      />

      {/* Tab Switcher */}
      <div className="flex border-b border-border bg-surface px-4 md:px-6 shrink-0 gap-4">
        <button
          onClick={() => {
            setActiveTab("quotes");
            setSearchQuery("");
          }}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === "quotes"
              ? "border-brand text-brand"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Cotações Ativas
        </button>
        <button
          onClick={() => {
            setActiveTab("knowledge");
            setSearchQuery("");
          }}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === "knowledge"
              ? "border-brand text-brand"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Cérebro Global & RAG (Memória)
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border bg-surface/50 px-4 md:px-6 py-3 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            className="w-full h-8 pl-8 pr-3 rounded border border-border bg-surface text-xs outline-none focus:border-brand"
            placeholder={activeTab === "quotes" ? "Buscar por cliente, lead ou destino..." : "Buscar nas memórias e diretrizes..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "quotes" ? (
          isLoading ? (
            <div className="flex h-64 w-full items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando cotações...
            </div>
          ) : filteredQuotes.length === 0 ? (
            <EmptyState
              title="Nenhuma cotação cadastrada"
              description="Crie uma cotação rápida baseada em IA ou configure cenários logísticos."
              action={<PrimaryButton onClick={() => setNewOpen(true)}>Criar Cotação</PrimaryButton>}
            />
          ) : (
            <div className="border-t border-border">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-alt border-b border-border text-muted-foreground font-semibold">
                    <th className="px-4 py-3">Cliente / Lead</th>
                    <th className="px-4 py-3">Destino</th>
                    <th className="px-4 py-3">Datas Planejadas</th>
                    <th className="px-4 py-3">Viajantes</th>
                    <th className="px-4 py-3">Orçamento</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {filteredQuotes.map((q) => {
                    const intent = q.normalized_intent as any;
                    const destName = intent?.destinations?.[0]?.name || "Não informado";
                    const startStr = intent?.dateWindow?.start || "";
                    const endStr = intent?.dateWindow?.end || "";
                    const pax = intent?.travelers || { adults: 2, children: 0 };
                    const budgetVal = intent?.budget?.amount || 0;

                    return (
                      <tr key={q.id} className="hover:bg-surface-alt/50 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-foreground">
                            {q.client?.full_name || q.lead?.name || "Sem contato vinculado"}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {q.client ? "Cliente cadastrado" : q.lead ? "Lead/Oportunidade" : "Apenas pesquisa"}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1 font-medium text-foreground">
                            <Compass className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            {destName}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-foreground">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span>{fmtDate(startStr)}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span>{fmtDate(endStr)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">
                          {pax.adults} adultos
                          {pax.children > 0 && ` + ${pax.children} crianças`}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-foreground">
                          {budgetVal > 0 ? `R$ ${budgetVal.toLocaleString()}` : "N/D"}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge tone={STATUS_TONE[q.status]}>
                            {STATUS_LABEL[q.status] || q.status}
                          </StatusBadge>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              to="/agency/$slug/quotes/$id"
                              params={{ slug, id: q.id }}
                              className="inline-flex h-7 items-center justify-center rounded border border-border bg-surface px-2.5 text-[11px] font-bold text-foreground hover:bg-surface-alt"
                            >
                              Central de Decisão
                            </Link>
                            <button
                              onClick={() => {
                                if (confirm("Deseja realmente excluir esta cotação e todos os cenários associados?")) {
                                  deleteMut.mutate(q.id);
                                }
                              }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-danger hover:bg-danger-bg hover:border-danger/30 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Tab: RAG Knowledge Management */
          isDocsLoading ? (
            <div className="flex h-64 w-full items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando cérebro semântico...
            </div>
          ) : filteredDocs.length === 0 ? (
            <EmptyState
              title="Cérebro semântico vazio"
              description="Escreva diretrizes logísticas ou revisões de hotéis para alimentar o RAG e o validador."
              action={
                <div className="flex gap-2 justify-center">
                  <GhostButton
                    onClick={handleFeedDefaultGuidelines}
                    disabled={feedingDefaults}
                    className="border border-border"
                  >
                    {feedingDefaults ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Carregar Regras Padrão
                  </GhostButton>
                  <PrimaryButton onClick={() => setNewKnowledgeOpen(true)}>Adicionar Diretriz</PrimaryButton>
                </div>
              }
            />
          ) : (
            <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDocs.map((doc: any) => (
                <div key={doc.id} className="rounded border border-border bg-surface p-4 flex flex-col justify-between shadow-xs hover:border-brand/40 transition-colors">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h4 className="text-xs font-bold text-foreground line-clamp-1">{doc.title}</h4>
                      <StatusBadge tone={doc.scope === "global" ? "success" : "info"}>
                        {doc.scope === "global" ? "Global" : "Agência"}
                      </StatusBadge>
                    </div>
                    <span className="text-[10px] text-muted-foreground block mb-3 font-semibold uppercase tracking-wider">
                      {CATEGORY_LABEL[doc.category] || doc.category}
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">{doc.content}</p>
                  </div>

                  <div className="border-t border-border mt-4 pt-3 flex items-center justify-between shrink-0">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      {doc.scope === "global" ? (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5 text-success shrink-0" />
                          Curadoria VibeTour
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-3.5 w-3.5 text-brand shrink-0" />
                          Customizado Agência
                        </>
                      )}
                    </span>
                    
                    {/* Delete button (only super admins can delete global rules; agency members can delete agency ones) */}
                    {(doc.scope === "agency" || isSuperAdmin) && (
                      <button
                        onClick={() => {
                          if (confirm("Deseja realmente excluir esta diretriz e remover seus embeddings RAG?")) {
                            deleteKnowledgeMut.mutate(doc.id);
                          }
                        }}
                        className="p-1 rounded text-danger hover:bg-danger-bg hover:text-danger transition-colors cursor-pointer"
                        title="Excluir diretriz"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* New Quote Sheet */}
      {newOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-overlay/50 backdrop-blur-xs" onClick={() => setNewOpen(false)}>
          <div
            className="h-full w-full max-w-2xl overflow-y-auto border-l border-border bg-surface p-6 shadow-xl flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
                <div>
                  <h2 className="ds-h3 text-foreground flex items-center gap-2">
                    <Brain className="h-5 w-5 text-brand" />
                    Criar Cotação Inteligente VibeTour
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Escreva o roteiro desejado ou insira os parâmetros manualmente para rodar a pesquisa GDS.
                  </p>
                </div>
                <button
                  onClick={() => setNewOpen(false)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-surface-alt hover:text-foreground transition-colors"
                >
                  <Plus className="h-5 w-5 rotate-45" />
                </button>
              </div>

              {/* AI Conversation Parser Section */}
              <div className="bg-surface-alt/40 border border-border/80 rounded p-4 mb-6">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  <Sparkles className="h-3.5 w-3.5 text-brand" />
                  Interpretar com IA (Opcional)
                </div>
                <Textarea
                  placeholder="Ex: Casal com 1 criança de 5 anos quer viajar de Chapecó para Jericoacoara. Saída no dia 15 de Outubro, voltando dia 22 de Outubro. Querem um hotel confortável com piscina e transfer incluso. Orçamento total de R$ 12 mil."
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex justify-end mt-2">
                  <PrimaryButton
                    type="button"
                    onClick={handleAiInterpret}
                    disabled={interpreting || !aiText.trim()}
                    className="h-8 text-[11px]"
                  >
                    {interpreting ? (
                      <>
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                        Interpretando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-1.5 h-3 w-3" />
                        Auto-Preencher via IA
                      </>
                    )}
                  </PrimaryButton>
                </div>
              </div>

              {/* Manual overrides / details */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Cliente Vinculado">
                  <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                    <option value="">— Sem cliente —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Negociação / Lead (Opcional)">
                  <Select value={leadId} onChange={(e) => setLeadId(e.target.value)}>
                    <option value="">— Sem lead associado —</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Origem (IATA)">
                  <Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="CXP" maxLength={3} />
                </Field>

                <Field label="Destino">
                  <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Ex: Jericoacoara ou Fortaleza" />
                </Field>

                <Field label="Data de Ida">
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </Field>

                <Field label="Data de Volta">
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </Field>

                <div className="grid grid-cols-3 gap-2 col-span-2">
                  <Field label="Adultos">
                    <Input type="number" min={1} value={adults} onChange={(e) => setAdults(Number(e.target.value))} />
                  </Field>

                  <Field label="Crianças">
                    <Input type="number" min={0} value={children} onChange={(e) => setChildren(Number(e.target.value))} />
                  </Field>

                  <Field label="Orçamento Limite (R$)">
                    <Input type="number" min={0} value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
                  </Field>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4 mt-8 flex justify-end gap-3 shrink-0">
              <GhostButton type="button" onClick={() => setNewOpen(false)}>
                Cancelar
              </GhostButton>
              <PrimaryButton
                type="button"
                onClick={() => saveMut.mutate()}
                disabled={saveMut.isPending || !destination}
              >
                {saveMut.isPending ? "Criando..." : "Salvar e Configurar Cenários"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* New Knowledge Guideline Sheet */}
      {newKnowledgeOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-overlay/50 backdrop-blur-xs" onClick={() => setNewKnowledgeOpen(false)}>
          <div
            className="h-full w-full max-w-2xl overflow-y-auto border-l border-border bg-surface p-6 shadow-xl flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
                <div>
                  <h2 className="ds-h3 text-foreground flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-brand" />
                    Auto-Alimentar Cérebro RAG (IA)
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Insira diretrizes operacionais de destinos. O sistema as segmentará e gerará embeddings de 1536 dimensões automaticamente.
                  </p>
                </div>
                <button
                  onClick={() => setNewKnowledgeOpen(false)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-surface-alt hover:text-foreground transition-colors"
                >
                  <Plus className="h-5 w-5 rotate-45" />
                </button>
              </div>

              <div className="space-y-4">
                <Field label="Título da Diretriz / Regra">
                  <Input
                    placeholder="Ex: Regras de Transfer de Jericoacoara via Fortaleza"
                    value={knowledgeTitle}
                    onChange={(e) => setKnowledgeTitle(e.target.value)}
                  />
                </Field>

                <Field label="Categoria de Conhecimento">
                  <Select value={knowledgeCategory} onChange={(e) => setKnowledgeCategory(e.target.value)}>
                    <option value="gateway_rules">Regras de Conexão (Gateway)</option>
                    <option value="destinations">Informações de Destino</option>
                    <option value="guidelines">Políticas Internas / Agência</option>
                    <option value="hotel_reviews">Qualidade & Críticas de Hotéis</option>
                  </Select>
                </Field>

                <Field label="Escopo de Distribuição">
                  <Select value={knowledgeScope} onChange={(e) => setKnowledgeScope(e.target.value as any)}>
                    <option value="agency">Minha Agência (Isolado)</option>
                    {isSuperAdmin ? (
                      <option value="global">Cérebro Global VibeTour (Sistema Inteiro)</option>
                    ) : (
                      <option value="global" disabled>
                        Cérebro Global VibeTour (Requer Admin Global)
                      </option>
                    )}
                  </Select>
                </Field>

                <Field label="Conteúdo / Diretrizes Textuais">
                  <Textarea
                    placeholder="Descreva as regras, buffers de horários, hotéis recomendados ou restrições do destino..."
                    value={knowledgeContent}
                    onChange={(e) => setKnowledgeContent(e.target.value)}
                    className="min-h-[160px]"
                  />
                </Field>
              </div>
            </div>

            <div className="border-t border-border pt-4 mt-8 flex justify-end gap-3 shrink-0">
              <GhostButton type="button" onClick={() => setNewKnowledgeOpen(false)}>
                Cancelar
              </GhostButton>
              <PrimaryButton
                type="button"
                onClick={handleIngestKnowledge}
                disabled={ingesting || !knowledgeTitle.trim() || !knowledgeContent.trim()}
              >
                {ingesting ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Gerando Vetores pgvector...
                  </>
                ) : (
                  "Salvar e Sincronizar Cérebro"
                )}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
