/**
 * DynamicIslandNav — Sidebar flutuante estilo Dynamic Island
 * Grudada na borda esquerda (left-0), posição fixed, glassmorphism.
 * Colapsa em ícones (52px), expande ao hover mostrando labels (184px).
 * Ícone ativo tem indicador visual brand. Sub-menu animado no hover/clique.
 */
import { Link, useRouterState, useParams } from "@tanstack/react-router";
import { type ComponentType, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useAgency, getModuleName } from "@/lib/agency-context";
import { useSidebarStore } from "@/lib/sidebar-store";

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
// Single Nav Item
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
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export function DynamicIslandNav({
  items,
  footer,
  brand,
  hidden: hiddenProp = false,
}: {
  items: IslandNavItem[];
  footer?: React.ReactNode;
  brand?: React.ReactNode;
  hidden?: boolean;
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
  const hoverTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  const handleMouseEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => setHovered(false), 180);
  };

  const { contextItems } = useSidebarStore();
  const navItems = items.filter((i) => i.type !== "header" && i.to !== undefined);

  if (hiddenProp) return null;

  return (
    <motion.aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0, width: hovered ? 184 : 52 }}
      transition={{ type: "spring", bounce: 0.1, duration: 0.35 }}
      className={cn(
        "fixed left-[4px] top-1/2 -translate-y-1/2 z-40 flex flex-col",
        "glass-sidebar",
        "rounded-l-[14px] rounded-r-[28px]",
        "shadow-[2px_4px_32px_rgba(0,0,0,0.30)]",
        "py-4 gap-0.5 overflow-hidden",
        "hidden md:flex",
      )}
      aria-label="Navegação principal"
      style={{ minHeight: 0 }}
    >
      {/* Nav items */}
      <nav className="no-scrollbar flex-1 flex flex-col gap-0.5 overflow-y-auto px-1.5">
        {navItems.map((item) => {
          const active = isItemActive(item, pathname, base);
          const pending =
            pendingLocation !== null && item.to
              ? item.exact
                ? pendingLocation === `${base}/${item.to}`.replace(/\/$/, "")
                : pendingLocation.startsWith(`${base}/${item.to}`)
              : false;

          return (
            <div key={item.to} className="flex flex-col gap-0.5 shrink-0">
              <IslandItem
                item={item}
                base={base}
                expanded={hovered}
                isActive={active}
                isPending={pending}
              />

              {/* Contextual submenus / submodules */}
              {active && contextItems.length > 0 && (
                <div className="flex flex-col gap-0.5 pl-3 mt-0.5 border-l border-white/5 ml-3">
                  {contextItems.map((ctxItem) => {
                    const ctxActive = pathname.startsWith(ctxItem.to);
                    const CtxIcon = ctxItem.icon;
                    return (
                      <Link
                        key={ctxItem.to}
                        to={ctxItem.to}
                        className={cn(
                          "group/ctx relative flex h-7 items-center gap-2 rounded-full px-2 transition-all duration-200 overflow-hidden shrink-0",
                          ctxActive
                            ? "bg-white/10 text-white font-semibold"
                            : "text-white/40 hover:text-white/70 hover:bg-white/5"
                        )}
                        title={!hovered ? ctxItem.label : undefined}
                      >
                        {CtxIcon && (
                          <CtxIcon 
                            className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              ctxActive ? "text-brand" : "text-white/40 group-hover/ctx:text-white/70"
                            )} 
                            strokeWidth={ctxActive ? 2.2 : 1.8} 
                          />
                        )}
                        {hovered && (
                          <span className="text-[10px] truncate leading-none">
                            {ctxItem.label}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer (logout) */}
      {footer && (
        <div className="shrink-0 pt-1 border-t border-white/8 px-1.5">
          {footer}
        </div>
      )}
    </motion.aside>
  );
}
