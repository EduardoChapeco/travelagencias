import { Link, useRouterState } from "@tanstack/react-router";
import { type ComponentType, type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { type SlimSidebarItem, type ContextItem } from "./SlimSidebar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

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
            "relative flex shrink-0 items-center justify-center rounded-full transition-all duration-200",
            baseSize,
            active
              ? "bg-white/20 text-white"
              : "text-white/70 hover:text-white hover:bg-white/10",
            isPending && "opacity-60 animate-pulse",
            hovered && !active && "scale-125",
          )}
          style={{
            transform: hovered && !active ? "scale(1.25)" : active ? "scale(1.05)" : "scale(1)",
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
                  ? "-right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5"
                  : "-bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5",
              )}
            />
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent
        side={isVertical ? "right" : "top"}
        sideOffset={12}
        className="rounded-xl px-3 py-1.5 text-xs font-semibold bg-black/80 backdrop-blur-md text-white border border-white/10"
      >
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FloatingDock
// isHome=true  → horizontal pill, fixed bottom-center (macOS style)
// isHome=false → vertical pill, fixed left-center (over wallpaper)
// ─────────────────────────────────────────────────────────────────────────────
export function FloatingDock({
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

  const dockItems = items.filter((i) => i.type !== "header");

  if (isHome) {
    // ── Horizontal dock — bottom center ────────────────────────────────────
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 hidden md:block pointer-events-none">
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

  // ── Vertical dock — left center ───────────────────────────────────────────
  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 z-30 hidden md:block pointer-events-none">
      <TooltipProvider delayDuration={80}>
        <div className="pointer-events-auto flex flex-col items-center gap-1.5 px-3 py-4 rounded-[28px] bg-black/30 backdrop-blur-2xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.4)] max-h-[calc(100vh-120px)] overflow-y-auto no-scrollbar">
          {/* Hub items */}
          {dockItems.map((item, idx) => (
            <DockItem
              key={`${item.to}-${idx}`}
              item={item}
              pathname={pathname}
              pendingLocation={pendingLocation}
              isVertical={true}
            />
          ))}

          {/* Context items (e.g. trip sub-pages) */}
          {contextItems.length > 0 && (
            <>
              <div className="w-8 h-[1px] bg-white/15 my-1.5 shrink-0" />
              {contextItems.map((item, idx) => (
                <DockItem
                  key={`ctx-${idx}`}
                  item={item as any}
                  pathname={pathname}
                  pendingLocation={pendingLocation}
                  isVertical={true}
                  size="sm"
                />
              ))}
            </>
          )}

          {/* Divider + Footer */}
          <div className="w-8 h-[1px] bg-white/15 my-1.5 shrink-0" />
          <div className="shrink-0">{footer}</div>
        </div>
      </TooltipProvider>
    </div>
  );
}
