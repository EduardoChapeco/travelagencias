import { supabase } from "@/integrations/supabase/client";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type FinancialRecord = {
  id: string;
  trip_id: string;
  agency_id: string;
  type: "income" | "expense" | "transfer";
  category: string | null;
  description: string | null;
  amount: number;
  currency: string;
  amount_brl: number | null;
  payment_method: string | null;
  status: "pending" | "confirmed" | "cancelled";
  due_date: string | null;
  paid_at: string | null;
  receipt_url: string | null;
  invoice_number: string | null;
  created_at: string;
  is_third_party?: boolean;
};

export type PaymentInstallment = {
  id: string;
  payment_plan_id: string;
  number: number;
  due_date: string;
  amount: number;
  status: "pending" | "paid" | "late" | "waived";
  paid_at: string | null;
  payment_method: string | null;
  late_fee: number;
  boleto_url?: string | null;
  barcode?: string | null;
  payment_warning?: string | null;
  is_third_party?: boolean;
  receipt_url?: string | null;
  receipt_status?: "none" | "pending" | "approved" | "rejected";
  rejection_reason?: string | null;
  receipt_uploaded_at?: string | null;
};

export type PaymentPlan = {
  id: string;
  trip_id: string;
  client_id: string | null;
  total_amount: number;
  status: string;
  payment_installments: PaymentInstallment[];
};

export type TripSummary = {
  id: string;
  title: string;
  total_sale: number;
  total_cost: number;
  total_paid: number;
  currency: string;
};

// ─── Queries ───────────────────────────────────────────────────────────────────

