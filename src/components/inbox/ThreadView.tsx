import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Reply, Forward, Archive, MoreVertical, Paperclip } from "lucide-react";
import DOMPurify from "dompurify";

interface ThreadViewProps {
  email: any | null;
}

export function ThreadView({ email }: ThreadViewProps) {
  if (!email) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-surface-muted text-muted-foreground flex-col gap-4">
        <div className="w-16 h-16 rounded-full bg-border flex items-center justify-center opacity-50">
          <Reply className="w-8 h-8" />
        </div>
        <p>Selecione um e-mail para visualizar a thread.</p>
      </div>
    );
  }

  const createSafeHtml = (html: string) => {
    return { __html: DOMPurify.sanitize(html) };
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-background">
      {/* Thread Header */}
      <div className="p-4 border-b border-border bg-surface flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-foreground line-clamp-1">
            {email.subject || "(Sem Assunto)"}
          </h2>
          {email.ai_category && (
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-md whitespace-nowrap">
              {email.ai_category}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Reply className="w-4 h-4 mr-2" />
            Responder
          </Button>
          <Button variant="ghost" size="icon">
            <Forward className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Archive className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 max-w-4xl mx-auto">
          {/* Message Block */}
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <div className="p-4 border-b border-border bg-surface flex justify-between items-start">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {email.from_name?.charAt(0) || email.from_email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-foreground">
                    {email.from_name} <span className="text-sm font-normal text-muted-foreground">&lt;{email.from_email}&gt;</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Para: {email.to_emails?.join(", ")}
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(email.created_at), "dd 'de' MMM, yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
            </div>
            
            <div className="p-6 text-sm text-foreground overflow-x-auto">
              {email.body_html ? (
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none prose-a:text-primary"
                  dangerouslySetInnerHTML={createSafeHtml(email.body_html)} 
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans">{email.body_text}</pre>
              )}
            </div>

            {email.has_attachments && (
              <div className="p-4 border-t border-border bg-surface-muted flex gap-2 overflow-x-auto">
                <Button variant="outline" size="sm" className="bg-background">
                  <Paperclip className="w-3 h-3 mr-2" />
                  anexo.pdf (1.2MB)
                </Button>
              </div>
            )}
          </div>
          
          {/* Quick Reply Box Placeholder */}
          <div className="mt-4 border border-border rounded-lg bg-card p-4 text-muted-foreground text-sm cursor-text hover:border-primary/50 transition-colors">
            Clique aqui para responder a {email.from_name || email.from_email}...
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
