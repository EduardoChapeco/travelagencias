import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import {
  Home,
  Luggage,
  Wallet,
  FileText,
  Bell,
  Gift,
  Ticket,
  User,
  LogOut,
  Shield,
  Menu,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import { DockNavigation, type SlimSidebarItem } from "./DockNavigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const items = [
  { to: "/client", label: "Início", icon: Home, exact: true },
  { to: "/client/trips", label: "Minhas viagens", icon: Luggage },
  { to: "/client/payments", label: "Pagamentos", icon: Wallet },
  { to: "/client/documents", label: "Documentos", icon: FileText },
  { to: "/client/coupons", label: "Cupons", icon: Ticket },
  { to: "/client/giftcards", label: "Gift Cards", icon: Gift },
  { to: "/client/consents", label: "Consentimentos", icon: Shield },
  { to: "/client/notifications", label: "Notificações", icon: Bell },
  { to: "/client/profile", label: "Perfil", icon: User },
];

export function ClientShell() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [authenticatingToken, setAuthenticatingToken] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancel = false;
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (token) {
      setAuthenticatingToken(true);

      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      supabase.functions
        .invoke("client-token-login", {
          body: { token, redirect_to: cleanUrl },
        })
        .then(({ data, error }) => {
          if (cancel) return;
          if (error || !data?.action_link) {
            toast.error(error?.message || "Link de login inválido ou expirado.");
            setAuthenticatingToken(false);
            supabase.auth.getUser().then(({ data: userData }) => {
              if (cancel) return;
              setAuthed(!!userData.user);
              setReady(true);
            });
          } else {
            window.location.href = data.action_link;
          }
        });
    } else {
      supabase.auth.getUser().then(({ data }) => {
        if (cancel) return;
        setAuthed(!!data.user);
        setReady(true);
      });
    }

    return () => {
      cancel = true;
    };
  }, []);

  if (authenticatingToken)
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        Autenticando via link seguro...
      </div>
    );

  if (!ready)
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  if (!authed)
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-2xl border border-border bg-surface p-6 text-center">
          <h2 className="text-sm font-semibold">Entre para acessar sua área</h2>
          <Link
            to="/auth/login"
            className="mt-3 inline-block rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background"
          >
            Entrar
          </Link>
        </div>
      </div>
    );

  return (
    <div className="flex h-screen w-full bg-background text-foreground flex-col md:flex-row relative">
      <DockNavigation
        items={items as SlimSidebarItem[]}
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
      <main className="no-scrollbar min-w-0 flex-1 overflow-y-auto">
        <div className="w-full px-4 md:px-8 xl:px-16 py-6 md:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
