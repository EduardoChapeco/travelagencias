import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { Home, Luggage, Wallet, FileText, Bell, Gift, Ticket, User, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import { SlimSidebar, type SlimSidebarItem } from "./SlimSidebar";

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
  const navigate = useNavigate();

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
      <SlimSidebar
        items={items as SlimSidebarItem[]}
        brand={
          <>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">V</div>
            <span className="ml-3 min-w-0 translate-x-1 truncate text-sm font-semibold opacity-0 transition group-hover/sidebar:translate-x-0 group-hover/sidebar:opacity-100 group-focus-within/sidebar:translate-x-0 group-focus-within/sidebar:opacity-100">Meu Painel</span>
          </>
        }
        footer={
          <button onClick={() => signOut().then(() => navigate({ to: "/auth/login", replace: true }))} className="flex h-9 w-full items-center gap-3 overflow-hidden rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span className="translate-x-1 opacity-0 transition group-hover/sidebar:translate-x-0 group-hover/sidebar:opacity-100 group-focus-within/sidebar:translate-x-0 group-focus-within/sidebar:opacity-100">Sair</span>
          </button>
        }
      />
      <main className="no-scrollbar min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1100px] px-6 py-6"><Outlet /></div>
      </main>
    </div>
  );
}
