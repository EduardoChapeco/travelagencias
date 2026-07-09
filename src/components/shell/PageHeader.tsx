import type { ReactNode } from "react";
import { Search, X, FolderSearch } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToolbarFilter = {
  label: string;
  value: string;
  count?: number;
};

export function PageHeader({
  title,
  description,
  search,
  filters,
  activeFilter,
  onFilterChange,
  actions,
}: {
  title: string;
  description?: string;
  search?: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  };
  filters?: ToolbarFilter[];
  activeFilter?: string;
  onFilterChange?: (value: string) => void;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="ds-h2 text-foreground">{title}</h1>
          {description && <p className="ds-body text-muted-foreground mt-1">{description}</p>}
        </div>

        {/* ── Actions ── */}
        {actions && (
          <div className="flex flex-none items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {actions}
          </div>
        )}
      </div>

      {/* ── Search & Filters Row (Optional) ── */}
      {(search || (filters && filters.length > 0)) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* ── Search Input ── */}
          {search && (
            <div className="relative w-full sm:w-64 shrink-0">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none"
                strokeWidth={2}
              />
              <input
                type="text"
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                placeholder={search.placeholder ?? "Buscar..."}
                className={cn(
                  "w-full h-10 rounded-full bg-surface-alt/50 border border-border/50",
                  "pl-9 pr-9 text-[13px] text-foreground placeholder:text-muted-foreground/60",
                  "focus:outline-none focus:ring-1 focus:ring-primary/50 focus:bg-surface-alt",
                  "transition-all duration-150"
                )}
              />
              {search.value && (
                <button
                  type="button"
                  onClick={() => search.onChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              )}
            </div>
          )}

          {/* ── Filter Pills ── */}
          {filters && filters.length > 0 && (
            <div className="flex items-center gap-1 bg-surface-alt/30 border border-border/30 p-1 rounded-full overflow-x-auto no-scrollbar max-w-full">
              {filters.map((f) => {
                const isActive = activeFilter === f.value;
                return (
                  <button
                    key={f.value}
                    onClick={() => onFilterChange?.(f.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-surface-alt"
                    )}
                  >
                    {f.label}
                    {f.count !== undefined && (
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded-full text-[10px] leading-none",
                          isActive ? "bg-black/20 text-white" : "bg-border text-muted-foreground"
                        )}
                      >
                        {f.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ModuleActionButton — botão de ação contextual circular flutuante
export function ModuleActionButton({
  label,
  icon,
  onClick,
  className,
}: {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-[12px] font-bold hover:bg-primary/90 transition-all shadow-sm cursor-pointer whitespace-nowrap",
        className
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
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
