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

/** Vectorize text using Gemini */
async function generateEmbedding(text: string, apiKey: string) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/text-embedding-004",
        content: { parts: [{ text: text.substring(0, 2000) }] }
      })
    });
    const data = await res.json();
    return data.embedding?.values || null;
  } catch (e) {
    console.error("Embedding Error:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { record } = await req.json(); // Expected payload from Postgres Trigger on knowledge_documents table

    if (!record || !record.id || !record.content_text) {
      return new Response("Missing record data", { status: 400 });
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) throw new Error("Missing Gemini API Key");

    // Processamento Assíncrono para não dar timeout no pg_net do Postgres
    const processChunks = async () => {
      try {
        // 1. Mark as processing
        await supabase.from("knowledge_documents").update({ status: 'processing' }).eq("id", record.id);

        // 2. Split into chunks
        const chunks = splitTextIntoChunks(record.content_text);
        
        // 3. Process each chunk
        let successCount = 0;
        for (let i = 0; i < chunks.length; i++) {
          const chunkText = chunks[i];
          const vector = await generateEmbedding(chunkText, geminiApiKey);
          
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

        // 4. Mark as processed
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
