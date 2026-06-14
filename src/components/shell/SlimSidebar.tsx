import { Link, useRouterState } from "@tanstack/react-router";
import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Loader2, Pin, PinOff } from "lucide-react";

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;

export type SlimSidebarItem = {
  to: string;
  label: string;
  icon: Icon;
  exact?: boolean;
};

export function SlimSidebar({
  brand,
  items,
  footer,
  isPinned,
  onTogglePin,
}: {
  brand: ReactNode;
  items: SlimSidebarItem[];
  footer?: ReactNode;
  isPinned?: boolean;
  onTogglePin?: () => void;
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
    <aside
      className={cn(
        "slim-sidebar group/sidebar relative flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out z-20",
        isPinned
          ? "w-[var(--sidebar-w-expanded)]"
          : "w-[var(--sidebar-w-collapsed)] hover:w-[var(--sidebar-w-expanded)] focus-within:w-[var(--sidebar-w-expanded)]",
      )}
    >
      <div className="flex h-[var(--header-h)] items-center border-b border-sidebar-border px-2">
        {brand}
      </div>

      <nav
        className="no-scrollbar flex-1 overflow-y-auto px-1.5 py-2"
        aria-label="Navegação principal"
      >
        <ul className="space-y-0.5">
          {items.map((item) => {
            const normalizedTo = item.to.replace(/\/$/, "") || "/";
            const active = item.exact
              ? pathname === normalizedTo
              : pathname === normalizedTo || pathname.startsWith(`${normalizedTo}/`);
            const isPending =
              pendingLocation &&
              (item.exact
                ? pendingLocation === normalizedTo
                : pendingLocation === normalizedTo ||
                  pendingLocation.startsWith(`${normalizedTo}/`));
            const ItemIcon = item.icon;

            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  title={item.label}
                  className={cn(
                    "group/item relative flex h-8 items-center gap-3 overflow-hidden rounded-lg px-2 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                    active && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold",
                  )}
                >
                  {isPending ? (
                    <Loader2
                      className="h-[15px] w-[15px] shrink-0 animate-spin"
                      strokeWidth={1.5}
                    />
                  ) : (
                    <ItemIcon className="h-[15px] w-[15px] shrink-0" strokeWidth={1.5} />
                  )}
                  <span
                    className={cn(
                      "min-w-0 translate-x-1 truncate transition duration-200",
                      isPinned
                        ? "translate-x-0 opacity-100"
                        : "opacity-0 group-hover/sidebar:translate-x-0 group-hover/sidebar:opacity-100 group-focus-within/sidebar:translate-x-0 group-focus-within/sidebar:opacity-100",
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {footer && <div className="border-t border-sidebar-border px-1.5 py-2">{footer}</div>}
      <div className="border-t border-sidebar-border px-1.5 py-2">
        <button
          onClick={onTogglePin}
          className="flex h-8 w-full items-center gap-3 overflow-hidden rounded-lg px-2 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          title={isPinned ? "Desafixar menu" : "Fixar menu"}
        >
          {isPinned ? (
            <PinOff className="h-[15px] w-[15px] shrink-0" />
          ) : (
            <Pin className="h-[15px] w-[15px] shrink-0" />
          )}
          <span
            className={cn(
              "translate-x-1 truncate transition duration-200",
              isPinned
                ? "translate-x-0 opacity-100"
                : "opacity-0 group-hover/sidebar:translate-x-0 group-hover/sidebar:opacity-100 group-focus-within/sidebar:translate-x-0 group-focus-within/sidebar:opacity-100",
            )}
          >
            {isPinned ? "Desafixar" : "Fixar menu"}
          </span>
        </button>
      </div>
    </aside>
  );
}
