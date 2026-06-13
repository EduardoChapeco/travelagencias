import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized: Invalid JWT token.");

    const body = await req.json();
    const { file_base64, mime, agency_id } = body;

    if (!file_base64) {
      throw new Error("Nenhum arquivo fornecido para análise.");
    }

    // Obter chave API do Gemini (tenta carregar da agência ou do ENV)
    let geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (agency_id) {
      const { data: agencyKeyData } = await supabaseClient
        .from('api_keys')
        .select('key_value')
        .eq('agency_id', agency_id)
        .eq('provider', 'gemini')
        .maybeSingle();
      if (agencyKeyData?.key_value) {
        geminiApiKey = agencyKeyData.key_value;
      }
    }

    if (!geminiApiKey) {
      throw new Error("Chave do Gemini não configurada.");
    }

    const systemPrompt = `Você é uma Inteligência Artificial especializada em analisar documentos de viagens (Passaportes, Vistos Consulares, Passagens Aéreas).
Sua tarefa é ler a imagem ou PDF do documento enviado e extrair de forma estruturada as seguintes informações em formato JSON restrito.

Campos que você DEVE extrair (se aplicável para o tipo de documento):
1. **document_number**: Número do documento (passaporte, visto, etc).
2. **full_name**: Nome completo do titular do documento.
3. **birth_date**: Data de nascimento (formato YYYY-MM-DD).
4. **nationality**: Nacionalidade do titular.
5. **expiration_date**: Data de validade/expiração do documento (formato YYYY-MM-DD).
6. **issue_date**: Data de emissão (formato YYYY-MM-DD).
7. **issuing_country**: País emissor do documento.

Retorne APENAS um objeto JSON com essas chaves. Sem markdown. Se não encontrar um campo, retorne null.
Exemplo de retorno esperado:
{
  "document_number": "FL123456",
  "full_name": "JOÃO SILVA PINTO",
  "birth_date": "1990-05-15",
  "nationality": "Brasileira",
  "expiration_date": "2030-10-22",
  "issue_date": "2020-10-22",
  "issuing_country": "Brasil"
}
`;

    const parts = [
      { text: systemPrompt },
      {
        inlineData: {
          mimeType: mime || "image/jpeg",
          data: file_base64,
        },
      },
    ];

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
    const aiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.1 } }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`Gemini API error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    let resultText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      throw new Error("A IA não retornou nenhum texto.");
    }

    // Limpar delimitadores de markdown json se houver
    resultText = resultText
      .replace(/\`\`\`json/gi, "")
      .replace(/\`\`\`/g, "")
      .trim();

    const parsedResult = JSON.parse(resultText);

    return new Response(JSON.stringify({ result: parsedResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Erro no OCR do Documento:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
