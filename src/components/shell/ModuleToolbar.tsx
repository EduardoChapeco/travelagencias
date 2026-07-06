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
        "flex items-center gap-2 w-full min-w-0 h-full",
        className
      )}
    >
      {/* ── Título Pill (esquerda) ──────────────────────────────────── */}
      {title && (
        <span className="shrink-0 text-[13px] font-black tracking-tight text-white/90 px-3 py-1 rounded-full glass-section border border-white/10 hidden sm:inline-flex items-center">
          {title}
        </span>
      )}

      {/* ── Divider após título ─────────────────────────────────────── */}
      {title && (search || filters) && (
        <div className="shrink-0 w-[1px] h-5 bg-white/12 hidden sm:block" />
      )}

      {/* ── Search Input (expande para ocupar espaço disponível) ─────── */}
      {search && (
        <div className="relative flex-1 min-w-0 max-w-[260px]">
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
              "w-full h-8 bg-white/6 border border-white/10 rounded-full",
              "pl-8 pr-8 text-[12px] text-white/85 placeholder:text-white/35",
              "focus:outline-none focus:ring-1 focus:ring-white/20 focus:bg-white/8",
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

      {/* ── Filter Pills ─────────────────────────────────────────────── */}
      {filters && filters.length > 0 && (
        <div className="flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => onFilterChange?.(f.value)}
              className={cn(
                "h-7 px-3 rounded-full text-[11px] font-semibold transition-all duration-150 cursor-pointer shrink-0 flex items-center gap-1 whitespace-nowrap",
                activeFilter === f.value
                  ? "bg-white/18 text-white border border-white/20"
                  : "text-white/55 hover:text-white/80 hover:bg-white/8 border border-transparent"
              )}
            >
              {f.label}
              {f.count !== undefined && (
                <span
                  className={cn(
                    "text-[10px] font-black",
                    activeFilter === f.value ? "text-white/70" : "text-white/35"
                  )}
                >
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Spacer ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0" />

      {/* ── Slot de Ações (direita) ──────────────────────────────────── */}
      {actions && (
        <div className="shrink-0 flex items-center gap-1.5">{actions}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ModuleActionButton — botão de ação contextual FIXO por módulo
// Posição: fixed bottom-[88px] left-[64px] (acima do AI Pill, ao lado do Dynamic Island)
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
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "fixed bottom-[88px] left-[64px] z-30",
        "h-10 px-4 rounded-full",
        "glass-dock border border-white/20",
        "text-white text-[12px] font-bold",
        "flex items-center gap-1.5",
        "cursor-pointer hover:bg-white/15 hover:border-white/35",
        "transition-all duration-200 shadow-[0_4px_16px_rgba(0,0,0,0.3)]",
        "hidden md:flex",
        className
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {label}
    </button>
  );
}
