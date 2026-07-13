import React, { useEffect, useMemo, type ReactNode } from "react";
import { Search, X, FolderSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeaderPortal } from "./HeaderPortal";
import { useLayoutStore, type PrimaryActionConfig } from "@/hooks/use-layout-store";
import { useRouterState } from "@tanstack/react-router";
import { useAgency } from "@/lib/agency-context";
import { Button } from "@/components/ui/button";
import { FormInput as Input } from "@/components/ui/input";

export type ToolbarFilter = {
  label: string;
  value: string;
  count?: number;
};

export function normalizePrimaryAction(action: React.ReactNode): PrimaryActionConfig | null {
  if (!action) return null;

  if (typeof action === "object" && action !== null && "onClick" in action && "label" in action) {
    return action as unknown as PrimaryActionConfig;
  }

  if (React.isValidElement(action)) {
    const props = action.props as any;
    if (props && typeof props.onClick === "function") {
      let label = props.label;
      if (!label && typeof props.children === "string") {
        label = props.children;
      }
      return {
        label: label || "Ação",
        icon: props.icon,
        onClick: props.onClick,
        disabled: props.disabled,
        loading: props.loading,
      };
    }
  }

  return null;
}

export function PageHeader({
  title,
  description,
  search,
  filters,
  activeFilter,
  onFilterChange,
  actions,
  primaryAction,
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
  primaryAction?: ReactNode;
}) {
  const setPrimaryAction = useLayoutStore((state) => state.setPrimaryAction);
  const normalizedAction = useMemo(() => normalizePrimaryAction(primaryAction), [primaryAction]);

  const { agency } = useAgency();
  const rawPathname = useRouterState({ select: (s) => s.location.pathname });
  const pathname = (rawPathname ?? "/").replace(/\/$/, "") || "/";
  const isHome = pathname === `/agency/${agency?.slug}` || pathname === `/agency/${agency?.slug}/`;

  // Se estiver em uma página de módulo normal (com sidebar), o sidebar exibirá a ação principal.
  const hasSidebar = !isHome && pathname.startsWith("/agency/");

  useEffect(() => {
    if (normalizedAction) {
      setPrimaryAction(normalizedAction);
      return () => setPrimaryAction(null);
    }
  }, [normalizedAction, setPrimaryAction]);

  return (
    <>
      {/* Teleport the controls (Search, Filters, Actions) to the AppShell Top Bar */}
      <HeaderPortal>
        <div className="flex items-center gap-4 h-full pointer-events-auto">
          {/* ── Search & Filters Row ── */}
          {(search || (filters && filters.length > 0)) && (
            <div className="flex items-center gap-3">
              {/* ── Search Input ── */}
              {search && (
                <div className="relative w-64 shrink-0">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none"
                    strokeWidth={2.2}
                  />
                  <Input
                    type="text"
                    value={search.value}
                    onChange={(e) => search.onChange(e.target.value)}
                    placeholder={search.placeholder ?? "Buscar..."}
                    className={cn( "w-full rounded-full bg-surface-alt/50 border-border/50", "pl-9 pr-9 text-[12px] font-semibold placeholder:text-muted-foreground/60", "focus:outline-none focus:ring-primary/50 focus:bg-surface-alt", "transition-all duration-150" )} /> {search.value && (
                    <Button
                      type="button"
                      onClick={() => search.onChange("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-foreground cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </Button>
                  )}
                </div>
              )}

              {/* ── Filter Pills (Height 32px standard) ── */}
              {filters && filters.length > 0 && (
                <div className="flex items-center gap-1 bg-surface-alt/30 border border-border/30 p-0.5 h-8 rounded-full overflow-x-auto no-scrollbar max-w-full">
                  {filters.map((f) => {
                    const isActive = activeFilter === f.value;
                    return (
                      <Button
                        key={f.value}
                        onClick={() => onFilterChange?.(f.value)}
                        className={cn(
                          "px-3 h-7 rounded-full ds-meta font-extrabold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-surface-alt"
                        )}
                      >
                        {f.label}
                        {f.count !== undefined && (
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded-full text-[9px] leading-none font-bold",
                              isActive ? "bg-black/20 text-primary-foreground" : "bg-border text-muted-foreground"
                            )}
                          >
                            {f.count}
                          </span>
                        )}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Actions (Contextual Button, Height 32px standard) ── */}
          {actions && (
            <div className="flex items-center gap-2 h-8">
              {actions}
            </div>
          )}

          {/* ── Primary Action (Omit on Desktop if sidebar handles it) ── */}
          {primaryAction && (
            <div className={cn(
              "flex items-center ml-2 border-l border-border/50 pl-4 h-8",
              hasSidebar ? "md:hidden" : ""
            )}>
              {primaryAction}
            </div>
          )}
        </div>
      </HeaderPortal>

      {/* Inline Flow: Only the Title and Description */}
      <div className="mb-6 flex flex-col gap-1 md:hidden">
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ModuleActionButton — thin semantic wrapper sobre o Button canônico.
// Contrato público mantido para zero-breaking-change nos 22 consumers.
// Visual delegado ao Button primitive (size="sm" → h-8 px-3 text-xs rounded-full).
export function ModuleActionButton({
  label,
  icon,
  onClick,
  className,
  disabled,
  loading,
}: {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Button
      size="sm"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn("gap-1.5 font-bold whitespace-nowrap", className)}
    >
      {icon}
      <span>{label}</span>
    </Button>
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
