import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shell/PageHeader";
import { FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import { money, fmtDate, StatusBadge } from "@/components/ui/form";
import { fetchClientAgencies } from "@/services/client-area";

export const Route = createFileRoute("/client/quotes/")({
  head: ({ context }: any) => ({ meta: [{ title: `Minhas Cotações · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: ClientQuotesIndex,
});

function ClientQuotesIndex() {
  const q = useQuery({
    queryKey: ["client-quotes"],
    queryFn: async () => {
      // 1. Descobrir qual o ID do contato logado
      const auth = await supabase.auth.getUser();
      if (!auth.data.user) throw new Error("Não autenticado");

      // Buscar os contatos que pertencem a esse uid
      const { data: contacts, error: contactErr } = await supabase
        .from("contacts")
        .select("id")
        .eq("client_id", auth.data.user.id);

      if (contactErr) throw contactErr;
      if (!contacts || contacts.length === 0) return [];

      const contactIds = contacts.map(c => c.id);

      // 2. Buscar as cotações para esses contatos
      const { data, error } = await (supabase as any)
        .from("proposals")
        .select(`
          id, 
          title, 
          number, 
          status, 
          total, 
          currency,
          valid_until,
          agency:agencies(name)
        `)
        .in("contact_id", contactIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "draft": return { label: "Em análise", color: "blue", icon: Clock };
      case "sent": return { label: "Aguardando Resposta", color: "amber", icon: Clock };
      case "approved": return { label: "Aprovada", color: "green", icon: CheckCircle };
      case "rejected": return { label: "Recusada", color: "red", icon: XCircle };
      case "expired": return { label: "Expirada", color: "gray", icon: XCircle };
      default: return { label: status, color: "gray", icon: FileText };
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Minhas Cotações"
        description="Acompanhe propostas e roteiros enviados pela sua agência."
      />

      {q.isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-surface rounded-[var(--radius-card)] border border-border"></div>
          <div className="h-24 bg-surface rounded-[var(--radius-card)] border border-border"></div>
        </div>
      ) : q.data?.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-border p-12 text-center text-muted-foreground bg-surface/50">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-1">Nenhuma cotação</h3>
          <p className="text-sm">Você ainda não possui cotações cadastradas em seu perfil.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {q.data?.map((quote: any) => {
            const statusInfo = getStatusInfo(quote.status);
            const StatusIcon = statusInfo.icon;
            
            return (
              <Link
                key={quote.id}
                to="/client/quotes/$id"
                params={{ id: quote.id }}
                className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-[var(--radius-card)] border border-border bg-surface hover:border-primary/50 transition-colors gap-4"
              >
                <div className="flex gap-4 items-start md:items-center">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 bg-${statusInfo.color}-500/10 text-${statusInfo.color}-500`}>
                    <StatusIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">#{quote.number}</span>
                      <StatusBadge color={statusInfo.color as any}>{statusInfo.label}</StatusBadge>
                    </div>
                    <h3 className="font-bold text-lg">{quote.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Agência: {quote.agency?.name || "Desconhecida"}
                      {quote.valid_until && ` • Válida até ${fmtDate(quote.valid_until)}`}
                    </p>
                  </div>
                </div>
                
                <div className="font-mono font-semibold bg-accent px-4 py-2 rounded-2xl text-lg self-start md:self-auto shrink-0 text-center">
                  {money(Number(quote.total || 0), quote.currency || "BRL")}
                  <div className="text-[10px] text-muted-foreground font-sans uppercase tracking-widest mt-1">Ver Proposta</div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  );
}
