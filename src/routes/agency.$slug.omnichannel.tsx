import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  ChevronRight,
  ChevronLeft,
  Bot,
  Paperclip,
  Mic,
  Trash2
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { toast } from "sonner";
import { generateOmnichannelReply } from "@/lib/api/ai-chat.functions";
import { NewTicketSheet } from "@/components/support/NewTicketSheet";

export const Route = createFileRoute("/agency/$slug/omnichannel")({
  head: () => ({ meta: [{ title: "Omnichannel · TravelOS" }] }),
  component: OmnichannelPage,
});

type Session = {
  id: string;
  channel: string;
  contact_id: string | null;
  contact_name: string | null;
  contact_avatar_url: string | null;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  status: string;
  tags: string[];
  assigned_to: string | null;
};

type Message = {
  id: string;
  session_id: string;
  direction: "inbound" | "outbound";
  channel: string;
  content: string;
  media_url: string | null;
  status: string;
  created_at: string;
};

const CHANNEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  whatsapp: Phone,
  instagram: Instagram,
  email: Mail,
};

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "text-green-500",
  instagram: "text-pink-500",
  email: "text-blue-500",
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

function OmnichannelPage() {
  const { agency } = useAgency();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterChannel, setFilterChannel] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // States for new details panel & quick actions
  const [showDetails, setShowDetails] = useState(true);
  const [ticketSheetOpen, setTicketSheetOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // ── Sessions ───────────────────────────────────────────────────
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    enabled: !!agency,
    queryKey: ["omnichannel-sessions", agency?.id, filterChannel],
    queryFn: async () => {
      let q = (supabase.from as any)("omnichannel_sessions")
        .select(
          "id, channel, contact_id, contact_name, contact_avatar_url, unread_count, last_message_at, last_message_preview, status, tags, assigned_to",
        )
        .eq("agency_id", agency!.id)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (filterChannel) q = q.eq("channel", filterChannel);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Session[];
    },
  });

  const selectedSession = sessions.find((s) => s.id === selectedId);

  // ── Matched Lead ───────────────────────────────────────────────
  const { data: matchedLead, refetch: refetchLead } = useQuery({
    enabled: !!selectedSession?.contact_id && !!agency?.id,
    queryKey: ["omnichannel-matched-lead", selectedSession?.contact_id],
    queryFn: async () => {
      const contactId = selectedSession!.contact_id!;
      const cleanContactId = contactId.replace(/\D/g, "");
      
      const { data: leads, error } = await supabase
        .from("leads")
        .select("*")
        .eq("agency_id", agency!.id)
        .is("deleted_at", null);
        
      if (error) throw error;
      
      const found = leads.find(l => {
        const cleanPhone = l.phone?.replace(/\D/g, "");
        return (cleanPhone && cleanPhone === cleanContactId) || 
               (l.email && l.email.toLowerCase() === contactId.toLowerCase()) ||
               l.id === contactId;
      });
      return found || null;
    }
  });

  // ── Matched Client ─────────────────────────────────────────────
  const { data: matchedClient } = useQuery({
    enabled: !!selectedSession?.contact_id && !!agency?.id,
    queryKey: ["omnichannel-matched-client", selectedSession?.contact_id],
    queryFn: async () => {
      const contactId = selectedSession!.contact_id!;
      const cleanContactId = contactId.replace(/\D/g, "");
      
      const { data: clients, error } = await supabase
        .from("clients")
        .select("*")
        .eq("agency_id", agency!.id)
        .is("deleted_at", null);
        
      if (error) throw error;
      
      const found = clients.find(c => {
        const cleanPhone = c.phone?.replace(/\D/g, "");
        return (cleanPhone && cleanPhone === cleanContactId) || 
               (c.email && c.email.toLowerCase() === contactId.toLowerCase()) ||
               c.id === contactId;
      });
      return found || null;
    }
  });

  // ── Lead Insights (AI Hunter) ──────────────────────────────────
  const { data: leadInsights, refetch: refetchInsights } = useQuery({
    enabled: !!matchedLead?.id,
    queryKey: ["omnichannel-lead-insights", matchedLead?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_insights")
        .select("*")
        .eq("lead_id", matchedLead!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
  });

  // ── Messages ───────────────────────────────────────────────────
  const { data: messages = [] } = useQuery({
    enabled: !!selectedId,
    queryKey: ["omnichannel-messages", selectedId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("omnichannel_messages")
        .select("id, session_id, direction, channel, content, media_url, status, created_at")
        .eq("session_id", selectedId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Message[];
    },
    refetchInterval: 5000,
  });

  // ── Audio Recording & File Trigger states ──────────────────────
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Mark session as read when opened
  useEffect(() => {
    if (selectedId) {
      (supabase.rpc as any)("mark_session_read", { p_session_id: selectedId }).catch(() => {});
      qc.setQueryData(
        ["omnichannel-sessions", agency?.id, filterChannel],
        (old: Session[] | undefined) =>
          old?.map((s) => (s.id === selectedId ? { ...s, unread_count: 0 } : s)) ?? [],
      );
    }
  }, [selectedId, agency?.id, filterChannel, qc]);

  const filteredSessions = sessions.filter((s) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      s.contact_name?.toLowerCase().includes(term) ||
      s.last_message_preview?.toLowerCase().includes(term)
    );
  });

  async function sendMessage() {
    if (!reply.trim() || !selectedId) return;
    setSendingReply(true);
    const { error } = await supabase.from("omnichannel_messages").insert({
      session_id: selectedId,
      channel: selectedSession?.channel ?? "whatsapp",
      direction: "outbound",
      content: reply.trim(),
      status: "sent",
      agency_id: agency!.id,
      lead_id: matchedLead?.id || null
    });
    if (error) toast.error("Erro ao enviar mensagem: " + error.message);
    else {
      setReply("");
      qc.invalidateQueries({ queryKey: ["omnichannel-messages", selectedId] });
      qc.invalidateQueries({ queryKey: ["omnichannel-sessions", agency?.id] });
    }
    setSendingReply(false);
  }

  async function generateAiSuggestion() {
    if (!selectedId || !agency?.id) return;
    setGeneratingAi(true);
    setAiSuggestion(null);
    try {
      const res = await generateOmnichannelReply({
        data: {
          agencyId: agency.id,
          sessionId: selectedId,
        },
      });
      setAiSuggestion(res.suggestion);
    } catch (error: any) {
      toast.error("Erro ao gerar sugestão de IA: " + error.message);
    } finally {
      setGeneratingAi(false);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const file = new File([blob], "audio_recording.webm", { type: "audio/webm" });
        
        const toastId = toast.loading("Enviando áudio gravado...");
        try {
          const filePath = `omnichannel/attachments/${selectedId}/${Date.now()}.webm`;
          const { error: uploadError } = await supabase.storage
            .from("agency-media")
            .upload(filePath, file);
          if (uploadError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage
            .from("agency-media")
            .getPublicUrl(filePath);
            
          const { error } = await supabase.from("omnichannel_messages").insert({
            session_id: selectedId,
            channel: selectedSession?.channel ?? "whatsapp",
            direction: "outbound",
            content: "Mensagem de Voz",
            media_url: publicUrl,
            media_type: "audio",
            status: "sent",
            agency_id: agency!.id,
            lead_id: matchedLead?.id || null
          });
          if (error) throw error;
          toast.success("Áudio enviado com sucesso!", { id: toastId });
          qc.invalidateQueries({ queryKey: ["omnichannel-messages", selectedId] });
        } catch (err: any) {
          toast.error("Erro ao enviar áudio: " + err.message, { id: toastId });
        }
      };
      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (err: any) {
      toast.error("Permissão de microfone negada ou não suportada.");
    }
  }

  function stopRecording() {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track: any) => track.stop());
      setRecording(false);
    }
  }

  async function handleAttachmentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedId || !agency) return;
    const toastId = toast.loading(`Enviando ${file.name}...`);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `omnichannel/attachments/${selectedId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("agency-media")
        .upload(filePath, file);
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from("agency-media")
        .getPublicUrl(filePath);
        
      const { error } = await supabase.from("omnichannel_messages").insert({
        session_id: selectedId,
        channel: selectedSession?.channel ?? "whatsapp",
        direction: "outbound",
        content: `Arquivo anexo: ${file.name}`,
        media_url: publicUrl,
        media_type: file.type.startsWith("image/") ? "image" : file.type.startsWith("audio/") ? "audio" : "document",
        status: "sent",
        agency_id: agency.id,
        lead_id: matchedLead?.id || null
      });
      if (error) throw error;
      
      toast.success("Arquivo enviado com sucesso!", { id: toastId });
      qc.invalidateQueries({ queryKey: ["omnichannel-messages", selectedId] });
      qc.invalidateQueries({ queryKey: ["omnichannel-sessions", agency?.id] });
    } catch (err: any) {
      toast.error("Erro ao enviar anexo: " + err.message, { id: toastId });
    }
  }

  async function createLeadFromSession() {
    if (!selectedSession || !agency) return;
    const toastId = toast.loading("Criando lead...");
    try {
      const { data: stages, error: stagesErr } = await supabase
        .from("lead_stages")
        .select("id")
        .eq("agency_id", agency.id)
        .order("position", { ascending: true })
        .limit(1);
      
      if (stagesErr) throw stagesErr;
      if (!stages || stages.length === 0) {
        throw new Error("Nenhuma etapa do funil configurada. Crie as etapas no CRM primeiro.");
      }
      
      const phoneClean = selectedSession.contact_id?.replace(/\D/g, "") || "";
      const { data: newLead, error } = await supabase.from("leads").insert({
        agency_id: agency.id,
        name: selectedSession.contact_name || "Lead via Chat",
        phone: phoneClean,
        source: "whatsapp",
        stage_id: stages[0].id,
        staleness_status: "active"
      } as any).select("id").single();
      if (error) throw error;
      toast.success("Lead criado com sucesso!", { id: toastId });
      qc.invalidateQueries({ queryKey: ["omnichannel-matched-lead", selectedSession.contact_id] });
    } catch (err: any) {
      toast.error("Erro ao criar lead: " + err.message, { id: toastId });
    }
  }

  async function generateAiProposalForLead() {
    if (!matchedLead?.id || !agency) return;
    const toastId = toast.loading("Analisando conversa e gerando cotação por IA...");
    try {
      const { data, error } = await supabase.functions.invoke("ai-message-processor", {
        body: { action: "create_proposal", lead_id: matchedLead.id, agency_id: agency.id },
      });
      if (error) throw error;
      const url = `${window.location.origin}/m/proposal/${data.public_token}`;
      setReply(prev => (prev ? prev + "\n" : "") + `Olá! Preparamos uma proposta personalizada para você. Veja os detalhes e confirme neste link: ${url}`);
      toast.success("Cotação gerada e link adicionado à mensagem!", { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao gerar cotação por IA: " + err.message, { id: toastId });
    }
  }

  async function triggerAnalysis() {
    if (!matchedLead?.id || !agency) return;
    setAnalyzing(true);
    const toastId = toast.loading("Analisando perfil comportamental...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/ai-message-processor`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ record: { lead_id: matchedLead.id, agency_id: agency.id } }),
      });
      if (!res.ok) throw new Error("Falha na análise");
      await refetchInsights();
      toast.success("Análise da IA concluída!", { id: toastId });
    } catch (e: any) {
      toast.error(e.message || "Falha ao analisar", { id: toastId });
    } finally {
      setAnalyzing(false);
    }
  }

  if (!agency) return null;

  return (
    <>
      <div className="flex h-[calc(100vh-3rem)] w-full p-0 m-0 border-0 rounded-none overflow-hidden bg-background">
        {/* ── SIDEBAR: Session List ─────────────────────────────── */}
        <aside className="flex w-80 shrink-0 flex-col border-r border-border bg-surface">
          {/* Search + Filter */}
          <div className="space-y-2 p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar conversa..."
                className="w-full rounded-md border border-border bg-surface-alt pl-8 pr-3 py-2 text-xs outline-none focus:border-brand"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {/* Channel filter tabs */}
            <div className="flex gap-1">
              {[null, "whatsapp", "instagram", "email"].map((ch) => (
                <button
                  key={ch ?? "all"}
                  onClick={() => setFilterChannel(ch)}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                    filterChannel === ch
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-surface-alt"
                  }`}
                >
                  {ch ? (
                    <>
                      {ch === "whatsapp" && <Phone className="h-3 w-3" />}
                      {ch === "instagram" && <Instagram className="h-3 w-3" />}
                      {ch === "email" && <Mail className="h-3 w-3" />}
                      <span className="capitalize">{ch}</span>
                    </>
                  ) : (
                    <>
                      <Inbox className="h-3 w-3" /> Todas
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {sessionsLoading && (
              <div className="space-y-2 p-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-lg bg-surface-alt animate-pulse" />
                ))}
              </div>
            )}

            {!sessionsLoading && filteredSessions.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">Nenhuma conversa encontrada</p>
              </div>
            )}
            {filteredSessions.map((s) => {
              const Icon = CHANNEL_ICONS[s.channel] ?? MessageSquare;
              const isSelected = s.id === selectedId;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full flex items-start gap-3 p-3 border-b border-border/50 text-left transition-colors ${
                    isSelected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-surface-alt"
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-alt border border-border">
                      {s.contact_avatar_url ? (
                        <img
                          src={s.contact_avatar_url}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <UserCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 rounded-full bg-surface p-0.5`}
                    >
                      <Icon
                        className={`h-3 w-3 ${CHANNEL_COLORS[s.channel] ?? "text-muted-foreground"}`}
                      />
                    </div>
                  </div>
                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="truncate text-xs font-semibold">
                        {s.contact_name || "Contato desconhecido"}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground ml-2">
                        {formatTime(s.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="flex-1 truncate text-[11px] text-muted-foreground">
                        {s.last_message_preview || "Sem mensagens"}
                      </p>
                      {s.unread_count > 0 && (
                        <span className="shrink-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground">
                          {s.unread_count}
                        </span>
                      )}
                    </div>
                    {s.tags.length > 0 && (
                      <div className="mt-1 flex gap-1">
                        {s.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-surface-alt px-1.5 py-0.5 text-[9px] text-muted-foreground border border-border"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── MAIN: Conversation ───────────────────────────────── */}
        {selectedId ? (
          <div className="flex flex-1 flex-col bg-surface border-r border-border">
            {/* Conversation header */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-surface">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-alt border border-border">
                {selectedSession?.contact_avatar_url ? (
                  <img
                    src={selectedSession.contact_avatar_url}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <UserCircle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <div className="text-sm font-semibold">
                  {selectedSession?.contact_name || "Contato"}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground capitalize">
                  {selectedSession?.channel && (
                    <>
                      {(() => {
                        const Icon = CHANNEL_ICONS[selectedSession.channel] ?? MessageSquare;
                        return (
                          <Icon className={`h-3 w-3 ${CHANNEL_COLORS[selectedSession.channel]}`} />
                        );
                      })()}
                      via {selectedSession.channel}
                    </>
                  )}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={generateAiSuggestion}
                  disabled={generatingAi}
                  className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-brand bg-surface hover:bg-surface-alt transition-colors disabled:opacity-50"
                >
                  <Sparkles className={`h-3.5 w-3.5 ${generatingAi ? "animate-pulse" : ""}`} />
                  {generatingAi ? "Gerando..." : "Sugerir resposta IA"}
                </button>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className={`flex h-8 w-8 items-center justify-center rounded-md border border-border transition-colors hover:bg-surface-alt ${
                    showDetails ? "bg-surface-alt text-brand" : "text-muted-foreground bg-surface"
                  }`}
                  title={showDetails ? "Ocultar detalhes" : "Mostrar detalhes"}
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* AI Suggestion banner */}
            {aiSuggestion && (
              <div className="mx-4 mt-3 rounded-lg border border-brand/20 bg-brand/5 p-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-brand mb-1">
                      Sugestão da IA
                    </div>
                    <p className="text-xs text-foreground">{aiSuggestion}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setReply(aiSuggestion);
                        setAiSuggestion(null);
                      }}
                      className="rounded-md bg-brand px-2 py-1 text-[10px] font-medium text-brand-foreground hover:bg-brand/90"
                    >
                      Usar
                    </button>
                    <button
                      onClick={() => setAiSuggestion(null)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-alt/20">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.direction === "outbound"
                        ? "bg-brand text-brand-foreground rounded-br-sm shadow-sm"
                        : "bg-surface text-foreground rounded-bl-sm border border-border shadow-sm"
                    }`}
                  >
                    {m.media_url && (
                      <div className="mb-2 max-w-full">
                        {m.media_url.endsWith(".webm") || m.media_url.includes("audio") ? (
                          <audio src={m.media_url} controls className="max-w-full h-10" />
                        ) : (
                          <img src={m.media_url} alt="Media" className="rounded-lg max-w-full object-contain max-h-48" />
                        )}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    <div
                      className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                        m.direction === "outbound" ? "text-brand-foreground/70" : "text-muted-foreground"
                      }`}
                    >
                      {formatTime(m.created_at)}
                      {m.direction === "outbound" && <CheckCheck className="h-3 w-3" />}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply box */}
            <div className="border-t border-border p-3 bg-surface">
              <div className="flex items-end gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface hover:bg-surface-alt text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Anexar arquivo"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAttachmentUpload}
                  className="hidden"
                />

                <button
                  onClick={recording ? stopRecording : startRecording}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors cursor-pointer ${
                    recording
                      ? "bg-red-500 border-red-500 text-white animate-pulse"
                      : "border-border bg-surface hover:bg-surface-alt text-muted-foreground hover:text-foreground"
                  }`}
                  title={recording ? "Parar gravação" : "Gravar mensagem de voz"}
                >
                  <Mic className="h-4 w-4" />
                </button>

                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={recording ? "Gravando áudio..." : "Digite uma mensagem… (Enter para enviar)"}
                  rows={2}
                  disabled={recording}
                  className="flex-1 resize-none rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-brand"
                />
                <button
                  onClick={sendMessage}
                  disabled={sendingReply || !reply.trim() || recording}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 disabled:opacity-50 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center p-10 text-center bg-surface border-r border-border">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-alt">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-base font-semibold mb-1">Selecione uma conversa</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Escolha uma conversa na lista ao lado para ver as mensagens e responder.
            </p>
          </div>
        )}

        {/* ── DETAILS PANEL: Collapsible ── */}
        {selectedId && showDetails && (
          <aside className="w-80 shrink-0 bg-surface flex flex-col overflow-y-auto no-scrollbar border-r border-border md:border-r-0">
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
              <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Informações do Contato
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Profile Info */}
            <div className="p-4 border-b border-border space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-alt border border-border">
                  {selectedSession?.contact_avatar_url ? (
                    <img
                      src={selectedSession.contact_avatar_url}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <UserCircle className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-xs font-bold text-foreground">
                    {selectedSession?.contact_name || "Contato desconhecido"}
                  </h4>
                  <span className="text-[10px] text-muted-foreground block truncate">
                    {selectedSession?.contact_id || ""}
                  </span>
                </div>
              </div>

              {/* CRM Link Sync */}
              <div className="bg-surface-alt/40 border border-border rounded-xl p-3 space-y-2">
                {matchedLead ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-extrabold uppercase tracking-wide text-brand">
                        Lead no CRM
                      </span>
                      <Link
                        to="/agency/$slug/crm/$lead_id"
                        params={{ slug: agency.slug, lead_id: matchedLead.id }}
                        className="text-[9px] font-bold text-brand hover:underline flex items-center gap-0.5"
                      >
                        Ver Ficha <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    </div>
                    <p className="text-xs font-bold text-foreground leading-snug">{matchedLead.name}</p>
                    {matchedLead.email && <p className="text-[10px] text-muted-foreground">{matchedLead.email}</p>}
                    {matchedLead.estimated_value && <p className="text-[10px] text-muted-foreground">Budget: R$ {matchedLead.estimated_value.toLocaleString("pt-BR")}</p>}
                  </div>
                ) : matchedClient ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-extrabold uppercase tracking-wide text-emerald-600">
                        Cliente no CRM
                      </span>
                      <Link
                        to="/agency/$slug/clients/$id"
                        params={{ slug: agency.slug, id: matchedClient.id }}
                        className="text-[9px] font-bold text-emerald-600 hover:underline flex items-center gap-0.5"
                      >
                        Ver Perfil <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    </div>
                    <p className="text-xs font-bold text-foreground leading-snug">{matchedClient.full_name}</p>
                    {matchedClient.email && <p className="text-[10px] text-muted-foreground">{matchedClient.email}</p>}
                  </div>
                ) : (
                  <div className="space-y-2 text-center py-1">
                    <p className="text-[10px] text-muted-foreground">Não localizado no CRM</p>
                    <button
                      onClick={createLeadFromSession}
                      className="w-full text-[10px] font-bold border border-brand/35 text-brand bg-brand/5 hover:bg-brand/10 py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Importar como Lead
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-4 border-b border-border space-y-2">
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Ações Integradas
              </h4>
              <div className="space-y-1.5">
                <button
                  onClick={() => setTicketSheetOpen(true)}
                  className="flex items-center gap-2 w-full text-left rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Novo Ticket Interno</span>
                </button>

                {matchedLead && (
                  <button
                    onClick={generateAiProposalForLead}
                    className="flex items-center gap-2 w-full text-left rounded-lg border border-brand/20 bg-brand/5 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/10 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Gerar Cotação com IA</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setReply(prev => (prev ? prev + "\n" : "") + `Olá! Segue o link para assinatura do seu contrato de prestação de serviços: ${window.location.origin}/m/contract/assinar-aqui`);
                    toast.success("Link do Contrato carregado!");
                  }}
                  className="flex items-center gap-2 w-full text-left rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  <FileCheck className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Enviar Link de Contrato</span>
                </button>

                <button
                  onClick={() => {
                    setReply(prev => (prev ? prev + "\n" : "") + `Olá! Vamos agendar uma chamada rápida de alinhamento? Agende o melhor horário para você por aqui: ${window.location.origin}/agenda-reuniao`);
                    toast.success("Link do Agendador carregado!");
                  }}
                  className="flex items-center gap-2 w-full text-left rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Enviar Link de Agenda</span>
                </button>

                <button
                  onClick={() => {
                    setReply(prev => (prev ? prev + "\n" : "") + `Olá! Você pode acompanhar sua viagem, vouchers e pagamentos direto pelo nosso Portal do Cliente: ${window.location.origin}/client`);
                    toast.success("Link do Portal carregado!");
                  }}
                  className="flex items-center gap-2 w-full text-left rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Enviar MagicLink Portal</span>
                </button>
              </div>
            </div>

            {/* Lead Insights (RAG / AI Hunter) */}
            {matchedLead && (
              <div className="p-4 border-b border-border space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Bot className="w-3.5 h-3.5 text-brand" /> Perfil & RAG Insights
                  </h4>
                  <button
                    onClick={triggerAnalysis}
                    disabled={analyzing}
                    className="text-[10px] text-brand font-bold hover:underline flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${analyzing ? 'animate-spin' : ''}`} /> Atualizar
                  </button>
                </div>

                {leadInsights ? (
                  <div className="space-y-2">
                    {leadInsights.general_profile && (
                      <div className="text-[11px] bg-brand/5 border border-brand/10 p-2.5 rounded-lg text-foreground leading-relaxed">
                        <strong>Comportamento:</strong> {leadInsights.general_profile}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-surface-alt border border-border p-2 rounded-lg space-y-0.5">
                        <span className="text-[9px] font-bold text-success uppercase block">Desejos</span>
                        <ul className="text-[10px] text-muted-foreground list-disc pl-3">
                          {((leadInsights.desires as any) ?? []).slice(0, 3).map((d: string, i: number) => (
                            <li key={i}>{d}</li>
                          ))}
                          {(!leadInsights.desires || (leadInsights.desires as any).length === 0) && (
                            <li className="list-none pl-0">Nenhum</li>
                          )}
                        </ul>
                      </div>
                      <div className="bg-surface-alt border border-border p-2 rounded-lg space-y-0.5">
                        <span className="text-[9px] font-bold text-danger uppercase block">Medos</span>
                        <ul className="text-[10px] text-muted-foreground list-disc pl-3">
                          {((leadInsights.fears as any) ?? []).slice(0, 3).map((f: string, i: number) => (
                            <li key={i}>{f}</li>
                          ))}
                          {(!leadInsights.fears || (leadInsights.fears as any).length === 0) && (
                            <li className="list-none pl-0">Nenhum</li>
                          )}
                        </ul>
                      </div>
                      <div className="bg-surface-alt border border-border p-2 rounded-lg space-y-0.5 col-span-2">
                        <span className="text-[9px] font-bold text-warning uppercase block">Objeções</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {((leadInsights.objections as any) ?? []).map((o: string, i: number) => (
                            <span key={i} className="text-[9px] bg-warning/10 border border-warning/20 text-warning px-1.5 py-0.5 rounded-full font-semibold">
                              {o}
                            </span>
                          ))}
                          {(!leadInsights.objections || (leadInsights.objections as any).length === 0) && (
                            <span className="text-[10px] text-muted-foreground">Nenhuma mapeada</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground text-center py-2 bg-surface-alt/50 border border-dashed border-border rounded-lg">
                    Nenhum perfil comportamental catalogado. Clique em Atualizar.
                  </p>
                )}
              </div>
            )}

            {/* Canned Templates */}
            <div className="p-4 space-y-2.5">
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Templates de Respostas
              </h4>
              <div className="space-y-1.5">
                {[
                  { label: "Boas Vindas (Apresentação)", text: "Olá! Sou do suporte da nossa agência e estou aqui para auxiliar você na sua próxima viagem. Como posso ajudar hoje?" },
                  { label: "Solicitar Documentos", text: "Olá! Para prosseguirmos com a emissão da sua viagem, poderia nos enviar fotos nítidas do RG ou CNH (frente e verso) e comprovante de residência?" },
                  { label: "Confirmação de Voo", text: "Olá! Passando para confirmar que a emissão dos seus bilhetes aéreos foi concluída. Os localizadores e vouchers de lançamento estão disponíveis no portal do cliente." },
                  { label: "Lembrete de Pagamento", text: "Olá! Passando para lembrar que o vencimento do Pix/boleto da sua viagem é amanhã. Caso precise de uma nova via, me avise por aqui!" }
                ].map((tpl) => (
                  <button
                    key={tpl.label}
                    onClick={() => {
                      setReply(tpl.text);
                      toast.success("Template inserido!");
                    }}
                    className="w-full text-left rounded-lg border border-border p-2 text-xs hover:bg-surface-alt hover:border-border-strong transition-all cursor-pointer"
                  >
                    <div className="font-bold text-foreground text-[10px] mb-0.5">{tpl.label}</div>
                    <p className="text-muted-foreground text-[10px] truncate">{tpl.text}</p>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>

      <NewTicketSheet
        isOpen={ticketSheetOpen}
        onClose={() => setTicketSheetOpen(false)}
        initialClientId={matchedClient?.id || matchedLead?.client_id || undefined}
      />
    </>
  );
}

