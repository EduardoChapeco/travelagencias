import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/p/$agency_slug/blog/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} · Blog` }] }),
  component: Page,
});

function Page() {
  const { agency_slug, slug } = Route.useParams();
  const q = useQuery({
    queryKey: ["portal-post", agency_slug, slug],
    queryFn: async () => {
      const { data: agency } = await supabase.rpc("get_public_agency_by_slug", { _slug: agency_slug }).maybeSingle();
      if (!agency) return null;
      const { data: post } = await supabase.from("blog_posts").select("*").eq("agency_id", agency.id).eq("slug", slug).eq("status", "published").maybeSingle();
      return { agency, post };
    },
  });

  if (q.isLoading) return <div className="p-10 text-center text-sm text-muted-foreground">Carregando…</div>;
  if (!q.data?.post) return <div className="p-10 text-center text-sm">Post não encontrado</div>;
  const { post, agency } = q.data;

  return (
    <article className="mx-auto min-h-screen max-w-3xl px-6 py-12">
      <div className="text-xs text-muted-foreground">{agency.name}</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{post.title}</h1>
      {post.published_at && <div className="mt-2 text-xs text-muted-foreground">{new Date(post.published_at).toLocaleDateString("pt-BR")}</div>}
      {post.cover_image_url && <img src={post.cover_image_url} alt={post.title} className="my-6 w-full rounded-lg object-cover" />}
      {post.excerpt && <p className="text-lg italic text-muted-foreground">{post.excerpt}</p>}
      <div className="prose prose-sm dark:prose-invert mt-6 whitespace-pre-line">{post.content}</div>
      {post.tags?.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">{post.tags.map((t: string) => <span key={t} className="rounded-full bg-surface-alt px-2 py-1 text-xs">#{t}</span>)}</div>
      )}
    </article>
  );
}
