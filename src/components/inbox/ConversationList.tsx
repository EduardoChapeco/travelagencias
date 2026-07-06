import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sparkles, MessageCircle, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConversationListProps {
  conversations: any[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}

export function ConversationList({ conversations, selectedId, onSelect, isLoading }: ConversationListProps) {
  
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
            placeholder="Buscar contatos ou telefones..." 
            className="w-full h-9 pl-3 pr-4 rounded-full border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {conversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Nenhuma conversa na caixa de entrada.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {conversations.map((conv) => {
              const contact = conv.contacts || {};
              const lastMessage = conv.messages?.[0] || {};
              const channelType = conv.channels?.type || 'whatsapp';
              
              return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  "w-full text-left p-4 hover:bg-surface-muted transition-colors flex flex-col gap-2 relative",
                  selectedId === conv.id && "bg-surface-muted border-l-2 border-primary"
                )}
              >
                <div className="flex justify-between items-start w-full">
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {(contact.name || contact.phone || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="truncate">
                      <div className="font-medium text-sm truncate text-foreground flex items-center gap-1">
                        {channelType === 'whatsapp' ? <MessageCircle className="w-3 h-3 text-green-500" /> : <Mail className="w-3 h-3 text-blue-500" />}
                        {contact.name || "Desconhecido"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {contact.phone || contact.email}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground flex-shrink-0 ml-2 whitespace-nowrap">
                    {conv.last_message_at ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: ptBR }) : ""}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground line-clamp-2 pl-10">
                  {lastMessage.body || "Nenhuma mensagem."}
                </div>

                <div className="flex items-center gap-2 pl-10 mt-1 flex-wrap">
                  {conv.ai_mode && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-none bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      <Sparkles className="w-3 h-3 mr-1" />
                      IA Ativa
                    </Badge>
                  )}
                  {conv.status === 'open' && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-green-100 text-green-800 border-none">
                      Aberto
                    </Badge>
                  )}
                  {conv.status === 'pending' && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-amber-100 text-amber-800 border-none">
                      Pendente
                    </Badge>
                  )}
                </div>
              </button>
            )})}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
