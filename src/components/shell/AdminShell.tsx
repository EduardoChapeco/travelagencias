import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Building2, Users, ScrollText, FileText, ShieldCheck, Wallet, BookOpen, Brush, Settings, Plane, Luggage, LayoutDashboard, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import { cn } from "@/lib/utils";

const items = [
  { to: "/admin", label: "Visão Geral", icon: LayoutDashboard, exact: true },
  { to: "/admin/agencies", label: "Agências", icon: Building2 },
  { to: "/admin/agents", label: "Agentes", icon: Users },
  { to: "/admin/travelers", label: "Viajantes", icon: Users },
  { to: "/admin/trips", label: "Viagens", icon: Luggage },
  { to: "/admin/contracts", label: "Contratos", icon: ScrollText },
  { to: "/admin/billing", label: "Faturamento", icon: Wallet },
  { to: "/admin/plans", label: "Planos", icon: FileText },
  { to: "/admin/policies", label: "Políticas", icon: ShieldCheck },
  { to: "/admin/brand", label: "Marca", icon: Brush },
  { to: "/admin/knowledge", label: "Conhecimento", icon: BookOpen },
  { to: "/admin/audit", label: "Auditoria", icon: ScrollText },
  { to: "/admin/settings", label: "Configurações", icon: Settings },
];

export function AdminShell() {
  const [authorized, setAuthorized] = useState<null | boolean>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { if (!cancel) setAuthorized(false); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "super_admin").maybeSingle();
      if (!cancel) setAuthorized(!!data);
    })();
    return () => { cancel = true; };
  }, []);

  if (authorized === null) return <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">Verificando acesso…</div>;
  if (!authorized) return (
    <div className="flex h-screen items-center justify-center">
      <div className="rounded-lg border border-border bg-surface p-6 text-center">
        <Plane className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Acesso restrito</h2>
        <p className="mt-1 text-xs text-muted-foreground">Esta área é apenas para administradores globais.</p>
        <Link to="/" className="mt-3 inline-block text-xs font-medium text-foreground underline">Voltar</Link>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="flex h-12 items-center gap-2 border-b border-border px-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-xs font-bold text-background">A</div>
          <span className="text-sm font-semibold">Admin Global</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          <ul className="space-y-0.5">
            {items.map((it) => {
              const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
              const Icon = it.icon;
              return (
                <li key={it.to}>
                  <Link to={it.to} className={cn("flex h-9 items-center gap-2.5 rounded-md px-2 text-sm text-muted-foreground hover:bg-surface-alt hover:text-foreground", active && "bg-surface-alt text-foreground")}>
                    <Icon className="h-4 w-4" />
                    <span className="truncate">{it.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <button onClick={signOut} className="flex h-10 items-center gap-2 border-t border-border px-3 text-xs text-muted-foreground hover:text-foreground">
          <LogOut className="h-3.5 w-3.5" /> Sair
        </button>
      </aside>
      <main className="no-scrollbar min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1200px] px-6 py-6"><Outlet /></div>
      </main>
    </div>
  );
}
