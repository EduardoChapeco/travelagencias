import { CanvasFormat } from "./StudioFrame";
import { PROPOSAL_TEMPLATES } from "@/components/proposals/templates";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

// Preview color map per template id
const PREVIEW_STYLES: Record<string, { bg: string; accent: string }> = {
  "editorial-flat": { bg: "#f1f5f9", accent: "#3b82f6" },
  "executivo-b2b": { bg: "#ffffff", accent: "#1e293b" },
  "dark-premium": { bg: "#0f172a", accent: "#c9a84c" },
  // voucher / story
  "voucher-navy": { bg: "#1e3a5f", accent: "#60a5fa" },
  "voucher-minimal": { bg: "#fafafa", accent: "#64748b" },
  "voucher-brand": { bg: "#e0f2fe", accent: "#0284c7" },
  // presentation
  "presentation-exec": { bg: "#1e1b4b", accent: "#a78bfa" },
};

interface StudioTemplatePickerProps {
  format: CanvasFormat;
  value: string;
  onChange: (templateId: string) => void;
}

export function StudioTemplatePicker({ format, value, onChange }: StudioTemplatePickerProps) {
  // Filter templates that support this format (PROPOSAL_TEMPLATES only covers a4-portrait for now)
  const relevant = PROPOSAL_TEMPLATES.filter(
    (t) => t.formats.includes(format) || t.formats.length === 0,
  );

  if (relevant.length === 0) {
    return (
      <div className="text-[10px] text-muted-foreground p-3 text-center border border-dashed border-border rounded-[var(--radius-card)]">
        Nenhum template para este formato.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {relevant.map((tpl) => {
        const active = value === tpl.id;
        const style = PREVIEW_STYLES[tpl.id] ?? { bg: "#f1f5f9", accent: "#3b82f6" };

        return (
          <Button
            key={tpl.id}
            type="button"
            onClick={() => onChange(tpl.id)}
            className={`w-full flex items-center gap-3 p-2.5 rounded-[var(--radius-card)] border text-left transition-all ${
              active
                ? "border-brand bg-brand/5 dark:bg-brand/10"
                : "border-border/60 bg-surface hover:border-border-hover"
            }`}
          >
            {/* Visual thumbnail */}
            <div
              className="h-12 w-9 rounded-full border border-border/20 shrink-0 flex flex-col overflow-hidden"
              style={{ background: style.bg }}
            >
              <div style={{ background: style.accent, height: 3 }} />
              <div className="flex-1 p-1 space-y-0.5">
                <div
                  className="rounded-full h-1"
                  style={{ background: style.accent, opacity: 0.7, width: "80%" }}
                />
                <div
                  className="rounded-full h-1"
                  style={{ background: style.accent, opacity: 0.3, width: "60%" }}
                />
                <div
                  className="rounded-full h-1"
                  style={{ background: style.accent, opacity: 0.3, width: "90%" }}
                />
                <div
                  className="rounded-full h-1"
                  style={{ background: style.accent, opacity: 0.2, width: "70%" }}
                />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold truncate">{tpl.label}</span>
                {active && <Check className="h-3 w-3 text-brand shrink-0" />}
              </div>
              <div className="text-[9px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">
                {tpl.description}
              </div>
            </div>
          </Button>
        );
      })}
    </div>
  );
}
