import { createFileRoute, Outlet, redirect, useParams } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/AppShell";
import { AgencyProvider, useAgency } from "@/lib/agency-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/agency/$slug")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth/login" });
    }
  },
  component: Layout,
});

function Layout() {
  const { slug } = useParams({ from: "/agency/$slug" });
  return (
    <AgencyProvider slug={slug}>
      <AgencyGuard>
        <AppShell>
          <Outlet />
        </AppShell>
      </AgencyGuard>
    </AgencyProvider>
  );
}

function AgencyGuard({ children }: { children: React.ReactNode }) {
  const { agency, loading, error } = useAgency();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando agência…
      </div>
    );
  }
  if (error || !agency) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 px-6 text-center">
        <h1 className="text-lg font-semibold">Agência não encontrada</h1>
        <p className="text-sm text-muted-foreground">
          {error ?? "Esta agência não existe ou você não tem acesso."}
        </p>
        <a href="/auth/login" className="mt-3 text-xs font-medium underline">
          Voltar para entrar
        </a>
      </div>
    );
  }
  return <>{children}</>;
}
