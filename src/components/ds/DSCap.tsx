import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type DSCapTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent"
  | "brand"
  | "purple";

const TONE_CLASSES: Record<DSCapTone, string> = {
  neutral:
    "bg-surface text-muted-foreground border-border",
  success:
    "bg-[#EDF8F1] text-[#157F3D] border-[#157F3D]/25",
  warning:
    "bg-[#FFF4E6] text-[#A85B14] border-[#A85B14]/25",
  danger:
    "bg-[#FFF1EF] text-[#B42318] border-[#B42318]/25",
  info:
    "bg-[#EEF4FF] text-[#2452C6] border-[#2452C6]/25",
  accent:
    "bg-[#FFF0F6] text-[#B51F5A] border-[#FF4F9A]/25",
  brand:
    "bg-brand-light text-brand border-brand/25",
  purple:
    "bg-[#F5EFFF] text-[#6D36C8] border-[#6D36C8]/25",
};

/** Editorial status chip — use for all status, labels, categories, flags */
export function DSCap({
  children,
  tone = "neutral",
  className,
  dot,
}: {
  children: ReactNode;
  tone?: DSCapTone;
  className?: string;
  /** Show a filled dot before the label */
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-[10px] py-[5px] ds-label-caps leading-none whitespace-nowrap",
        TONE_CLASSES[tone],
        className
      )}
    >
      {dot && (
        <span
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{ background: "currentColor" }}
        />
      )}
      {children}
    </span>
  );
}
