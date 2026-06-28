import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Sparkles,
  Send,
  Bot,
  User,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { searchUnsplashPhoto } from "@/lib/unsplash";

export const Route = createFileRoute("/builder/ai")({
  head: () => ({
    meta: [
      { title: "Criador de Sites · TravelOS" },
      { name: "description", content: "Crie seu site completo de forma rápida e simples." },
    ],
  }),
  component: AISiteBuilder,
});

interface Message {
  role: "user" | "assistant";
  content: string;
  progressSteps?: string[];
  currentStepIndex?: number;
  siteLink?: string;
  siteId?: string;
  agencySlug?: string;
}

function AISiteBuilder() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Olá! Sou o assistente virtual da TravelOS. Descreva como você gostaria que fosse o seu novo site de viagens (ex: 'Crie um site focado em ecoturismo na Amazônia, com pacotes e depoimentos') e eu farei toda a montagem para você!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch logged-in user's agencies
  const { data: userAgencies, isLoading: loadingAgencies } = useQuery({
    queryKey: ["user-agencies-ai-builder"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Não autenticado");

      const { data: roles, error } = await supabase
        .from("user_roles")
        .select(
          "agency_id, agencies(id, slug, name, brand_color, brand_color_light, brand_color_fg)",
        )
        .eq("user_id", userData.user.id);

      if (error) throw error;
      return roles || [];
    },
  });

  const [selectedAgencyId, setSelectedAgencyId] = useState<string>("");

  useEffect(() => {
    if (userAgencies && userAgencies.length > 0 && !selectedAgencyId) {
      setSelectedAgencyId(userAgencies[0].agency_id || "");
    }
  }, [userAgencies, selectedAgencyId]);

  const activeAgency = userAgencies?.find((a) => a.agency_id === selectedAgencyId)?.agencies;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, currentProgress]);

  async function handleSend() {
    if (!input.trim() || loading) return;
    if (!selectedAgencyId || !activeAgency) {
      toast.error("Nenhuma agência selecionada.");
      return;
    }

    const userPrompt = input.trim();
    setInput("");
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: userPrompt }]);

    const progressSteps = [
      "Analisando seu pedido...",
      "Selecionando as melhores seções...",
      "Gerando layout de blocos estruturais...",
      "Buscando fotos de alta definição no Unsplash...",
      "Salvando seu site no banco de dados...",
      "Publicando site e gerando link...",
    ];

    setCurrentStep(0);
    setCurrentProgress(progressSteps[0]);

    try {
      // 1. Calling the generate-site-ai Edge Function
      setCurrentStep(1);
      setCurrentProgress(progressSteps[1]);

      const { data: aiResponse, error: aiError } = await supabase.functions.invoke(
        "generate-site-ai",
        {
          body: { prompt: userPrompt, agency_id: selectedAgencyId },
        },
      );

      if (aiError || !aiResponse || !aiResponse.blocks) {
        throw new Error(aiError?.message || "Falha na geração do layout.");
      }

      setCurrentStep(3);
      setCurrentProgress(progressSteps[3]);

      // 2. Unsplash Resolution
      const blocks = aiResponse.blocks;
      const resolvedBlocks = [];
      for (const block of blocks) {
        const blockCopy = JSON.parse(JSON.stringify(block));
        // Check for any Unsplash image keywords in config or default structures
        if (blockCopy.bg_image_url && !blockCopy.bg_image_url.startsWith("http")) {
          const url = await searchUnsplashPhoto(blockCopy.bg_image_url);
          if (url) blockCopy.bg_image_url = url;
        }
        if (blockCopy.image_url && !blockCopy.image_url.startsWith("http")) {
          const url = await searchUnsplashPhoto(blockCopy.image_url);
          if (url) blockCopy.image_url = url;
        }
        if (blockCopy.avatar_url && !blockCopy.avatar_url.startsWith("http")) {
          const url = await searchUnsplashPhoto(blockCopy.avatar_url);
          if (url) blockCopy.avatar_url = url;
        }
        // Nested config items
        if (blockCopy.config) {
          for (const key of Object.keys(blockCopy.config)) {
            const val = blockCopy.config[key];
            if (
              typeof val === "string" &&
              !val.startsWith("http") &&
              (key.includes("image") ||
                key.includes("photo") ||
                key.includes("avatar") ||
                key.includes("background"))
            ) {
              const url = await searchUnsplashPhoto(val);
              if (url) blockCopy.config[key] = url;
            }
          }
        }
        // List items
        if (Array.isArray(blockCopy.items)) {
          for (const item of blockCopy.items) {
            for (const key of Object.keys(item)) {
              const val = item[key];
              if (
                typeof val === "string" &&
                !val.startsWith("http") &&
                (key.includes("image") || key.includes("photo") || key.includes("avatar"))
              ) {
                const url = await searchUnsplashPhoto(val);
                if (url) item[key] = url;
              }
            }
          }
        }
        resolvedBlocks.push(blockCopy);
      }

      setCurrentStep(4);
      setCurrentProgress(progressSteps[4]);

      // 3. Save to database (portal_pages)
      const pageTitle = `Site Gerado - ${new Date().toLocaleDateString()}`;
      const slugValue = `site-${crypto.randomUUID()}`;

      const { data: newPage, error: saveError } = await supabase
        .from("portal_pages")
        .insert({
          agency_id: selectedAgencyId,
          title: pageTitle,
          slug: slugValue,
          blocks: resolvedBlocks,
          template: "default",
          status: "published",
          published_at: new Date().toISOString(),
          seo: {
            meta_title: pageTitle,
            meta_description: "Site completo de turismo gerado automaticamente.",
          },
        })
        .select("id, slug")
        .single();

      if (saveError) throw saveError;

      setCurrentStep(5);
      setCurrentProgress(progressSteps[5]);

      // 4. Log the generation event
      await supabase.from("ai_generation_logs").insert({
        agency_id: selectedAgencyId,
        site_id: newPage.id,
        user_prompt: userPrompt,
        sections_generated: resolvedBlocks.map((b) => b.type),
        status: "success",
      });

      // Construct public link
      const publicLink = `/p/${activeAgency.slug}/${newPage.slug}`;

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Prontinho! Gerei um site totalmente estruturado com os diferenciais, fotos adequadas do Unsplash e CTAs de alta conversão conectados diretamente à sua agência.",
          siteLink: publicLink,
          siteId: newPage.id,
          agencySlug: activeAgency.slug,
        },
      ]);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro durante a geração.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Ops, ocorreu um erro ao gerar o site: ${err.message || "Erro interno"}. Por favor, tente novamente.`,
        },
      ]);
    } finally {
      setLoading(false);
      setCurrentProgress("");
    }
  }

  return (
    <div className="flex h-screen bg-surface-alt/25 select-none overflow-hidden">
      {/* Sidebar options */}
      <div className="w-80 bg-surface border-r border-border flex flex-col shrink-0">
        <div className="p-4 border-b border-border flex items-center gap-3">
          {activeAgency ? (
            <Link
              to="/agency/$slug"
              params={{ slug: activeAgency.slug || "" }}
              className="p-1.5 hover:bg-surface-alt rounded-lg border border-border text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              to="/"
              className="p-1.5 hover:bg-surface-alt rounded-lg border border-border text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}
          <div>
            <h1 className="text-xs font-bold uppercase tracking-wider text-brand">
              Criador de Sites
            </h1>
            <p className="text-[10px] text-muted-foreground">
              Gerador automático de portal e páginas
            </p>
          </div>
        </div>

        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          {loadingAgencies ? (
            <div className="text-xs text-muted-foreground">Carregando agências...</div>
          ) : userAgencies && userAgencies.length > 0 ? (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Agência de Destino
              </label>
              <select
                value={selectedAgencyId}
                onChange={(e) => setSelectedAgencyId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-xs font-medium focus:border-brand"
              >
                {userAgencies.map((ua: any) => (
                  <option key={ua.agency_id} value={ua.agency_id}>
                    {ua.agencies.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg text-xs text-destructive flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Você precisa possuir uma agência associada para usar o construtor.</span>
            </div>
          )}

          <div className="border border-border rounded-xl p-4 bg-surface-alt/20 space-y-2.5">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand" /> Sugestões de temas
            </h3>
            <ul className="space-y-1.5 text-[10px] text-muted-foreground list-disc pl-4 leading-normal">
              <li>"Site de cruzeiros de luxo no Caribe com grid de destinos e depoimentos."</li>
              <li>"Landing page para venda de pacotes promocionais da Disney com cronograma."</li>
              <li>
                "Biolink minimalista azul com links para WhatsApp de cotação e roteiros do mês."
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main chat window */}
      <div className="flex-1 flex flex-col bg-surface overflow-hidden">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 max-w-2xl ${m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                  m.role === "user"
                    ? "bg-brand/10 border-brand text-brand"
                    : "bg-surface-alt border-border text-muted-foreground"
                }`}
              >
                {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className="space-y-2">
                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-brand text-white"
                      : "bg-surface-alt/55 text-foreground border border-border/60"
                  }`}
                >
                  {m.content}
                </div>

                {m.siteLink && (
                  <div className="bg-surface border border-border rounded-xl p-4 max-w-sm space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-green-600">
                      <CheckCircle2 className="w-4 h-4" /> Site Publicado com Sucesso!
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-normal">
                      A landing page foi salva no banco de dados e está com o link ativo para
                      compartilhamento público instantâneo.
                    </p>
                    <div className="flex gap-2">
                      <a
                        href={m.siteLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 h-8 rounded-lg bg-surface border border-border hover:bg-surface-alt text-[10px] font-bold text-center flex items-center justify-center transition-colors"
                      >
                        Visualizar Site
                      </a>
                      <button
                        onClick={() =>
                          navigate({
                            to: "/agency/$slug/portal/pages/$page_id",
                            params: { slug: m.agencySlug!, page_id: m.siteId! },
                          })
                        }
                        className="flex-1 h-8 rounded-lg bg-brand hover:bg-brand-hover text-white text-[10px] font-bold transition-colors"
                      >
                        Editar Seções
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 max-w-xl mr-auto">
              <div className="w-8 h-8 rounded-full bg-surface-alt border border-border flex items-center justify-center shrink-0 text-muted-foreground">
                <Bot className="w-4 h-4" />
              </div>
              <div className="space-y-2 bg-surface-alt/45 border border-border/50 p-4 rounded-2xl text-xs max-w-sm">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div
                      className="w-2.5 h-2.5 bg-brand rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></div>
                    <div
                      className="w-2.5 h-2.5 bg-brand rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    ></div>
                    <div
                      className="w-2.5 h-2.5 bg-brand rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></div>
                  </div>
                  <span className="text-[11px] font-semibold text-brand animate-pulse">
                    {currentProgress}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  Etapa {currentStep + 1} de 6
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-border bg-surface shrink-0 flex gap-2">
          <input
            type="text"
            placeholder="Descreva o site de viagens que você deseja criar..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading || !selectedAgencyId}
            className="flex-1 h-10 px-4 rounded-xl border border-border bg-surface text-xs focus:outline-none focus:border-brand disabled:opacity-50"
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim() || !selectedAgencyId}
            className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center hover:bg-brand-hover disabled:opacity-50 shrink-0 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
