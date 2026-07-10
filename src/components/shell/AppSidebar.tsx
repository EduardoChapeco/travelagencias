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
import { DockNavigation, type SlimSidebarItem, type ContextItem } from "./DockNavigation";
import { useUnreadConversations } from "@/hooks/inbox/useUnreadConversations";
import { useLayoutStore } from "@/hooks/use-layout-store";
import { AIFloatingWidget } from "./AIFloatingWidget";
import { Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

import { NAVIGATION_MODULES, buildContext } from "@/lib/navigation.config";
import { Button } from "@/components/ui/button";

const HUB_ITEMS: SlimSidebarItem[] = NAVIGATION_MODULES.map((m) => ({
  label: m.label,
  to: m.to,
  icon: m.icon,
  exact: m.exact,
  adminOnly: m.adminOnly,
  matchPaths: m.matchPaths,
}));

const MOBILE_ITEMS: SlimSidebarItem[] = [];
NAVIGATION_MODULES.forEach((m) => {
  if (m.id === "dashboard") {
    MOBILE_ITEMS.push({ label: m.label, to: m.to, icon: m.icon, exact: m.exact });
    return;
  }

  if (m.subModules && m.subModules.length > 0) {
    const sectionLabel =
      m.label === "crm"
        ? "Vendas & CRM"
        : m.label === "daily-tasks"
          ? "Dia a Dia"
          : m.label === "trips"
            ? "Viagens"
            : m.label;

    MOBILE_ITEMS.push({ type: "header", label: sectionLabel, adminOnly: m.adminOnly });
    m.subModules.forEach((sub) => {
      MOBILE_ITEMS.push({
        label: sub.label,
        to: sub.to,
        icon: sub.icon,
        adminOnly: sub.adminOnly || m.adminOnly,
      });
    });
  } else {
    MOBILE_ITEMS.push({
      label: m.label,
      to: m.to,
      icon: m.icon,
      adminOnly: m.adminOnly,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────────

export function AppSidebar({
  mobileOpen,
  onMobileClose,
  isHome = false,
}: {
  isPinned?: boolean;
  onTogglePin?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  isHome?: boolean;
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

  // ── Detect trip detail ──────────────────────────────────────────────────────
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

  const { data: unreadCount = 0 } = useUnreadConversations();

  // ── Build contextual items ────────────────────────────────────────────────
  const {
    title: contextTitle,
    items: contextItems,
    aiActions,
  } = buildContext(pathname, base, isAdmin, tripId ?? undefined, trip);

  // ── Map hub items → absolute URLs + matchPaths ────────────────────────────
  const visibleHubs: SlimSidebarItem[] = HUB_ITEMS.filter((h) => !h.adminOnly || isAdmin).map(
    (h) => ({
      ...h,
      label: getModuleName(h.label, agency),
      to: `${base}${h.to ? `/${h.to}` : ""}`,
      matchPaths: h.matchPaths?.map((p) => `${base}/${p}`),
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

  // isHome é recebida como prop — não redeclarar aqui


  const primaryAction = useLayoutStore((state) => state.primaryAction);

  if (isHome) {
    return (
      <DockNavigation
        isHome={isHome}
        items={visibleHubs}
        contextItems={contextItems as ContextItem[]}
        footer={
          <Button
              onClick={() => signOut().then(() => navigate({ to: "/auth/login", replace: true }))}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-os-faint transition-all hover:bg-white/10 hover:text-os cursor-pointer"
              title="Sair da conta"
            >
            <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-between gap-4 h-full w-full select-none py-1">
      {/* 1. Botão de Ação Primária no Topo (não encosta na pill) */}
      <div className="shrink-0 h-14 w-14 flex items-center justify-center">
        {primaryAction ? (
          <TooltipProvider delayDuration={80}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.disabled || primaryAction.loading}
                  className="h-14 w-14 rounded-full flex items-center justify-center bg-primary text-primary-foreground border border-white/10 hover:scale-[1.05] active:scale-[0.98] transition-all cursor-pointer shadow-[0_4px_12px_rgba(47,96,230,0.3)] disabled:opacity-50 shrink-0"
                >
                  {primaryAction.icon || <Plus className="h-6 w-6" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={12}
                className="rounded-[var(--radius-card)] px-3 py-1.5 text-xs font-semibold bg-black/80 backdrop-blur-md text-white border border-white/10"
              >
                {primaryAction.label}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          /* Espaçador invisível para manter o equilíbrio visual */
          <div className="h-14 w-14" />
        )}
      </div>

      {/* 2. Dock de Navegação Central (altura fluida, rolável) */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center">
        <DockNavigation
          isHome={false}
          items={visibleHubs}
          contextItems={contextItems as ContextItem[]}
          footer={
            <Button
              onClick={() => signOut().then(() => navigate({ to: "/auth/login", replace: true }))}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-os-faint transition-all hover:bg-white/10 hover:text-os cursor-pointer"
              title="Sair da conta"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            </Button>
          }
        />
      </div>

      {/* 3. Assistente de IA na Base (não encosta na pill) */}
      <div className="shrink-0">
        <AIFloatingWidget inline />
      </div>
    </div>
  );
}
