import { supabase } from "@/integrations/supabase/client";

export type PublicInstallment = {
  id: string;
  amount: number;
  due_date: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  payment_method: string | null;
  external_link: string | null;
  paid_at: string | null;
};

export async function fetchPublicContractByToken(token: string): Promise<any> {
  const { data, error } = await supabase.rpc("public_contract_by_token", { _token: token });
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchPublicInstallmentsByToken(token: string): Promise<PublicInstallment[]> {
  const { data, error } = await supabase.rpc(
    "public_payment_by_token" as never,
    { _token: token } as never,
  );
  if (error) throw new Error(error.message);
  return (data as unknown as PublicInstallment[]) || [];
}
