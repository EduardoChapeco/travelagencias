import { CanvasFormat } from "./StudioFrame";
import { File, MonitorPlay, Smartphone, Layout } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FormatOption {
  value: CanvasFormat;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    value: "a4-portrait",
    label: "A4 Retrato",
    desc: "Cotação detalhada ou Contrato",
    icon: File,
  },
  {
    value: "a4-landscape",
    label: "A4 Paisagem",
    desc: "Apresentação de Slides",
    icon: Layout,
  },
  {
    value: "story-916",
    label: "Story (9:16)",
    desc: "Voucher ou Story de Instagram",
    icon: Smartphone,
  },
  {
    value: "presentation-169",
    label: "Apresentação (16:9)",
    desc: "Apresentação Executiva B2B",
    icon: MonitorPlay,
  },
];

interface StudioFormatPickerProps {
  value: CanvasFormat;
  onChange: (format: CanvasFormat) => void;
}

export function StudioFormatPicker({ value, onChange }: StudioFormatPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {FORMAT_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.value;
        return (
          <Button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex flex-col items-start gap-1.5 p-3 rounded-[var(--radius-card)] border text-left transition-all ${
              active
                ? "border-brand bg-brand/5 dark:bg-brand/10 text-brand"
                : "border-border/60 bg-surface hover:border-border-hover hover:bg-surface-alt/40"
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-2xl ${active ? "bg-brand/10" : "bg-muted/15"}`}>
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold">{opt.label}</span>
            </div>
            <span className="text-[10px] text-muted-foreground leading-snug">{opt.desc}</span>
          </Button>
        );
      })}
    </div>
  );
}
