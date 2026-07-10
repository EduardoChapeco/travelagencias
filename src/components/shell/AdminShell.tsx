import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  Users,
  ScrollText,
  FileText,
  ShieldCheck,
  Wallet,
  BookOpen,
  Brush,
  Settings,
  Plane,
  Luggage,
  LayoutDashboard,
  LogOut,
  Zap,
  Shield,
  Palette,
  Webhook,
  KeyRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import { DockNavigation, type SlimSidebarItem } from "./DockNavigation";

const items = [
  { to: "/admin", label: "Visão Geral", icon: LayoutDashboard, exact: true },
  { to: "/admin/agencies", label: "Agências", icon: Building2 },
  { to: "/admin/agents", label: "Agentes", icon: Users },
  { to: "/admin/travelers", label: "Viajantes", icon: Users },
  { to: "/admin/trips", label: "Viagens", icon: Luggage },
  { to: "/admin/contracts", label: "Contratos", icon: ScrollText },
  { to: "/admin/billing", label: "Faturamento", icon: Wallet },
  { to: "/admin/plans", label: "Planos", icon: Zap },
  { to: "/admin/api-keys", label: "Chaves Globais", icon: KeyRound },
  { to: "/admin/policies", label: "Políticas & LGPD", icon: Shield },
  { to: "/admin/brand", label: "Marca Global", icon: Palette },
  { to: "/admin/integrations", label: "Integrações", icon: Webhook },
  { to: "/admin/audit", label: "Auditoria", icon: ScrollText },
];

export function AdminShell() {
  const [authorized, setAuthorized] = useState<null | boolean>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        if (!cancel) setAuthorized(false);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id)
        .eq("role", "super_admin")
        .maybeSingle();
      if (!cancel) setAuthorized(!!data);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  if (authorized === null)
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Verificando acesso…
      </div>
    );
  if (!authorized)
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 text-center">
          <Plane className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Acesso restrito</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Esta área é apenas para administradores globais.
          </p>
          <Link to="/" className="mt-3 inline-block text-xs font-medium text-foreground underline">
            Voltar
          </Link>
        </div>
      </div>
    );

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <DockNavigation
        items={items as SlimSidebarItem[]}
        footer={
          <button
            onClick={() => signOut().then(() => navigate({ to: "/auth/login", replace: true }))}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-os-faint transition-all hover:bg-white/10 hover:text-os cursor-pointer"
            title="Sair da conta"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
          </button>
        }
      />
      <main className="no-scrollbar min-w-0 flex-1 overflow-y-auto">
        <div className="w-full px-4 md:px-8 xl:px-16 py-6 md:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
