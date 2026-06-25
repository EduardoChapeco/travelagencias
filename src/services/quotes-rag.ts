import { supabase } from "@/integrations/supabase/client";

// Algoritmo de chunking determinístico para segmentar documentos longos
export function splitTextIntoChunks(text: string, maxLength: number = 800): string[] {
  if (!text) return [];
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLength) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

/**
 * Obtém embeddings do modelo text-embedding-3-small via Gateway da Lovable ou OpenAI direta
 */
export async function getOpenAIEmbedding(text: string): Promise<number[] | null> {
  try {
    // 1. Tenta buscar uma chave ativa da OpenAI cadastrada no banco da agência
    const { data: apiKeyRecord } = await supabase
      .from("api_keys")
      .select("key_value")
      .eq("provider", "openai")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (apiKeyRecord?.key_value) {
      const url = "https://ai.gateway.lovable.dev/v1/embeddings";
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKeyRecord.key_value}`,
        },
        body: JSON.stringify({
          input: text,
          model: "text-embedding-3-small",
        }),
      });

      if (res.ok) {
        const json = (await res.json()) as any;
        return json.data?.[0]?.embedding || null;
      }
    }

    // 2. Se não houver chave OpenAI ativa, tenta buscar chave OpenRouter
    const { data: orKeyRecord } = await supabase
      .from("api_keys")
      .select("key_value")
      .eq("provider", "OPENROUTER_API_KEY")
      .limit(1)
      .maybeSingle();

    if (orKeyRecord?.key_value) {
      const url = "https://openrouter.ai/api/v1/embeddings";
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${orKeyRecord.key_value}`,
        },
        body: JSON.stringify({
          input: text,
          model: "openai/text-embedding-3-small",
        }),
      });

      if (res.ok) {
        const json = (await res.json()) as any;
        return json.data?.[0]?.embedding || null;
      }
    }

    console.warn(
      "Nenhuma chave OpenAI ou OpenRouter disponível ou a chamada de embeddings falhou.",
    );
    return null;
  } catch (e) {
    console.error("Erro RAG getOpenAIEmbedding:", e);
    return null;
  }
}

/**
 * Realiza busca semântica por similaridade de cosseno aplicando filtros de RLS e tenant antes
 */
export async function searchKnowledgeRAG(
  agencyId: string,
  queryText: string,
  category: string = "gateway_rules",
  limit: number = 3,
  threshold: number = 0.6,
): Promise<
  Array<{
    document_title: string;
    content: string;
    category: string;
    scope: string;
    similarity: number;
  }>
> {
  const embedding = await getOpenAIEmbedding(queryText);
  if (!embedding) {
    console.warn("Não foi possível gerar embedding para a busca. RAG inativo.");
    return [];
  }

  // Chamar RPC match_knowledge_embeddings
  const { data, error } = await supabase.rpc("match_knowledge_embeddings", {
    query_embedding: `[${embedding.join(",")}]`,
    match_threshold: threshold,
    match_count: limit,
    p_agency_id: agencyId,
    p_category: category,
  });

  if (error) {
    console.error("Erro RPC match_knowledge_embeddings:", error.message);
    return [];
  }

  return data || [];
}

/**
 * Ingestão completa: Cria fonte, documento, divide em chunks, gera embeddings e salva em lote
 */
export async function ingestKnowledgeDocument(
  agencyId: string,
  title: string,
  content: string,
  category: string = "gateway_rules",
  scope: "global" | "agency" = "agency",
  sourceUrl?: string,
): Promise<{ documentId: string }> {
  // 1. Criar knowledge_source
  const { data: source, error: sourceErr } = await supabase
    .from("knowledge_sources")
    .insert({
      agency_id: scope === "agency" ? agencyId : null,
      name: `Fonte: ${title}`,
      scope,
      source_type: "manual",
      source_url: sourceUrl || null,
    })
    .select("id")
    .single();

  if (sourceErr) throw new Error(sourceErr.message);

  // 2. Criar knowledge_document
  const { data: doc, error: docErr } = await supabase
    .from("knowledge_documents")
    .insert({
      source_id: source.id,
      agency_id: scope === "agency" ? agencyId : null,
      title,
      content,
      category,
      scope,
    })
    .select("id")
    .single();

  if (docErr) throw new Error(docErr.message);

  // 3. Dividir conteúdo em chunks de texto
  const chunks = splitTextIntoChunks(content);
  if (chunks.length === 0) return { documentId: doc.id };

  // 4. Inserir chunks
  const chunkInserts = chunks.map((chunk) => ({
    document_id: doc.id,
    agency_id: scope === "agency" ? agencyId : null,
    content: chunk,
  }));

  const { data: savedChunks, error: chunksErr } = await supabase
    .from("knowledge_chunks")
    .insert(chunkInserts)
    .select("id, content");

  if (chunksErr) throw new Error(chunksErr.message);

  // 5. Gerar e salvar embeddings para cada chunk em segundo plano ou lote
  const embeddingInserts: any[] = [];
  for (const c of savedChunks || []) {
    const vector = await getOpenAIEmbedding(c.content);
    if (vector) {
      embeddingInserts.push({
        chunk_id: c.id,
        agency_id: scope === "agency" ? agencyId : null,
        embedding: `[${vector.join(",")}]`,
        embedding_model: "text-embedding-3-small",
      });
    }
  }

  if (embeddingInserts.length > 0) {
    const { error: embErr } = await supabase.from("knowledge_embeddings").insert(embeddingInserts);
    if (embErr) {
      console.error("Falha ao salvar embeddings dos chunks do RAG:", embErr.message);
    }
  }

  return { documentId: doc.id };
}
