import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return new Response("Method Not Allowed", { status: 405 });

  try {
    const url = new URL(req.url);
    const agencySlug = url.searchParams.get("agency");

    if (!agencySlug) {
      return new Response("agency parameter is required", { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 1. Get Agency
    const { data: agency, error: agencyError } = await supabase
      .from("agencies")
      .select("id, name, slug")
      .eq("slug", agencySlug)
      .single();

    if (agencyError || !agency) {
      return new Response("Agency not found", { status: 404 });
    }

    // 2. Get Public Active Tours (status open or confirmed with is_public flag)
    const { data: tours, error: toursError } = await supabase
      .from("group_tours")
      .select("id, title, description, cover_image_url, base_price, total_seats, reserved_seats")
      .eq("agency_id", agency.id)
      .in("status", ["open", "confirmed"])
      .eq("is_public", true);

    if (toursError) throw toursError;

    // 3. Generate XML (RSS 2.0 with Google Base schema)
    const itemsXml = (tours || [])
      .map((t) => {
        const link = `https://${agency.slug}.travelos.com/tour/${t.id}`;
        const imageLink =
          t.cover_image_url || `https://${agency.slug}.travelos.com/placeholder.jpg`;
        // Calculate availability dynamically
        const availableSeats = (t.total_seats || 0) - (t.reserved_seats || 0);
        const availability = availableSeats > 0 ? "in stock" : "out of stock";
        const price = Number(t.base_price).toFixed(2);

        // Escape XML characters
        const title = (t.title || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        const desc = (t.description || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");

        return `
      <item>
        <g:id>${t.id}</g:id>
        <g:title>${title}</g:title>
        <g:description>${desc}</g:description>
        <g:link>${link}</g:link>
        <g:image_link>${imageLink}</g:image_link>
        <g:brand>${agency.name}</g:brand>
        <g:condition>new</g:condition>
        <g:availability>${availability}</g:availability>
        <g:price>${price} BRL</g:price>
      </item>
      `;
      })
      .join("");

    const xmlFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Catálogo - ${agency.name}</title>
    <link>https://${agency.slug}.travelos.com</link>
    <description>Catálogo dinâmico de roteiros para anúncios Meta/Google.</description>
    ${itemsXml}
  </channel>
</rss>`;

    return new Response(xmlFeed, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "s-maxage=3600, stale-while-revalidate", // 1h cache
      },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
