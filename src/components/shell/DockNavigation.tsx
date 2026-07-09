import { Link, useRouterState } from "@tanstack/react-router";
import { type ComponentType, type ReactNode, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Loader2, ChevronLeft, Sparkles } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;

export type SlimSidebarItem = {
  type?: "link" | "header";
  to?: string;
  label: string;
  icon?: Icon;
  exact?: boolean;
  adminOnly?: boolean;
  matchPaths?: string[];
  badge?: number;
};

export type ContextItem = {
  label: string;
  to: string;
  icon: Icon;
  exact?: boolean;
  adminOnly?: boolean;
};

function isItemActive(item: SlimSidebarItem, pathname: string): boolean {
  if (!item.to) return false;
  const normalized = item.to.replace(/\/$/, "") || "/";
  const directMatch = item.exact
    ? pathname === normalized
    : pathname === normalized || pathname.startsWith(`${normalized}/`);
  if (directMatch) return true;
  if (item.matchPaths) {
    return item.matchPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// DockItem — renders a single icon button with hover magnification
// ─────────────────────────────────────────────────────────────────────────────
function DockItem({
  item,
  pathname,
  pendingLocation,
  isVertical,
  size = "md",
}: {
  item: SlimSidebarItem;
  pathname: string;
  pendingLocation: string | null;
  isVertical: boolean;
  size?: "sm" | "md";
}) {
  const [hovered, setHovered] = useState(false);
  const active = isItemActive(item, pathname);
  const isPending = pendingLocation ? isItemActive(item, pendingLocation) : false;
  const Icon = item.icon!;

  const baseSize = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={item.to!}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={cn(
            "relative flex shrink-0 items-center justify-center transition-all duration-200",
            baseSize,
            active
              ? "rounded-2xl bg-white/20 text-white"
              : "rounded-full text-white/70 hover:text-white hover:bg-white/10 hover:rounded-2xl",
            isPending && "opacity-60 animate-pulse",
            hovered && !active && "scale-110",
          )}
          style={{
            transform: hovered && !active ? "scale(1.1)" : active ? "scale(1.05)" : "scale(1)",
          }}
        >
          {isPending ? (
            <Loader2 className={cn(iconSize, "animate-spin")} />
          ) : (
            <Icon
              className={cn(iconSize, "transition-all duration-200")}
              strokeWidth={active ? 2.5 : 2}
            />
          )}

          {/* Unread badge */}
          {!!item.badge && item.badge > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white leading-none border-2 border-transparent">
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          )}

          {/* Active indicator */}
          {active && (
            <span
              className={cn(
                "absolute rounded-full bg-white",
                isVertical
                  ? "-right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5"
                  : "-bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5",
              )}
            />
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent
        side={isVertical ? "right" : "top"}
        sideOffset={12}
        className="rounded-[var(--radius-card)] px-3 py-1.5 text-xs font-semibold bg-black/80 backdrop-blur-md text-white border border-white/10"
      >
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FloatingDock
// isHome=true  → horizontal pill, fixed bottom-center (macOS style)
// isHome=false → vertical sidebar, fixed left edge (grudada na esquerda)
// ─────────────────────────────────────────────────────────────────────────────
export function DockNavigation({
  items,
  contextItems = [],
  footer,
  isHome = false,
}: {
  items: SlimSidebarItem[];
  contextItems?: ContextItem[];
  footer?: ReactNode;
  isHome?: boolean;
}) {
  const { pathname, pendingLocation } = useRouterState({
    select: (s: any) => ({
      pathname: s.location?.pathname.replace(/\/$/, "") || "/",
      pendingLocation: s.pendingLocation
        ? s.pendingLocation.pathname.replace(/\/$/, "") || "/"
        : null,
    }),
  });

  const [showContextOnly, setShowContextOnly] = useState(true);

  // Toda vez que a rota principal muda, foca nos submenus automaticamente
  useEffect(() => {
    setShowContextOnly(true);
  }, [pathname]);

  const dockItems = items.filter((i) => i.type !== "header");
  const hasContext = contextItems.length > 0;
  const displayItems = (hasContext && showContextOnly) ? (contextItems as SlimSidebarItem[]) : dockItems;

  if (isHome) {
    // ── Horizontal dock — bottom center ────────────────────────────────────
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <TooltipProvider delayDuration={80}>
          <div className="pointer-events-auto flex items-center gap-1.5 px-4 py-3 rounded-full bg-black/30 backdrop-blur-2xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            {dockItems.map((item, idx) => (
              <DockItem
                key={`${item.to}-${idx}`}
                item={item}
                pathname={pathname}
                pendingLocation={pendingLocation}
                isVertical={false}
              />
            ))}

            {/* Divider */}
            <div className="w-[1px] h-8 bg-white/15 mx-1 shrink-0" />

            {/* Footer (logout) */}
            <div className="shrink-0">{footer}</div>
          </div>
        </TooltipProvider>
      </div>
    );
  }

  // ── Vertical dock (md+) & Horizontal Bottom Bar (mobile) ───────────────────
  // Structural (not fixed). Handled by AppShell's flex layout.
  return (
    <div className="w-full md:w-[72px] h-[72px] md:h-full z-30 flex md:flex-col items-center justify-between px-4 md:px-0 py-0 md:py-6 bg-black/80 md:bg-black/10 dark:md:bg-black/30 backdrop-blur-2xl border-t md:border-t-0 md:border-r border-white/10 md:border-white/5 shadow-none flex-row shrink-0 relative">
      <TooltipProvider delayDuration={80}>
        {/* Top: Back button when context mode is active */}
        <div className="flex md:flex-col items-center gap-2 flex-row w-full md:w-auto">
          {hasContext && showContextOnly && (
            <button
              onClick={() => setShowContextOnly(false)}
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10 hover:rounded-2xl transition-all duration-200 cursor-pointer mb-2 border border-white/5"
              title="Voltar para o menu principal"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
            </button>
          )}

          {/* List items (contextual submenus or general modules) */}
          <div className="flex flex-row md:flex-col items-center gap-1.5 md:max-h-[calc(100vh-200px)] overflow-x-auto md:overflow-x-visible md:overflow-y-auto no-scrollbar w-full md:w-auto justify-start md:justify-center px-2 md:px-0">
            {displayItems.map((item, idx) => (
              <DockItem
                key={`${item.to}-${idx}`}
                item={item}
                pathname={pathname}
                pendingLocation={pendingLocation}
                isVertical={true}
              />
            ))}
          </div>
        </div>

        {/* Bottom / Footer (IA + Logout) alinhados na base */}
        <div className="flex flex-row md:flex-col items-center gap-3 md:mt-auto shrink-0 ml-auto md:ml-0">
          {/* Botão de IA integrado e alinhado */}
          <button
            onClick={() => document.dispatchEvent(new CustomEvent("open-ai-chat"))}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 hover:rounded-2xl transition-all duration-200 cursor-pointer"
            title="Falar com IA"
          >
            <Sparkles className="h-5 w-5 text-brand-light animate-pulse-slow" />
          </button>

          {/* Divider */}
          <div className="h-8 md:h-[1px] w-[1px] md:w-8 bg-white/10 shrink-0" />

          {/* Logout button */}
          <div className="shrink-0">{footer}</div>
        </div>
      </TooltipProvider>
    </div>
  );
}
