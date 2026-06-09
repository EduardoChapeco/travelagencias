import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BlockRenderer, PortalBlock } from "@/components/portal/BlockRenderer";
import { GhostButton } from "@/components/ui/form";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/p/$agency_slug/$page_slug")({
  head: ({ params, routeContext }) => {
    // If we passed SEO metadata somehow or fetched it earlier, we'd use it here.
    return {
      meta: [
        { title: `${params.page_slug} · Portal` },
      ],
    };
  },
  component: DynamicPage,
});

function DynamicPage() {
  const { agency_slug, page_slug } = Route.useParams();

  const q = useQuery({
    queryKey: ["portal-page", agency_slug, page_slug],
    queryFn: async () => {
      const { data: agency } = await supabase.rpc("get_public_agency_by_slug", { _slug: agency_slug as string }).maybeSingle();
      if (!agency) return { agency: null, page: null };

      const { data: page } = await supabase
        .from("portal_pages")
        .select("title, blocks, seo")
        .eq("agency_id", agency.id)
        .eq("slug", page_slug as string)
        .eq("is_published", true)
        .maybeSingle();

      return {
        agency: agency as any,
        page: page as any,
      };
    },
  });

  if (q.isLoading) return <div className="p-10 text-center text-sm text-muted-foreground">Carregando página…</div>;
  if (!q.data?.agency) return <div className="p-10 text-center text-sm">Agência não encontrada</div>;
  if (!q.data?.page) {
    return (
      <div className="p-20 text-center flex flex-col items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Página não encontrada</h1>
        <p className="text-muted-foreground">Esta página não existe ou foi despublicada.</p>
        <Link to="/p/$agency_slug" params={{ agency_slug }}>
          <GhostButton><ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao início</GhostButton>
        </Link>
      </div>
    );
  }

  const { page } = q.data;

  // Render the Dynamic Blocks
  return (
    <div className="w-full px-4 sm:px-6">
      <BlockRenderer blocks={(page.blocks || []) as PortalBlock[]} agencySlug={agency_slug} />
    </div>
  );
}
