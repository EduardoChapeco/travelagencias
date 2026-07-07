import {
  LayoutDashboard,
  ListTodo,
  Calendar,
  MessageSquare,
  Users,
  Luggage,
  Bus,
  UserRound,
  Wallet,
  LifeBuoy,
  Globe,
  Settings,
  // Sub-module icons
  CalendarClock,
  FileText,
  Clock,
  Users2,
  BarChart3,
  Radar,
  ScrollText,
  Plane,
  ClipboardCheck,
  BedDouble,
  Building2,
  Store,
  Globe2,
  BrainCircuit,
  Palette,
  Puzzle,
  CreditCard,
  Shield,
  type LucideIcon
} from "lucide-react";

export interface SubModuleConfig {
  label: string;
  to: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export interface AiActionConfig {
  label: string;
  prompt: string;
}

export interface ModuleNavConfig {
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
  exact?: boolean;
  adminOnly?: boolean;
  matchPaths?: string[];
  subModules?: SubModuleConfig[];
  aiActions?: AiActionConfig[];
}

export const NAVIGATION_MODULES: ModuleNavConfig[] = [
  { id: "dashboard", label: "dashboard", to: "", icon: LayoutDashboard, exact: true },
  {
    id: "daily-tasks",
    label: "daily-tasks",
    to: "daily-tasks",
    icon: ListTodo,
    subModules: [
      { label: "Meu Dia", to: "daily-tasks?view=my-day", icon: ListTodo },
      { label: "Quadro Kanban", to: "daily-tasks?view=kanban", icon: CalendarClock },
      { label: "Lista", to: "daily-tasks?view=list", icon: FileText },
      { label: "Timeline", to: "daily-tasks?view=timeline", icon: Clock },
      { label: "Calendário", to: "daily-tasks?view=calendar", icon: Calendar },
      { label: "Workload", to: "daily-tasks?view=workload", icon: Users2, adminOnly: true },
      { label: "Relatórios", to: "daily-tasks?view=reports", icon: BarChart3, adminOnly: true }
    ]
  },
  { id: "calendar", label: "calendar", to: "calendar", icon: Calendar },
  { id: "inbox", label: "inbox", to: "inbox", icon: MessageSquare },
  {
    id: "crm",
    label: "crm",
    to: "crm",
    icon: Users,
    matchPaths: ["proposals", "contracts", "quotes"],
    subModules: [
      { label: "Negociações & Leads", to: "crm", icon: Users },
      { label: "Cotações VibeTour", to: "quotes", icon: Radar },
      { label: "Orçamentos & Propostas", to: "proposals", icon: FileText },
      { label: "Contratos", to: "contracts", icon: ScrollText }
    ],
    aiActions: [
      {
        label: "Resumir Pipeline",
        prompt: "Analise o pipeline de vendas atual e me dê um resumo das oportunidades abertas."
      }
    ]
  },
  {
    id: "trips",
    label: "trips",
    to: "trips",
    icon: Luggage,
    matchPaths: ["vouchers", "boarding"],
    subModules: [
      { label: "Todas as Viagens", to: "trips", icon: Luggage },
      { label: "Aéreos & Conferência", to: "vouchers", icon: Plane },
      { label: "Check-in & Embarques", to: "boarding", icon: ClipboardCheck }
    ]
  },
  {
    id: "group-tours",
    label: "Grupos & Excursões",
    to: "group-tours",
    icon: Bus,
    matchPaths: ["bus-layouts", "rooming-list", "financial/groups"],
    subModules: [
      { label: "Excursões & Grupos", to: "group-tours", icon: Bus },
      { label: "Frota & Ônibus", to: "bus-layouts", icon: Bus },
      { label: "Rooming List Geral", to: "rooming-list", icon: BedDouble },
      { label: "Financeiro do Hub", to: "financial/groups", icon: Wallet }
    ],
    aiActions: [
      {
        label: "Resumir Grupos",
        prompt: "Liste os grupos de excursão ativos e me dê um resumo de ocupação e status."
      }
    ]
  },
  {
    id: "clients",
    label: "clients",
    to: "clients",
    icon: UserRound,
    matchPaths: ["corporate", "suppliers"],
    subModules: [
      { label: "Clientes", to: "clients", icon: UserRound },
      { label: "Corporativo", to: "corporate", icon: Building2 },
      { label: "Fornecedores", to: "suppliers", icon: Store }
    ]
  },
  {
    id: "financial",
    label: "financial",
    to: "financial",
    icon: Wallet,
    subModules: [
      { label: "Caixa & Movimento", to: "financial/cash", icon: Wallet },
      { label: "DRE", to: "financial/dre", icon: BarChart3 },
      { label: "Conciliação", to: "financial/reconciliation", icon: ClipboardCheck },
      { label: "Faturas", to: "financial/invoices", icon: FileText },
      { label: "Grupos & Excursões", to: "financial/groups", icon: Bus },
      { label: "Livro-Razão", to: "financial/ledger", icon: FileText }
    ]
  },
  {
    id: "support",
    label: "support",
    to: "support",
    icon: LifeBuoy,
    matchPaths: ["visas"],
    subModules: [
      { label: "Suporte", to: "support", icon: LifeBuoy },
      { label: "Vistos", to: "visas", icon: Globe2 }
    ]
  },
  {
    id: "portal",
    label: "portal",
    to: "portal",
    icon: Globe,
    adminOnly: true,
    matchPaths: ["competitors", "destination-intelligence"],
    subModules: [
      { label: "Site da Agência", to: "portal", icon: Globe },
      { label: "Monitor Concorrentes", to: "competitors", icon: Radar },
      { label: "Inteligência Destinos", to: "destination-intelligence", icon: BrainCircuit }
    ]
  },
  {
    id: "settings",
    label: "settings",
    to: "settings",
    icon: Settings,
    adminOnly: true,
    matchPaths: ["team", "brand", "integrations", "billing", "company", "productivity"],
    subModules: [
      { label: "Minha Empresa", to: "company", icon: Building2 },
      { label: "Equipe", to: "team", icon: Users2 },
      { label: "Identidade Visual", to: "brand", icon: Palette },
      { label: "Conexões & APIs", to: "integrations", icon: Puzzle },
      { label: "Assinatura & Planos", to: "billing", icon: CreditCard },
      { label: "Configurações Gerais", to: "settings", icon: Settings },
      { label: "Fechamentos & Comissões", to: "settings/financial", icon: Wallet },
      { label: "Auditoria de IA", to: "settings/ai-audit", icon: Shield }
    ]
  }
];

export function buildContext(
  pathname: string,
  base: string,
  isAdmin: boolean,
  tripId?: string,
  trip?: any
) {
  const activeModule = NAVIGATION_MODULES.find((m) => {
    if (m.to === "") return pathname === base;
    const normalizedTo = `${base}/${m.to}`.replace(/\/$/, "");
    if (pathname === normalizedTo || pathname.startsWith(`${normalizedTo}/`)) {
      return true;
    }
    if (m.matchPaths) {
      return m.matchPaths.some((p) => {
        const fullPath = `${base}/${p}`;
        return pathname === fullPath || pathname.startsWith(`${fullPath}/`);
      });
    }
    return false;
  });

  if (!activeModule || !activeModule.subModules) {
    return { title: "", items: [], aiActions: [] };
  }

  if (activeModule.adminOnly && !isAdmin) {
    return { title: "", items: [], aiActions: [] };
  }

  const items = activeModule.subModules
    .filter((sub) => !sub.adminOnly || isAdmin)
    .map((sub) => {
      // Se sub.to já tem parâmetros ou caminho alternativo completo, usa
      const absoluteTo = sub.to.startsWith("http") || sub.to.startsWith("/") 
        ? sub.to 
        : `${base}/${sub.to}`;
      return {
        label: sub.label,
        to: absoluteTo,
        icon: sub.icon,
      };
    });

  return {
    title: activeModule.label,
    items,
    aiActions: activeModule.aiActions || [],
  };
}
