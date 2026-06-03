import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Home, Luggage, Wallet, FileText, Bell, Gift, Ticket, User, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import { cn } from "@/lib/utils";

const items = [
  { to: "/client", label: "Início", icon: Home, exact: true },
  { to: "/client/trips", label: "Minhas viagens", icon: Luggage },
  { to: "/client/payments", label: "Pagamentos", icon: Wallet },
  { to: "/client/documents", label: "Documentos", icon: FileText },
  { to: "/client/coupons", label: "Cupons", icon: Ticket },
  { to: "/client/giftcards", label: "Gift Cards", icon: Gift },
  { to: "/client/notifications", label: "Notificações", icon: Bell },
  { to: "/client/profile", label: "Perfil", icon: User },
];

export function ClientShell() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    let cancel = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancel) return;
      setAuthed(!!data.user); setReady(true);
    });
    return () => { cancel = true; };
  }, []);

  if (!ready) return <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">Carregando…</div>;
  if (!authed) return (
    <div className="flex h-screen items-center justify-center">
      <div className="rounded-lg border border-border bg-surface p-6 text-center">
        <h2 className="text-sm font-semibold">Entre para acessar sua área</h2>
        <Link to="/auth/login" className="mt-3 inline-block rounded-md bg-foreground px-4 py-2 text-xs font-semibold text-background">Entrar</Link>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="flex h-12 items-center gap-2 border-b border-border px-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-xs font-bold text-background">V</div>
          <span className="text-sm font-semibold">Meu Painel</span>
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
        <div className="mx-auto w-full max-w-[1100px] px-6 py-6"><Outlet /></div>
      </main>
    </div>
  );
}
