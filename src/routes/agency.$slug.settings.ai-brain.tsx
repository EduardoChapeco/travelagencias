import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { HeaderPortal } from "@/components/shell/HeaderPortal";
import {
  Brain, FileText, Database, ShieldAlert, Cpu, CheckCircle2, Zap, AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/agency/$slug/settings/ai-brain")({
  head: () => ({ meta: [{ title: "Cérebro Vetorial IA · TravelOS" }] }),
  component: BrainPanel,
});

function BrainPanel() {
  const { agency } = useAgency();

  // 1. Fetch Ingested Documents (RAG)
  const docsQuery = useQuery({
    queryKey: ["knowledge_documents", agency?.id],
    enabled: !!agency,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_documents")
        .select("id, title, status, chunk_count, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  // 2. Fetch Processed Inbox Emails (Semantic Match)
  const inboxAiQuery = useQuery({
    queryKey: ["inbox_ai_stats", agency?.id],
    enabled: !!agency,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emails")
        .select("id, subject, ai_category, ai_confidence, link_method, ai_extracted_entities, created_at")
        .not("ai_category", "is", null)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  if (!agency) return null;

  const docs = (docsQuery.data || []) as any[];
  const processedEmails = (inboxAiQuery.data || []) as any[];

  const totalChunks = docs.reduce((acc, doc) => acc + (doc.chunk_count || 0), 0);
  const avgConfidence = processedEmails.length > 0 
    ? (processedEmails.reduce((acc, em) => acc + (em.ai_confidence || 1), 0) / processedEmails.length * 100).toFixed(1)
    : 0;

  return (
    <div className="flex h-[calc(100vh-var(--header-h))] flex-col overflow-hidden bg-background">
      <HeaderPortal>
        <div className="flex items-center gap-2">
           <Badge variant="outline" className="bg-brand/10 text-brand border-none">
             <Zap className="w-3 h-3 mr-1" /> Cérebro Ativo (Gemini 2.5)
           </Badge>
        </div>
      </HeaderPortal>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-5 w-5 text-brand" /> Cérebro Vetorial & Inbox IA
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitore a ingestão de PDFs/Documentos (Chunks de RAG) e a performance da classificação semântica no Inbox.
          </p>
        </div>

        {/* Indicadores de Performance */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface p-4 flex flex-col justify-between shadow-xs">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Docs Absorvidos</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-foreground">{docs.length}</span>
              <span className="text-[10px] text-muted-foreground">PDFs/Textos</span>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 flex flex-col justify-between shadow-xs">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Base de Conhecimento</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-foreground">{totalChunks}</span>
              <span className="text-[10px] text-muted-foreground">chunks (pgvector)</span>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 flex flex-col justify-between shadow-xs">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">E-mails Processados</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-foreground text-brand">{processedEmails.length}</span>
              <span className="text-[10px] text-muted-foreground">inbox webhook</span>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 flex flex-col justify-between shadow-xs">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Confiança Média (Match)</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-success">{avgConfidence}%</span>
              <span className="text-[10px] text-muted-foreground">gemini-2.5</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* RAG Documents */}
          <div className="border border-border rounded-xl bg-surface overflow-hidden">
             <div className="p-4 border-b border-border font-semibold flex items-center gap-2">
                <Database className="w-4 h-4 text-muted-foreground" />
                Vetorização de Conhecimento (RAG)
             </div>
             <div className="divide-y divide-border max-h-[400px] overflow-y-auto bg-card">
               {docs.length === 0 ? (
                 <div className="p-4 text-sm text-muted-foreground">Nenhum documento absorvido.</div>
               ) : docs.map(doc => (
                 <div key={doc.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <div>
                        <div className="text-sm font-medium text-foreground">{doc.title}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(doc.created_at), "dd/MM/yyyy HH:mm")}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                       <span className="text-muted-foreground text-xs">{doc.chunk_count} chunks</span>
                       {doc.status === 'processed' ? (
                         <CheckCircle2 className="w-4 h-4 text-success" />
                       ) : (
                         <Cpu className="w-4 h-4 text-warning animate-pulse" />
                       )}
                    </div>
                 </div>
               ))}
             </div>
          </div>

          {/* Inbox Processing */}
          <div className="border border-border rounded-xl bg-surface overflow-hidden">
             <div className="p-4 border-b border-border font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-brand" /> 
                  Processamento Semântico do Inbox
                </div>
             </div>
             <div className="divide-y divide-border max-h-[400px] overflow-y-auto bg-card">
               {processedEmails.length === 0 ? (
                 <div className="p-4 text-sm text-muted-foreground">Nenhum e-mail recebido e processado.</div>
               ) : processedEmails.map(em => {
                 const isAlert = em.ai_category === 'cancellation' || em.ai_category === 'flight_change';
                 return (
                 <div key={em.id} className="p-3">
                    <div className="flex justify-between items-start mb-1">
                      <div className="text-sm font-medium text-foreground line-clamp-1">{em.subject || "Sem Assunto"}</div>
                      <Badge variant="outline" className="text-[10px] h-5 bg-surface">{((em.ai_confidence || 1) * 100).toFixed(0)}% Match</Badge>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                       <div className="flex items-center gap-2">
                         <Badge variant="outline" className={`text-[10px] h-5 border-none ${isAlert ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                           {em.ai_category}
                         </Badge>
                         {em.link_method === 'hash_exact_match' && (
                            <span className="text-[10px] text-brand flex items-center gap-1 bg-brand/10 px-1.5 py-0.5 rounded">
                              Auto-Vínculo (Hash)
                            </span>
                         )}
                       </div>
                       {/* CRM Alert Automation Logic View */}
                       {isAlert && (
                         <span className="text-[10px] text-destructive flex items-center gap-1 font-medium">
                           <AlertTriangle className="w-3 h-3" /> Alerta CRM Disparado
                         </span>
                       )}
                    </div>
                 </div>
               )})}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
