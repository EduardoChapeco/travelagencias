import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Plus, Sparkles, Loader2, Calendar, Users, Compass, ArrowRight, Brain, Trash2, BookOpen, ShieldCheck, UserCheck, Zap, Bell, BellOff, CheckCircle2, XCircle, ToggleLeft, ToggleRight, AlertTriangle, TrendingDown, Eye, } from "lucide-react";
import { useAgency } from "@/lib/agency-context";
import { Button, GhostButton, PrimaryButton } from "@/components/ui/button";
import { PageHeader, EmptyState, ModuleActionButton } from "@/components/shell/PageHeader";
import { FormInput as Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormTextarea as Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { fetchQuoteRequestsList, createQuoteRequest } from "@/services/quotes";
import { fetchClientsPick, fetchLeadsPick } from "@/services/proposals";
import { ingestKnowledgeDocument } from "@/services/quotes-rag";
import {
  fetchAgencyRules,
  fetchRuleCandidates,
  approveRuleCandidate,
  rejectRuleCandidate,
  toggleRuleStatus,
  deleteRule,
} from "@/services/quotes-rules-admin";
import {
  fetchWatchProfiles,
  createWatchProfile,
  toggleWatchProfileStatus,
  deleteWatchProfile,
  fetchPromotionCandidates,
  updatePromotionStatus,
} from "@/services/quotes-promotions";

export const Route = createFileRoute("/agency/$slug/quotes/")({
  head: ({ context }: any) => ({ meta: [{ title: `Workspace de Cotações · ${context?.brand?.platform_name || 'Turis'}` }] }),
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

  const [activeTab, setActiveTab] = useState<"quotes" | "knowledge" | "rules" | "promotions">("quotes");
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

  // WatchProfile Creation State
  const [watcherOpen, setWatcherOpen] = useState(false);
  const [watcherName, setWatcherName] = useState("");
  const [watcherOrigin, setWatcherOrigin] = useState("CXP");
  const [watcherDest, setWatcherDest] = useState("");
  const [watcherMaxPrice, setWatcherMaxPrice] = useState<number>(3000);
  const [watcherMinRating, setWatcherMinRating] = useState<number>(3);
  const [watcherType, setWatcherType] = useState<"flight" | "hotel" | "package">("package");

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
  const { data: quotes = [], isLoading, isError: isQuotesError, error: quotesError } = useQuery({
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return "agent";
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("agency_id", agency!.id)
        .maybeSingle();
      return data?.role || "agent";
    },
  });
  const isSuperAdmin = userRole === "super_admin";

  // Query existing RAG documents
  const { data: knowledgeDocs = [], isLoading: isDocsLoading, isError: isDocsError, error: docsError } = useQuery({
    enabled: !!agency && activeTab === "knowledge",
    queryKey: ["knowledge-documents", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_documents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // ── Rules & AI tab queries ──────────────────────────────────────────────
  const { data: agencyRules = [], isLoading: isRulesLoading, isError: isRulesError, error: rulesError } = useQuery({
    enabled: !!agency && activeTab === "rules",
    queryKey: ["agency-rules", agency?.id],
    queryFn: () => fetchAgencyRules(agency!.id),
  });

  const { data: ruleCandidates = [], isLoading: isCandidatesLoading, isError: isCandidatesError, error: candidatesError } = useQuery({
    enabled: !!agency && activeTab === "rules",
    queryKey: ["rule-candidates", agency?.id],
    queryFn: () => fetchRuleCandidates(agency!.id),
  });

  // ── Promotions tab queries ──────────────────────────────────────────────
  const { data: watchProfiles = [], isLoading: isWatchersLoading, isError: isWatchersError, error: watchersError } = useQuery({
    enabled: !!agency && activeTab === "promotions",
    queryKey: ["watch-profiles", agency?.id],
    queryFn: () => fetchWatchProfiles(agency!.id),
  });

  const { data: promotionCandidates = [], isLoading: isPromotionsLoading, isError: isPromotionsError, error: promotionsError } = useQuery({
    enabled: !!agency && activeTab === "promotions",
    queryKey: ["promotion-candidates", agency?.id],
    queryFn: () => fetchPromotionCandidates(agency!.id),
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
          systemPrompt:
            "Você é o assistente inteligente de viagens do Turis. Extraia informações de voos, hotéis, datas, viajantes e orçamento e monte exatamente o JSON solicitado.",
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
          ...(children > 0
            ? Array.from({ length: children }).map(() => ({ traveler_type: "child", age: 8 }))
            : []),
        ],
        [
          { key: "comfort", value: "high", priority: 1 },
          { key: "stops", value: "0", priority: 2 },
        ],
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
        knowledgeScope,
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
          content:
            "Fortaleza (FOR) para Jericoacoara (JJD): O último horário de transfer direto por dunas seguro é 18:00. O percurso dura 240 minutos (4 horas). Chegadas em Fortaleza após as 18:00 exigem pernoite intermediário no gateway para segurança.",
          category: "gateway_rules",
        },
        {
          title: "Diretrizes Logísticas: São Miguel dos Milagres via Maceió",
          content:
            "Maceió (MCZ) para São Miguel dos Milagres: O último horário de transfer direto seguro é 20:00. O percurso dura 120 minutos (2 horas). Chegadas em Maceió após as 20:00 exigem pernoite intermediário no gateway.",
          category: "gateway_rules",
        },
        {
          title: "Diretrizes Logísticas: Morro de São Paulo via Salvador",
          content:
            "Salvador (SSA) para Morro de São Paulo: O último catamarã do dia parte às 16:30. O percurso dura 150 minutos (2,5 horas). Chegadas em Salvador após as 16:30 exigem pernoite intermediário no gateway.",
          category: "gateway_rules",
        },
      ];

      const scope = isSuperAdmin ? "global" : "agency";

      for (const item of defaults) {
        await ingestKnowledgeDocument(agency.id, item.title, item.content, item.category, scope);
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
      const { error } = await supabase
        .from("knowledge_documents")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Diretriz excluída com sucesso");
      qc.invalidateQueries({ queryKey: ["knowledge-documents", agency?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Rules mutations ────────────────────────────────────────────────────
  const approveCandidateMut = useMutation({
    mutationFn: async (candidateId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada");
      return approveRuleCandidate(candidateId, user.id);
    },
    onSuccess: () => {
      toast.success("Sugestão aprovada e regra ativa criada com sucesso!");
      qc.invalidateQueries({ queryKey: ["rule-candidates", agency?.id] });
      qc.invalidateQueries({ queryKey: ["agency-rules", agency?.id] });
    },
    onError: (e: any) => toast.error("Erro ao aprovar: " + e.message),
  });

  const rejectCandidateMut = useMutation({
    mutationFn: async (candidateId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada");
      return rejectRuleCandidate(candidateId, user.id);
    },
    onSuccess: () => {
      toast.success("Sugestão rejeitada.");
      qc.invalidateQueries({ queryKey: ["rule-candidates", agency?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleRuleMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "paused" }) =>
      toggleRuleStatus(id, status),
    onSuccess: () => {
      toast.success("Status da regra atualizado.");
      qc.invalidateQueries({ queryKey: ["agency-rules", agency?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteRuleMut = useMutation({
    mutationFn: (id: string) => deleteRule(id),
    onSuccess: () => {
      toast.success("Regra excluída.");
      qc.invalidateQueries({ queryKey: ["agency-rules", agency?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Watch profile mutations ────────────────────────────────────────────
  const createWatcherMut = useMutation({
    mutationFn: async () => {
      if (!agency) throw new Error("Agência não encontrada");
      if (!watcherName.trim()) throw new Error("Nome do alerta é obrigatório");
      if (!watcherDest.trim()) throw new Error("Destino é obrigatório");
      return createWatchProfile(agency.id, {
        name: watcherName.trim(),
        schedule: "daily",
        criteria: {
          origin: watcherOrigin || undefined,
          destination: watcherDest.trim(),
          maxPrice: watcherMaxPrice > 0 ? watcherMaxPrice : undefined,
          minHotelRating: watcherMinRating > 0 ? watcherMinRating : undefined,
          productType: watcherType,
        },
      });
    },
    onSuccess: () => {
      toast.success("Alerta de promoção criado com sucesso!");
      setWatcherOpen(false);
      setWatcherName("");
      setWatcherDest("");
      setWatcherMaxPrice(3000);
      setWatcherMinRating(3);
      setWatcherType("package");
      qc.invalidateQueries({ queryKey: ["watch-profiles", agency?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleWatcherMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "paused" }) =>
      toggleWatchProfileStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watch-profiles", agency?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteWatcherMut = useMutation({
    mutationFn: (id: string) => deleteWatchProfile(id),
    onSuccess: () => {
      toast.success("Alerta removido.");
      qc.invalidateQueries({ queryKey: ["watch-profiles", agency?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updatePromotionMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "dismissed" }) =>
      updatePromotionStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promotion-candidates", agency?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="flex h-full flex-col overflow-hidden">
              <PageHeader
          title="Cotações"
          search={{
            value: searchQuery,
            onChange: setSearchQuery,
            placeholder: "Buscar...",
          }}
          filters={[
            { label: "Ativas", value: "quotes" },
            { label: "Cérebro & RAG", value: "knowledge" },
            { label: "Regras IA", value: "rules" },
            { label: "Promoções", value: "promotions" },
          ]}
          activeFilter={activeTab}
          onFilterChange={(v) => {
            setActiveTab(v as any);
            setSearchQuery("");
          }}
          actions={
            activeTab === "knowledge" ? (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFeedDefaultGuidelines}
                  disabled={feedingDefaults}
                >
                  {feedingDefaults ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                  Padrões
                </Button>
                <Button
                  size="sm"
                  onClick={() => setNewKnowledgeOpen(true)}
                >
                  <Sparkles className="h-3 w-3" />
                  Alimentar Diretriz
                </Button>
              </div>
            ) : undefined
          }
          primaryAction={
            activeTab === "quotes" ? (
              <ModuleActionButton
                label="Nova Cotação"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => setNewOpen(true)}
              />
            ) : activeTab === "promotions" ? (
              <ModuleActionButton
                label="Novo Alerta"
                icon={<Bell className="h-3.5 w-3.5" />}
                onClick={() => setWatcherOpen(true)}
              />
            ) : undefined
          }
        />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden px-4  md:pr-6 py-4 flex flex-col min-h-0 pb-24">
        {activeTab === "quotes" ? (
          isQuotesError ? (
            <div className="p-4 rounded-[var(--radius-card)] glass-error text-xs flex items-center gap-2 m-6">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Erro ao obter workspace de cotações: {quotesError instanceof Error ? quotesError.message : "Erro desconhecido"}</span>
            </div>
          ) : isLoading ? (
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
            <div className="flex-1 rounded-[var(--radius-card)] glass text-white bg-black/40 backdrop-blur-2xl-panel overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto no-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-white/50 font-semibold">
                    <th className="px-4 py-3">Cliente / Lead</th>
                    <th className="px-4 py-3">Destino</th>
                    <th className="px-4 py-3">Datas Planejadas</th>
                    <th className="px-4 py-3">Viajantes</th>
                    <th className="px-4 py-3">Orçamento</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border glass-card border-none">
                  {filteredQuotes.map((q) => {
                    const intent = q.normalized_intent as any;
                    const destName = intent?.destinations?.[0]?.name || "Não informado";
                    const startStr = intent?.dateWindow?.start || "";
                    const endStr = intent?.dateWindow?.end || "";
                    const pax = intent?.travelers || { adults: 2, children: 0 };
                    const budgetVal = intent?.budget?.amount || 0;

                    return (
                      <tr key={q.id} className="hover:glass bg-white/5 border-white/10/50 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-foreground">
                            {q.client?.full_name || q.lead?.name || "Sem contato vinculado"}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {q.client
                              ? "Cliente cadastrado"
                              : q.lead
                                ? "Lead/Oportunidade"
                                : "Apenas pesquisa"}
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
                              className="inline-flex h-7 items-center justify-center rounded border-none glass-card border-none px-2.5 text-[11px] font-bold text-foreground hover:glass bg-white/5 border-white/10"
                            >
                              Central de Decisão
                            </Link>
                            <Button
                              onClick={() => {
                                if (
                                  confirm(
                                    "Deseja realmente excluir esta cotação e todos os cenários associados?",
                                  )
                                ) {
                                  deleteMut.mutate(q.id);
                                }
                              }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded border-none text-danger hover:bg-danger-bg hover:border-danger/30 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : /* Tab: RAG Knowledge Management */
        isDocsError ? (
          <div className="p-4 rounded-[var(--radius-card)] glass-error text-xs flex items-center gap-2 m-6">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Erro ao carregar cérebro semântico: {docsError instanceof Error ? docsError.message : "Erro desconhecido"}</span>
          </div>
        ) : isDocsLoading ? (
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
                  className="border-none"
                >
                  {feedingDefaults ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Carregar Regras Padrão
                </GhostButton>
                <PrimaryButton onClick={() => setNewKnowledgeOpen(true)}>
                  Adicionar Diretriz
                </PrimaryButton>
              </div>
            }
          />
        ) : (
          <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocs.map((doc: any) => (
              <div
                key={doc.id}
                className="rounded border-none glass-card border-none p-4 flex flex-col justify-between shadow-xs hover:border-brand/40 transition-colors"
              >
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
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                    {doc.content}
                  </p>
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
                    <Button
                      onClick={() => {
                        if (
                          confirm(
                            "Deseja realmente excluir esta diretriz e remover seus embeddings RAG?",
                          )
                        ) {
                          deleteKnowledgeMut.mutate(doc.id);
                        }
                      }}
                      className="p-1 rounded text-danger hover:bg-danger-bg hover:text-danger transition-colors cursor-pointer"
                      title="Excluir diretriz"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab: Regras & IA ─────────────────────────────────────────────── */}
        {activeTab === "rules" && (
          <div className="p-4 md:p-6 space-y-8">
            {(isRulesError || isCandidatesError) && (
              <div className="p-4 rounded-[var(--radius-card)] glass-error text-xs flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Erro ao carregar regras ou sugestões de regras.</span>
              </div>
            )}

            {/* Sugestões da IA — rule_candidates pendentes */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-warning" />
                <h3 className="text-sm font-bold text-foreground">Sugestões da IA para Revisão</h3>
                {isCandidatesLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>

              {ruleCandidates.filter((c: any) => c.status === "pending").length === 0 ? (
                <div className="rounded border-none glass-card border-none p-6 text-center">
                  <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2 opacity-60" />
                  <p className="text-xs text-muted-foreground">Nenhuma sugestão pendente de revisão.</p>
                  <p className="text-[10px] text-muted-foreground mt-1">O motor de aprendizado irá sugerir novas regras conforme as cotações forem processadas.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ruleCandidates
                    .filter((c: any) => c.status === "pending")
                    .map((cand: any) => {
                      const proposed = cand.proposed_rule as any;
                      return (
                        <div key={cand.id} className="rounded border border-warning/30 bg-warning/5 p-4 flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
                                <span className="text-xs font-bold text-foreground">{cand.pattern}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {cand.sample_size} casos analisados · confiança {Math.round(Number(cand.confidence) * 100)}%
                              </span>
                            </div>
                            <StatusBadge tone="warning">Pendente</StatusBadge>
                          </div>

                          {proposed?.effect && (
                            <div className="glass-card border-none rounded border-none p-2">
                              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Efeito Proposto</div>
                              <pre className="text-[10px] text-foreground whitespace-pre-wrap break-all font-mono">
                                {JSON.stringify(proposed.effect, null, 2)}
                              </pre>
                            </div>
                          )}

                          {cand.simulated_impact && (
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <TrendingDown className="h-3 w-3" />
                              Impacto simulado registrado
                            </div>
                          )}

                          <div className="flex gap-2 mt-1">
                            <Button
                              onClick={() => approveCandidateMut.mutate(cand.id)}
                              disabled={approveCandidateMut.isPending}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded border border-success/40 bg-success/10 text-[11px] font-bold text-success hover:bg-success/20 transition-colors disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Aprovar e Ativar Regra
                            </Button>
                            <Button
                              onClick={() => rejectCandidateMut.mutate(cand.id)}
                              disabled={rejectCandidateMut.isPending}
                              className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded border border-danger/30 bg-danger/5 text-[11px] font-bold text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Rejeitar
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Regras Ativas — decision_rules */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-4 w-4 text-brand" />
                <h3 className="text-sm font-bold text-foreground">Regras Ativas do Motor de Decisão</h3>
                {isRulesLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>

              {agencyRules.length === 0 ? (
                <div className="rounded border-none glass-card border-none p-6 text-center">
                  <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-xs text-muted-foreground">Nenhuma regra ativa ainda.</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Aprove sugestões da IA acima para ativar regras no motor de decisão.</p>
                </div>
              ) : (
                <div className="rounded border-none overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="glass bg-white/5 border-white/10 border-b border-border text-muted-foreground font-semibold">
                        <th className="px-4 py-3 text-left">Código</th>
                        <th className="px-4 py-3 text-left">Escopo</th>
                        <th className="px-4 py-3 text-left">Versão</th>
                        <th className="px-4 py-3 text-left">Confiança</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border glass-card border-none">
                      {agencyRules.map((rule: any) => {
                        const ver = rule.current_version;
                        return (
                          <tr key={rule.id} className="hover:glass bg-white/5 border-white/10/50 transition-colors">
                            <td className="px-4 py-3.5 font-mono text-[11px] text-foreground">{rule.code}</td>
                            <td className="px-4 py-3.5">
                              <StatusBadge tone={rule.scope === "global" ? "success" : "info"}>
                                {rule.scope === "global" ? "Global" : "Agência"}
                              </StatusBadge>
                            </td>
                            <td className="px-4 py-3.5 text-muted-foreground">
                              {ver ? `v${ver.version}` : "—"}
                            </td>
                            <td className="px-4 py-3.5 text-muted-foreground">
                              {ver ? `${Math.round(Number(ver.confidence) * 100)}%` : "—"}
                            </td>
                            <td className="px-4 py-3.5">
                              <StatusBadge tone={rule.status === "active" ? "success" : "neutral"}>
                                {rule.status === "active" ? "Ativa" : "Pausada"}
                              </StatusBadge>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  onClick={() =>
                                    toggleRuleMut.mutate({
                                      id: rule.id,
                                      status: rule.status === "active" ? "paused" : "active",
                                    })
                                  }
                                  className="inline-flex h-7 items-center gap-1 px-2 rounded border-none text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:glass bg-white/5 border-white/10 transition-colors"
                                  title={rule.status === "active" ? "Pausar regra" : "Ativar regra"}
                                >
                                  {rule.status === "active" ? (
                                    <ToggleRight className="h-3.5 w-3.5 text-success" />
                                  ) : (
                                    <ToggleLeft className="h-3.5 w-3.5" />
                                  )}
                                  {rule.status === "active" ? "Pausar" : "Ativar"}
                                </Button>
                                {(rule.scope === "agency" || isSuperAdmin) && (
                                  <Button
                                    onClick={() => {
                                      if (confirm("Excluir esta regra permanentemente?")) {
                                        deleteRuleMut.mutate(rule.id);
                                      }
                                    }}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded border-none text-danger hover:bg-danger-bg transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Monitor de Promoções ────────────────────────────────────── */}
        {activeTab === "promotions" && (
          <div className="p-4 md:p-6 space-y-8">
            {(isWatchersError || isPromotionsError) && (
              <div className="p-4 rounded-[var(--radius-card)] glass-error text-xs flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Erro ao carregar monitor de alertas e promoções.</span>
              </div>
            )}

            {/* Alertas de Monitoramento — promotion_watch_profiles */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Bell className="h-4 w-4 text-brand" />
                <h3 className="text-sm font-bold text-foreground">Alertas de Monitoramento Ativos</h3>
                {isWatchersLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>

              {watchProfiles.length === 0 ? (
                <div className="rounded border-none glass-card border-none p-6 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-xs text-muted-foreground">Nenhum alerta configurado.</p>
                  <p className="text-[10px] text-muted-foreground mt-1 mb-4">Configure alertas para monitorar tarifas e oportunidades automáticas.</p>
                  <PrimaryButton onClick={() => setWatcherOpen(true)} className="gap-1.5">
                    <Bell className="h-3.5 w-3.5" />
                    Criar Primeiro Alerta
                  </PrimaryButton>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {watchProfiles.map((w: any) => {
                    const crit = w.criteria as any;
                    return (
                      <div
                        key={w.id}
                        className={`rounded border p-4 flex flex-col justify-between gap-3 transition-colors ${
                          w.status === "active"
                            ? "border-brand/30 bg-brand/5"
                            : "border-border glass-card border-none opacity-60"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="text-xs font-bold text-foreground line-clamp-1">{w.name}</h4>
                            <StatusBadge tone={w.status === "active" ? "success" : "neutral"}>
                              {w.status === "active" ? "Ativo" : "Pausado"}
                            </StatusBadge>
                          </div>
                          <div className="space-y-1">
                            {crit?.destination && (
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Compass className="h-3 w-3 shrink-0" />
                                Destino: <span className="text-foreground font-medium">{crit.destination}</span>
                              </div>
                            )}
                            {crit?.origin && (
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <ArrowRight className="h-3 w-3 shrink-0" />
                                Origem: <span className="text-foreground font-medium">{crit.origin}</span>
                              </div>
                            )}
                            {crit?.maxPrice > 0 && (
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <TrendingDown className="h-3 w-3 shrink-0" />
                                Teto: <span className="text-foreground font-medium">R$ {Number(crit.maxPrice).toLocaleString("pt-BR")}</span>
                              </div>
                            )}
                            {crit?.productType && (
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Eye className="h-3 w-3 shrink-0" />
                                Tipo: <span className="text-foreground font-medium capitalize">{crit.productType}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 border-t border-border pt-2">
                          <Button
                            onClick={() =>
                              toggleWatcherMut.mutate({
                                id: w.id,
                                status: w.status === "active" ? "paused" : "active",
                              })
                            }
                            className="flex-1 inline-flex items-center justify-center gap-1 h-7 rounded border-none text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:glass bg-white/5 border-white/10 transition-colors"
                          >
                            {w.status === "active" ? (
                              <><BellOff className="h-3 w-3" /> Pausar</>
                            ) : (
                              <><Bell className="h-3 w-3" /> Ativar</>
                            )}
                          </Button>
                          <Button
                            onClick={() => {
                              if (confirm("Remover este alerta de monitoramento?")) {
                                deleteWatcherMut.mutate(w.id);
                              }
                            }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded border-none text-danger hover:bg-danger-bg transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Oportunidades Identificadas — promotion_candidates */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="h-4 w-4 text-success" />
                <h3 className="text-sm font-bold text-foreground">Oportunidades Identificadas</h3>
                {isPromotionsLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>

              {promotionCandidates.length === 0 ? (
                <div className="rounded border-none glass-card border-none p-6 text-center">
                  <TrendingDown className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-xs text-muted-foreground">Nenhuma oportunidade detectada ainda.</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    O motor reativo detecta automaticamente tarifas abaixo dos limites configurados nos alertas acima durante as buscas GDS.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {promotionCandidates.map((promo: any) => {
                    const watchProfile = promo.watch_profile as any;
                    const pkg = promo.package_candidate as any;
                    return (
                      <div
                        key={promo.id}
                        className={`rounded border p-4 flex flex-col justify-between gap-3 ${
                          promo.status === "new"
                            ? "border-success/30 bg-success/5"
                            : promo.status === "approved"
                            ? "border-brand/20 glass-card border-none"
                            : "border-border glass-card border-none opacity-50"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="text-xs font-bold text-foreground line-clamp-1">
                                {pkg?.name || "Pacote identificado"}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Alerta: {watchProfile?.name || "—"}
                              </p>
                            </div>
                            <StatusBadge
                              tone={
                                promo.status === "new"
                                  ? "success"
                                  : promo.status === "approved"
                                  ? "info"
                                  : "neutral"
                              }
                            >
                              {promo.status === "new" ? "Nova" : promo.status === "approved" ? "Aprovada" : "Arquivada"}
                            </StatusBadge>
                          </div>

                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1 glass-card border-none rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full bg-success rounded-full"
                                style={{ width: `${Math.min(100, promo.score)}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-success">{promo.score}pts</span>
                          </div>

                          {promo.reason && (
                            <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-3">
                              {promo.reason}
                            </p>
                          )}
                        </div>

                        {promo.status === "new" && (
                          <div className="flex gap-2 border-t border-border pt-2">
                            <Button
                              onClick={() => updatePromotionMut.mutate({ id: promo.id, status: "approved" })}
                              className="flex-1 inline-flex items-center justify-center gap-1 h-7 rounded border border-success/40 bg-success/10 text-[10px] font-bold text-success hover:bg-success/20 transition-colors"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Aprovar
                            </Button>
                            <Button
                              onClick={() => updatePromotionMut.mutate({ id: promo.id, status: "dismissed" })}
                              className="inline-flex items-center justify-center gap-1 h-7 px-2 rounded border-none text-[10px] font-semibold text-muted-foreground hover:glass bg-white/5 border-white/10 transition-colors"
                            >
                              <XCircle className="h-3 w-3" />
                              Ignorar
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── New Quote Sheet ───────────────────────────────────────────────── */}
      {newOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-overlay/50 backdrop-blur-xs"
          onClick={() => setNewOpen(false)}
        >
          <div
            className="h-full w-full max-w-2xl overflow-y-auto border-l border-border glass-card border-none p-6 shadow-xl flex flex-col justify-between"
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
                    Escreva o roteiro desejado ou insira os parâmetros manualmente para rodar a
                    pesquisa GDS.
                  </p>
                </div>
                <Button
                  onClick={() => setNewOpen(false)}
                  className="rounded-full p-1.5 text-muted-foreground hover:glass bg-white/5 border-white/10 hover:text-foreground transition-colors"
                >
                  <Plus className="h-5 w-5 rotate-45" />
                </Button>
              </div>

              {/* AI Conversation Parser Section */}
              <div className="glass bg-white/5 border-white/10/40 border-none/80 rounded p-4 mb-6">
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
                  <Select value={clientId || "none"} onValueChange={(val) => setClientId(val === "none" ? "" : val)}>
                    <SelectTrigger className="w-full bg-white/5 rounded-full border-none">
                      <SelectValue placeholder="Sem cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem cliente</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Negociação / Lead (Opcional)">
                  <Select value={leadId || "none"} onValueChange={(val) => setLeadId(val === "none" ? "" : val)}>
                    <SelectTrigger className="w-full bg-white/5 rounded-full border-none">
                      <SelectValue placeholder="Sem lead associado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem lead associado</SelectItem>
                      {leads.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Origem (IATA)">
                  <Input
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="CXP"
                    maxLength={3}
                  />
                </Field>

                <Field label="Destino">
                  <Input
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Ex: Jericoacoara ou Fortaleza"
                  />
                </Field>

                <Field label="Data de Ida">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </Field>

                <Field label="Data de Volta">
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </Field>

                <div className="grid grid-cols-3 gap-2 col-span-2">
                  <Field label="Adultos">
                    <Input
                      type="number"
                      min={1}
                      value={adults}
                      onChange={(e) => setAdults(Number(e.target.value))}
                    />
                  </Field>

                  <Field label="Crianças">
                    <Input
                      type="number"
                      min={0}
                      value={children}
                      onChange={(e) => setChildren(Number(e.target.value))}
                    />
                  </Field>

                  <Field label="Orçamento Limite (R$)">
                    <Input
                      type="number"
                      min={0}
                      value={budget}
                      onChange={(e) => setBudget(Number(e.target.value))}
                    />
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
        <div
          className="fixed inset-0 z-50 flex justify-end bg-overlay/50 backdrop-blur-xs"
          onClick={() => setNewKnowledgeOpen(false)}
        >
          <div
            className="h-full w-full max-w-2xl overflow-y-auto border-l border-border glass-card border-none p-6 shadow-xl flex flex-col justify-between"
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
                    Insira diretrizes operacionais de destinos. O sistema as segmentará e gerará
                    embeddings de 1536 dimensões automaticamente.
                  </p>
                </div>
                <Button
                  onClick={() => setNewKnowledgeOpen(false)}
                  className="rounded-full p-1.5 text-muted-foreground hover:glass bg-white/5 border-white/10 hover:text-foreground transition-colors"
                >
                  <Plus className="h-5 w-5 rotate-45" />
                </Button>
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
                  <Select
                    value={knowledgeCategory}
                    onValueChange={setKnowledgeCategory}
                  >
                    <SelectTrigger className="w-full bg-white/5 rounded-full border-none">
                      <SelectValue placeholder="Selecione a categoria..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gateway_rules">Regras de Conexão (Gateway)</SelectItem>
                      <SelectItem value="destinations">Informações de Destino</SelectItem>
                      <SelectItem value="guidelines">Políticas Internas / Agência</SelectItem>
                      <SelectItem value="hotel_reviews">Qualidade & Críticas de Hotéis</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Escopo de Distribuição">
                  <Select
                    value={knowledgeScope}
                    onValueChange={(val) => setKnowledgeScope(val as "global" | "agency")}
                  >
                    <SelectTrigger className="w-full bg-white/5 rounded-full border-none">
                      <SelectValue placeholder="Selecione o escopo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agency">Minha Agência (Isolado)</SelectItem>
                      {isSuperAdmin ? (
                        <SelectItem value="global">Cérebro Global VibeTour (Sistema Inteiro)</SelectItem>
                      ) : (
                        <SelectItem value="global" disabled>
                          Cérebro Global VibeTour (Requer Admin Global)
                        </SelectItem>
                      )}
                    </SelectContent>
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

      {/* ── New Watch Profile Sheet ───────────────────────────────────────── */}
      {watcherOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-overlay/50 backdrop-blur-xs"
          onClick={() => setWatcherOpen(false)}
        >
          <div
            className="h-full w-full max-w-lg overflow-y-auto border-l border-border glass-card border-none p-6 shadow-xl flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
                <div>
                  <h2 className="ds-h3 text-foreground flex items-center gap-2">
                    <Bell className="h-5 w-5 text-brand" />
                    Novo Alerta de Promoção
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Configure os critérios de monitoramento automático de tarifas GDS.
                  </p>
                </div>
                <Button
                  onClick={() => setWatcherOpen(false)}
                  className="rounded-full p-1.5 text-muted-foreground hover:glass bg-white/5 border-white/10 hover:text-foreground transition-colors"
                >
                  <Plus className="h-5 w-5 rotate-45" />
                </Button>
              </div>

              <div className="space-y-4">
                <Field label="Nome do Alerta">
                  <Input
                    placeholder="Ex: Pacotes Baratos para Florianópolis"
                    value={watcherName}
                    onChange={(e) => setWatcherName(e.target.value)}
                  />
                </Field>

                <Field label="Tipo de Produto Monitorado">
                  <Select value={watcherType} onValueChange={(val) => setWatcherType(val as "flight" | "hotel" | "package")}>
                    <SelectTrigger className="w-full bg-white/5 rounded-full border-none">
                      <SelectValue placeholder="Selecione o tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="package">Pacote Completo (Voo + Hotel)</SelectItem>
                      <SelectItem value="flight">Apenas Voo</SelectItem>
                      <SelectItem value="hotel">Apenas Hotel</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Origem (IATA)">
                    <Input
                      placeholder="CXP"
                      value={watcherOrigin}
                      onChange={(e) => setWatcherOrigin(e.target.value.toUpperCase())}
                      maxLength={3}
                    />
                  </Field>

                  <Field label="Destino Monitorado">
                    <Input
                      placeholder="Ex: Florianópolis ou FLN"
                      value={watcherDest}
                      onChange={(e) => setWatcherDest(e.target.value)}
                    />
                  </Field>
                </div>

                <Field label="Preço Máximo (R$) — Teto de Tarifa">
                  <Input
                    type="number"
                    min={0}
                    step={100}
                    value={watcherMaxPrice}
                    onChange={(e) => setWatcherMaxPrice(Number(e.target.value))}
                    placeholder="3000"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Tarifas abaixo deste valor serão registradas como oportunidade.
                  </p>
                </Field>

                <Field label="Avaliação Mínima do Hotel (estrelas)">
                  <Select
                    value={String(watcherMinRating)}
                    onValueChange={(val) => setWatcherMinRating(Number(val))}
                  >
                    <SelectTrigger className="w-full bg-white/5 rounded-full border-none">
                      <SelectValue placeholder="Selecione a avaliação..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Qualquer</SelectItem>
                      <SelectItem value="3">3 estrelas ou mais</SelectItem>
                      <SelectItem value="4">4 estrelas ou mais</SelectItem>
                      <SelectItem value="5">5 estrelas</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </div>

            <div className="border-t border-border pt-4 mt-8 flex justify-end gap-3 shrink-0">
              <GhostButton type="button" onClick={() => setWatcherOpen(false)}>
                Cancelar
              </GhostButton>
              <PrimaryButton
                type="button"
                onClick={() => createWatcherMut.mutate()}
                disabled={createWatcherMut.isPending || !watcherName.trim() || !watcherDest.trim()}
              >
                {createWatcherMut.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Criando Alerta...
                  </>
                ) : (
                  "Ativar Monitoramento"
                )}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
