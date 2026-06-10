// @ts-ignore
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { supabase } from "@/integrations/supabase/client";

export const APIRoute = createAPIFileRoute("/api/public/sitemap/$agency_slug")({
  GET: async ({ request, params }: any) => {
    try {
      const { agency_slug } = params;

      // 1. Fetch agency
      const { data: agency } = await (supabase as any)
        .rpc("get_public_agency_by_slug", { _slug: agency_slug })
        .maybeSingle();

      if (!agency) {
        return new Response("Agency not found", { status: 404 });
      }

      const baseUrl = `https://travelos.com/p/${agency_slug}`;
      const urls: { loc: string; lastmod?: string; priority?: string }[] = [];

      // Home
      urls.push({ loc: baseUrl, priority: "1.0" });

      // Portal Pages (excluding home as it's the root)
      const { data: pages } = await supabase
        .from("portal_pages")
        .select("slug, updated_at")
        .eq("agency_id", (agency as any).id)
        .eq("is_published", true)
        .neq("slug", "home");
      
      pages?.forEach((p) => {
        urls.push({
          loc: `${baseUrl}/${p.slug}`,
          lastmod: p.updated_at,
          priority: "0.8"
        });
      });

      // Blog Posts
      const { data: posts } = await supabase
        .from("blog_posts")
        .select("slug, updated_at")
        .eq("agency_id", (agency as any).id)
        .eq("status", "published");
      
      posts?.forEach((p) => {
        urls.push({
          loc: `${baseUrl}/blog/${p.slug}`,
          lastmod: p.updated_at,
          priority: "0.7"
        });
      });

      // Knowledge Base Articles
      const { data: kb } = await supabase
        .from("knowledge_articles")
        .select("slug, updated_at")
        .eq("agency_id", agency!.id)
        .eq("is_internal", false);
      
      (kb as any[])?.forEach((k) => {
        urls.push({
          loc: `${baseUrl}/kb/${k.slug}`,
          lastmod: k.updated_at,
          priority: "0.6"
        });
      });

      // Public Group Tours
      const { data: tours } = await supabase
        .from("group_tours")
        .select("id, updated_at")
        .eq("agency_id", (agency as any).id)
        .eq("is_public", true)
        .in("status", ["open", "confirmed"]);
      
      tours?.forEach((t) => {
        urls.push({
          loc: `${baseUrl}/tour/${t.id}`,
          lastmod: t.updated_at,
          priority: "0.9"
        });
      });

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ""}${u.priority ? `\n    <priority>${u.priority}</priority>` : ""}
  </url>`).join("\n")}
</urlset>`;

      return new Response(xml, {
        status: 200,
        headers: {
          "Content-Type": "application/xml",
          "Cache-Control": "public, max-age=3600",
        },
      });

    } catch (e: any) {
      return new Response(e.message, { status: 500 });
    }
  },
});
