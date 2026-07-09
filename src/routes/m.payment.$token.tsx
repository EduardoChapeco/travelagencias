import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  fetchPublicContractByToken,
  fetchPublicInstallmentsByToken,
  type PublicInstallment as Installment,
} from "@/services/payment";
import { Copy, CheckCircle2, AlertCircle, CreditCard, ExternalLink, QrCode } from "lucide-react";
import { toast } from "sonner";
import { PrimaryButton, Sheet } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/m/payment/$token")({
  head: ({ context }: any) => ({ meta: [{ title: `Meu Carnê Digital · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: Page,
});

// Tipagem importada do serviço

// Como é uma rota pública, em produção ela chamará um RPC (como o do contrato).
// Mas para esta implementação da Fase D, faremos a busca da tabela (supondo política ajustada ou uso de um ID ofuscado)
function Page() {
  const { token } = Route.useParams();
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInst, setSelectedInst] = useState<Installment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [agencyId, setAgencyId] = useState<string | null>(null);

  const handleUploadReceipt = async (instId: string, file: File) => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      if (!agencyId) throw new Error("ID da agência não carregado.");
      const filePath = `${agencyId}/${token}/${instId}_${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("payment-receipts")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: rpcError } = await supabase.rpc("confirm_payment_with_token", {
        _token: token,
        _payment_method: "pix",
        _receipt_url: uploadData.path,
      });

      if (rpcError) throw rpcError;

      toast.success("Comprovante enviado com sucesso!");

      setInstallments((prev) =>
        prev.map((inst) => {
          if (inst.id === instId) {
            return {
              ...inst,
              status: "paid" as const,
              paid_at: new Date().toISOString(),
              payment_method: "pix",
            };
          }
          return inst;
        }),
      );

      setSelectedInst(null);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao enviar comprovante: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    // Agora o sistema está 100% livre de Mocks. Consumimos a Stored Procedure RPC "public_installments_by_token"
    // Esta função contorna o RLS das tabelas de pagamento para permitir que clientes anônimos visualizem seus boletos via token do convite.
    const fetchInstallments = async () => {
      try {
        const contractData = await fetchPublicContractByToken(token);
        if (!contractData || contractData.length === 0) {
          setErr("Pacote não encontrado ou Token inválido.");
          setIsLoading(false);
          return;
        }

        setAgencyId(contractData[0]?.agency_id || null);

        const paymentData = await fetchPublicInstallmentsByToken(token);
        setInstallments(paymentData);
      } catch (payErr) {
        setErr("Erro ao buscar carnê digital.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInstallments();
  }, [token]);

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  }

  if (isLoading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  if (err)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="rounded-[var(--radius-card)] border-none glass-card border-none p-8 text-center text-danger font-bold uppercase tracking-widest">
          {err}
        </div>
      </div>
    );

  const totalPaid = installments
    .filter((i) => i.status === "paid")
    .reduce((acc, curr) => acc + curr.amount, 0);
  const totalDue = installments
    .filter((i) => i.status !== "paid" && i.status !== "cancelled")
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background px-4 py-8 md:py-12">
      <header className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[var(--radius-card)] glass-card border-none  ring-1 ring-border/50">
          <CreditCard className="h-6 w-6 text-brand" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Seu Carnê Digital</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Acompanhe e pague as parcelas da sua viagem.
        </p>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-4">
        <div className="rounded-[var(--radius-card)] border-none/50 glass-card border-none p-5 text-center ">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Total Pago
          </div>
          <div className="mt-2 text-lg font-bold text-success">
            {totalPaid.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </div>
        </div>
        <div className="rounded-[var(--radius-card)] border-none/50 glass-card border-none p-5 text-center ">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Restante
          </div>
          <div className="mt-2 text-lg font-bold text-foreground">
            {totalDue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </div>
        </div>
      </section>

      <section className="space-y-4 relative before:absolute before:inset-0 before:ml-[1.4rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-border/60">
        {installments.map((inst, index) => {
          const isPaid = inst.status === "paid";
          const isOverdue = inst.status === "overdue";

          return (
            <div
              key={inst.id}
              className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group cursor-pointer"
              onClick={() => !isPaid && setSelectedInst(inst)}
            >
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full  ring-4 ring-background md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${isPaid ? "bg-success text-white" : isOverdue ? "bg-danger text-white" : "glass-card border-none border-none text-brand"}`}
              >
                {isPaid ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : isOverdue ? (
                  <AlertCircle className="h-3.5 w-3.5" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-brand" />
                )}
              </div>

              <div
                className={`w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] rounded-[var(--radius-card)] border glass-card border-none p-4  transition-all hover: ${isPaid ? "border-success/30 bg-success/5" : isOverdue ? "border-danger/40 bg-danger/5" : "border-border/50 hover:border-brand/40"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Parcela {index + 1}
                  </div>
                  {isPaid ? (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-success">
                      Quitada
                    </span>
                  ) : (
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest ${isOverdue ? "text-danger" : "text-warning"}`}
                    >
                      {isOverdue ? "Atrasada" : "Pendente"}
                    </span>
                  )}
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-lg font-bold text-foreground">
                      {inst.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </div>
                    <div className="text-[11px] font-medium text-muted-foreground mt-0.5">
                      Vence em: {new Date(inst.due_date).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  {!isPaid && (
                    <button className="flex h-8 w-8 items-center justify-center rounded-full glass bg-white/5 border-white/10 text-brand transition-colors hover:bg-brand hover:text-white">
                      <QrCode className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {selectedInst && (
        <Sheet onClose={() => setSelectedInst(null)} title="Pagamento">
          <div className="p-6">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full glass bg-white/5 border-white/10 text-brand">
                <QrCode className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                {selectedInst.amount.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </h2>
              <p className="text-sm font-medium text-muted-foreground mt-1">
                Vencimento: {new Date(selectedInst.due_date).toLocaleDateString("pt-BR")}
              </p>
            </div>

            <div className="space-y-4">
              {selectedInst.payment_method === "pix" && selectedInst.external_link ? (
                <div className="rounded-[var(--radius-card)] border-none/50 glass bg-white/5 border-white/10/30 p-5 text-center">
                  <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    PIX Copia e Cola
                  </div>
                  <div className="break-all rounded-full glass-card border-none p-3 font-mono text-[10px] text-foreground ring-1 ring-border ">
                    {selectedInst.external_link}
                  </div>
                  <PrimaryButton
                    onClick={() => copyToClipboard(selectedInst.external_link!)}
                    className="mt-4 w-full gap-2"
                  >
                    <Copy className="h-4 w-4" /> Copiar Código
                  </PrimaryButton>

                  <div className="mt-6 border-t border-border/50 pt-4 text-left">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Enviar Comprovante de Pagamento
                    </label>
                    <div className="space-y-2">
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-[var(--radius-card)] p-4 glass-card border-none hover:glass bg-white/5 border-white/10 transition-colors cursor-pointer text-center">
                        <span className="text-xs font-bold text-brand">
                          {isUploading ? "Enviando..." : "Selecionar Comprovante (Imagem/PDF)"}
                        </span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          disabled={isUploading}
                          onChange={async (e) => {
                            if (e.target.files?.[0]) {
                              await handleUploadReceipt(selectedInst.id, e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ) : selectedInst.payment_method === "credit_card" && selectedInst.external_link ? (
                <div className="rounded-[var(--radius-card)] border-none/50 glass bg-white/5 border-white/10/30 p-5 text-center">
                  <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Pagamento via Cartão
                  </div>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Você será redirecionado para o ambiente seguro do banco.
                  </p>
                  <PrimaryButton
                    onClick={() => window.open(selectedInst.external_link!, "_blank")}
                    className="w-full gap-2"
                  >
                    <ExternalLink className="h-4 w-4" /> Acessar Link Seguro
                  </PrimaryButton>
                </div>
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  Método de pagamento não configurado ou boleto pendente de emissão.
                </div>
              )}
            </div>
          </div>
        </Sheet>
      )}
    </div>
  );
}
