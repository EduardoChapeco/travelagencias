import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { toast } from "sonner";
import { generateOmnichannelReply } from "@/lib/api/ai-chat.functions";

const db = supabase as any;

export type Conversation = {
  id: string;
  status: "open" | "pending" | "snoozed" | "closed";
  ai_mode: boolean;
  last_message_at: string | null;
  assigned_user_id: string | null;
  unread_count?: number;
  contacts?: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    lead_id?: string | null;
    client_id?: string | null;
    metadata?: Record<string, any>;
  };
  channels?: {
    id: string;
    type: string;
    display_name: string;
  };
  messages?: Array<{
    id: string;
    body: string;
    direction: string;
    status: string;
    created_at: string;
  }>;
};

export function useInbox() {
  const { agency } = useAgency();
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterChannel, setFilterChannel] = useState<string | null>(null);
  const [mySessionsOnly, setMySessionsOnly] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
  }, []);

  const {
    data: channels = [],
    isLoading: isLoadingChannels,
    isError: isErrorChannels,
    error: errorChannels,
  } = useQuery({
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

  const {
    data: conversations = [],
    isLoading: isLoadingConversations,
    isError: isErrorConversations,
    error: errorConversations,
  } = useQuery({
    queryKey: ["conversations", agency?.id, filterChannel, mySessionsOnly],
    queryFn: async () => {
      if (!agency?.id) return [];
      const { data, error } = await db
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

      if (error) throw error;

      return (data || []).map((c: any) => {
        const sortedMsgs = c.messages
          ? [...c.messages].sort(
              (a: any, b: any) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            )
          : [];
        return { ...c, messages: sortedMsgs };
      }) as Conversation[];
    },
    enabled: !!agency?.id,
  });

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!agency?.id) return;

    const channel = supabase
      .channel("inbox-realtime-v3")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `agency_id=eq.${agency.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["conversations", agency.id] });
          queryClient.invalidateQueries({
            queryKey: ["unread-conversations-count", agency.id],
          });
          if (payload.new.conversation_id === selectedId) {
            queryClient.invalidateQueries({ queryKey: ["messages", selectedId] });
            if (payload.new.direction === "inbound") {
              toast("Nova mensagem recebida!");
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `agency_id=eq.${agency.id}`,
        },
        (payload) => {
          if (payload.new.conversation_id === selectedId) {
            queryClient.invalidateQueries({ queryKey: ["messages", selectedId] });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agency?.id, selectedId, queryClient]);

  useEffect(() => {
    if (!selectedId || !agency?.id) return;

    const markAsRead = async () => {
      try {
        await db.from("conversations").update({ unread_count: 0 }).eq("id", selectedId);
        await db
          .from("messages")
          .update({ status: "read" })
          .eq("conversation_id", selectedId)
          .eq("direction", "inbound")
          .neq("status", "read");

        queryClient.invalidateQueries({ queryKey: ["conversations", agency.id] });
        queryClient.invalidateQueries({
          queryKey: ["unread-conversations-count", agency.id],
        });
      } catch (err) {
        console.error("Erro ao marcar mensagens como lidas:", err);
      }
    };

    markAsRead();
  }, [selectedId, agency?.id, queryClient]);

  const selectedConversation = conversations.find((c) => c.id === selectedId) || null;

  const matchedContactEmail = selectedConversation?.contacts?.email;
  const matchedContactPhone = selectedConversation?.contacts?.phone;
  const explicitLeadId = selectedConversation?.contacts?.lead_id;
  const explicitClientId = selectedConversation?.contacts?.client_id;

  const { data: matchedLead } = useQuery({
    enabled:
      !!agency && (!!explicitLeadId || !!matchedContactEmail || !!matchedContactPhone),
    queryKey: [
      "inbox-matched-lead",
      selectedId,
      matchedContactEmail,
      matchedContactPhone,
      explicitLeadId,
    ],
    queryFn: async () => {
      if (explicitLeadId) {
        const { data } = await db
          .from("leads")
          .select("*")
          .eq("id", explicitLeadId)
          .maybeSingle();
        if (data) return data;
      }
      if (!matchedContactEmail && !matchedContactPhone) return null;
      let q = db.from("leads").select("*").eq("agency_id", agency!.id);
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
    enabled:
      !!agency && (!!explicitClientId || !!matchedContactEmail || !!matchedContactPhone),
    queryKey: [
      "inbox-matched-client",
      selectedId,
      matchedContactEmail,
      matchedContactPhone,
      explicitClientId,
    ],
    queryFn: async () => {
      if (explicitClientId) {
        const { data } = await db
          .from("clients")
          .select("*")
          .eq("id", explicitClientId)
          .maybeSingle();
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

  const {
    data: leadInsights,
    refetch: refetchInsights,
  } = useQuery({
    enabled: !!(matchedLead as any)?.id,
    queryKey: ["inbox-lead-insights", (matchedLead as any)?.id],
    queryFn: async () => {
      const { data } = await db
        .from("leads")
        .select("general_profile, general_sentiment, generalized_objections")
        .eq("id", (matchedLead as any)!.id)
        .maybeSingle();
      return data as any;
    },
  });

  const [crmSearchQuery, setCrmSearchQuery] = useState("");
  const [crmSearchType, setCrmSearchType] = useState<"lead" | "client">("lead");
  const [isLinkingOpen, setIsLinkingOpen] = useState(false);

  const { data: crmSearchResults = [] } = useQuery({
    enabled: isLinkingOpen && crmSearchQuery.length > 2 && !!agency,
    queryKey: ["inbox-crm-search", crmSearchType, crmSearchQuery, agency?.id],
    queryFn: async () => {
      if (crmSearchType === "lead") {
        const { data, error } = await db
          .from("leads")
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
          phone: d.phone,
        }));
      }
    },
  });

  const linkContactToCrm = async (
    leadId: string | null,
    clientId: string | null,
  ) => {
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
      queryClient.invalidateQueries({
        queryKey: ["inbox-matched-lead", selectedId],
      });
      queryClient.invalidateQueries({
        queryKey: ["inbox-matched-client", selectedId],
      });
    }
  };

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
      await db
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", selectedId);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["conversations", agency?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const assignToMeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId || !currentUser?.id)
        throw new Error("No user or conversation selected");
      const { data, error } = await db
        .from("conversations")
        .update({ assigned_user_id: currentUser.id, status: "open" })
        .eq("id", selectedId);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Conversa atribuída a você com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["conversations", agency?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function handleAttachmentUpload(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
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

      await db
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", selectedId);

      toast.success("Arquivo enviado com sucesso!", { id: toastId });
      queryClient.invalidateQueries({ queryKey: ["messages", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["conversations", agency.id] });
    } catch (err: any) {
      toast.error("Erro ao enviar anexo: " + err.message, { id: toastId });
    }
  }

  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

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

          await db
            .from("conversations")
            .update({ last_message_at: new Date().toISOString() })
            .eq("id", selectedId);

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
    } catch {
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
    if (!(matchedLead as any)?.id || !agency) return;
    const toastId = toast.loading("Analisando conversa e gerando proposta...");
    try {
      const { data, error } = await supabase.functions.invoke(
        "ai-message-processor",
        {
          body: {
            action: "create_proposal",
            lead_id: (matchedLead as any).id,
            agency_id: agency.id,
          },
        },
      );
      if (error) throw error;
      const url = `${window.location.origin}/m/proposal/${data.public_token}`;
      toast.success("Proposta de IA adicionada ao chat!", { id: toastId });
      return `Olá! Preparamos uma proposta personalizada para você. Veja e confirme os detalhes aqui: ${url}`;
    } catch (err: any) {
      toast.error("Erro ao gerar proposta com IA: " + err.message, { id: toastId });
      return null;
    }
  }

  async function saveContactNotes(contactNotes: string) {
    if (!selectedConversation?.contacts?.id) return;
    try {
      const currentMeta = selectedConversation.contacts.metadata || {};
      const { error } = await db
        .from("contacts")
        .update({ metadata: { ...currentMeta, notes: contactNotes } })
        .eq("id", selectedConversation.contacts.id);

      if (error) throw error;
      toast.success("Observações salvas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["conversations", agency?.id] });
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  }

  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

  async function generateAiSuggestion() {
    if (!selectedId || !agency) return;
    setGeneratingAi(true);
    try {
      const res = await generateOmnichannelReply({
        data: { agencyId: agency.id, sessionId: selectedId },
      });
      setAiSuggestion(res.suggestion);
    } catch {
      toast.error("Erro ao gerar sugestão de IA");
    } finally {
      setGeneratingAi(false);
    }
  }

  const [analyzing, setAnalyzing] = useState(false);

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
        body: JSON.stringify({
          record: { lead_id: (matchedLead as any).id, agency_id: agency.id },
        }),
      });
      if (!res.ok) throw new Error("Falha na análise");
      await refetchInsights();
      toast.success("Análise de IA concluída!", { id: toastId });
    } catch {
      toast.error("Erro ao rodar análise comportamental", { id: toastId });
    } finally {
      setAnalyzing(false);
    }
  }

  const [uploadingDoc, setUploadingDoc] = useState(false);

  async function handleDocUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    docTypeToUpload: string,
  ) {
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
      const { error } = await db.from("leads").insert({
        agency_id: agency.id,
        name: contact.name || "Lead via Inbox",
        phone: contact.phone || "",
        email: contact.email || "",
        stage_id: stageId,
        status: "active",
      } as any);

      if (error) throw error;
      toast.success("Contato cadastrado no CRM como Lead!", { id: toastId });
      queryClient.invalidateQueries({
        queryKey: ["inbox-matched-lead", selectedId],
      });
    } catch (e: any) {
      toast.error("Erro ao importar lead: " + e.message, { id: toastId });
    }
  }

  return {
    selectedId,
    setSelectedId,
    searchQuery,
    setSearchQuery,
    filterChannel,
    setFilterChannel,
    mySessionsOnly,
    setMySessionsOnly,
    currentUser,
    recording,
    aiSuggestion,
    setAiSuggestion,
    generatingAi,
    analyzing,
    uploadingDoc,
    messagesEndRef,
    fileInputRef,
    conversations,
    isLoadingConversations,
    isErrorConversations,
    errorConversations,
    selectedConversation,
    messages,
    isLoadingMessages,
    channels,
    isLoadingChannels,
    isErrorChannels,
    errorChannels,
    matchedLead,
    matchedClient,
    matchedClientId,
    explicitLeadId,
    explicitClientId,
    clientDocs,
    recentProposals,
    leadInsights,
    refetchInsights,
    crmSearchQuery,
    setCrmSearchQuery,
    crmSearchType,
    setCrmSearchType,
    isLinkingOpen,
    setIsLinkingOpen,
    crmSearchResults,
    sendReplyMutation,
    assignToMeMutation,
    linkContactToCrm,
    handleAttachmentUpload,
    startRecording,
    stopRecording,
    generateAiProposalForLead,
    saveContactNotes,
    generateAiSuggestion,
    triggerAnalysis,
    handleDocUpload,
    createLeadFromSession,
  };
}
