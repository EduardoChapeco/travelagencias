import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RATE_LIMIT_PER_HOUR = 50;
const MODEL = "google/gemini-2.5-flash";
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `Você é o assistente TravelOS, especialista em operação de agências de viagem.
Responda em português do Brasil, de forma objetiva e útil.
Use o contexto da rota atual fornecido pelo usuário para sugerir ações concretas (criar lead, montar proposta, conferir financeiro, vouchers, contratos, embarque).
Nunca invente dados — se faltar informação, peça ao usuário ou indique onde ele pode encontrar dentro do sistema.
Formate listas e passos com markdown simples quando apropriado.`;

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

    await checkAndIncrementRateLimit(supabase as never, data.agencyId);

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

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada no servidor.");

    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.4 }),
    });

    if (res.status === 429) throw new Error("Limite de uso do provedor de IA atingido. Tente novamente em alguns minutos.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no Lovable Cloud.");
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
      provider: "lovable-ai",
      model: MODEL,
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
      metadata: { route: data.contextRoute ?? null, model: MODEL },
    });

    return { reply: assistantText, model: MODEL };
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
