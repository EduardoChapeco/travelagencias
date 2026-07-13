import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, X, Loader2, Sparkles, User, Calendar, DollarSign, FileText } from "lucide-react";
import { executeAIChatAction } from "@/lib/ai/ActionExecutor";
import { ActionRegistry } from "@/lib/ai/ActionRegistry";
import { useAgency } from "@/lib/agency-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ─────────────────────────────────────────────────────────────────────────────
// Lead Card Component
// ─────────────────────────────────────────────────────────────────────────────
export function LeadCard({ data }: { data: any }) {
  return (
    <div className="mt-2 rounded-full border border-border bg-surface-alt p-3 shadow-xs">
      <div className="flex items-center gap-2 border-b border-border/60 pb-1.5 mb-2">
        <User className="h-4 w-4 text-brand" />
        <span className="text-xs font-bold text-foreground">Lead Capturado</span>
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
        <div>
          <span className="ds-meta text-muted-foreground block uppercase">Nome</span>
          <span className="font-medium text-foreground truncate block">{data.name}</span>
        </div>
        <div>
          <span className="ds-meta text-muted-foreground block uppercase">Destino</span>
          <span className="font-medium text-foreground truncate block">{data.destination}</span>
        </div>
        {data.phone && (
          <div className="col-span-2">
            <span className="ds-meta text-muted-foreground block uppercase">Telefone</span>
            <span className="font-medium text-foreground block">{data.phone}</span>
          </div>
        )}
        {data.email && (
          <div className="col-span-2">
            <span className="ds-meta text-muted-foreground block uppercase">E-mail</span>
            <span className="font-medium text-foreground block truncate">{data.email}</span>
          </div>
        )}
        {data.notes && (
          <div className="col-span-2 border-t border-border/40 pt-1.5 mt-1">
            <span className="ds-meta text-muted-foreground block uppercase">
              Notas de Viagem
            </span>
            <p className="ds-meta text-muted-foreground line-clamp-2 mt-0.5">{data.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Action Confirmation Card Component
// ─────────────────────────────────────────────────────────────────────────────
export function ConfirmationCard({
  messageId,
  toolCall,
}: {
  messageId: string;
  toolCall: { code: string; payload: any };
}) {
  const { agency } = useAgency();
  const executeFn = useServerFn(executeAIChatAction);
  const [status, setStatus] = useState<"pending" | "confirmed" | "cancelled" | "executing">(
    "pending",
  );
  const [outcomeMessage, setOutcomeMessage] = useState("");

  const actionDef = ActionRegistry[toolCall.code];

  // Retrieve execution state from localStorage to persist user decisions across reloads
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `turis.aichat.action.${messageId}`;
    const saved = window.localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setStatus(parsed.status);
        setOutcomeMessage(parsed.message);
      } catch (e) {
        console.error(e);
      }
    }
  }, [messageId]);

  const saveState = (newStatus: "confirmed" | "cancelled", msg: string) => {
    setStatus(newStatus);
    setOutcomeMessage(msg);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        `turis.aichat.action.${messageId}`,
        JSON.stringify({ status: newStatus, message: msg }),
      );
    }
  };

  const handleConfirm = async () => {
    if (!agency?.id || status !== "pending") return;
    setStatus("executing");
    try {
      const res = await executeFn({
        data: {
          agencyId: agency.id,
          actionCode: toolCall.code,
          payload: toolCall.payload,
        },
      });
      if (res.success) {
        toast.success(res.message);
        saveState("confirmed", res.message);
      } else {
        throw new Error(res.message || "Erro desconhecido");
      }
    } catch (err: any) {
      toast.error(err.message || "Falha ao executar ação.");
      setStatus("pending");
    }
  };

  const handleCancel = () => {
    const msg = `Operação cancelada pelo operador.`;
    toast.info(msg);
    saveState("cancelled", msg);
  };

  if (!actionDef) return null;

  return (
    <div className="mt-2 rounded-full border border-border bg-surface p-3 shadow-xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-1.5 mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-brand" />
          <span className="text-xs font-bold text-foreground">{actionDef.name}</span>
        </div>
        <span
          className={cn(
            "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full tracking-wider",
            actionDef.riskLevel === "high"
              ? "bg-rose-500/10 text-rose-500"
              : actionDef.riskLevel === "medium"
                ? "bg-amber-500/10 text-amber-500"
                : "bg-emerald-500/10 text-emerald-500",
          )}
        >
          {actionDef.riskLevel} risco
        </span>
      </div>

      {/* Render parameters values */}
      <div className="space-y-1.5 text-xs text-muted-foreground bg-surface-alt p-2 rounded-full border border-border/40">
        {Object.entries(toolCall.payload).map(([k, v]) => {
          if (v === null || v === undefined || k === "leadId" || k === "clientId" || k === "tripId")
            return null;
          let label = k.charAt(0).toUpperCase() + k.slice(1);
          if (k === "name") label = "Nome";
          if (k === "destination") label = "Destino";
          if (k === "phone") label = "Telefone";
          if (k === "email") label = "E-mail";
          if (k === "notes") label = "Notas";
          if (k === "totalAmount") label = "Valor Total";

          return (
            <div
              key={k}
              className="flex justify-between gap-2 border-b border-border/20 last:border-b-0 pb-1 last:pb-0"
            >
              <span className="font-semibold text-muted-foreground/80">{label}:</span>
              <span className="text-foreground text-right truncate max-w-[140px]">
                {typeof v === "object" ? JSON.stringify(v) : String(v)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Action triggers */}
      <div className="mt-3 flex items-center justify-end gap-2 border-t border-border/40 pt-2.5">
        {status === "pending" && (
          <>
            <Button
              onClick={handleCancel}
              className="flex h-7 items-center gap-1 rounded bg-surface-muted px-2.5 ds-meta font-semibold text-muted-foreground hover:bg-surface-alt transition-colors"
            >
              <X className="h-3 w-3" />
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex h-7 items-center gap-1 rounded bg-primary px-3 ds-meta font-semibold text-primary-foreground hover:opacity-90 transition-colors"
            >
              <Check className="h-3 w-3" />
              Confirmar
            </Button>
          </>
        )}
        {status === "executing" && (
          <div className="flex items-center gap-1.5 ds-meta text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Executando ação comercial...
          </div>
        )}
        {status === "confirmed" && (
          <div className="flex w-full items-center gap-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 ds-meta text-emerald-600 font-medium">
            <Check className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {outcomeMessage || "Ação confirmada e registrada com sucesso."}
            </span>
          </div>
        )}
        {status === "cancelled" && (
          <div className="flex w-full items-center gap-1.5 rounded bg-surface-muted border border-border/40 px-2 py-1 ds-meta text-muted-foreground font-medium">
            <X className="h-3.5 w-3.5 shrink-0" />
            <span>Operação cancelada pelo operador.</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Master Message Parser / Block Renderer
// ─────────────────────────────────────────────────────────────────────────────
export function ChatBlockRenderer({
  messageId,
  content,
  context,
}: {
  messageId: string;
  content: string;
  context?: any;
}) {
  const toolCall = context?.tool_call;

  return (
    <div className="space-y-1.5">
      {/* 1. Main Text message */}
      <div className="whitespace-pre-wrap text-foreground font-light">{content}</div>

      {/* 2. Structured interactive block cards depending on execution context */}
      {toolCall && <ConfirmationCard messageId={messageId} toolCall={toolCall} />}
    </div>
  );
}
