import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY") || ""; // Chave do Firecrawl

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { prompt, urlToClone } = await req.json();

    if (!prompt && !urlToClone) {
      return new Response("Missing prompt or urlToClone", { status: 400, headers: corsHeaders });
    }

    let sourceContext = prompt || "";

    // 1. Firecrawl Scrape Se URL Fornecida
    if (urlToClone) {
      if (!FIRECRAWL_API_KEY) throw new Error("Firecrawl API Key missing in Edge Function env");

      const firecrawlRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        },
        body: JSON.stringify({
          url: urlToClone,
          formats: ["markdown"],
        }),
      });

      if (!firecrawlRes.ok) {
        throw new Error("Erro ao raspar site alvo com Firecrawl: " + (await firecrawlRes.text()));
      }

      const scrapeData = await firecrawlRes.json();
      const markdown = scrapeData.data?.markdown || "";
      sourceContext = `O usuário quer clonar/inspirar-se neste site. Aqui está o conteúdo extraído:\n\n${markdown.substring(0, 8000)}\n\n(Baseie-se na estrutura acima para montar os blocos). ${prompt ? "Instrução extra: " + prompt : ""}`;
    }

    // 2. OpenRouter AI Generation
    const systemPrompt = `Você é um Web Designer Especialista em Turismo.
Crie a estrutura de uma Landing Page focada em alta conversão.
Abaixo está o conteúdo/contexto base.

DIRETRIZ ESTRITA DE SAÍDA:
Você DEVE retornar APENAS UM ARRAY JSON VÁLIDO. NADA MAIS. SEM BLOCOS DE MARKDOWN. SEM TEXTO ANTES OU DEPOIS.

Tipos de blocos válidos:
1. hero: { id: "xx", type: "hero", title: "...", subtitle: "...", bg_image_url: "", cta_label: "...", cta_link: "..." }
2. features: { id: "xx", type: "features", title: "...", items: [{ icon: "✨", title: "...", description: "..." }] }
3. text: { id: "xx", type: "text", content: "HTML seguro <p>...</p>", align: "center", image_url: "" }
4. faq: { id: "xx", type: "faq", title: "...", items: [{ question: "...", answer: "..." }] }
5. cta: { id: "xx", type: "cta", title: "...", subtitle: "...", button_label: "...", button_link: "..." }
6. tours_grid: { id: "xx", type: "tours_grid", title: "Nossos roteiros", subtitle: "...", max_items: 6 }
7. testimonials: { id: "xx", type: "testimonials", title: "...", items: [{ author: "...", role: "...", text: "...", avatar_url: "", stars: 5 }] }

Importante:
- Sanitização rigorosa: Jamais insira tags <script>, <iframe> maliciosas. 
- Retorne apenas a array JSON, pronta para JSON.parse().`;

    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://travelos.com",
        "X-Title": "TravelOS CMS",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: sourceContext },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiRes.ok) throw new Error("Erro na IA: " + (await aiRes.text()));

    const aiData = await aiRes.json();
    let rawText = aiData.choices[0].message.content.trim();

    // Remover blocos markdown se o modelo for teimoso
    if (rawText.startsWith("```")) {
      rawText = rawText
        .replace(/^```json\n?/, "")
        .replace(/^```\n?/, "")
        .replace(/\n?```$/, "");
    }

    // Validação nativa antes de enviar ao front
    let parsedBlocks = [];
    try {
      parsedBlocks = JSON.parse(rawText);
    } catch (e) {
      throw new Error(
        "A IA não retornou um formato JSON estruturado válido. Retorno bruto: " +
          rawText.substring(0, 100),
      );
    }

    if (!Array.isArray(parsedBlocks)) {
      throw new Error("O resultado não é um array JSON de blocos.");
    }

    // Retorna os blocos limpos
    return new Response(JSON.stringify({ blocks: parsedBlocks }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Generate Site AI Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
