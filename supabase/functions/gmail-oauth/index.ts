import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID") ?? "";
    const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET") ?? "";
    const redirectUri = Deno.env.get("GOOGLE_OAUTH_REDIRECT_URI") ?? "http://localhost:5173/inbox/oauth-callback";
    const pubsubTopic = Deno.env.get("GMAIL_PUBSUB_TOPIC") ?? "projects/meu-projeto/topics/gmail-webhooks";

    if (action === "get_url") {
      // 1. Gera a URL de Autenticacao
      const stateObj = {
        org_id: url.searchParams.get("org_id"),
        user_id: url.searchParams.get("user_id"),
        account_type: url.searchParams.get("account_type") || "personal"
      };
      const stateStr = btoa(JSON.stringify(stateObj));

      const scopes = [
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/gmail.settings.basic",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile"
      ].join(" ");

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent&state=${stateStr}`;

      return new Response(JSON.stringify({ url: authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "callback") {
      // 2. Recebe o 'code' e troca por tokens
      const { code, state } = await req.json();
      if (!code) throw new Error("Missing code");

      let stateObj: any = {};
      try {
        stateObj = JSON.parse(atob(state));
      } catch (e) {
        throw new Error("Invalid state parameter");
      }

      // Exchange code for tokens
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenRes.ok) throw new Error("Failed to exchange token: " + await tokenRes.text());
      const tokens = await tokenRes.json();

      // Get user profile
      const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      });
      const profile = await profileRes.json();

      // Enable Pub/Sub Push Watch
      const watchRes = await fetch(`${GMAIL_API_BASE}/watch`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          labelIds: ["INBOX", "SENT"],
          topicName: pubsubTopic
        })
      });

      let watchExpiry = null;
      let historyId = null;
      if (watchRes.ok) {
        const watchData = await watchRes.json();
        historyId = watchData.historyId;
        // Watch typically expires in 7 days
        watchExpiry = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();
      } else {
        console.warn("Failed to set up Gmail Watch:", await watchRes.text());
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Save to database
      const { data, error } = await supabase.from("email_accounts").upsert({
        org_id: stateObj.org_id,
        user_id: stateObj.user_id,
        account_type: stateObj.account_type,
        email_address: profile.email,
        display_name: profile.name,
        profile_picture: profile.picture,
        access_token_enc: tokens.access_token, // Ideally encrypted via pgcrypto here
        refresh_token_enc: tokens.refresh_token || "", // If no refresh token, prompt=consent was missed
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        scopes: tokens.scope?.split(" ") || [],
        gmail_history_id: historyId,
        pubsub_topic: pubsubTopic,
        watch_expiry: watchExpiry,
        status: "active",
        connected_by: stateObj.user_id
      }, { onConflict: "org_id, email_address" })
      .select("*")
      .single();

      if (error) throw new Error("DB Error: " + error.message);

      return new Response(JSON.stringify({ success: true, account: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Unknown action", { status: 400, headers: corsHeaders });
  } catch (error: any) {
    console.error("gmail-oauth error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
