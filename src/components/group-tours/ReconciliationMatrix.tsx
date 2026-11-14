import React, { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/formatters";
import { Check, UploadCloud, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PaymentReceiptModal } from "@/components/financial/PaymentReceiptModal";

interface Installment {
  id: string;
  number: number;
  amount: number;
  due_date: string;
  status: string;
  paid_at: string | null;
  payment_plan_id: string;
}

interface Enrollment {
  id: string;
  passenger_name: string;
  payment_plan_id: string | null;
  installments?: Installment[];
}

export function ReconciliationMatrix({ tourId, agencyId }: { tourId: string; agencyId: string }) {
  const qc = useQueryClient();
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedInst, setSelectedInst] = useState<Installment | null>(null);

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ["group-reconciliation", tourId],
    queryFn: async () => {
      const { data: enrolls, error: e1 } = await supabase
        .from("group_tour_enrollments")
        .select("id, passenger_name, payment_plan_id")
        .eq("group_tour_id", tourId)
        .order("created_at");

      if (e1) throw e1;
      
      const planIds = (enrolls || []).map((e: any) => e.payment_plan_id).filter(Boolean);
      
      let installments: Installment[] = [];
      if (planIds.length > 0) {
        const { data: insts, error: e2 } = await supabase
          .from("payment_installments")
          .select("id, number, amount, due_date, status, paid_at, payment_plan_id")
          .in("payment_plan_id", planIds)
          .order("number");
        if (e2) throw e2;
        installments = (insts || []) as Installment[];
      }

      return (enrolls || []).map((en: any) => ({
        ...en,
        installments: installments.filter((i: any) => i.payment_plan_id === en.payment_plan_id)
      }));
    },
  });

  const payMut = useMutation({
    mutationFn: async (inst: Installment) => {
      // 1. Mark installment as paid
      const { error } = await supabase
        .from("payment_installments")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_method: "transfer",
        })
        .eq("id", inst.id);
      
      if (error) throw error;

      // 2. Sync to financial_transactions (global agency ledger)
      // cash_register_id is nullable on financial_transactions — OK for group payments
      const { error: fErr } = await supabase.from("financial_transactions").insert({
        agency_id: agencyId,
        amount: inst.amount,
        type: "income",           // lowercase per schema enum
        payment_method: "transfer", // lowercase per schema enum  
        notes: `Parcela ${inst.number} de grupo — baixada via Matriz de Conciliação`,
        transaction_date: new Date().toISOString(),
      });
      if (fErr) console.warn("[ReconciliationMatrix] Failed to sync financial_transactions:", fErr.message);
    },
    onSuccess: () => {
      toast.success("Parcela baixada e sincronizada com o Caixa!");
      qc.invalidateQueries({ queryKey: ["group-reconciliation", tourId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handlePay = (inst: Installment) => {
    if (confirm("Confirmar baixa dessa parcela? Isso lançará o valor no Caixa Global da Agência.")) {
      payMut.mutate(inst);
    }
  };

  const handleReceipt = (inst: Installment) => {
    setSelectedInst(inst);
    setReceiptModalOpen(true);
  };

  if (isLoading) return <div className="p-8 text-center text-xs text-muted-foreground">Carregando matriz...</div>;

  const maxInsts = Math.max(...(enrollments || []).map(e => e.installments?.length || 0), 1);
  const cols = Array.from({ length: maxInsts }, (_, i) => i + 1);

  return (
    <div className="bg-white border border-border rounded-[var(--radius-card)] overflow-hidden font-sans shadow-sm mt-6">
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-foreground">Matriz de Conciliação Financeira</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">Sincronizado automaticamente com o Caixa Global.</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr className="bg-muted/50 border-b border-border text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              <th className="py-2.5 px-4 font-semibold w-[250px] sticky left-0 bg-muted/50 z-10 border-r border-border">Passageiro</th>
              {cols.map(c => (
                <th key={c} className="py-2.5 px-4 font-semibold text-center w-[160px]">Parcela {c}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {enrollments?.length === 0 && (
              <tr>
                <td colSpan={cols.length + 1} className="py-8 text-center text-muted-foreground text-xs italic">
                  Nenhum passageiro inscrito.
                </td>
              </tr>
            )}
            {enrollments?.map((en) => (
              <tr key={en.id} className="hover:bg-muted/10 group">
                <td className="py-3 px-4 font-medium text-foreground sticky left-0 bg-white group-hover:bg-muted/5 border-r border-border z-10">
                  <div>{en.passenger_name}</div>
                  {!en.payment_plan_id && (
                    <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                      Roteado para Operadora
                    </span>
                  )}
                </td>
                {cols.map(c => {
                  if (!en.payment_plan_id) {
                    // Passenger routed to operator — no installments managed here
                    return c === 1 ? (
                      <td key={c} colSpan={cols.length} className="py-2 px-4 text-[10px] text-muted-foreground italic border-r border-border/30">
                        Parcelas gerenciadas pela operadora
                      </td>
                    ) : null;
                  }
                  const inst = en.installments?.find((i: any) => i.number === c);
                  if (!inst) return <td key={c} className="py-3 px-4 bg-muted/5 border-r border-border/50"></td>;

                  const isPaid = inst.status === "paid" || inst.paid_at;
                  
                  return (
                    <td key={c} className="py-2 px-2 border-r border-border/50">
                      <div className={`p-2 rounded border ${isPaid ? 'bg-green-50/50 border-green-200' : 'bg-background border-border'} text-center flex flex-col items-center justify-center gap-1.5 h-full min-h-[68px]`}>
                        <span className={`font-mono text-xs font-semibold ${isPaid ? 'text-green-700' : 'text-foreground'}`}>
                          {formatCurrency(inst.amount)}
                        </span>
                        
                        {isPaid ? (
                          <div className="flex items-center gap-1 text-[9px] font-bold text-green-700 uppercase bg-green-100 px-1.5 py-0.5 rounded">
                            <Check className="w-3 h-3" /> Pago
                          </div>
                        ) : (
                          <div className="flex gap-1 mt-1">
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[9px] font-bold text-green-600 border-green-200 hover:bg-green-50" onClick={() => handlePay(inst)} title="Dar Baixa">
                              Baixar
                            </Button>
                            <Button size="icon" variant="outline" className="h-6 w-6 text-muted-foreground hover:bg-muted" onClick={() => handleReceipt(inst)} title="Anexar Comprovante">
                              <UploadCloud className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {receiptModalOpen && selectedInst && (
        <PaymentReceiptModal
          isOpen={receiptModalOpen}
          onClose={() => {
            setReceiptModalOpen(false);
            qc.invalidateQueries({ queryKey: ["group-reconciliation", tourId] });
          }}
          data={{
            payerName: "Passageiro",
            amount: selectedInst.amount,
            tripTitle: "Excursão",
            agencyName: "Agência",
            receiptId: selectedInst.id,
            agencyId,
          }}
        />
      )}
    </div>
  );
}
