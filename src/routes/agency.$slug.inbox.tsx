import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useInbox } from "@/hooks/use-inbox";
import { useAgency } from "@/lib/agency-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { money } from "@/lib/formatters";
import {
  MessageSquare,
  Send,
  Search,
  Filter,
  Phone,
  Instagram,
  Mail,
  Inbox,
  CheckCheck,
  Clock,
  Sparkles,
  ChevronDown,
  X,
  UserCircle,
  Tag,
  Info,
  UserPlus,
  FolderOpen,
  FileCheck,
  CalendarDays,
  ExternalLink,
  RefreshCw,
  Plus,
  ChevronLeft,
  Bot,
  Paperclip,
  Mic,
  AlertTriangle,
  Settings2,
  Plug,
  AlertCircle,
  Link2,
  Loader2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generateOmnichannelReply } from "@/lib/api/ai-chat.functions";
import { FormInput as Input } from "@/components/ui/input";
import { NativeSelect as Select } from "@/components/ui/select";
import { FormTextarea as Textarea } from "@/components/ui/textarea";

// Supabase client sem tipagem forte para bypassar tabelas novas em compilacao
const db = supabase as any;

export const Route = createFileRoute("/agency/$slug/inbox")({
  head: ({ context }: any) => ({ meta: [{ title: `Caixa de Entrada · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: InboxModule,
});

type Conversation = {
  id: string;
  status: "open" | "pending" | "snoozed" | "closed";
  ai_mode: boolean;
  last_message_at: string | null;
  assigned_user_id: string | null;
  contacts?: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    lead_id?: string | null;
    client_id?: string | null;
    metadata?: any;
  } | null;
  channels?: {
    id: string;
    type: "whatsapp" | "email" | "webchat";
    display_name: string;
  } | null;
  messages?: any[];
};

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "text-green-500",
  email: "text-blue-500",
  instagram: "text-pink-500",
  webchat: "text-purple-500",
};

const CHANNEL_ICONS: Record<string, any> = {
  whatsapp: Phone,
  email: Mail,
  instagram: Instagram,
  webchat: MessageSquare,
};

function formatTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "agora";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000)
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function InboxModule() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/inbox" });
  const queryClient = useQueryClient();

  const {
    selectedId, setSelectedId, searchQuery, setSearchQuery, filterChannel, setFilterChannel,
    mySessionsOnly, setMySessionsOnly, currentUser,
    recording, aiSuggestion, setAiSuggestion, generatingAi, analyzing, uploadingDoc,
    messagesEndRef, fileInputRef,
    conversations, isLoadingConversations, isErrorConversations, errorConversations,
    selectedConversation, messages, isLoadingMessages,
    channels, isLoadingChannels, isErrorChannels, errorChannels,
    matchedLead, matchedClient, matchedClientId,
    explicitLeadId, explicitClientId,
    clientDocs, recentProposals, leadInsights, refetchInsights,
    crmSearchQuery, setCrmSearchQuery, crmSearchType, setCrmSearchType,
    isLinkingOpen, setIsLinkingOpen, crmSearchResults,
    sendReplyMutation, assignToMeMutation,
    linkContactToCrm, handleAttachmentUpload, startRecording, stopRecording,
    generateAiProposalForLead, saveContactNotes, generateAiSuggestion,
    triggerAnalysis, handleDocUpload, createLeadFromSession,
  } = useInbox();

  // Estados locais e de UI pura/formulários que permanecem na rota
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [detailsTab, setDetailsTab] = useState<"profile" | "documents" | "notices" | "ai_templates">("profile");
  const [docTypeToUpload, setDocTypeToUpload] = useState("rg");
  const [contactNotes, setContactNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [isConnectSheetOpen, setIsConnectSheetOpen] = useState(false);
  const [connectType, setConnectType] = useState<"whatsapp" | "gmail" | "instagram" | null>(null);
  const [waPhoneId, setWaPhoneId] = useState("");
  const [waToken, setWaToken] = useState("");
  const [waProvider, setWaProvider] = useState<"meta_official" | "evolution_api">("meta_official");
  const [evolutionUrl, setEvolutionUrl] = useState("");
  const [evolutionKey, setEvolutionKey] = useState("");
  const [gmailAddress, setGmailAddress] = useState("");
  const [resendApiKey, setResendApiKey] = useState("");
  const [gmailSubTab, setGmailSubTab] = useState<"oauth" | "smtp">("oauth");
  const [instaAccountId, setInstaAccountId] = useState("");
  const [instaToken, setInstaToken] = useState("");
  const [submittingConfig, setSubmittingConfig] = useState(false);

  // Carregar anotações locais quando a conversa selecionada muda
  useEffect(() => {
    if (selectedConversation?.contacts?.metadata?.notes) {
      setContactNotes(selectedConversation.contacts.metadata.notes);
    } else {
      setContactNotes("");
    }
  }, [selectedId, selectedConversation]);

  // Função local com feedback de estado local para salvar notas
  async function handleSaveContactNotes() {
    setSavingNotes(true);
    try {
      await saveContactNotes(contactNotes);
    } finally {
      setSavingNotes(false);
    }
  }

  // Função local para enviar resposta
  async function handleSendReply() {
    if (!reply.trim()) return;
    setSendingReply(true);
    try {
      await sendReplyMutation.mutateAsync(reply.trim());
      setReply("");
    } finally {
      setSendingReply(false);
    }
  }

  // Função local para enviar a proposta gerada por IA
  async function handleGenerateAiProposal() {
    const text = await generateAiProposalForLead();
    if (text) {
      setReply((prev) => (prev ? prev + "\n" : "") + text);
    }
  }

  // Filtros locais
  const filteredConversations = conversations.filter((c) => {
    const contact = (c.contacts || {}) as any;
    const channel = (c.channels || {}) as any;
    const matchesSearch =
      (contact.name || "").toLowerCase().includes(crmSearchQuery.toLowerCase()) ||
      (contact.phone || "").includes(crmSearchQuery) ||
      (contact.email || "").toLowerCase().includes(crmSearchQuery.toLowerCase());

    const matchesChannel = filterChannel ? channel.type === filterChannel : true;
    const matchesMySessions = mySessionsOnly && currentUser ? c.assigned_user_id === currentUser.id : true;

    return matchesSearch && matchesChannel && matchesMySessions;
  });

  const activeChannelTypes = Array.from(new Set(channels.map((ch: any) => ch.type)));


  return (
    <div className="flex-1 flex overflow-hidden min-h-0">
      {(isErrorChannels || isErrorConversations) && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-[var(--radius-card)] border border-red-200 bg-red-50 px-4 py-3 shadow-none max-w-md">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-red-800">Erro ao Carregar Inbox</p>
            <p className="ds-meta text-red-600">
              {isErrorChannels && errorChannels instanceof Error ? errorChannels.message
               : isErrorConversations && errorConversations instanceof Error ? errorConversations.message
               : "Verifique as permissões e tente novamente."}
            </p>
          </div>
        </div>
      )}
      {/* ── LEFT COLUMN: Conversations List (Width 320px) ────────────────────── */}
      <aside className={cn(
        "flex flex-col border-r border-border shrink-0 bg-surface/30 w-full md:w-[320px] h-full",
        selectedId ? "hidden md:flex" : "flex"
      )}>
        {/* Header & Connection button */}
        <div className="flex min-h-[var(--ds-toolbar-height)] items-center justify-between px-4 shrink-0 glass-toolbar border-b border-border">
          <h2 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
            <Mail className="w-4 h-4 text-brand" />
            Inbox Central
          </h2>

          <Sheet open={isConnectSheetOpen} onOpenChange={setIsConnectSheetOpen}>
            <SheetTrigger asChild>
              <Button 
                className="flex h-8 items-center gap-1 px-2.5 rounded border-none glass-card border-none text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-border-strong transition-colors cursor-pointer"
                title="Configurar conexões e e-mail"
              >
                <Plug className="w-3.5 h-3.5" />
                <span>Canais</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80 glass-card border-none border-r border-border">
              <SheetHeader className="flex min-h-[var(--ds-toolbar-height)] items-center justify-between px-4 border-b border-border glass-toolbar">
                <SheetTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Settings2 className="w-4 h-4 text-brand" />
                  Conexões de Mensageria
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Conecte contas corporativas do Gmail, WhatsApp Business e Instagram.
                </SheetDescription>
              </SheetHeader>
              
              <div className="p-4 space-y-5 overflow-y-auto dock-offset max-h-[calc(100vh-8rem)]">
                {/* Canais Conectados */}
                <div className="space-y-3">
                  <h3 className="ds-meta font-extrabold uppercase tracking-wide text-muted-foreground">Canais Ativos</h3>
                  {isLoadingChannels ? (
                    <div className="flex justify-center py-4">
                      <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : channels.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3 border border-dashed border-border rounded-[var(--radius-card)] text-center glass bg-white/5 border-white/10/20">
                      Nenhum canal ou conta conectada ainda.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {channels.map((c: any) => {
                        const Icon = CHANNEL_ICONS[c.type] ?? MessageSquare;
                        return (
                          <div key={c.id} className="flex items-center justify-between p-2.5 border-none rounded-[var(--radius-card)] glass bg-white/5 border-white/10/40">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full glass-card border-none border-none">
                                <Icon className={cn("w-3.5 h-3.5", CHANNEL_COLORS[c.type])} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate leading-normal">{c.display_name}</p>
                                <span className="text-[9px] text-muted-foreground uppercase">{c.type}</span>
                              </div>
                            </div>
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-none" title="Ativo" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Ações de Conexão */}
                <div className="space-y-4 pt-2">
                  {!connectType ? (
                    <>
                      <h3 className="ds-meta font-extrabold uppercase tracking-wide text-muted-foreground">Adicionar Conexão</h3>
                      
                      <Button 
                        onClick={() => setConnectType("gmail")}
                        className="flex items-center gap-3 w-full text-left rounded-[var(--radius-card)] border-none px-3 py-2.5 text-xs font-semibold text-foreground hover:glass bg-white/5 border-white/10 transition-all cursor-pointer glass-card border-none"
                      >
                        <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                        <div>
                          <p className="font-bold">Conectar Gmail</p>
                          <span className="ds-meta text-muted-foreground font-normal">Sincronize mensagens do e-mail comercial.</span>
                        </div>
                      </Button>

                      <Button 
                        onClick={() => setConnectType("whatsapp")}
                        className="flex items-center gap-3 w-full text-left rounded-[var(--radius-card)] border-none px-3 py-2.5 text-xs font-semibold text-foreground hover:glass bg-white/5 border-white/10 transition-all cursor-pointer glass-card border-none"
                      >
                        <Phone className="w-4 h-4 text-green-500 shrink-0" />
                        <div>
                          <p className="font-bold">Integrar WhatsApp</p>
                          <span className="ds-meta text-muted-foreground font-normal">Conecte via WhatsApp Cloud API Oficial ou Evolution API.</span>
                        </div>
                      </Button>

                      <Button 
                        onClick={() => setConnectType("instagram")}
                        className="flex items-center gap-3 w-full text-left rounded-[var(--radius-card)] border-none px-3 py-2.5 text-xs font-semibold text-foreground hover:glass bg-white/5 border-white/10 transition-all cursor-pointer glass-card border-none"
                      >
                        <Instagram className="w-4 h-4 text-pink-500 shrink-0" />
                        <div>
                          <p className="font-bold">Integrar Instagram</p>
                          <span className="ds-meta text-muted-foreground font-normal">Receba mensagens diretas da rede Meta.</span>
                        </div>
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-border">
                        <Button
                          onClick={() => setConnectType(null)}
                          className="ds-meta font-black uppercase text-brand hover:underline cursor-pointer flex items-center gap-1 bg-transparent border-none"
                        >
                          ← Voltar
                        </Button>
                        <span className="text-[9px] font-extrabold uppercase text-muted-foreground tracking-wider">
                          {connectType === "gmail" ? "Gmail" : connectType === "whatsapp" ? "WhatsApp" : "Instagram"}
                        </span>
                      </div>

                      {connectType === "gmail" && (
                        <div className="space-y-4">
                          <div className="flex gap-2 p-1 glass bg-white/5 border-white/10 rounded-[var(--radius-card)] border-none">
                            <Button
                              type="button"
                              onClick={() => setGmailSubTab("oauth")}
                              className={cn(
                                "flex-1 text-center py-1 ds-meta font-bold rounded-full transition-all cursor-pointer",
                                gmailSubTab === "oauth"
                                  ? "bg-brand text-white shadow-xs"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              Conta Google (OAuth)
                            </Button>
                            <Button
                              type="button"
                              onClick={() => setGmailSubTab("smtp")}
                              className={cn(
                                "flex-1 text-center py-1 ds-meta font-bold rounded-full transition-all cursor-pointer",
                                gmailSubTab === "smtp"
                                  ? "bg-brand text-white shadow-xs"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              Resend (SMTP)
                            </Button>
                          </div>

                          {gmailSubTab === "oauth" ? (
                            <div className="space-y-3 pt-1">
                              <p className="ds-meta text-muted-foreground leading-normal font-sans">
                                Conecte seu e-mail do Gmail de forma segura usando o protocolo OAuth oficial do Google. Você será redirecionado para a página de consentimento do Google.
                              </p>
                              <Button
                                type="button"
                                disabled={submittingConfig}
                                onClick={async () => {
                                  setSubmittingConfig(true);
                                  try {
                                    const { data: { user } } = await supabase.auth.getUser();
                                    if (!user) throw new Error("Usuário não autenticado no Supabase.");

                                    const { data, error } = await supabase.functions.invoke(
                                      `gmail-oauth?action=get_url&org_id=${agency!.id}&user_id=${user.id}&account_type=personal`,
                                      { method: "GET" }
                                    );

                                    if (error || !data?.url) {
                                      throw new Error(error?.message || "Não foi possível gerar a URL de autorização.");
                                    }

                                    // Redireciona para o consentimento do Google
                                    window.location.href = data.url;
                                  } catch (err: any) {
                                    toast.error("Erro ao iniciar login Google: " + err.message);
                                  } finally {
                                    setSubmittingConfig(false);
                                  }
                                }}
                                className="w-full h-9 rounded-[var(--radius-card)] bg-brand text-white text-xs font-bold hover:bg-brand/90 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                              >
                                {submittingConfig ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Gerando link...
                                  </>
                                ) : (
                                  "Entrar com o Google"
                                )}
                              </Button>
                            </div>
                          ) : (
                            <form onSubmit={async (e) => {
                              e.preventDefault();
                              if (!gmailAddress.trim() || !resendApiKey.trim()) {
                                toast.error("Preencha todos os campos obrigatórios.");
                                return;
                              }
                              const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                              if (!emailPattern.test(gmailAddress.trim())) {
                                toast.error("Formato de e-mail inválido.");
                                return;
                              }
                              const resendKeyPattern = /^re_[a-zA-Z0-9]{8}_[a-zA-Z0-9]{4}_[a-zA-Z0-9]{4}_[a-zA-Z0-9]{4}_[a-zA-Z0-9]{12}$/;
                              if (!resendKeyPattern.test(resendApiKey.trim())) {
                                toast.error("Chave de API do Resend inválida. A chave deve começar com 're_' e seguir o padrão oficial do Resend.");
                                return;
                              }
                              setSubmittingConfig(true);
                              try {
                                await supabase.functions.invoke("ai-orchestrator", {
                                  body: {
                                    action: "save-credential",
                                    agency_id: agency!.id,
                                    provider: "resend_api_key",
                                    key_value: resendApiKey.trim(),
                                    label: "Resend Email Key",
                                  },
                                });

                                await db.from("channels").insert({
                                  agency_id: agency!.id,
                                  type: "email",
                                  display_name: `Gmail (${gmailAddress.trim()})`,
                                  external_id: `gmail-${gmailAddress.trim()}`,
                                  is_active: true,
                                });

                                toast.success("Canal Resend conectado com sucesso!");
                                setConnectType(null);
                                setGmailAddress("");
                                setResendApiKey("");
                                queryClient.invalidateQueries({ queryKey: ["inbox-channels"] });
                              } catch (err: any) {
                                toast.error("Erro ao configurar: " + err.message);
                              } finally {
                                setSubmittingConfig(false);
                              }
                            }} className="space-y-3">
                              <div className="space-y-1">
                                <label className="ds-meta font-bold text-muted-foreground uppercase">E-mail Comercial *</label>
                                <Input
                                  type="email"
                                  required
                                  placeholder="exemplo@gmail.com"
                                  value={gmailAddress}
                                  onChange={(e) => setGmailAddress(e.target.value)}
                                  className="w-full px-2.5 rounded glass-card border-none border-none focus:ring-brand"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="ds-meta font-bold text-muted-foreground uppercase">Resend API Key *</label>
                                <Input
                                  type="password"
                                  required
                                  placeholder="re_..."
                                  value={resendApiKey}
                                  onChange={(e) => setResendApiKey(e.target.value)}
                                  className="w-full px-2.5 rounded glass-card border-none border-none focus:ring-brand"
                                />
                              </div>
                              <Button
                                type="submit"
                                disabled={submittingConfig}
                                className="w-full h-8 rounded bg-brand text-white text-xs font-bold hover:bg-brand/90 cursor-pointer disabled:opacity-50"
                              >
                                {submittingConfig ? "Salvando..." : "Conectar Canal Resend"}
                              </Button>
                            </form>
                          )}
                        </div>
                      )}

                      {connectType === "whatsapp" && (
                        <form onSubmit={async (e) => {
                          e.preventDefault();
                          setSubmittingConfig(true);
                          try {
                            if (waProvider === "meta_official") {
                              if (!waPhoneId.trim() || !waToken.trim()) {
                                toast.error("Preencha o Phone ID e Token.");
                                return;
                              }
                              if (!/^\d+$/.test(waPhoneId.trim())) {
                                toast.error("O Phone ID deve conter apenas números.");
                                return;
                              }
                              if (waToken.trim().length < 32) {
                                toast.error("O Token da API do WhatsApp parece inválido (muito curto).");
                                return;
                              }
                              await Promise.all([
                                supabase.functions.invoke("ai-orchestrator", {
                                  body: {
                                    action: "save-credential",
                                    agency_id: agency!.id,
                                    provider: "whatsapp_phone_id",
                                    key_value: waPhoneId.trim(),
                                    label: "WhatsApp Phone ID",
                                  },
                                }),
                                supabase.functions.invoke("ai-orchestrator", {
                                  body: {
                                    action: "save-credential",
                                    agency_id: agency!.id,
                                    provider: "whatsapp_token",
                                    key_value: waToken.trim(),
                                    label: "WhatsApp Token",
                                  },
                                }),
                              ]);

                              await db.from("channels").insert({
                                agency_id: agency!.id,
                                type: "whatsapp",
                                display_name: `WhatsApp Oficial (${waPhoneId.trim()})`,
                                external_id: `whatsapp-${waPhoneId.trim()}`,
                                is_active: true,
                              });
                            } else {
                              if (!evolutionUrl.trim() || !evolutionKey.trim()) {
                                toast.error("Preencha a URL e a API Key da Evolution.");
                                return;
                              }
                              if (!/^https?:\/\/.+/.test(evolutionUrl.trim())) {
                                toast.error("A URL da Evolution API deve ser válida e começar com http:// ou https://");
                                return;
                              }
                              if (evolutionKey.trim().length < 8) {
                                toast.error("A API Key da Evolution deve ter pelo menos 8 caracteres.");
                                return;
                              }
                              await supabase.functions.invoke("ai-orchestrator", {
                                body: {
                                  action: "save-credential",
                                  agency_id: agency!.id,
                                  provider: "evolution_api_key",
                                  key_value: evolutionKey.trim(),
                                  label: "Evolution API Key",
                                },
                              });

                              const { data: agData } = await db.from("agencies").select("integrations_config").eq("id", agency!.id).single();
                              const oldConfig = agData?.integrations_config || {};
                              await db.from("agencies").update({
                                integrations_config: {
                                  ...oldConfig,
                                  evolution_api_url: evolutionUrl.trim(),
                                  preferred_provider: "evolution_api",
                                }
                              }).eq("id", agency!.id);

                              await db.from("channels").insert({
                                agency_id: agency!.id,
                                type: "whatsapp",
                                display_name: "WhatsApp Evolution API",
                                external_id: "whatsapp-evolution",
                                is_active: true,
                              });
                            }

                            toast.success("WhatsApp integrado com sucesso!");
                            setConnectType(null);
                            setWaPhoneId("");
                            setWaToken("");
                            setEvolutionUrl("");
                            setEvolutionKey("");
                            queryClient.invalidateQueries({ queryKey: ["inbox-channels"] });
                          } catch (err: any) {
                            toast.error("Erro ao configurar: " + err.message);
                          } finally {
                            setSubmittingConfig(false);
                          }
                        }} className="space-y-3">
                          <div className="space-y-1">
                            <label className="ds-meta font-bold text-muted-foreground uppercase">Provedor</label>
                            <Select
                              value={waProvider}
                              onChange={(e) => setWaProvider(e.target.value as any)}
                              className="w-full px-2 rounded glass-card border-none border-none focus:ring-brand"
                            >
                              <option value="meta_official">WhatsApp Cloud (Oficial)</option>
                              <option value="evolution_api">Evolution API (Instância)</option>
                            </Select>
                          </div>

                          {waProvider === "meta_official" ? (
                            <>
                              <div className="space-y-1">
                                <label className="ds-meta font-bold text-muted-foreground uppercase">Phone Number ID *</label>
                                <Input
                                  type="text"
                                  required
                                  placeholder="Digite o ID da linha..."
                                  value={waPhoneId}
                                  onChange={(e) => setWaPhoneId(e.target.value)}
                                  className="w-full px-2.5 rounded glass-card border-none border-none focus:ring-brand"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="ds-meta font-bold text-muted-foreground uppercase">Access Token *</label>
                                <Input
                                  type="password"
                                  required
                                  placeholder="EAA..."
                                  value={waToken}
                                  onChange={(e) => setWaToken(e.target.value)}
                                  className="w-full px-2.5 rounded glass-card border-none border-none focus:ring-brand"
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="space-y-1">
                                <label className="ds-meta font-bold text-muted-foreground uppercase">URL do Servidor *</label>
                                <Input
                                  type="url"
                                  required
                                  placeholder="https://sua-evolution.com"
                                  value={evolutionUrl}
                                  onChange={(e) => setEvolutionUrl(e.target.value)}
                                  className="w-full px-2.5 rounded glass-card border-none border-none focus:ring-brand"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="ds-meta font-bold text-muted-foreground uppercase">Global API Key *</label>
                                <Input
                                  type="password"
                                  required
                                  placeholder="Chave de acesso..."
                                  value={evolutionKey}
                                  onChange={(e) => setEvolutionKey(e.target.value)}
                                  className="w-full px-2.5 rounded glass-card border-none border-none focus:ring-brand"
                                />
                              </div>
                            </>
                          )}

                          <Button
                            type="submit"
                            disabled={submittingConfig}
                            className="w-full h-8 rounded bg-brand text-white text-xs font-bold hover:bg-brand/90 cursor-pointer disabled:opacity-50"
                          >
                            {submittingConfig ? "Gravando chaves..." : "Conectar WhatsApp"}
                          </Button>
                        </form>
                      )}

                      {connectType === "instagram" && (
                        <form onSubmit={async (e) => {
                          e.preventDefault();
                          if (!instaAccountId.trim() || !instaToken.trim()) {
                            toast.error("Preencha o Instagram ID e Token.");
                            return;
                          }
                          setSubmittingConfig(true);
                          try {
                            await supabase.functions.invoke("ai-orchestrator", {
                              body: {
                                action: "save-credential",
                                agency_id: agency!.id,
                                provider: "instagram_access_token",
                                key_value: instaToken.trim(),
                                label: "Instagram Access Token",
                              },
                            });

                            await db.from("channels").insert({
                              agency_id: agency!.id,
                              type: "instagram",
                              display_name: `Instagram (${instaAccountId.trim()})`,
                              external_id: `instagram-${instaAccountId.trim()}`,
                              is_active: true,
                            });

                            toast.success("Instagram conectado com sucesso!");
                            setConnectType(null);
                            setInstaAccountId("");
                            setInstaToken("");
                            queryClient.invalidateQueries({ queryKey: ["inbox-channels"] });
                          } catch (err: any) {
                            toast.error("Erro ao configurar: " + err.message);
                          } finally {
                            setSubmittingConfig(false);
                          }
                        }} className="space-y-3">
                          <div className="space-y-1">
                            <label className="ds-meta font-bold text-muted-foreground uppercase">Instagram Account ID *</label>
                            <Input
                              type="text"
                              required
                              placeholder="Digite o ID da conta..."
                              value={instaAccountId}
                              onChange={(e) => setInstaAccountId(e.target.value)}
                              className="w-full px-2.5 rounded glass-card border-none border-none focus:ring-brand"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="ds-meta font-bold text-muted-foreground uppercase">Meta Page Access Token *</label>
                            <Input
                              type="password"
                              required
                              placeholder="EAA..."
                              value={instaToken}
                              onChange={(e) => setInstaToken(e.target.value)}
                              className="w-full px-2.5 rounded glass-card border-none border-none focus:ring-brand"
                            />
                          </div>
                          <Button
                            type="submit"
                            disabled={submittingConfig}
                            className="w-full h-8 rounded bg-brand text-white text-xs font-bold hover:bg-brand/90 cursor-pointer disabled:opacity-50"
                          >
                            {submittingConfig ? "Salvando chaves..." : "Conectar Instagram"}
                          </Button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Toolbar & Search */}
        <div className="p-4 border-b border-border glass-section space-y-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="w-full pl-9 pr-3 h-10 rounded-[var(--radius-card)] bg-black/10 border border-white/10 focus:ring-brand transition-colors text-sm"
              placeholder="Buscar por contatos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Dynamic channels filter & Meus */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <Button
              onClick={() => setFilterChannel(null)}
              className={`flex h-8 items-center gap-1.5 rounded-full px-3 ds-label-caps transition-colors whitespace-nowrap border ${
                filterChannel === null
                  ? "bg-brand/10 text-brand border-brand/25"
                  : "bg-black/20 text-muted-foreground border-white/10 hover:text-foreground hover:bg-black/40"
              }`}
            >
              <Inbox className="h-3 w-3" />
              Tudo
            </Button>

            {activeChannelTypes.includes("whatsapp") && (
              <Button
                onClick={() => setFilterChannel("whatsapp")}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ds-label-caps transition-colors whitespace-nowrap border ${
                  filterChannel === "whatsapp"
                    ? "bg-green-500/10 text-green-600 border-green-500/25"
                    : "bg-black/20 text-muted-foreground border-white/10 hover:text-foreground hover:bg-black/40"
                }`}
              >
                <Phone className="h-3 w-3" />
                Whats
              </Button>
            )}

            {activeChannelTypes.includes("email") && (
              <Button
                onClick={() => setFilterChannel("email")}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ds-label-caps transition-colors whitespace-nowrap border ${
                  filterChannel === "email"
                    ? "bg-blue-500/10 text-blue-600 border-blue-500/25"
                    : "bg-black/20 text-muted-foreground border-white/10 hover:text-foreground hover:bg-black/40"
                }`}
              >
                <Mail className="h-3 w-3" />
                E-mail
              </Button>
            )}

            {/* Instagram dinâmico se a agência tiver chaves ou conversas dele */}
            {(activeChannelTypes.includes("instagram" as any) || conversations.some(c => (c.channels as any)?.type === "instagram")) && (
              <Button
                onClick={() => setFilterChannel("instagram")}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ds-label-caps transition-colors whitespace-nowrap border ${
                  filterChannel === "instagram"
                    ? "bg-pink-500/10 text-pink-600 border-pink-500/25"
                    : "bg-black/20 text-muted-foreground border-white/10 hover:text-foreground hover:bg-black/40"
                }`}
              >
                <Instagram className="h-3 w-3" />
                Insta
              </Button>
            )}

            <Button
              onClick={() => setMySessionsOnly(!mySessionsOnly)}
              className={`ml-auto flex items-center gap-1 rounded-full px-2.5 py-1 ds-label-caps transition-colors border ${
                mySessionsOnly
                  ? "bg-brand/10 text-brand border-brand/25"
                  : "bg-black/20 text-muted-foreground border-white/10 hover:text-foreground hover:bg-black/40"
              }`}
            >
              Meus
            </Button>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto dock-offset px-2 no-scrollbar space-y-1">
          {isLoadingConversations && (
            <div className="space-y-2 p-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-black/5 border border-white/5 animate-pulse" />
              ))}
            </div>
          )}

          {!isLoadingConversations && filteredConversations.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">Nenhuma conversa encontrada</p>
            </div>
          )}

          {filteredConversations.map((c) => {
            const contact = c.contacts || ({} as any);
            const channel = c.channels || ({} as any);
            const lastMsg = c.messages?.[0] || ({} as any);
            const Icon = CHANNEL_ICONS[channel.type] ?? MessageSquare;
            const isSelected = c.id === selectedId;

            return (
              <Button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  "w-full flex items-start gap-3 p-3 border-b border-border/40 text-left transition-colors relative",
                  isSelected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:glass bg-white/5 border-white/10/50"
                )}
              >
                <div className="relative shrink-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full glass bg-white/5 border-white/10 border-none">
                    {contact.metadata?.avatar_url ? (
                      <img src={contact.metadata.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <UserCircle className="h-5 w-5 text-muted-foreground/60" />
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 rounded-full glass-card border-none p-0.5">
                    <Icon className={cn("h-3 w-3", CHANNEL_COLORS[channel.type] ?? "text-muted-foreground")} />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="truncate text-xs font-semibold text-foreground">
                      {contact.name || "Contato"}
                    </span>
                    <span className="shrink-0 ds-meta text-muted-foreground ml-2">
                      {formatTime(c.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <p className="flex-1 truncate ds-meta text-muted-foreground">
                      {lastMsg.body || "Sem mensagens"}
                    </p>
                  </div>
                  
                  <div className="mt-1.5 flex gap-1 flex-wrap">
                    {c.ai_mode && (
                      <span className="rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 text-[8px] font-bold flex items-center gap-0.5">
                        <Sparkles className="w-2 h-2" /> IA Ativa
                      </span>
                    )}
                    {c.status === "open" && (
                      <span className="rounded bg-green-100 text-green-800 px-1.5 py-0.5 text-[8px] font-bold">
                        Aberto
                      </span>
                    )}
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </aside>

      {/* ── CENTRAL COLUMN: Message Thread & Chat ───────────────────────────────── */}
      <section className={cn(
        "flex flex-1 flex-col border-r border-border h-full min-w-0 relative",
        selectedId ? "flex" : "hidden md:flex"
      )}>
        {selectedId ? (
          <div className="flex flex-1 flex-col h-full overflow-hidden">
            {/* Thread Header */}
            <div className="flex items-center gap-3 border-b border-border px-4 min-h-[var(--ds-toolbar-height)] glass-toolbar shrink-0">
              <Button
                onClick={() => setSelectedId(null)}
                className="md:hidden flex h-8 w-8 items-center justify-center rounded-full border-none glass-card border-none text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Voltar para a lista"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex h-9 w-9 items-center justify-center rounded-full glass bg-white/5 border-white/10 border-none">
                {selectedConversation?.contacts?.metadata?.avatar_url ? (
                  <img
                    src={selectedConversation.contacts.metadata.avatar_url}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <UserCircle className="h-5 w-5 text-muted-foreground/60" />
                )}
              </div>

              <div>
                <div className="text-sm font-semibold text-foreground">
                  {selectedConversation?.contacts?.name || "Contato"}
                </div>
                <div className="flex items-center gap-1 ds-meta text-muted-foreground capitalize">
                  {selectedConversation?.channels?.type && (
                    <>
                      {(() => {
                        const Icon = CHANNEL_ICONS[selectedConversation.channels.type] ?? MessageSquare;
                        return <Icon className={cn("h-3 w-3", CHANNEL_COLORS[selectedConversation.channels.type])} />;
                      })()}
                      via {selectedConversation.channels.type}
                    </>
                  )}
                </div>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <Button
                  onClick={generateAiSuggestion}
                  disabled={generatingAi}
                  className="flex items-center gap-1.5 rounded-full border-none px-2.5 py-1.5 text-xs font-semibold text-brand glass-card border-none hover:glass bg-white/5 border-white/10 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className={cn("h-3.5 w-3.5", generatingAi && "animate-pulse")} />
                  <span>{generatingAi ? "Sugerindo..." : "IA Resposta"}</span>
                </Button>

                <Button
                  onClick={() => setShowDetails(!showDetails)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-none transition-colors hover:glass bg-white/5 border-white/10 cursor-pointer",
                    showDetails ? "glass bg-white/5 border-white/10 text-brand" : "text-muted-foreground glass-card border-none"
                  )}
                  title="Ocultar/Mostrar painel do contato"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* AI Suggestion Banner */}
            {aiSuggestion && (
              <div className="mx-4 mt-3 rounded-[var(--radius-card)] border border-brand/20 bg-brand/5 p-3 shrink-0">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="ds-meta font-extrabold uppercase tracking-wide text-brand mb-1">
                      Sugestão da IA
                    </div>
                    <p className="text-xs text-foreground leading-relaxed">{aiSuggestion}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      onClick={() => {
                        setReply(aiSuggestion);
                        setAiSuggestion(null);
                      }}
                      className="rounded bg-brand px-2.5 py-1 ds-meta font-bold text-brand-foreground hover:bg-brand/90 transition-colors cursor-pointer"
                    >
                      Usar
                    </Button>
                    <Button onClick={() => setAiSuggestion(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Messages Thread list */}
            <div className="flex-1 overflow-y-auto dock-offset p-4 space-y-3 glass bg-white/5 border-white/10/10">
              {isLoadingMessages && (
                <div className="flex justify-center items-center h-24">
                  <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}
              
              {!isLoadingMessages && messages.map((m: any) => (
                <div key={m.id} className={cn("flex w-full", m.direction === "outbound" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[70%] rounded-[var(--radius-card)] px-4 py-2.5 text-sm leading-relaxed relative group",
                    m.direction === "outbound"
                      ? "bg-brand text-brand-foreground rounded-br-sm"
                      : "glass-card border-none text-foreground rounded-bl-sm border-none"
                  )}>
                    {m.media_url && (
                      <div className="mb-2 max-w-full">
                        {m.media_url.endsWith(".webm") || m.media_url.includes("audio") ? (
                          <audio src={m.media_url} controls className="max-w-full h-10" />
                        ) : (
                          <img src={m.media_url} alt="Media" className="rounded-[var(--radius-card)] max-w-full object-contain max-h-48" />
                        )}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <div className={cn(
                      "mt-1 flex items-center justify-end gap-1 text-[9px] opacity-70",
                      m.direction === "outbound" ? "text-brand-foreground" : "text-muted-foreground"
                    )}>
                      {formatTime(m.created_at)}
                      {m.direction === "outbound" && (
                        m.status === "read" ? <CheckCheck className="h-3 w-3 text-blue-300" /> :
                        m.status === "delivered" ? <CheckCheck className="h-3 w-3" /> :
                        m.status === "failed" ? <AlertTriangle className="h-3 w-3 text-red-500" /> :
                        <CheckCheck className="h-3 w-3 opacity-50" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input & Sending Actions */}
            <div className="border-t border-border p-4 glass-section shrink-0">
              {reply && aiSuggestion && (
                <div className="mb-3 flex items-start gap-2 rounded-[var(--radius-card)] border border-brand/20 bg-brand/5 p-3 text-xs text-brand relative">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <div className="flex-1 leading-relaxed">
                    <p className="font-bold mb-1 uppercase tracking-wider text-[9px]">Sugestão da IA</p>
                    <p>{aiSuggestion}</p>
                  </div>
                  <Button
                    onClick={() => setAiSuggestion(null)}
                    className="absolute top-2 right-2 h-5 w-5 rounded-full hover:bg-brand/10 text-brand flex items-center justify-center p-0 border-none cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <Button
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-card)] border border-border glass-card border-none hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  title="Anexar arquivo"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input type="file" ref={fileInputRef} onChange={handleAttachmentUpload} className="hidden" />

                <Button
                  onClick={recording ? stopRecording : startRecording}
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-card)] border transition-all cursor-pointer",
                    recording
                      ? "bg-red-500 border-red-500 text-white animate-pulse"
                      : "border-border glass-card border-none hover:bg-white/10 text-muted-foreground hover:text-foreground"
                  )}
                  title={recording ? "Parar gravação" : "Gravar mensagem de voz"}
                >
                  <Mic className="h-4 w-4" />
                </Button>

                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (reply.trim()) sendReplyMutation.mutate(reply);
                    }
                  }}
                  placeholder={recording ? "Gravando áudio..." : "Digite uma mensagem…"}
                  rows={2}
                  disabled={recording}
                  className="flex-1 resize-none rounded-[var(--radius-card)] border border-white/10 bg-black/10 py-2.5 focus:border-brand text-sm h-10 min-h-0"
                />
                
                <Button
                  onClick={() => {
                    if (reply.trim()) sendReplyMutation.mutate(reply);
                  }}
                  disabled={sendingReply || !reply.trim() || recording}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-card)] bg-brand text-brand-foreground hover:bg-brand/90 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Empty Chat State */
          <div className="flex flex-1 flex-col items-center justify-center p-10 text-center glass-card border-none border-r border-border h-full">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[var(--radius-card)] glass bg-white/5 border-white/10">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">Selecione uma conversa</h3>
            <p className="text-xs text-muted-foreground max-w-xs leading-normal">
              Escolha uma conversa na lista ao lado para ver as mensagens e responder ao cliente.
            </p>
          </div>
        )}
      </section>

      {/* ── RIGHT COLUMN: Collapsible Contact Info Panel (Width 320px) ───────────────── */}
      {selectedId && showDetails && (
        <aside className="fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-border bg-surface/30 overflow-hidden md:relative md:w-80 md:z-0 md:flex shadow-2xl md:shadow-none h-full">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 min-h-[var(--ds-toolbar-height)] glass-toolbar shrink-0">
            <h3 className="ds-meta font-extrabold uppercase tracking-wider text-muted-foreground">
              Painel do Cliente
            </h3>
            <Button onClick={() => setShowDetails(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Sub-Tabs */}
          <div className="flex border-b border-border text-xs font-bold shrink-0 glass bg-white/5 border-white/10/30">
            <Button
              onClick={() => setDetailsTab("profile")}
              className={cn(
                "flex-1 py-2.5 text-center border-b-2 transition-colors cursor-pointer",
                detailsTab === "profile" ? "border-brand text-brand font-bold" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Perfil
            </Button>
            <Button
              onClick={() => setDetailsTab("documents")}
              className={cn(
                "flex-1 py-2.5 text-center border-b-2 transition-colors cursor-pointer",
                detailsTab === "documents" ? "border-brand text-brand font-bold" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Docs
            </Button>
            <Button
              onClick={() => setDetailsTab("notices")}
              className={cn(
                "flex-1 py-2.5 text-center border-b-2 transition-colors cursor-pointer",
                detailsTab === "notices" ? "border-brand text-brand font-bold" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Avisos
            </Button>
            <Button
              onClick={() => setDetailsTab("ai_templates")}
              className={cn(
                "flex-1 py-2.5 text-center border-b-2 transition-colors cursor-pointer",
                detailsTab === "ai_templates" ? "border-brand text-brand font-bold" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Templates
            </Button>
          </div>

          {/* Tab content scroll block */}
          <div className="flex-1 overflow-y-auto dock-offset no-scrollbar">
            {/* Tab: Profile */}
            {detailsTab === "profile" && (
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full glass bg-white/5 border-white/10 border-none">
                    {selectedConversation?.contacts?.metadata?.avatar_url ? (
                      <img src={selectedConversation.contacts.metadata.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <UserCircle className="h-6 w-6 text-muted-foreground/60" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-xs font-bold text-foreground">
                      {selectedConversation?.contacts?.name || "Contato desconhecido"}
                    </h4>
                    <span className="text-[9px] text-muted-foreground block truncate">
                      {selectedConversation?.contacts?.phone || selectedConversation?.contacts?.email || ""}
                    </span>
                  </div>
                </div>

                {/* CRM Sync details */}
                <div className="glass bg-white/5 border-white/10/40 border-none rounded-[var(--radius-card)] p-3 space-y-3">
                  {isLinkingOpen ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                        <span className="text-[9px] font-extrabold uppercase tracking-wide text-foreground">
                          Vincular Contato ao CRM
                        </span>
                        <Button
                          onClick={() => {
                            setIsLinkingOpen(false);
                            setCrmSearchQuery("");
                          }}
                          className="text-[9px] font-bold text-muted-foreground hover:text-foreground"
                        >
                          Cancelar
                        </Button>
                      </div>

                      <div className="flex gap-1.5">
                        <Button
                          type="button"
                          onClick={() => setCrmSearchType("lead")}
                          className={cn(
                            "flex-1 py-1 text-[9px] font-bold rounded",
                            crmSearchType === "lead"
                              ? "bg-brand text-brand-foreground"
                              : "glass bg-white/5 border-white/10 text-muted-foreground hover:glass bg-white/5 border-white/10/80 border-none/50"
                          )}
                        >
                          Lead
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setCrmSearchType("client")}
                          className={cn(
                            "flex-1 py-1 text-[9px] font-bold rounded",
                            crmSearchType === "client"
                              ? "bg-brand text-brand-foreground"
                              : "glass bg-white/5 border-white/10 text-muted-foreground hover:glass bg-white/5 border-white/10/80 border-none/50"
                          )}
                        >
                          Cliente
                        </Button>
                      </div>

                      <Input
                        type="text"
                        value={crmSearchQuery}
                        onChange={(e) => setCrmSearchQuery(e.target.value)}
                        placeholder="Buscar por nome (min. 3 letras)..."
                        className="w-full px-2.5 rounded border-none glass-card border-none focus:border-brand"
                      />

                      {crmSearchQuery.length > 2 && crmSearchResults.length === 0 && (
                        <p className="ds-meta text-muted-foreground text-center py-1">
                          Nenhum resultado encontrado.
                        </p>
                      )}

                      {crmSearchResults.length > 0 && (
                        <div className="max-h-28 overflow-y-auto border-none/50 rounded glass-card border-none divide-y divide-border/30">
                          {crmSearchResults.map((res: any) => (
                            <Button
                              key={res.id}
                              type="button"
                              onClick={() => {
                                if (crmSearchType === "lead") {
                                  linkContactToCrm(res.id, null);
                                } else {
                                  linkContactToCrm(null, res.id);
                                }
                              }}
                              className="w-full text-left px-2.5 py-1.5 hover:glass bg-white/5 border-white/10/40 ds-meta text-foreground flex flex-col cursor-pointer"
                            >
                              <span className="font-semibold">{res.name}</span>
                              <span className="text-[8px] text-muted-foreground">
                                {res.email || ""} {res.phone ? `(${res.phone})` : ""}
                              </span>
                            </Button>
                          ))}
                        </div>
                      )}

                      {(explicitLeadId || explicitClientId) && (
                        <Button
                          type="button"
                          onClick={() => linkContactToCrm(null, null)}
                          className="w-full text-center py-1 border border-danger/30 text-danger bg-danger/5 hover:bg-danger/10 text-[9px] font-bold rounded mt-1"
                        >
                          Remover Vínculo Atual
                        </Button>
                      )}
                    </div>
                  ) : matchedLead ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-extrabold uppercase tracking-wide text-brand">
                          Lead no CRM
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => setIsLinkingOpen(true)}
                            className="text-[9px] font-bold text-muted-foreground hover:text-brand hover:underline"
                          >
                            Alterar vínculo
                          </Button>
                          <Link
                            to="/agency/$slug/crm/$lead_id"
                            params={{ slug: agency?.slug || "", lead_id: (matchedLead as any).id }}
                            className="text-[9px] font-bold text-brand hover:underline flex items-center gap-0.5"
                          >
                            Ver Ficha <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                      </div>
                      <p className="text-xs font-bold text-foreground leading-snug">{(matchedLead as any).name}</p>
                      {(matchedLead as any).email && <p className="ds-meta text-muted-foreground">{(matchedLead as any).email}</p>}
                    </div>
                  ) : matchedClient ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-extrabold uppercase tracking-wide text-emerald-600">
                          Cliente Cadastrado
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => setIsLinkingOpen(true)}
                            className="text-[9px] font-bold text-muted-foreground hover:text-emerald-600 hover:underline"
                          >
                            Alterar vínculo
                          </Button>
                          <Link
                            to="/agency/$slug/clients/$id"
                            params={{ slug: agency?.slug || "", id: (matchedClient as any).id }}
                            className="text-[9px] font-bold text-emerald-600 hover:underline flex items-center gap-0.5"
                          >
                            Ver Perfil <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                      </div>
                      <p className="text-xs font-bold text-foreground leading-snug">{(matchedClient as any).full_name}</p>
                    </div>
                  ) : (
                    <div className="space-y-2 text-center py-1">
                      <p className="ds-meta text-muted-foreground">Não localizado no CRM</p>
                      <div className="flex flex-col gap-1.5">
                        <Button
                          onClick={createLeadFromSession}
                          className="w-full ds-meta font-bold border border-brand/35 text-brand bg-brand/5 hover:bg-brand/10 py-1.5 rounded-[var(--radius-card)] flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Importar como Lead
                        </Button>
                        <Button
                          onClick={() => setIsLinkingOpen(true)}
                          className="w-full ds-meta font-bold border-none text-muted-foreground glass-card border-none hover:text-foreground hover:glass bg-white/5 border-white/10/25 py-1.5 rounded-[var(--radius-card)] flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Link2 className="w-3.5 h-3.5" /> Vincular Lead/Cliente Existente
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick actions */}
                <div className="space-y-2">
                  <h4 className="ds-meta font-extrabold uppercase tracking-wider text-muted-foreground">
                    Ações Rápidas
                  </h4>
                  <div className="space-y-1.5">
                    {matchedLead && (
                      <Button
                        onClick={handleGenerateAiProposal}
                        className="flex items-center gap-2 w-full text-left rounded-[var(--radius-card)] border border-brand/20 bg-brand/5 px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand/10 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Gerar Proposta IA</span>
                      </Button>
                    )}

                    <Button
                      onClick={() => {
                        setReply((prev) => (prev ? prev + "\n" : "") + `Olá! Segue o link para assinatura do seu contrato: ${window.location.origin}/m/contract/assinar-aqui`);
                        toast.success("Link do contrato copiado!");
                      }}
                      className="flex items-center gap-2 w-full text-left rounded-[var(--radius-card)] border-none px-3 py-1.5 text-xs font-bold text-foreground hover:glass bg-white/5 border-white/10/50 transition-colors cursor-pointer glass-card border-none"
                    >
                      <FileCheck className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Enviar Contrato</span>
                    </Button>

                    <Button
                      onClick={() => {
                        setReply((prev) => (prev ? prev + "\n" : "") + `Olá! Você pode acompanhar sua viagem e vouchers direto pelo nosso Portal do Cliente: ${window.location.origin}/client`);
                        toast.success("Link do portal de cliente copiado!");
                      }}
                      className="flex items-center gap-2 w-full text-left rounded-[var(--radius-card)] border-none px-3 py-1.5 text-xs font-bold text-foreground hover:glass bg-white/5 border-white/10/50 transition-colors cursor-pointer glass-card border-none"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>MagicLink Portal</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Documents */}
            {detailsTab === "documents" && (
              <div className="p-4 space-y-4">
                <h4 className="ds-meta font-extrabold uppercase tracking-wider text-muted-foreground">
                  Documentos Pessoais
                </h4>

                {matchedClientId ? (
                  <div className="p-3 border-none rounded-[var(--radius-card)] glass bg-white/5 border-white/10/40 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="ds-meta font-bold text-foreground">Tipo de Doc:</span>
                      <Select
                        value={docTypeToUpload}
                        onChange={(e) => setDocTypeToUpload(e.target.value)}
                        className="h-7 ds-meta rounded border-none glass-card border-none px-1"
                      >
                        <option value="rg">RG</option>
                        <option value="cpf">CPF</option>
                        <option value="passport">Passaporte</option>
                        <option value="cnh">CNH</option>
                        <option value="visa">Visto</option>
                        <option value="other">Outro</option>
                      </Select>
                    </div>
                    <div className="relative">
                      <Input type="file" id="client-doc-inbox-upload" onChange={(e) => handleDocUpload(e, docTypeToUpload)} disabled={uploadingDoc} className="hidden" />
                      <Button
                        onClick={() => document.getElementById("client-doc-inbox-upload")?.click()}
                        disabled={uploadingDoc}
                        className="w-full h-16 border border-dashed border-border hover:border-brand/50 rounded-[var(--radius-card)] flex flex-col items-center justify-center ds-meta font-medium text-muted-foreground glass-card border-none hover:text-foreground cursor-pointer transition-colors disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4 mb-1 text-muted-foreground/60" />
                        {uploadingDoc ? "Enviando..." : "Upload Documento"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="ds-meta text-muted-foreground text-center py-3 glass bg-white/5 border-white/10/30 border border-dashed border-border rounded-[var(--radius-card)]">
                    Cadastre o lead como cliente no CRM primeiro para gerenciar seus documentos.
                  </p>
                )}

                {matchedClientId && (
                  <div className="space-y-2">
                    {clientDocs.length > 0 ? (
                      clientDocs.map((doc: any) => (
                        <div key={doc.id} className="p-3 border-none rounded-[var(--radius-card)] glass-card border-none flex flex-col gap-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-brand uppercase ds-meta">{doc.doc_type}</span>
                            {doc.file_url && (
                              <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-brand font-bold hover:underline flex items-center gap-0.5 ds-meta">
                                Ver arquivo <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          <span className="font-mono text-muted-foreground ds-meta">{doc.doc_number || "Sem número"}</span>
                        </div>
                      ))
                    ) : (
                      <p className="ds-meta text-muted-foreground text-center py-4">Nenhum documento anexado.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Notices (Avisos e Notas de Observações) */}
            {detailsTab === "notices" && (
              <div className="p-4 space-y-4">
                {matchedLead || matchedClient ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="ds-meta font-extrabold uppercase tracking-wider text-muted-foreground">
                        Observações Internas
                      </h4>
                      <Button onClick={handleSaveContactNotes} disabled={savingNotes} className="ds-meta text-brand font-bold hover:underline disabled:opacity-50 cursor-pointer">
                        {savingNotes ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                    <Textarea
                      value={contactNotes}
                      onChange={(e) => setContactNotes(e.target.value)}
                      placeholder="Escreva notas importantes sobre este contato..."
                      rows={10}
                      className="w-full p-2.5 border-none rounded-[var(--radius-card)] glass-card border-none focus:border-brand resize-none leading-relaxed"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-6">Notas disponíveis apenas para contatos cadastrados no CRM.</p>
                )}
              </div>
            )}

            {/* Tab: AI Templates (RAG Insights) */}
            {detailsTab === "ai_templates" && (
              <div className="p-4 space-y-4">
                {matchedLead ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="ds-meta font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Bot className="w-3.5 h-3.5 text-brand" /> IA RAG Insights
                      </h4>
                      <Button onClick={triggerAnalysis} disabled={analyzing} className="ds-meta text-brand font-bold hover:underline flex items-center gap-1 disabled:opacity-50 cursor-pointer">
                        <RefreshCw className={cn("w-3 h-3", analyzing && "animate-spin")} />
                        <span>Atualizar</span>
                      </Button>
                    </div>

                    {leadInsights ? (
                      <div className="space-y-2">
                        {(leadInsights as any).general_profile && (
                          <div className="ds-meta bg-brand/5 border border-brand/10 p-2.5 rounded-[var(--radius-card)] text-foreground leading-relaxed">
                            <strong>Comportamento:</strong> {(leadInsights as any).general_profile}
                          </div>
                        )}
                        {(leadInsights as any).general_sentiment && (
                          <div className="ds-meta bg-brand/5 border border-brand/10 p-2.5 rounded-[var(--radius-card)] text-foreground leading-relaxed">
                            <strong>Sentimento:</strong> {(leadInsights as any).general_sentiment}
                          </div>
                        )}
                        {(leadInsights as any).generalized_objections && (
                          <div className="ds-meta bg-brand/5 border border-brand/10 p-2.5 rounded-[var(--radius-card)] text-foreground leading-relaxed">
                            <strong>Objeções:</strong> {(leadInsights as any).generalized_objections}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="ds-meta text-muted-foreground text-center py-2 glass bg-white/5 border-white/10/30 border border-dashed border-border rounded-[var(--radius-card)]">
                        Sem insights gerados. Clique em atualizar.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-6">RAG insights disponíveis apenas para Leads.</p>
                )}
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
