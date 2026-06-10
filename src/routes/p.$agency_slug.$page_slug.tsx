import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BlockRenderer, PortalBlock } from "@/components/portal/BlockRenderer";
import { GhostButton } from "@/components/ui/form";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/p/$agency_slug/$page_slug")({
  head: ({ params, context }: any) => {
    // SEO metadata is resolved via the loader context (populated below)
    const seo = context?.pageSeo as { meta_title?: string; meta_description?: string } | null;
    return {
      meta: [
        {
          title: seo?.meta_title
            ? `${seo.meta_title} · Portal`
            : `${params.page_slug} · Portal`,
        },
        ...(seo?.meta_description
          ? [{ name: "description", content: seo.meta_description }]
          : []),
      ],
    };
  },
  loader: async ({ params, context }: any) => {
    // Pre-fetch SEO to inject into head() — critical for server-side SEO rendering
    try {
      const { data: agency } = await ((context?.supabase ?? supabase) as any)
        .rpc("get_public_agency_by_slug", { _slug: params.agency_slug })
        .maybeSingle();
      if (!agency) return { pageSeo: null };

      const { data: page } = await (context?.supabase ?? supabase)
        .from("portal_pages")
        .select("seo:published_seo")
        .eq("agency_id", (agency as any).id)
        .eq("slug", params.page_slug)
        .eq("is_published", true)
        .maybeSingle();

      return { pageSeo: (page?.seo as { meta_title?: string; meta_description?: string } | null) ?? null };
    } catch {
      return { pageSeo: null };
    }
  },
  component: DynamicPage,
});

function DynamicPage() {
  const { agency_slug, page_slug } = Route.useParams();

  const q = useQuery({
    queryKey: ["portal-page", agency_slug, page_slug],
    queryFn: async () => {
      const { data: agency } = await (supabase as any)
        .rpc("get_public_agency_by_slug", { _slug: agency_slug as string })
        .maybeSingle();
      if (!agency) return { agency: null, page: null };

      const { data: page } = await supabase
        .from("portal_pages")
        .select("title:published_title, blocks:published_blocks, seo:published_seo")
        .eq("agency_id", (agency as any).id)
        .eq("slug", page_slug as string)
        .eq("is_published", true)
        .maybeSingle();

      return {
        agency: agency as any,
        page: page as any,
      };
    },
  });

  if (q.isLoading)
    return <div className="p-10 text-center text-sm text-muted-foreground">Carregando página…</div>;
  if (!q.data?.agency)
    return <div className="p-10 text-center text-sm">Agência não encontrada</div>;
  if (!q.data?.page) {
    return (
      <div className="p-20 text-center flex flex-col items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Página não encontrada</h1>
        <p className="text-muted-foreground">Esta página não existe ou foi despublicada.</p>
        <Link to="/p/$agency_slug" params={{ agency_slug }}>
          <GhostButton>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao início
          </GhostButton>
        </Link>
      </div>
    );
  }

  const { page } = q.data;

  return (
    <div className="w-full px-4 sm:px-6">
      {/* Page title from CMS (published_title), rendered for screen readers & SEO */}
      {page.title && (
        <h1 className="sr-only">{page.title}</h1>
      )}
      <BlockRenderer blocks={(page.blocks || []) as PortalBlock[]} agencySlug={agency_slug} />
    </div>
  );
}
