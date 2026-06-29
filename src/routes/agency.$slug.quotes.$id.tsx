import {
  ArrowLeft,
  Compass,
  Calendar,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Plus,
  Play,
  Loader2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  MapPin,
  Building,
  Plane,
  Truck,
  Heart,
  ChevronRight,
  HelpCircle,
  RefreshCw,
  ShieldCheck,
  Sliders,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createFileRoute, useParams, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAgency } from "@/lib/agency-context";
import { HeaderPortal } from "@/components/shell/HeaderPortal";
import { PageHeader } from "@/components/shell/PageHeader";
import {
  StatusBadge,
  fmtDate,
  money,
  GhostButton,
  PrimaryButton,
  Input,
  Select,
  Field,
} from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  fetchQuoteRequestDetails,
  createSearchPlanAndScenarios,
  executeScenarioSearch,
  createPackageCandidate,
  fetchPackageCandidates,
  fetchNormalizedOffersForQuote,
  rejectPackageCandidate,
  createQuoteSnapshot,
} from "@/services/quotes";
import { scorePackageCandidate } from "@/services/quotes-scoring";
import { createProposal } from "@/services/proposals";
import { runMarketSimulation, fetchSimulationRunsForQuote } from "@/services/quotes-simulation";

export const Route = createFileRoute("/agency/$slug/quotes/$id")({
  head: () => ({ meta: [{ title: "Central de Decisão VibeTour · TravelOS" }] }),
  component: QuoteDetailWorkspacePage,
});

