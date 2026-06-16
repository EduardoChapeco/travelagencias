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
  ListTodo,
  BrainCircuit,
} from "lucide-react";
import { useAgency } from "@/lib/agency-context";
import { signOut } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { SlimSidebar, type SlimSidebarItem } from "./SlimSidebar";

const items: SlimSidebarItem[] = [
  { label: "Dashboard", to: "", icon: LayoutDashboard, exact: true },
  { type: "header", label: "Fluxo Diário" },
  { label: "Meu Dia (Tarefas)", to: "daily-tasks", icon: ListTodo },
  { label: "Negociações & Leads", to: "crm", icon: Users },
  { label: "Agenda", to: "calendar", icon: Calendar },
  { label: "Conversas & Mensagens", to: "omnichannel", icon: MessageSquare },
  { label: "Orçamentos & Propostas", to: "proposals", icon: FileText },
  { label: "Viagens", to: "trips", icon: Luggage },
  { label: "Roteiros em Grupo", to: "group-tours", icon: Bus },
  { type: "header", label: "Clientes & Parceiros" },
  { label: "Clientes", to: "clients", icon: UserRound },
  { label: "Corporativo", to: "corporate", icon: Building2 },
  { label: "Fornecedores", to: "suppliers", icon: Store },
  { type: "header", label: "Operacional" },
  { label: "Suporte", to: "support", icon: LifeBuoy },
  { label: "Vistos", to: "visas", icon: Globe2 },
  { label: "Frota & Ônibus", to: "bus-layouts", icon: Bus },
  { label: "Embarques", to: "boarding", icon: Plane },
  { label: "Financeiro", to: "financial", icon: Wallet },
  { type: "header", label: "Site & Marketing" },
  { label: "Site da Agência", to: "portal", icon: Globe, adminOnly: true },
  { label: "Monitor de Concorrentes", to: "competitors", icon: Radar, adminOnly: true },
  { type: "header", label: "Gestão", adminOnly: true },
  { label: "Produtividade Master", to: "productivity", icon: BrainCircuit, adminOnly: true },
  { label: "Minha Empresa", to: "company", icon: Building2, adminOnly: true },
  { label: "Equipe", to: "team", icon: Users2, adminOnly: true },
  { label: "Identidade Visual", to: "brand", icon: Palette, adminOnly: true },
  { label: "Conexões", to: "integrations", icon: Puzzle, adminOnly: true },
  { label: "Configurações", to: "settings", icon: Settings, adminOnly: true },
];

export function AppSidebar({
  isPinned,
  onTogglePin,
}: {
  isPinned?: boolean;
  onTogglePin?: () => void;
}) {
  const navigate = useNavigate();
  const { agency, isAgencyAdmin } = useAgency();
  const params = useParams({ strict: false }) as { slug?: string };
  const slug = params.slug ?? agency?.slug;

  if (!slug || !agency) return null;

  const isAdmin = isAgencyAdmin;

  const visibleItems = items.filter((i) => {
    if ((i as any).adminOnly && !isAdmin) return false;
    return true;
  });

  return (
    <SlimSidebar
      isPinned={isPinned}
      onTogglePin={onTogglePin}
      items={visibleItems.map((i) => ({
        ...i,
        to: i.to !== undefined ? `/agency/${slug}${i.to ? `/${i.to}` : ""}` : undefined,
      }))}
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
          className="flex h-7 w-full items-center gap-3 overflow-hidden rounded-lg px-2 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          title="Sair"
        >
          <LogOut className="h-[14px] w-[14px] shrink-0" strokeWidth={1.8} />
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
