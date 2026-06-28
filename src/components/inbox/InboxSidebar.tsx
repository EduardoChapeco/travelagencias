import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Inbox, Send, AlertCircle, Loader2, Plus, MailQuestion } from "lucide-react";

interface InboxSidebarProps {
  accounts: any[];
  selectedAccountId: string | null;
  onSelectAccount: (id: string | null) => void;
  onConnectGmail: () => void;
  isLoading: boolean;
}

export function InboxSidebar({ accounts, selectedAccountId, onSelectAccount, onConnectGmail, isLoading }: InboxSidebarProps) {
  return (
    <div className="w-64 border-r border-border h-full flex flex-col bg-surface">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          Inbox Inteligente
        </h2>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">Visões</h3>
            <div className="space-y-1">
              <Button 
                variant={selectedAccountId === null ? "secondary" : "ghost"} 
                className="w-full justify-start font-normal h-9"
                onClick={() => onSelectAccount(null)}
              >
                <Inbox className="w-4 h-4 mr-2" />
                Todos os Tickets
              </Button>
              <Button variant="ghost" className="w-full justify-start font-normal h-9 text-muted-foreground opacity-70">
                <Send className="w-4 h-4 mr-2" />
                Enviados
              </Button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 px-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contas Conectadas</h3>
              <Button variant="ghost" size="icon" className="w-5 h-5" onClick={onConnectGmail} title="Adicionar Conta">
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-sm text-muted-foreground p-2 flex flex-col items-center text-center gap-2 mt-4">
                <MailQuestion className="w-8 h-8 opacity-20" />
                <p>Nenhuma conta de email conectada.</p>
                <Button variant="outline" size="sm" onClick={onConnectGmail} className="mt-2 w-full">
                  Conectar Gmail
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {accounts.map(acc => (
                  <Button
                    key={acc.id}
                    variant={selectedAccountId === acc.id ? "secondary" : "ghost"}
                    className="w-full justify-start h-10 px-2"
                    onClick={() => onSelectAccount(acc.id)}
                  >
                    <Avatar className="w-6 h-6 mr-3">
                      <AvatarImage src={acc.profile_picture} />
                      <AvatarFallback>{acc.display_name?.charAt(0) || "G"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left truncate">
                      <div className="text-sm">{acc.display_name}</div>
                      <div className="text-xs text-muted-foreground truncate">{acc.email_address}</div>
                    </div>
                    {acc.status === 'error' && <AlertCircle className="w-3 h-3 text-destructive ml-2" />}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
