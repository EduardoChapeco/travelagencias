import { TextField, Accordion } from "@/components/proposals/ProposalFormFields";
import { type Proposal } from "@/services/proposals";
import { Image, User, Search, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { StudioUnsplashPicker } from "@/components/studio/StudioUnsplashPicker";

interface SectionCoverProps {
  draft: Proposal;
  save: (patch: Partial<Proposal>) => void;
}

export function SectionCover({ draft, save }: SectionCoverProps) {
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingAgent, setUploadingAgent] = useState(false);
  const [showUnsplashCover, setShowUnsplashCover] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatingCover, setGeneratingCover] = useState(false);

  async function handleImageUpload(file: File, type: "cover" | "agent") {
    const isCover = type === "cover";
    if (isCover) setUploadingCover(true);
    else setUploadingAgent(true);

    try {
      const uidVal = Math.random().toString(36).slice(2, 11);
      const fileExt = file.name.split(".").pop();
      const path = `${draft.agency_id}/studio/${draft.id}/${type}-${uidVal}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("agency-media")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("agency-media").getPublicUrl(path);
      const publicUrl = data.publicUrl;

      if (isCover) {
        save({ cover_image_url: publicUrl });
        toast.success("Imagem de capa enviada!");
      } else {
        save({ agent_photo_url: publicUrl });
        toast.success("Foto do consultor enviada!");
      }
    } catch (error: any) {
      toast.error(`Erro no upload: ${error.message}`);
    } finally {
      if (isCover) setUploadingCover(false);
      else setUploadingAgent(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 1. Capa & Imagem */}
      <Accordion title="Design da Capa" defaultOpen>
        <div className="space-y-3">
          <TextField
            label="Título da Proposta"
            value={draft.title ?? ""}
            onSave={(v) => save({ title: v })}
          />
          
          <div className="space-y-1">
            <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
              Imagem de Capa
            </span>
            <div className="flex gap-1.5">
              <input
                type="text"
                className="w-full h-8 px-3 rounded-lg border border-border/50 bg-surface-alt/50 text-xs outline-none transition-all hover:bg-surface focus:bg-surface focus:border-border-strong"
                placeholder="Cole URL..."
                value={draft.cover_image_url ?? ""}
                onChange={(e) => save({ cover_image_url: e.target.value })}
              />
              <label className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-surface text-xs cursor-pointer hover:bg-surface-alt transition-colors" title="Upload">
                {uploadingCover ? "..." : <Image className="h-3.5 w-3.5" />}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, "cover");
                  }}
                  disabled={uploadingCover}
                />
              </label>
              <button
                type="button"
                title="Buscar no Unsplash"
                onClick={() => {
                  setShowUnsplashCover(true);
                  setShowAiPrompt(false);
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-surface text-xs hover:bg-surface-alt transition-colors"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Gerar com IA"
                onClick={() => {
                  setShowAiPrompt(!showAiPrompt);
                  setShowUnsplashCover(false);
                  if (!aiPrompt && draft.destination) {
                    setAiPrompt(`foto cinematográfica estilo drone de ${draft.destination}, pôr do sol, turismo de luxo, 8k, alta fidelidade`);
                  }
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand/40 bg-brand/5 text-brand text-xs hover:bg-brand/10 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
              </button>
            </div>

            {showAiPrompt && (
              <div className="mt-2 rounded-lg border border-brand/20 bg-brand/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wide font-bold text-brand flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Gerar Capa com IA
                  </span>
                  <button type="button" onClick={() => setShowAiPrompt(false)} className="text-muted-foreground hover:text-foreground text-xs">Fechar</button>
                </div>
                <textarea
                  className="w-full p-2 text-xs rounded-lg border border-border bg-surface outline-none focus:border-brand resize-none"
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Descreva a imagem que deseja gerar..."
                />
                <button
                  type="button"
                  disabled={generatingCover || !aiPrompt}
                  onClick={async () => {
                    setGeneratingCover(true);
                    const toastId = "ai-image-gen";
                    toast.loading("IA gerando sua imagem de capa…", { id: toastId });
                    try {
                      const { data, error } = await supabase.functions.invoke("ai-orchestrator", {
                        body: {
                          action: "generate-image",
                          prompt: aiPrompt,
                          agency_id: draft.agency_id,
                          proposal_id: draft.id
                        }
                      });
                      if (error) throw error;
                      if (data?.url) {
                        save({ cover_image_url: data.url, cover_prompt: aiPrompt });
                        toast.success("Capa gerada e aplicada com sucesso!", { id: toastId });
                        setShowAiPrompt(false);
                      } else {
                        throw new Error("URL não retornada pelo servidor.");
                      }
                    } catch (err: any) {
                      console.error(err);
                      toast.error(err.message || "Falha ao gerar capa.", { id: toastId });
                    } finally {
                      setGeneratingCover(false);
                    }
                  }}
                  className="w-full flex h-8 items-center justify-center gap-1.5 rounded-lg bg-brand text-brand-foreground text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-colors"
                >
                  {generatingCover ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {generatingCover ? "Gerando..." : "Gerar Imagem"}
                </button>
              </div>
            )}

            {showUnsplashCover && (
              <div className="mt-2 rounded-lg border border-border bg-surface p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wide font-semibold">Buscar imagem</span>
                  <button onClick={() => setShowUnsplashCover(false)} className="text-muted-foreground hover:text-foreground text-xs">Fechar</button>
                </div>
                <StudioUnsplashPicker
                  agencyId={draft.agency_id}
                  proposalId={draft.id}
                  slot="cover"
                  defaultQuery={draft.destination || "travel destination"}
                  onImageSelected={(url) => {
                    save({ cover_image_url: url });
                    setShowUnsplashCover(false);
                  }}
                />
              </div>
            )}

            {draft.cover_image_url && !showUnsplashCover && (
              <div className="relative mt-2 h-20 w-full overflow-hidden rounded-lg border border-border">
                <img
                  src={draft.cover_image_url}
                  alt="Preview Cover"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => save({ cover_image_url: null })}
                  className="absolute right-1 top-1 rounded bg-destructive/80 px-1.5 py-0.5 text-[9px] text-white hover:bg-destructive"
                >
                  Remover
                </button>
              </div>
            )}
          </div>
        </div>
      </Accordion>

      {/* 2. Destino e Período */}
      <Accordion title="Informações Gerais" defaultOpen>
        <div className="grid grid-cols-2 gap-2">
          <TextField
            label="Destino"
            value={draft.destination ?? ""}
            onSave={(v) => save({ destination: v })}
          />
          <TextField
            label="Válido até"
            type="date"
            value={draft.valid_until ?? ""}
            onSave={(v) => save({ valid_until: v || null })}
          />
          <TextField
            label="Início da Viagem"
            type="date"
            value={draft.travel_start ?? ""}
            onSave={(v) => save({ travel_start: v || null })}
          />
          <TextField
            label="Fim da Viagem"
            type="date"
            value={draft.travel_end ?? ""}
            onSave={(v) => save({ travel_end: v || null })}
          />
        </div>
      </Accordion>


      {/* 4. Dados do Consultor (Agente) */}
      <Accordion title="Consultor Responsável">
        <div className="space-y-3">
          <TextField
            label="Nome do Consultor"
            value={draft.agent_name ?? ""}
            onSave={(v) => save({ agent_name: v })}
          />
          <TextField
            label="WhatsApp de Contato"
            placeholder="Ex: (49) 99999-9999"
            value={draft.agent_whatsapp ?? ""}
            onSave={(v) => save({ agent_whatsapp: v })}
          />
          
          <div className="space-y-1">
            <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
              Foto do Consultor (URL)
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                className="w-full h-8 px-3 rounded-lg border border-border/50 bg-surface-alt/50 text-xs outline-none transition-all hover:bg-surface focus:bg-surface focus:border-border-strong"
                placeholder="Cole a URL ou use o upload..."
                value={draft.agent_photo_url ?? ""}
                onChange={(e) => save({ agent_photo_url: e.target.value })}
              />
              <label className="flex h-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-surface px-3 text-xs font-semibold cursor-pointer hover:bg-surface-alt transition-colors">
                {uploadingAgent ? "..." : <User className="h-4 w-4" />}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, "agent");
                  }}
                  disabled={uploadingAgent}
                />
              </label>
            </div>
            {draft.agent_photo_url && (
              <div className="flex items-center gap-3 mt-2 p-2 rounded-lg border border-border bg-surface-alt/25">
                <img
                  src={draft.agent_photo_url}
                  alt="Agent Photo"
                  className="h-10 w-10 rounded-full object-cover border border-border"
                />
                <div className="text-[10px] text-muted-foreground">
                  Foto vinculada ao consultor.
                </div>
                <button
                  type="button"
                  onClick={() => save({ agent_photo_url: null })}
                  className="ml-auto rounded bg-destructive/80 px-2 py-0.5 text-[9px] text-white hover:bg-destructive"
                >
                  Remover
                </button>
              </div>
            )}
          </div>
        </div>
      </Accordion>
    </div>
  );
}
