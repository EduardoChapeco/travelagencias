import { useState } from "react";
import { SheetPage } from "./sheet";
import { Field } from "@/components/ui/field";
import { FormInput as Input } from "@/components/ui/input";
import { FormTextarea as Textarea } from "@/components/ui/textarea";
import { PrimaryButton, GhostButton , Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wand2, Copy } from "lucide-react";
type PortalBlock = any;

type AILandingPageSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (blocks: PortalBlock[]) => void;
  agencyId?: string;
};

export function AILandingPageSheet({
  open,
  onOpenChange,
  onGenerate,
  agencyId,
}: AILandingPageSheetProps) {
  const [topic, setTopic] = useState("");
  const [urlToClone, setUrlToClone] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"prompt" | "clone">("prompt");

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "prompt" && !topic.trim())
      return toast.warning("Digite o tema ou objetivo da sua Landing Page.");
    if (mode === "clone" && !urlToClone.trim())
      return toast.warning("Digite a URL do site que deseja usar como base.");

    setLoading(true);
    toast.loading("O assistente está estruturando sua página...", { id: "ai-lp" });

    try {
      const { data, error } = await supabase.functions.invoke("generate-site-ai", {
        body: {
          prompt: mode === "prompt" ? topic : undefined,
          urlToClone: mode === "clone" ? urlToClone : undefined,
          agency_id: agencyId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.blocks || !Array.isArray(data.blocks))
        throw new Error("Retorno inválido do assistente.");

      toast.success("Página gerada com sucesso!", { id: "ai-lp" });
      onGenerate(data.blocks);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro na geração", { id: "ai-lp" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SheetPage
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title="Assistente de Criação de Páginas"
      width="clamp(400px, 40vw, 600px)"
    >
      <div className="mb-6 bg-surface-alt/50 p-4 rounded-[var(--radius-card)] border border-border">
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-brand" />
          Gere páginas completas em segundos usando descrições ou clonando o layout de sites
          existentes.
        </p>
      </div>

      <div className="flex border-b border-border mb-6">
        <Button
          type="button"
          onClick={() => setMode("prompt")}
          className={`flex-1 pb-3 text-sm font-semibold border-b-2 ${mode === "prompt" ? "border-brand text-foreground" : "border-transparent text-muted-foreground"}`}
        >
          Criar por Texto
        </Button>
        <Button
          type="button"
          onClick={() => setMode("clone")}
          className={`flex-1 pb-3 text-sm font-semibold border-b-2 ${mode === "clone" ? "border-brand text-foreground" : "border-transparent text-muted-foreground"}`}
        >
          Clonar Site (URL)
        </Button>
      </div>

      <form onSubmit={handleGenerate} className="space-y-4">
        {mode === "prompt" && (
          <Field
            label="Descreva o que quer vender"
            hint="Ex: Landing page para Pacote Neve em Bariloche 2026, com foco em casais."
          >
            <Textarea
              placeholder="Digite o objetivo da sua página..."
              value={topic}
              onChange={(e: any) => setTopic(e.target.value)}
              rows={4}
            />
          </Field>
        )}

        {mode === "clone" && (
          <Field
            label="URL do site inspiração"
            hint="O assistente lerá o site e estruturará os blocos com base nele."
          >
            <Input
              type="url"
              placeholder="https://exemplo.com.br/landing-page"
              value={urlToClone}
              onChange={(e: any) => setUrlToClone(e.target.value)}
            />
          </Field>
        )}

        <div className="pt-4 flex justify-end gap-3 border-t border-border mt-4">
          <GhostButton type="button" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </GhostButton>
          <PrimaryButton type="submit" disabled={loading} className="gap-2">
            {mode === "clone" ? <Copy className="w-4 h-4" /> : <Wand2 className="w-4 h-4" />}
            {loading
              ? "Processando..."
              : mode === "clone"
                ? "Clonar Layout"
                : "Gerar Landing Page Inteira"}
          </PrimaryButton>
        </div>
      </form>
    </SheetPage>
  );
}
