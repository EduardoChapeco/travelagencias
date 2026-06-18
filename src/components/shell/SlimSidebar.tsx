import { Link, useRouterState } from "@tanstack/react-router";
import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Loader2, X } from "lucide-react";

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
  mobileOpen,
  onMobileClose,
}: {
  brand: ReactNode;
  items: SlimSidebarItem[];
  footer?: ReactNode;
  isPinned?: boolean;
  onTogglePin?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
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
    <>
      {/* ── Mobile overlay ───────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-overlay md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        className={cn(
          "flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
          // Mobile: fixed drawer deslizante
          "fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: sidebar estática, icon-only 56px
          "md:relative md:inset-auto md:z-20 md:h-screen md:w-[56px] md:shrink-0 md:translate-x-0",
        )}
      >
        {/* Brand row */}
        <div className="flex h-[var(--header-h)] items-center gap-3 border-b border-sidebar-border px-3 md:justify-center md:px-2">
          {brand}
          {/* Nome visível apenas no drawer mobile */}
          <span className="text-sm font-semibold text-sidebar-foreground md:hidden">
            TravelOS
          </span>
          {/* Botão fechar — apenas mobile */}
          <button
            onClick={onMobileClose}
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav
          className="no-scrollbar flex-1 overflow-y-auto px-2 py-3"
          aria-label="Navegação principal"
        >
          <ul className="space-y-0.5">
            {items.map((item, idx) => {
              /* Cabeçalho de seção — visível apenas no drawer mobile */
              if (item.type === "header") {
                return (
                  <li key={`h-${idx}`} className="px-1 pb-1 pt-4 first:pt-2 md:hidden">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70">
                      {item.label}
                    </span>
                  </li>
                );
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
                <li key={item.to}>
                  <Link
                    to={item.to!}
                    title={item.label}
                    onClick={onMobileClose}
                    className={cn(
                      "group/item relative flex h-8 items-center rounded-md text-muted-foreground transition-all",
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                      // Mobile: largura total com label
                      "w-full gap-3 px-3",
                      // Desktop: quadrado 32px apenas com ícone
                      "md:w-8 md:justify-center md:gap-0 md:px-0",
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
                    {/* Label: visível no drawer mobile, oculto no desktop */}
                    <span className="truncate text-xs font-medium md:hidden">
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {footer && (
          <div className="border-t border-sidebar-border p-1.5 flex justify-center">
            {footer}
          </div>
        )}
      </aside>
    </>
  );
}
