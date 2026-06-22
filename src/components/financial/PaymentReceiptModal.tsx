import { useState, useRef, useEffect } from "react";
import { X, Printer, Download, Image as ImageIcon, ToggleLeft, ToggleRight } from "lucide-react";
import { money } from "@/components/ui/form";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    payerName: string;
    payerCpf?: string | null;
    amount: number;
    paymentMethod?: string | null;
    paymentDate?: string | null;
    tripTitle: string;
    seatNumber?: string | null;
    agencyName: string;
    agencyLogo?: string | null;
    description?: string | null;
    receiptId: string;
    agencyId: string;
    enrollmentId?: string | null;
  };
}

function fmtDate(d: string | null | undefined) {
  if (!d) return new Date().toLocaleDateString("pt-BR");
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function translatePaymentMethod(method: string | null | undefined): string {
  if (!method) return "Não informado";
  const m = method.toLowerCase();
  if (m === "pix") return "Pix";
  if (m === "credit_card" || m === "credit") return "Cartão de Crédito";
  if (m === "debit_card" || m === "debit") return "Cartão de Débito";
  if (m === "bank_transfer" || m === "transfer") return "Transferência Bancária";
  if (m === "cash") return "Dinheiro em Espécie";
  if (m === "boleto") return "Boleto Bancário";
  return method;
}

export function PaymentReceiptModal({ isOpen, onClose, data }: PaymentReceiptModalProps) {
  const [isThermal, setIsThermal] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 640;
    }
    return false;
  });
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [receiptDetails, setReceiptDetails] = useState(data);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    async function fetchOrCreateSnapshot() {
      try {
        const { data: snapshot, error } = await supabase
          .from("payment_receipt_snapshots")
          .select("*")
          .eq("receipt_id", data.receiptId)
          .maybeSingle();

        if (error) {
          console.error("Error fetching snapshot:", error);
          if (isMounted) {
            setReceiptDetails(data);
            setLoading(false);
          }
          return;
        }

        if (snapshot) {
          if (isMounted) {
            setReceiptDetails({
              payerName: snapshot.payer_name,
              payerCpf: snapshot.payer_cpf,
              amount: Number(snapshot.amount),
              paymentMethod: snapshot.payment_method,
              paymentDate: snapshot.payment_date,
              tripTitle: snapshot.trip_title,
              seatNumber: snapshot.seat_number,
              agencyName: data.agencyName,
              agencyLogo: data.agencyLogo,
              description: snapshot.description,
              receiptId: snapshot.receipt_id,
              agencyId: snapshot.agency_id,
              enrollmentId: snapshot.enrollment_id,
            });
            setLoading(false);
          }
        } else {
          if (!data.agencyId) {
            console.warn("Cannot create receipt snapshot: agencyId is missing");
            if (isMounted) {
              setReceiptDetails(data);
              setLoading(false);
            }
            return;
          }

          const newSnapshot = {
            agency_id: data.agencyId,
            enrollment_id: data.enrollmentId || null,
            receipt_id: data.receiptId,
            payer_name: data.payerName,
            payer_cpf: data.payerCpf || null,
            amount: data.amount,
            payment_method: data.paymentMethod || "pix",
            payment_date: data.paymentDate || new Date().toISOString(),
            trip_title: data.tripTitle,
            seat_number: data.seatNumber || null,
            description: data.description || null,
          };

          const { data: inserted, error: insertError } = await supabase
            .from("payment_receipt_snapshots")
            .insert(newSnapshot)
            .select()
            .single();

          if (insertError) {
            console.error("Error creating snapshot:", insertError);
            if (isMounted) {
              setReceiptDetails(data);
              setLoading(false);
            }
          } else if (inserted) {
            if (isMounted) {
              setReceiptDetails({
                payerName: inserted.payer_name,
                payerCpf: inserted.payer_cpf,
                amount: Number(inserted.amount),
                paymentMethod: inserted.payment_method,
                paymentDate: inserted.payment_date,
                tripTitle: inserted.trip_title,
                seatNumber: inserted.seat_number,
                agencyName: data.agencyName,
                agencyLogo: data.agencyLogo,
                description: inserted.description,
                receiptId: inserted.receipt_id,
                agencyId: inserted.agency_id,
                enrollmentId: inserted.enrollment_id,
              });
              setLoading(false);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load or create snapshot:", err);
        if (isMounted) {
          setReceiptDetails(data);
          setLoading(false);
        }
      }
    }

    fetchOrCreateSnapshot();

    return () => {
      isMounted = false;
    };
  }, [isOpen, data.receiptId, data]);

  if (!isOpen) return null;

  const authCode = `TOS-REC-${receiptDetails.receiptId.slice(0, 8).toUpperCase()}-${new Date(receiptDetails.paymentDate || new Date()).getFullYear()}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
    `Autenticação TravelOS: ${authCode} | Valor: ${money(receiptDetails.amount)} | Pago por: ${receiptDetails.payerName}`
  )}`;

  const handlePrint = () => {
    const printContent = receiptRef.current?.innerHTML;
    if (!printContent) return;

    const originalContent = document.body.innerHTML;
    const style = document.createElement("style");
    style.innerHTML = `
      @media print {
        body * {
          visibility: hidden;
        }
        #print-receipt-area, #print-receipt-area * {
          visibility: visible;
        }
        #print-receipt-area {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
      }
    `;

    document.head.appendChild(style);
    window.print();
    document.head.removeChild(style);
  };

  const handleDownloadPng = async () => {
    setExporting(true);
    toast.loading("Gerando imagem do recibo...", { id: "receipt-export" });
    try {
      const html2canvas = (await import("html2canvas")).default;
      const el = receiptRef.current;
      if (!el) throw new Error("Elemento não encontrado");

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const link = document.createElement("a");
      link.download = `recibo-${receiptDetails.receiptId.slice(0, 8)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Imagem baixada com sucesso!", { id: "receipt-export" });
    } catch (err: any) {
      toast.error(`Erro ao gerar imagem: ${err.message}`, { id: "receipt-export" });
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    setExporting(true);
    toast.loading("Gerando PDF do recibo...", { id: "receipt-export" });
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      
      const el = receiptRef.current;
      if (!el) throw new Error("Elemento não encontrado");

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      
      const imgWidth = isThermal ? 80 : 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: isThermal ? [80, Math.max(imgHeight + 10, 150)] : "a4",
      });

      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
      pdf.save(`recibo-${receiptDetails.receiptId.slice(0, 8)}.pdf`);
      toast.success("PDF baixado com sucesso!", { id: "receipt-export" });
    } catch (err: any) {
      toast.error(`Erro ao gerar PDF: ${err.message}`, { id: "receipt-export" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-border flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
        {/* Header Options */}
        <div className="flex items-center justify-between border-b border-border bg-slate-50 px-5 py-3.5">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Recibo de Pagamento</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Ref: {receiptDetails.receiptId.slice(0, 8).toUpperCase()}</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Layout switch */}
            <button
              onClick={() => setIsThermal(!isThermal)}
              className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <span>Layout Térmico (80mm)</span>
              {isThermal ? (
                <ToggleRight className="h-5 w-5 text-brand" />
              ) : (
                <ToggleLeft className="h-5 w-5 text-muted-foreground" />
              )}
            </button>

            <button
              onClick={onClose}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Receipt content wrapper */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-100 min-h-0 relative">
          {loading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-100/80 backdrop-blur-xs">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent"></div>
                <span className="text-xs font-semibold text-slate-600">Carregando recibo...</span>
              </div>
            </div>
          )}

          <div
            id="print-receipt-area"
            ref={receiptRef}
            className={cn(
              "bg-white shadow-sm border border-border transition-all duration-300",
              isThermal 
                ? "w-[300px] p-5 font-mono text-black leading-tight text-xs uppercase" 
                : "w-[595px] min-h-[500px] p-8 text-slate-800 flex flex-col justify-between"
            )}
          >
            {isThermal ? (
              /* THERMAL 80mm LAYOUT */
              <div className="space-y-4 text-center">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm tracking-tight">{receiptDetails.agencyName}</h4>
                  <p className="text-[10px] text-slate-700">Comprovante de Inscrição</p>
                </div>
                
                <div>--------------------------------</div>
                
                <div className="text-left space-y-1">
                  <div>Recibo: <span className="font-bold">{receiptDetails.receiptId.slice(0, 8).toUpperCase()}</span></div>
                  <div>Data: <span>{fmtDate(receiptDetails.paymentDate)}</span></div>
                </div>

                <div>--------------------------------</div>

                <div className="text-left space-y-2">
                  <div>
                    <span className="text-slate-600">Pagador:</span>
                    <div className="font-bold">{receiptDetails.payerName}</div>
                    {receiptDetails.payerCpf && <div className="text-[10px] font-mono">CPF: {receiptDetails.payerCpf}</div>}
                  </div>
                  <div>
                    <span className="text-slate-600">Referente a:</span>
                    <div className="font-bold text-xs">{receiptDetails.tripTitle}</div>
                    {receiptDetails.seatNumber && <div className="text-[10px]">Poltrona: {receiptDetails.seatNumber}</div>}
                  </div>
                </div>

                <div>--------------------------------</div>

                <div className="text-left space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>Método:</span>
                    <span>{translatePaymentMethod(receiptDetails.paymentMethod)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-sm border-t border-dashed border-black pt-1 mt-1">
                    <span>Valor Pago:</span>
                    <span>{money(receiptDetails.amount)}</span>
                  </div>
                </div>

                {receiptDetails.description && (
                  <>
                    <div>--------------------------------</div>
                    <div className="text-left text-[10px] normal-case bg-slate-50 p-1.5 rounded">
                      <span className="font-bold uppercase block text-[8px] text-slate-500 mb-0.5">Obs:</span>
                      {receiptDetails.description}
                    </div>
                  </>
                )}

                <div>--------------------------------</div>

                <div className="flex flex-col items-center justify-center space-y-2 pt-2">
                  <img src={qrUrl} alt="Autenticação" className="h-20 w-20 border border-slate-200 p-1 bg-white" />
                  <div className="text-[8px] font-mono text-slate-500 font-medium tracking-tight">
                    Autenticador Digital:<br />
                    {authCode}
                  </div>
                </div>

                <div className="pt-4 text-[9px] text-slate-500 text-center font-bold tracking-widest uppercase">
                  Obrigado por viajar conosco!
                </div>
              </div>
            ) : (
              /* PREMIUM A4 VOUCHER LAYOUT */
              <div className="h-full flex flex-col justify-between space-y-8 font-sans">
                {/* Top Brand Header */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-5">
                  <div className="flex items-center gap-3">
                    {receiptDetails.agencyLogo ? (
                      <img src={receiptDetails.agencyLogo} alt="Logo" className="h-10 w-10 object-contain rounded" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-sm font-black text-white">
                        {receiptDetails.agencyName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 leading-tight">{receiptDetails.agencyName}</h4>
                      <span className="text-[10px] text-muted-foreground font-semibold">Agência Credenciada</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <h5 className="text-xs font-black text-slate-900 tracking-wider uppercase">Recibo de Pagamento</h5>
                    <div className="font-mono text-[10px] text-slate-400 mt-1">Nº {receiptDetails.receiptId.slice(0, 8).toUpperCase()}</div>
                  </div>
                </div>

                {/* Amount / Value showcase block */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Valor Recebido</span>
                    <strong className="text-2xl font-mono text-slate-900 mt-1 block">{money(receiptDetails.amount)}</strong>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-slate-400 font-bold block">Status do Pagamento</span>
                    <span className="inline-block bg-emerald-500/10 text-emerald-600 font-extrabold text-[9px] uppercase px-2 py-0.5 rounded border border-emerald-500/20 mt-1">
                       Confirmado / Quitado
                    </span>
                  </div>
                </div>

                {/* Core transaction fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-xs pt-2">
                  <div className="space-y-1">
                    <span className="text-slate-400 font-semibold block">Nome do Beneficiário / Pagador</span>
                    <strong className="text-slate-800 block text-xs">{receiptDetails.payerName}</strong>
                    {receiptDetails.payerCpf && <span className="text-[10px] font-mono text-slate-500">CPF: {receiptDetails.payerCpf}</span>}
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 font-semibold block">Viagem / Roteiro da Excursão</span>
                    <strong className="text-slate-800 block text-xs">{receiptDetails.tripTitle}</strong>
                    {receiptDetails.seatNumber && <span className="text-[10px] text-slate-500 font-medium">Poltrona Reservada: {receiptDetails.seatNumber}</span>}
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 font-semibold block">Método de Liquidação</span>
                    <strong className="text-slate-800 block text-xs">{translatePaymentMethod(receiptDetails.paymentMethod)}</strong>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 font-semibold block">Data e Hora do Pagamento</span>
                    <strong className="text-slate-800 block text-xs">{fmtDate(receiptDetails.paymentDate)}</strong>
                  </div>
                </div>

                {receiptDetails.description && (
                  <div className="border border-slate-100 bg-slate-50/50 rounded-xl p-4 text-[11px] text-slate-600 leading-relaxed">
                    <strong className="text-slate-800 block font-semibold mb-1 text-[10px] uppercase">Observações do Agente</strong>
                    {receiptDetails.description}
                  </div>
                )}

                {/* Footer Validation block */}
                <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img src={qrUrl} alt="Autenticação" className="h-14 w-14 border border-slate-200 p-1 bg-white" />
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Autenticação de Transação</span>
                      <code className="text-[10px] font-mono text-slate-600 block mt-0.5">{authCode}</code>
                      <span className="text-[9px] text-muted-foreground block font-medium mt-0.5">Assinado digitalmente por TravelOS</span>
                    </div>
                  </div>

                  {/* Sign field */}
                  <div className="text-center w-48 border-t border-slate-300 pt-1.5 mt-4 sm:mt-0">
                    <span className="text-[10px] font-semibold text-slate-500 block">Assinatura Operacional</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">{receiptDetails.agencyName}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls footer */}
        <div className="border-t border-border bg-slate-50 px-5 py-3 flex flex-wrap gap-2 justify-end">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 h-8 px-3.5 rounded-md border border-border bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" /> Imprimir Recibo
          </button>
          
          <button
            onClick={handleDownloadPdf}
            disabled={exporting}
            className="flex items-center gap-1.5 h-8 px-3.5 rounded-md border border-border bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> Baixar PDF
          </button>

          <button
            onClick={handleDownloadPng}
            disabled={exporting}
            className="flex items-center gap-1.5 h-8 px-3.5 rounded-md border border-border bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
          >
            <ImageIcon className="h-3.5 w-3.5" /> Salvar Imagem
          </button>
        </div>
      </div>
    </div>
  );
}
