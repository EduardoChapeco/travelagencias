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
                <div className="relative w-60 shrink-0">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none"
                    strokeWidth={2.2}
                  />
                  <Input
                    type="text"
                    value={search.value}
                    onChange={(e) => search.onChange(e.target.value)}
                    placeholder={search.placeholder ?? "Buscar..."}
                    className={cn(
                      "w-full h-8 rounded-full bg-white/[0.05] border-white/10",
                      "pl-8 pr-8 text-xs font-medium text-white placeholder:text-zinc-500",
                      "focus:outline-none focus:ring-1 focus:ring-white/20 focus:bg-white/[0.08]",
                      "transition-all duration-150",
                    )}
                  />
                  {search.value && (
                    <Button
                      type="button"
                      onClick={() => search.onChange("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                    >
                      <X className="h-3 w-3" strokeWidth={2.5} />
                    </Button>
                  )}
                </div>
              )}

              {/* ── Segmented Filter Tabs (Padrão JAH V4) ── */}
              {filters && filters.length > 0 && (
                <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] p-0.5 h-8 rounded-full overflow-x-auto no-scrollbar max-w-full">
                  {filters.map((f) => {
                    const isActive = activeFilter === f.value;
                    return (
                      <Button
                        key={f.value}
                        onClick={() => onFilterChange?.(f.value)}
                        className={cn(
                          "px-3 h-7 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150 cursor-pointer flex items-center gap-1.5",
                          isActive
                            ? "bg-white text-black font-semibold shadow-sm"
                            : "text-zinc-400 hover:text-white hover:bg-white/[0.06]",
                        )}
                      >
                        {f.label}
                        {f.count !== undefined && (
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded-full text-[9px] leading-none font-bold",
                              isActive
                                ? "bg-black/15 text-black"
                                : "bg-white/10 text-zinc-400",
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
          {actions && <div className="flex items-center gap-2 h-8">{actions}</div>}

          {/* ── Primary Action (Omit on Desktop if sidebar handles it) ── */}
          {primaryAction && (
            <div
              className={cn(
                "flex items-center ml-2 border-l border-white/10 pl-3 h-8",
                hasSidebar ? "md:hidden" : "",
              )}
            >
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
      className={cn("gap-1.5 font-semibold whitespace-nowrap bg-white text-black hover:bg-white/90 active:scale-[0.98] shadow-sm rounded-full h-8 px-3 text-xs", className)}
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
