import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Chunking helper for large text */
function splitTextIntoChunks(text: string, chunkSize: number = 1000): string[] {
  const chunks: string[] = [];
  let currentChunk = "";
  
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  for (const sentence of sentences) {
    if ((currentChunk.length + sentence.length) < chunkSize) {
      currentChunk += (currentChunk ? " " : "") + sentence;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = sentence;
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  
  return chunks;
}

/** Vectorize text using the central AI orchestrator */
async function generateEmbedding(
  text: string,
  orchestratorUrl: string,
  serviceRoleKey: string,
  agencyId: string | null
): Promise<number[] | null> {
  try {
    const res = await fetch(orchestratorUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        action: "embeddings",
        agency_id: agencyId,
        text,
        module: "rag-document-processor",
      }),
    });
    if (!res.ok) {
      throw new Error(`Orchestrator returned status ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    return data.embedding || null;
  } catch (e) {
    console.error("Embedding Error calling orchestrator:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const orchestratorUrl = `${supabaseUrl}/functions/v1/ai-orchestrator`;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { record } = await req.json(); // Expected payload from Postgres Trigger

    if (!record || !record.id || !record.content_text) {
      return new Response("Missing record data", { status: 400 });
    }

    // Processamento Assíncrono para evitar timeout
    const processChunks = async () => {
      try {
        await supabase.from("knowledge_documents").update({ status: 'processing' }).eq("id", record.id);

        const chunks = splitTextIntoChunks(record.content_text);
        
        let successCount = 0;
        for (let i = 0; i < chunks.length; i++) {
          const chunkText = chunks[i];
          // Usar a agência associada à org_id se possível ou passar null
          const vector = await generateEmbedding(chunkText, orchestratorUrl, serviceRoleKey, null);
          
          if (vector) {
            await supabase.from("knowledge_chunks").insert({
              document_id: record.id,
              org_id: record.org_id,
              content: chunkText,
              embedding: vector,
              chunk_index: i
            });
            successCount++;
          }
        }

        await supabase.from("knowledge_documents").update({ 
          status: 'processed', 
          chunk_count: successCount 
        }).eq("id", record.id);
      } catch (innerError) {
        console.error("rag background processing error:", innerError);
        await supabase.from("knowledge_documents").update({ status: 'error' }).eq("id", record.id);
      }
    };

    const promise = processChunks();
    // @ts-ignore
    if (typeof EdgeRuntime !== 'undefined' && typeof EdgeRuntime.waitUntil === 'function') {
      // @ts-ignore
      EdgeRuntime.waitUntil(promise);
    } else {
      promise.catch(console.error);
    }

    return new Response(JSON.stringify({ success: true, message: "Processing started in background" }), {
      status: 202,
      headers: corsHeaders,
    });

  } catch (err: any) {
    console.error("rag-document-processor error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
