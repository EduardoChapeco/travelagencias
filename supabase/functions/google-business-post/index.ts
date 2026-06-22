/**
 * Edge Function: google-business-post
 *
 * Publica um post do blog no Google Business Profile via API.
 *
 * Pré-requisito: configurar os segredos abaixo no Supabase Dashboard:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_REFRESH_TOKEN    (gerado via OAuth2 flow)
 *   GOOGLE_ACCOUNT_ID       (formato: accounts/XXXXXXXXXXXXXXX)
 *
 * O flow OAuth de autorização está fora do escopo desta Edge Function
 * e deve ser feito manualmente via Google OAuth Playground:
 * https://developers.google.com/oauthplayground/
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function checkMembership(
  supabaseAdmin: any,
  userId: string,
  agencyId?: string | null,
): Promise<boolean> {
  const { data: roles, error } = await supabaseAdmin
    .from("user_roles")
    .select("role, agency_id")
    .eq("user_id", userId);

  if (error || !roles) return false;

  const isSuperAdmin = roles.some((r: any) => r.role === "super_admin");
  if (isSuperAdmin) return true;

  if (!agencyId) return false;
  return roles.some((r: any) => r.agency_id === agencyId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Auth guard ─────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { post_id, agency_id } = await req.json();
    if (!post_id || !agency_id) {
      return new Response(JSON.stringify({ error: "post_id e agency_id são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Verify membership ─────────────────────────────────────────
    const hasAccess = await checkMembership(supabase, user.id, agency_id);

    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Load post ─────────────────────────────────────────────────
    const { data: post, error: postErr } = await supabase
      .from("blog_posts")
      .select("id, title, excerpt, cover_image_url, slug, status, google_post_id")
      .eq("id", post_id)
      .eq("agency_id", agency_id)
      .maybeSingle();

    if (postErr || !post) {
      return new Response(JSON.stringify({ error: "Post não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (post.status !== "published") {
      return new Response(
        JSON.stringify({ error: "Apenas posts publicados podem ser enviados ao Google" }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── Load agency settings for google_business_id ───────────────
    const { data: company } = await supabase
      .from("company_profiles")
      .select("google_business_id")
      .eq("agency_id", agency_id)
      .maybeSingle();

    const googleAccountId = Deno.env.get("GOOGLE_ACCOUNT_ID");
    const locationId = company?.google_business_id;

    if (!googleAccountId) {
      return new Response(
        JSON.stringify({
          error:
            "Variável GOOGLE_ACCOUNT_ID não configurada no Supabase. Configure em: Settings > Edge Functions > Secrets",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── Get Google Access Token via Refresh Token ─────────────────
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN");

    if (!clientId || !clientSecret || !refreshToken) {
      return new Response(
        JSON.stringify({
          error:
            "Credenciais Google OAuth não configuradas. Acesse: https://developers.google.com/oauthplayground/",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return new Response(
        JSON.stringify({
          error: "Falha ao obter token Google. Verifique GOOGLE_REFRESH_TOKEN.",
          details: tokenData,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const accessToken = tokenData.access_token;

    // ── Build GBP Post payload ────────────────────────────────────
    // Google Business Profile API v4
    // https://developers.google.com/my-business/reference/businesscommunications/rest/v1/localPosts
    const locationName = locationId
      ? `${googleAccountId}/locations/${locationId}`
      : googleAccountId;

    const gbpPostBody: Record<string, any> = {
      languageCode: "pt-BR",
      summary: [post.title, post.excerpt ? `\n\n${post.excerpt}` : ""].join(""),
      topicType: "STANDARD",
    };

    if (post.cover_image_url) {
      gbpPostBody.media = [
        {
          mediaFormat: "PHOTO",
          sourceUrl: post.cover_image_url,
        },
      ];
    }

    // ── POST to Google Business Profile API ───────────────────────
    const gbpUrl = `https://mybusiness.googleapis.com/v4/${locationName}/localPosts`;
    const gbpRes = await fetch(gbpUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(gbpPostBody),
    });

    const gbpData = await gbpRes.json();

    if (!gbpRes.ok) {
      console.error("GBP API error:", JSON.stringify(gbpData));
      return new Response(
        JSON.stringify({
          error: "Erro na API do Google Business.",
          details: gbpData,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── Update post record ────────────────────────────────────────
    const { error: updateErr } = await supabase
      .from("blog_posts")
      .update({
        google_posted_at: new Date().toISOString(),
        google_post_id: gbpData.name || null,
      })
      .eq("id", post_id);

    if (updateErr) {
      console.error("Failed to update post google fields:", updateErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        google_post_id: gbpData.name,
        message: "Post publicado com sucesso no Google Meu Negócio!",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
