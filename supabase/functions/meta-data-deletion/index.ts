import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Decode base64url to Uint8Array
function base64urlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function verifySignedRequest(signedRequest: string, appSecret: string): Promise<any> {
  const parts = signedRequest.split(".");
  if (parts.length !== 2) {
    throw new Error("Invalid signed request format");
  }

  const [encodedSig, encodedPayload] = parts;
  const signature = base64urlDecode(encodedSig);
  const payloadJson = new TextDecoder().decode(base64urlDecode(encodedPayload));
  const payload = JSON.parse(payloadJson);

  // Compute expected signature
  const encoder = new TextEncoder();
  const keyData = encoder.encode(appSecret);
  const messageData = encoder.encode(encodedPayload);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    messageData
  );

  if (!isValid) {
    throw new Error("Invalid signature verification failed");
  }

  return payload;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { signed_request } = await req.json();
    if (!signed_request) {
      throw new Error("Missing signed_request parameter.");
    }

    const appSecret = Deno.env.get("META_APP_SECRET");
    if (!appSecret) {
      throw new Error("META_APP_SECRET environment variable is not defined.");
    }

    // Verify and decode signed_request from Meta
    const data = await verifySignedRequest(signed_request, appSecret);
    const userId = data.user_id;

    if (!userId) {
      throw new Error("User ID not found in signed request payload.");
    }

    // Create deletion request protocol
    const protocolCode = "DEL-META-" + Math.random().toString(36).substring(2, 9).toUpperCase();

    // Query profiles to find if there is a matching user
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, agency_id")
      .eq("metadata->>facebook_user_id", userId)
      .limit(1)
      .maybeSingle();

    const agencyId = profile?.agency_id || null;

    const { error: insertErr } = await supabase
      .from("data_subject_requests")
      .insert({
        agency_id: agencyId,
        request_type: "deletion",
        status: "received",
        protocol_code: protocolCode,
        rejection_reason: `Meta signed request deletion for facebook_user_id=${userId}`,
      });

    if (insertErr) {
      throw new Error(`Failed to save deletion request: ${insertErr.message}`);
    }

    // Return the response format expected by Meta
    const responsePayload = {
      url: `https://app.vibetour.com.br/data-deletion?protocol=${protocolCode}`,
      confirmation_code: protocolCode,
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("[Data Deletion Callback] Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
