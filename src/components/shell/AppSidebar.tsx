import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  FileText,
  Luggage,
  Plane,
  Ticket,
  ScrollText,
  LifeBuoy,
  Wallet,
  Bus,
  Globe2,
  Building2,
  UserRound,
  Store,
  BookOpen,
  Settings,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { label: string; to: string; icon: typeof LayoutDashboard };

const AGENCY_SLUG = "demo";

const items: NavItem[] = [
  { label: "Dashboard", to: `/agency/${AGENCY_SLUG}`, icon: LayoutDashboard },
  { label: "CRM", to: `/agency/${AGENCY_SLUG}/crm`, icon: Users },
  { label: "Cotações", to: `/agency/${AGENCY_SLUG}/proposals`, icon: FileText },
  { label: "Viagens", to: `/agency/${AGENCY_SLUG}/trips`, icon: Luggage },
  { label: "Embarques", to: `/agency/${AGENCY_SLUG}/boarding`, icon: Plane },
  { label: "Vouchers", to: `/agency/${AGENCY_SLUG}/vouchers`, icon: Ticket },
  { label: "Contratos", to: `/agency/${AGENCY_SLUG}/contracts`, icon: ScrollText },
  { label: "Suporte", to: `/agency/${AGENCY_SLUG}/support`, icon: LifeBuoy },
  { label: "Financeiro", to: `/agency/${AGENCY_SLUG}/financial`, icon: Wallet },
  { label: "Roteiros em Grupo", to: `/agency/${AGENCY_SLUG}/group-tours`, icon: Bus },
  { label: "Vistos", to: `/agency/${AGENCY_SLUG}/visas`, icon: Globe2 },
  { label: "Corporativo", to: `/agency/${AGENCY_SLUG}/corporate`, icon: Building2 },
  { label: "Clientes", to: `/agency/${AGENCY_SLUG}/clients`, icon: UserRound },
  { label: "Minha Empresa", to: `/agency/${AGENCY_SLUG}/company`, icon: Store },
  { label: "Base de Conhecimento", to: `/agency/${AGENCY_SLUG}/knowledge`, icon: BookOpen },
  { label: "Configurações", to: `/agency/${AGENCY_SLUG}/settings`, icon: Settings },
];

export function AppSidebar() {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const expanded = pinned || hovered;

  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: expanded ? "var(--sidebar-w-expanded)" : "var(--sidebar-w-collapsed)" }}
      className="relative flex h-screen shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out"
    >
      {/* Brand */}
      <div className="flex h-12 items-center gap-2 px-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
          T
        </div>
        {expanded && (
          <span className="truncate text-sm font-semibold tracking-tight">TravelOS</span>
        )}
      </div>

      {/* Nav */}
      <nav className="no-scrollbar flex-1 overflow-y-auto px-2 py-1">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const active =
              item.to === `/agency/${AGENCY_SLUG}`
                ? pathname === item.to
                : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "group relative flex h-9 items-center gap-3 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-surface-alt hover:text-foreground",
                    active && "bg-surface-alt text-foreground",
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-brand" />
                  )}
                  <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                  {expanded && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-2 py-2">
        <button
          onClick={() => setPinned((v) => !v)}
          className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-xs text-muted-foreground hover:bg-surface-alt hover:text-foreground"
        >
          {pinned ? (
            <ChevronsLeft className="h-4 w-4" />
          ) : (
            <ChevronsRight className="h-4 w-4" />
          )}
          {expanded && <span>{pinned ? "Recolher" : "Fixar"}</span>}
        </button>
        <div className="mt-1 flex h-9 items-center gap-2 rounded-md px-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-alt text-xs font-semibold">
            A
          </div>
          {expanded && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">Agente Demo</div>
              <div className="truncate text-[10px] text-muted-foreground">demo@travelos.app</div>
            </div>
          )}
          {expanded && (
            <button className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
