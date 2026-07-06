import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { SheetPage } from "@/components/ui/sheet";
import { Field, Input, Select } from "@/components/ui/form";
import { addFinancialRecord } from "@/services/trips";
import {
  SupplierAutocomplete,
  type SupplierOption,
} from "@/components/suppliers/SupplierAutocomplete";

const INCOME_CATEGORIES = [
  "Pacote",
  "Voo",
  "Hotel",
  "Transfer",
  "Passeio",
  "Seguro",
  "Taxa",
  "Outro",
];

const EXPENSE_CATEGORIES = [
  "Aéreo",
  "Hospedagem",
  "Transfer",
  "Passeio",
  "Guia",
  "Taxa aeroportuária",
  "Comissão",
  "Marketing",
  "Operacional",
  "Outro",
];

const PAYMENT_METHODS = [
  ["pix", "Pix"],
  ["credit_card", "Cartão crédito"],
  ["debit_card", "Cartão débito"],
  ["boleto", "Boleto"],
  ["wire", "Transferência"],
  ["cash", "Dinheiro"],
  ["check", "Cheque"],
];

const tripRecordSchema = z.object({
  category: z.string().optional(),
  amount: z.coerce.number().positive("O valor deve ser maior que zero"),
  description: z.string().min(1, "A descrição é obrigatória"),
  payment_method: z.string().optional(),
  due_date: z.string().optional(),
  status: z.enum(["pending", "confirmed"]),
});

type TripRecordFormData = z.infer<typeof tripRecordSchema>;

export function AddRecordSheet({
  isOpen,
  onClose,
  initialType,
  agencyId,
  tripId,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialType: "income" | "expense";
  agencyId: string;
  tripId: string;
  onCreated: () => void;
}) {
  const [recordType, setRecordType] = useState<"income" | "expense">(initialType);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierOption | null>(null);

  useEffect(() => {
    setRecordType(initialType);
  }, [initialType]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TripRecordFormData>({
    resolver: zodResolver(tripRecordSchema),
    defaultValues: {
      category: "",
      amount: 0,
      description: "",
      payment_method: "",
      due_date: "",
      status: "confirmed",
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        category: "",
        amount: 0,
        description: "",
        payment_method: "",
        due_date: "",
        status: "confirmed",
      });
      setSelectedSupplier(null);
    }
  }, [isOpen, recordType, reset]);

  // When supplier is selected, auto-fill description and category
  function handleSupplierSelect(supplier: SupplierOption | null) {
    setSelectedSupplier(supplier);
    if (supplier) {
      const kindToCat: Record<string, string> = {
        hotel: "Hospedagem",
        airline: "Aéreo",
        transport: "Transfer",
        tour_operator: "Passeio",
        insurance: "Outro",
        attraction: "Passeio",
        restaurant: "Outro",
        other: "Outro",
      };
      const cat = kindToCat[supplier.kind] ?? "Outro";
      setValue("description", supplier.name);
      setValue("category", cat);
    }
  }

  const onSubmit = async (data: TripRecordFormData) => {
    try {
      await addFinancialRecord({
        agencyId,
        tripId,
        type: recordType,
        category: data.category || null,
        description: data.description || null,
        amount: data.amount,
        currency: "BRL",
        payment_method: data.payment_method || null,
        status: data.status,
        due_date: data.due_date || null,
      });
      toast.success("Lançamento adicionado");
      onCreated();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao adicionar lançamento");
    }
  };

  return (
    <SheetPage
      isOpen={isOpen}
      onClose={onClose}
      title={recordType === "income" ? "Nova Receita" : "Novo Custo"}
    >
      {/* Type toggle */}
      <div className="mb-6 flex rounded-2xl border border-border p-0.5 text-xs bg-surface-alt/10">
        {(["income", "expense"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setRecordType(t)}
            className={`flex-1 rounded-full py-1.5 font-medium transition-colors cursor-pointer ${
              recordType === t
                ? "bg-primary text-primary-foreground font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "income" ? "Receita" : "Custo"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Supplier picker — only for expense records */}
        {recordType === "expense" && (
          <Field label="Fornecedor (opcional)">
            <SupplierAutocomplete
              agencyId={agencyId}
              value={selectedSupplier}
              onChange={handleSupplierSelect}
              placeholder="Buscar fornecedor cadastrado..."
            />
            {selectedSupplier?.commission_rate != null && selectedSupplier.commission_rate > 0 && (
              <p className="mt-1 text-[10px] text-green-600 font-semibold">
                ✓ Comissão de {selectedSupplier.commission_rate}% configurada neste fornecedor
              </p>
            )}
          </Field>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Categoria" error={errors.category?.message}>
            <Select {...register("category")}>
              <option value="">Selecionar…</option>
              {(recordType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Valor (R$)" error={errors.amount?.message}>
            <Input type="number" step="0.01" placeholder="0,00" {...register("amount")} />
          </Field>
        </div>
        <Field label="Descrição" error={errors.description?.message}>
          <Input placeholder="Ex: Passagem aérea GRU → LIS" {...register("description")} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Forma de pagamento" error={errors.payment_method?.message}>
            <Select {...register("payment_method")}>
              <option value="">—</option>
              {PAYMENT_METHODS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Vencimento" error={errors.due_date?.message}>
            <Input type="date" {...register("due_date")} />
          </Field>
        </div>
        <Field label="Status" error={errors.status?.message}>
          <Select {...register("status")}>
            <option value="confirmed">Confirmado/Pago</option>
            <option value="pending">Pendente</option>
          </Select>
        </Field>

        <div className="mt-8 flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 h-10 rounded-full bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60 cursor-pointer"
          >
            {isSubmitting ? "Salvando…" : "Adicionar Lançamento"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 rounded-full border border-border text-sm font-medium hover:bg-surface-alt transition-colors cursor-pointer text-foreground bg-surface"
          >
            Cancelar
          </button>
        </div>
      </form>
    </SheetPage>
  );
}
