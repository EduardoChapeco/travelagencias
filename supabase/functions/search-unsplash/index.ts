import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header.");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    let isServiceRole = false;
    if (serviceRoleKey && authHeader.replace("Bearer ", "") === serviceRoleKey) {
      isServiceRole = true;
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    if (!isServiceRole) {
      const {
        data: { user },
        error: authError,
      } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
      if (authError || !user) throw new Error("Unauthorized access.");
    }

    const { query, per_page = 12 } = await req.json();

    if (!query) {
      throw new Error("Busca vazia.");
    }

    const accessKey = Deno.env.get("UNSPLASH_ACCESS_KEY");
    if (!accessKey) {
      throw new Error("Chave do Unsplash não configurada no servidor.");
    }

    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${per_page}&orientation=landscape`,
      {
        headers: {
          "Accept-Version": "v1",
          Authorization: `Client-ID ${accessKey}`,
        },
      },
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Unsplash API Error:", text);
      throw new Error("Erro ao buscar imagens no Unsplash.");
    }

    const data = await response.json();

    const photos = data.results.map((img: any) => ({
      id: img.id,
      url_regular: img.urls.regular,
      url_full: img.urls.full,
      url_thumb: img.urls.thumb,
      photographer: img.user.name,
      photographer_url: img.user.links.html,
      alt: img.alt_description,
    }));

    return new Response(JSON.stringify({ photos }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Erro search-unsplash:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
