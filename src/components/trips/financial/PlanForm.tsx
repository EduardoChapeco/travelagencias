import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Field, Input, Select } from "@/components/ui/form";
import { createPaymentPlan } from "@/services/trips";

const PAYMENT_METHODS = [
  ["pix", "Pix"],
  ["credit_card", "Cartão crédito"],
  ["debit_card", "Cartão débito"],
  ["boleto", "Boleto"],
  ["wire", "Transferência"],
  ["cash", "Dinheiro"],
  ["check", "Cheque"],
];

const paymentPlanSchema = z.object({
  total_amount: z.coerce.number().positive("O valor total deve ser maior que zero"),
  installments: z.coerce.number().int().min(1).max(24),
  method: z.string(),
  first_due: z.string().min(1, "A data do primeiro vencimento é obrigatória"),
  is_third_party: z.boolean(),
});

type PaymentPlanFormData = z.infer<typeof paymentPlanSchema>;

export function PlanForm({
  agencyId,
  tripId,
  totalSale,
  onCreated,
  onCancel,
}: {
  agencyId: string;
  tripId: string;
  totalSale: number;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PaymentPlanFormData>({
    resolver: zodResolver(paymentPlanSchema),
    defaultValues: {
      total_amount: totalSale || 0,
      installments: 1,
      method: "pix",
      first_due: "",
      is_third_party: false,
    },
  });

  const onSubmit = async (data: PaymentPlanFormData) => {
    try {
      await createPaymentPlan({
        agencyId,
        tripId,
        totalAmount: data.total_amount,
        installmentsCount: data.installments,
        method: data.method,
        firstDueDate: data.first_due,
        isThirdParty: data.is_third_party,
      });
      toast.success("Plano de parcelamento criado");
      onCreated();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar plano");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-4 rounded-lg border border-border p-4 space-y-3 bg-surface"
    >
      <h3 className="text-sm font-semibold text-foreground">Novo plano de parcelamento</h3>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor total (R$)" error={errors.total_amount?.message}>
          <Input
            type="number"
            step="0.01"
            placeholder={String(totalSale ?? "")}
            {...register("total_amount")}
          />
        </Field>
        <Field label="Número de parcelas" error={errors.installments?.message}>
          <Select {...register("installments")}>
            {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}x
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Forma de pagamento" error={errors.method?.message}>
          <Select {...register("method")}>
            {PAYMENT_METHODS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Vencimento 1ª parcela" error={errors.first_due?.message}>
          <Input type="date" {...register("first_due")} />
        </Field>
      </div>
      <div className="flex items-center gap-2 mt-2 px-1">
        <input
          type="checkbox"
          id="is_third_party"
          {...register("is_third_party")}
          className="rounded border-input text-primary focus:ring-primary"
        />
        <label
          htmlFor="is_third_party"
          className="text-xs font-medium text-foreground cursor-pointer"
        >
          Faturamento via Operadora (Boleto/Pagamento externo via terceiros)
        </label>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-8 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-60 cursor-pointer"
        >
          {isSubmitting ? "Criando…" : "Criar plano"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-8 rounded-md border border-border px-4 text-xs cursor-pointer text-foreground bg-surface"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
