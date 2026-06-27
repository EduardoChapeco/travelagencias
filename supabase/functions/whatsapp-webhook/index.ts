import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
};

async function computeHmacSha256(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    messageData
  );

  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const url = new URL(req.url);

  // 1. WhatsApp Webhook Verification (GET)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    // Validate against whatsapp_connections DB or global env var
    const { data: connection } = await supabase
      .from("whatsapp_connections")
      .select("id")
      .eq("verify_token_reference", token)
      .eq("status", "active")
      .limit(1);

    if (mode === "subscribe" && (connection?.length || token === Deno.env.get("META_VERIFY_TOKEN"))) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Invalid verify token", { status: 403 });
  }

  // 2. Incoming Payload (POST)
  try {
    const signature = req.headers.get("x-hub-signature-256");
    const rawBody = await req.text();

    // ──────────────────────────────────────────────────────────────────────
    // P0.1 — HMAC MANDATORY EARLY REJECT
    // Validate the signature before even parsing the body.
    // If no signature is present on a POST, reject immediately.
    // ──────────────────────────────────────────────────────────────────────
    if (!signature) {
      console.warn("[P0] Rejected: Missing x-hub-signature-256 header.");
      return new Response("Unauthorized", { status: 401 });
    }

    const body = JSON.parse(rawBody);

    // Meta API Object
    if (body.object === "whatsapp_business_account") {
      for (const entry of body.entry) {
        const wabaId = entry.id;

        // Fetch connection info for signature validation and agency matching
        const { data: connections, error: connErr } = await supabase
          .from("whatsapp_connections")
          .select("id, agency_id, secret_reference")
          .eq("waba_id", wabaId)
          .eq("status", "active")
          .limit(1);

        if (connErr) {
          console.error(`[Webhook] DB error fetching connection for WABA ${wabaId}:`, connErr.message);
          continue;
        }

        const connection = connections?.[0];

        if (!connection) {
          console.warn(`[Webhook] No active connection found for WABA ID: ${wabaId}`);
          continue;
        }

        // ──────────────────────────────────────────────────────────────────
        // P0.1 — Per-connection HMAC validation (mandatory, no bypass)
        // Falls back to global META_APP_SECRET only if connection has none.
        // If NEITHER secret is available → reject with 500 (server misconfiguration).
        // ──────────────────────────────────────────────────────────────────
        const appSecret = connection.secret_reference || Deno.env.get("META_APP_SECRET");
        if (!appSecret) {
          console.error(
            `[P0] CRITICAL: No app secret configured for WABA ${wabaId}. ` +
            `Set META_APP_SECRET env var or configure secret_reference in whatsapp_connections.`
          );
          return new Response("Server misconfiguration", { status: 500 });
        }

        const expectedSignature = `sha256=${await computeHmacSha256(appSecret, rawBody)}`;
        if (signature !== expectedSignature) {
          console.warn(`[P0] Rejected: Invalid HMAC signature for WABA ${wabaId}.`);
          return new Response("Unauthorized", { status: 401 });
        }

        // Signature is valid — process changes
        for (const change of entry.changes) {
          if (change.value) {
            // Handle Messages
            if (change.value.messages) {
              for (const msg of change.value.messages) {
                await processIncomingMessage(supabase, connection, msg, change.value.contacts);
              }
            }
            // Handle Statuses
            if (change.value.statuses) {
              for (const statusObj of change.value.statuses) {
                await processMessageStatus(supabase, statusObj);
              }
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Webhook] Unhandled error:", error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

async function processIncomingMessage(supabase: any, connection: any, msg: any, contacts: any[]) {
  const phone = msg.from;
  const text = msg.text?.body || "";
  const wamid = msg.id;
  const timestamp = new Date(parseInt(msg.timestamp) * 1000).toISOString();

  if (!phone) return;

  const contactName = contacts?.find((c: any) => c.wa_id === phone)?.profile?.name || "Novo Contato";
  const cleanPhone = phone.replace(/\D/g, "");

  // 1. Find or Create Lead
  let { data: leads } = await supabase
    .from("leads")
    .select("id, agency_id")
    .eq("agency_id", connection.agency_id)
    .ilike("phone", `%${cleanPhone.slice(-8)}%`)
    .limit(1);

  let lead = leads?.[0];

  if (!lead) {
    const { data: newLead, error: leadErr } = await supabase
      .from("leads")
      .insert({
        agency_id: connection.agency_id,
        name: contactName,
        phone: cleanPhone,
        status: "new",
        source: "whatsapp",
      })
      .select("id, agency_id")
      .single();

    // P0.2 — propagate error instead of swallowing it silently
    if (leadErr) throw new Error(`Failed to create lead for ${cleanPhone}: ${leadErr.message}`);
    lead = newLead;
  }

  // 2. Find or Create Session
  let { data: sessions } = await supabase
    .from("omnichannel_sessions")
    .select("id")
    .eq("agency_id", lead.agency_id)
    .eq("phone_number", cleanPhone)
    .limit(1);

  let session = sessions?.[0];

  if (!session) {
    const { data: newSession, error: sessionErr } = await supabase
      .from("omnichannel_sessions")
      .insert({
        agency_id: lead.agency_id,
        session_name: contactName,
        provider: "meta_official",
        status: "connected",
        phone_number: cleanPhone,
        connection_id: connection.id,
        contact_name: contactName,
        assignment_status: "unassigned",
      })
      .select("id")
      .single();

    // P0.2 — was silently swallowed before; now throws so the outer catch returns 400
    if (sessionErr) throw new Error(`Failed to create omnichannel_session for ${cleanPhone}: ${sessionErr.message}`);
    session = newSession;
  }

  // 3. Prevent duplicate message (idempotency via unique wamid index)
  const { data: existingMsg } = await supabase
    .from("omnichannel_messages")
    .select("id")
    .eq("wamid", wamid)
    .limit(1);

  if (!existingMsg || existingMsg.length === 0) {
    const { error: msgErr } = await supabase.from("omnichannel_messages").insert({
      agency_id: lead.agency_id,
      lead_id: lead.id,
      session_id: session.id,
      channel: "whatsapp",
      direction: "inbound",
      content: text,
      status: "delivered",
      external_message_id: wamid,
      wamid: wamid,
      created_at: timestamp,
    });
    if (msgErr) throw new Error(`Failed to insert message wamid=${wamid}: ${msgErr.message}`);
  }
}

async function processMessageStatus(supabase: any, statusObj: any) {
  const wamid = statusObj.id;
  const status = statusObj.status; // 'sent' | 'delivered' | 'read' | 'failed'
  const timestamp = new Date(parseInt(statusObj.timestamp) * 1000).toISOString();

  const updatePayload: Record<string, unknown> = { status };

  if (status === "delivered") updatePayload.delivered_at = timestamp;
  if (status === "read") updatePayload.read_at = timestamp;
  if (status === "failed") {
    updatePayload.failed_at = timestamp;
    updatePayload.failure_code = statusObj.errors?.[0]?.code;
    updatePayload.failure_message = statusObj.errors?.[0]?.title;
  }

  // Use external_message_id or wamid
  await supabase
    .from("omnichannel_messages")
    .update(updatePayload)
    .or(`wamid.eq.${wamid},external_message_id.eq.${wamid}`);
}
