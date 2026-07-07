import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import "nprogress/nprogress.css";
import nprogress from "nprogress";
import { reportLovableError } from "../lib/lovable-error-reporting";

nprogress.configure({ showSpinner: false, speed: 400, minimum: 0.2 });

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-4 text-left text-xs bg-red-100 text-red-900 p-4 rounded overflow-auto">
          <strong>{error?.message || "Unknown Error"}</strong>
          <pre className="mt-2 whitespace-pre-wrap">{error?.stack}</pre>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

let cachedBrandPromise: Promise<any> | null = null;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient, brand?: any }>()({
  head: ({ context }: any) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: `${context?.brand?.platform_name || 'Turis'} — Plataforma para Agências de Viagens` },
      {
        name: "description",
        content:
          "CRM, propostas, contratos digitais, vouchers, embarques, portal do cliente e financeiro em um único workspace para agências de viagens.",
      },
      { name: "author", content: "Turis" },
      { property: "og:title", content: "Turis — Plataforma para Agências de Viagens" },
      {
        property: "og:description",
        content:
          "CRM, propostas, contratos digitais, vouchers, embarques, portal do cliente e financeiro em um único workspace para agências de viagens.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Turis — Plataforma para Agências de Viagens" },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/80b490db-507f-4163-8392-28db4d59825b/id-preview-1281c9e4--a96da259-7773-4de2-b818-1c99dad3b5a8.lovable.app-1781038752630.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/80b490db-507f-4163-8392-28db4d59825b/id-preview-1281c9e4--a96da259-7773-4de2-b818-1c99dad3b5a8.lovable.app-1781038752630.png",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Bebas+Neue&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
  pendingComponent: PendingComponent,
  beforeLoad: async () => {
    try {
      if (!cachedBrandPromise) {
        cachedBrandPromise = import("@/integrations/supabase/client").then(m =>
          (m.supabase as any)
            .from("platform_branding")
            .select("*")
            .single()
            .then((res: any) => res.data)
        );
      }
      const data = await cachedBrandPromise;
      return { brand: data || undefined };
    } catch {
      return {};
    }
  },
});

function RootShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const loc = router.state.location.pathname;
  const slug = loc.startsWith("/p/")
    ? loc.split("/")[2]
    : loc.startsWith("/agency/")
      ? loc.split("/")[2]
      : null;
  const manifestUrl = slug ? `/api/public/manifest?agency=${slug}` : "/api/public/manifest";

  return (
    <html lang="en">
      <head>
        <HeadContent />
        <link rel="manifest" href={manifestUrl} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const isLoading = useRouterState({ select: (s: any) => s.status === "pending" });

  useEffect(() => {
    if (isLoading) {
      nprogress.start();
    } else {
      nprogress.done();
    }
  }, [isLoading]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}

function PendingComponent() {
  return (
    <div className="flex h-full flex-col p-6 space-y-4 animate-pulse bg-background">
      <div className="h-8 w-1/4 rounded-full bg-surface-alt border border-border" />
      <div className="h-4 w-1/2 rounded-full bg-surface-alt border border-border" />
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-32 rounded-2xl bg-surface-alt border border-border" />
        <div className="h-32 rounded-2xl bg-surface-alt border border-border" />
        <div className="h-32 rounded-2xl bg-surface-alt border border-border" />
      </div>
    </div>
  );
}
