import { useNavigate, useParams } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
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
  Globe,
  Briefcase,
  Radar,
  Calendar,
  MessageSquare,
  Palette,
  Users2,
  Puzzle,
} from "lucide-react";
import { useAgency } from "@/lib/agency-context";
import { signOut } from "@/lib/auth";
import { SlimSidebar, type SlimSidebarItem } from "./SlimSidebar";

type NavItem = { label: string; segment: string; icon: typeof LayoutDashboard; exact?: boolean };

const items: NavItem[] = [
  { label: "Dashboard", segment: "", icon: LayoutDashboard, exact: true },
  { label: "Negociações & Leads", segment: "crm", icon: Users },
  { label: "Agenda", segment: "calendar", icon: Calendar },
  { label: "Monitor de Concorrentes", segment: "competitors", icon: Radar },
  { label: "Orçamentos & Propostas", segment: "proposals", icon: FileText },
  { label: "Viagens", segment: "trips", icon: Luggage },
  { label: "Embarques", segment: "boarding", icon: Plane },
  { label: "Contratos", segment: "contracts", icon: ScrollText },
  { label: "Vouchers", segment: "vouchers", icon: Ticket },
  { label: "Financeiro", segment: "financial", icon: Wallet },
  { label: "Roteiros em Grupo", segment: "group-tours", icon: Bus },
  { label: "Frota & Ônibus", segment: "bus-layouts", icon: Bus },
  { label: "Vistos", segment: "visas", icon: Globe2 },
  { label: "Corporativo", segment: "corporate", icon: Building2 },
  { label: "Clientes", segment: "clients", icon: UserRound },
  { label: "Fornecedores", segment: "suppliers", icon: Store },
  { label: "Suporte", segment: "support", icon: LifeBuoy },
  { label: "Conversas & Mensagens", segment: "omnichannel", icon: MessageSquare },
  { label: "Site da Agência", segment: "portal", icon: Globe },
  { label: "Biblioteca de Apoio", segment: "knowledge", icon: BookOpen },
  // ── Gestão ──
  { label: "Minha Empresa", segment: "company", icon: Building2 },
  { label: "Equipe", segment: "team", icon: Users2 },
  { label: "Identidade Visual", segment: "brand", icon: Palette },
  { label: "Conexões", segment: "integrations", icon: Puzzle },
  { label: "Configurações", segment: "settings", icon: Settings },
];

export function AppSidebar({
  isPinned,
  onTogglePin,
}: {
  isPinned?: boolean;
  onTogglePin?: () => void;
}) {
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
      isPinned={isPinned}
      onTogglePin={onTogglePin}
      items={sidebarItems}
      brand={
        <>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand text-xs font-bold text-brand-foreground">
            {(agency?.name ?? "T").charAt(0).toUpperCase()}
          </div>
          <span
            className={cn(
              "ml-3 min-w-0 translate-x-1 truncate text-[12.5px] font-semibold transition duration-200",
              isPinned
                ? "translate-x-0 opacity-100"
                : "opacity-0 group-hover/sidebar:translate-x-0 group-hover/sidebar:opacity-100 group-focus-within/sidebar:translate-x-0 group-focus-within/sidebar:opacity-100",
            )}
          >
            {agency?.name ?? "TravelOS"}
          </span>
        </>
      }
      footer={
        <button
          onClick={() => signOut().then(() => navigate({ to: "/auth/login", replace: true }))}
          className="flex h-8 w-full items-center gap-3 overflow-hidden rounded-lg px-2 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          title="Sair"
        >
          <LogOut className="h-[15px] w-[15px] shrink-0" strokeWidth={1.5} />
          <span
            className={cn(
              "translate-x-1 truncate transition duration-200",
              isPinned
                ? "translate-x-0 opacity-100"
                : "opacity-0 group-hover/sidebar:translate-x-0 group-hover/sidebar:opacity-100 group-focus-within/sidebar:translate-x-0 group-focus-within/sidebar:opacity-100",
            )}
          >
            Sair
          </span>
        </button>
      }
    />
  );
}
