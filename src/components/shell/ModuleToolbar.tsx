/**
 * ModuleToolbar — Componente padronizado para a barra de cabeçalho de módulo.
 * Deve ser usado DENTRO do <HeaderPortal> nas rotas filhas.
 *
 * Renderiza:
 *  - Título do módulo como pill glass (lado esquerdo)
 *  - Campo de busca glass compacto (centro)
 *  - Pills de filtro dinâmicas (centro-direita)
 *  - Slot de ações secundárias (lado direito)
 *
 * NUNCA inclua botão de action primário aqui — ele fica fixed no layout
 * como botão contextual por módulo (acima do AI Pill).
 */
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type ToolbarFilter = {
  label: string;
  value: string;
  count?: number;
};

type ModuleToolbarProps = {
  /** Título do módulo exibido como pill no lado esquerdo */
  title?: string;
  /** Config do campo de busca */
  search?: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  };
  /** Filtros pill (aba-style) */
  filters?: ToolbarFilter[];
  activeFilter?: string;
  onFilterChange?: (value: string) => void;
  /** Slot para elementos extras (ex: selects, toggle de view) no lado direito */
  actions?: ReactNode;
  /** Classe extra para o container */
  className?: string;
};

export function ModuleToolbar({
  title,
  search,
  filters,
  activeFilter,
  onFilterChange,
  actions,
  className,
}: ModuleToolbarProps) {
  return (
    <div
      className={cn(
        "flex-1 flex items-center gap-3 shrink-0 h-full max-w-2xl px-2",
        className
      )}
    >
      {/* ── Title Pill ── */}
      {title && (
        <div className="flex items-center gap-2 glass-pill px-3 py-1 text-xs font-bold text-white shrink-0">
          {title}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto flex-1">
        {/* ── Search Input ── */}
      {search && (
        <div className="relative w-44 sm:w-56 shrink-0">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40 pointer-events-none"
            strokeWidth={2}
          />
          <input
            type="text"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? "Buscar..."}
            className={cn(
              "w-full h-8 glass-pill",
              "pl-8 pr-8 text-[12px] text-white/85 placeholder:text-white/35",
              "focus:outline-none focus:ring-1 focus:ring-white/30 focus:bg-white/8",
              "transition-all duration-150"
            )}
          />
          {search.value && (
            <button
              type="button"
              onClick={() => search.onChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" strokeWidth={2.5} />
            </button>
          )}
        </div>
      )}

      {/* ── Filter Pills ── */}
      {filters && filters.length > 0 && (
        <div className="flex items-center gap-0.5 glass-pill p-0.5 overflow-x-auto no-scrollbar max-w-[320px] sm:max-w-md shrink-0">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => onFilterChange?.(f.value)}
              className={cn(
                "h-7 px-3 rounded-full text-[11px] font-semibold transition-all duration-150 cursor-pointer shrink-0 flex items-center gap-1 whitespace-nowrap",
                activeFilter === f.value
                  ? "bg-white/10 text-white border border-white/5 shadow-xs"
                  : "text-white/55 hover:text-white/80 hover:bg-white/5 border border-transparent"
              )}
            >
              {f.label}
              {f.count !== undefined && (
                <span
                  className={cn(
                    "text-[10px] font-black ml-0.5",
                    activeFilter === f.value ? "text-white/75" : "text-white/30"
                  )}
                >
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Actions ── */}
      {actions && (
        <div className="flex items-center gap-1 glass-pill p-0.5 shrink-0 ml-auto">
          {actions}
        </div>
      )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ModuleActionButton — botão de ação contextual circular flutuante
// Posição: fixed left-[12px] top-[54px] z-30 (acima do menu lateral / DynamicIslandNav)
// ─────────────────────────────────────────────────────────────────────────────
type ModuleActionButtonProps = {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  className?: string;
};

export function ModuleActionButton({
  label,
  icon,
  onClick,
  className,
}: ModuleActionButtonProps) {
  return (
    <div className="fixed top-[54px] left-[12px] z-30 hidden md:block group">
      <button
        type="button"
        onClick={onClick}
        style={{ borderRadius: "9999px" }}
        className={cn(
          "h-9 w-9 flex items-center justify-center rounded-full p-0",
          "glass-dock border border-white/20 text-white",
          "cursor-pointer hover:bg-white/15 hover:border-white/35",
          "transition-all duration-200 shadow-[0_4px_12px_rgba(0,0,0,0.25)]",
          className
        )}
      >
        {icon && <span className="shrink-0">{icon}</span>}
      </button>
      {/* Tooltip */}
      <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 scale-90 opacity-0 pointer-events-none group-hover:scale-100 group-hover:opacity-100 transition-all duration-150 ease-out z-40 bg-neutral-900/95 backdrop-blur-md border border-white/10 text-white text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap shadow-md">
        {label}
      </div>
    </div>
  );
}
