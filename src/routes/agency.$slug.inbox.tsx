import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterChannel, setFilterChannel] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Layout states
  const [showDetails, setShowDetails] = useState(true);
  const [detailsTab, setDetailsTab] = useState<"profile" | "documents" | "notices" | "ai_templates">("profile");
  const [uploadingDoc, setUploadingDoc] = useState(false);
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
  const [mySessionsOnly, setMySessionsOnly] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [crmSearchQuery, setCrmSearchQuery] = useState("");
  const [crmSearchType, setCrmSearchType] = useState<"lead" | "client">("lead");
  const [isLinkingOpen, setIsLinkingOpen] = useState(false);

  const { data: crmSearchResults = [] } = useQuery({
    enabled: isLinkingOpen && crmSearchQuery.length > 2 && !!agency,
    queryKey: ["inbox-crm-search", crmSearchType, crmSearchQuery, agency?.id],
    queryFn: async () => {
      if (crmSearchType === "lead") {
        const { data, error } = await db
          .from("crm_leads")
          .select("id, name, email, phone")
          .eq("agency_id", agency!.id)
          .ilike("name", `%${crmSearchQuery}%`)
          .limit(10);
        if (error) throw error;
        return data || [];
      } else {
        const { data, error } = await db
          .from("clients")
          .select("id, full_name, email, phone")
          .eq("agency_id", agency!.id)
          .ilike("full_name", `%${crmSearchQuery}%`)
          .limit(10);
        if (error) throw error;
        return (data || []).map((d: any) => ({
          id: d.id,
          name: d.full_name,
          email: d.email,
          phone: d.phone
        }));
      }
    }
  });

  const linkContactToCrm = async (leadId: string | null, clientId: string | null) => {
    if (!selectedConversation?.contacts?.id) return;
    const { error } = await db
      .from("contacts")
      .update({ lead_id: leadId, client_id: clientId })
      .eq("id", selectedConversation.contacts.id);

    if (error) {
      toast.error("Erro ao vincular contato: " + error.message);
    } else {
      toast.success("Vínculo atualizado com sucesso!");
      setIsLinkingOpen(false);
      setCrmSearchQuery("");
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-matched-lead", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["inbox-matched-client", selectedId] });
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
  }, []);

  // ── Fetch channels (Para filtros e modal Sheet) ────────────────────────────
  const { data: channels = [], isLoading: isLoadingChannels, isError: isErrorChannels, error: errorChannels } = useQuery({
    queryKey: ["inbox-channels", agency?.id],
    queryFn: async () => {
      if (!agency?.id) return [];
      const { data, error } = await db
        .from("channels")
        .select("*")
        .eq("agency_id", agency.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!agency?.id,
  });

  // ── Fetch Conversations ────────────────────────────────────────────────────
  const { data: conversations = [], isLoading: isLoadingConversations, isError: isErrorConversations, error: errorConversations } = useQuery({
    queryKey: ["conversations", agency?.id, filterChannel, mySessionsOnly],
    queryFn: async () => {
      if (!agency?.id) return [];
      let q = db
        .from("conversations")
        .select(`
          *,
          contacts(*),
          channels(*),
          messages(id, body, direction, status, created_at)
        `)
        .eq("agency_id", agency.id)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("created_at", { referencedTable: "messages", ascending: false })
        .limit(1, { referencedTable: "messages" });

      const { data, error } = await q;
      if (error) throw error;

      // Ordenar mensagens de cada conversa localmente para pegar a última
      return (data || []).map((c: any) => {
        const sortedMsgs = c.messages 
          ? [...c.messages].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          : [];
        return {
          ...c,
          messages: sortedMsgs
        };
      }) as Conversation[];
    },
    enabled: !!agency?.id,
  });

  // ── Fetch Messages for Selected Conversation ───────────────────────────────
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ["messages", selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const { data, error } = await db
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedId,
  });

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    if (!agency?.id) return;

    const channel = supabase.channel("inbox-realtime-v3")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `agency_id=eq.${agency.id}` },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["conversations", agency.id] });
          queryClient.invalidateQueries({ queryKey: ["unread-conversations-count", agency.id] });
          if (payload.new.conversation_id === selectedId) {
            queryClient.invalidateQueries({ queryKey: ["messages", selectedId] });
            if (payload.new.direction === "inbound") {
              toast("Nova mensagem recebida!");
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `agency_id=eq.${agency.id}` },
        (payload) => {
          if (payload.new.conversation_id === selectedId) {
            queryClient.invalidateQueries({ queryKey: ["messages", selectedId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agency?.id, selectedId, queryClient]);

  // Marcar conversa como lida ao selecionar ou receber novas mensagens na conversa ativa
  useEffect(() => {
    if (!selectedId || !agency?.id) return;

    const markAsRead = async () => {
      try {
        // 1. Zerar o unread_count na conversa
        await db
          .from("conversations")
          .update({ unread_count: 0 } as any)
          .eq("id", selectedId);

        // 2. Marcar mensagens inbound como lidas
        await db
          .from("messages")
          .update({ status: "read" } as any)
          .eq("conversation_id", selectedId)
          .eq("direction", "inbound")
          .neq("status", "read");

        // 3. Invalida os estados de contagem e conversas
        queryClient.invalidateQueries({ queryKey: ["conversations", agency.id] });
        queryClient.invalidateQueries({ queryKey: ["unread-conversations-count", agency.id] });
      } catch (err) {
        console.error("Erro ao marcar mensagens como lidas:", err);
      }
    };

    markAsRead();
  }, [selectedId, agency?.id, queryClient]);

  const selectedConversation = conversations.find((c) => c.id === selectedId) || null;

  // ── Match CRM info ──────────────────────────────────────────────────────────
  const matchedContactEmail = selectedConversation?.contacts?.email;
  const matchedContactPhone = selectedConversation?.contacts?.phone;
  const explicitLeadId = selectedConversation?.contacts?.lead_id;
  const explicitClientId = selectedConversation?.contacts?.client_id;

  const { data: matchedLead } = useQuery({
    enabled: !!agency && (!!explicitLeadId || !!matchedContactEmail || !!matchedContactPhone),
    queryKey: ["inbox-matched-lead", selectedId, matchedContactEmail, matchedContactPhone, explicitLeadId],
    queryFn: async () => {
      if (explicitLeadId) {
        const { data } = await db.from("crm_leads").select("*").eq("id", explicitLeadId).maybeSingle();
        if (data) return data;
      }
      if (!matchedContactEmail && !matchedContactPhone) return null;
      let q = db.from("crm_leads").select("*").eq("agency_id", agency!.id);
      if (matchedContactEmail) {
        q = q.eq("email", matchedContactEmail);
      } else {
        const clean = matchedContactPhone!.replace(/\D/g, "");
        q = q.like("phone", `%${clean}%`);
      }
      const { data } = await q.maybeSingle();
      return data as any;
    },
  });

  const { data: matchedClient } = useQuery({
    enabled: !!agency && (!!explicitClientId || !!matchedContactEmail || !!matchedContactPhone),
    queryKey: ["inbox-matched-client", selectedId, matchedContactEmail, matchedContactPhone, explicitClientId],
    queryFn: async () => {
      if (explicitClientId) {
        const { data } = await db.from("clients").select("*").eq("id", explicitClientId).maybeSingle();
        if (data) return data;
      }
      if (!matchedContactEmail && !matchedContactPhone) return null;
      let q = db.from("clients").select("*").eq("agency_id", agency!.id);
      if (matchedContactEmail) {
        q = q.eq("email", matchedContactEmail);
      } else {
        const clean = matchedContactPhone!.replace(/\D/g, "");
        q = q.like("phone", `%${clean}%`);
      }
      const { data } = await q.maybeSingle();
      return data as any;
    },
  });

  const matchedClientId = (matchedClient as any)?.id || null;

  // Client Documents
  const { data: clientDocs = [], refetch: refetchDocs } = useQuery({
    enabled: !!agency && !!matchedClientId,
    queryKey: ["inbox-client-docs", matchedClientId],
    queryFn: async () => {
      const { data } = await db
        .from("client_documents")
        .select("*")
        .eq("client_id", matchedClientId!);
      return data || [];
    },
  });

  // Recent proposals for lead
  const { data: recentProposals = [] } = useQuery({
    enabled: !!agency && !!(matchedLead as any)?.id,
    queryKey: ["inbox-lead-proposals", (matchedLead as any)?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("proposals")
        .select("id, title, number, total, currency, status")
        .eq("lead_id", (matchedLead as any)!.id)
        .order("created_at", { ascending: false })
        .limit(3);
      return data || [];
    },
  });

  // Contact Notes loading
  useEffect(() => {
    if (selectedConversation?.contacts?.metadata?.notes) {
      setContactNotes(selectedConversation.contacts.metadata.notes);
    } else {
      setContactNotes("");
    }
  }, [selectedId, selectedConversation]);

  // Lead Insights (AI)
  const { data: leadInsights, refetch: refetchInsights } = useQuery({
    enabled: !!(matchedLead as any)?.id,
    queryKey: ["inbox-lead-insights", (matchedLead as any)?.id],
    queryFn: async () => {
      const { data } = await db
        .from("crm_leads")
        .select("general_profile, general_sentiment, generalized_objections")
        .eq("id", (matchedLead as any)!.id)
        .maybeSingle();
      return data as any;
    },
  });

  // ── Mutations ───────────────────────────────────────────────────────────────
  const sendReplyMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!agency?.id || !selectedId) throw new Error("No active conversation");
      const { data, error } = await db.from("messages").insert({
        agency_id: agency.id,
        conversation_id: selectedId,
        direction: "outbound",
        body: text,
        status: "queued",
        sender_user_id: currentUser?.id,
      });
      if (error) throw error;

      // Atualiza last_message_at na conversa
      await db.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", selectedId);
      return data;
    },
    onSuccess: () => {
      setReply("");
      queryClient.invalidateQueries({ queryKey: ["messages", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["conversations", agency?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const assignToMeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId || !currentUser?.id) throw new Error("No user or conversation selected");
      const { data, error } = await db.from("conversations").update({
        assigned_user_id: currentUser.id,
        status: "open",
      }).eq("id", selectedId);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Conversa atribuída a você com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["conversations", agency?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function handleAttachmentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedId || !agency) return;
    const toastId = toast.loading(`Enviando ${file.name}...`);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `inbox/attachments/${selectedId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("agency-media")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("agency-media").getPublicUrl(filePath);

      await db.from("messages").insert({
        agency_id: agency.id,
        conversation_id: selectedId,
        direction: "outbound",
        body: `Arquivo anexo: ${file.name}`,
        media_url: publicUrl,
        status: "queued",
        sender_user_id: currentUser?.id,
      });

      await db.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", selectedId);
      toast.success("Arquivo enviado com sucesso!", { id: toastId });
      queryClient.invalidateQueries({ queryKey: ["messages", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["conversations", agency.id] });
    } catch (err: any) {
      toast.error("Erro ao enviar anexo: " + err.message, { id: toastId });
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        if (!agency || !selectedId) return;
        const toastId = toast.loading("Enviando áudio...");
        try {
          const blob = new Blob(chunks, { type: "audio/webm" });
          const filePath = `inbox/attachments/${selectedId}/${Date.now()}.webm`;
          const { error: uploadError } = await supabase.storage
            .from("agency-media")
            .upload(filePath, blob);
          if (uploadError) throw uploadError;

          const {
            data: { publicUrl },
          } = supabase.storage.from("agency-media").getPublicUrl(filePath);

          await db.from("messages").insert({
            agency_id: agency.id,
            conversation_id: selectedId,
            direction: "outbound",
            body: "Mensagem de voz",
            media_url: publicUrl,
            status: "queued",
            sender_user_id: currentUser?.id,
          });

          await db.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", selectedId);
          toast.success("Áudio enviado com sucesso!", { id: toastId });
          queryClient.invalidateQueries({ queryKey: ["messages", selectedId] });
          queryClient.invalidateQueries({ queryKey: ["conversations", agency.id] });
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

  async function generateAiProposalForLead() {
    if (!matchedLead?.id || !agency) return;
    const toastId = toast.loading("Analisando conversa e gerando proposta...");
    try {
      const { data, error } = await supabase.functions.invoke("ai-message-processor", {
        body: { action: "create_proposal", lead_id: matchedLead.id, agency_id: agency.id },
      });
      if (error) throw error;
      const url = `${window.location.origin}/m/proposal/${data.public_token}`;
      setReply((prev) => (prev ? prev + "\n" : "") + `Olá! Preparamos uma proposta personalizada para você. Veja e confirme os detalhes aqui: ${url}`);
      toast.success("Proposta de IA adicionada ao chat!", { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao gerar proposta com IA: " + err.message, { id: toastId });
    }
  }

  async function saveContactNotes() {
    if (!selectedConversation?.contacts?.id) return;
    setSavingNotes(true);
    try {
      const currentMeta = selectedConversation.contacts.metadata || {};
      const { error } = await db.from("contacts").update({
        metadata: {
          ...currentMeta,
          notes: contactNotes,
        },
      }).eq("id", selectedConversation.contacts.id);

      if (error) throw error;
      toast.success("Observações salvas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["conversations", agency?.id] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingNotes(false);
    }
  }

  async function generateAiSuggestion() {
    if (!selectedId || !agency) return;
    setGeneratingAi(true);
    try {
      const res = await generateOmnichannelReply({
        data: {
          agencyId: agency.id,
          sessionId: selectedId,
        },
      });
      setAiSuggestion(res.suggestion);
    } catch (e: any) {
      toast.error("Erro ao gerar sugestão de IA");
    } finally {
      setGeneratingAi(false);
    }
  }

  async function triggerAnalysis() {
    if (!(matchedLead as any)?.id || !agency) return;
    setAnalyzing(true);
    const toastId = toast.loading("Analisando comportamento com IA...");
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
        body: JSON.stringify({ record: { lead_id: (matchedLead as any).id, agency_id: agency.id } }),
      });
      if (!res.ok) throw new Error("Falha na análise");
      await refetchInsights();
      toast.success("Análise de IA concluída!", { id: toastId });
    } catch (e: any) {
      toast.error("Erro ao rodar análise comportamental", { id: toastId });
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !matchedClientId || !agency) return;
    setUploadingDoc(true);
    const toastId = toast.loading(`Enviando ${file.name}...`);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `clients/documents/${matchedClientId}/${Date.now()}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage
        .from("client-documents")
        .upload(filePath, file);
      if (uploadErr) throw uploadErr;

      const {
        data: { publicUrl },
      } = supabase.storage.from("client-documents").getPublicUrl(filePath);

      const { error } = await db.from("client_documents").insert({
        agency_id: agency.id,
        client_id: matchedClientId,
        doc_type: docTypeToUpload,
        file_url: publicUrl,
        doc_number: file.name.replace(/\.[^/.]+$/, "").substring(0, 20),
      });

      if (error) throw error;
      toast.success("Documento enviado e cadastrado!", { id: toastId });
      refetchDocs();
    } catch (err: any) {
      toast.error("Erro no envio: " + err.message, { id: toastId });
    } finally {
      setUploadingDoc(false);
    }
  }

  async function createLeadFromSession() {
    if (!selectedConversation || !agency) return;
    const toastId = toast.loading("Importando contato como lead no CRM...");
    try {
      const { data: stages } = await db
        .from("crm_pipeline_stages")
        .select("id")
        .eq("agency_id", agency.id)
        .limit(1);

      const stageId = stages?.[0]?.id || null;
      if (!stageId) throw new Error("Crie pelo menos um funil/etapa no CRM primeiro");

      const contact = (selectedConversation.contacts || {}) as any;
      const { error } = await db.from("crm_leads").insert({
        agency_id: agency.id,
        name: contact.name || "Lead via Inbox",
        phone: contact.phone || "",
        email: contact.email || "",
        stage_id: stageId,
        status: "active",
      } as any);

      if (error) throw error;
      toast.success("Contato cadastrado no CRM como Lead!", { id: toastId });
      queryClient.invalidateQueries({ queryKey: ["inbox-matched-lead", selectedId] });
    } catch (e: any) {
      toast.error("Erro ao importar lead: " + e.message, { id: toastId });
    }
  }

  // ── Filters & Search ───────────────────────────────────────────────────────
  const filteredConversations = conversations.filter((c) => {
    const contact = (c.contacts || {}) as any;
    const channel = (c.channels || {}) as any;
    const matchesSearch =
      (contact.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contact.phone || "").includes(searchQuery) ||
      (contact.email || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesChannel = filterChannel ? channel.type === filterChannel : true;
    const matchesMySessions = mySessionsOnly && currentUser ? c.assigned_user_id === currentUser.id : true;

    return matchesSearch && matchesChannel && matchesMySessions;
  });

  const activeChannelTypes = Array.from(new Set(channels.map((ch: any) => ch.type)));

  return (
    <div className="flex h-full w-full overflow-hidden">
      {(isErrorChannels || isErrorConversations) && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-[var(--radius-card)] border border-red-200 bg-red-50 px-4 py-3 shadow-none max-w-md">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-red-800">Erro ao Carregar Inbox</p>
            <p className="text-[11px] text-red-600">
              {isErrorChannels && errorChannels instanceof Error ? errorChannels.message
               : isErrorConversations && errorConversations instanceof Error ? errorConversations.message
               : "Verifique as permissões e tente novamente."}
            </p>
          </div>
        </div>
      )}
      {/* ── LEFT COLUMN: Conversations List (Width 320px) ────────────────────── */}
      <aside className={cn(
        "flex flex-col border-r border-border shrink-0 glass-card border-none w-full md:w-[320px] h-full",
        selectedId ? "hidden md:flex" : "flex"
      )}>
        {/* Header & Connection button */}
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0 glass-card border-none">
          <h2 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
            <Mail className="w-4 h-4 text-brand" />
            Inbox Central
          </h2>

          <Sheet open={isConnectSheetOpen} onOpenChange={setIsConnectSheetOpen}>
            <SheetTrigger asChild>
              <button 
                className="flex h-8 items-center gap-1 px-2.5 rounded border-none glass-card border-none text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-border-strong transition-colors cursor-pointer"
                title="Configurar conexões e e-mail"
              >
                <Plug className="w-3.5 h-3.5" />
                <span>Canais</span>
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80 glass-card border-none border-r border-border">
              <SheetHeader className="p-4 border-b border-border">
                <SheetTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Settings2 className="w-4 h-4 text-brand" />
                  Conexões de Mensageria
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Conecte contas corporativas do Gmail, WhatsApp Business e Instagram.
                </SheetDescription>
              </SheetHeader>
              
              <div className="p-4 space-y-5 overflow-y-auto max-h-[calc(100vh-8rem)]">
                {/* Canais Conectados */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">Canais Ativos</h3>
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
                      <h3 className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">Adicionar Conexão</h3>
                      
                      <button 
                        onClick={() => setConnectType("gmail")}
                        className="flex items-center gap-3 w-full text-left rounded-[var(--radius-card)] border-none px-3 py-2.5 text-xs font-semibold text-foreground hover:glass bg-white/5 border-white/10 transition-all cursor-pointer glass-card border-none"
                      >
                        <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                        <div>
                          <p className="font-bold">Conectar Gmail</p>
                          <span className="text-[10px] text-muted-foreground font-normal">Sincronize mensagens do e-mail comercial.</span>
                        </div>
                      </button>

                      <button 
                        onClick={() => setConnectType("whatsapp")}
                        className="flex items-center gap-3 w-full text-left rounded-[var(--radius-card)] border-none px-3 py-2.5 text-xs font-semibold text-foreground hover:glass bg-white/5 border-white/10 transition-all cursor-pointer glass-card border-none"
                      >
                        <Phone className="w-4 h-4 text-green-500 shrink-0" />
                        <div>
                          <p className="font-bold">Integrar WhatsApp</p>
                          <span className="text-[10px] text-muted-foreground font-normal">Conecte via WhatsApp Cloud API Oficial ou Evolution API.</span>
                        </div>
                      </button>

                      <button 
                        onClick={() => setConnectType("instagram")}
                        className="flex items-center gap-3 w-full text-left rounded-[var(--radius-card)] border-none px-3 py-2.5 text-xs font-semibold text-foreground hover:glass bg-white/5 border-white/10 transition-all cursor-pointer glass-card border-none"
                      >
                        <Instagram className="w-4 h-4 text-pink-500 shrink-0" />
                        <div>
                          <p className="font-bold">Integrar Instagram</p>
                          <span className="text-[10px] text-muted-foreground font-normal">Receba mensagens diretas da rede Meta.</span>
                        </div>
                      </button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-border">
                        <button
                          onClick={() => setConnectType(null)}
                          className="text-[10px] font-black uppercase text-brand hover:underline cursor-pointer flex items-center gap-1 bg-transparent border-none"
                        >
                          ← Voltar
                        </button>
                        <span className="text-[9px] font-extrabold uppercase text-muted-foreground tracking-wider">
                          {connectType === "gmail" ? "Gmail" : connectType === "whatsapp" ? "WhatsApp" : "Instagram"}
                        </span>
                      </div>

                      {connectType === "gmail" && (
                        <div className="space-y-4">
                          <div className="flex gap-2 p-1 glass bg-white/5 border-white/10 rounded-[var(--radius-card)] border-none">
                            <button
                              type="button"
                              onClick={() => setGmailSubTab("oauth")}
                              className={cn(
                                "flex-1 text-center py-1 text-[11px] font-bold rounded-full transition-all cursor-pointer",
                                gmailSubTab === "oauth"
                                  ? "bg-brand text-white shadow-xs"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              Conta Google (OAuth)
                            </button>
                            <button
                              type="button"
                              onClick={() => setGmailSubTab("smtp")}
                              className={cn(
                                "flex-1 text-center py-1 text-[11px] font-bold rounded-full transition-all cursor-pointer",
                                gmailSubTab === "smtp"
                                  ? "bg-brand text-white shadow-xs"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              Resend (SMTP)
                            </button>
                          </div>

                          {gmailSubTab === "oauth" ? (
                            <div className="space-y-3 pt-1">
                              <p className="text-[11px] text-muted-foreground leading-normal font-sans">
                                Conecte seu e-mail do Gmail de forma segura usando o protocolo OAuth oficial do Google. Você será redirecionado para a página de consentimento do Google.
                              </p>
                              <button
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
                              </button>
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
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">E-mail Comercial *</label>
                                <input
                                  type="email"
                                  required
                                  placeholder="exemplo@gmail.com"
                                  value={gmailAddress}
                                  onChange={(e) => setGmailAddress(e.target.value)}
                                  className="w-full h-8 px-2.5 rounded glass-card border-none border-none text-xs outline-none focus:ring-1 focus:ring-brand text-foreground"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Resend API Key *</label>
                                <input
                                  type="password"
                                  required
                                  placeholder="re_..."
                                  value={resendApiKey}
                                  onChange={(e) => setResendApiKey(e.target.value)}
                                  className="w-full h-8 px-2.5 rounded glass-card border-none border-none text-xs outline-none focus:ring-1 focus:ring-brand text-foreground"
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={submittingConfig}
                                className="w-full h-8 rounded bg-brand text-white text-xs font-bold hover:bg-brand/90 cursor-pointer disabled:opacity-50"
                              >
                                {submittingConfig ? "Salvando..." : "Conectar Canal Resend"}
                              </button>
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
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Provedor</label>
                            <select
                              value={waProvider}
                              onChange={(e) => setWaProvider(e.target.value as any)}
                              className="w-full h-8 px-2 rounded glass-card border-none border-none text-xs outline-none focus:ring-1 focus:ring-brand text-foreground"
                            >
                              <option value="meta_official">WhatsApp Cloud (Oficial)</option>
                              <option value="evolution_api">Evolution API (Instância)</option>
                            </select>
                          </div>

                          {waProvider === "meta_official" ? (
                            <>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Phone Number ID *</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="Digite o ID da linha..."
                                  value={waPhoneId}
                                  onChange={(e) => setWaPhoneId(e.target.value)}
                                  className="w-full h-8 px-2.5 rounded glass-card border-none border-none text-xs outline-none focus:ring-1 focus:ring-brand text-foreground"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Access Token *</label>
                                <input
                                  type="password"
                                  required
                                  placeholder="EAA..."
                                  value={waToken}
                                  onChange={(e) => setWaToken(e.target.value)}
                                  className="w-full h-8 px-2.5 rounded glass-card border-none border-none text-xs outline-none focus:ring-1 focus:ring-brand text-foreground"
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">URL do Servidor *</label>
                                <input
                                  type="url"
                                  required
                                  placeholder="https://sua-evolution.com"
                                  value={evolutionUrl}
                                  onChange={(e) => setEvolutionUrl(e.target.value)}
                                  className="w-full h-8 px-2.5 rounded glass-card border-none border-none text-xs outline-none focus:ring-1 focus:ring-brand text-foreground"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Global API Key *</label>
                                <input
                                  type="password"
                                  required
                                  placeholder="Chave de acesso..."
                                  value={evolutionKey}
                                  onChange={(e) => setEvolutionKey(e.target.value)}
                                  className="w-full h-8 px-2.5 rounded glass-card border-none border-none text-xs outline-none focus:ring-1 focus:ring-brand text-foreground"
                                />
                              </div>
                            </>
                          )}

                          <button
                            type="submit"
                            disabled={submittingConfig}
                            className="w-full h-8 rounded bg-brand text-white text-xs font-bold hover:bg-brand/90 cursor-pointer disabled:opacity-50"
                          >
                            {submittingConfig ? "Gravando chaves..." : "Conectar WhatsApp"}
                          </button>
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
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Instagram Account ID *</label>
                            <input
                              type="text"
                              required
                              placeholder="Digite o ID da conta..."
                              value={instaAccountId}
                              onChange={(e) => setInstaAccountId(e.target.value)}
                              className="w-full h-8 px-2.5 rounded glass-card border-none border-none text-xs outline-none focus:ring-1 focus:ring-brand text-foreground"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Meta Page Access Token *</label>
                            <input
                              type="password"
                              required
                              placeholder="EAA..."
                              value={instaToken}
                              onChange={(e) => setInstaToken(e.target.value)}
                              className="w-full h-8 px-2.5 rounded glass-card border-none border-none text-xs outline-none focus:ring-1 focus:ring-brand text-foreground"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={submittingConfig}
                            className="w-full h-8 rounded bg-brand text-white text-xs font-bold hover:bg-brand/90 cursor-pointer disabled:opacity-50"
                          >
                            {submittingConfig ? "Salvando chaves..." : "Conectar Instagram"}
                          </button>
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
        <div className="px-4 py-2 border-b border-border/60 glass-card border-none/50 space-y-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              className="w-full h-8 pl-8 pr-3 rounded bg-[var(--surface-alt)] border-none text-xs outline-none focus:ring-1 focus:ring-brand text-foreground"
              placeholder="Buscar por contatos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Dynamic channels filter & Meus */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setFilterChannel(null)}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase transition-colors whitespace-nowrap border ${
                filterChannel === null
                  ? "bg-brand/10 text-brand border-brand/25"
                  : "glass-card border-none text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              <Inbox className="h-3 w-3" />
              Tudo
            </button>

            {activeChannelTypes.includes("whatsapp") && (
              <button
                onClick={() => setFilterChannel("whatsapp")}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase transition-colors whitespace-nowrap border ${
                  filterChannel === "whatsapp"
                    ? "bg-green-500/10 text-green-600 border-green-500/25"
                    : "glass-card border-none text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                <Phone className="h-3 w-3" />
                Whats
              </button>
            )}

            {activeChannelTypes.includes("email") && (
              <button
                onClick={() => setFilterChannel("email")}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase transition-colors whitespace-nowrap border ${
                  filterChannel === "email"
                    ? "bg-blue-500/10 text-blue-600 border-blue-500/25"
                    : "glass-card border-none text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                <Mail className="h-3 w-3" />
                E-mail
              </button>
            )}

            {/* Instagram dinâmico se a agência tiver chaves ou conversas dele */}
            {(activeChannelTypes.includes("instagram" as any) || conversations.some(c => (c.channels as any)?.type === "instagram")) && (
              <button
                onClick={() => setFilterChannel("instagram")}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase transition-colors whitespace-nowrap border ${
                  filterChannel === "instagram"
                    ? "bg-pink-500/10 text-pink-600 border-pink-500/25"
                    : "glass-card border-none text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                <Instagram className="h-3 w-3" />
                Insta
              </button>
            )}

            <button
              onClick={() => setMySessionsOnly(!mySessionsOnly)}
              className={`ml-auto flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase transition-colors border ${
                mySessionsOnly
                  ? "bg-brand/10 text-brand border-brand/25"
                  : "glass-card border-none text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              Meus
            </button>
          </div>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {isLoadingConversations && (
            <div className="space-y-2 p-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-[var(--radius-card)] glass bg-white/5 border-white/10/50 animate-pulse" />
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
            const lastMsg = c.messages?.[0] || {};
            const Icon = CHANNEL_ICONS[channel.type] ?? MessageSquare;
            const isSelected = c.id === selectedId;

            return (
              <button
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
                    <span className="shrink-0 text-[10px] text-muted-foreground ml-2">
                      {formatTime(c.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <p className="flex-1 truncate text-[11px] text-muted-foreground">
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
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── CENTRAL COLUMN: Message Thread & Chat ───────────────────────────────── */}
      <section className={cn(
        "flex flex-1 flex-col glass-card border-none border-r border-border h-full min-w-0",
        selectedId ? "flex" : "hidden md:flex"
      )}>
        {selectedId ? (
          <div className="flex flex-1 flex-col h-full overflow-hidden">
            {/* Thread Header */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-3 glass-card border-none shrink-0">
              <button
                onClick={() => setSelectedId(null)}
                className="md:hidden flex h-8 w-8 items-center justify-center rounded-full border-none glass-card border-none text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Voltar para a lista"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

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
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground capitalize">
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
                <button
                  onClick={generateAiSuggestion}
                  disabled={generatingAi}
                  className="flex items-center gap-1.5 rounded-full border-none px-2.5 py-1.5 text-xs font-semibold text-brand glass-card border-none hover:glass bg-white/5 border-white/10 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className={cn("h-3.5 w-3.5", generatingAi && "animate-pulse")} />
                  <span>{generatingAi ? "Sugerindo..." : "IA Resposta"}</span>
                </button>

                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-none transition-colors hover:glass bg-white/5 border-white/10 cursor-pointer",
                    showDetails ? "glass bg-white/5 border-white/10 text-brand" : "text-muted-foreground glass-card border-none"
                  )}
                  title="Ocultar/Mostrar painel do contato"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* AI Suggestion Banner */}
            {aiSuggestion && (
              <div className="mx-4 mt-3 rounded-[var(--radius-card)] border border-brand/20 bg-brand/5 p-3 shrink-0">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="text-[10px] font-extrabold uppercase tracking-wide text-brand mb-1">
                      Sugestão da IA
                    </div>
                    <p className="text-xs text-foreground leading-relaxed">{aiSuggestion}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setReply(aiSuggestion);
                        setAiSuggestion(null);
                      }}
                      className="rounded bg-brand px-2.5 py-1 text-[10px] font-bold text-brand-foreground hover:bg-brand/90 transition-colors cursor-pointer"
                    >
                      Usar
                    </button>
                    <button onClick={() => setAiSuggestion(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Messages Thread list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 glass bg-white/5 border-white/10/10">
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
            <div className="border-t border-border p-3 glass-card border-none shrink-0">
              <div className="flex items-end gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-card)] border-none glass-card border-none hover:glass bg-white/5 border-white/10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Anexar arquivo"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleAttachmentUpload} className="hidden" />

                <button
                  onClick={recording ? stopRecording : startRecording}
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-card)] border transition-all cursor-pointer",
                    recording
                      ? "bg-red-500 border-red-500 text-white animate-pulse"
                      : "border-border glass-card border-none hover:glass bg-white/5 border-white/10 text-muted-foreground hover:text-foreground"
                  )}
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
                      if (reply.trim()) sendReplyMutation.mutate(reply);
                    }
                  }}
                  placeholder={recording ? "Gravando áudio..." : "Digite uma mensagem…"}
                  rows={2}
                  disabled={recording}
                  className="flex-1 resize-none rounded-[var(--radius-card)] border-none glass bg-white/5 border-white/10 px-3 py-2.5 text-sm outline-none focus:border-brand text-foreground"
                />
                
                <button
                  onClick={() => {
                    if (reply.trim()) sendReplyMutation.mutate(reply);
                  }}
                  disabled={sendingReply || !reply.trim() || recording}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-card)] bg-brand text-brand-foreground hover:bg-brand/90 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                </button>
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
        <aside className="fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-border glass-card border-none overflow-y-auto no-scrollbar md:relative md:w-80 md:z-0 md:flex md:shadow-none shadow-2xl h-full">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
            <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Painel do Cliente
            </h3>
            <button onClick={() => setShowDetails(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Sub-Tabs */}
          <div className="flex border-b border-border text-xs font-bold shrink-0 glass bg-white/5 border-white/10/30">
            <button
              onClick={() => setDetailsTab("profile")}
              className={cn(
                "flex-1 py-2.5 text-center border-b-2 transition-colors cursor-pointer",
                detailsTab === "profile" ? "border-brand text-brand font-bold" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Perfil
            </button>
            <button
              onClick={() => setDetailsTab("documents")}
              className={cn(
                "flex-1 py-2.5 text-center border-b-2 transition-colors cursor-pointer",
                detailsTab === "documents" ? "border-brand text-brand font-bold" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Docs
            </button>
            <button
              onClick={() => setDetailsTab("notices")}
              className={cn(
                "flex-1 py-2.5 text-center border-b-2 transition-colors cursor-pointer",
                detailsTab === "notices" ? "border-brand text-brand font-bold" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Avisos
            </button>
            <button
              onClick={() => setDetailsTab("ai_templates")}
              className={cn(
                "flex-1 py-2.5 text-center border-b-2 transition-colors cursor-pointer",
                detailsTab === "ai_templates" ? "border-brand text-brand font-bold" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Templates
            </button>
          </div>

          {/* Tab content scroll block */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
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
                        <button
                          onClick={() => {
                            setIsLinkingOpen(false);
                            setCrmSearchQuery("");
                          }}
                          className="text-[9px] font-bold text-muted-foreground hover:text-foreground"
                        >
                          Cancelar
                        </button>
                      </div>

                      <div className="flex gap-1.5">
                        <button
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
                        </button>
                        <button
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
                        </button>
                      </div>

                      <input
                        type="text"
                        value={crmSearchQuery}
                        onChange={(e) => setCrmSearchQuery(e.target.value)}
                        placeholder="Buscar por nome (min. 3 letras)..."
                        className="w-full text-xs h-8 px-2.5 rounded border-none glass-card border-none text-foreground outline-none focus:border-brand"
                      />

                      {crmSearchQuery.length > 2 && crmSearchResults.length === 0 && (
                        <p className="text-[10px] text-muted-foreground text-center py-1">
                          Nenhum resultado encontrado.
                        </p>
                      )}

                      {crmSearchResults.length > 0 && (
                        <div className="max-h-28 overflow-y-auto border-none/50 rounded glass-card border-none divide-y divide-border/30">
                          {crmSearchResults.map((res: any) => (
                            <button
                              key={res.id}
                              type="button"
                              onClick={() => {
                                if (crmSearchType === "lead") {
                                  linkContactToCrm(res.id, null);
                                } else {
                                  linkContactToCrm(null, res.id);
                                }
                              }}
                              className="w-full text-left px-2.5 py-1.5 hover:glass bg-white/5 border-white/10/40 text-[10px] text-foreground flex flex-col cursor-pointer"
                            >
                              <span className="font-semibold">{res.name}</span>
                              <span className="text-[8px] text-muted-foreground">
                                {res.email || ""} {res.phone ? `(${res.phone})` : ""}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {(explicitLeadId || explicitClientId) && (
                        <button
                          type="button"
                          onClick={() => linkContactToCrm(null, null)}
                          className="w-full text-center py-1 border border-danger/30 text-danger bg-danger/5 hover:bg-danger/10 text-[9px] font-bold rounded mt-1"
                        >
                          Remover Vínculo Atual
                        </button>
                      )}
                    </div>
                  ) : matchedLead ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-extrabold uppercase tracking-wide text-brand">
                          Lead no CRM
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsLinkingOpen(true)}
                            className="text-[9px] font-bold text-muted-foreground hover:text-brand hover:underline"
                          >
                            Alterar vínculo
                          </button>
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
                      {(matchedLead as any).email && <p className="text-[10px] text-muted-foreground">{(matchedLead as any).email}</p>}
                    </div>
                  ) : matchedClient ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-extrabold uppercase tracking-wide text-emerald-600">
                          Cliente Cadastrado
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsLinkingOpen(true)}
                            className="text-[9px] font-bold text-muted-foreground hover:text-emerald-600 hover:underline"
                          >
                            Alterar vínculo
                          </button>
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
                      <p className="text-[10px] text-muted-foreground">Não localizado no CRM</p>
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={createLeadFromSession}
                          className="w-full text-[10px] font-bold border border-brand/35 text-brand bg-brand/5 hover:bg-brand/10 py-1.5 rounded-[var(--radius-card)] flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Importar como Lead
                        </button>
                        <button
                          onClick={() => setIsLinkingOpen(true)}
                          className="w-full text-[10px] font-bold border-none text-muted-foreground glass-card border-none hover:text-foreground hover:glass bg-white/5 border-white/10/25 py-1.5 rounded-[var(--radius-card)] flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Link2 className="w-3.5 h-3.5" /> Vincular Lead/Cliente Existente
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick actions */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    Ações Rápidas
                  </h4>
                  <div className="space-y-1.5">
                    {matchedLead && (
                      <button
                        onClick={generateAiProposalForLead}
                        className="flex items-center gap-2 w-full text-left rounded-[var(--radius-card)] border border-brand/20 bg-brand/5 px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand/10 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Gerar Proposta IA</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setReply((prev) => (prev ? prev + "\n" : "") + `Olá! Segue o link para assinatura do seu contrato: ${window.location.origin}/m/contract/assinar-aqui`);
                        toast.success("Link do contrato copiado!");
                      }}
                      className="flex items-center gap-2 w-full text-left rounded-[var(--radius-card)] border-none px-3 py-1.5 text-xs font-bold text-foreground hover:glass bg-white/5 border-white/10/50 transition-colors cursor-pointer glass-card border-none"
                    >
                      <FileCheck className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Enviar Contrato</span>
                    </button>

                    <button
                      onClick={() => {
                        setReply((prev) => (prev ? prev + "\n" : "") + `Olá! Você pode acompanhar sua viagem e vouchers direto pelo nosso Portal do Cliente: ${window.location.origin}/client`);
                        toast.success("Link do portal de cliente copiado!");
                      }}
                      className="flex items-center gap-2 w-full text-left rounded-[var(--radius-card)] border-none px-3 py-1.5 text-xs font-bold text-foreground hover:glass bg-white/5 border-white/10/50 transition-colors cursor-pointer glass-card border-none"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>MagicLink Portal</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Documents */}
            {detailsTab === "documents" && (
              <div className="p-4 space-y-4">
                <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Documentos Pessoais
                </h4>

                {matchedClientId ? (
                  <div className="p-3 border-none rounded-[var(--radius-card)] glass bg-white/5 border-white/10/40 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-foreground">Tipo de Doc:</span>
                      <select
                        value={docTypeToUpload}
                        onChange={(e) => setDocTypeToUpload(e.target.value)}
                        className="h-7 text-[11px] rounded border-none glass-card border-none px-1 outline-none text-foreground"
                      >
                        <option value="rg">RG</option>
                        <option value="cpf">CPF</option>
                        <option value="passport">Passaporte</option>
                        <option value="cnh">CNH</option>
                        <option value="visa">Visto</option>
                        <option value="other">Outro</option>
                      </select>
                    </div>
                    <div className="relative">
                      <input type="file" id="client-doc-inbox-upload" onChange={handleDocUpload} disabled={uploadingDoc} className="hidden" />
                      <button
                        onClick={() => document.getElementById("client-doc-inbox-upload")?.click()}
                        disabled={uploadingDoc}
                        className="w-full h-16 border border-dashed border-border hover:border-brand/50 rounded-[var(--radius-card)] flex flex-col items-center justify-center text-[10px] font-medium text-muted-foreground glass-card border-none hover:text-foreground cursor-pointer transition-colors disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4 mb-1 text-muted-foreground/60" />
                        {uploadingDoc ? "Enviando..." : "Upload Documento"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground text-center py-3 glass bg-white/5 border-white/10/30 border border-dashed border-border rounded-[var(--radius-card)]">
                    Cadastre o lead como cliente no CRM primeiro para gerenciar seus documentos.
                  </p>
                )}

                {matchedClientId && (
                  <div className="space-y-2">
                    {clientDocs.length > 0 ? (
                      clientDocs.map((doc: any) => (
                        <div key={doc.id} className="p-3 border-none rounded-[var(--radius-card)] glass-card border-none flex flex-col gap-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-brand uppercase text-[10px]">{doc.doc_type}</span>
                            {doc.file_url && (
                              <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-brand font-bold hover:underline flex items-center gap-0.5 text-[10px]">
                                Ver arquivo <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          <span className="font-mono text-muted-foreground text-[10px]">{doc.doc_number || "Sem número"}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-muted-foreground text-center py-4">Nenhum documento anexado.</p>
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
                      <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                        Observações Internas
                      </h4>
                      <button onClick={saveContactNotes} disabled={savingNotes} className="text-[10px] text-brand font-bold hover:underline disabled:opacity-50 cursor-pointer">
                        {savingNotes ? "Salvando..." : "Salvar"}
                      </button>
                    </div>
                    <textarea
                      value={contactNotes}
                      onChange={(e) => setContactNotes(e.target.value)}
                      placeholder="Escreva notas importantes sobre este contato..."
                      rows={10}
                      className="w-full text-xs p-2.5 border-none rounded-[var(--radius-card)] glass-card border-none outline-none focus:border-brand resize-none leading-relaxed text-foreground"
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
                      <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Bot className="w-3.5 h-3.5 text-brand" /> IA RAG Insights
                      </h4>
                      <button onClick={triggerAnalysis} disabled={analyzing} className="text-[10px] text-brand font-bold hover:underline flex items-center gap-1 disabled:opacity-50 cursor-pointer">
                        <RefreshCw className={cn("w-3 h-3", analyzing && "animate-spin")} />
                        <span>Atualizar</span>
                      </button>
                    </div>

                    {leadInsights ? (
                      <div className="space-y-2">
                        {(leadInsights as any).general_profile && (
                          <div className="text-[11px] bg-brand/5 border border-brand/10 p-2.5 rounded-[var(--radius-card)] text-foreground leading-relaxed">
                            <strong>Comportamento:</strong> {(leadInsights as any).general_profile}
                          </div>
                        )}
                        {(leadInsights as any).general_sentiment && (
                          <div className="text-[11px] bg-brand/5 border border-brand/10 p-2.5 rounded-[var(--radius-card)] text-foreground leading-relaxed">
                            <strong>Sentimento:</strong> {(leadInsights as any).general_sentiment}
                          </div>
                        )}
                        {(leadInsights as any).generalized_objections && (
                          <div className="text-[11px] bg-brand/5 border border-brand/10 p-2.5 rounded-[var(--radius-card)] text-foreground leading-relaxed">
                            <strong>Objeções:</strong> {(leadInsights as any).generalized_objections}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground text-center py-2 glass bg-white/5 border-white/10/30 border border-dashed border-border rounded-[var(--radius-card)]">
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
