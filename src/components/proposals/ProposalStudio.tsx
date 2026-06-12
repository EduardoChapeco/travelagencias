import React from "react";
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
