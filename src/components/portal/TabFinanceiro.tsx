import { AlertCircle, CreditCard, CheckCircle, Clock } from "lucide-react";
import { fmtDate, money } from "@/components/ui/form";
import { AppWidget } from "@/components/portal/TripPortalShared";
import { toast } from "sonner";
import { handleViewReceipt } from "@/utils/storage-helper";

interface TabFinanceiroProps {
  trip: any;
  installments: any[];
  isOperator: boolean;
  outstanding: number;
  uploadReceiptPending: boolean;
  onUploadReceipt: (instId: string, file: File) => void;
}

const INST_STATUS: Record<string, string> = {
  paid: "Pago",
  pending: "Pendente",
  late: "Atrasado",
  waived: "Isento",
};

export function TabFinanceiro({
  trip,
  installments,
  isOperator,
  outstanding,
  uploadReceiptPending,
  onUploadReceipt,
}: TabFinanceiroProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {isOperator && (
        <div className="bg-warning/10 border border-warning/30 rounded-3xl p-6 flex gap-4 items-start">
          <AlertCircle className="w-6 h-6 text-warning shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-warning mb-1">
              Viagem operada por matriz externa ({trip.operator})
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Os pagamentos desta viagem são processados diretamente pela operadora parceira. Seus
              boletos ou links de pagamento serão enviados via WhatsApp e E-mail nas proximidades do
              vencimento. Acompanhe a timeline abaixo para conferir o status.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Summary card */}
        <div className="md:col-span-1">
          <div className="bg-foreground rounded-3xl p-6 text-background">
            <h3 className="text-xs font-bold uppercase tracking-widest text-background/50 mb-2">
              Valor do Pacote
            </h3>
            <div className="text-3xl font-black tracking-tight mb-6">
              {money(trip.total_sale, trip.currency)}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-white/10 p-3 rounded-[24px]">
                <span className="text-xs font-medium">Pago</span>
                <span className="text-sm font-bold text-success">
                  {money(trip.total_paid ?? 0, trip.currency)}
                </span>
              </div>
              <div className="flex justify-between items-center bg-white/10 p-3 rounded-[24px] border border-warning/30">
                <span className="text-xs font-medium">Pendente</span>
                <span className="text-sm font-black text-warning">
                  {money(outstanding, trip.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Installments list */}
        <div className="md:col-span-2">
          <AppWidget
            title="Jornada de Pagamentos"
            icon={<CreditCard className="w-5 h-5 text-success" />}
          >
            <div className="space-y-3">
              {installments.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  Nenhum plano de pagamento registrado.
                </div>
              ) : (
                installments.map((inst: any) => (
                  <div
                    key={inst.id}
                    className="flex flex-col rounded-2xl border border-border bg-surface p-4 gap-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-full ${
                            inst.status === "paid"
                              ? " bg-success-bg text-success"
                              : inst.status === "late"
                                ? " bg-danger-bg text-danger"
                                : " bg-surface-alt text-muted-foreground"
                          }`}
                        >
                          {inst.status === "paid" ? (
                            <CheckCircle className="h-6 w-6" />
                          ) : inst.status === "late" ? (
                            <AlertCircle className="h-6 w-6" />
                          ) : (
                            <Clock className="h-6 w-6" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-foreground">
                            Parcela {inst.number}
                          </div>
                          <div className="text-xs font-medium text-muted-foreground mt-0.5">
                            Vencimento: {fmtDate(inst.due_date)}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto border-t sm:border-0 border-border/50 pt-3 sm:pt-0">
                        <div className="text-left sm:text-right flex items-center sm:items-end justify-between sm:flex-col sm:justify-start w-full gap-2">
                          <div>
                            <div className="text-base font-black text-foreground">
                              {money(inst.amount, trip.currency)}
                            </div>
                            <div
                              className={`text-[10px] uppercase font-bold tracking-wider ${
                                inst.status === "paid"
                                  ? " text-success"
                                  : inst.status === "late"
                                    ? " text-danger"
                                    : " text-muted-foreground"
                              }`}
                            >
                              {INST_STATUS[inst.status] ?? inst.status}
                            </div>
                          </div>
                          {inst.status !== "paid" && (inst.boleto_url || inst.barcode) && (
                            <a
                              href={inst.boleto_url || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => {
                                if (!inst.boleto_url && inst.barcode) {
                                  e.preventDefault();
                                  navigator.clipboard.writeText(inst.barcode);
                                  toast.success("Código de barras copiado!");
                                }
                              }}
                              className="h-8 rounded bg-foreground text-background text-xs font-bold px-3 py-1 flex items-center justify-center hover:opacity-90 transition-opacity"
                            >
                              {inst.boleto_url ? "Ver Boleto" : "Copiar Linha Digitável"}
                            </a>
                          )}
                        </div>

                        {!isOperator &&
                          inst.status !== "paid" &&
                          !inst.boleto_url &&
                          !inst.barcode && (
                            <div className="flex gap-2">
                              <label className="h-8 rounded border border-border bg-surface text-foreground text-xs font-bold px-3 py-1.5 flex items-center justify-center hover:bg-surface-alt transition-colors cursor-pointer">
                                {uploadReceiptPending ? "Enviando..." : "Enviar Comprovante"}
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  className="hidden"
                                  disabled={uploadReceiptPending}
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                      onUploadReceipt(inst.id, e.target.files[0]);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          )}
                      </div>
                    </div>

                    {/* Receipt status messages */}
                    {inst.status !== "paid" &&
                      inst.receipt_status &&
                      inst.receipt_status !== "none" && (
                        <div className="border-t border-border/40 pt-3">
                          {inst.receipt_status === "pending" && (
                            <div className="text-xs text-amber-700 bg-amber-500/10 border border-amber-500/20 rounded-[24px] px-3 py-2 flex items-center gap-2">
                              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                              <div>
                                <span className="font-bold">Comprovante enviado!</span> Aguardando
                                conciliação da agência.
                                {inst.receipt_url && (
                                  <button
                                    onClick={() => handleViewReceipt(inst.receipt_url)}
                                    className="text-brand font-bold underline ml-1.5 inline-block bg-transparent border-0 p-0 cursor-pointer"
                                  >
                                    Visualizar Arquivo
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                          {inst.receipt_status === "rejected" && (
                            <div className="text-xs text-rose-700 bg-rose-500/10 border border-rose-500/20 rounded-[24px] px-3 py-2 flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold">Comprovante Recusado:</span>{" "}
                                {inst.rejection_reason || "Verifique o arquivo e reenvie."}
                                <label className="text-brand font-bold underline ml-1.5 cursor-pointer block mt-1">
                                  Tentar Novamente
                                  <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    className="hidden"
                                    disabled={uploadReceiptPending}
                                    onChange={(e) => {
                                      if (e.target.files?.[0]) {
                                        onUploadReceipt(inst.id, e.target.files[0]);
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                ))
              )}
            </div>
          </AppWidget>
        </div>
      </div>
    </div>
  );
}
