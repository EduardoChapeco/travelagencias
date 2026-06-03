import { Link, useParams, useRouterState } from "@tanstack/react-router";
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
import { useAgency } from "@/lib/agency-context";
import { signOut } from "@/lib/auth";

type NavItem = { label: string; segment: string; icon: typeof LayoutDashboard };

const items: NavItem[] = [
  { label: "Dashboard", segment: "", icon: LayoutDashboard },
  { label: "CRM", segment: "crm", icon: Users },
  { label: "Cotações", segment: "proposals", icon: FileText },
  { label: "Viagens", segment: "trips", icon: Luggage },
  { label: "Embarques", segment: "boarding", icon: Plane },
  { label: "Vouchers", segment: "vouchers", icon: Ticket },
  { label: "Contratos", segment: "contracts", icon: ScrollText },
  { label: "Suporte", segment: "support", icon: LifeBuoy },
  { label: "Financeiro", segment: "financial", icon: Wallet },
  { label: "Roteiros em Grupo", segment: "group-tours", icon: Bus },
  { label: "Vistos", segment: "visas", icon: Globe2 },
  { label: "Corporativo", segment: "corporate", icon: Building2 },
  { label: "Clientes", segment: "clients", icon: UserRound },
  { label: "Minha Empresa", segment: "company", icon: Store },
  { label: "Base de Conhecimento", segment: "knowledge", icon: BookOpen },
  { label: "Configurações", segment: "settings", icon: Settings },
];

export function AppSidebar() {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const expanded = pinned || hovered;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { agency } = useAgency();
  // Try reading slug from route params; falls back to agency context.
  const params = useParams({ strict: false }) as { slug?: string };
  const slug = params.slug ?? agency?.slug;

  if (!slug) return null;
  const base = `/agency/${slug}`;

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: expanded ? "var(--sidebar-w-expanded)" : "var(--sidebar-w-collapsed)" }}
      className="relative flex h-screen shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out"
    >
      <div className="flex h-12 items-center gap-2 px-3">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold"
          style={{ background: "var(--color-brand)", color: "var(--color-brand-foreground)" }}
        >
          {(agency?.name ?? "T").charAt(0).toUpperCase()}
        </div>
        {expanded && (
          <span className="truncate text-sm font-semibold tracking-tight">
            {agency?.name ?? "TravelOS"}
          </span>
        )}
      </div>

      <nav className="no-scrollbar flex-1 overflow-y-auto px-2 py-1">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const to = item.segment ? `${base}/${item.segment}` : base;
            const active =
              item.segment === ""
                ? pathname === base || pathname === `${base}/`
                : pathname.startsWith(to);
            const Icon = item.icon;
            return (
              <li key={item.segment || "dashboard"}>
                <Link
                  to={to}
                  className={cn(
                    "group relative flex h-9 items-center gap-3 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-surface-alt hover:text-foreground",
                    active && "bg-surface-alt text-foreground",
                  )}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r"
                      style={{ background: "var(--color-brand)" }}
                    />
                  )}
                  <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                  {expanded && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border px-2 py-2">
        <button
          onClick={() => setPinned((v) => !v)}
          className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-xs text-muted-foreground hover:bg-surface-alt hover:text-foreground"
        >
          {pinned ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
          {expanded && <span>{pinned ? "Recolher" : "Fixar"}</span>}
        </button>
        <div className="mt-1 flex h-9 items-center gap-2 rounded-md px-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-alt text-xs font-semibold">
            A
          </div>
          {expanded && (
            <button
              onClick={() => signOut().then(() => (window.location.href = "/auth/login"))}
              className="ml-auto text-muted-foreground hover:text-foreground"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
