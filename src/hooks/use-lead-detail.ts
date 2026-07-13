import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { useConfirm } from "@/hooks/use-confirm";
import { useAgency } from "@/lib/agency-context";
import {
  fetchStages,
  fetchLeadById,
  fetchLeadActivities,
  fetchLeadOwnerProfile,
  promoteLeadToClient,
  updateLead,
  addLeadActivity,
  uploadLeadAttachment,
  fetchAgencyUsers,
  transferLead,
  fetchLeadMeetings,
  createLeadMeeting,
  deleteLeadMeeting,
  syncMeetingToGoogleCalendar,
  type Stage,
  type Lead,
  type LeadMeeting,
} from "@/services/crm";

export function useLeadDetail(lead_id: string, slug: string) {
  const { agency } = useAgency();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { confirm, ConfirmDialog } = useConfirm();

  const [editing, setEditing] = useState(false);
  const [checklistInput, setChecklistInput] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");
  const [uploading, setUploading] = useState(false);
  const [proposalSheetOpen, setProposalSheetOpen] = useState(false);
  const [confirmConvertOpen, setConfirmConvertOpen] = useState(false);

  const [clientPayload, setClientPayload] = useState({
    full_name: "",
    document: "",
    birth_date: "",
    email: "",
    phone: "",
    pcd: false,
    reduced_mobility: false,
    autism: false,
    health_notes: "",
  });

  const [paxForm, setPaxForm] = useState({
    full_name: "",
    document: "",
    birth_date: "",
    relationship: "other",
    phone: "",
    email: "",
  });
  const [paxFormOpen, setPaxFormOpen] = useState(false);

  const [meetingForm, setMeetingForm] = useState({
    title: "",
    description: "",
    scheduled_at: "",
    duration_minutes: 30,
    meeting_type: "call",
  });
  const [meetingFormOpen, setMeetingFormOpen] = useState(false);

  // Queries
  const stagesQ = useQuery({
    enabled: !!agency,
    queryKey: ["stages", agency?.id],
    queryFn: () => fetchStages(agency!.id),
  });

  const leadQ = useQuery({
    enabled: !!agency,
    queryKey: ["lead", lead_id],
    queryFn: () => fetchLeadById(lead_id),
  });

  const activitiesQ = useQuery({
    enabled: !!lead_id,
    queryKey: ["lead-activities", lead_id],
    queryFn: () => fetchLeadActivities(lead_id),
  });

  const ownerQ = useQuery({
    enabled: !!leadQ.data?.owner_id,
    queryKey: ["profile", leadQ.data?.owner_id],
    queryFn: () => fetchLeadOwnerProfile(leadQ.data!.owner_id!),
  });

  const usersQ = useQuery({
    enabled: !!agency,
    queryKey: ["agency-users", agency?.id],
    queryFn: () => fetchAgencyUsers(agency!.id),
  });

  const meetingsQ = useQuery({
    enabled: !!leadQ.data?.id,
    queryKey: ["lead-meetings", lead_id],
    queryFn: () => fetchLeadMeetings(lead_id),
  });

  useEffect(() => {
    if (leadQ.data) {
      setClientPayload({
        full_name: leadQ.data.name || "",
        document: "",
        birth_date: "",
        email: leadQ.data.email || "",
        phone: leadQ.data.phone || "",
        pcd: leadQ.data.pcd || false,
        reduced_mobility: leadQ.data.reduced_mobility || false,
        autism: leadQ.data.autism || false,
        health_notes: leadQ.data.health_notes || "",
      });
    }
  }, [leadQ.data]);

  const proposalsQ = useQuery({
    enabled: !!leadQ.data?.id,
    queryKey: ["proposals", agency?.id, { leadId: leadQ.data?.id }],
    queryFn: async () => {
      let query = supabase.from("proposals").select("id, number, title, status, total, created_at");

      if (leadQ.data?.client_id) {
        query = query.or(`lead_id.eq.${lead_id},client_id.eq.${leadQ.data.client_id}`);
      } else {
        query = query.eq("lead_id", lead_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const lead = leadQ.data as Lead | undefined;
  const stage = stagesQ.data?.find((s) => s.id === lead?.stage_id);

  // Staleness calculations
  const lastContactDate = lead?.last_contacted_at
    ? new Date(lead.last_contacted_at)
    : lead
      ? new Date(lead.created_at)
      : new Date();
  const diffTime = Math.abs(new Date().getTime() - lastContactDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  function handleClose() {
    navigate({ to: "/agency/$slug/crm", params: { slug } });
  }

  async function handleConvert() {
    if (!lead) return;
    const missing: string[] = [];
    if (!lead.name?.trim()) missing.push("Nome completo");
    if (!(lead as any).document?.trim() && !(lead as any).cpf?.trim())
      missing.push("CPF / Documento");
    if (!(lead as any).birth_date?.trim()) missing.push("Data de nascimento");
    if (!lead.phone?.trim()) missing.push("WhatsApp / Telefone");

    if (missing.length > 0) {
      toast.error(
        `Preencha os campos obrigatórios antes de converter:\n• ${missing.join("\n• ")}`,
        { duration: 6000 },
      );
      setEditing(true);
      return;
    }

    try {
      await promoteLeadToClient(lead.id);
    } catch (error: any) {
      return toast.error("Erro ao converter lead: " + error.message);
    }

    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#000000", "#ffffff", "#a8a29e", stage?.color || "#3b82f6"],
      disableForReducedMotion: true,
    });

    toast.success("Lead convertido para Cliente!");
    qc.invalidateQueries({ queryKey: ["lead", lead.id] });
    qc.invalidateQueries({ queryKey: ["leads", agency?.id] });
  }

  async function toggleChecklistItem(itemId: string, done: boolean) {
    if (!lead) return;
    const list = lead.checklist || [];
    const updated = list.map((item) => (item.id === itemId ? { ...item, done } : item));
    try {
      await updateLead(lead.id, { checklist: updated });
      qc.invalidateQueries({ queryKey: ["lead", lead.id] });
    } catch (e) {
      toast.error("Falha ao salvar checklist");
    }
  }

  async function addChecklistItem(e: React.FormEvent) {
    e.preventDefault();
    if (!lead || !checklistInput.trim()) return;
    const list = lead.checklist || [];
    const newItem = {
      id: crypto.randomUUID(),
      text: checklistInput.trim(),
      done: false,
    };
    const updated = [...list, newItem];
    try {
      await updateLead(lead.id, { checklist: updated });
      setChecklistInput("");
      qc.invalidateQueries({ queryKey: ["lead", lead.id] });
      toast.success("Item adicionado!");
    } catch (e) {
      toast.error("Falha ao adicionar item");
    }
  }

  async function deleteChecklistItem(itemId: string) {
    if (!lead) return;
    const list = lead.checklist || [];
    const updated = list.filter((item) => item.id !== itemId);
    try {
      await updateLead(lead.id, { checklist: updated });
      qc.invalidateQueries({ queryKey: ["lead", lead.id] });
    } catch (e) {
      toast.error("Falha ao deletar item");
    }
  }

  async function addTag() {
    if (!lead || !newTagName.trim()) return;
    const tagString = `${newTagName.trim()}:${newTagColor}`;
    const list = lead.tags || [];
    if (list.includes(tagString)) return toast.error("Tag já existe");
    const updated = [...list, tagString];
    try {
      await updateLead(lead.id, { tags: updated });
      setNewTagName("");
      qc.invalidateQueries({ queryKey: ["lead", lead.id] });
      qc.invalidateQueries({ queryKey: ["leads", agency?.id] });
      toast.success("Tag adicionada!");
    } catch (e) {
      toast.error("Falha ao adicionar tag");
    }
  }

  async function removeTag(tag: string) {
    if (!lead) return;
    const list = lead.tags || [];
    const updated = list.filter((t) => t !== tag);
    try {
      await updateLead(lead.id, { tags: updated });
      qc.invalidateQueries({ queryKey: ["lead", lead.id] });
      qc.invalidateQueries({ queryKey: ["leads", agency?.id] });
    } catch (e) {
      toast.error("Falha ao remover tag");
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!lead) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const toastId = toast.loading(`Enviando arquivo ${file.name}...`);
    try {
      await uploadLeadAttachment(lead.id, file, lead.attachments || []);
      qc.invalidateQueries({ queryKey: ["lead", lead.id] });
      toast.success("Arquivo enviado com sucesso!", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer upload", { id: toastId });
    } finally {
      setUploading(false);
    }
  }

  async function removeAttachment(attachmentId: string) {
    if (!lead) return;
    confirm({
      title: "Remover Anexo",
      description: "Deseja remover este anexo permanentemente?",
      variant: "destructive",
      onConfirm: async () => {
        const list = lead.attachments || [];
        const updated = list.filter((a) => a.id !== attachmentId);
        try {
          await updateLead(lead.id, { attachments: updated });
          qc.invalidateQueries({ queryKey: ["lead", lead.id] });
          toast.success("Anexo removido.");
        } catch (e) {
          toast.error("Falha ao remover anexo");
        }
      },
    });
  }

  async function handleLgpdToggle(checked: boolean) {
    if (!lead) return;
    try {
      await updateLead(lead.id, {
        lgpd_accepted: checked,
        lgpd_accepted_at: checked ? new Date().toISOString() : null,
      });
      qc.invalidateQueries({ queryKey: ["lead", lead.id] });
      toast.success("Termo LGPD atualizado!");
    } catch (e) {
      toast.error("Erro ao atualizar LGPD");
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!lead) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading(`Enviando foto de perfil...`);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `crm/avatars/${lead.id}/${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from("agency-media").upload(filePath, file);
      if (error) throw error;
      const {
        data: { publicUrl },
      } = supabase.storage.from("agency-media").getPublicUrl(filePath);
      await updateLead(lead.id, { avatar_url: publicUrl });
      qc.invalidateQueries({ queryKey: ["lead", lead.id] });
      qc.invalidateQueries({ queryKey: ["leads", agency?.id] });
      toast.success("Foto atualizada com sucesso!", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar foto", { id: toastId });
    }
  }

  function handleCopyFormLink() {
    if (!lead) return;
    const url = `${window.location.origin}/m/lead/${lead.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link do formulário copiado para a área de transferência!");
  }

  function handleShareFormWhatsApp() {
    if (!lead) return;
    const url = `${window.location.origin}/m/lead/${lead.id}`;
    const text = `Olá, ${lead.name}! Para podermos personalizar seu atendimento e planejar sua viagem para ${lead.destination || "seu destino de interesse"}, por favor preencha este formulário rápido: ${url}`;
    const waUrl = `https://wa.me/${lead.phone?.replace(/\D/g, "") || ""}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  }

  return {
    agency,
    lead,
    stage,
    diffDays,
    lastContactDate,
    editing,
    setEditing,
    checklistInput,
    setChecklistInput,
    newTagName,
    setNewTagName,
    newTagColor,
    setNewTagColor,
    uploading,
    proposalSheetOpen,
    setProposalSheetOpen,
    confirmConvertOpen,
    setConfirmConvertOpen,
    clientPayload,
    setClientPayload,
    paxForm,
    setPaxForm,
    paxFormOpen,
    setPaxFormOpen,
    meetingForm,
    setMeetingForm,
    meetingFormOpen,
    setMeetingFormOpen,
    stagesQ,
    leadQ,
    activitiesQ,
    ownerQ,
    usersQ,
    meetingsQ,
    proposalsQ,
    handleClose,
    handleConvert,
    toggleChecklistItem,
    addChecklistItem,
    deleteChecklistItem,
    addTag,
    removeTag,
    handleFileUpload,
    removeAttachment,
    handleLgpdToggle,
    handlePhotoUpload,
    handleCopyFormLink,
    handleShareFormWhatsApp,
    ConfirmDialog,
    confirm,
    qc,
  };
}
