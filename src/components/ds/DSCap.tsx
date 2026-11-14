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
  neutral: "bg-surface-alt/60 text-muted-foreground border-border/80",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  accent: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
  brand: "bg-brand/10 text-brand border-brand/20",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
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
        className,
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
