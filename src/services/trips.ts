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
  const { data, error } = await (
    supabase.from("payment_plans").select("*, payment_installments(*)") as any
  )
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PaymentPlan[];
}

export async function fetchAllPaymentPlans(tripId: string): Promise<PaymentPlan[]> {
  const { data, error } = await (
    supabase.from("payment_plans").select("*, payment_installments(*)") as any
  )
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PaymentPlan[];
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

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
    const { data: registers } = await supabase
      .from("cash_registers")
      .select("*")
      .eq("agency_id", payload.agencyId)
      .eq("is_active", true);

    if (registers && registers.length > 0) {
      const physicalIds = registers.filter((r: any) => r.type === "physical").map((r: any) => r.id);
      let targetRegId = "";
      let targetSessId = "";

      if (physicalIds.length > 0) {
        const { data: session } = await supabase
          .from("cash_sessions")
          .select("*")
          .in("cash_register_id", physicalIds)
          .eq("status", "open")
          .limit(1)
          .maybeSingle();
        if (session) {
          targetRegId = session.cash_register_id;
          targetSessId = session.id;
        }
      }

      if (!targetRegId) {
        const bank = registers.find((r: any) => r.type === "bank_account");
        if (bank) {
          targetRegId = bank.id;
        } else {
          targetRegId = registers[0].id;
        }
      }

      await (supabase as any).from("cash_transactions").insert({
        agency_id: payload.agencyId,
        cash_register_id: targetRegId,
        cash_session_id: targetSessId || null,
        trip_id: payload.tripId,
        amount: Number(payload.amount),
        type: payload.type === "income" ? "receipt" : "payment",
        payment_method: payload.payment_method || "pix",
        notes: `Lançamento manual confirmado: ${payload.description}`,
        transaction_date: new Date().toISOString(),
      });
    }
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

  const { data: registers } = await supabase
    .from("cash_registers")
    .select("*")
    .eq("agency_id", rec.agency_id)
    .eq("is_active", true);

  if (!rec.is_third_party && registers && registers.length > 0) {
    const physicalIds = registers.filter((r: any) => r.type === "physical").map((r: any) => r.id);
    let targetRegId = "";
    let targetSessId = "";

    if (physicalIds.length > 0) {
      const { data: session } = await supabase
        .from("cash_sessions")
        .select("*")
        .in("cash_register_id", physicalIds)
        .eq("status", "open")
        .limit(1)
        .maybeSingle();
      if (session) {
        targetRegId = session.cash_register_id;
        targetSessId = session.id;
      }
    }

    if (!targetRegId) {
      const bank = registers.find((r: any) => r.type === "bank_account");
      if (bank) {
        targetRegId = bank.id;
      } else {
        targetRegId = registers[0].id;
      }
    }

    await (supabase as any).from("cash_transactions").insert({
      agency_id: rec.agency_id,
      cash_register_id: targetRegId,
      cash_session_id: targetSessId || null,
      trip_id: rec.trip_id,
      amount: Number(rec.amount),
      type: rec.type === "income" ? "receipt" : "payment",
      payment_method: rec.payment_method || "pix",
      notes: `Lançamento manual confirmado: ${rec.description}`,
      transaction_date: new Date().toISOString(),
    });
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

export async function createPaymentPlan(payload: CreatePlanPayload): Promise<void> {
  const {
    agencyId,
    tripId,
    totalAmount,
    installmentsCount: n,
    method,
    firstDueDate,
    isThirdParty,
  } = payload;
  const per = Math.round((totalAmount / n) * 100) / 100;
  const firstDue = new Date(firstDueDate);

  const { data: plan, error: planErr } = await supabase
    .from("payment_plans")
    .insert({ agency_id: agencyId, trip_id: tripId, total_amount: totalAmount, status: "active" })
    .select("id")
    .single();
  if (planErr) throw new Error(planErr.message);

  const installments = Array.from({ length: n }, (_, i) => {
    const due = new Date(firstDue);
    due.setMonth(due.getMonth() + i);
    return {
      payment_plan_id: plan.id,
      agency_id: agencyId,
      number: i + 1,
      due_date: due.toISOString().slice(0, 10),
      amount: i === n - 1 ? Math.round((totalAmount - per * (n - 1)) * 100) / 100 : per,
      status: "pending" as const,
      payment_method: method,
      is_third_party: isThirdParty || false,
    };
  });

  const { error: instErr } = await supabase.from("payment_installments").insert(installments);
  if (instErr) throw new Error(instErr.message);
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

  // Update status
  const { error } = await supabase
    .from("payment_installments")
    .update({ status: "paid", paid_at: new Date().toISOString() } as never)
    .eq("id", instId);
  if (error) throw new Error(error.message);

  // Find active cash session or bank account to register the cash flow
  const { data: registers } = await supabase
    .from("cash_registers")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("is_active", true);

  if (!inst.is_third_party && registers && registers.length > 0) {
    const physicalIds = registers.filter((r: any) => r.type === "physical").map((r: any) => r.id);
    let targetRegId = "";
    let targetSessId = "";

    if (physicalIds.length > 0) {
      const { data: session } = await supabase
        .from("cash_sessions")
        .select("*")
        .in("cash_register_id", physicalIds)
        .eq("status", "open")
        .limit(1)
        .maybeSingle();
      if (session) {
        targetRegId = session.cash_register_id;
        targetSessId = session.id;
      }
    }

    if (!targetRegId) {
      const bank = registers.find((r: any) => r.type === "bank_account");
      if (bank) {
        targetRegId = bank.id;
      } else {
        targetRegId = registers[0].id;
      }
    }

    const { error: txErr } = await supabase
      .from("cash_transactions")
      .insert({
        agency_id: agencyId,
        cash_register_id: targetRegId,
        cash_session_id: targetSessId || null,
        trip_id: tripId,
        payment_installment_id: instId,
        amount: Number(inst.amount),
        type: "receipt",
        payment_method: inst.payment_method || "pix",
        notes: `Pagamento Parcela #${inst.number} - Viagem ${tripCode || "S/N"}`,
        transaction_date: new Date().toISOString()
      } as any);
    if (txErr) {
      console.warn("Could not record cash transaction:", txErr.message);
    }
  }
}
