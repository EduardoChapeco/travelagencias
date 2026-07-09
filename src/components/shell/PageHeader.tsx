import type { ReactNode } from "react";
import { FolderSearch } from "lucide-react";

export function PageHeader({
  title,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="ds-h2 text-foreground">{title}</h1>
      </div>
      {actions && (
        <div className="flex flex-none items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {actions}
        </div>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon = FolderSearch,
  action,
}: {
  title: string;
  description?: string;
  icon?: any;
  action?: ReactNode;
}) {
  return (
    <div className="w-full max-w-md flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-surface-alt/20 py-16 px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-alt border border-border/50 text-muted-foreground/60">
        <Icon className="h-7 w-7" strokeWidth={1.5} />
      </div>
      <h3 className="ds-card-title text-foreground">{title}</h3>
      {description && (
        <p className="mx-auto mt-2 max-w-sm ds-body text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
