import { useNavigate, useParams } from "@tanstack/react-router";
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
} from "lucide-react";
import { useAgency } from "@/lib/agency-context";
import { signOut } from "@/lib/auth";
import { SlimSidebar, type SlimSidebarItem } from "./SlimSidebar";

type NavItem = { label: string; segment: string; icon: typeof LayoutDashboard; exact?: boolean };

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
  { label: "Fornecedores", segment: "suppliers", icon: Store },
  { label: "Minha Empresa", segment: "company", icon: Store },
  { label: "Base de Conhecimento", segment: "knowledge", icon: BookOpen },
  { label: "Configurações", segment: "settings", icon: Settings },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const { agency } = useAgency();
  const params = useParams({ strict: false }) as { slug?: string };
  const slug = params.slug ?? agency?.slug;

  if (!slug) return null;
  const base = `/agency/${slug}`;
  const sidebarItems: SlimSidebarItem[] = items.map((item) => ({
    to: item.segment ? `${base}/${item.segment}` : base,
    label: item.label,
    icon: item.icon,
    exact: item.segment === "",
  }));

  return (
    <SlimSidebar
      items={sidebarItems}
      brand={
        <>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand text-xs font-bold text-brand-foreground">
            {(agency?.name ?? "T").charAt(0).toUpperCase()}
          </div>
          <span className="ml-3 min-w-0 translate-x-1 truncate text-sm font-semibold opacity-0 transition group-hover/sidebar:translate-x-0 group-hover/sidebar:opacity-100 group-focus-within/sidebar:translate-x-0 group-focus-within/sidebar:opacity-100">
            {agency?.name ?? "TravelOS"}
          </span>
        </>
      }
      footer={
        <button
          onClick={() => signOut().then(() => navigate({ to: "/auth/login", replace: true }))}
          className="flex h-9 w-full items-center gap-3 overflow-hidden rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          title="Sair"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          <span className="translate-x-1 opacity-0 transition group-hover/sidebar:translate-x-0 group-hover/sidebar:opacity-100 group-focus-within/sidebar:translate-x-0 group-focus-within/sidebar:opacity-100">Sair</span>
        </button>
      }
    />
  );
}
