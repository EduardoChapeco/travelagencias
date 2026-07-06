import { Link, useRouterState } from "@tanstack/react-router";
import { type ComponentType, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { type SlimSidebarItem, type ContextItem } from "./SlimSidebar"; // reusing types
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

export function FloatingDock({
  items,
  contextItems = [],
  footer,
}: {
  items: SlimSidebarItem[];
  contextItems?: ContextItem[];
  footer?: ReactNode;
}) {
  const { pathname, pendingLocation } = useRouterState({
    select: (s: any) => ({
      pathname: s.location?.pathname.replace(/\/$/, "") || "/",
      pendingLocation: s.pendingLocation
        ? s.pendingLocation.pathname.replace(/\/$/, "") || "/"
        : null,
    }),
  });

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none hidden md:block">
      <div className="pointer-events-auto flex items-center gap-2 px-3 py-2 bg-surface/80 dark:bg-zinc-950/80 backdrop-blur-3xl border border-white/20 dark:border-white/10 rounded-full shadow-2xl shadow-black/20 transition-all hover:shadow-black/30 hover:border-white/30 hover:bg-surface/90 dark:hover:bg-zinc-950/90 duration-300">
        <TooltipProvider delayDuration={100}>
          {items.filter(i => i.type !== "header").map((item, idx) => {
            const active = isItemActive(item, pathname);
            const isPending = pendingLocation && isItemActive(item, pendingLocation);
            const Icon = item.icon!;

            return (
              <Tooltip key={idx}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.to!}
                    className={cn(
                      "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-300 hover:bg-surface-alt",
                      active
                        ? "bg-brand/10 text-brand shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:scale-110",
                      isPending && "opacity-70 animate-pulse"
                    )}
                  >
                    {isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Icon className={cn("h-5 w-5 transition-all duration-300", active && "scale-110")} strokeWidth={active ? 2.5 : 2} />
                    )}
                    {!!item.badge && item.badge > 0 && (
                      <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive border-2 border-surface" />
                    )}
                    
                    {/* Active indicator dot */}
                    {active && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand" />
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={12} className="rounded-xl px-3 py-1.5 text-xs font-semibold bg-foreground text-background border-none shadow-xl">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>

        {contextItems.length > 0 && (
          <>
            <div className="w-[1px] h-8 bg-border mx-1" />
            <TooltipProvider delayDuration={100}>
              {contextItems.map((item, idx) => {
                const active = isItemActive(item as any, pathname);
                const Icon = item.icon;

                return (
                  <Tooltip key={`ctx-${idx}`}>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.to}
                        className={cn(
                          "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 hover:bg-surface-alt",
                          active
                            ? "bg-brand/10 text-brand shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:scale-105"
                        )}
                      >
                        <Icon className={cn("h-4 w-4 transition-all duration-300", active && "scale-110")} strokeWidth={active ? 2.5 : 2} />
                        {active && (
                          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand" />
                        )}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={12} className="rounded-xl px-3 py-1.5 text-xs font-semibold bg-foreground text-background border-none shadow-xl">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </>
        )}

        <div className="w-[1px] h-8 bg-border mx-1" />
        
        <div className="shrink-0 flex items-center">
          {footer}
        </div>
      </div>
    </div>
  );
}
