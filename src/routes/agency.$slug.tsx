import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/AppShell";
import { Loader2 } from "lucide-react";
import { AgencyProvider } from "@/lib/agency-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/agency/$slug")({
  ssr: false,
  beforeLoad: async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error || !session) {
      throw redirect({ to: "/auth/login" });
    }
  },
  loader: async ({ params: { slug } }) => {
    const { data, error } = await supabase
      .from("agencies")
      .select("id, slug, name, brand_color, brand_color_light, brand_color_fg, logo_url")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) {
      throw new Error("Esta agência não existe ou você não tem acesso.");
    }
    return { agency: data };
  },
  pendingComponent: () => (
    <div className="flex h-screen w-full items-center justify-center bg-background text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando agência...
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="flex h-screen flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-lg font-semibold">Agência não encontrada</h1>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <a href="/auth/login" className="mt-3 text-xs font-medium underline">
        Voltar para entrar
      </a>
    </div>
  ),
  component: Layout,
});

function Layout() {
  const { agency } = Route.useLoaderData();

  return (
    <AgencyProvider preloadedAgency={agency}>
      <AppShell>
        <Outlet />
      </AppShell>
    </AgencyProvider>
  );
}
