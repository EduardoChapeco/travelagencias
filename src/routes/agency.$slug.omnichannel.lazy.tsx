import { createLazyFileRoute } from "@tanstack/react-router";
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
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { money } from "@/components/ui/form";
import { generateOmnichannelReply } from "@/lib/api/ai-chat.functions";
import { NewTicketSheet } from "@/components/support/NewTicketSheet";

export const Route = createLazyFileRoute("/agency/$slug/omnichannel")({
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
  assignment_status?: string;
  queue_id?: string | null;
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
  source?: string;
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
  const [detailsTab, setDetailsTab] = useState<
    "profile" | "documents" | "notices" | "ai_templates"
  >("profile");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docTypeToUpload, setDocTypeToUpload] = useState("rg");
  const [contactNotes, setContactNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const [mySessionsOnly, setMySessionsOnly] = useState(false);

  // ── Sessions ───────────────────────────────────────────────────
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    enabled: !!agency,
    queryKey: ["omnichannel-sessions", agency?.id, filterChannel, mySessionsOnly],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      let q = (supabase.from as any)("omnichannel_sessions")
        .select(
          "id, channel, contact_id, contact_name, contact_avatar_url, unread_count, last_message_at, last_message_preview, status, tags, assigned_to, assignment_status, queue_id",
        )
        .eq("agency_id", agency!.id)
        .order("last_message_at", { ascending: false, nullsFirst: false });
        
      if (filterChannel) q = q.eq("channel", filterChannel);
      if (mySessionsOnly && user) {
        q = q.eq("assigned_to", user.id);
      }
      
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

      let filter = `email.ieq.${contactId}`;
      if (cleanContactId) {
        filter += `,phone.ilike.%${cleanContactId}%`;
      }
      // Check if contactId is a valid UUID before searching by ID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        contactId,
      );
      if (isUuid) {
        filter += `,id.eq.${contactId}`;
      }

      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("agency_id", agency!.id)
        .is("deleted_at", null)
        .or(filter)
        .limit(1);

      if (error) throw error;
      return data?.[0] || null;
    },
  });

  // ── Matched Client ─────────────────────────────────────────────
  const { data: matchedClient } = useQuery({
    enabled: !!selectedSession?.contact_id && !!agency?.id,
    queryKey: ["omnichannel-matched-client", selectedSession?.contact_id],
    queryFn: async () => {
      const contactId = selectedSession!.contact_id!;
      const cleanContactId = contactId.replace(/\D/g, "");

      let filter = `email.ieq.${contactId}`;
      if (cleanContactId) {
        filter += `,phone.ilike.%${cleanContactId}%`;
      }
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        contactId,
      );
      if (isUuid) {
        filter += `,id.eq.${contactId}`;
      }

      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("agency_id", agency!.id)
        .is("deleted_at", null)
        .or(filter)
        .limit(1);

      if (error) throw error;
      return data?.[0] || null;
    },
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
    },
  });

  // ── Recent Proposals ───────────────────────────────────────────
  const matchedClientId = matchedClient?.id || matchedLead?.client_id || null;
  const matchedLeadId = matchedLead?.id || null;

  const { data: recentProposals = [] } = useQuery({
    enabled: !!agency?.id && (!!matchedClientId || !!matchedLeadId),
    queryKey: ["omnichannel-recent-proposals", matchedClientId, matchedLeadId],
    queryFn: async () => {
      let qb = supabase
        .from("proposals")
        .select("id, number, title, status, total, currency, created_at")
        .eq("agency_id", agency!.id)
        .order("created_at", { ascending: false })
        .limit(3);

      if (matchedClientId && matchedLeadId) {
        qb = qb.or(`client_id.eq.${matchedClientId},lead_id.eq.${matchedLeadId}`);
      } else if (matchedClientId) {
        qb = qb.eq("client_id", matchedClientId);
      } else if (matchedLeadId) {
        qb = qb.eq("lead_id", matchedLeadId);
      }

      const { data, error } = await qb;
      if (error) throw error;
      return data || [];
    },
  });

  // ── Client Documents ───────────────────────────────────────────
  const { data: clientDocs = [], refetch: refetchDocs } = useQuery({
    enabled: !!matchedClientId && !!agency?.id,
    queryKey: ["omnichannel-client-documents", matchedClientId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("client_documents")
        .select("id, doc_type, doc_number, expires_at, file_url, notes")
        .eq("client_id", matchedClientId!)
        .eq("agency_id", agency!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // ── Document Upload Handler ────────────────────────────────────
  async function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !matchedClientId || !agency) return;
    setUploadingDoc(true);
    const toastId = toast.loading(`Enviando ${file.name}...`);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `clients/documents/${matchedClientId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("agency-media")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("agency-media").getPublicUrl(filePath);

      const { error } = await (supabase as any).from("client_documents").insert({
        client_id: matchedClientId,
        agency_id: agency.id,
        doc_type: docTypeToUpload as any,
        file_url: publicUrl,
        doc_number: `Doc-${Date.now().toString().slice(-4)}`,
        notes: `Enviado pelo chat Omnichannel - ${file.name}`,
      });
      if (error) throw error;

      toast.success("Documento enviado e cadastrado!", { id: toastId });
      refetchDocs();
    } catch (err: any) {
      toast.error("Erro ao enviar documento: " + err.message, { id: toastId });
    } finally {
      setUploadingDoc(false);
    }
  }

  // ── Notes Editor Sync Effect ───────────────────────────────────
  useEffect(() => {
    if (matchedLead) {
      setContactNotes((matchedLead as any).notes || "");
    } else if (matchedClient) {
      setContactNotes((matchedClient as any).notes || "");
    } else {
      setContactNotes("");
    }
  }, [matchedLead, matchedClient]);

  // ── Notes Editor Save Handler ──────────────────────────────────
  async function saveContactNotes() {
    setSavingNotes(true);
    const toastId = toast.loading("Salvando anotações...");
    try {
      if (matchedLead) {
        const { error } = await supabase
          .from("leads")
          .update({ notes: contactNotes } as any)
          .eq("id", matchedLead.id);
        if (error) throw error;
        qc.invalidateQueries({
          queryKey: ["omnichannel-matched-lead", selectedSession?.contact_id],
        });
      } else if (matchedClient) {
        const { error } = await supabase
          .from("clients")
          .update({ notes: contactNotes } as any)
          .eq("id", matchedClient.id);
        if (error) throw error;
        qc.invalidateQueries({
          queryKey: ["omnichannel-matched-client", selectedSession?.contact_id],
        });
      }
      toast.success("Anotações salvas com sucesso!", { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao salvar anotações: " + err.message, { id: toastId });
    } finally {
      setSavingNotes(false);
    }
  }

  // ── Messages ───────────────────────────────────────────────────
  const { data: messages = [] } = useQuery({
    enabled: !!selectedId,
    queryKey: ["omnichannel-messages", selectedId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("omnichannel_messages") as any)
        .select("id, session_id, direction, channel, content, media_url, status, created_at, source")
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

  // Realtime subscriptions
  useEffect(() => {
    if (!agency?.id) return;
    const channel = supabase.channel(`omni_${agency.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "omnichannel_messages", filter: `agency_id=eq.${agency.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["omnichannel-messages", selectedId] });
          qc.invalidateQueries({ queryKey: ["omnichannel-sessions", agency.id] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "omnichannel_sessions", filter: `agency_id=eq.${agency.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["omnichannel-sessions", agency.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agency?.id, selectedId, qc]);

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
      status: "pending",
      agency_id: agency!.id,
      lead_id: matchedLead?.id || null,
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

          const {
            data: { publicUrl },
          } = supabase.storage.from("agency-media").getPublicUrl(filePath);

          const { error } = await supabase.from("omnichannel_messages").insert({
            session_id: selectedId,
            channel: selectedSession?.channel ?? "whatsapp",
            direction: "outbound",
            content: "Mensagem de Voz",
            media_url: publicUrl,
            media_type: "audio",
            status: "pending",
            agency_id: agency!.id,
            lead_id: matchedLead?.id || null,
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

      const {
        data: { publicUrl },
      } = supabase.storage.from("agency-media").getPublicUrl(filePath);

      const { error } = await supabase.from("omnichannel_messages").insert({
        session_id: selectedId,
        channel: selectedSession?.channel ?? "whatsapp",
        direction: "outbound",
        content: `Arquivo anexo: ${file.name}`,
        media_url: publicUrl,
        media_type: file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("audio/")
            ? "audio"
            : "document",
        status: "pending",
        agency_id: agency.id,
        lead_id: matchedLead?.id || null,
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
      const { data: newLead, error } = await supabase
        .from("leads")
        .insert({
          agency_id: agency.id,
          name: selectedSession.contact_name || "Lead via Chat",
          phone: phoneClean,
          source: "whatsapp",
          stage_id: stages[0].id,
          staleness_status: "active",
        } as any)
        .select("id")
        .single();
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
      setReply(
        (prev) =>
          (prev ? prev + "\n" : "") +
          `Olá! Preparamos uma proposta personalizada para você. Veja os detalhes e confirme neste link: ${url}`,
      );
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
      <div className="flex h-[calc(100vh-var(--header-h))] w-full p-0 m-0 border-0 rounded-none overflow-hidden bg-background">
        {/* ── SIDEBAR: Session List ─────────────────────────────── */}
        <aside
          className={cn(
            "shrink-0 flex-col border-r border-border bg-surface",
            selectedId ? "hidden md:flex md:w-80" : "flex w-full md:w-80",
          )}
        >
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
            
            <div className="flex items-center justify-between pb-1">
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
              <button
                onClick={() => setMySessionsOnly(!mySessionsOnly)}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                  mySessionsOnly
                    ? "bg-brand/10 text-brand border border-brand/20"
                    : "text-muted-foreground hover:bg-surface-alt border border-transparent"
                }`}
                title="Mostrar apenas os meus atendimentos"
              >
                <UserCircle className="h-3 w-3" />
                Meus
              </button>
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
          <div
            className={cn(
              "flex flex-1 flex-col bg-surface border-r border-border",
              selectedId ? "flex" : "hidden md:flex",
            )}
          >
            {/* Conversation header */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-surface">
              <button
                onClick={() => setSelectedId(null)}
                className="md:hidden flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Voltar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
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
              
              {/* Assignment Status indicator (P2) */}
              <div className="flex items-center gap-2">
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  selectedSession?.assignment_status === "unassigned" ? "bg-amber-100 text-amber-700 border border-amber-200" :
                  selectedSession?.assignment_status === "closed" ? "bg-slate-100 text-slate-500 border border-slate-200" :
                  "bg-brand/10 text-brand border border-brand/20"
                )}>
                  {selectedSession?.assignment_status || "Aberto"}
                </span>
                
                {selectedSession?.assignment_status === "unassigned" && (
                  <button
                    onClick={async () => {
                       const { data: { user } } = await supabase.auth.getUser();
                       if (!user) return;
                       await supabase.from("omnichannel_sessions").update({
                         assigned_to: user.id,
                         assignment_status: "in_progress"
                       } as any).eq("id", selectedSession.id);
                       toast.success("Conversa atribuída a você!");
                    }}
                    className="text-[10px] font-bold bg-brand text-brand-foreground px-2.5 py-1 rounded-md hover:bg-brand/90 transition-colors"
                  >
                    Atribuir a mim
                  </button>
                )}
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
                        ? "bg-brand text-brand-foreground rounded-br-sm shadow-none"
                        : "bg-surface text-foreground rounded-bl-sm border border-border shadow-none"
                    }`}
                  >
                    {m.media_url && (
                      <div className="mb-2 max-w-full">
                        {m.media_url.endsWith(".webm") || m.media_url.includes("audio") ? (
                          <audio src={m.media_url} controls className="max-w-full h-10" />
                        ) : (
                          <img
                            src={m.media_url}
                            alt="Media"
                            className="rounded-lg max-w-full object-contain max-h-48"
                          />
                        )}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    <div
                      className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${
                        m.direction === "outbound"
                          ? "text-brand-foreground/80"
                          : "text-muted-foreground"
                      }`}
                    >
                      {m.source === "business_app" && <Phone className="h-2.5 w-2.5" />}
                      {m.source === "automation" && <Bot className="h-2.5 w-2.5" />}
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
                  placeholder={
                    recording ? "Gravando áudio..." : "Digite uma mensagem… (Enter para enviar)"
                  }
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
          <div className="hidden md:flex flex-1 flex-col items-center justify-center p-10 text-center bg-surface border-r border-border">
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
          <aside className="fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-border bg-surface overflow-y-auto no-scrollbar md:relative md:w-80 md:z-0 md:flex md:shadow-none shadow-2xl">
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
              <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Painel do Lead
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tab Switched Header */}
            <div className="flex border-b border-border text-xs font-semibold shrink-0 bg-surface-alt/40">
              <button
                onClick={() => setDetailsTab("profile")}
                className={cn(
                  "flex-1 py-2.5 text-center border-b-2 transition-colors cursor-pointer",
                  detailsTab === "profile"
                    ? "border-brand text-brand font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                Perfil
              </button>
              <button
                onClick={() => setDetailsTab("documents")}
                className={cn(
                  "flex-1 py-2.5 text-center border-b-2 transition-colors cursor-pointer",
                  detailsTab === "documents"
                    ? "border-brand text-brand font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                Docs
              </button>
              <button
                onClick={() => setDetailsTab("notices")}
                className={cn(
                  "flex-1 py-2.5 text-center border-b-2 transition-colors cursor-pointer",
                  detailsTab === "notices"
                    ? "border-brand text-brand font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                Avisos
              </button>
              <button
                onClick={() => setDetailsTab("ai_templates")}
                className={cn(
                  "flex-1 py-2.5 text-center border-b-2 transition-colors cursor-pointer",
                  detailsTab === "ai_templates"
                    ? "border-brand text-brand font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                Modelos/IA
              </button>
            </div>

            {/* Tab Content Wrapper */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
              {detailsTab === "profile" && (
                <div className="p-4 space-y-4">
                  {/* Profile Info */}
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
                        <p className="text-xs font-bold text-foreground leading-snug">
                          {matchedLead.name}
                        </p>
                        {matchedLead.email && (
                          <p className="text-[10px] text-muted-foreground">{matchedLead.email}</p>
                        )}
                        {matchedLead.estimated_value && (
                          <p className="text-[10px] text-muted-foreground font-medium">
                            Budget: {money(matchedLead.estimated_value, "BRL")}
                          </p>
                        )}
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
                        <p className="text-xs font-bold text-foreground leading-snug">
                          {matchedClient.full_name}
                        </p>
                        {matchedClient.email && (
                          <p className="text-[10px] text-muted-foreground">{matchedClient.email}</p>
                        )}
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

                  {/* Recent Proposals */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      Últimas Propostas
                    </h4>
                    {recentProposals.length > 0 ? (
                      <div className="space-y-1.5">
                        {recentProposals.map((p: any) => (
                          <div
                            key={p.id}
                            className="p-2 border border-border rounded-lg bg-surface flex items-center justify-between text-[11px]"
                          >
                            <div className="truncate pr-2">
                              <p className="font-bold text-foreground truncate">{p.title}</p>
                              <span className="text-[9px] text-muted-foreground">#{p.number}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-foreground">
                                {money(p.total, p.currency)}
                              </span>
                              <span className="block text-[8px] text-muted-foreground uppercase">
                                {p.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground text-center py-2 bg-surface-alt/30 border border-dashed border-border rounded-lg">
                        Nenhuma proposta encontrada.
                      </p>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      Ações Rápidas
                    </h4>
                    <div className="space-y-1.5">
                      <button
                        onClick={() => setTicketSheetOpen(true)}
                        className="flex items-center gap-2 w-full text-left rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-alt transition-colors cursor-pointer bg-surface"
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
                          setReply(
                            (prev) =>
                              (prev ? prev + "\n" : "") +
                              `Olá! Segue o link para assinatura do seu contrato de prestação de serviços: ${window.location.origin}/m/contract/assinar-aqui`,
                          );
                          toast.success("Link do Contrato carregado!");
                        }}
                        className="flex items-center gap-2 w-full text-left rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-alt transition-colors cursor-pointer bg-surface"
                      >
                        <FileCheck className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Enviar Link de Contrato</span>
                      </button>

                      <button
                        onClick={() => {
                          setReply(
                            (prev) =>
                              (prev ? prev + "\n" : "") +
                              `Olá! Vamos agendar uma chamada rápida de alinhamento? Agende o melhor horário para você por aqui: ${window.location.origin}/agenda-reuniao`,
                          );
                          toast.success("Link do Agendador carregado!");
                        }}
                        className="flex items-center gap-2 w-full text-left rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-alt transition-colors cursor-pointer bg-surface"
                      >
                        <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Enviar Link de Agenda</span>
                      </button>

                      <button
                        onClick={() => {
                          setReply(
                            (prev) =>
                              (prev ? prev + "\n" : "") +
                              `Olá! Você pode acompanhar sua viagem, vouchers e pagamentos direto pelo nosso Portal do Cliente: ${window.location.origin}/client`,
                          );
                          toast.success("Link do Portal carregado!");
                        }}
                        className="flex items-center gap-2 w-full text-left rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-alt transition-colors cursor-pointer bg-surface"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Enviar MagicLink Portal</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {detailsTab === "documents" && (
                <div className="p-4 space-y-4">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    Documentos Pessoais
                  </h4>

                  {/* Document Uploader */}
                  {matchedClientId ? (
                    <div className="p-3 border border-border rounded-xl bg-surface-alt/40 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-foreground">Tipo de Doc:</span>
                        <select
                          value={docTypeToUpload}
                          onChange={(e) => setDocTypeToUpload(e.target.value)}
                          className="h-7 text-[11px] rounded border border-border bg-surface px-1 outline-none text-foreground"
                        >
                          <option value="rg">RG</option>
                          <option value="cpf">CPF</option>
                          <option value="passport">Passaporte</option>
                          <option value="birth_cert">Certidão</option>
                          <option value="cnh">CNH</option>
                          <option value="visa">Visto</option>
                          <option value="vaccination_card">Vacinas</option>
                          <option value="insurance">Seguro</option>
                          <option value="other">Outro</option>
                        </select>
                      </div>
                      <div className="relative">
                        <input
                          type="file"
                          id="client-doc-file-upload"
                          onChange={handleDocUpload}
                          disabled={uploadingDoc}
                          className="hidden"
                        />
                        <button
                          onClick={() => document.getElementById("client-doc-file-upload")?.click()}
                          disabled={uploadingDoc}
                          className="w-full h-16 border-2 border-dashed border-border/80 hover:border-brand/50 rounded-lg flex flex-col items-center justify-center text-[10px] font-medium text-muted-foreground bg-surface hover:text-foreground cursor-pointer transition-colors disabled:opacity-50"
                        >
                          <Plus className="h-4 w-4 mb-1 text-muted-foreground/60" />
                          {uploadingDoc ? "Enviando..." : "Upload Novo Documento"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground text-center py-3 bg-surface-alt/30 border border-dashed border-border rounded-lg">
                      Importe o lead como cliente primeiro para gerenciar seus documentos.
                    </p>
                  )}

                  {/* Documents List */}
                  {matchedClientId && (
                    <div className="space-y-2">
                      {clientDocs.length > 0 ? (
                        clientDocs.map((doc: any) => (
                          <div
                            key={doc.id}
                            className="p-3 border border-border rounded-xl bg-surface flex flex-col gap-1.5 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-brand uppercase text-[10px]">
                                {doc.doc_type}
                              </span>
                              {doc.expires_at && (
                                <span
                                  className={cn(
                                    "text-[9px] font-semibold",
                                    new Date(doc.expires_at).getTime() < Date.now()
                                      ? "text-red-500 font-bold"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  Exp: {new Date(doc.expires_at).toLocaleDateString("pt-BR")}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-mono text-muted-foreground">
                                {doc.doc_number || "Sem nº"}
                              </span>
                              {doc.file_url && (
                                <a
                                  href={doc.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-brand font-bold hover:underline flex items-center gap-0.5 text-[10px]"
                                >
                                  Ver <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                            {doc.notes && (
                              <p className="text-[9px] text-muted-foreground leading-normal mt-0.5 border-t border-border/40 pt-1">
                                {doc.notes}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-muted-foreground text-center py-4">
                          Nenhum documento anexado.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {detailsTab === "notices" && (
                <div className="p-4 space-y-4">
                  {/* Warnings Panel */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      Avisos e Pendências
                    </h4>
                    {matchedClientId ? (
                      (() => {
                        const expiringDocs = clientDocs.filter((d: any) => {
                          if (!d.expires_at) return false;
                          const diff = new Date(d.expires_at).getTime() - Date.now();
                          return diff > 0 && diff <= 90 * 24 * 60 * 60 * 1000;
                        });
                        const expiredDocs = clientDocs.filter((d: any) => {
                          if (!d.expires_at) return false;
                          return new Date(d.expires_at).getTime() < Date.now();
                        });

                        return (
                          <div className="space-y-2">
                            {expiredDocs.map((d: any) => (
                              <div
                                key={d.id}
                                className="p-2.5 border border-red-500/20 bg-red-500/5 text-red-600 rounded-lg text-[10px] font-medium flex items-start gap-1.5"
                              >
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="uppercase">{d.doc_type} Expirado!</strong>
                                  <p className="text-[9px] mt-0.5 text-red-500/80">
                                    Venceu em {new Date(d.expires_at).toLocaleDateString("pt-BR")}
                                  </p>
                                </div>
                              </div>
                            ))}
                            {expiringDocs.map((d: any) => (
                              <div
                                key={d.id}
                                className="p-2.5 border border-amber-500/20 bg-amber-500/5 text-amber-600 rounded-lg text-[10px] font-medium flex items-start gap-1.5"
                              >
                                <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="uppercase">
                                    {d.doc_type} perto do vencimento
                                  </strong>
                                  <p className="text-[9px] mt-0.5 text-amber-500/80">
                                    Vence em {new Date(d.expires_at).toLocaleDateString("pt-BR")}
                                  </p>
                                </div>
                              </div>
                            ))}
                            {expiredDocs.length === 0 && expiringDocs.length === 0 && (
                              <p className="text-[10px] text-emerald-600 font-semibold bg-emerald-500/5 border border-emerald-500/10 p-2 rounded-lg text-center">
                                ✓ Nenhum documento com alerta de expiração.
                              </p>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <p className="text-[10px] text-muted-foreground text-center py-2 bg-surface-alt/30 border border-dashed border-border rounded-lg">
                        Sem alertas para não clientes.
                      </p>
                    )}
                  </div>

                  {/* Notes Editor */}
                  {matchedLead || matchedClient ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                          Observações Internas
                        </h4>
                        <button
                          onClick={saveContactNotes}
                          disabled={savingNotes}
                          className="text-[10px] text-brand font-bold hover:underline disabled:opacity-50 cursor-pointer"
                        >
                          {savingNotes ? "Salvando..." : "Salvar Notas"}
                        </button>
                      </div>
                      <textarea
                        value={contactNotes}
                        onChange={(e) => setContactNotes(e.target.value)}
                        placeholder="Escreva anotações internas importantes sobre este contato..."
                        rows={8}
                        className="w-full text-xs p-2.5 border border-border rounded-xl bg-surface outline-none focus:border-brand resize-none leading-relaxed text-foreground"
                      />
                    </div>
                  ) : null}
                </div>
              )}

              {detailsTab === "ai_templates" && (
                <div className="p-4 space-y-4">
                  {/* Lead Insights (RAG / AI Hunter) */}
                  {matchedLead && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <Bot className="w-3.5 h-3.5 text-brand" /> Perfil & RAG Insights
                        </h4>
                        <button
                          onClick={triggerAnalysis}
                          disabled={analyzing}
                          className="text-[10px] text-brand font-bold hover:underline flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${analyzing ? "animate-spin" : ""}`} />{" "}
                          Atualizar
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
                              <span className="text-[9px] font-bold text-success uppercase block">
                                Desejos
                              </span>
                              <ul className="text-[10px] text-muted-foreground list-disc pl-3">
                                {((leadInsights.desires as any) ?? [])
                                  .slice(0, 3)
                                  .map((d: string, i: number) => (
                                    <li key={i}>{d}</li>
                                  ))}
                                {(!leadInsights.desires ||
                                  (leadInsights.desires as any).length === 0) && (
                                  <li className="list-none pl-0">Nenhum</li>
                                )}
                              </ul>
                            </div>
                            <div className="bg-surface-alt border border-border p-2 rounded-lg space-y-0.5">
                              <span className="text-[9px] font-bold text-danger uppercase block">
                                Medos
                              </span>
                              <ul className="text-[10px] text-muted-foreground list-disc pl-3">
                                {((leadInsights.fears as any) ?? [])
                                  .slice(0, 3)
                                  .map((f: string, i: number) => (
                                    <li key={i}>{f}</li>
                                  ))}
                                {(!leadInsights.fears ||
                                  (leadInsights.fears as any).length === 0) && (
                                  <li className="list-none pl-0">Nenhum</li>
                                )}
                              </ul>
                            </div>
                            <div className="bg-surface-alt border border-border p-2 rounded-lg space-y-0.5 col-span-2">
                              <span className="text-[9px] font-bold text-warning uppercase block">
                                Objeções
                              </span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {((leadInsights.objections as any) ?? []).map(
                                  (o: string, i: number) => (
                                    <span
                                      key={i}
                                      className="text-[9px] bg-warning/10 border border-warning/20 text-warning px-1.5 py-0.5 rounded-full font-semibold"
                                    >
                                      {o}
                                    </span>
                                  ),
                                )}
                                {(!leadInsights.objections ||
                                  (leadInsights.objections as any).length === 0) && (
                                  <span className="text-[10px] text-muted-foreground">
                                    Nenhuma mapeada
                                  </span>
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

                  {/* AI suggestion */}
                  {aiSuggestion && (
                    <div className="p-3 border border-brand/20 bg-brand/5 rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-brand uppercase">
                        <Sparkles className="w-3.5 h-3.5" /> Sugestão da IA
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{aiSuggestion}</p>
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setAiSuggestion(null)}
                          className="text-[10px] border border-border px-2 py-1 rounded bg-surface hover:bg-surface-alt text-muted-foreground cursor-pointer"
                        >
                          Limpar
                        </button>
                        <button
                          onClick={() => {
                            setReply(aiSuggestion);
                            setAiSuggestion(null);
                          }}
                          className="text-[10px] bg-brand text-brand-foreground px-2.5 py-1 rounded hover:bg-brand/90 cursor-pointer"
                        >
                          Copiar para Caixa
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Canned Templates */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      Templates de Respostas
                    </h4>
                    <div className="space-y-1.5">
                      {[
                        {
                          label: "Boas Vindas (Apresentação)",
                          text: "Olá! Sou do suporte da nossa agência e estou aqui para auxiliar você na sua próxima viagem. Como posso ajudar hoje?",
                        },
                        {
                          label: "Solicitar Documentos",
                          text: "Olá! Para prosseguirmos com a emissão da sua viagem, poderia nos enviar fotos nítidas do RG ou CNH (frente e verso) e comprovante de residência?",
                        },
                        {
                          label: "Confirmação de Voo",
                          text: "Olá! Passando para confirmar que a emissão dos seus bilhetes aéreos foi concluída. Os localizadores e vouchers de lançamento estão disponíveis no portal do cliente.",
                        },
                        {
                          label: "Lembrete de Pagamento",
                          text: "Olá! Passando para lembrar que o vencimento do Pix/boleto da sua viagem é amanhã. Caso precise de uma nova via, me avise por aqui!",
                        },
                      ].map((tpl) => (
                        <button
                          key={tpl.label}
                          onClick={() => {
                            setReply(tpl.text);
                            toast.success("Template inserido!");
                          }}
                          className="w-full text-left rounded-lg border border-border p-2 text-xs hover:bg-surface-alt hover:border-border-strong transition-all cursor-pointer bg-surface"
                        >
                          <div className="font-bold text-foreground text-[10px] mb-0.5">
                            {tpl.label}
                          </div>
                          <p className="text-muted-foreground text-[10px] truncate">{tpl.text}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
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
