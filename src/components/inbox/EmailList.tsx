import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sparkles, Paperclip, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailListProps {
  emails: any[];
  selectedEmailId: string | null;
  onSelectEmail: (id: string) => void;
  isLoading: boolean;
}

export function EmailList({ emails, selectedEmailId, onSelectEmail, isLoading }: EmailListProps) {
  
  const getIntentColor = (intent: string) => {
    switch (intent) {
      case 'ticket_update': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'new_trip_request': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'flight_change': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'cancellation': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
    }
  };

  if (isLoading) {
    return (
      <div className="w-[350px] border-r border-border h-full flex flex-col items-center justify-center text-muted-foreground p-4">
        <div className="animate-pulse flex flex-col w-full space-y-4">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex gap-4 w-full">
              <div className="w-10 h-10 rounded-full bg-border"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-border rounded w-3/4"></div>
                <div className="h-3 bg-border rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-[350px] border-r border-border h-full flex flex-col bg-card">
      <div className="p-3 border-b border-border bg-surface sticky top-0 z-10">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Buscar emails, LOCs ou passageiros..." 
            className="w-full h-9 pl-3 pr-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {emails.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Nenhum e-mail encontrado.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {emails.map((email) => (
              <button
                key={email.id}
                onClick={() => onSelectEmail(email.id)}
                className={cn(
                  "w-full text-left p-4 hover:bg-surface-muted transition-colors flex flex-col gap-2 relative",
                  selectedEmailId === email.id && "bg-surface-muted border-l-2 border-primary"
                )}
              >
                <div className="flex justify-between items-start w-full">
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {email.from_name?.charAt(0) || email.from_email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="truncate">
                      <div className="font-medium text-sm truncate text-foreground">
                        {email.from_name || email.from_email.split('@')[0]}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {email.subject}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground flex-shrink-0 ml-2 whitespace-nowrap">
                    {formatDistanceToNow(new Date(email.created_at), { addSuffix: true, locale: ptBR })}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground line-clamp-2 pl-10">
                  {email.snippet || email.ai_summary || "Sem visualização."}
                </div>

                <div className="flex items-center gap-2 pl-10 mt-1 flex-wrap">
                  {email.ai_category && (
                    <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 border-none", getIntentColor(email.ai_category))}>
                      <Sparkles className="w-3 h-3 mr-1" />
                      {email.ai_category}
                    </Badge>
                  )}
                  {email.linked_ticket_id && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-brand-light text-brand">
                      <LinkIcon className="w-3 h-3 mr-1" />
                      Ticket
                    </Badge>
                  )}
                  {email.has_attachments && (
                    <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
