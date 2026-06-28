import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { PDFDocument, StandardFonts, rgb } from "https://cdn.skypack.dev/pdf-lib@1.17.1?dts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { trip_id, passenger_id, data } = await req.json();

    if (!trip_id || !passenger_id || !data) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: corsHeaders });
    }

    // Criação determinística do PDF (Server-side)
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const fontSize = 14;

    page.drawText('Voucher Oficial - TravelOS', {
      x: 50,
      y: height - 4 * fontSize,
      size: 24,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });

    const lines = [
      `Passageiro: ${data.passengerName}`,
      `Viagem ID: ${trip_id}`,
      `Data de Emissao: ${new Date().toISOString()}`,
      `Documento: ${data.document || 'N/A'}`
    ];

    let yOffset = height - 100;
    for (const line of lines) {
      page.drawText(line, {
        x: 50,
        y: yOffset,
        size: fontSize,
        font: timesRomanFont,
        color: rgb(0.2, 0.2, 0.2),
      });
      yOffset -= 25;
    }

    const pdfBytes = await pdfDoc.save();

    // Upload seguro e sem mock para o Storage nativo do banco
    const fileName = `vouchers/${trip_id}/${passenger_id}_${Date.now()}.pdf`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    return new Response(JSON.stringify({ 
      success: true, 
      url: publicUrlData.publicUrl,
      path: fileName
    }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (err: any) {
    console.error("Voucher PDF Generation Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
