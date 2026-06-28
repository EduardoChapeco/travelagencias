import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Link as LinkIcon, Ticket, Plane, Zap, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIPanelProps {
  email: any | null;
}

export function AIPanel({ email }: AIPanelProps) {
  if (!email) return null; // Only shows when an email is selected

  const entities = email.ai_extracted_entities || {};
  const hasExtractedData = entities.locs?.length > 0 || entities.passengers?.length > 0 || entities.ticket_hash;

  return (
    <div className="w-80 border-l border-border h-full flex flex-col bg-surface-alt">
      <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand" />
          Análise IA
        </h3>
        {email.ai_confidence && (
          <Badge variant="outline" className="text-xs bg-brand/10 text-brand border-none">
            {(email.ai_confidence * 100).toFixed(0)}% Confiança
          </Badge>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          
          {/* Summary Section */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Resumo Rápido</h4>
            <div className="p-3 bg-card border border-border rounded-lg text-sm text-foreground shadow-sm">
              {email.ai_summary || "O Cérebro IA não gerou resumo para este email."}
            </div>
          </div>

          {/* Extracted Entities */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Entidades Identificadas</h4>
            
            {hasExtractedData ? (
              <div className="space-y-2">
                {entities.ticket_hash && (
                  <div className="flex items-center justify-between p-2 rounded-md bg-card border border-border">
                    <div className="flex items-center gap-2 text-sm">
                      <Ticket className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{entities.ticket_hash}</span>
                    </div>
                    {email.linked_ticket_id ? (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    ) : (
                      <Button variant="ghost" size="sm" className="h-6 text-xs px-2">Vincular</Button>
                    )}
                  </div>
                )}
                
                {entities.locs?.map((loc: string, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-md bg-card border border-border">
                    <div className="flex items-center gap-2 text-sm">
                      <Plane className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">LOC: {loc}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 text-xs px-2">Vincular</Button>
                  </div>
                ))}
                
                {entities.passengers?.map((pax: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-card border border-border text-sm">
                    <div className="w-2 h-2 rounded-full bg-primary/30" />
                    <span className="truncate">{pax}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma entidade estruturada (LOC, Nomes) extraída.</p>
            )}
          </div>

          {/* Action Suggestions */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Próxima Ação Sugerida</h4>
            <Button className="w-full justify-start shadow-sm" variant={email.linked_ticket_id ? "secondary" : "default"}>
              <Zap className="w-4 h-4 mr-2" />
              {email.linked_ticket_id ? 'Responder no Ticket' : 'Transformar em Ticket'}
            </Button>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}
