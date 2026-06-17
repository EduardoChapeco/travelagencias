import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface DSModuleProps {
  /** Small uppercase kicker label above the title */
  kicker?: string;
  /** Module title — rendered as ds-h2 */
  title?: string;
  /** Optional subtitle / description below title */
  description?: string;
  /** Optional action node (button, link) aligned to top-right */
  action?: ReactNode;
  /** Soft background variant (uses --surface-alt) */
  soft?: boolean;
  /** Remove default padding */
  noPadding?: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * DSModule — primary visual container for all admin module sections.
 * Border-only card, no shadow, 20px padding, 24px radius.
 */
export function DSModule({
  kicker,
  title,
  description,
  action,
  soft,
  noPadding,
  className,
  children,
}: DSModuleProps) {
  const hasHeader = kicker || title || description || action;

  return (
    <div
      className={cn(
        "rounded-lg border border-border overflow-hidden",
        soft ? "bg-surface-alt" : "bg-surface",
        className,
      )}
    >
      {hasHeader && (
        <div
          className={cn(
            "flex items-start justify-between gap-4 border-b border-border",
            noPadding ? "px-5 py-4" : "px-5 pt-5 pb-4",
          )}
        >
          <div className="min-w-0 flex-1">
            {kicker && <div className="ds-label-caps text-muted-foreground mb-1">{kicker}</div>}
            {title && <div className="ds-h2 text-foreground leading-snug">{title}</div>}
            {description && (
              <p className="ds-body text-muted-foreground mt-1 max-w-xl">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0 pt-0.5">{action}</div>}
        </div>
      )}
      <div className={cn(!noPadding && "p-5")}>{children}</div>
    </div>
  );
}

/**
 * DSModuleRow — compact horizontal list row for use inside DSModule.
 */
export function DSModuleRow({
  label,
  value,
  meta,
  action,
  className,
}: {
  label: ReactNode;
  value?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b border-border/60 py-3 last:border-0",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground leading-snug truncate">{label}</div>
        {meta && <div className="ds-meta mt-0.5 truncate">{meta}</div>}
      </div>
      {value && <div className="text-sm font-semibold text-foreground shrink-0">{value}</div>}
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
