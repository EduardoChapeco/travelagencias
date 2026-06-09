import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // 1. Trata requisições de CORS do navegador (preflight)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, file_name } = await req.json();

    if (!text || text.trim() === "") {
      throw new Error("Texto bruto não enviado ou vazio.");
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("Chave GEMINI_API_KEY não configurada no Supabase Secrets.");
    }

    // 2. Prompt System de altíssima precisão para o mercado de Turismo
    const systemPrompt = `
Você é um AI especialista em documentação de Turismo. Seu papel é ler o texto extraído de um Voucher/Reserva de viagem e extrair os dados organizados em um JSON perfeito.
Sua resposta DEVE ser estritamente e APENAS um objeto JSON válido, sem backticks ou formatação markdown de blocos.

Regras de Extração:
1. title: O nome do Hotel, Companhia Aérea, ou Serviço. (ex: "Hotel Transamerica", "Voo LATAM 3020").
2. category: Identifique e classifique EXATAMENTE em um destes: "flight", "hotel", "transfer", "activity", "insurance", "other".
3. locator: O código de confirmação, localizador, PNR ou número do voucher.
4. provider: A operadora, consolidadora ou cia (ex: "CVC", "Decolar", "LATAM", "Booking.com").
5. date_start: A data de início do serviço (check-in, partida). Formato ISO YYYY-MM-DD. Se não achar, null.
6. date_end: A data final do serviço (check-out, retorno). Formato ISO YYYY-MM-DD. Se não achar, null.
7. passengers: Array de strings contendo o nome completo dos passageiros citados.

Texto Extraído do Arquivo (${file_name}):
${text.substring(0, 5000)} // Limite seguro para evitar estouro de tokens
`;

    // 3. Comunicação com a Google Gemini API (ou OpenAI fallback) via REST puro
    // Usamos o model gemini-1.5-flash pela alta velocidade em extração de textos
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const aiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
           temperature: 0.1, // Temperatura baixa para extração determinística e rigorosa
        }
      })
    });

    if (!aiResponse.ok) {
       const errBody = await aiResponse.text();
       console.error("Gemini Error: ", errBody);
       throw new Error("A Inteligência Artificial recusou o processamento ou está indisponível.");
    }

    const aiData = await aiResponse.json();
    let resultText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      throw new Error("A Inteligência Artificial retornou uma resposta vazia.");
    }

    // 4. Limpeza do JSON (Removendo marcação markdown ```json caso a IA a insira desobedecendo o prompt)
    resultText = resultText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsedResult = JSON.parse(resultText);

    // 5. Devolve o sucesso para o Frontend B2B
    return new Response(JSON.stringify({ result: parsedResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Erro no processamento de IA:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
