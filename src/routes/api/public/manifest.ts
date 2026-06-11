import { json } from "@tanstack/react-start";
// @ts-expect-error - ignored
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { supabase } from "@/integrations/supabase/client";

export const APIRoute = createAPIFileRoute("/api/public/manifest")({
  GET: async ({ request }: any) => {
    const url = new URL(request.url);
    const slug = url.searchParams.get("agency");

    const defaultManifest = {
      name: "TravelOS",
      short_name: "TravelOS",
      description: "Plataforma avançada para agências de turismo.",
      start_url: "/",
      display: "standalone",
      background_color: "#0f172a",
      theme_color: "#3b82f6",
      icons: [
        {
          src: "/icon-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/icon-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
    };

    if (!slug) {
      return json(defaultManifest);
    }

    // Buscar configurações da agência
    const { data: agency } = await supabase
      .from("agencies")
      .select("id, name, logo_url")
      .eq("slug", slug)
      .maybeSingle();

    if (!agency) {
      return json(defaultManifest);
    }

    const { data: settings } = await (supabase as any)
      .from("global_settings")
      .select("settings")
      .eq("agency_id", agency.id)
      .eq("key", "brand")
      .maybeSingle();

    const brand = (settings as any)?.settings as { primary_color?: string } | undefined;
    const themeColor = brand?.primary_color || "#3b82f6";
    const logo = agency.logo_url || "/icon-512x512.png";

    return json({
      name: agency.name,
      short_name: agency.name,
      description: `Portal do cliente - ${agency.name}`,
      start_url: `/p/${slug}`,
      display: "standalone",
      background_color: "#ffffff",
      theme_color: themeColor,
      icons: [
        {
          src: logo,
          sizes: "512x512",
          type: "image/png", // Note: Se a logo for JPG, isso pode precisar de ajuste, mas browsers aceitam.
        },
      ],
    });
  },
});
