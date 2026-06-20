import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

interface GmailTokens {
  access_token: string;
  refresh_token: string;
  email_address: string;
  last_history_id?: string;
}

/**
 * Refreshes an expired Gmail OAuth token using the refresh_token.
 */
async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<string | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!res.ok) {
      console.error("Token refresh failed:", await res.text());
      return null;
    }
    const data = await res.json();
    return data.access_token ?? null;
  } catch (e) {
    console.error("refreshAccessToken error:", e);
    return null;
  }
}

/**
 * Fetches the full content of a Gmail message by its ID.
 */
async function fetchMessage(
  messageId: string,
  accessToken: string,
): Promise<{ from: string; subject: string; body: string; threadId: string } | null> {
  try {
    const res = await fetch(
      `${GMAIL_API_BASE}/messages/${messageId}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return null;
    const msg = await res.json();

    const headers = msg.payload?.headers ?? [];
    const from = headers.find((h: any) => h.name === "From")?.value ?? "";
    const subject = headers.find((h: any) => h.name === "Subject")?.value ?? "";

    // Extract text body (plain text preferred over html)
    let body = "";
    const parts: any[] = msg.payload?.parts ?? [];
    const textPart = parts.find((p: any) => p.mimeType === "text/plain") ??
      parts.find((p: any) => p.mimeType === "text/html");
    if (textPart?.body?.data) {
      body = new TextDecoder().decode(
        Uint8Array.from(atob(textPart.body.data.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
          c.charCodeAt(0),
        ),
      );
    } else if (msg.payload?.body?.data) {
      body = new TextDecoder().decode(
        Uint8Array.from(
          atob(msg.payload.body.data.replace(/-/g, "+").replace(/_/g, "/")),
          (c) => c.charCodeAt(0),
        ),
      );
    }

    return { from, subject, body: body.slice(0, 4000), threadId: msg.threadId ?? "" };
  } catch (e) {
    console.error("fetchMessage error:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Webhook from Google Cloud Pub/Sub
    const { message } = await req.json();

    if (!message?.data) {
      return new Response("Invalid Pub/Sub message", { status: 400 });
    }

    const dataBuffer = Uint8Array.from(atob(message.data), (c) => c.charCodeAt(0));
    const dataStr = new TextDecoder().decode(dataBuffer);
    const payload = JSON.parse(dataStr);

    // Payload: { emailAddress: "suporte@agencia.com", historyId: "123456" }
    const { emailAddress, historyId } = payload;

    if (!emailAddress || !historyId) {
      return new Response("Missing emailAddress or historyId", { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 1. Find the agency by emailAddress stored in integrations_config->gmail_tokens
    const { data: agencies, error: agencyErr } = await supabase
      .from("agencies")
      .select("id, integrations_config")
      .contains("integrations_config", { gmail_tokens: { email_address: emailAddress } });

    if (agencyErr || !agencies || agencies.length === 0) {
      console.warn("Agency not found for email:", emailAddress);
      return new Response("Agency not found", { status: 200 }); // ACK PubSub
    }

    const agency = agencies[0];
    const tokens = (agency.integrations_config as any)?.gmail_tokens as GmailTokens | undefined;

    if (!tokens?.access_token) {
      console.warn("No Gmail tokens for agency:", agency.id);
      return new Response("No tokens", { status: 200 });
    }

    // 2. Refresh token if needed using Google OAuth credentials from env
    const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID") ?? "";
    const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET") ?? "";
    let accessToken = tokens.access_token;

    // Always try a refresh to ensure freshness (tokens expire after 1h)
    if (tokens.refresh_token && clientId && clientSecret) {
      const refreshed = await refreshAccessToken(tokens.refresh_token, clientId, clientSecret);
      if (refreshed) {
        accessToken = refreshed;
        // Persist the new access token
        await supabase
          .from("agencies")
          .update({
            integrations_config: {
              ...(agency.integrations_config as any),
              gmail_tokens: { ...tokens, access_token: refreshed },
            },
          })
          .eq("id", agency.id);
      }
    }

    // 3. Fetch Gmail history since last saved historyId
    const startHistoryId = tokens.last_history_id ?? historyId;
    const historyRes = await fetch(
      `${GMAIL_API_BASE}/history?startHistoryId=${startHistoryId}&historyTypes=messageAdded`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!historyRes.ok) {
      const errText = await historyRes.text();
      console.error("Gmail history fetch failed:", errText);
      // Return 200 to avoid infinite PubSub retries
      return new Response(JSON.stringify({ error: "Gmail API error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const historyData = await historyRes.json();
    const newMessageIds: string[] = (historyData.history ?? []).flatMap(
      (h: any) => (h.messagesAdded ?? []).map((m: any) => m.message.id as string),
    );

    // 4. Process each new inbound message
    let processedCount = 0;
    for (const msgId of newMessageIds) {
      const msgContent = await fetchMessage(msgId, accessToken);
      if (!msgContent) continue;

      // Only process inbound messages (not sent by our agency email)
      if (msgContent.from.includes(emailAddress)) continue;

      // 5. Try to match to an existing support ticket by threadId
      const { data: ticket } = await supabase
        .from("support_tickets")
        .select("id, status")
        .eq("agency_id", agency.id)
        .eq("email_thread_id", msgContent.threadId)
        .maybeSingle();

      if (ticket) {
        // Append reply to existing ticket
        await supabase.from("ticket_messages").insert({
          ticket_id: ticket.id,
          sender: "client",
          content: `[Gmail · ${msgContent.from}]\n\n${msgContent.body}`,
        });

        // Reopen ticket if it was closed
        if (ticket.status === "closed" || ticket.status === "resolved") {
          await supabase
            .from("support_tickets")
            .update({ status: "open", stage: "open" })
            .eq("id", ticket.id);
        }
        processedCount++;
      } else {
        // Create a new support ticket for unmatched inbound email
        const { data: newTicket } = await supabase
          .from("support_tickets")
          .insert({
            agency_id: agency.id,
            title: msgContent.subject || `E-mail de ${msgContent.from}`,
            description: msgContent.body.slice(0, 2000),
            type: "general",
            priority: "normal",
            status: "open",
            stage: "open",
            email_thread_id: msgContent.threadId,
          })
          .select("id")
          .single();

        if (newTicket) {
          await supabase.from("ticket_messages").insert({
            ticket_id: newTicket.id,
            sender: "client",
            content: `[Gmail · ${msgContent.from}]\n\n${msgContent.body}`,
          });
          processedCount++;
        }
      }
    }

    // 6. Persist the new historyId for next sync
    await supabase
      .from("agencies")
      .update({
        integrations_config: {
          ...(agency.integrations_config as any),
          gmail_tokens: { ...tokens, access_token: accessToken, last_history_id: historyId },
        },
      })
      .eq("id", agency.id);

    return new Response(
      JSON.stringify({ success: true, processed: processedCount, historyId }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("Gmail Sync Error:", error);
    // Return 200 to avoid infinite PubSub retries for unrecoverable errors
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
