import { Link, useRouterState } from "@tanstack/react-router";
import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Loader2, X, ChevronRight } from "lucide-react";

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;

export type SlimSidebarItem = {
  type?: "link" | "header";
  to?: string;
  label: string;
  icon?: Icon;
  exact?: boolean;
  adminOnly?: boolean;
  /** Extra path prefixes that also make this item appear "active" */
  matchPaths?: string[];
};

export type ContextItem = {
  label: string;
  to: string;
  icon: Icon;
  exact?: boolean;
  adminOnly?: boolean;
};

export type AiAction = {
  label: string;
  prompt: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isItemActive(item: SlimSidebarItem, pathname: string): boolean {
  if (!item.to) return false;
  const normalized = item.to.replace(/\/$/, "") || "/";
  const directMatch = item.exact
    ? pathname === normalized
    : pathname === normalized || pathname.startsWith(`${normalized}/`);
  if (directMatch) return true;
  if (item.matchPaths) {
    return item.matchPaths.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );
  }
  return false;
}

function isContextItemActive(item: ContextItem, pathname: string): boolean {
  const normalized = item.to.replace(/\/$/, "") || "/";
  return item.exact
    ? pathname === normalized
    : pathname === normalized || pathname.startsWith(`${normalized}/`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function SlimSidebar({
  brand,
  items,
  mobileItems,
  footer,
  mobileOpen,
  onMobileClose,
  contextItems = [],
  contextTitle,
}: {
  brand: ReactNode;
  /** Desktop: hub icon bar (9 items). Mobile fallback if mobileItems not provided. */
  items: SlimSidebarItem[];
  /** Mobile drawer full list (with section headers). */
  mobileItems?: SlimSidebarItem[];
  footer?: ReactNode;
  isPinned?: boolean;
  onTogglePin?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  contextItems?: ContextItem[];
  contextTitle?: string;
  aiActions?: AiAction[];
}) {
  const { pathname, pendingLocation } = useRouterState({
    select: (s: any) => ({
      pathname: s.location?.pathname.replace(/\/$/, "") || "/",
      pendingLocation: s.pendingLocation
        ? s.pendingLocation.pathname.replace(/\/$/, "") || "/"
        : null,
    }),
  });

  const hasContext = contextItems.length > 0;
  const drawerItems = mobileItems ?? items;

  // ── Mobile drawer nav item renderer ──────────────────────────────────────
  const renderMobileItem = (item: SlimSidebarItem, idx: number) => {
    if (item.type === "header") {
      return (
        <li key={`h-${idx}`} className="px-1 pb-1 pt-4 first:pt-2">
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70">
            {item.label}
          </span>
        </li>
      );
    }

    const active = isItemActive(item, pathname);
    const isPending =
      pendingLocation !== null && item.to
        ? item.exact
          ? pendingLocation === (item.to.replace(/\/$/, "") || "/")
          : pendingLocation.startsWith(item.to.replace(/\/$/, ""))
        : false;
    const ItemIcon = item.icon;

    return (
      <li key={`${item.to}-${idx}`}>
        <Link
          to={item.to!}
          onClick={onMobileClose}
          className={cn(
            "group/item relative flex h-9 w-full items-center gap-3 rounded-md px-3 text-muted-foreground transition-all",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            active && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold",
          )}
        >
          {ItemIcon && (
            isPending ? (
              <Loader2 className="h-[15px] w-[15px] shrink-0 animate-spin" strokeWidth={1.8} />
            ) : (
              <ItemIcon className="h-[15px] w-[15px] shrink-0" strokeWidth={1.8} />
            )
          )}
          <span className="truncate text-xs font-medium">{item.label}</span>
        </Link>
      </li>
    );
  };

  return (
    <>
      {/* ── Mobile overlay ──────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-overlay md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile Drawer ───────────────────────────────────────────────── */}
      <aside
        className={cn(
          "flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
          "fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-200 ease-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={!mobileOpen}
      >
        {/* Brand row */}
        <div className="flex h-[var(--header-h,58px)] items-center gap-3 border-b border-sidebar-border px-3">
          {brand}
          <span className="text-sm font-semibold text-sidebar-foreground">TravelOS</span>
          <button
            onClick={onMobileClose}
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="no-scrollbar flex-1 overflow-y-auto px-2 py-3" aria-label="Navegação principal">
          <ul className="space-y-0.5">
            {drawerItems.map((item, idx) => renderMobileItem(item, idx))}
          </ul>
        </nav>

        {footer && (
          <div className="border-t border-sidebar-border p-2 flex justify-start">
            {footer}
          </div>
        )}
      </aside>

      {/* ── Desktop 2-Column System ─────────────────────────────────────── */}
      <div className="hidden md:flex h-screen shrink-0 z-20 select-none">
        {/* Left: Global Icon Bar (56px) */}
        <aside
          className="relative flex h-full w-[56px] shrink-0 flex-col items-center border-r border-sidebar-border bg-sidebar"
          aria-label="Módulos principais"
        >
          {/* Logo */}
          <div className="flex h-[58px] w-full shrink-0 items-center justify-center border-b border-sidebar-border">
            {brand}
          </div>

          {/* Hub Icons */}
          <nav className="no-scrollbar flex flex-1 flex-col items-center gap-1 overflow-y-auto py-3 w-full px-1.5">
            {items
              .filter((i) => i.type !== "header" && i.to !== undefined)
              .map((item) => {
                const active = isItemActive(item, pathname);
                const isPending =
                  pendingLocation !== null && item.to
                    ? item.exact
                      ? pendingLocation === (item.to.replace(/\/$/, "") || "/")
                      : pendingLocation.startsWith(item.to.replace(/\/$/, ""))
                    : false;
                const ItemIcon = item.icon;

                return (
                  <Link
                    key={item.to}
                    to={item.to!}
                    title={item.label}
                    className={cn(
                      "relative flex h-9 w-full items-center justify-center rounded-md text-muted-foreground transition-all duration-150",
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                      active && [
                        "bg-sidebar-accent text-sidebar-accent-foreground",
                        "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-0.5 before:rounded-r before:bg-brand",
                      ],
                    )}
                  >
                    {ItemIcon && (
                      isPending ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" strokeWidth={1.8} />
                      ) : (
                        <ItemIcon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-transform duration-150",
                            active && "scale-110",
                          )}
                          strokeWidth={active ? 2.2 : 1.8}
                        />
                      )
                    )}
                  </Link>
                );
              })}
          </nav>

          {/* Footer (logout button etc.) */}
          {footer && (
            <div className="flex w-full shrink-0 items-center justify-center border-t border-sidebar-border py-2">
              {footer}
            </div>
          )}
        </aside>

        {/* Right: Contextual Panel (220px, animated in/out) */}
        <div
          className={cn(
            "flex flex-col border-r border-border/60 bg-surface overflow-hidden transition-all duration-200 ease-in-out",
            hasContext ? "w-[220px]" : "w-0 border-r-0",
          )}
          aria-label="Navegação contextual"
        >
          {hasContext && (
            <>
              {/* Context header */}
              <div className="flex h-[58px] shrink-0 items-center gap-2 border-b border-border/60 px-4">
                {contextTitle && (
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 truncate">
                    {contextTitle}
                  </span>
                )}
              </div>

              {/* Context nav items */}
              <nav className="no-scrollbar flex-1 overflow-y-auto px-2 py-3">
                <ul className="space-y-0.5">
                  {contextItems.map((item) => {
                    const active = isContextItemActive(item, pathname);
                    const ItemIcon = item.icon;

                    return (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          className={cn(
                            "group/ctx relative flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-muted-foreground transition-all duration-150",
                            "hover:bg-accent hover:text-accent-foreground",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            active && [
                              "bg-accent text-accent-foreground font-semibold",
                              "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-0.5 before:rounded-r before:bg-brand",
                            ],
                          )}
                        >
                          <ItemIcon
                            className={cn(
                              "h-3.5 w-3.5 shrink-0 transition-colors",
                              active ? "text-brand" : "text-muted-foreground/70 group-hover/ctx:text-foreground",
                            )}
                            strokeWidth={active ? 2.2 : 1.8}
                          />
                          <span className="truncate text-[12px] leading-tight">{item.label}</span>
                          {active && (
                            <ChevronRight className="ml-auto h-3 w-3 shrink-0 text-brand/60" strokeWidth={2} />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </>
          )}
        </div>
      </div>
    </>
  );
}
