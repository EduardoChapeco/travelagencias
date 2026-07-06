import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { DSCap } from "./DSCap";

interface DSPageHeaderProps {
  /** Main page title — uses .ds-h2 (25px, -0.06em, weight 780) */
  title: string;
  /** Optional subtitle below title */
  subtitle?: string;
  /** Array of DSCap props for status chips */
  caps?: Array<{
    label: string;
    tone?: "neutral" | "success" | "warning" | "danger" | "info" | "accent" | "brand" | "purple";
    dot?: boolean;
  }>;
  /** Action nodes (buttons, links) aligned right */
  actions?: ReactNode;
  className?: string;
  /** Compact variant — no bottom margin, smaller gap */
  compact?: boolean;
}

/**
 * DSPageHeader — editorial page header following design system.
 * Title: 25px, weight 780, letter-spacing -0.06em.
 * Caps: small uppercase chips for status/context.
 */
export function DSPageHeader({
  title,
  subtitle,
  caps,
  actions,
  className,
  compact = false,
}: DSPageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-start justify-between gap-3",
        compact ? "mb-4" : "mb-6",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {caps && caps.length > 0 && (
          <div className="flex items-center flex-wrap gap-1.5 mb-2">
            {caps.map((cap, i) => (
              <DSCap key={i} tone={cap.tone} dot={cap.dot}>
                {cap.label}
              </DSCap>
            ))}
          </div>
        )}
        <h1 className="ds-h2 text-foreground">{title}</h1>
        {subtitle && <p className="ds-body text-muted-foreground mt-1.5 max-w-2xl">{subtitle}</p>}
      </div>

      {actions && (
        <div className="flex flex-none items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
