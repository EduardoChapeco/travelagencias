import { useNavigate, useParams, useRouterState } from "@tanstack/react-router";
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
  Settings,
  CreditCard,
  LogOut,
  Globe,
  Radar,
  Calendar,
  MessageSquare,
  Palette,
  Users2,
  Puzzle,
  ListTodo,
  BrainCircuit,
  ClipboardCheck,
  MapPin,
  Navigation,
  Clock,
  CalendarClock,
  CheckCircle2,
  Hotel,
  BarChart3,
  BedDouble,
  Shield,
} from "lucide-react";
import { useAgency, getModuleName } from "@/lib/agency-context";
import { signOut } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { SlimSidebar, type SlimSidebarItem, type ContextItem, type AiAction } from "./SlimSidebar";
import { useUnreadConversations } from "@/hooks/inbox/useUnreadConversations";

// ─────────────────────────────────────────────────────────────────────────────
// 9 Hub Icons — Desktop left column
// Keys here use relative "to" (no base prefix). Mapped in component.
// ─────────────────────────────────────────────────────────────────────────────
const HUB_ITEMS: SlimSidebarItem[] = [
  { label: "dashboard", to: "", icon: LayoutDashboard, exact: true },
  {
    label: "daily-tasks",
    to: "daily-tasks",
    icon: ListTodo,
  },
  {
    label: "calendar",
    to: "calendar",
    icon: Calendar,
  },
  {
    label: "inbox",
    to: "inbox",
    icon: MessageSquare,
  },
  { label: "crm", to: "crm", icon: Users, matchPaths: ["proposals", "contracts", "quotes"] },
  { label: "trips", to: "trips", icon: Luggage, matchPaths: ["vouchers", "boarding"] },
  {
    label: "Grupos & Excursões",
    to: "group-tours",
    icon: Bus,
    matchPaths: ["bus-layouts", "rooming-list", "financial/groups"],
  },
  { label: "clients", to: "clients", icon: UserRound, matchPaths: ["corporate", "suppliers"] },
  { label: "financial", to: "financial", icon: Wallet },
  { label: "support", to: "support", icon: LifeBuoy, matchPaths: ["visas"] },
  {
    label: "portal",
    to: "portal",
    icon: Globe,
    adminOnly: true,
    matchPaths: ["competitors", "destination-intelligence"],
  },
  {
    label: "settings",
    to: "settings",
    icon: Settings,
    adminOnly: true,
    matchPaths: ["team", "brand", "integrations", "billing", "company", "productivity"],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Full Mobile Drawer list — with section headers
// Keys here also use relative "to". Mapped in component.
// ─────────────────────────────────────────────────────────────────────────────
const MOBILE_ITEMS: SlimSidebarItem[] = [
  { label: "dashboard", to: "", icon: LayoutDashboard, exact: true },

  { type: "header", label: "Dia a Dia" },
  { label: "daily-tasks", to: "daily-tasks", icon: ListTodo },
  { label: "calendar", to: "calendar", icon: Calendar },
  { label: "Mensagens", to: "inbox", icon: MessageSquare },

  { type: "header", label: "Vendas & CRM" },
  { label: "crm", to: "crm", icon: Users },
  { label: "quotes", to: "quotes", icon: Radar },
  { label: "proposals", to: "proposals", icon: FileText },
  { label: "contracts", to: "contracts", icon: ScrollText },

  { type: "header", label: "Viagens" },
  { label: "trips", to: "trips", icon: Luggage },
  { label: "vouchers", to: "vouchers", icon: Plane },
  { label: "boarding", to: "boarding", icon: ClipboardCheck },

  { type: "header", label: "Grupos & Excursões" },
  { label: "group-tours", to: "group-tours", icon: Bus },
  { label: "bus-layouts", to: "bus-layouts", icon: Bus },
  { label: "Rooming List", to: "rooming-list", icon: BedDouble },
  { label: "Financeiro de Grupos", to: "financial/groups", icon: Wallet },

  { type: "header", label: "Clientes & Parceiros" },
  { label: "clients", to: "clients", icon: UserRound },
  { label: "corporate", to: "corporate", icon: Building2 },
  { label: "suppliers", to: "suppliers", icon: Store },

  { type: "header", label: "Financeiro" },
  { label: "financial/cash", to: "financial/cash", icon: Wallet },
  { label: "financial/dre", to: "financial/dre", icon: BarChart3 },
  { label: "financial/reconciliation", to: "financial/reconciliation", icon: ClipboardCheck },

  { type: "header", label: "Suporte & Vistos" },
  { label: "support", to: "support", icon: LifeBuoy },
  { label: "visas", to: "visas", icon: Globe2 },

  { type: "header", label: "Site & Marketing", adminOnly: true },
  { label: "portal", to: "portal", icon: Globe, adminOnly: true },
  { label: "competitors", to: "competitors", icon: Radar, adminOnly: true },
  {
    label: "destination-intelligence",
    to: "destination-intelligence",
    icon: BrainCircuit,
    adminOnly: true,
  },

  { type: "header", label: "Gestão", adminOnly: true },
  { label: "company", to: "company", icon: Building2, adminOnly: true },
  { label: "team", to: "team", icon: Users2, adminOnly: true },
  { label: "brand", to: "brand", icon: Palette, adminOnly: true },
  { label: "integrations", to: "integrations", icon: Puzzle, adminOnly: true },
  { label: "billing", to: "billing", icon: CreditCard, adminOnly: true },
  { label: "settings", to: "settings", icon: Settings, adminOnly: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build context items for a given pathname
// ─────────────────────────────────────────────────────────────────────────────
function buildContext(
  pathname: string,
  base: string,
  isAdmin: boolean,
  tripId: string | null,
  trip: { title: string; number: number } | null | undefined,
): { title: string; items: ContextItem[]; aiActions: AiAction[] } {
  const empty = { title: "", items: [], aiActions: [] };

  // ── Builders/editors hide context ─────────────────────────────────────────
  const pathParts = pathname.split("/").filter(Boolean);
  const isProposalEditor =
    pathname.includes("/proposals/") && pathParts.length > 4 && !pathname.endsWith("/proposals");
  const isSiteEditor = /\/portal\/pages\/[^/]+$/.test(pathname) && !pathname.endsWith("/pages/");
  if (isProposalEditor || isSiteEditor) return empty;

  // ── Trip detail (highest priority) ────────────────────────────────────────
  if (tripId) {
    const tripBase = `${base}/trips/${tripId}`;
    return {
      title: trip ? `#${trip.number} · ${trip.title}` : "Viagem",
      items: [
        { label: "Visão Geral", to: tripBase, icon: FileText, exact: true },
        { label: "Passageiros", to: `${tripBase}/passengers`, icon: Users },
        { label: "Financeiro", to: `${tripBase}/financial`, icon: Wallet },
        { label: "Aéreos & Voos", to: `${tripBase}/flights`, icon: Plane },
        { label: "Hospedagem", to: `${tripBase}/lodging`, icon: Hotel },
        { label: "Contrato", to: `${tripBase}/contract`, icon: ScrollText },
        { label: "Confirmação", to: `${tripBase}/confirmation`, icon: CheckCircle2 },
        { label: "Vouchers", to: `${tripBase}/vouchers`, icon: Ticket },
        { label: "Check-in & Embarque", to: `${tripBase}/boarding`, icon: Navigation },
        { label: "Destino & Segurança", to: `${tripBase}/destination`, icon: MapPin },
        { label: "Histórico", to: `${tripBase}/history`, icon: Clock },
      ],
      aiActions: [
        {
          label: "Resumir Viagem",
          prompt: "Analise esta viagem e me dê um resumo executivo das reservas, datas e destinos.",
        },
        {
          label: "Auditar Documentos",
          prompt:
            "Audite o status de documentos e passaportes de todos os passageiros desta viagem.",
        },
        {
          label: "Mensagem Pré-Embarque",
          prompt:
            "Gere uma mensagem profissional para WhatsApp com orientações pré-embarque para os passageiros.",
        },
      ],
    };
  }

  // ── Tarefas (daily-tasks) ──────────────────────────────────────────────────
  if (pathname.includes("/daily-tasks")) {
    return {
      title: "Tarefas",
      items: [
        { label: "Meu Dia", to: `${base}/daily-tasks?view=my-day`, icon: ListTodo },
        { label: "Quadro Kanban", to: `${base}/daily-tasks?view=kanban`, icon: CalendarClock },
        { label: "Lista", to: `${base}/daily-tasks?view=list`, icon: FileText },
        { label: "Timeline", to: `${base}/daily-tasks?view=timeline`, icon: Clock },
        { label: "Calendário", to: `${base}/daily-tasks?view=calendar`, icon: Calendar },
        ...(isAdmin ? [
          { label: "Workload", to: `${base}/daily-tasks?view=workload`, icon: Users2 },
          { label: "Relatórios", to: `${base}/daily-tasks?view=reports`, icon: BarChart3 }
        ] : [])
      ],
      aiActions: [],
    };
  }

  // ── Agenda (calendar) ──────────────────────────────────────────────────────
  if (pathname.includes("/calendar")) {
    return {
      title: "Agenda",
      items: [], // Tela cheia!
      aiActions: [],
    };
  }

  // ── Mensagens (inbox) ──────────────────────────────────────────────────────
  if (pathname.includes("/inbox")) {
    return {
      title: "Mensagens",
      items: [], // Tela cheia!
      aiActions: [],
    };
  }

  // ── Vendas & CRM ──────────────────────────────────────────────────────────
  if (
    pathname.includes("/crm") ||
    pathname.includes("/proposals") ||
    pathname.includes("/contracts") ||
    pathname.includes("/quotes")
  ) {
    return {
      title: "Vendas & CRM",
      items: [
        { label: "Negociações & Leads", to: `${base}/crm`, icon: Users },
        { label: "Cotações VibeTour", to: `${base}/quotes`, icon: Radar },
        { label: "Orçamentos & Propostas", to: `${base}/proposals`, icon: FileText },
        { label: "Contratos", to: `${base}/contracts`, icon: ScrollText },
      ],
      aiActions: [
        {
          label: "Resumir Pipeline",
          prompt: "Analise o pipeline de vendas atual e me dê um resumo das oportunidades abertas.",
        },
      ],
    };
  }

  // ── Viagens (individual trips list) ─────────────────────────────────────────────────
  if (
    pathname.includes("/trips") ||
    pathname.includes("/boarding") ||
    pathname.includes("/vouchers")
  ) {
    return {
      title: "Viagens",
      items: [
        { label: "Todas as Viagens", to: `${base}/trips`, icon: Luggage },
        { label: "Aéreos & Conferência", to: `${base}/vouchers`, icon: Plane },
        { label: "Check-in & Embarques", to: `${base}/boarding`, icon: ClipboardCheck },
      ],
      aiActions: [],
    };
  }

  // ── Grupos & Excursões ─────────────────────────────────────────────────
  if (
    pathname.includes("/group-tours") ||
    pathname.includes("/bus-layouts") ||
    pathname.includes("/rooming-list") ||
    pathname.includes("/financial/groups")
  ) {
    return {
      title: "Grupos & Excursões",
      items: [
        { label: "Excursões & Grupos", to: `${base}/group-tours`, icon: Bus },
        { label: "Frota & Ônibus", to: `${base}/bus-layouts`, icon: Bus },
        { label: "Rooming List Geral", to: `${base}/rooming-list`, icon: BedDouble },
        { label: "Financeiro do Hub", to: `${base}/financial/groups`, icon: Wallet },
      ],
      aiActions: [
        {
          label: "Resumir Grupos",
          prompt: "Liste os grupos de excursão ativos e me dê um resumo de ocupação e status.",
        },
      ],
    };
  }

  // ── Clientes & Parceiros ──────────────────────────────────────────────────
  if (
    pathname.includes("/clients") ||
    pathname.includes("/corporate") ||
    pathname.includes("/suppliers")
  ) {
    return {
      title: "Clientes & Parceiros",
      items: [
        { label: "Clientes", to: `${base}/clients`, icon: UserRound },
        { label: "Corporativo", to: `${base}/corporate`, icon: Building2 },
        { label: "Fornecedores", to: `${base}/suppliers`, icon: Store },
      ],
      aiActions: [],
    };
  }

  // ── Financeiro ────────────────────────────────────────────────────────────
  if (pathname.includes("/financial")) {
    return {
      title: "Financeiro",
      items: [
        { label: "Caixa & Movimento", to: `${base}/financial/cash`, icon: Wallet },
        { label: "DRE", to: `${base}/financial/dre`, icon: BarChart3 },
        { label: "Conciliação", to: `${base}/financial/reconciliation`, icon: ClipboardCheck },
        { label: "Faturas", to: `${base}/financial/invoices`, icon: FileText },
      ],
      aiActions: [],
    };
  }

  // ── Suporte & Vistos ──────────────────────────────────────────────────────
  if (pathname.includes("/support") || pathname.includes("/visas")) {
    return {
      title: "Suporte & Vistos",
      items: [
        { label: "Suporte", to: `${base}/support`, icon: LifeBuoy },
        { label: "Vistos", to: `${base}/visas`, icon: Globe2 },
      ],
      aiActions: [],
    };
  }

  // ── Site & Marketing (admin) ──────────────────────────────────────────────
  if (
    isAdmin &&
    (pathname.includes("/portal") ||
      pathname.includes("/competitors") ||
      pathname.includes("/destination-intelligence"))
  ) {
    return {
      title: "Site & Marketing",
      items: [
        { label: "Site da Agência", to: `${base}/portal`, icon: Globe },
        { label: "Monitor Concorrentes", to: `${base}/competitors`, icon: Radar },
        {
          label: "Inteligência Destinos",
          to: `${base}/destination-intelligence`,
          icon: BrainCircuit,
        },
      ],
      aiActions: [],
    };
  }

  // ── Configurações (admin) ─────────────────────────────────────────────────
  if (
    isAdmin &&
    (pathname.includes("/settings") ||
      pathname.includes("/team") ||
      pathname.includes("/brand") ||
      pathname.includes("/integrations") ||
      pathname.includes("/billing") ||
      pathname.includes("/company") ||
      pathname.includes("/productivity"))
  ) {
    return {
      title: "Configurações",
      items: [
        { label: "Minha Empresa", to: `${base}/company`, icon: Building2 },
        { label: "Equipe", to: `${base}/team`, icon: Users2 },
        { label: "Identidade Visual", to: `${base}/brand`, icon: Palette },
        { label: "Conexões & APIs", to: `${base}/integrations`, icon: Puzzle },
        { label: "Assinatura & Planos", to: `${base}/billing`, icon: CreditCard },
        { label: "Configurações Gerais", to: `${base}/settings`, icon: Settings },
        { label: "Fechamentos & Comissões", to: `${base}/settings/financial`, icon: Wallet },
        { label: "Auditoria de IA", to: `${base}/settings/ai-audit`, icon: Shield },
      ],
      aiActions: [],
    };
  }

  return empty;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function AppSidebar({
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

  const rawPathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  const pathname = (rawPathname ?? "/").replace(/\/$/, "") || "/";

  const isAdmin = !!isAgencyAdmin;
  const base = `/agency/${slug}`;

  // ── Detect trip detail ────────────────────────────────────────────────────
  const tripMatch = pathname.match(/\/agency\/[^/]+\/trips\/([a-f0-9-]{36})/i);
  const tripId = tripMatch ? tripMatch[1] : null;

  const { data: trip } = useQuery({
    queryKey: ["sidebar-trip", tripId],
    enabled: !!tripId && !!slug,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("trips")
        .select("title, number")
        .eq("id", tripId!)
        .maybeSingle();
      return data;
    },
  });

  if (!slug || !agency) return null;

  // ── Unread conversations badge ────────────────────────────────────────────
  const { data: unreadCount = 0 } = useUnreadConversations();

  // ── Build contextual items ────────────────────────────────────────────────
  const {
    title: contextTitle,
    items: contextItems,
    aiActions,
  } = buildContext(pathname, base, isAdmin, tripId, trip);

  // ── Map hub items → absolute URLs + matchPaths ────────────────────────────
  const visibleHubs: SlimSidebarItem[] = HUB_ITEMS.filter((h) => !h.adminOnly || isAdmin).map(
    (h) => ({
      ...h,
      label: getModuleName(h.label, agency),
      to: `${base}${h.to ? `/${h.to}` : ""}`,
      matchPaths: h.matchPaths?.map((p) => `${base}/${p}`),
      // Adicionar badge de não-lidas no inbox
      badge: h.label === "inbox" ? (unreadCount > 0 ? unreadCount : undefined) : undefined,
    }),
  );

  // ── Map mobile items → absolute URLs ────────────────────────────────────
  const visibleMobileItems: SlimSidebarItem[] = MOBILE_ITEMS.filter(
    (i) => !i.adminOnly || isAdmin,
  ).map((i) => ({
    ...i,
    label: i.to !== undefined ? getModuleName(i.label, agency) : i.label,
    to: i.to !== undefined ? `${base}${i.to ? `/${i.to}` : ""}` : undefined,
  }));

  return (
    <SlimSidebar
      mobileOpen={mobileOpen}
      onMobileClose={onMobileClose}
      items={visibleHubs}
      mobileItems={visibleMobileItems}
      contextItems={contextItems}
      contextTitle={contextTitle}
      aiActions={aiActions}
      brand={
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand text-xs font-bold text-brand-foreground font-sans">
          {(agency?.name ?? "T").charAt(0).toUpperCase()}
        </div>
      }
      footer={
        <button
          onClick={() => signOut().then(() => navigate({ to: "/auth/login", replace: true }))}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          title="Sair da conta"
        >
          <LogOut className="h-[15px] w-[15px] shrink-0" strokeWidth={1.8} />
        </button>
      }
    />
  );
}
