import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY") || ""; // Chave do Firecrawl

async function checkMembership(
  supabaseAdmin: any,
  userId: string,
  agencyId?: string | null,
): Promise<boolean> {
  const { data: roles, error } = await supabaseAdmin
    .from("user_roles")
    .select("role, agency_id")
    .eq("user_id", userId);

  if (error || !roles) return false;

  const isSuperAdmin = roles.some((r: any) => r.role === "super_admin");
  if (isSuperAdmin) return true;

  if (!agencyId) return false;
  return roles.some((r: any) => r.agency_id === agencyId);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    let isServiceRole = false;
    if (serviceRoleKey && authHeader.replace("Bearer ", "") === serviceRoleKey) {
      isServiceRole = true;
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    let user: any = null;
    if (!isServiceRole) {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabaseClient.auth.getUser();
      if (authError || !authUser) {
        return new Response(JSON.stringify({ error: "Unauthorized access." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      user = authUser;
    }

    const body = await req.json();
    const { prompt, urlToClone, agency_id } = body;

    if (!agency_id) {
      return new Response(JSON.stringify({ error: "Missing agency_id parameter." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey ?? supabaseAnonKey, {
      auth: { persistSession: false },
    });

    if (!isServiceRole && user) {
      const hasAccess = await checkMembership(supabaseAdmin, user.id, agency_id);
      if (!hasAccess) {
        return new Response(
          JSON.stringify({ error: "Access denied: User does not belong to the requested agency." }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

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
    const systemPrompt = `Você é um Web Designer Especialista em Turismo e especialista em conversão.
Crie a estrutura de uma Landing Page ou Biolink focada em alta conversão para agências de viagem.
Abaixo está o conteúdo/contexto base.

DIRETRIZ ESTRITA DE SAÍDA:
Você DEVE retornar APENAS UM ARRAY JSON VÁLIDO. NADA MAIS. SEM BLOCOS DE MARKDOWN. SEM TEXTO ANTES OU DEPOIS.

Tipos de blocos válidos (use os que fizerem sentido para o contexto):

BLOCOS ESTRUTURAIS:
1. hero: { id: "xx", type: "hero", title: "...", subtitle: "...", bg_image_url: "...", cta_label: "...", cta_link: "...", layout: "centered"|"split"|"minimal" }
2. text: { id: "xx", type: "text", content: "<p>HTML seguro</p>", align: "left"|"right"|"center", image_url: "..." }
3. gallery: { id: "xx", type: "gallery", images: ["url1", "url2"] }
4. cta: { id: "xx", type: "cta", title: "...", subtitle: "...", button_label: "...", button_link: "..." }
5. video: { id: "xx", type: "video", title: "...", url: "youtube_embed_url", caption: "..." }
6. map: { id: "xx", type: "map", title: "...", embed_url: "...", address_label: "..." }

BLOCOS DE CONTEÚDO:
7. features: { id: "xx", type: "features", title: "...", items: [{ icon: "trip"|"safe"|"hotel"|"clients"|"eco"|"award"|"care"|"world"|"chat"|"pack"|"vip"|"key"|"star"|"map"|"ticket"|"flight"|"lux", title: "...", description: "..." }], layout: "grid"|"cards"|"list" }
8. stats: { id: "xx", type: "stats", title: "...", items: [{ value: "...", label: "...", icon: "trip"|"safe"|"award"|"clients"|"places"|"world" }] }
9. testimonials: { id: "xx", type: "testimonials", title: "...", items: [{ author: "...", role: "...", text: "...", avatar_url: "", stars: 5 }], layout: "grid"|"bubble" }
10. faq: { id: "xx", type: "faq", title: "...", items: [{ question: "...", answer: "..." }], layout: "accordion"|"grid" }
11. featured_destinations: { id: "xx", type: "featured_destinations", title: "...", subtitle: "...", items: [{ destination: "...", price: "...", description: "...", image_url: "...", link: "#contato" }] }
12. blog_feed: { id: "xx", type: "blog_feed", title: "...", max_items: 3 }

BLOCOS DE ROTEIROS:
13. tours_grid: { id: "xx", type: "tours_grid", title: "...", subtitle: "...", max_items: 6, layout: "grid"|"list" }
14. tours_carousel: { id: "xx", type: "tours_carousel", title: "...", subtitle: "...", max_items: 8 }
15. featured_destination_filter: { id: "xx", type: "featured_destination_filter", title: "...", subtitle: "..." }
16. countdown_tour: { id: "xx", type: "countdown_tour", tour_id: "", title: "...", subtitle: "...", button_label: "..." }

BLOCOS DE CAPTAÇÃO DE LEADS:
17. contact: { id: "xx", type: "contact", title: "...", text: "..." }
18. newsletter: { id: "xx", type: "newsletter", title: "...", subtitle: "...", placeholder: "Seu melhor e-mail", button_label: "Cadastrar" }
19. lead_capture_callback: { id: "xx", type: "lead_capture_callback", title: "...", subtitle: "..." }
20. insurance_simulator: { id: "xx", type: "insurance_simulator", title: "...", description: "..." }
21. custom_package_lead_builder: { id: "xx", type: "custom_package_lead_builder", title: "...", subtitle: "..." }
22. reviews_submission_form: { id: "xx", type: "reviews_submission_form", title: "...", subtitle: "..." }
23. corporate_rfp_form: { id: "xx", type: "corporate_rfp_form", title: "...", subtitle: "..." }
24. visa_checker: { id: "xx", type: "visa_checker", title: "...", default_nationality: "BR" }

BLOCOS DE REDES SOCIAIS E CONTATO:
25. social_links: { id: "xx", type: "social_links", title: "...", instagram: "...", facebook: "...", youtube: "...", whatsapp: "...", linkedin: "..." }
26. social_links_row: { id: "xx", type: "social_links_row", instagram: "...", whatsapp: "...", facebook: "", youtube: "", tiktok: "" }
27. whatsapp_departments: { id: "xx", type: "whatsapp_departments", title: "...", departments: [{ name: "...", phone: "5549999999999", icon: "chat", message: "..." }] }
28. team_widget: { id: "xx", type: "team_widget", title: "...", subtitle: "..." }

BLOCOS DE INFORMAÇÕES:
29. exchange_rates: { id: "xx", type: "exchange_rates", title: "...", currencies: ["USD", "EUR", "GBP"] }
30. weather_forecast: { id: "xx", type: "weather_forecast", tour_id: "", city: "São Paulo, SP" }
31. live_reviews: { id: "xx", type: "live_reviews", title: "...", subtitle: "..." }
32. news_announcements_ticker: { id: "xx", type: "news_announcements_ticker", title: "...", limit: 5 }
33. agency_badges_trust: { id: "xx", type: "agency_badges_trust", title: "..." }
34. promotional_banner: { id: "xx", type: "promotional_banner", title: "...", discount_code: "BEMVINDO10", expiration_date: "" }

BLOCOS DE BIOLINK (use quando for página de biolink):
35. biolink_header: { id: "xx", type: "biolink_header", avatar_url: "", name: "...", bio: "...", bg_color: "#1E293B", text_color: "#FFFFFF" }
36. biolink_links: { id: "xx", type: "biolink_links", button_style: "solid"|"outline"|"soft", button_rounded: "full"|"md"|"none", items: [{ icon: "chat"|"trip"|"web", title: "...", url: "#", highlight: false }] }
37. biolink_newsletter_box: { id: "xx", type: "biolink_newsletter_box", placeholder: "Seu e-mail", button_label: "Inscrever" }
38. biolink_qr_code_share: { id: "xx", type: "biolink_qr_code_share", title: "..." }

Regras:
- Use ícones descritivos: "trip", "safe", "hotel", "award", "care", "vip", "flight", "chat", "world", "star", "pack", "lux", "map", "ticket", "gift", "phone", "mail", "card", "clock", "dollar", "faq", "eco", "clients", "key"
- Jamais insira tags <script>, <iframe> maliciosas no HTML
- Retorne apenas o array JSON, pronto para JSON.parse()
- Gere pelo menos 5 blocos para uma boa página`;

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
