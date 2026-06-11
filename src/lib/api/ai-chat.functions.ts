import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RATE_LIMIT_PER_HOUR = 50;
const OPENROUTER_MODEL = "google/gemini-2.5-flash";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `Você é o "TravelOS Master Intelligence", uma IA super avançada servindo o Gestor da Agência de Viagens.
Você atua com as seguintes personas simultaneamente:
1. Turismólogo e Estrategista de Viagens Sênior
2. Engenheiro de Comunicação e Marketing Digital
3. Analista de Mercado e Espião de Concorrência

Seu objetivo é analisar profundamente dados e sites fornecidos.
Se o usuário fornecer um site ou link do Instagram (concorrente ou inspiração), você fará uma análise ULTRA COMPLETA usando o "Framework Diamante":
- Análise de Posicionamento e Identidade Visual.
- Avaliação do Produto (O que vendem, precificação, roteiros).
- Análise de Clientela (Público-alvo provável, alcance de seguidores se disponível, nível sócio-econômico).
- Táticas de Comunicação e Gatilhos Mentais utilizados.
- Oportunidades: Como a nossa agência pode superar essa estratégia.
Apresente a resposta com formatação rica em Markdown (tabelas, alertas, tópicos). Seja direto, profissional e incisivo.
Caso a conversa não envolva análise competitiva, atue como o assistente normal de backoffice.`;

async function checkAndIncrementRateLimit(supabase: any, agencyId: string) {
  const bucket = new Date();
  bucket.setMinutes(0, 0, 0);
  const bucketIso = bucket.toISOString();

  const { data: existing } = await supabase
    .from("ai_rate_limit")
    .select("count")
    .eq("agency_id", agencyId)
    .eq("bucket_start", bucketIso)
    .maybeSingle();

  const current: number = (existing?.count as number | undefined) ?? 0;
  if (current >= RATE_LIMIT_PER_HOUR) {
    throw new Error(
      `Limite de ${RATE_LIMIT_PER_HOUR} mensagens por hora atingido para esta agência.`,
    );
  }

  if (existing) {
    await supabase
      .from("ai_rate_limit")
      .update({ count: current + 1 })
      .eq("agency_id", agencyId)
      .eq("bucket_start", bucketIso);
  } else {
    await supabase
      .from("ai_rate_limit")
      .insert({ agency_id: agencyId, bucket_start: bucketIso, count: 1 });
  }
}

export const listAIChatMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      agencyId: z.string().uuid(),
      conversationId: z.string().uuid(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("ai_chat_messages")
      .select("id, role, content, created_at, context, model, provider")
      .eq("agency_id", data.agencyId)
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return { messages: rows ?? [] };
  });

export const sendAIChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      agencyId: z.string().uuid(),
      conversationId: z.string().uuid(),
      message: z.string().min(1).max(4000),
      contextRoute: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Confirm membership (RLS will also enforce, this gives a friendly error)
    const { data: membership } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("agency_id", data.agencyId)
      .limit(1)
      .maybeSingle();
    if (!membership) throw new Error("Usuário não pertence a esta agência.");

    await checkAndIncrementRateLimit(supabase, data.agencyId);

    // Persist user message
    const ctxPayload = { route: data.contextRoute ?? null };
    const { error: insertUserErr } = await supabase.from("ai_chat_messages").insert({
      agency_id: data.agencyId,
      user_id: userId,
      conversation_id: data.conversationId,
      role: "user",
      content: data.message,
      context: ctxPayload,
    });
    if (insertUserErr) throw new Error(insertUserErr.message);

    // Detect URL for Scraping (Competitor Spy)
    let injectedContext = "";
    const urlMatch = data.message.match(/(https?:\/\/[^\s]+)/);
    if (urlMatch) {
      const targetUrl = urlMatch[0];
      try {
        const orchestratorUrl = `${process.env.VITE_SUPABASE_URL}/functions/v1/ai-orchestrator`;
        const res = await fetch(orchestratorUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ action: "scrape", url: targetUrl }),
        });
        if (res.ok) {
          const scrapeData = await res.json();
          injectedContext = `\n\n[SISTEMA - DADOS RASPADOS DA URL ${targetUrl} PELO FIRECRAWL]:\n${scrapeData.result}\n\nAnalise estes dados de acordo com as instruções do seu System Prompt.`;
        }
      } catch (e) {
        console.error("Scraping falhou no chat:", e);
      }
    }

    // Load recent conversation history
    const { data: history } = await supabase
      .from("ai_chat_messages")
      .select("role, content")
      .eq("agency_id", data.agencyId)
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true })
      .limit(40);

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(data.contextRoute
        ? [{ role: "system" as const, content: `Rota atual do usuário: ${data.contextRoute}` }]
        : []),
      ...(history ?? []).map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content as string,
      })),
    ];

    // Inject the scraped context into the last user message before sending to AI
    if (injectedContext && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "user") {
        lastMsg.content += injectedContext;
      }
    }

    const apiKey = process.env.OPENROUTER_API_KEY || process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("API_KEY não configurada no servidor (OpenRouter ou Lovable).");

    const isOpenRouter = !!process.env.OPENROUTER_API_KEY;
    const url = isOpenRouter ? OPENROUTER_URL : GATEWAY_URL;
    const model = isOpenRouter ? OPENROUTER_MODEL : "google/gemini-2.5-flash";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    if (isOpenRouter) {
      headers["HTTP-Referer"] = "https://travelos.com";
      headers["X-Title"] = "TravelOS";
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ model, messages, temperature: 0.4 }),
    });

    if (res.status === 429)
      throw new Error(
        "Limite de uso do provedor de IA atingido. Tente novamente em alguns minutos.",
      );
    if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos.");
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Falha no provedor de IA (${res.status}): ${txt.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const assistantText = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!assistantText) throw new Error("Resposta vazia do provedor de IA.");

    const { error: insertAssistantErr } = await supabase.from("ai_chat_messages").insert({
      agency_id: data.agencyId,
      user_id: userId,
      conversation_id: data.conversationId,
      role: "assistant",
      content: assistantText,
      context: ctxPayload,
      provider: isOpenRouter ? "openrouter" : "lovable-ai",
      model: model,
      tokens_in: json.usage?.prompt_tokens ?? null,
      tokens_out: json.usage?.completion_tokens ?? null,
    });
    if (insertAssistantErr) throw new Error(insertAssistantErr.message);

    // Audit log
    await supabase.from("audit_log").insert({
      agency_id: data.agencyId,
      actor_id: userId,
      actor_type: "user",
      action: "ai_chat_message",
      entity_type: "ai_chat",
      entity_id: data.conversationId,
      metadata: { route: data.contextRoute ?? null, model },
    });

    return { reply: assistantText, model };
  });

export const clearAIChatConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      agencyId: z.string().uuid(),
      conversationId: z.string().uuid(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    // ai_chat_messages has no delete policy → use admin? RLS blocks. Instead start a new conversation client-side.
    // We expose a no-op for symmetry; caller should rotate conversationId.
    void supabase;
    void data;
    return { ok: true };
  });