export async function fetchTripSummary(tripId: string): Promise<TripSummary | null> {
  const { data, error } = await supabase
    .from("trips")
    .select("id, title, total_sale, total_cost, total_paid, currency")
    .eq("id", tripId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as TripSummary | null;
}

export async function fetchFinancialRecords(tripId: string): Promise<FinancialRecord[]> {
  const { data, error } = await supabase
    .from("financial_records")
    .select("*")
    .eq("trip_id", tripId)
    .order("due_date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as FinancialRecord[];
}

export async function fetchPaymentPlan(tripId: string): Promise<PaymentPlan[]> {
  const { data, error } = await supabase
    .from("payment_plans")
    .select("*, payment_installments(*)")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PaymentPlan[];
}

export async function fetchAllPaymentPlans(tripId: string): Promise<PaymentPlan[]> {
  const { data, error } = await supabase
    .from("payment_plans")
    .select("*, payment_installments(*)")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PaymentPlan[];
}

// ─── Mutations ─────────────────────────────────────────────────────────────────
// F-003: Cash flow recording delegated to record_financial_cash_flow RPC.
// Eliminates (supabase as any) casts and deduplicates register selection logic.
// See migration: 20260900000029_record_financial_cash_flow_rpc.sql

export type AddRecordPayload = {
  agencyId: string;
  tripId: string;
  type: "income" | "expense";
  category: string | null;
  description: string | null;
  amount: number;
  currency: string;
  payment_method: string | null;
  status: "pending" | "confirmed";
  due_date: string | null;
};

export async function addFinancialRecord(payload: AddRecordPayload): Promise<void> {
  const { error } = await supabase.from("financial_records").insert({
    agency_id: payload.agencyId,
    trip_id: payload.tripId,
    type: payload.type,
    category: payload.category,
    description: payload.description,
    amount: payload.amount,
    amount_brl: payload.amount,
    currency: payload.currency,
    payment_method: payload.payment_method,
    status: payload.status,
    due_date: payload.due_date,
    paid_at: payload.status === "confirmed" ? new Date().toISOString() : null,
  });
  if (error) throw new Error(error.message);

  if (payload.status === "confirmed") {
    // Record cash flow via server-side RPC (eliminates (supabase as any) pattern)
    await supabase.rpc(
      "record_financial_cash_flow" as never,
      {
        p_agency_id: payload.agencyId,
        p_trip_id: payload.tripId,
        p_amount: Number(payload.amount),
        p_type: payload.type === "income" ? "receipt" : "payment",
        p_payment_method: payload.payment_method || "pix",
        p_notes: `Lançamento manual confirmado: ${payload.description}`,
        p_installment_id: null,
      } as never,
    );
    // Non-fatal: cash flow failure doesn't roll back the financial record
  }
}

export async function confirmFinancialRecord(id: string): Promise<void> {
  const { data: rec, error: getErr } = await supabase
    .from("financial_records")
    .select("*")
    .eq("id", id)
    .single();
  if (getErr) throw new Error(getErr.message);

  if (rec.status === "confirmed") {
    throw new Error("Lançamento já está confirmado.");
  }

  const { error } = await supabase
    .from("financial_records")
    .update({ status: "confirmed", paid_at: new Date().toISOString() } as never)
    .eq("id", id);
  if (error) throw new Error(error.message);

  if (!rec.is_third_party) {
    // Record cash flow via server-side RPC (eliminates (supabase as any) pattern)
    await supabase.rpc(
      "record_financial_cash_flow" as never,
      {
        p_agency_id: rec.agency_id,
        p_trip_id: rec.trip_id,
        p_amount: Number(rec.amount),
        p_type: rec.type === "income" ? "receipt" : "payment",
        p_payment_method: rec.payment_method || "pix",
        p_notes: `Lançamento confirmado: ${rec.description}`,
        p_installment_id: null,
      } as never,
    );
    // Non-fatal: cash flow failure doesn't roll back the confirmation
  }
}

export async function cancelFinancialRecord(id: string): Promise<void> {
  const { error } = await supabase
    .from("financial_records")
    .update({ status: "cancelled" } as never)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export type CreatePlanPayload = {
  agencyId: string;
  tripId: string;
  totalAmount: number;
  installmentsCount: number;
  method: string;
  firstDueDate: string;
  isThirdParty?: boolean;
};

// F-001: Payment plan creation moved to server-side RPC.
// The old client-side implementation calculated per-installment amounts with
// Math.round() which could produce incorrect cent distributions.
// The new RPC also adds idempotency (advisory lock) and tenant verification.
// See migration: 20260900000027_create_payment_plan_rpc.sql
export async function createPaymentPlan(payload: CreatePlanPayload): Promise<void> {
  const { agencyId, tripId, totalAmount, installmentsCount, method, firstDueDate, isThirdParty } =
    payload;
  const { error } = await supabase.rpc(
    "create_payment_plan_rpc" as never,
    {
      p_trip_id: tripId,
      p_total_amount: totalAmount,
      p_installments: installmentsCount,
      p_payment_method: method,
      p_first_due_date: firstDueDate,
      p_is_third_party: isThirdParty ?? false,
      p_client_id: null,
    } as never,
  );
  if (error) throw new Error(error.message);
  // agencyId is resolved server-side from p_trip_id (tenant isolation enforced by RPC)
  void agencyId;
}

export async function markInstallmentPaid(instId: string): Promise<void> {
  const { data: inst, error: instGetErr } = await supabase
    .from("payment_installments")
    .select("*, payment_plans(*, trips(*))")
    .eq("id", instId)
    .single();
  if (instGetErr) throw new Error(instGetErr.message);

  const agencyId = (inst.payment_plans as any)?.trips?.agency_id;
  const tripId = (inst.payment_plans as any)?.trips?.id;
  const tripCode = (inst.payment_plans as any)?.trips?.code;

  if (!agencyId) throw new Error("Não foi possível encontrar a agência vinculada.");

  // Update installment status
  const { error } = await supabase
    .from("payment_installments")
    .update({ status: "paid", paid_at: new Date().toISOString() } as never)
    .eq("id", instId);
  if (error) throw new Error(error.message);

  if (!inst.is_third_party) {
    // Record cash flow via server-side RPC (F-003 — eliminates (supabase as any))
    await supabase.rpc(
      "record_financial_cash_flow" as never,
      {
        p_agency_id: agencyId,
        p_trip_id: tripId,
        p_amount: Number(inst.amount),
        p_type: "receipt",
        p_payment_method: inst.payment_method || "pix",
        p_notes: `Pagamento Parcela #${inst.number} - Viagem ${tripCode || "S/N"}`,
        p_installment_id: instId,
      } as never,
    );
    // Non-fatal: cash flow failure doesn't undo the installment status update
  }
}
