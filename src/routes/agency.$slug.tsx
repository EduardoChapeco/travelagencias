import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/AppShell";
import { Loader2, AlertOctagon } from "lucide-react";
import { AgencyProvider, useAgency, type Agency } from "@/lib/agency-context";
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
      .select("id, slug, name, brand_color, brand_color_light, brand_color_fg, logo_url, status")
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
  errorComponent: ({ error }) => {
    const loc = typeof window !== "undefined" ? window.location.pathname : "";
    const parts = loc.split("/");
    const slug = parts[2] || "";

    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 px-6 text-center bg-background text-foreground">
        <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-2">
          <AlertOctagon className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Ocorreu um erro no módulo</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          {error.message || "Erro desconhecido ao carregar esta página."}
        </p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => {
              if (typeof window !== "undefined") window.location.reload();
            }}
            className="inline-flex h-9 items-center justify-center rounded-full bg-brand px-4 text-sm font-semibold text-white shadow transition-colors hover:bg-brand/90 cursor-pointer"
          >
            Recarregar Página
          </button>
          {slug && (
            <a
              href={`/agency/${slug}`}
              className="inline-flex h-9 items-center justify-center rounded-full border-none glass-card border-none px-4 text-sm font-semibold text-foreground shadow-none transition-colors hover:glass bg-white/5 border-white/10"
            >
              Voltar ao Início
            </a>
          )}
        </div>
        <a href="/auth/login" className="mt-8 text-xs text-muted-foreground hover:underline">
          Entrar com outra conta
        </a>
      </div>
    );
  },
  component: Layout,
});

function Layout() {
  const { agency } = Route.useLoaderData() as { agency: Agency };

  return (
    <AgencyProvider preloadedAgency={agency}>
      <BlockedWrapper>
        <AppShell>
          <Outlet />
        </AppShell>
      </BlockedWrapper>
    </AgencyProvider>
  );
}

function BlockedWrapper({ children }: { children: React.ReactNode }) {
  const { agency } = useAgency();

  if (agency?.status === "blocked") {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 p-6 text-center text-white">
        <div className="max-w-md space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[var(--radius-card)] bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <AlertOctagon className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">
              Acesso Suspenso
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed font-medium">
              O acesso da sua agência <strong className="text-white">"{agency.name}"</strong> foi
              temporariamente suspenso por pendências administrativas ou financeiras.
            </p>
          </div>

          <div className="rounded-[var(--radius-card)] bg-zinc-900 border border-zinc-800 p-4 text-xs text-zinc-500 leading-relaxed">
            Se você é o proprietário desta agência, acesse a central de pagamentos ou entre em
            contato com o suporte financeiro do Turis para regularizar sua assinatura.
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="h-10 rounded-[var(--radius-card)] bg-zinc-800 px-6 text-xs font-bold uppercase tracking-wider text-white hover:bg-zinc-700 transition-all cursor-pointer"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
