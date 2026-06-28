import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { InboxSidebar } from '@/components/inbox/InboxSidebar';
import { EmailList } from '@/components/inbox/EmailList';
import { ThreadView } from '@/components/inbox/ThreadView';
import { AIPanel } from '@/components/inbox/AIPanel';
import { toast } from 'sonner';

export const Route = createFileRoute('/agency/$slug/inbox')({
  component: InboxPage,
});

function InboxPage() {
  const { slug } = Route.useParams();
  const supabase = useSupabase();
  
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  
  const [emails, setEmails] = useState<any[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);

  // 1. Fetch Accounts
  useEffect(() => {
    async function fetchAccounts() {
      setIsLoadingAccounts(true);
      const { data: agency } = await supabase.from('agencies').select('id').eq('slug', slug).single();
      if (agency) {
        const { data } = await supabase.from('email_accounts').select('*').eq('org_id', agency.id);
        setAccounts(data || []);
      }
      setIsLoadingAccounts(false);
    }
    fetchAccounts();
  }, [slug, supabase]);

  // 2. Fetch Emails based on Selected Account
  useEffect(() => {
    async function fetchEmails() {
      setIsLoadingEmails(true);
      const { data: agency } = await supabase.from('agencies').select('id').eq('slug', slug).single();
      if (!agency) return;

      let query = supabase.from('emails').select('*').eq('org_id', agency.id).eq('is_deleted', false).order('created_at', { ascending: false }).limit(50);
      
      if (selectedAccountId) {
        query = query.eq('email_account_id', selectedAccountId);
      }
      
      const { data } = await query;
      setEmails(data || []);
      
      // Auto-select first email if available
      if (data && data.length > 0 && !selectedEmailId) {
        setSelectedEmailId(data[0].id);
      } else if (!data || data.length === 0) {
        setSelectedEmailId(null);
      }
      setIsLoadingEmails(false);
    }
    
    fetchEmails();
  }, [slug, selectedAccountId, supabase]);

  // 3. Supabase Realtime Subscription
  useEffect(() => {
    const channel = supabase.channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'emails' },
        (payload) => {
          // Add new email to top of list if it matches current filter
          const newEmail = payload.new;
          if (!selectedAccountId || newEmail.email_account_id === selectedAccountId) {
            setEmails((prev) => [newEmail, ...prev]);
            toast.success("Novo email recebido e processado pela IA.");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedAccountId, supabase]);

  const handleConnectGmail = async () => {
    try {
      const { data: agency } = await supabase.from('agencies').select('id').eq('slug', slug).single();
      const { data: { user } } = await supabase.auth.getUser();
      if (!agency || !user) throw new Error("Agency or User not found");

      // Call Edge Function to get Auth URL
      const { data, error } = await supabase.functions.invoke('gmail-oauth', {
        body: { action: 'get_url' },
        query: { org_id: agency.id, user_id: user.id, account_type: 'general' }
      });

      if (error) throw error;
      if (data.url) {
        window.location.href = data.url; // Redirect to Google Consent
      }
    } catch (err: any) {
      toast.error("Erro ao iniciar conexão: " + err.message);
    }
  };

  const selectedEmail = emails.find(e => e.id === selectedEmailId) || null;

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
      <InboxSidebar 
        accounts={accounts} 
        selectedAccountId={selectedAccountId} 
        onSelectAccount={setSelectedAccountId}
        onConnectGmail={handleConnectGmail}
        isLoading={isLoadingAccounts}
      />
      
      <EmailList 
        emails={emails} 
        selectedEmailId={selectedEmailId} 
        onSelectEmail={setSelectedEmailId}
        isLoading={isLoadingEmails}
      />
      
      <ThreadView email={selectedEmail} />
      
      <AIPanel email={selectedEmail} />
    </div>
  );
}
