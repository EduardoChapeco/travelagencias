import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import webpush from "npm:web-push@3.6.4";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.10.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // VAPID keys provided via environment variables
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@turis.com";

    if (!supabaseUrl || !supabaseServiceKey || !vapidPublicKey || !vapidPrivateKey) {
      throw new Error("Missing critical environment variables.");
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { title, body, url, user_id, agency_id } = await req.json();

    let query = supabase.from("web_push_subscriptions").select("*");
    if (user_id) query = query.eq("user_id", user_id);
    if (agency_id) query = query.eq("agency_id", agency_id);

    const { data: subscriptions, error } = await query;
    if (error) throw error;

    const notifications = subscriptions.map((sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      const payload = JSON.stringify({
        title: title || "Turis",
        body: body || "Você tem uma nova notificação.",
        url: url || "/",
      });

      return webpush.sendNotification(pushSubscription, payload).catch(async (err) => {
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log(`Subscription expired. Deleting endpoint: ${sub.endpoint}`);
          await supabase.from("web_push_subscriptions").delete().eq("endpoint", sub.endpoint);
        } else {
          console.error("Error sending push:", err);
        }
      });
    });

    await Promise.all(notifications);

    return new Response(JSON.stringify({ success: true, sent: notifications.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
