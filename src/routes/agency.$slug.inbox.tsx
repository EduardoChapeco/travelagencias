import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { InboxSidebar } from '@/components/inbox/InboxSidebar';
import { ConversationList } from '@/components/inbox/ConversationList';
import { ThreadView } from '@/components/inbox/ThreadView';
import { AIPanel } from '@/components/inbox/AIPanel';
import { useAgency } from '@/lib/agency-context';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const Route = createFileRoute('/agency/$slug/inbox')({
  head: () => ({ meta: [{ title: 'Caixa de Entrada · TravelOS' }] }),
  component: InboxModule,
});

function InboxModule() {
  const { agency } = useAgency();
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();
  
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
  }, []);

  // 1. Fetch Conversations
  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery({
    queryKey: ['conversations', agency?.id],
    queryFn: async () => {
      if (!agency?.id) return [];
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          contacts(name, phone, email),
          channels(type, display_name),
          messages(body, created_at)
        `)
        .eq('agency_id', agency.id)
        .order('last_message_at', { ascending: false })
        .limit(50);
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!agency?.id,
  });

  // 2. Fetch Messages for Selected Conversation
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConversationId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedConversationId,
  });

  // 3. Supabase Realtime Subscription (New Messages)
  useEffect(() => {
    if (!agency?.id) return;
    
    const channel = supabase.channel('inbox-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `agency_id=eq.${agency.id}` },
        (payload) => {
          // Invalidate queries to refresh UI seamlessly
          queryClient.invalidateQueries({ queryKey: ['conversations', agency.id] });
          if (payload.new.conversation_id === selectedConversationId) {
            queryClient.invalidateQueries({ queryKey: ['messages', selectedConversationId] });
            if (payload.new.direction === 'inbound') {
               toast("Nova mensagem recebida!");
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `agency_id=eq.${agency.id}` },
        (payload) => {
          if (payload.new.conversation_id === selectedConversationId) {
             queryClient.invalidateQueries({ queryKey: ['messages', selectedConversationId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agency?.id, selectedConversationId, queryClient]);

  // Actions
  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!agency?.id || !selectedConversationId) throw new Error("No conversation selected");
      const { data, error } = await supabase.from('messages').insert({
        agency_id: agency.id,
        conversation_id: selectedConversationId,
        direction: 'outbound',
        body: text,
        status: 'queued',
        sender_user_id: currentUser?.id
      });
      if (error) throw error;
      return data;
    }
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversationId || !currentUser?.id) throw new Error("No user/conversation");
      const { data, error } = await supabase.from('conversations').update({
        assigned_user_id: currentUser.id,
        status: 'open'
      }).eq('id', selectedConversationId);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Conversa assumida com sucesso.");
      queryClient.invalidateQueries({ queryKey: ['conversations', agency?.id] });
    }
  });

  const selectedConversation = conversations.find((c: any) => c.id === selectedConversationId) || null;

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
      <InboxSidebar 
        accounts={[]} 
        selectedAccountId={null} 
        onSelectAccount={() => {}}
        onConnectGmail={() => {}}
        isLoading={false}
      />
      
      <ConversationList 
        conversations={conversations} 
        selectedId={selectedConversationId} 
        onSelect={setSelectedConversationId}
        isLoading={isLoadingConversations}
      />
      
      <ThreadView 
        conversation={selectedConversation}
        messages={messages}
        onSendMessage={(text) => sendMessageMutation.mutate(text)}
        onAssignToMe={() => assignMutation.mutate()}
        currentUserId={currentUser?.id}
      />
      
      <AIPanel email={null} />
    </div>
  );
}
