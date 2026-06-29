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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? supabaseAnonKey;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Validate auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized.");

    const body = await req.json();
    const { supplier_id, file_id, file_url, file_base64, mime, agency_id } = body;

    if (!file_url && !file_base64) throw new Error("file_url ou file_base64 é obrigatório.");
    if (!supplier_id) throw new Error("supplier_id é obrigatório.");

    const systemPrompt = `
Você é um AI especialista em turismo B2B com foco em análise de documentos de fornecedores.
Analise o documento fornecido (tarifário, contrato, voucher, apresentação) e extraia as informações em JSON estruturado.

Sua resposta DEVE ser APENAS um objeto JSON válido, sem markdown, sem backticks.

Schema esperado:
{
  "supplier_name": "Nome comercial do fornecedor ou hotel",
  "legal_name": "Razão social se disponível",
  "kind": "hotel | operator | airline | transfer | insurance | cruise | other",
  "country": "País",
  "city": "Cidade",
  "address": "Endereço completo se disponível",
  "website": "URL do site se disponível",
  "phone": "Telefone principal",
  "email": "E-mail principal",
  "whatsapp": "WhatsApp se disponível",
  "contacts": [
    { "name": "Nome", "role": "Função", "email": "email", "phone": "telefone" }
  ],
  "products": [
    {
      "name": "Nome do produto/serviço/quarto",
      "kind": "hotel | room_type | tour | transfer | insurance | ticket | other",
      "destination": "Destino/local",
      "price_from": 0.00,
      "currency": "BRL | USD | EUR",
      "duration_days": null,
      "description": "Inclui, observações"
    }
  ],
  "payment_terms": "Condições de pagamento extraídas",
  "commission_rate": null,
  "notes": "Observações gerais relevantes"
}

Se um campo não for encontrado, use null.
Para produtos, extraia todos os itens identificáveis (quartos, tours, pacotes, tarifas).
`;

    // Se o cliente enviar uma URL, vamos ler os bytes do arquivo para enviar como base64 no payload do orquestrador
    let payloadBase64 = file_base64;
    let finalMime = mime;

    if (!payloadBase64 && file_url) {
      const fileRes = await fetch(file_url);
      if (!fileRes.ok) throw new Error("Não foi possível baixar o arquivo: " + file_url);
      const arrayBuf = await fileRes.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuf);
      
      let binary = "";
      for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
      payloadBase64 = btoa(binary);
      finalMime = fileRes.headers.get("content-type") || "application/pdf";
    }

    // Invocação centralizada via central ai-orchestrator Edge Function
    const orchestratorUrl = `${supabaseUrl}/functions/v1/ai-orchestrator`;
    const aiResponse = await fetch(orchestratorUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        action: "completion",
        agency_id,
        prompt: "Por favor, faça a análise e extração estruturada dos dados deste documento de fornecedor de turismo.",
        file_base64: payloadBase64,
        mime: finalMime,
        jsonMode: true,
        systemPrompt,
        module: "supplier-ocr-extractor",
        capability: "ocr",
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`Erro no orquestrador de IA: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    let resultText = aiData.result;

    if (!resultText) throw new Error("A IA não retornou nenhum resultado.");

    resultText = resultText
      .replace(/```json\s*/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(resultText);

    // Salvar as informações extraídas no banco usando uma RPC transacional (para garantir atomicidade)
    const { data: updatedSupplier, error: rpcError } = await supabaseAdmin.rpc(
      "save_extracted_supplier_ocr_transaction",
      {
        _supplier_id: supplier_id,
        _file_id: file_id || null,
        _extracted_payload: parsed,
      }
    );

    if (rpcError) {
      throw new Error("Falha ao salvar dados extraídos no banco: " + rpcError.message);
    }

    return new Response(JSON.stringify({ success: true, supplier: updatedSupplier, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Erro no OCR do Fornecedor:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
