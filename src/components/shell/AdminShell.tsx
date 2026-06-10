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
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import { SlimSidebar, type SlimSidebarItem } from "./SlimSidebar";

const items = [
  { to: "/admin", label: "Visão Geral", icon: LayoutDashboard, exact: true },
  { to: "/admin/agencies", label: "Agências", icon: Building2 },
  { to: "/admin/agents", label: "Agentes", icon: Users },
  { to: "/admin/travelers", label: "Viajantes", icon: Users },
  { to: "/admin/trips", label: "Viagens", icon: Luggage },
  { to: "/admin/contracts", label: "Contratos", icon: ScrollText },
  { to: "/admin/billing", label: "Faturamento", icon: Wallet },
  { to: "/admin/plans", label: "Planos", icon: Zap },
  { to: "/admin/policies", label: "Políticas & LGPD", icon: Shield },
  { to: "/admin/brand", label: "Marca Global", icon: Palette },
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
        <div className="rounded-lg border border-border bg-surface p-6 text-center">
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
      <SlimSidebar
        items={items as SlimSidebarItem[]}
        brand={
          <>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
              A
            </div>
            <span className="ml-3 min-w-0 translate-x-1 truncate text-sm font-semibold opacity-0 transition group-hover/sidebar:translate-x-0 group-hover/sidebar:opacity-100 group-focus-within/sidebar:translate-x-0 group-focus-within/sidebar:opacity-100">
              Admin Global
            </span>
          </>
        }
        footer={
          <button
            onClick={() => signOut().then(() => navigate({ to: "/auth/login", replace: true }))}
            className="flex h-9 w-full items-center gap-3 overflow-hidden rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span className="translate-x-1 opacity-0 transition group-hover/sidebar:translate-x-0 group-hover/sidebar:opacity-100 group-focus-within/sidebar:translate-x-0 group-focus-within/sidebar:opacity-100">
              Sair
            </span>
          </button>
        }
      />
      <main className="no-scrollbar min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1200px] px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
