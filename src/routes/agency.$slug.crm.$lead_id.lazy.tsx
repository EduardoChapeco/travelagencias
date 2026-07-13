import { createLazyFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { LeadInterestCard } from "@/components/crm/lead-details/LeadInterestCard";
import { LeadAccessibilityCard } from "@/components/crm/lead-details/LeadAccessibilityCard";
import { LeadForm } from "@/components/crm/lead-details/LeadForm";
import { NewActivity, Timeline } from "@/components/crm/lead-details/LeadTimeline";
import { OmnichannelChat } from "@/components/crm/lead-details/OmnichannelChat";
import { AIHunterPanel } from "@/components/crm/lead-details/AIHunterPanel";
import {
  X, MessageSquare, UserCheck, Plus, Paperclip, Check, ShieldAlert, Camera, Trash, Send, FileText, FileDown, AlertCircle, Sparkles, Pencil, } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { useLeadDetail } from "@/hooks/use-lead-detail";
import { type Lead, type LeadMeeting } from "@/services/crm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field } from "@/components/ui/field";
import { FormInput as Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormTextarea as Textarea } from "@/components/ui/textarea";
import { PrimaryButton, GhostButton , Button } from "@/components/ui/button";
import { fmtDate, money } from "@/lib/formatters";
import { SheetPage } from "@/components/ui/sheet";
import { NewProposalSheet } from "@/components/proposals/NewProposalSheet";

export const Route = createLazyFileRoute("/agency/$slug/crm/$lead_id")({
  component: LeadDetailPage,
});

const TAG_COLOR_PRESETS = [
  { name: "Vermelho", value: "#ef4444" },
  { name: "Laranja", value: "#f97316" },
  { name: "Amarelo", value: "#eab308" },
  { name: "Verde", value: "#22c55e" },
  { name: "Azul", value: "#3b82f6" },
  { name: "Roxo", value: "#a855f7" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Cinza", value: "#6b7280" },
];

function LeadDetailPage() {
  const { slug, lead_id } = useParams({ from: "/agency/$slug/crm/$lead_id" });
  const navigate = useNavigate();
  const {
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
    // Handlers de domínio (extraídos do inline da rota)
    handleUpdateStaleness,
    handleReactivateLead,
    handleChangeStage,
    handleTransferLead,
    handleAddPax,
    handleRemovePax,
    // Meetings via sub-hook
    createMeeting,
    deleteMeeting,
    syncMeetingToGoogle,
    ConfirmDialog,
    confirm,
    qc,
  } = useLeadDetail(lead_id, slug);

  if (leadQ.isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
        <div className="p-6 text-sm text-muted-foreground">Carregando lead…</div>
      </div>
    );
  }

  if (leadQ.isError || !lead) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3 p-8 rounded-[var(--radius-card)] border border-red-200 bg-red-50 text-center max-w-sm">
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <h3 className="font-bold text-red-800">Falha ao Carregar Lead</h3>
          <p className="text-xs text-red-600">
            {leadQ.isError && leadQ.error instanceof Error ? leadQ.error.message : "Lead não encontrado ou acesso negado."}
          </p>
          <Button
            onClick={() => navigate({ to: "/agency/$slug/crm", params: { slug } })}
            className="mt-1 h-8 px-4 rounded-[var(--radius-card)] bg-red-100 text-xs font-semibold text-red-800 hover:bg-red-200 cursor-pointer transition-colors"
          >
            Voltar ao CRM
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SheetPage
      isOpen={true}
      onClose={handleClose}
      title={lead.name}
      width="clamp(720px, 60vw, 1024px)"
    >
      <div className="space-y-6">
        <ConfirmDialog />
          {/* Header Actions Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 glass bg-white/5 border-white/10/40 border-none/60 p-4 rounded-[var(--radius-card)]">
            <div className="flex items-center gap-3">
              {lead.avatar_url ? (
                <div className="relative group h-12 w-12 rounded-full overflow-hidden border-none">
                  <img src={lead.avatar_url} className="h-full w-full object-cover" />
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                    <Camera className="h-4 w-4 text-white" />
                    <Input
                      type="file"
                      onChange={handlePhotoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <label className="h-12 w-12 rounded-full border border-dashed border-border hover:border-brand/60 flex items-center justify-center cursor-pointer group glass-card border-none">
                  <Camera className="h-5 w-5 text-muted-foreground group-hover:text-brand" />
                  <Input
                    type="file"
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </label>
              )}
              <div>
                <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                  {lead.name}
                  {lead.lgpd_accepted && (
                    <span className="ds-meta font-bold text-success bg-success/10 border border-success/30 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <ShieldAlert className="h-3 w-3 inline" /> LGPD OK
                    </span>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Estágio atual:{" "}
                  <span className="font-bold text-foreground" style={{ color: stage?.color }}>
                    {stage?.name}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {lead.phone && (
                <a
                  href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 px-3 text-xs font-bold text-emerald-500 transition-colors"
                  title="WhatsApp Rápido"
                >
                  <Send className="h-3.5 w-3.5" /> WhatsApp
                </a>
              )}
              {lead.phone && (
                <Button
                  onClick={handleShareFormWhatsApp}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-emerald-600/30 bg-emerald-600/5 hover:bg-emerald-600/10 px-3 text-xs font-bold text-emerald-600 transition-colors"
                  title="Enviar Formulário via WhatsApp"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Enviar Form WA
                </Button>
              )}
              <Button
                onClick={handleCopyFormLink}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-brand/30 bg-brand/5 hover:bg-brand/10 px-3 text-xs font-bold text-brand transition-colors"
                title="Copiar Link do Formulário"
              >
                <FileText className="h-3.5 w-3.5" /> Link Form
              </Button>

              <PrimaryButton
                onClick={() =>
                  navigate({
                    to: "/agency/$slug/proposals/new",
                    params: { slug },
                    search: { lead_id: lead.id, client_id: lead.client_id || undefined },
                  })
                }
                className="gap-1.5 text-xs font-bold h-9 bg-brand hover:bg-brand/90 text-brand-foreground"
              >
                <Sparkles className="h-4 w-4" /> Nova Cotação
              </PrimaryButton>
              {!lead.client_id ? (
                <PrimaryButton
                  onClick={() => setConfirmConvertOpen(true)}
                  className="gap-1.5 text-xs font-bold h-9"
                >
                  <UserCheck className="h-4 w-4" /> Converter em Cliente
                </PrimaryButton>
              ) : (
                <span className="text-xs font-bold bg-success/10 border border-success/30 text-success rounded-full px-4 py-1.5 flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Convertido
                </span>
              )}
              <GhostButton
                onClick={() => setEditing((e) => !e)}
                className="h-9 w-9 p-0 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title={editing ? "Fechar edição" : "Editar"}
              >
                {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              </GhostButton>
            </div>
          </div>

          {editing ? (
            <LeadForm
              lead={lead}
              stages={stagesQ.data ?? []}
              onCancel={() => setEditing(false)}
              onSaved={() => {
                setEditing(false);
                qc.invalidateQueries({ queryKey: ["lead", lead_id] });
                qc.invalidateQueries({ queryKey: ["leads", agency?.id] });
              }}
            />
          ) : (
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0 overflow-x-auto no-scrollbar flex-nowrap flex shrink-0 mb-6">
                <TabsTrigger
                  value="general"
                  className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 text-xs font-bold text-muted-foreground shadow-none data-[state=active]:border-brand data-[state=active]:text-foreground data-[state=active]:shadow-none bg-transparent hover:text-brand transition-colors shrink-0 cursor-pointer"
                >
                  Geral
                </TabsTrigger>
                <TabsTrigger
                  value="pax"
                  className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 text-xs font-bold text-muted-foreground shadow-none data-[state=active]:border-brand data-[state=active]:text-foreground data-[state=active]:shadow-none bg-transparent hover:text-brand transition-colors shrink-0 cursor-pointer"
                >
                  Acompanhantes
                </TabsTrigger>
                <TabsTrigger
                  value="meetings"
                  className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 text-xs font-bold text-muted-foreground shadow-none data-[state=active]:border-brand data-[state=active]:text-foreground data-[state=active]:shadow-none bg-transparent hover:text-brand transition-colors shrink-0 cursor-pointer"
                >
                  Agenda & Lembretes
                </TabsTrigger>
                <TabsTrigger
                  value="proposals"
                  className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 text-xs font-bold text-muted-foreground shadow-none data-[state=active]:border-brand data-[state=active]:text-foreground data-[state=active]:shadow-none bg-transparent hover:text-brand transition-colors shrink-0 cursor-pointer"
                >
                  Cotações
                </TabsTrigger>
                <TabsTrigger
                  value="omnichannel"
                  className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 text-xs font-bold text-muted-foreground shadow-none data-[state=active]:border-brand data-[state=active]:text-foreground data-[state=active]:shadow-none flex items-center gap-1 bg-transparent hover:text-brand transition-colors shrink-0 cursor-pointer"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Mensagens
                </TabsTrigger>
                <TabsTrigger
                  value="ai_insights"
                  className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 text-xs font-bold text-muted-foreground shadow-none data-[state=active]:border-brand data-[state=active]:text-foreground data-[state=active]:shadow-none flex items-center gap-1 text-brand bg-transparent hover:text-brand transition-colors shrink-0 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" /> IA Hunter
                </TabsTrigger>
                <TabsTrigger
                  value="timeline"
                  className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 text-xs font-bold text-muted-foreground shadow-none data-[state=active]:border-brand data-[state=active]:text-foreground data-[state=active]:shadow-none bg-transparent hover:text-brand transition-colors shrink-0 cursor-pointer"
                >
                  Histórico
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-6">
                {/* Staleness Quiz if stale */}
                {diffDays >= 5 && lead.staleness_status === "active" && (
                  <div className="bg-warning/5 border border-warning/15 p-4 rounded-[var(--radius-card)] space-y-2.5">
                    <div className="flex items-center gap-2 text-warning text-xs font-bold">
                      <AlertCircle className="h-4 w-4" />
                      <span>O lead está sem contato há {diffDays} dias! O que aconteceu?</span>
                    </div>
                    <p className="ds-meta text-muted-foreground">
                      Evite a perda da oportunidade respondendo a este quiz rápido.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {[
                        { label: "Sumiu / Não responde", v: "disappeared" },
                        { label: "Desistiu", v: "gave_up" },
                        { label: "Sem Crédito / Orçamento", v: "no_credit" },
                        { label: "Viagem Adiada", v: "postponed" },
                      ].map((opt) => (
                        <Button
                          key={opt.v}
                          type="button"
                          onClick={() => handleUpdateStaleness(opt.v, opt.label)}
                          className="ds-meta font-bold bg-background border-none px-3 py-1.5 rounded-[var(--radius-card)] hover:border-brand/40 transition-colors cursor-pointer"
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stale status notification with reactivation option */}
                {lead.staleness_status && lead.staleness_status !== "active" && (
                  <div className="bg-muted/50 border-none p-4 rounded-[var(--radius-card)] flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        Lead Classificado como Inativo
                      </span>
                      <span className="ds-meta text-muted-foreground mt-0.5 block">
                        Motivo:{" "}
                        {lead.staleness_status === "disappeared"
                          ? "Sumiu / Não responde"
                          : lead.staleness_status === "gave_up"
                            ? "Desistiu / Comprou em outra agência"
                            : lead.staleness_status === "no_credit"
                              ? "Sem orçamento / crédito"
                              : "Viagem adiada"}
                        .
                      </span>
                    </div>
                    <GhostButton
                      onClick={() => handleReactivateLead()}
                      className="text-xs font-bold h-8 px-3 rounded-[var(--radius-card)]"
                    >
                      Re-ativar Lead
                    </GhostButton>
                  </div>
                )}

                {/* Grid info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LeadInterestCard lead={lead} />
                  <LeadAccessibilityCard lead={lead} />
                </div>

                {/* Consentimento LGPD */}
                <div className="rounded-[var(--radius-card)] border-none glass-card border-none p-5 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                      Consentimento LGPD
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      O lead aceitou os termos de privacidade e coleta de dados da agência.
                      {lead.lgpd_accepted_at && (
                        <span className="block mt-0.5 text-success font-semibold">
                          Aceito em: {new Date(lead.lgpd_accepted_at).toLocaleString("pt-BR")}
                        </span>
                      )}
                    </p>
                  </div>
                  <Input
                    type="checkbox"
                    checked={lead.lgpd_accepted || false}
                    onChange={(e) => handleLgpdToggle(e.target.checked)}
                    className="h-5 w-5 rounded bg-white/5 text-brand focus:ring-brand cursor-pointer"
                  />
                </div>

                {/* Stage and Owner Dropdowns Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 glass-card border-none p-5 rounded-[var(--radius-card)] border-none">
                  <div>
                    <label className="block ds-label-caps text-muted-foreground mb-1.5">
                      Estágio do Funil
                    </label>
                    <Select
                      value={lead.stage_id}
                      onValueChange={(newStage) => handleChangeStage(newStage)}
                    >
                      <SelectTrigger className="w-full bg-white/5 rounded-full border-none">
                        <SelectValue placeholder="Selecione o estágio..." />
                      </SelectTrigger>
                      <SelectContent>
                        {stagesQ.data?.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block ds-label-caps text-muted-foreground mb-1.5">
                      Responsável / Dono
                    </label>
                    <Select
                      value={lead.owner_id || "unassigned"}
                      onValueChange={(val) => handleTransferLead(val === "unassigned" ? null : val)}
                    >
                      <SelectTrigger className="w-full bg-white/5 rounded-full border-none">
                        <SelectValue placeholder="Não atribuído" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Não atribuído</SelectItem>
                        {usersQ.data?.map((u: any) => (
                          <SelectItem key={u.user_id} value={u.user_id}>
                            {u.user_name} ({u.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tag pill list and creator */}
                <div className="rounded-[var(--radius-card)] border-none glass-card border-none p-5 space-y-4">
                  <h4 className="ds-label-caps text-muted-foreground border-b border-border/40 pb-2">
                    Tags do Lead
                  </h4>

                  {/* Tag list */}
                  {!lead.tags || lead.tags.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhuma tag cadastrada.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {lead.tags.map((tag) => {
                        const [name, color] = tag.split(":");
                        return (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold text-white"
                            style={{ backgroundColor: color || "#3b82f6" }}
                          >
                            {name}
                            <Button
                              onClick={() => removeTag(tag)}
                              className="hover:bg-black/20 rounded p-0.5 shrink-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Add Tag */}
                  <div className="space-y-2.5 pt-2">
                    <Input
                      placeholder="Nome da tag..."
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className="rounded-[var(--radius-card)]"
                    />

                    <div className="flex flex-wrap gap-1.5">
                      {TAG_COLOR_PRESETS.map((color) => (
                        <Button
                          key={color.value}
                          type="button"
                          onClick={() => setNewTagColor(color.value)}
                          className={`h-5 w-5 rounded-full border border-black/10 transition-transform ${
                            newTagColor === color.value
                              ? "scale-125 ring-2 ring-brand"
                              : "hover:scale-110"
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>

                    <GhostButton
                      onClick={addTag}
                      disabled={!newTagName.trim()}
                      className="w-full h-8 rounded-[var(--radius-card)] text-xs font-bold"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1 inline" /> Criar Tag
                    </GhostButton>
                  </div>
                </div>

                {/* General notes */}
                {lead.notes && (
                  <div className="rounded-[var(--radius-card)] border-none glass-card border-none p-5">
                    <h4 className="ds-label-caps text-muted-foreground border-b border-border/40 pb-2 mb-3">
                      Anotações de Cadastro
                    </h4>
                    <p className="whitespace-pre-wrap text-xs text-foreground/80 leading-relaxed font-medium">
                      {lead.notes}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="pax" className="space-y-6">
                {/* Magic Client Link */}
                <div className="bg-brand/[0.03] border border-brand/15 p-5 rounded-[var(--radius-card)] space-y-2.5">
                  <div className="flex items-center gap-2 text-brand text-xs font-bold">
                    <Sparkles className="h-4 w-4" />
                    <span>Link Mágico de Cadastro do Cliente</span>
                  </div>
                  <p className="ds-meta text-muted-foreground leading-relaxed">
                    Envie este link para que o cliente revise as preferências de viagem, preencha
                    documentos e cadastre todos os acompanhantes da família ou grupo de forma
                    autônoma.
                  </p>
                  <div className="flex gap-2">
                    <GhostButton
                      onClick={handleCopyFormLink}
                      className="h-8 px-3 rounded-[var(--radius-card)] text-xs font-bold border-brand/20 bg-brand/5 hover:bg-brand/10"
                    >
                      <FileText className="h-3.5 w-3.5 mr-1" /> Copiar Link Form
                    </GhostButton>
                    {lead.phone && (
                      <Button
                        onClick={handleShareFormWhatsApp}
                        className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-card)] border border-emerald-600/30 bg-emerald-600/5 hover:bg-emerald-600/10 px-3 text-xs font-bold text-emerald-600 transition-colors"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> Enviar Form no WhatsApp
                      </Button>
                    )}
                  </div>
                </div>

                {/* Travelers List */}
                <div className="rounded-[var(--radius-card)] border-none glass-card border-none p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <h4 className="ds-label-caps text-muted-foreground">
                      Viajantes Vinculados / Acompanhantes
                    </h4>
                    <span className="text-xs font-extrabold text-brand bg-brand/5 border border-brand/10 px-2 py-0.5 rounded">
                      {lead.pax_list?.length || 0} Passageiros
                    </span>
                  </div>

                  {!lead.pax_list || lead.pax_list.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-6 text-center">
                      Nenhum acompanhante cadastrado.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {lead.pax_list.map((pax, index) => (
                        <div
                          key={index}
                          className="border-none/60 p-4 rounded-[var(--radius-card)] glass bg-white/5 border-white/10/15 relative hover:border-border transition-colors"
                        >
                          <Button
                            onClick={() => {
                              confirm({
                                title: "Remover Acompanhante",
                                description: "Deseja remover este acompanhante?",
                                variant: "destructive",
                                onConfirm: async () => {
                                  await handleRemovePax(index);
                                },
                              });
                            }}
                            className="absolute right-3 top-3 text-muted-foreground hover:text-danger p-1 cursor-pointer"
                            title="Remover"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                          <span className="text-xs font-bold text-foreground block truncate pr-8">
                            {pax.full_name}
                          </span>
                          <span className="text-[9px] text-brand uppercase font-extrabold bg-brand/5 border border-brand/10 px-1.5 py-0.5 rounded inline-block mt-1">
                            {pax.relationship === "spouse"
                              ? "Cônjuge"
                              : pax.relationship === "child"
                                ? "Filho(a)"
                                : pax.relationship === "parent"
                                  ? "Pai/Mãe"
                                  : pax.relationship === "sibling"
                                    ? "Irmão/Irmã"
                                    : pax.relationship === "friend"
                                      ? "Amigo(a)"
                                      : pax.relationship === "relative"
                                        ? "Familiar"
                                        : "Outro"}
                          </span>
                          <div className="ds-meta text-muted-foreground space-y-0.5 mt-2.5 font-mono pt-2 border-t border-border/40">
                            {pax.document && <div>CPF: {pax.document}</div>}
                            {pax.birth_date && (
                              <div>
                                Nasc: {new Date(pax.birth_date).toLocaleDateString("pt-BR")}
                              </div>
                            )}
                            {pax.phone && <div>WhatsApp: {pax.phone}</div>}
                            {pax.email && <div className="truncate">Email: {pax.email}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Traveler form */}
                <div className="rounded-[var(--radius-card)] border-none glass-card border-none p-5 space-y-4">
                  <Button
                    onClick={() => setPaxFormOpen((o) => !o)}
                    className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />{" "}
                    {paxFormOpen ? "Fechar Formulário" : "Adicionar Acompanhante Manualmente"}
                  </Button>

                  {paxFormOpen && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        await handleAddPax(paxForm);
                      }}
                      className="border-none p-4 rounded-[var(--radius-card)] glass bg-white/5 border-white/10/10 space-y-3"
                    >
                      <Field label="Nome Completo *">
                        <Input
                          required
                          value={paxForm.full_name}
                          onChange={(e) => setPaxForm({ ...paxForm, full_name: e.target.value })}
                          
                        />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="CPF / Documento">
                          <Input
                            value={paxForm.document}
                            onChange={(e) => setPaxForm({ ...paxForm, document: e.target.value })}
                            
                          />
                        </Field>
                        <Field label="Data de Nascimento">
                          <Input
                            type="date"
                            value={paxForm.birth_date}
                            onChange={(e) => setPaxForm({ ...paxForm, birth_date: e.target.value })}
                            
                          />
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="E-mail">
                          <Input
                            type="email"
                            value={paxForm.email}
                            onChange={(e) => setPaxForm({ ...paxForm, email: e.target.value })}
                            
                          />
                        </Field>
                        <Field label="WhatsApp / Telefone">
                          <Input
                            value={paxForm.phone}
                            onChange={(e) => setPaxForm({ ...paxForm, phone: e.target.value })}
                            
                          />
                        </Field>
                      </div>
                      <Field label="Relação / Parentesco">
                        <Select
                          value={paxForm.relationship}
                          onValueChange={(val) => setPaxForm({ ...paxForm, relationship: val })}
                        >
                          <SelectTrigger className="w-full bg-white/5 rounded-full border-none">
                            <SelectValue placeholder="Selecione o parentesco..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="spouse">Cônjuge</SelectItem>
                            <SelectItem value="child">Filho(a)</SelectItem>
                            <SelectItem value="parent">Pai/Mãe</SelectItem>
                            <SelectItem value="sibling">Irmão/Irmã</SelectItem>
                            <SelectItem value="friend">Amigo(a)</SelectItem>
                            <SelectItem value="relative">Familiar / Outro Relacionamento</SelectItem>
                            <SelectItem value="other">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <PrimaryButton type="submit" className="w-full text-xs h-9">
                        Adicionar Acompanhante
                      </PrimaryButton>
                    </form>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="meetings" className="space-y-6">
                {/* Meeting Scheduler and Follow-ups */}
                <div className="rounded-[var(--radius-card)] border-none glass-card border-none p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <h4 className="ds-label-caps text-muted-foreground">
                      Compromissos & Reuniões Agendadas
                    </h4>
                    <Button
                      onClick={() => setMeetingFormOpen((o) => !o)}
                      className="text-brand text-xs font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Agendar Reunião
                    </Button>
                  </div>

                  {meetingFormOpen && (
                    <form
                      onSubmit={(e) => createMeeting(e)}
                      className="border-none p-4 rounded-[var(--radius-card)] glass bg-white/5 border-white/10/10 space-y-3"
                    >
                      <Field label="Título do Compromisso *">
                        <Input
                          required
                          placeholder="Ex: Apresentação da Cotação"
                          value={meetingForm.title}
                          onChange={(e) =>
                            setMeetingForm({ ...meetingForm, title: e.target.value })
                          }
                          
                        />
                      </Field>
                      <Field label="Descrição / Notas">
                        <Input
                          placeholder="Detalhes opcionais..."
                          value={meetingForm.description}
                          onChange={(e) =>
                            setMeetingForm({ ...meetingForm, description: e.target.value })
                          }
                          
                        />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Data & Horário *">
                          <Input
                            type="datetime-local"
                            required
                            value={meetingForm.scheduled_at}
                            onChange={(e) =>
                              setMeetingForm({ ...meetingForm, scheduled_at: e.target.value })
                            }
                            
                          />
                        </Field>
                        <Field label="Duração (minutos)">
                          <Input
                            type="number"
                            min={5}
                            value={meetingForm.duration_minutes}
                            onChange={(e) =>
                              setMeetingForm({
                                ...meetingForm,
                                duration_minutes: parseInt(e.target.value) || 30,
                              })
                            }
                            
                          />
                        </Field>
                      </div>
                      <Field label="Tipo de Evento">
                        <Select
                          value={meetingForm.meeting_type}
                          onValueChange={(val) =>
                            setMeetingForm({ ...meetingForm, meeting_type: val })
                          }
                        >
                          <SelectTrigger className="w-full bg-white/5 rounded-full border-none">
                            <SelectValue placeholder="Selecione o tipo..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="call">Chamada de Voz / Telefone</SelectItem>
                            <SelectItem value="video">Vídeochamada (Google Meet / Zoom)</SelectItem>
                            <SelectItem value="in_person">Reunião Presencial</SelectItem>
                            <SelectItem value="whatsapp">Follow-up via WhatsApp</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <PrimaryButton type="submit" className="w-full text-xs h-9">
                        Agendar Evento
                      </PrimaryButton>
                    </form>
                  )}

                  {meetingsQ.isLoading ? (
                    <div className="h-10 flex items-center justify-center">
                      <div className="h-4 w-4 animate-spin rounded-full border border-brand border-t-transparent" />
                    </div>
                  ) : !meetingsQ.data || meetingsQ.data.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center font-medium">
                      Nenhum compromisso agendado.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {meetingsQ.data.map((meeting: LeadMeeting) => (
                        <div
                          key={meeting.id}
                          className="glass bg-white/5 border-white/10/20 border-none/60 rounded-[var(--radius-card)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="space-y-1 min-w-0">
                            <span className="text-xs font-bold text-foreground block truncate">
                              {meeting.title}
                            </span>
                            {meeting.description && (
                              <span className="ds-meta text-muted-foreground block truncate">
                                {meeting.description}
                              </span>
                            )}
                            <span className="ds-meta text-brand font-semibold block">
                              {new Date(meeting.scheduled_at).toLocaleString("pt-BR", {
                                day: "2-digit",
                                month: "long",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              ({meeting.duration_minutes} min)
                            </span>
                          </div>

                          <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                            <Button
                              type="button"
                              onClick={async () => {
                                const url = `${window.location.origin}/m/lead/${lead.id}`;
                                const inviteText = `Olá ${lead.name}, agendamos nosso compromisso "${meeting.title}" para ${new Date(meeting.scheduled_at).toLocaleString("pt-BR")}. Segue o link de nosso formulário caso queira atualizar seus dados: ${url}`;
                                navigator.clipboard.writeText(inviteText);
                                toast.success("Convite copiado!");
                              }}
                              className="ds-meta font-extrabold uppercase bg-brand/5 border border-brand/10 hover:bg-brand/10 text-brand px-2.5 py-1.5 rounded-[var(--radius-card)] transition-colors cursor-pointer"
                              title="Copiar texto de convite para enviar por email ou whats"
                            >
                              Copiar Convite
                            </Button>

                            <Button
                              type="button"
                              onClick={async () => {
                                const toastId = toast.loading("Sincronizando com Google Agenda...");
                                try {
                                  await syncMeetingToGoogle(meeting.id);
                                  qc.invalidateQueries({ queryKey: ["lead-meetings", lead.id] });
                                  toast.success("Sincronizado com sucesso!", { id: toastId });
                                } catch (err: unknown) {
                                  toast.error((err as Error).message || "Erro na sincronização", { id: toastId });
                                }
                              }}
                              className={`ds-meta font-extrabold uppercase px-2.5 py-1.5 rounded-[var(--radius-card)] transition-colors cursor-pointer ${
                                meeting.google_event_id
                                  ? "bg-success/10 text-success border border-success/20 cursor-default"
                                  : "glass-card border-none border-none/80 hover:border-brand/40 text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {meeting.google_event_id ? "✓ Sincronizado" : "Google Agenda"}
                            </Button>

                            <Button
                              type="button"
                              onClick={() => {
                                confirm({
                                  title: "Remover Compromisso",
                                  description: "Deseja remover este compromisso?",
                                  variant: "destructive",
                                  onConfirm: async () => {
                                    await deleteMeeting(meeting.id);
                                  },
                                });
                              }}
                              className="p-1.5 bg-danger/5 hover:bg-danger/10 border border-danger/20 text-danger rounded-[var(--radius-card)] transition-colors cursor-pointer"
                              title="Deletar"
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="proposals" className="space-y-6">
                {/* Proposals Integration */}
                <div className="rounded-[var(--radius-card)] border-none glass-card border-none p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <h4 className="ds-label-caps text-muted-foreground">
                      Propostas de Venda
                    </h4>
                    <Button
                      onClick={() => setProposalSheetOpen(true)}
                      className="text-brand text-xs font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Nova Cotação
                    </Button>
                  </div>

                  {proposalsQ.isLoading ? (
                    <div className="h-10 flex items-center justify-center">
                      <div className="h-4 w-4 animate-spin rounded-full border border-brand border-t-transparent" />
                    </div>
                  ) : !proposalsQ.data || proposalsQ.data.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 text-center font-medium">
                      Nenhuma proposta criada para este lead.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {proposalsQ.data.map((prop) => (
                        <li
                          key={prop.id}
                          className="glass bg-white/5 border-white/10/30 border-none/50 rounded-[var(--radius-card)] p-2.5 flex flex-col gap-1 text-xs"
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-foreground truncate">{prop.title}</span>
                            <span className="font-mono text-brand font-extrabold">
                              {money(prop.total ?? 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between ds-meta text-muted-foreground">
                            <span>
                              #{prop.number} · {fmtDate(prop.created_at)}
                            </span>
                            <span className="uppercase text-[9px] font-bold px-1.5 py-0.5 glass-card border-none rounded border-none">
                              {prop.status}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Attachments Section */}
                <div className="rounded-[var(--radius-card)] border-none glass-card border-none p-5 space-y-4">
                  <h4 className="ds-label-caps text-muted-foreground border-b border-border/40 pb-2 flex items-center gap-1.5">
                    <Paperclip className="h-4 w-4 text-brand" /> Documentos e Anexos
                  </h4>

                  <label className="border border-dashed border-border hover:border-brand/40 glass bg-white/5 border-white/10/10 hover:glass bg-white/5 border-white/10/20 rounded-[var(--radius-card)] p-4 flex flex-col items-center justify-center cursor-pointer transition-all">
                    <Paperclip className="h-5 w-5 text-muted-foreground mb-1.5" />
                    <span className="text-xs font-bold text-foreground">
                      {uploading ? "Enviando arquivo..." : "Clique para anexar um arquivo"}
                    </span>
                    <span className="ds-meta text-muted-foreground mt-0.5">
                      PDF, Imagens, Documentos de viagem
                    </span>
                    <Input
                      type="file"
                      disabled={uploading}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {!lead.attachments || lead.attachments.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 text-center">
                      Nenhum arquivo anexado.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border/40">
                      {lead.attachments.map((file) => (
                        <li
                          key={file.id}
                          className="py-2.5 flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 shrink-0 text-brand" />
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-foreground hover:text-brand transition-colors truncate"
                            >
                              {file.name}
                            </a>
                            <span className="ds-meta text-muted-foreground shrink-0 font-mono">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <a
                              href={file.url}
                              download={file.name}
                              target="_blank"
                              className="p-1.5 hover:glass bg-white/5 border-white/10 rounded text-muted-foreground hover:text-foreground transition-colors"
                              title="Baixar Arquivo"
                            >
                              <FileDown className="h-4 w-4" />
                            </a>
                            <Button
                              onClick={() => removeAttachment(file.id)}
                              className="p-1.5 hover:bg-danger/10 rounded text-muted-foreground hover:text-danger transition-colors cursor-pointer"
                              title="Remover"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="space-y-6">
                {/* Timeline and History activities */}
                <div className="space-y-6">
                  <h4 className="ds-label-caps text-muted-foreground border-b border-border/40 pb-2">
                    Histórico & Atividades Conversacionais
                  </h4>
                  <NewActivity
                    leadId={lead.id}
                    agencyId={lead.agency_id}
                    onCreated={() =>
                      qc.invalidateQueries({ queryKey: ["lead-activities", lead_id] })
                    }
                  />
                  <Timeline
                    activities={activitiesQ.data ?? []}
                    onChanged={() =>
                      qc.invalidateQueries({ queryKey: ["lead-activities", lead_id] })
                    }
                  />
                </div>
              </TabsContent>

              {/* Omnichannel Chat Tab - Live */}
              <TabsContent value="omnichannel" className="space-y-0">
                <OmnichannelChat
                  leadId={lead.id}
                  agencyId={lead.agency_id}
                  leadPhone={lead.phone}
                />
              </TabsContent>

              {/* AI Hunter Insights Tab - Live */}
              <TabsContent value="ai_insights" className="space-y-6">
                <AIHunterPanel leadId={lead.id} agencyId={lead.agency_id} />
              </TabsContent>
            </Tabs>
          )}

          {/* Confirm Conversao Sheet */}
          <SheetPage
            isOpen={confirmConvertOpen}
            onClose={() => setConfirmConvertOpen(false)}
            title="Confirmar Conversão de Cliente"
            width="500px"
          >
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Preencha os documentos oficiais do cliente. Acompanhantes cadastrados na aba serão
                vinculados automaticamente no banco de dados.
              </p>

              <div className="space-y-3">
                <Field label="Nome Completo *">
                  <Input
                    required
                    value={clientPayload.full_name}
                    onChange={(e) =>
                      setClientPayload({ ...clientPayload, full_name: e.target.value })
                    }
                    
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="CPF / Documento *">
                    <Input
                      required
                      placeholder="Apenas números"
                      value={clientPayload.document}
                      onChange={(e) =>
                        setClientPayload({ ...clientPayload, document: e.target.value })
                      }
                      
                    />
                  </Field>
                  <Field label="Data de Nascimento">
                    <Input
                      type="date"
                      value={clientPayload.birth_date}
                      onChange={(e) =>
                        setClientPayload({ ...clientPayload, birth_date: e.target.value })
                      }
                      
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="E-mail">
                    <Input
                      type="email"
                      value={clientPayload.email}
                      onChange={(e) =>
                        setClientPayload({ ...clientPayload, email: e.target.value })
                      }
                      
                    />
                  </Field>
                  <Field label="WhatsApp / Telefone">
                    <Input
                      value={clientPayload.phone}
                      onChange={(e) =>
                        setClientPayload({ ...clientPayload, phone: e.target.value })
                      }
                      
                    />
                  </Field>
                </div>

                {/* Acessibilidade */}
                <div className="border-none p-4 rounded-[var(--radius-card)] space-y-3 glass bg-white/5 border-white/10/10">
                  <span className="text-xs font-bold text-foreground block">
                    Acessibilidade & Cuidados Especiais
                  </span>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Input
                        type="checkbox"
                        checked={clientPayload.pcd}
                        onChange={(e) =>
                          setClientPayload({ ...clientPayload, pcd: e.target.checked })
                        }
                        className="h-4 w-4 rounded cursor-pointer"
                      />
                      <span>PCD</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Input
                        type="checkbox"
                        checked={clientPayload.reduced_mobility}
                        onChange={(e) =>
                          setClientPayload({
                            ...clientPayload,
                            reduced_mobility: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded cursor-pointer"
                      />
                      <span>Mobilidade Reduzida</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Input
                        type="checkbox"
                        checked={clientPayload.autism}
                        onChange={(e) =>
                          setClientPayload({ ...clientPayload, autism: e.target.checked })
                        }
                        className="h-4 w-4 rounded cursor-pointer"
                      />
                      <span>Espectro Autista (TEA)</span>
                    </label>
                  </div>
                  <Field label="Comorbidades / Restrições Médicas ou Alimentares">
                    <Textarea
                      rows={2}
                      placeholder="Ex: diabético, intolerância a glúten..."
                      value={clientPayload.health_notes}
                      onChange={(e) =>
                        setClientPayload({ ...clientPayload, health_notes: e.target.value })
                      }
                      
                    />
                  </Field>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-border mt-4">
                <GhostButton onClick={() => setConfirmConvertOpen(false)} className="h-9 text-xs">
                  Cancelar
                </GhostButton>
                <PrimaryButton
                  onClick={async () => {
                    const missing: string[] = [];
                    if (!clientPayload.full_name?.trim()) missing.push("Nome completo");
                    if (!clientPayload.document?.trim()) missing.push("CPF / Documento");
                    if (!clientPayload.birth_date?.trim()) missing.push("Data de nascimento");
                    if (!clientPayload.phone?.trim()) missing.push("WhatsApp / Telefone");

                    if (missing.length > 0) {
                      toast.error(
                        `Preencha os campos obrigatórios para converter:\n• ${missing.join("\n• ")}`,
                        { duration: 5000 },
                      );
                      return;
                    }
                    try {
                      await handleConvert();
                      confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ["#000000", "#ffffff", "#a8a29e", "#10B981"],
                      });
                    } catch (e: unknown) {
                      toast.error((e as Error).message || "Erro na conversão");
                    }
                  }}
                  className="h-9 text-xs"
                >
                  Converter Agora
                </PrimaryButton>
              </div>
            </div>
          </SheetPage>
        </div>

      {proposalSheetOpen && agency && (
        <NewProposalSheet
          isOpen={proposalSheetOpen}
          onClose={() => setProposalSheetOpen(false)}
          preSelectedLeadId={lead.id}
          onCreated={(newProposalId) => {
            setProposalSheetOpen(false);
            qc.invalidateQueries({ queryKey: ["proposals", agency.id] });
            toast.success("Redirecionando para editor de cotações...");
            navigate({
              to: "/agency/$slug/proposals/$id",
              params: { slug, id: newProposalId },
            });
          }}
        />
      )}
    </SheetPage>
  );
}
