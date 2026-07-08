/**
 * DynamicIslandNav — Sidebar flutuante estilo Dynamic Island
 * Grudada na borda esquerda (left-[4px]), posição fixed, glassmorphism.
 * Colapsa em ícones (52px), expande ao hover mostrando labels (184px).
 *
 * MODO PRINCIPAL: mostra todos os HUB_ITEMS.
 * MODO CONTEXTUAL: quando contextItems.length > 0, substitui os hub items
 *   pelos items contextuais do módulo atual + botão "← Voltar".
 *   Ao colapsar, só ícones — sem submenus aninhados que quebravam o layout.
 */
import { Link, useRouterState, useParams } from "@tanstack/react-router";
import { type ComponentType, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Loader2, ChevronLeft } from "lucide-react";
import { useAgency, getModuleName } from "@/lib/agency-context";
import { useSidebarStore } from "@/lib/sidebar-store";
import { type ContextItem } from "./SlimSidebar";

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;

export type IslandNavItem = {
  type?: "link" | "header";
  to?: string;
  label: string;
  icon?: Icon;
  exact?: boolean;
  adminOnly?: boolean;
  matchPaths?: string[];
  badge?: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function isItemActive(item: IslandNavItem, pathname: string, base: string): boolean {
  if (!item.to) return false;
  const fullTo = item.to ? `${base}/${item.to}`.replace(/\/$/, "") : base;
  const directMatch = item.exact
    ? pathname === fullTo || pathname === base
    : pathname.startsWith(fullTo);
  if (directMatch) return true;
  if (item.matchPaths) {
    return item.matchPaths.some((p) => pathname.startsWith(`${base}/${p}`));
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Single Nav Item (hub mode)
// ─────────────────────────────────────────────────────────────────────────────
function IslandItem({
  item,
  base,
  expanded,
  isActive,
  isPending,
}: {
  item: IslandNavItem;
  base: string;
  expanded: boolean;
  isActive: boolean;
  isPending: boolean;
}) {
  const ItemIcon = item.icon;
  const href = item.to ? `${base}/${item.to}` : base;

  return (
    <Link
      to={href as any}
      title={!expanded ? item.label : undefined}
      className={cn(
        "relative flex h-9 w-full items-center gap-3 rounded-full px-2.5 transition-all duration-200 overflow-hidden shrink-0",
        "hover:bg-white/10",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30",
        isActive
          ? "bg-white/15 text-white"
          : "text-white/60 hover:text-white/90"
      )}
    >
      {/* Active indicator line */}
      {isActive && (
        <motion.span
          layoutId="island-active-indicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full bg-brand"
          transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
        />
      )}

      {/* Icon */}
      <span className="relative shrink-0 flex items-center justify-center w-5 h-5">
        {ItemIcon &&
          (isPending ? (
            <Loader2 className="h-[15px] w-[15px] animate-spin" strokeWidth={1.8} />
          ) : (
            <ItemIcon
              className={cn(
                "h-[15px] w-[15px] transition-transform duration-150",
                isActive && "scale-110"
              )}
              strokeWidth={isActive ? 2.2 : 1.6}
            />
          ))}
        {/* Badge */}
        {item.badge && item.badge > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[8px] font-bold text-white leading-none">
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        ) : null}
      </span>

      {/* Label — só visível quando expandido */}
      <AnimatePresence>
        {expanded && (
          <motion.span
            key="label"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="truncate text-[12px] font-medium leading-tight whitespace-nowrap"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Contextual Item (context mode — flat, no nesting)
// ─────────────────────────────────────────────────────────────────────────────
function ContextualItem({
  item,
  expanded,
  pathname,
}: {
  item: ContextItem;
  expanded: boolean;
  pathname: string;
}) {
  const isActive = item.exact
    ? pathname === item.to || pathname === item.to.replace(/\/$/, "")
    : pathname.startsWith(item.to);
  const ItemIcon = item.icon;

  return (
    <Link
      to={item.to as any}
      title={!expanded ? item.label : undefined}
      className={cn(
        "relative flex h-9 w-full items-center gap-3 rounded-full px-2.5 transition-all duration-200 overflow-hidden shrink-0",
        "hover:bg-white/10",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30",
        isActive
          ? "bg-white/15 text-white"
          : "text-white/55 hover:text-white/90"
      )}
    >
      {isActive && (
        <motion.span
          layoutId="island-ctx-active"
          className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full bg-brand"
          transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
        />
      )}
      <span className="shrink-0 flex items-center justify-center w-5 h-5">
        {ItemIcon && (
          <ItemIcon
            className={cn(
              "h-[14px] w-[14px]",
              isActive ? "text-brand" : "text-white/55"
            )}
            strokeWidth={isActive ? 2.2 : 1.6}
          />
        )}
      </span>
      <AnimatePresence>
        {expanded && (
          <motion.span
            key="ctx-label"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.13, ease: "easeOut" }}
            className="truncate text-[11px] font-medium leading-tight whitespace-nowrap"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export function DynamicIslandNav({
  items,
  footer,
  brand,
  hidden: hiddenProp = false,
  contextItems: propContextItems,
}: {
  items: IslandNavItem[];
  footer?: React.ReactNode;
  brand?: React.ReactNode;
  hidden?: boolean;
  contextItems?: ContextItem[];
}) {
  const { slug } = useParams({ strict: false }) as { slug?: string };
  const base = slug ? `/agency/${slug}` : "";

  const { pathname, pendingLocation } = useRouterState({
    select: (s: any) => ({
      pathname: s.location?.pathname.replace(/\/$/, "") || "/",
      pendingLocation: s.pendingLocation
        ? s.pendingLocation.pathname.replace(/\/$/, "") || "/"
        : null,
    }),
  });

  const [hovered, setHovered] = useState(false);
  const [forceMainMode, setForceMainMode] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  const handleMouseEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => setHovered(false), 180);
  };

  const { contextItems: storeContextItems } = useSidebarStore();
  // Prop takes priority; fallback to store
  const contextItems =
    propContextItems && propContextItems.length > 0 ? propContextItems : storeContextItems;

  // MODO CONTEXTUAL: quando há items de contexto E o usuário não clicou em "Voltar"
  const isContextMode = contextItems.length > 0 && !forceMainMode;

  // Reseta o forceMainMode quando o pathname muda de módulo (navegação entre CRM, Viagens, etc.)
  // Isso garante que ao entrar num módulo diferente, o contextual volta automaticamente
  useEffect(() => {
    setForceMainMode(false);
  }, [pathname]);

  const navItems = items.filter((i) => i.type !== "header" && i.to !== undefined);

  if (hiddenProp) return null;

  return (
    <div className="flex gap-2 relative z-40 hidden md:flex h-full py-4 ml-1">
      {/* ── MODO PRINCIPAL (Sempre Visível) ──────────────────────── */}
      <motion.aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        initial={{ opacity: 0, x: -8 }}
        animate={{ 
          width: hovered 
            ? "var(--shell-primary-nav-expanded-width)" 
            : "var(--shell-primary-nav-width)" 
        }}
        transition={{ type: "spring", bounce: 0.1, duration: 0.35 }}
        className={cn(
          "flex flex-col z-50 pointer-events-auto",
          "glass-sidebar",
          "rounded-[14px]",
          "shadow-[2px_4px_32px_rgba(0,0,0,0.30)]",
          "py-4 gap-0.5 overflow-hidden",
        )}
        style={{ minHeight: 0 }}
      >
        <div className="no-scrollbar flex-1 flex flex-col gap-0.5 overflow-y-auto px-1.5">
          {navItems.map((item) => {
            const active = isItemActive(item, pathname, base);
            const pending =
              pendingLocation !== null && item.to
                ? item.exact
                  ? pendingLocation === `${base}/${item.to}`.replace(/\/$/, "")
                  : pendingLocation.startsWith(`${base}/${item.to}`)
                : false;
            return (
              <IslandItem
                key={item.to}
                item={item}
                base={base}
                expanded={hovered}
                isActive={active}
                isPending={pending}
              />
            );
          })}
        </div>
        {footer && (
          <div className="shrink-0 pt-1 border-t border-white/8 px-1.5">
            {footer}
          </div>
        )}
      </motion.aside>

      {/* ── MODO CONTEXTUAL (Coluna secundária, quando existir) ───── */}
      <AnimatePresence>
        {isContextMode && (
          <motion.aside
            key="ctx-nav"
            initial={{ opacity: 0, x: -16, width: 0 }}
            animate={{ opacity: 1, x: 0, width: "var(--shell-context-nav-width)" }}
            exit={{ opacity: 0, x: -16, width: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className={cn(
              "flex flex-col z-40 pointer-events-auto",
              "glass-sidebar",
              "rounded-[14px]",
              "py-4 gap-0.5 overflow-hidden",
            )}
            style={{ minHeight: 0 }}
          >
            <div className="no-scrollbar flex-1 flex flex-col gap-0.5 overflow-y-auto px-2">
              <div className="px-2 pb-2 mb-2 border-b border-white/10 shrink-0">
                <span className="text-[11px] font-bold text-white/60 uppercase tracking-widest leading-tight block">
                  Menu de Contexto
                </span>
              </div>
              {contextItems.map((ctxItem) => (
                <ContextualItem
                  key={ctxItem.to}
                  item={ctxItem}
                  expanded={true}
                  pathname={pathname}
                />
              ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