function QuoteDetailWorkspacePage() {
  const { agency } = useAgency();
  const { slug, id } = useParams({ from: "/agency/$slug/quotes/$id" });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [searching, setSearching] = useState<string | null>(null);
  const [packaging, setPackaging] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);
  const [explaining, setExplaining] = useState<string | null>(null);
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<"matrix" | "simulation">("matrix");
  const [selectedResult, setSelectedResult] = useState<any | null>(null);
  const [simulating, setSimulating] = useState(false);
  // Estado para sinalizar que o GDS não está configurado (sem chaves de produção)
  const [apiNotConfigured, setApiNotConfigured] = useState(false);

  // States para o painel de Revisar Regras e Pesos (P1/P2)
  const [rulesOpen, setRulesOpen] = useState(false);
  const [comfortWeight, setComfortWeight] = useState(40);
  const [priceWeight, setPriceWeight] = useState(40);
  const [logisticsWeight, setLogisticsWeight] = useState(20);

  // Buscar perfil de score ativo no banco
  const { data: activeProfile, refetch: refetchProfile } = useQuery({
    enabled: !!agency,
    queryKey: ["score-profile", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("score_profiles")
        .select("*")
        .eq("agency_id", agency!.id)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data;
    }
  });

  // Sincronizar pesos locais com o banco
  useEffect(() => {
    if (activeProfile?.weights) {
      const w = activeProfile.weights as any;
      setComfortWeight(w.comfort !== undefined ? Math.round(w.comfort * 100) : 40);
      setPriceWeight(w.price !== undefined ? Math.round(w.price * 100) : 40);
      setLogisticsWeight(w.logistics !== undefined ? Math.round(w.logistics * 100) : 20);
    }
  }, [activeProfile]);

  // Salvar pesos e re-pontuar alternativas em tempo real
  const saveRulesMut = useMutation({
    mutationFn: async () => {
      if (!agency) return;
      
      const updatedWeights = {
        comfort: comfortWeight / 100,
        price: priceWeight / 100,
        logistics: logisticsWeight / 100
      };
      
      if (activeProfile) {
        const { error } = await supabase
          .from("score_profiles")
          .update({ weights: updatedWeights })
          .eq("id", activeProfile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("score_profiles")
          .insert({
            agency_id: agency.id,
            name: "Perfil Personalizado",
            status: "active",
            scope: "agency",
            weights: updatedWeights,
            constraints: {},
            version: 1
          });
        if (error) throw error;
      }
      
      // Re-pontuar os candidatos de forma reativa
      if (candidates.length > 0) {
        toast.loading("Re-calculando notas logísticas...", { id: "rescore" });
        for (const cand of candidates) {
          await scorePackageCandidate(cand.id);
        }
        toast.success("Notas atualizadas em tempo real!", { id: "rescore" });
      }
    },
    onSuccess: () => {
      toast.success("Regras e pesos de scoring atualizados com sucesso!");
      refetchProfile();
      qc.invalidateQueries({ queryKey: ["quote-candidates", id] });
      setRulesOpen(false);
    },
    onError: (e: any) => toast.error(e.message)
  });

  // 1. Fetch Quote Details
  const { data: quote, isLoading: isQuoteLoading, isError: isQuoteError, error: quoteError } = useQuery({
    enabled: !!agency,
    queryKey: ["quote-details", id],
    queryFn: () => fetchQuoteRequestDetails(id),
  });

  // 2. Fetch Package Candidates
  const { data: candidates = [], isLoading: isCandidatesLoading, isError: isCandidatesError, error: candidatesError } = useQuery({
    enabled: !!agency,
    queryKey: ["quote-candidates", id],
    queryFn: () => fetchPackageCandidates(id),
  });

  // 2.2. Fetch Simulation Runs
  const { data: simulationRuns = [], isLoading: isSimsLoading, isError: isSimsError, error: simsError } = useQuery({
    enabled: !!agency,
    queryKey: ["quote-simulations", id],
    queryFn: () => fetchSimulationRunsForQuote(id),
  });

  // 3. Create Scenarios Mutation
  const createScenariosMut = useMutation({
    mutationFn: async () => {
      if (!quote) return;
      const intent = quote.normalized_intent as any;
      const dest = intent?.destinations?.[0]?.name || "";

      const shiftDateString = (dateStr: string | undefined, days: number): string => {
        if (!dateStr) return "";
        try {
          const d = new Date(dateStr + "T00:00:00");
          d.setDate(d.getDate() + days);
          return d.toISOString().split("T")[0];
        } catch {
          return dateStr;
        }
      };

      const defaultScenarios = [
        {
          name: `Cenário 1: Datas Exatas (${dest})`,
          scenario_type: "exact_dates",
          parameters: {
            origin: intent?.origin?.[0]?.code || "CXP",
            destination: intent?.destinations?.[0]?.code || "FOR",
            date: intent?.dateWindow?.start,
            checkin: intent?.dateWindow?.start,
            checkout: intent?.dateWindow?.end,
          },
          priority: 1,
          reason: "Busca inicial solicitada nas datas exatas.",
        },
        {
          name: `Cenário 2: Logística Gateway e Pernoite`,
          scenario_type: "gateway_overnight",
          parameters: {
            origin: intent?.origin?.[0]?.code || "CXP",
            destination: intent?.destinations?.[0]?.code || "FOR",
            date: intent?.dateWindow?.start,
            checkin: intent?.dateWindow?.start,
            checkout: intent?.dateWindow?.end,
            gateway: "Fortaleza", // For destinations like Jericoacoara
          },
          priority: 2,
          reason: "Análise de voos tardios que exigem pernoite em cidade de conexão.",
        },
        {
          name: `Cenário 3: Datas Flexíveis (+3 dias)`,
          scenario_type: "flexible_dates",
          parameters: {
            origin: intent?.origin?.[0]?.code || "CXP",
            destination: intent?.destinations?.[0]?.code || "FOR",
            date: shiftDateString(intent?.dateWindow?.start, 3),
            checkin: shiftDateString(intent?.dateWindow?.start, 3),
            checkout: shiftDateString(intent?.dateWindow?.end, 3),
          },
          priority: 3,
          reason: "Análise de tarifas deslocando o período de viagem em +3 dias.",
        },
        {
          name: `Cenário 4: Datas Flexíveis (-3 dias)`,
          scenario_type: "flexible_dates",
          parameters: {
            origin: intent?.origin?.[0]?.code || "CXP",
            destination: intent?.destinations?.[0]?.code || "FOR",
            date: shiftDateString(intent?.dateWindow?.start, -3),
            checkin: shiftDateString(intent?.dateWindow?.start, -3),
            checkout: shiftDateString(intent?.dateWindow?.end, -3),
          },
          priority: 4,
          reason: "Análise de tarifas deslocando o período de viagem em -3 dias.",
        },
      ];

      return await createSearchPlanAndScenarios(id, defaultScenarios);
    },
    onSuccess: () => {
      toast.success("Cenários de busca gerados!");
      qc.invalidateQueries({ queryKey: ["quote-details", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // 4. Run Search Mutation
  async function handleExecuteSearch(
    scenarioId: string,
    productType: "hotel" | "flight" | "transfer" | "activity",
    params: any,
  ) {
    if (!agency) return;
    setSearching(scenarioId + "-" + productType);
    try {
      await executeScenarioSearch(agency.id, id, scenarioId, productType, params);
      const labels: Record<string, string> = {
        hotel: "hotéis",
        flight: "voos",
        transfer: "traslados",
        activity: "passeios",
      };
      toast.success(`Busca de ${labels[productType] || productType} concluída no GDS!`);
      qc.invalidateQueries({ queryKey: ["quote-details", id] });
      qc.invalidateQueries({ queryKey: ["normalized-offers", id] });
    } catch (e: any) {
      // Verificar se é o erro de credenciais não configuradas
      if (
        e.message?.includes("Acesse Configurações") ||
        e.message?.includes("credenciais de acesso ao GDS")
      ) {
        setApiNotConfigured(true);
        // Não exibir toast genérico — o banner contextual será exibido na interface
      } else {
        toast.error(e.message || "Erro ao executar busca no GDS");
      }
    } finally {
      setSearching(null);
    }
  }

  // 5. Package Candidates Automator
  async function handleAutoPackage() {
    setPackaging(true);
    try {
      // a. Obter todas as ofertas normalizadas
      const offers = await fetchNormalizedOffersForQuote(id);
      if (offers.length === 0) {
        toast.error("Nenhuma oferta encontrada. Execute as buscas dos cenários primeiro!");
        return;
      }

      const flights = offers.filter((o) => o.productType === "flight" && o.flights?.length > 0);
      const hotels = offers.filter(
        (o) => o.productType === "hotel" && o.accommodations?.length > 0,
      );

      if (flights.length === 0 || hotels.length === 0) {
        toast.error(
          "É necessário ter pelo menos 1 voo e 1 hotel normalizados para gerar combinações.",
        );
        return;
      }

      // b. Combinar os primeiros hotéis com voos e criar candidatos
      let createdCount = 0;
      const createdIds: string[] = [];
      
      for (let i = 0; i < Math.min(hotels.length, 3); i++) {
        for (let j = 0; j < Math.min(flights.length, 2); j++) {
          const hotelOffer = hotels[i];
          const flightOffer = flights[j];

          const hotelName = hotelOffer.accommodations[0].name;
          const flightAir =
            flightOffer.flights[0].airlineName || flightOffer.flights[0].airlineCode;
          const candidateName = `Pacote ${hotelName} + Voo ${flightAir}`;

          // Criar candidato
          const candidateId = await createPackageCandidate(id, candidateName, [
            hotelOffer.id,
            flightOffer.id,
          ]);

          // Calcular score determinístico imediatamente
          await scorePackageCandidate(candidateId);
          createdIds.push(candidateId);
          createdCount++;
        }
      }

      // Acionar motor de promoções de forma reativa e real
      if (agency?.id && createdIds.length > 0) {
        const { checkPackagesForPromotions } = await import("@/services/quotes-promotions");
        await checkPackagesForPromotions(agency.id, id, createdIds);
      }

      toast.success(`${createdCount} alternativas de pacotes geradas e qualificadas com sucesso!`);
      qc.invalidateQueries({ queryKey: ["quote-candidates", id] });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao compor alternativas");
    } finally {
      setPackaging(false);
    }
  }

  // 6. Explain Scorecard using AI
  async function handleExplainWithAi(
    candidateId: string,
    name: string,
    score: number,
    explanation: string,
    warnings: string[],
  ) {
    setExplaining(candidateId);
    try {
      const prompt = `Analise a alternativa de viagem "${name}" que obteve nota de conforto/logística ${score}/100.
Fatores determinísticos calculados: ${explanation}
Restrições/Avisos identificados: ${warnings.join(", ") || "Nenhum"}.

Resuma de forma profissional e persuasiva (estilo consultor premium de turismo) por que esta opção é boa ou quais são os pontos de atenção cruciais que o cliente deve ponderar. Limite-se a um parágrafo de 3-4 frases em português de fácil leitura. Não mencione jargões como "Zod", "Scorecard" ou "penalidades de pontos".`;

      const { data, error } = await supabase.functions.invoke("ai-orchestrator", {
        body: {
          action: "completion",
          prompt,
          systemPrompt:
            "Você é o especialista de viagens sênior do TravelOS. Ajude o operador a explicar a cotação.",
          modelPreference: "smart",
        },
      });

      if (error) throw error;
      setAiExplanations((prev: Record<string, string>) => ({ ...prev, [candidateId]: data?.result || "" }));
    } catch (e: any) {
      console.error("Erro ao gerar explicação por IA:", e);
      toast.error("Erro ao gerar explicação por IA");
    } finally {
      setExplaining(null);
    }
  }

  // 7. Convert Candidate to Proposal Mutation (Atomic & Transaction-safe via RPC)
  const convertMut = useMutation({
    mutationFn: async (cand: any) => {
      if (!agency || !quote) throw new Error("Parâmetros inválidos");
      setConverting(cand.id);

      // Obter detalhes de componentes do candidato
      const { data: comps, error: compsErr } = await supabase
        .from("package_candidate_components")
        .select("*, offer:normalized_offers(*)")
        .eq("package_candidate_id", cand.id);

      if (compsErr || !comps) throw new Error("Componentes do pacote não carregados");

      // Mapear voos e hotéis normalizados para o modelo da proposta
      const mappedFlights: any[] = [];
      const mappedHotels: any[] = [];
      const mappedTransfers: any[] = [];

      for (const comp of comps) {
        const off = comp.offer.normalized_data as any;
        if (off.productType === "flight" && off.flights) {
          off.flights.forEach((f: any) => {
            mappedFlights.push({
              id: crypto.randomUUID(),
              origin: f.origin,
              destination: f.destination,
              date: f.departure.split("T")[0],
              departure_time: f.departure.split("T")[1]?.substring(0, 5) || "08:00",
              arrival_time: f.arrival.split("T")[1]?.substring(0, 5) || "12:00",
              airline: f.airlineName || f.airlineCode,
              flight_number: f.flightNumber,
              stops: f.stops,
              baggage_rules: f.baggageAllowance || "Sob consulta",
              price: f.price || 0,
            });
          });
        } else if (off.productType === "hotel" && off.accommodations) {
          off.accommodations.forEach((acc: any) => {
            mappedHotels.push({
              id: crypto.randomUUID(),
              name: acc.name,
              city: acc.cityName || acc.cityCode || "",
              checkin: acc.checkIn,
              checkout: acc.checkOut,
              meal_plan: acc.rooms?.[0]?.boardDescription || "Café da manhã",
              rooms: (acc.rooms || []).map((r: any) => ({ type: r.description, qty: r.quantity })),
              images: acc.images || [],
              price: acc.lowestPrice || 0,
            });
          });
        }
      }

      const intent = quote.normalized_intent as any;

      // Obter ID do usuário autenticado para passar como owner_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Gravar o snapshot congelado da cotação no banco
      const snapshotData = {
        quote_request: quote,
        selected_candidate: cand,
        mapped_flights: mappedFlights,
        mapped_hotels: mappedHotels,
        mapped_transfers: mappedTransfers,
        intent
      };

      if (agency?.id) {
        await createQuoteSnapshot(agency.id, id, snapshotData);
      }

      // Invocar a transação atômica RPC no banco
      const { data: proposalId, error: rpcErr } = await supabase.rpc("convert_quote_to_proposal", {
        p_quote_request_id: id,
        p_proposal_payload: {
          title: `Proposta Inteligente: ${cand.name}`,
          destination: intent?.destinations?.[0]?.name || "",
          client_id: quote.client_id || null,
          lead_id: quote.lead_id || null,
          travel_start: intent?.dateWindow?.start || null,
          travel_end: intent?.dateWindow?.end || null,
          pax_adults: intent?.travelers?.adults || 2,
          pax_children: intent?.travelers?.children || 0,
          pax_infants: 0,
          currency: "BRL",
          valid_until: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
          notes: `Gerado automaticamente via Motor VibeTour. Pontuação Logística: ${cand.score}/100.`,
          flights: mappedFlights,
          hotels: mappedHotels,
          transfers: mappedTransfers,
          total: Number(cand.total_price),
        },
        p_owner_id: user.id
      });

      if (rpcErr) throw new Error(rpcErr.message);

      return proposalId as string;
    },
    onSuccess: async (proposalId: string, cand: any) => {
      toast.success("Cotação convertida em proposta com sucesso!");

      try {
        const { data: allCandidates } = await supabase
          .from("package_candidates")
          .select("id")
          .eq("quote_request_id", id);
          
        const sentPackages = allCandidates?.map((c) => c.id) || [];
        const rejectedPackages = sentPackages.filter((pid) => pid !== cand.id);

        await supabase.from("decision_records").insert({
          quote_request_id: id,
          selected_package_id: cand.id,
          sent_packages: sentPackages as any,
          rejected_packages: rejectedPackages as any,
          decision_source: "manual",
          reason: "Conversão de cenário de cotação para proposta",
          outcome: "accepted",
        });

        if (agency?.id) {
          const { runDecisionLearningAnalysis } = await import("@/services/quotes-learning");
          runDecisionLearningAnalysis(id, agency.id).then();
        }
      } catch (err) {
        console.error("Erro ao registrar feedback de decisão:", err);
      }

      navigate({ to: `/agency/${slug}/proposals/${proposalId}` });
    },
    onError: (e: any) => toast.error(e.message),
    onSettled: () => setConverting(null),
  });

  const rejectMut = useMutation({
    mutationFn: async ({ candidateId, reason }: { candidateId: string; reason: string }) => {
      if (!agency || !quote) throw new Error("Parâmetros inválidos");
      setRejecting(candidateId);
      const intent = quote.normalized_intent as any;
      await rejectPackageCandidate(agency.id, id, candidateId, reason, intent);
    },
    onSuccess: () => {
      toast.success(
        "Alternativa rejeitada e inválida para cotação. Sugestão de regra gerada no cérebro RAG!",
      );
      qc.invalidateQueries({ queryKey: ["quote-candidates", id] });
    },
    onError: (e: any) => toast.error(e.message),
    onSettled: () => setRejecting(null),
  });

  const runSimulationMut = useMutation({
    mutationFn: async () => {
      if (!agency || !quote) throw new Error("Parâmetros inválidos");
      setSimulating(true);
      const activeCandidateIds = candidates
        .filter((c: any) => c.status !== "invalid")
        .map((c: any) => c.id);

      if (activeCandidateIds.length === 0) {
        throw new Error("Nenhum pacote candidato ativo para simular");
      }

      const personas = ["econômico", "conforto", "família", "premium", "aventura"];
      return await runMarketSimulation(id, activeCandidateIds, personas);
    },
    onSuccess: () => {
      toast.success("Simulação de personas concluída com sucesso!");
      qc.invalidateQueries({ queryKey: ["quote-simulations", id] });
    },
    onError: (e: any) => toast.error(e.message),
    onSettled: () => setSimulating(false),
  });

  if (isQuoteLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando área de decisão...
      </div>
    );
  }

  if (isQuoteError) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-2 p-6 text-center">
        <AlertTriangle className="h-8 w-8 text-danger" />
        <h1 className="text-lg font-semibold">Falha ao carregar cotação</h1>
        <p className="text-xs text-muted-foreground max-w-sm">
          {quoteError instanceof Error ? quoteError.message : "Erro desconhecido ao carregar cotação."}
        </p>
        <Link to="/agency/$slug/quotes" params={{ slug }} className="text-xs text-brand underline mt-2">
          Voltar para Cotações
        </Link>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-2 p-6 text-center">
        <AlertTriangle className="h-8 w-8 text-danger" />
        <h1 className="text-lg font-semibold">Cotação não encontrada</h1>
        <Link to="/agency/$slug/quotes" params={{ slug }} className="text-xs text-brand underline">
          Voltar para Cotações
        </Link>
      </div>
    );
  }

  const intent = quote.normalized_intent as any;
  const startStr = intent?.dateWindow?.start || "";
  const endStr = intent?.dateWindow?.end || "";
  const travelers = intent?.travelers || { adults: 2, children: 0 };
  const budgetLimit = intent?.budget?.amount || 0;

  return (
    <div className="flex h-[calc(100vh-var(--header-h))] flex-col overflow-hidden bg-background">
      <HeaderPortal>
        <div className="flex items-center gap-2">
          <Link
            to="/agency/$slug/quotes"
            params={{ slug }}
            className="inline-flex h-8 items-center gap-1.5 rounded border border-border px-3 text-xs font-bold text-foreground hover:bg-surface-alt transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Cotações
          </Link>
          
          <GhostButton onClick={() => setRulesOpen(true)} className="gap-1.5 text-xs h-8 border border-border">
            <ShieldCheck className="h-3.5 w-3.5 text-brand animate-pulse" />
            Revisar Regras
          </GhostButton>

          <PrimaryButton onClick={handleAutoPackage} disabled={packaging} className="gap-1.5">
            {packaging ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Compondo Pacotes...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Gerar Alternativas Prontas
              </>
            )}
          </PrimaryButton>
        </div>
      </HeaderPortal>

      {/* Header Info */}
      <div className="border-b border-border bg-surface px-4 md:px-6 py-4 shrink-0 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Destino Alvo
          </span>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground mt-0.5">
            <Compass className="h-4 w-4 text-brand shrink-0" />
            {intent?.destinations?.[0]?.name || "Não informado"}
          </div>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Datas e Período
          </span>
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mt-0.5">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{fmtDate(startStr)}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span>{fmtDate(endStr)}</span>
          </div>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Ocupação / Viajantes
          </span>
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mt-0.5">
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>
              {travelers.adults} adultos{" "}
              {travelers.children > 0 && `+ ${travelers.children} crianças`}
            </span>
          </div>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Orçamento Esperado
          </span>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-success mt-0.5">
            <DollarSign className="h-4 w-4 shrink-0" />
            <span>Até R$ {budgetLimit.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Grid Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Scenarios Control */}
        <div className="w-80 border-r border-border bg-surface-alt/25 flex flex-col overflow-y-auto p-4 shrink-0">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              1. Cenários de Busca
            </h3>
            {quote.scenarios.length === 0 && (
              <button
                onClick={() => createScenariosMut.mutate()}
                className="text-[10px] font-bold text-brand hover:underline"
              >
                Gerar Padrões
              </button>
            )}
          </div>

          {quote.scenarios.length === 0 ? (
            <div className="text-center py-8 px-2 border border-dashed border-border rounded">
              <p className="text-[11px] text-muted-foreground">
                Nenhum cenário configurado para esta cotação.
              </p>
              <PrimaryButton
                onClick={() => createScenariosMut.mutate()}
                className="mt-3 h-8 text-[10px] w-full"
              >
                Configurar Cenários Padrão
              </PrimaryButton>
            </div>
          ) : (
            <div className="space-y-4">
              {quote.scenarios.map((sc: any) => {
                const isActive = activeScenarioId === sc.id;
                return (
                  <div
                    key={sc.id}
                    className={`rounded border p-3 bg-surface hover:border-brand/40 transition-all ${
                      isActive ? "border-brand ring-1 ring-brand/10 bg-brand/5" : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-foreground leading-snug">
                          {sc.name}
                        </h4>
                        <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                          {sc.reason}
                        </p>
                      </div>
                      <StatusBadge
                        tone={
                          sc.status === "completed"
                            ? "success"
                            : sc.status === "processing"
                              ? "warning"
                              : sc.status === "failed"
                                ? "danger"
                                : "neutral"
                        }
                      >
                        {sc.status}
                      </StatusBadge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/60">
                      <GhostButton
                        onClick={() =>
                          handleExecuteSearch(sc.id, "flight", {
                            origin: sc.parameters.origin,
                            destination: sc.parameters.destination,
                            date: sc.parameters.date,
                          })
                        }
                        disabled={searching !== null}
                        className="h-7 text-[10px] justify-center px-1"
                      >
                        {searching === `${sc.id}-flight` ? (
                          <Loader2 className="h-3 w-3 animate-spin text-brand" />
                        ) : (
                          <>
                            <Plane className="h-3 w-3 shrink-0" />
                            Aéreo
                          </>
                        )}
                      </GhostButton>

                      <GhostButton
                        onClick={() =>
                          handleExecuteSearch(sc.id, "hotel", {
                            city: sc.parameters.destination,
                            checkin: sc.parameters.checkin,
                            checkout: sc.parameters.checkout,
                          })
                        }
                        disabled={searching !== null}
                        className="h-7 text-[10px] justify-center px-1"
                      >
                        {searching === `${sc.id}-hotel` ? (
                          <Loader2 className="h-3 w-3 animate-spin text-brand" />
                        ) : (
                          <>
                            <Building className="h-3 w-3 shrink-0" />
                            Hotel
                          </>
                        )}
                      </GhostButton>

                      <GhostButton
                        onClick={() =>
                          handleExecuteSearch(sc.id, "transfer", {
                            destination: sc.parameters.destination,
                            city: sc.parameters.destination,
                            checkin: sc.parameters.checkin,
                            checkout: sc.parameters.checkout,
                          })
                        }
                        disabled={searching !== null}
                        className="h-7 text-[10px] justify-center px-1"
                      >
                        {searching === `${sc.id}-transfer` ? (
                          <Loader2 className="h-3 w-3 animate-spin text-brand" />
                        ) : (
                          <>
                            <Truck className="h-3 w-3 shrink-0" />
                            Traslado
                          </>
                        )}
                      </GhostButton>

                      <GhostButton
                        onClick={() =>
                          handleExecuteSearch(sc.id, "activity", {
                            destination: sc.parameters.destination,
                            city: sc.parameters.destination,
                            checkin: sc.parameters.checkin,
                            checkout: sc.parameters.checkout,
                          })
                        }
                        disabled={searching !== null}
                        className="h-7 text-[10px] justify-center px-1"
                      >
                        {searching === `${sc.id}-activity` ? (
                          <Loader2 className="h-3 w-3 animate-spin text-brand" />
                        ) : (
                          <>
                            <Heart className="h-3 w-3 shrink-0" />
                            Passeio
                          </>
                        )}
                      </GhostButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Banner: GDS não configurado */}
          {apiNotConfigured && (
            <div className="mb-4 p-3 bg-warning/5 border border-warning/30 rounded-lg">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-warning">GDS não conectado</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                    As credenciais do Infotravel não foram configuradas para esta agência. As buscas precisam de conexão com o GDS para retornar disponibilidades e preços reais.
                  </p>
                  <Link
                    to="/agency/$slug/integrations"
                    params={{ slug }}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-warning hover:underline mt-1.5"
                  >
                    Configurar Integração <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Info Section */}
          <div className="mt-8 bg-info-bg/10 border border-info/20 rounded p-3 text-[11px] leading-relaxed text-info">
            <span className="font-semibold block mb-1">Regras de Validação do Destino</span>
            Ao salvar ofertas de voos e hotéis, o sistema valida automaticamente conexões apertadas
            e pernoites logísticos como Jericoacoara via Fortaleza.
          </div>
        </div>

        {/* Right Side: Tabbed Container */}
        <div className="flex-1 flex flex-col overflow-hidden bg-surface">
          {/* Tab Switcher */}
          <div className="border-b border-border bg-surface-alt/20 px-6 py-2 shrink-0 flex items-center gap-4">
            <button
              onClick={() => setRightTab("matrix")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-all ${
                rightTab === "matrix"
                  ? "bg-brand text-brand-foreground border-brand shadow-sm"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-alt"
              }`}
            >
              Matriz de Comparação
            </button>
            <button
              onClick={() => setRightTab("simulation")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-all flex items-center gap-1.5 ${
                rightTab === "simulation"
                  ? "bg-brand text-brand-foreground border-brand shadow-sm"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-alt"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Simulação de Personas
            </button>
          </div>

          {rightTab === "matrix" ? (
            <div className="flex-1 overflow-x-auto overflow-y-hidden bg-surface flex py-6 px-6 gap-6">
              {isCandidatesError ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-red-50/20 border border-red-200 rounded-lg">
                  <AlertTriangle className="h-8 w-8 text-red-655 mb-2" />
                  <h3 className="text-sm font-semibold text-red-800">Falha ao carregar pacotes qualificados</h3>
                  <p className="text-xs text-red-600 mt-1 max-w-sm">
                    {candidatesError instanceof Error ? candidatesError.message : "Erro desconhecido"}
                  </p>
                </div>
              ) : candidates.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                  <TrendingUp className="h-12 w-12 text-muted-foreground/40 mb-3" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Ainda não há pacotes qualificados
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    Realize as buscas dos cenários à esquerda e clique em{" "}
                    <strong>Gerar Alternativas Prontas</strong> acima para criar e avaliar opções.
                  </p>
                </div>
              ) : (
                candidates.map((cand: any) => {
                  const card = Array.isArray(cand.scorecard) ? cand.scorecard[0] : cand.scorecard;
                  const hasWarnings = cand.warnings && cand.warnings.length > 0;

                  return (
                    <div
                      key={cand.id}
                      className="w-96 rounded border border-border bg-surface shrink-0 flex flex-col justify-between overflow-hidden shadow-sm"
                    >
                      <div>
                        {/* Candidate Header */}
                        <div className="bg-surface-alt px-4 py-3 border-b border-border flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-xs font-bold text-foreground line-clamp-1">
                                {cand.name}
                              </h3>
                              {cand.status === "invalid" && (
                                <StatusBadge tone="danger">Rejeitado</StatusBadge>
                              )}
                            </div>
                            <span className="text-[10px] font-medium text-muted-foreground">
                              Scorecard v1
                            </span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span
                              className={`text-lg font-black tracking-tight ${
                                cand.score >= 80
                                  ? "text-success"
                                  : cand.score >= 50
                                    ? "text-warning"
                                    : "text-danger"
                              }`}
                            >
                              {cand.score}
                              <span className="text-xs font-normal text-muted-foreground">
                                /100
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Price and Overview */}
                        <div className="p-4 border-b border-border flex justify-between items-baseline bg-surface-alt/10">
                          <span className="text-xs text-muted-foreground">
                            Preço Total Estimado
                          </span>
                          <span className="text-lg font-bold text-foreground">
                            {money(cand.total_price, cand.currency)}
                          </span>
                        </div>

                        {/* Features list */}
                        <div className="p-4 space-y-4">
                          {/* Warnings / Flags */}
                          {hasWarnings && (
                            <div className="bg-danger-bg/20 border border-danger/30 text-danger text-[11px] rounded p-2.5 space-y-1">
                              <span className="font-bold flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                Avisos Logísticos
                              </span>
                              <ul className="list-disc pl-4 space-y-0.5">
                                {cand.warnings.map((w: string, idx: number) => (
                                  <li key={idx} className="leading-snug">
                                    {w}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Score dimensions */}
                          {card && (
                            <div className="space-y-1.5 border-b border-border/80 pb-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                Métricas de Conforto
                              </span>
                              <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                                <div className="bg-surface-alt rounded p-1">
                                  <span className="block text-muted-foreground font-semibold">
                                    Voos
                                  </span>
                                  <span className="font-bold text-foreground">
                                    {card.dimensions?.flight_score || 0}
                                  </span>
                                </div>
                                <div className="bg-surface-alt rounded p-1">
                                  <span className="block text-muted-foreground font-semibold">
                                    Hotel
                                  </span>
                                  <span className="font-bold text-foreground">
                                    {card.dimensions?.hotel_score || 0}
                                  </span>
                                </div>
                                <div className="bg-surface-alt rounded p-1">
                                  <span className="block text-muted-foreground font-semibold">
                                    Logística
                                  </span>
                                  <span className="font-bold text-foreground">
                                    {card.dimensions?.logistics_score || 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* AI explanation panel */}
                          <div className="bg-surface-alt/40 border border-border/60 rounded p-3 text-[11px]">
                            <span className="font-bold text-foreground flex items-center gap-1">
                              <Sparkles className="h-3.5 w-3.5 text-brand" />
                              Consultoria Digital
                            </span>
                            {aiExplanations[cand.id] ? (
                              <p className="text-muted-foreground mt-1.5 leading-relaxed">
                                {aiExplanations[cand.id]}
                              </p>
                            ) : (
                              <p className="text-muted-foreground mt-1.5 leading-relaxed">
                                Nenhuma análise gerada. Clique em "Pedir Explicação" para acionar o
                                motor de linguagem natural.
                              </p>
                            )}
                            <div className="mt-2.5 flex justify-end">
                              <button
                                onClick={() =>
                                  handleExplainWithAi(
                                    cand.id,
                                    cand.name,
                                    cand.score,
                                    card?.explanation || "",
                                    cand.warnings || [],
                                  )
                                }
                                disabled={explaining === cand.id}
                                className="text-[10px] text-brand font-bold uppercase tracking-wider flex items-center gap-1 disabled:opacity-50"
                              >
                                {explaining === cand.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Sparkles className="h-3 w-3" />
                                )}
                                Pedir Explicação IA
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Candidate Footer Actions */}
                      <div className="p-4 border-t border-border bg-surface-alt/25 flex gap-2">
                        {cand.status !== "invalid" && (
                          <GhostButton
                            onClick={() => {
                              const reason = prompt(
                                "Por que você deseja rejeitar esta alternativa?",
                              );
                              if (reason && reason.trim()) {
                                rejectMut.mutate({ candidateId: cand.id, reason: reason.trim() });
                              }
                            }}
                            disabled={rejecting !== null}
                            className="border border-border text-danger hover:bg-danger-bg text-xs px-2.5 h-9 shrink-0"
                          >
                            {rejecting === cand.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "Rejeitar"
                            )}
                          </GhostButton>
                        )}
                        <PrimaryButton
                          onClick={() => {
                            if (converting !== null || convertMut.isPending) return;
                            convertMut.mutate(cand);
                          }}
                          disabled={
                            converting !== null ||
                            convertMut.isPending ||
                            cand.score < 50 ||
                            cand.status === "invalid"
                          }
                          className="flex-1 justify-center text-xs h-9 uppercase tracking-wider"
                        >
                          {converting === cand.id ||
                          (convertMut.isPending && converting === cand.id) ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                              Convertendo...
                            </>
                          ) : (
                            "Converter em Proposta"
                          )}
                        </PrimaryButton>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-y-auto bg-surface-alt/10 p-6 gap-6">
              {/* Header inside Tab */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface border border-border rounded-xl p-5 shadow-xs">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-brand" />
                    Simulação Preditiva de Personas
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Simule o comportamento de compra de 5 perfis de clientes contra os pacotes
                    gerados para validar objeções.
                  </p>
                </div>
                <PrimaryButton
                  onClick={() => runSimulationMut.mutate()}
                  disabled={
                    simulating || candidates.filter((c: any) => c.status !== "invalid").length === 0
                  }
                  className="gap-1.5"
                >
                  {simulating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Simulando...
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      Rodar Simulação Manual
                    </>
                  )}
                </PrimaryButton>
              </div>

              {isSimsError ? (
                <div className="flex-1 border border-dashed border-red-200 rounded-xl flex flex-col items-center justify-center text-center p-8 bg-red-50/20">
                  <AlertTriangle className="h-10 w-10 text-red-650 mb-2" />
                  <h4 className="text-sm font-semibold text-red-800">
                    Falha ao carregar simulação
                  </h4>
                  <p className="text-xs text-red-600 mt-1 max-w-sm">
                    {simsError instanceof Error ? simsError.message : "Erro desconhecido"}
                  </p>
                </div>
              ) : simulationRuns.length === 0 ? (
                <div className="flex-1 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center p-8 bg-surface">
                  <Sparkles className="h-10 w-10 text-muted-foreground/30 mb-2 animate-pulse" />
                  <h4 className="text-sm font-semibold text-foreground">
                    Nenhuma Simulação Registrada
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    Para economizar tokens, a simulação de personas é manual. Clique no botão acima
                    para rodar a simulação com as alternativas de pacotes atuais.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                  {/* Heatmap Matrix Table */}
                  <div className="xl:col-span-2 bg-surface border border-border rounded-xl p-5 shadow-xs flex flex-col">
                    <div className="flex items-center justify-between mb-4 border-b border-border/80 pb-3">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Matriz de Calor (Heatmap)
                      </span>
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        Versão: #{simulationRuns[0].version} (
                        {new Date(simulationRuns[0].createdAt).toLocaleString("pt-BR")})
                      </span>
                    </div>

                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="py-3 px-4 text-xs font-bold text-muted-foreground uppercase">
                              Persona
                            </th>
                            {candidates
                              .filter((c: any) => c.status !== "invalid")
                              .map((c: any) => (
                                <th
                                  key={c.id}
                                  className="py-3 px-4 text-xs font-bold text-foreground text-center truncate max-w-[150px]"
                                  title={c.name}
                                >
                                  {c.name}
                                </th>
                              ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {["econômico", "conforto", "família", "premium", "aventura"].map(
                            (persona) => (
                              <tr
                                key={persona}
                                className="hover:bg-surface-alt/40 transition-colors"
                              >
                                <td className="py-3 px-4 text-xs font-bold text-foreground uppercase tracking-wider">
                                  {persona}
                                </td>
                                {candidates
                                  .filter((c: any) => c.status !== "invalid")
                                  .map((c: any) => {
                                    const result = simulationRuns[0].results.find(
                                      (r: any) =>
                                        r.packageCandidateId === c.id && r.persona === persona,
                                    );
                                    const score = result?.score ?? 0;
                                    const isSelected =
                                      selectedResult?.packageCandidateId === c.id &&
                                      selectedResult?.persona === persona;

                                    let scoreBg = "bg-neutral text-neutral-foreground";
                                    if (result) {
                                      if (score >= 80)
                                        scoreBg =
                                          "bg-success/10 text-success border-success/30 hover:bg-success/20";
                                      else if (score >= 50)
                                        scoreBg =
                                          "bg-warning/10 text-warning border-warning/30 hover:bg-warning/20";
                                      else
                                        scoreBg =
                                          "bg-danger/10 text-danger border-danger/30 hover:bg-danger/20";
                                    }

                                    return (
                                      <td key={c.id} className="py-3 px-4 text-center">
                                        <button
                                          onClick={() =>
                                            result &&
                                            setSelectedResult({ ...result, candidateName: c.name })
                                          }
                                          className={`inline-flex items-center justify-center font-mono font-bold text-xs w-12 h-8 rounded border transition-all ${scoreBg} ${
                                            isSelected
                                              ? "ring-2 ring-brand ring-offset-2 scale-105"
                                              : ""
                                          }`}
                                        >
                                          {score || "—"}
                                        </button>
                                      </td>
                                    );
                                  })}
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-4 leading-relaxed">
                      💡 Clique em qualquer nota na matriz para ver os pontos fortes e objeções
                      detalhadas da persona sobre aquele pacote.
                    </span>
                  </div>

                  {/* Detail Panel */}
                  <div className="bg-surface border border-border rounded-xl p-5 shadow-xs">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 border-b border-border pb-3">
                      Detalhes da Persona
                    </h4>

                    {selectedResult ? (
                      <div className="space-y-4">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Alternativa Selecionada
                          </span>
                          <p className="text-xs font-semibold text-foreground mt-0.5">
                            {selectedResult.candidateName}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Persona
                            </span>
                            <p className="text-xs font-bold text-brand uppercase tracking-wide mt-0.5">
                              {selectedResult.persona}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Nota / Confiança
                            </span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                              <span className="text-sm font-bold text-foreground">
                                {selectedResult.score}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                (conf: {(selectedResult.confidence * 100).toFixed(0)}%)
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-border/80 pt-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-success block mb-1">
                            Pontos Fortes
                          </span>
                          {selectedResult.strengths?.length > 0 ? (
                            <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
                              {selectedResult.strengths.map((s: string, i: number) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">
                              Nenhum ponto forte identificado.
                            </p>
                          )}
                        </div>

                        <div className="border-t border-border/80 pt-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-danger block mb-1">
                            Objeções de Compra
                          </span>
                          {selectedResult.objections?.length > 0 ? (
                            <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
                              {selectedResult.objections.map((o: string, i: number) => (
                                <li key={i}>{o}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">
                              Nenhuma objeção de compra identificada.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground text-xs italic">
                        Selecione uma nota na tabela para ver a análise semântica da persona.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── SHEET: REVISAR REGRAS E PESOS (P1/P2) ─────────────────────────── */}
      {rulesOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-overlay/50 backdrop-blur-xs"
          onClick={() => setRulesOpen(false)}
        >
          <div
            className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-surface p-6 shadow-xl flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
                <div>
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-brand" />
                    Revisar Regras e Pesos de Scoring
                  </h2>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                    Ajuste os pesos que o motor contábil e de IA utilizam para pontuar e classificar cada alternativa de viagem.
                  </p>
                </div>
                <button
                  onClick={() => setRulesOpen(false)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-surface-alt hover:text-foreground transition-colors"
                >
                  <Plus className="h-4 w-4 rotate-45" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-surface-alt/40 border border-border/50 rounded-xl p-4 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Pesos de Scoring (Soma deve ser 100%)
                  </h3>
                  
                  <div className="space-y-4">
                    <Field label={`Peso de Conforto (Hotelaria): ${comfortWeight}%`}>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={comfortWeight}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setComfortWeight(val);
                          const remaining = 100 - val;
                          setPriceWeight(Math.round(remaining * 0.6));
                          setLogisticsWeight(Math.round(remaining * 0.4));
                        }}
                        className="w-full accent-brand cursor-pointer"
                      />
                    </Field>

                    <Field label={`Peso de Preço (Orçamento): ${priceWeight}%`}>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={priceWeight}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setPriceWeight(val);
                          const remaining = 100 - val;
                          setComfortWeight(Math.round(remaining * 0.6));
                          setLogisticsWeight(Math.round(remaining * 0.4));
                        }}
                        className="w-full accent-brand cursor-pointer"
                      />
                    </Field>

                    <Field label={`Peso de Logística (Conexões/Escalas): ${logisticsWeight}%`}>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={logisticsWeight}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setLogisticsWeight(val);
                          const remaining = 100 - val;
                          setComfortWeight(Math.round(remaining * 0.6));
                          setPriceWeight(Math.round(remaining * 0.4));
                        }}
                        className="w-full accent-brand cursor-pointer"
                      />
                    </Field>
                  </div>

                  <div className="text-[10px] text-muted-foreground flex justify-between pt-2">
                    <span>Soma Total: {comfortWeight + priceWeight + logisticsWeight}%</span>
                    {comfortWeight + priceWeight + logisticsWeight !== 100 && (
                      <span className="text-warning font-semibold">Ajustando pesos automaticamente...</span>
                    )}
                  </div>
                </div>

                <div className="bg-surface-alt/40 border border-border/50 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Restrições Logísticas Ativas
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Conexão Máxima (Horas)">
                      <Input type="number" defaultValue={3} disabled className="h-8 text-xs opacity-70" />
                    </Field>
                    <Field label="Categoria Mínima (Estrelas)">
                      <Input type="number" defaultValue={3} disabled className="h-8 text-xs opacity-70" />
                    </Field>
                  </div>
                  <span className="text-[9px] text-muted-foreground block leading-relaxed">
                    * As restrições de destino são coordenadas inteligentemente pelo cérebro RAG associado ao localizador.
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4 mt-8 flex justify-end gap-3 shrink-0">
              <GhostButton type="button" onClick={() => setRulesOpen(false)}>
                Cancelar
              </GhostButton>
              <PrimaryButton
                type="button"
                onClick={() => saveRulesMut.mutate()}
                disabled={saveRulesMut.isPending || comfortWeight + priceWeight + logisticsWeight !== 100}
                className="text-xs h-9"
              >
                {saveRulesMut.isPending ? "Re-calculando..." : "Salvar e Re-avaliar"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
