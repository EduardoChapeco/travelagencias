import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CancelModalProps {
  cancelReason: string;
  onReasonChange: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function CancelModal({
  cancelReason,
  onReasonChange,
  onClose,
  onConfirm,
  isPending,
}: CancelModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-surface animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-danger p-6 text-center text-danger-foreground shrink-0">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-90" />
          <h3 className="text-xl font-black tracking-tight">Solicitação de Cancelamento</h3>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-danger/10 border border-danger/20 rounded-2xl p-4">
            <p className="text-xs text-danger font-medium leading-relaxed">
              <strong>Atenção:</strong> O cancelamento da viagem está sujeito às políticas de quebra
              de contrato, multas de fornecedores e da operadora. Ao prosseguir, um ticket de nível
              de emergência será gerado para seu consultor, que entrará em contato para apresentar
              as condições de reembolso.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Motivo do Cancelamento
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => onReasonChange(e.target.value)}
              className="w-full rounded-2xl border border-border bg-background p-4 text-sm resize-none h-24 focus:ring-1 focus:ring-danger focus:border-danger outline-none"
              placeholder="Por favor, explique o motivo..."
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={onClose}
              className="flex-1 h-12 rounded-full border border-border font-bold text-sm hover:bg-muted transition-colors"
            >
              Voltar
            </Button>
            <Button
              onClick={onConfirm}
              disabled={!cancelReason || isPending}
              className="flex-1 h-12 rounded-full bg-danger text-danger-foreground font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isPending ? "Enviando..." : "Solicitar Cancelamento"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
