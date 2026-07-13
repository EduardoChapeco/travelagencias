import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Send, UserPlus, Archive, MoreVertical, Paperclip, Check, CheckCheck, Clock } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ThreadViewProps {
  conversation: any | null;
  messages: any[];
  onSendMessage: (text: string) => void;
  onAssignToMe: () => void;
  currentUserId?: string;
}

export function ThreadView({ conversation, messages, onSendMessage, onAssignToMe, currentUserId }: ThreadViewProps) {
  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (!conversation) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-surface-muted text-muted-foreground flex-col gap-4">
        <div className="w-16 h-16 rounded-full bg-border flex items-center justify-center opacity-50">
          <MessageCircle className="w-8 h-8" />
        </div>
        <p>Selecione uma conversa para visualizar o histórico.</p>
      </div>
    );
  }

  const contact = conversation.contacts || {};
  const channelType = conversation.channels?.type || 'whatsapp';

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText("");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued': return <Clock className="w-3 h-3 text-muted-foreground" />;
      case 'sent': return <Check className="w-3 h-3 text-muted-foreground" />;
      case 'delivered': return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
      case 'read': return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'failed': return <span className="ds-meta text-red-500">Falha</span>;
      default: return null;
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-background relative">
      {/* Thread Header */}
      <div className="p-4 border-b border-border bg-surface flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-primary/10 text-primary">
              {(contact.name || contact.phone || "?").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-base font-semibold text-foreground line-clamp-1">
              {contact.name || contact.phone}
            </h2>
            <div className="text-xs text-muted-foreground">
              {channelType === 'whatsapp' ? contact.phone : contact.email}
            </div>
          </div>
          {conversation.ai_mode && (
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full whitespace-nowrap ml-4">
              IA Gerenciando
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {!conversation.assigned_user_id && (
            <Button variant="outline" size="sm" onClick={onAssignToMe}>
              <UserPlus className="w-4 h-4 mr-2" />
              Assumir
            </Button>
          )}
          <Button variant="ghost" size="icon">
            <Archive className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 bg-[#efeae2] dark:bg-black/20 p-4">
        <div className="max-w-3xl mx-auto flex flex-col gap-2 pb-4">
          {messages.map((msg, index) => {
            const isOutbound = msg.direction === 'outbound';
            return (
              <div 
                key={msg.id || index} 
                className={cn("flex w-full", isOutbound ? "justify-end" : "justify-start")}
              >
                <div 
                  className={cn(
                    "max-w-[75%] rounded-2xl p-3 text-sm shadow-sm relative group",
                    isOutbound 
                      ? "bg-[#d9fdd3] dark:bg-primary text-slate-900 dark:text-primary-foreground rounded-tr-none" 
                      : "bg-white dark:bg-card text-foreground rounded-tl-none"
                  )}
                >
                  {msg.body && <p className="whitespace-pre-wrap">{msg.body}</p>}
                  {msg.media_url && (
                    <div className="mt-2 rounded overflow-hidden">
                      {/* Placeholder for media rendering */}
                      <a href={msg.media_url} target="_blank" rel="noreferrer" className="text-xs underline text-blue-600">Ver Anexo</a>
                    </div>
                  )}
                  <div className={cn("ds-meta mt-1 flex items-center gap-1 justify-end opacity-70", isOutbound ? "text-slate-700 dark:text-primary-foreground" : "text-muted-foreground")}>
                    {format(new Date(msg.created_at), "HH:mm")}
                    {isOutbound && getStatusIcon(msg.status)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>
      
      {/* Input Area */}
      <div className="p-4 border-t border-border bg-surface">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <Button variant="ghost" size="icon" className="shrink-0 mb-1">
            <Paperclip className="w-5 h-5 text-muted-foreground" />
          </Button>
          <Textarea 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Mensagem..." 
            className="min-h-[44px] max-h-32 resize-none border-none"
            rows={1}
          />
          <Button onClick={handleSend} size="icon" className="shrink-0 mb-1 rounded-full h-11 w-11 bg-primary hover:bg-primary/90 text-primary-foreground">
            <Send className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
import { MessageCircle } from "lucide-react";
