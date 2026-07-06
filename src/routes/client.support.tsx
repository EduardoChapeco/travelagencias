import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LifeBuoy, Plus, ExternalLink } from "lucide-react";
import { fetchClientTickets, createClientTicket, fetchClientAgencies } from "@/services/client-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/client/support")({
  component: ClientSupportRoute,
});

function ClientSupportRoute() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("support"); // support, modification, cancellation
  const [priority, setPriority] = useState("low"); // low, medium, high

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
    try {
      setLoading(true);
      const data = await fetchClientTickets();
      setTickets(data);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao buscar chamados.");
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const agencies = await fetchClientAgencies();
      if (!agencies.length) throw new Error("Nenhuma agência vinculada");

      await createClientTicket({
        title,
        description,
        type,
        priority,
        agency_id: agencies[0].id,
        client_id: userData.user.id,
      });

      toast.success("Chamado aberto com sucesso!");
      setIsCreating(false);
      setTitle("");
      setDescription("");
      setType("support");
      setPriority("low");
      loadTickets();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao abrir chamado.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 text-[10px] rounded-full uppercase font-bold tracking-wider">Aberto</span>;
      case "in_progress":
        return <span className="px-2 py-1 bg-blue-500/10 text-blue-500 text-[10px] rounded-full uppercase font-bold tracking-wider">Em Andamento</span>;
      case "resolved":
        return <span className="px-2 py-1 bg-green-500/10 text-green-500 text-[10px] rounded-full uppercase font-bold tracking-wider">Resolvido</span>;
      case "closed":
        return <span className="px-2 py-1 bg-zinc-500/10 text-zinc-500 text-[10px] rounded-full uppercase font-bold tracking-wider">Fechado</span>;
      default:
        return <span className="px-2 py-1 bg-zinc-500/10 text-zinc-500 text-[10px] rounded-full uppercase font-bold tracking-wider">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LifeBuoy className="h-6 w-6 text-primary" /> Meus Chamados
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe suas solicitações e pedidos de suporte.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-primary text-primary-foreground h-10 px-4 rounded-md text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Novo Chamado
        </button>
      </div>

      {isCreating && (
        <div className="bg-surface border border-border p-5 rounded-xl">
          <h2 className="text-lg font-semibold mb-4">Abrir Novo Chamado</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Assunto</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-10 bg-background border border-border rounded-md px-3 text-sm focus:border-primary outline-none transition-colors"
                  placeholder="Ex: Dúvida sobre o voo"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Tipo</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full h-10 bg-background border border-border rounded-md px-3 text-sm focus:border-primary outline-none transition-colors"
                >
                  <option value="support">Dúvida / Suporte Geral</option>
                  <option value="modification">Alteração de Reserva</option>
                  <option value="cancellation">Cancelamento</option>
                  <option value="complaint">Reclamação</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Descrição Detalhada</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none transition-colors resize-none h-32"
                placeholder="Descreva como podemos te ajudar..."
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="h-10 px-4 rounded-md text-sm font-semibold bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!title || !description}
                className="h-10 px-4 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Enviar Chamado
              </button>
            </div>
          </form>
        </div>
      )}

      {!isCreating && tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-xl">
          <LifeBuoy className="h-12 w-12 text-muted-foreground opacity-50 mb-3" />
          <h3 className="text-lg font-medium">Nenhum chamado aberto</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Você não possui tickets de suporte no momento. Se precisar de ajuda, abra um novo chamado.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="bg-surface border border-border p-4 rounded-xl flex flex-col md:flex-row gap-4 md:items-center justify-between hover:border-primary/50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge(ticket.status)}
                  <span className="text-xs text-muted-foreground">
                    #{ticket.id.substring(0, 8)} • {new Date(ticket.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="font-semibold text-base truncate">{ticket.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                  {ticket.description}
                </p>
              </div>
              <div className="shrink-0">
                {/* No futuro podemos adicionar uma página de detalhes do ticket, por enquanto mostramos resumo */}
                <button className="h-9 px-3 rounded-md border border-border text-sm font-medium hover:bg-accent transition-colors flex items-center gap-2 text-muted-foreground">
                  <ExternalLink className="h-4 w-4" /> Detalhes
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
