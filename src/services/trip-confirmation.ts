import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ConfirmationItem = Database["public"]["Tables"]["trip_confirmation_items"]["Row"];
export type InsertConfirmationItem =
  Database["public"]["Tables"]["trip_confirmation_items"]["Insert"];

export const ITEM_TYPE_LABELS: Record<string, string> = {
  flight: "Voo",
  hotel: "Hospedagem",
  transfer: "Translado / Transfer",
  insurance: "Seguro Viagem",
  cruise: "Cruzeiro",
  tour: "Passeio / Tour",
  other: "Outro",
};

/** Busca todos os itens de confirmação de uma viagem, ordenados por sort_order */
export async function fetchConfirmationItems(tripId: string): Promise<ConfirmationItem[]> {
  const { data, error } = await supabase
    .from("trip_confirmation_items")
    .select("*")
    .eq("trip_id", tripId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Erro ao carregar confirmações: ${error.message}`);
  return data ?? [];
}

/** Adiciona um novo localizador de serviço à viagem */
export async function createConfirmationItem(
  payload: Omit<InsertConfirmationItem, "id" | "created_at" | "updated_at">,
): Promise<ConfirmationItem> {
  const { data, error } = await supabase
    .from("trip_confirmation_items")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar confirmação: ${error.message}`);
  return data;
}

/** Atualiza campos de um item de confirmação existente */
export async function updateConfirmationItem(
  itemId: string,
  patch: Partial<
    Pick<
      ConfirmationItem,
      | "item_type"
      | "provider_name"
      | "details"
      | "service_date"
      | "locator_code"
      | "status"
      | "notes"
      | "sort_order"
    >
  >,
): Promise<void> {
  const { error } = await supabase.from("trip_confirmation_items").update(patch).eq("id", itemId);

  if (error) throw new Error(`Erro ao atualizar confirmação: ${error.message}`);
}

/** Remove um item de confirmação */
export async function deleteConfirmationItem(itemId: string): Promise<void> {
  const { error } = await supabase.from("trip_confirmation_items").delete().eq("id", itemId);

  if (error) throw new Error(`Erro ao remover confirmação: ${error.message}`);
}

/** Verifica se todos os itens críticos (flight, hotel) estão confirmados */
export function allCriticalItemsConfirmed(items: ConfirmationItem[]): boolean {
  const critical = items.filter((i) => ["flight", "hotel"].includes(i.item_type));
  return critical.length > 0 && critical.every((i) => i.status === "confirmed");
}
