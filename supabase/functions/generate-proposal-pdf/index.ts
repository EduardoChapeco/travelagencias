import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import puppeteer from "npm:puppeteer-core@22.6.0";
import chromium from "npm:@sparticuz/chromium@123.0.1";

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
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized: Invalid JWT token.");

    const { proposal_id, agency_id, format = "A4", landscape = false } = await req.json();

    if (!proposal_id || !agency_id) {
      throw new Error("proposal_id and agency_id are required");
    }

    // This is the public URL of the webview for this proposal
    // We assume the frontend passes the token or we construct the URL
    // Actually, we can just use the public view of the proposal
    // Let's get the public_token
    const { data: proposal } = await supabaseClient
      .from("proposals")
      .select("public_token")
      .eq("id", proposal_id)
      .single();

    if (!proposal?.public_token) {
      throw new Error("Proposal not found or no public token");
    }

    const appUrl = Deno.env.get("FRONTEND_URL") || "https://travelos.com.br";
    const targetUrl = `${appUrl}/m/proposal/${proposal.public_token}?export=true`;

    const executablePath = await chromium.executablePath();
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // Set viewport based on format
    if (landscape) {
      if (format === "presentation-169" || format === "16:9") {
        await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
      } else {
        await page.setViewport({ width: 1123, height: 794, deviceScaleFactor: 2 }); // A4 Landscape
      }
    } else {
      if (format === "A4") {
        await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
      } else {
        await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
      }
    }

    await page.goto(targetUrl, { waitUntil: "networkidle0" });

    // For PDF page format setting
    const pdfFormat = format === "presentation-169" || format === "16:9" ? "Letter" : format;

    const pdfBuffer = await page.pdf({
      format: pdfFormat as any,
      landscape: !!landscape,
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    await browser.close();

    // Upload to proposals-exports bucket
    const fileName = `${agency_id}/${proposal_id}/export_${Date.now()}.pdf`;

    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from("proposals-exports")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabaseClient.storage.from("proposals-exports").getPublicUrl(fileName);

    return new Response(JSON.stringify({ pdf_url: publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Erro PDF Export:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
