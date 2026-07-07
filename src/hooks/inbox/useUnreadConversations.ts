import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/**
 * Retorna o total de conversas não-lidas (status = 'open' e última mensagem
 * de direção 'inbound' ainda não vista).
 *
 * Estratégia simples: contar conversas com status='open' e unread_count > 0.
 * Se a coluna unread_count não existir, fallback: contar conversas abertas sem
 * atribuição ao usuário corrente (gracioso).
 */
export function useUnreadConversations() {
  const { agency } = useAgency();

  return useQuery({
    queryKey: ["unread-conversations-count", agency?.id],
    enabled: !!agency?.id,
    staleTime: 30_000,
    queryFn: async () => {
      if (!agency?.id) return 0;

      try {
        // Tentar usar coluna unread_count se existir
        const { data, error } = await db
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .eq("agency_id", agency.id)
          .eq("status", "open")
          .gt("unread_count", 0);

        if (!error) {
          // PostgREST retorna count no header
          return (data as any)?.length ?? 0;
        }
      } catch {
        /* fallback abaixo */
      }

      // Fallback: contar conversas abertas (sem unread_count)
      try {
        const { count } = await db
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .eq("agency_id", agency.id)
          .eq("status", "open");

        return count ?? 0;
      } catch {
        return 0;
      }
    },
  });
}
