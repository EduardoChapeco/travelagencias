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
  CreditCard,
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
import { useAgency, getModuleName } from "@/lib/agency-context";
import { signOut } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { SlimSidebar, type SlimSidebarItem } from "./SlimSidebar";

const items: SlimSidebarItem[] = [
  { label: "Dashboard", to: "", icon: LayoutDashboard, exact: true },
  
  { type: "header", label: "Dia a Dia" },
  { label: "Meu Dia (Tarefas)", to: "daily-tasks", icon: ListTodo },
  { label: "Agenda", to: "calendar", icon: Calendar },
  { label: "Conversas & Mensagens", to: "omnichannel", icon: MessageSquare },

  { type: "header", label: "Vendas & CRM" },
  { label: "Negociações & Leads", to: "crm", icon: Users },
  { label: "Orçamentos & Propostas", to: "proposals", icon: FileText },
  { label: "Contratos", to: "contracts", icon: ScrollText },

  { type: "header", label: "Operações & Viagens" },
  { label: "Roteiros em Grupo", to: "group-tours", icon: Bus },
  { label: "Viagens", to: "trips", icon: Luggage },
  { label: "Embarques", to: "boarding", icon: Plane },
  { label: "Vouchers", to: "vouchers", icon: Ticket },
  { label: "Frota & Ônibus", to: "bus-layouts", icon: Bus },

  { type: "header", label: "Clientes & Parceiros" },
  { label: "Clientes", to: "clients", icon: UserRound },
  { label: "Corporativo", to: "corporate", icon: Building2 },
  { label: "Fornecedores", to: "suppliers", icon: Store },

  { type: "header", label: "Financeiro" },
  { label: "Financeiro", to: "financial", icon: Wallet },

  { type: "header", label: "Suporte & Vistos" },
  { label: "Suporte", to: "support", icon: LifeBuoy },
  { label: "Vistos", to: "visas", icon: Globe2 },

  { type: "header", label: "Site & Marketing" },
  { label: "Site da Agência", to: "portal", icon: Globe, adminOnly: true },
  { label: "Monitor de Concorrentes", to: "competitors", icon: Radar, adminOnly: true },

  { type: "header", label: "Gestão", adminOnly: true },
  { label: "Produtividade Master", to: "productivity", icon: BrainCircuit, adminOnly: true },
  { label: "Minha Empresa", to: "company", icon: Building2, adminOnly: true },
  { label: "Equipe", to: "team", icon: Users2, adminOnly: true },
  { label: "Identidade Visual", to: "brand", icon: Palette, adminOnly: true },
  { label: "Design System", to: "design-system", icon: BookOpen, adminOnly: true },
  { label: "Conexões", to: "integrations", icon: Puzzle, adminOnly: true },
  { label: "Assinatura & Planos", to: "billing", icon: CreditCard, adminOnly: true },
  { label: "Configurações", to: "settings", icon: Settings, adminOnly: true },
];

export function AppSidebar({
  isPinned,
  onTogglePin,
  mobileOpen,
  onMobileClose,
}: {
  isPinned?: boolean;
  onTogglePin?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
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
      mobileOpen={mobileOpen}
      onMobileClose={onMobileClose}
      items={visibleItems.map((i) => ({
        ...i,
        label: i.to !== undefined ? getModuleName(i.to || "dashboard", agency) : i.label,
        to: i.to !== undefined ? `/agency/${slug}${i.to ? `/${i.to}` : ""}` : undefined,
      }))}
      brand={
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand text-xs font-bold text-brand-foreground font-sans">
          {(agency?.name ?? "T").charAt(0).toUpperCase()}
        </div>
      }
      footer={
        <button
          onClick={() => signOut().then(() => navigate({ to: "/auth/login", replace: true }))}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          title="Sair"
        >
          <LogOut className="h-[15px] w-[15px] shrink-0" strokeWidth={1.8} />
        </button>
      }
    />
  );
}
