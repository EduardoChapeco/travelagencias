import { Link, useRouterState } from "@tanstack/react-router";
import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;

export type SlimSidebarItem = {
  type?: "link" | "header";
  to?: string;
  label: string;
  icon?: Icon;
  exact?: boolean;
  adminOnly?: boolean;
};

export function SlimSidebar({
  brand,
  items,
  footer,
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
    <aside className="slim-sidebar relative flex h-screen w-[56px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground z-20">
      <div className="flex h-[var(--header-h)] items-center justify-center border-b border-sidebar-border px-2">
        {brand}
      </div>

      <nav
        className="no-scrollbar flex-1 overflow-y-auto px-1 py-3"
        aria-label="Navegação principal"
      >
        <ul className="space-y-2">
          {items.map((item) => {
            if (item.type === "header") {
              return null; // Keep it clean, hide headers in the ultrafina dock
            }

            const normalizedTo = item.to!.replace(/\/$/, "") || "/";
            const active = item.exact
              ? pathname === normalizedTo
              : pathname === normalizedTo || pathname.startsWith(`${normalizedTo}/`);
            const isPending =
              pendingLocation &&
              (item.exact
                ? pendingLocation === normalizedTo
                : pendingLocation === normalizedTo ||
                  pendingLocation.startsWith(`${normalizedTo}/`));
            const ItemIcon = item.icon!;

            return (
              <li key={item.to} className="flex justify-center">
                <Link
                  to={item.to!}
                  title={item.label}
                  className={cn(
                    "group/item relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                    active &&
                      "bg-sidebar-accent text-sidebar-accent-foreground font-semibold border border-border/70",
                  )}
                >
                  {isPending ? (
                    <Loader2
                      className="h-[15px] w-[15px] shrink-0 animate-spin"
                      strokeWidth={1.8}
                    />
                  ) : (
                    <ItemIcon className="h-[15px] w-[15px] shrink-0" strokeWidth={1.8} />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {footer && (
        <div className="border-t border-sidebar-border p-1.5 flex justify-center">{footer}</div>
      )}
    </aside>
  );
}
