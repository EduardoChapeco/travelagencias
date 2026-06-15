import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProposalHistory } from "@/services/proposals";
import { type Proposal } from "@/services/proposals";
import { StudioSidebar } from "@/components/studio/StudioSidebar";
import { StudioFrame, CanvasFormat } from "@/components/studio/StudioFrame";
import { StudioFormatPicker } from "@/components/studio/StudioFormatPicker";
import { StudioTemplatePicker } from "@/components/studio/StudioTemplatePicker";
import { SectionCover } from "@/components/studio/sections/SectionCover";
import { SectionTravelers } from "@/components/studio/sections/SectionTravelers";
import { SectionFlights } from "@/components/studio/sections/SectionFlights";
import { SectionHotels } from "@/components/studio/sections/SectionHotels";
import { SectionTransfers } from "@/components/studio/sections/SectionTransfers";
import { SectionTours } from "@/components/studio/sections/SectionTours";
import { SectionItinerary } from "@/components/studio/sections/SectionItinerary";
import { SectionMap } from "@/components/studio/sections/SectionMap";
import { SectionIncludes } from "@/components/studio/sections/SectionIncludes";
import { SectionFinancial } from "@/components/studio/sections/SectionFinancial";
import { Accordion } from "@/components/proposals/ProposalFormFields";
import { getProposalTemplate, PROPOSAL_TEMPLATES } from "@/components/proposals/templates";

interface ProposalStudioProps {
  draft: Proposal;
  save: (patch: Partial<Proposal>) => void;
  agency: any;
}

export function ProposalStudio({ draft, save, agency }: ProposalStudioProps) {
  const currentFormat = (draft.canvas_format as CanvasFormat) || "a4-portrait";

  const historyQ = useQuery({
    queryKey: ["proposal-history", draft.id],
    queryFn: () => fetchProposalHistory(draft.id),
    refetchInterval: 10000,
  });

  let currentTemplate = draft.template || "editorial-flat";

  // Enforce compatibility: If current template doesn't support the current format, switch to a valid one
  const validTemplates = PROPOSAL_TEMPLATES.filter((t) => t.formats.includes(currentFormat));
  const isCompatible = validTemplates.some((t) => t.id === currentTemplate);

  if (!isCompatible && validTemplates.length > 0) {
    currentTemplate = validTemplates[0].id;
  }

  const TemplateComponent = getProposalTemplate(currentTemplate);

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* ── Left Sidebar (CMS) ── */}
      <StudioSidebar>
        {/* Design & Layout */}
        <Accordion title="Aparência & Template" defaultOpen>
          <div className="space-y-4">
            <div>
              <span className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
                Formato do Canvas
              </span>
              <StudioFormatPicker
                value={currentFormat}
                onChange={(format) => save({ canvas_format: format })}
              />
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
                Template
              </span>
              <StudioTemplatePicker
                format={currentFormat}
                value={currentTemplate}
                onChange={(tplId) => save({ template: tplId })}
              />
            </div>
          </div>
        </Accordion>

        {/* Dynamic content sections */}
        <SectionCover draft={draft} save={save} />
        <SectionTravelers draft={draft} save={save} />
        <SectionFlights draft={draft} save={save} />
        <SectionHotels draft={draft} save={save} />
        <SectionTransfers draft={draft} save={save} />
        <SectionTours draft={draft} save={save} />
        <SectionItinerary draft={draft} save={save} />
        <SectionMap draft={draft} save={save} />
        <SectionIncludes draft={draft} save={save} />
        <SectionFinancial draft={draft} save={save} />

        <Accordion title="Histórico e Rastreamento">
          <div className="space-y-4">
            <div className="flex items-center justify-between py-1">
              <div>
                <span className="block text-xs font-bold text-foreground">Template da Agência</span>
                <span className="block text-[10px] text-muted-foreground">
                  Disponível para clonagem
                </span>
              </div>
              <input
                type="checkbox"
                checked={!!draft.is_public_template}
                onChange={(e) => save({ is_public_template: e.target.checked })}
                className="h-4 w-4 rounded border-border text-brand focus:ring-brand cursor-pointer"
              />
            </div>

            <div className="border-t border-border/60 pt-3">
              <span className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
                Log de Atividades
              </span>

              {historyQ.isLoading ? (
                <div className="text-[10px] text-muted-foreground">Carregando histórico...</div>
              ) : !historyQ.data || historyQ.data.length === 0 ? (
                <div className="text-[10px] text-muted-foreground italic">
                  Nenhuma atividade registrada ainda.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
                  {historyQ.data.map((entry) => {
                    const dateStr = new Date(entry.created_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    let titleText = entry.action;
                    let descText = "";

                    if (entry.action === "created") {
                      titleText = "Cotação criada";
                      descText = entry.details?.agent_name ? `Por ${entry.details.agent_name}` : "";
                    } else if (entry.action === "updated") {
                      titleText = "Cotação editada";
                      descText = entry.details?.agent_name ? `Por ${entry.details.agent_name}` : "";
                    } else if (entry.action === "viewed") {
                      titleText = "👀 Visualizada pelo cliente";
                      descText = "Acessada via link público";
                    } else if (entry.action === "accepted") {
                      titleText = "✅ Aceita pelo cliente";
                      descText = "Aprovada via link público";
                    } else if (entry.action === "rejected") {
                      titleText = "❌ Recusada pelo cliente";
                      descText = "Recusada via link público";
                    } else if (entry.action === "pdf_exported") {
                      titleText = "📄 PDF exportado";
                      descText = entry.details?.agent_name ? `Por ${entry.details.agent_name}` : "";
                    }

                    return (
                      <div
                        key={entry.id}
                        className="text-[11px] border-b border-border/40 pb-1.5 last:border-0 last:pb-0"
                      >
                        <div className="flex justify-between items-start gap-1">
                          <span className="font-semibold text-foreground leading-tight">
                            {titleText}
                          </span>
                          <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                            {dateStr}
                          </span>
                        </div>
                        {descText && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{descText}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Accordion>
      </StudioSidebar>

      {/* ── Right: Canvas Viewer ── */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <StudioFrame format={currentFormat}>
          <TemplateComponent proposal={draft} agency={agency} />
        </StudioFrame>
      </main>
    </div>
  );
}
