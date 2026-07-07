import { useState } from "react";
import { type Proposal, suggestIncludesExcludesViaAI } from "@/services/proposals";
import { Accordion, TagsEditor } from "@/components/proposals/ProposalFormFields";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  draft: Proposal;
  save: (patch: Partial<Proposal>) => void;
}

export function SectionIncludes({ draft, save }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleAISuggestions() {
    setLoading(true);
    const toastId = "ai-includes";
    toast.loading("IA analisando viagem e gerando sugestões…", { id: toastId });
    try {
      const suggestions = await suggestIncludesExcludesViaAI(draft);

      const newIncludes = [...(draft.includes ?? [])];
      let addedIncludesCount = 0;
      suggestions.includes.forEach((item) => {
        if (!newIncludes.some((i) => i.toLowerCase() === item.toLowerCase())) {
          newIncludes.push(item);
          addedIncludesCount++;
        }
      });

      const newExcludes = [...(draft.excludes ?? [])];
      let addedExcludesCount = 0;
      suggestions.excludes.forEach((item) => {
        if (!newExcludes.some((i) => i.toLowerCase() === item.toLowerCase())) {
          newExcludes.push(item);
          addedExcludesCount++;
        }
      });

      save({
        includes: newIncludes,
        excludes: newExcludes,
      });

      if (addedIncludesCount > 0 || addedExcludesCount > 0) {
        toast.success(
          `IA adicionou ${addedIncludesCount} inclusões e ${addedExcludesCount} exclusões recomendadas!`,
          { id: toastId },
        );
      } else {
        toast.success("IA analisou a viagem, mas todas as recomendações já estavam presentes.", {
          id: toastId,
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar sugestões com IA.", { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* AI Suggestion Premium Button */}
      <button
        type="button"
        onClick={handleAISuggestions}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-[var(--radius-card)] border border-brand/20 bg-brand/5 text-brand text-xs font-bold uppercase tracking-wider hover:bg-brand/10 active:scale-[0.98] transition-all disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4 text-brand animate-pulse" />
        )}
        {loading ? "Gerando sugestões..." : "Sugerir com IA"}
      </button>

      <div className="space-y-3">
        <Accordion title={`O que inclui (${(draft.includes ?? []).length})`}>
          <TagsEditor
            tags={draft.includes ?? []}
            onChange={(t) => save({ includes: t })}
            placeholder="Hotel, passagens, café... ↵"
          />
        </Accordion>

        <Accordion title={`Não inclui (${(draft.excludes ?? []).length})`}>
          <TagsEditor
            tags={draft.excludes ?? []}
            onChange={(t) => save({ excludes: t })}
            placeholder="Gorjetas, seguro, passeios... ↵"
          />
        </Accordion>
      </div>
    </div>
  );
}
