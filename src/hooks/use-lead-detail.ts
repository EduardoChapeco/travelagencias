import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/use-confirm";
import { useAgency } from "@/lib/agency-context";
import {
  fetchStages,
  fetchLeadById,
  fetchLeadActivities,
  fetchLeadOwnerProfile,
  updateLead,
  uploadLeadAttachment,
  fetchAgencyUsers,
  fetchLeadProposals,
  uploadLeadAvatar,
  addLeadActivity,
  transferLead,
  type Stage,
  type Lead,
} from "@/services/crm";

// Sub-hooks especializados
import { useLeadChecklist } from "./use-lead-checklist";
import { useLeadMeetings } from "./use-lead-meetings";
import { useLeadTags } from "./use-lead-tags";
import { useLeadConvert } from "./use-lead-convert";

export function useLeadDetail(lead_id: string, slug: string) {
  const { agency } = useAgency();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { confirm, ConfirmDialog } = useConfirm();

  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [proposalSheetOpen, setProposalSheetOpen] = useState(false);

  const [paxForm, setPaxForm] = useState({
    full_name: "",
    document: "",
    birth_date: "",
    relationship: "other",
    phone: "",
    email: "",
  });
  const [paxFormOpen, setPaxFormOpen] = useState(false);

  // ── Queries de dados ────────────────────────────────────────────────────
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

  const proposalsQ = useQuery({
    enabled: !!leadQ.data?.id,
    queryKey: ["proposals", agency?.id, { leadId: leadQ.data?.id }],
    // Usa a função canônica do serviço — sem acesso direto ao Supabase no hook
    queryFn: () => fetchLeadProposals(lead_id, leadQ.data?.client_id),
  });

  const lead = leadQ.data as Lead | undefined;
  const stage = stagesQ.data?.find((s: Stage) => s.id === lead?.stage_id);

  // ── Cálculos de domínio (estado derivado) ──────────────────────────────
  const lastContactDate = lead?.last_contacted_at
    ? new Date(lead.last_contacted_at)
    : lead
      ? new Date(lead.created_at)
      : new Date();
  const diffDays = Math.ceil(
    Math.abs(new Date().getTime() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // ── Sub-hooks especializados ────────────────────────────────────────────
  const checklist = useLeadChecklist(lead_id, qc);
  const meetings = useLeadMeetings(lead_id, qc, confirm);
  const tags = useLeadTags(lead_id, agency?.id, qc);
  const convert = useLeadConvert(lead, agency?.id, stage?.color, qc, setEditing);

  // ── Handlers de domínio (extraídos da rota lazy) ──────────────────────
  async function handleUpdateStaleness(status: string, label: string) {
    if (!lead) return;
    try {
      await updateLead(lead.id, { staleness_status: status });
      await addLeadActivity({
        leadId: lead.id,
        agencyId: lead.agency_id,
        type: "note",
        content: `Inatividade registrada: "${label}"`,
      });
      qc.invalidateQueries({ queryKey: ["lead", lead.id] });
      qc.invalidateQueries({ queryKey: ["leads", agency?.id] });
      toast.success("Status de inatividade atualizado!");
    } catch {
      toast.error("Falha ao salvar");
    }
  }

  async function handleReactivateLead() {
    if (!lead) return;
    try {
      await updateLead(lead.id, {
        staleness_status: "active",
        last_contacted_at: new Date().toISOString(),
      });
      qc.invalidateQueries({ queryKey: ["lead", lead.id] });
      qc.invalidateQueries({ queryKey: ["leads", agency?.id] });
      toast.success("Lead reativado com sucesso!");
    } catch {
      toast.error("Falha ao reativar");
    }
  }

  async function handleChangeStage(newStageId: string) {
    if (!lead) return;
    if (newStageId === lead.stage_id) return;
    const fromName = stage?.name ?? "—";
    const toName = stagesQ.data?.find((s: Stage) => s.id === newStageId)?.name ?? "—";
    try {
      await updateLead(lead.id, { stage_id: newStageId });
      await addLeadActivity({
        leadId: lead.id,
        agencyId: lead.agency_id,
        type: "stage_change",
        content: `Movido de ${fromName} para ${toName}`,
        metadata: { from: lead.stage_id, to: newStageId },
      });
      qc.invalidateQueries({ queryKey: ["lead", lead_id] });
      qc.invalidateQueries({ queryKey: ["lead-activities", lead_id] });
      qc.invalidateQueries({ queryKey: ["leads", agency?.id] });
      toast.success(`Estágio alterado para ${toName}`);
    } catch (error: unknown) {
      toast.error((error as Error).message);
    }
  }

  async function handleTransferLead(newOwnerId: string | null) {
    if (!lead) return;
    try {
      await transferLead(lead.id, newOwnerId);
      qc.invalidateQueries({ queryKey: ["lead", lead_id] });
      qc.invalidateQueries({ queryKey: ["leads", agency?.id] });
      qc.invalidateQueries({ queryKey: ["lead-activities", lead_id] });
      toast.success("Dono do lead atualizado.");
    } catch {
      toast.error("Falha ao salvar dono");
    }
  }

  async function handleAddPax(paxData: typeof paxForm) {
    if (!lead || !paxData.full_name) return;
    const list = lead.pax_list || [];
    const updated = [...list, { ...paxData }];
    try {
      await updateLead(lead.id, { pax_list: updated });
      setPaxForm({ full_name: "", document: "", birth_date: "", relationship: "other", phone: "", email: "" });
      setPaxFormOpen(false);
      qc.invalidateQueries({ queryKey: ["lead", lead.id] });
      toast.success("Acompanhante cadastrado!");
    } catch {
      toast.error("Falha ao salvar acompanhante");
    }
  }

  async function handleRemovePax(index: number) {
    if (!lead) return;
    confirm({
      title: "Remover Acompanhante",
      description: "Deseja remover este acompanhante?",
      variant: "destructive",
      onConfirm: async () => {
        const list = lead.pax_list || [];
        const updated = list.filter((_, idx) => idx !== index);
        try {
          await updateLead(lead.id, { pax_list: updated });
          qc.invalidateQueries({ queryKey: ["lead", lead.id] });
          toast.success("Acompanhante removido!");
        } catch {
          toast.error("Falha ao salvar");
        }
      },
    });
  }

  // ── Handlers de navegação e UI ──────────────────────────────────────────
  function handleClose() {
    navigate({ to: "/agency/$slug/crm", params: { slug } });
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
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao fazer upload", { id: toastId });
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
        } catch {
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
    } catch {
      toast.error("Erro ao atualizar LGPD");
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!lead) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading("Enviando foto de perfil...");
    try {
      // Usa a função canônica do serviço — sem acesso direto ao Storage no hook
      await uploadLeadAvatar(lead.id, file);
      qc.invalidateQueries({ queryKey: ["lead", lead.id] });
      qc.invalidateQueries({ queryKey: ["leads", agency?.id] });
      toast.success("Foto atualizada com sucesso!", { id: toastId });
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao enviar foto", { id: toastId });
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
    // Dados estruturais
    agency,
    lead,
    stage,
    diffDays,
    lastContactDate,
    editing,
    setEditing,
    uploading,
    proposalSheetOpen,
    setProposalSheetOpen,
    paxForm,
    setPaxForm,
    paxFormOpen,
    setPaxFormOpen,
    // Queries
    stagesQ,
    leadQ,
    activitiesQ,
    ownerQ,
    usersQ,
    proposalsQ,
    // Dialogs e utilitários
    handleClose,
    ConfirmDialog,
    confirm,
    qc,
    // Sub-hooks: Checklist
    checklistInput: checklist.checklistInput,
    setChecklistInput: checklist.setChecklistInput,
    toggleChecklistItem: (itemId: string, done: boolean) =>
      checklist.toggleChecklistItem(lead?.checklist, itemId, done),
    addChecklistItem: (e: React.FormEvent) =>
      checklist.addChecklistItem(lead?.checklist, e),
    deleteChecklistItem: (itemId: string) =>
      checklist.deleteChecklistItem(lead?.checklist, itemId),
    // Sub-hooks: Meetings
    meetingForm: meetings.meetingForm,
    setMeetingForm: meetings.setMeetingForm,
    meetingFormOpen: meetings.meetingFormOpen,
    setMeetingFormOpen: meetings.setMeetingFormOpen,
    meetingsQ: meetings.meetingsQ,
    createMeeting: meetings.createMeeting,
    deleteMeeting: meetings.deleteMeeting,
    syncMeetingToGoogle: meetings.syncMeetingToGoogle,
    // Sub-hooks: Tags
    newTagName: tags.newTagName,
    setNewTagName: tags.setNewTagName,
    newTagColor: tags.newTagColor,
    setNewTagColor: tags.setNewTagColor,
    addTag: () => tags.addTag(lead?.tags),
    removeTag: (tag: string) => tags.removeTag(lead?.tags, tag),
    // Sub-hooks: Convert
    confirmConvertOpen: convert.confirmConvertOpen,
    setConfirmConvertOpen: convert.setConfirmConvertOpen,
    clientPayload: convert.clientPayload,
    setClientPayload: convert.setClientPayload,
    handleConvert: convert.handleConvert,
    // Handlers de mídia e compartilhamento
    handleFileUpload,
    removeAttachment,
    handleLgpdToggle,
    handlePhotoUpload,
    handleCopyFormLink,
    handleShareFormWhatsApp,
    // Handlers de domínio (ex-inline da rota lazy)
    handleUpdateStaleness,
    handleReactivateLead,
    handleChangeStage,
    handleTransferLead,
    handleAddPax,
    handleRemovePax,
  };
}
