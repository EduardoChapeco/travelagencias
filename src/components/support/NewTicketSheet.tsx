import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { toast } from "sonner";
import { SheetPage } from "@/components/ui/sheet";
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

interface NewTicketSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialClientId?: string;
}

export function NewTicketSheet({ isOpen, onClose, initialClientId }: NewTicketSheetProps) {
  const { agency } = useAgency();
  const qc = useQueryClient();

  const [clientId, setClientId] = useState("");
  const [tripId, setTripId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [type, setType] = useState("trip");

  useEffect(() => {
    if (isOpen) {
      setClientId(initialClientId || "");
    }
  }, [isOpen, initialClientId]);

  // Fetch clients
  const { data: clients, isLoading: loadingClients } = useQuery({
    queryKey: ["agency_clients_list", agency?.id],
    enabled: !!agency && isOpen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name, email")
        .eq("agency_id", agency!.id)
        .is("deleted_at", null)
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch trips (optionally filtered by client)
  const { data: trips, isLoading: loadingTrips } = useQuery({
    queryKey: ["agency_trips_list", agency?.id, clientId],
    enabled: !!agency && isOpen,
    queryFn: async () => {
      let query = supabase
        .from("trips")
        .select("id, title, destination")
        .eq("agency_id", agency!.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) {
        throw new Error("O assunto/título é obrigatório");
      }

      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          agency_id: agency!.id,
          client_id: clientId || null,
          trip_id: tripId || null,
          title: title.trim(),
          description: description.trim() || null,
          priority,
          type,
          status: "open",
          stage: "new",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Ticket criado com sucesso!");
      // Reset form
      setClientId("");
      setTripId("");
      setTitle("");
      setDescription("");
      setPriority("medium");
      setType("trip");
      // Invalidate support query
      qc.invalidateQueries({ queryKey: ["support_tickets_advanced", agency?.id] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao criar ticket");
    },
  });

  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId);
    // Reset selected trip to ensure consistency
    setTripId("");
  };

  const isPending = createMutation.isPending;

  return (
    <SheetPage isOpen={isOpen} onClose={onClose} title="Novo Ticket Interno" width="500px">
      <div className="space-y-5 py-2">
        <div className="text-xs text-muted-foreground">
          Abra um novo chamado de atendimento direto para suporte operacional ou crie um ticket
          avulso para controle interno (ex. viagens terrestres, pendências ou cotações).
        </div>

        <div className="space-y-4">
          <Field label="Cliente (Opcional)">
            {loadingClients ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground h-9">
                <Loader2 className="w-4 h-4 animate-spin text-primary" /> Carregando clientes...
              </div>
            ) : (
              <Select value={clientId} onChange={(e) => handleClientChange(e.target.value)}>
                <option value="">Nenhum cliente (Avulso)</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} {c.email ? `(${c.email})` : ""}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            label={clientId ? "Viagem do Cliente (Opcional)" : "Viagem (Opcional)"}
            hint={
              clientId
                ? "Filtrado apenas para viagens deste cliente"
                : "Selecione uma viagem ativa da agência"
            }
          >
            {loadingTrips ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground h-9">
                <Loader2 className="w-4 h-4 animate-spin text-primary" /> Carregando viagens...
              </div>
            ) : (
              <Select value={tripId} onChange={(e) => setTripId(e.target.value)}>
                <option value="">Nenhuma viagem vinculada</option>
                {trips?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} {t.destination ? `· ${t.destination}` : ""}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Assunto / Título *">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Alteração de data de voo ou cotação terrestre"
              required
            />
          </Field>

          <Field label="Descrição / Detalhes">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva detalhadamente o chamado de suporte..."
              rows={4}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Prioridade">
              <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </Select>
            </Field>

            <Field label="Tipo do Ticket">
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="trip">Viagem</option>
                <option value="financial">Financeiro</option>
                <option value="complaint">Reclamação</option>
                <option value="refund">Reembolso</option>
                <option value="other">Outros / Operacional</option>
              </Select>
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-border mt-6">
          <GhostButton type="button" onClick={onClose} disabled={isPending}>
            Cancelar
          </GhostButton>
          <PrimaryButton
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={isPending || !title.trim()}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Criando...
              </>
            ) : (
              "Criar Ticket"
            )}
          </PrimaryButton>
        </div>
      </div>
    </SheetPage>
  );
}
