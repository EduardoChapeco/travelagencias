import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProposalHistory } from "@/services/proposals";
import { SheetPage } from "@/components/ui/sheet";
import {
  Sparkles,
  PlusCircle,
  PencilLine,
  Eye,
  CheckCircle2,
  XCircle,
  Download,
  History,
  User,
  Clock,
  ArrowUpRight,
  FileText,
} from "lucide-react";

interface ProposalHistorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  proposalId: string;
  proposalTitle: string;
}

export function ProposalHistorySheet({
  isOpen,
  onClose,
  proposalId,
  proposalTitle,
}: ProposalHistorySheetProps) {
  const {
    data: history = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["proposal-history", proposalId],
    queryFn: () => fetchProposalHistory(proposalId),
    enabled: isOpen && !!proposalId,
  });

  // Action configuration helper
  const getActionConfig = (action: string) => {
    switch (action) {
      case "created":
        return {
          label: "Cotação Criada",
          icon: PlusCircle,
          color: "text-success bg-success/10 border-success/20",
          desc: "A proposta comercial foi criada no sistema.",
        };
      case "updated":
        return {
          label: "Cotação Editada",
          icon: PencilLine,
          color: "text-warning bg-warning/10 border-warning/20",
          desc: "Alterações foram salvas na proposta.",
        };
      case "viewed":
        return {
          label: "Visualizada pelo Cliente",
          icon: Eye,
          color: "text-info bg-info/10 border-info/20",
          desc: "O cliente abriu e visualizou a proposta online.",
        };
      case "accepted":
      case "converted":
        return {
          label: "Aceita pelo Cliente",
          icon: CheckCircle2,
          color: "text-success bg-success/10 border-success/20",
          desc: "O cliente aprovou a proposta comercial.",
        };
      case "rejected":
        return {
          label: "Recusada pelo Cliente",
          icon: XCircle,
          color: "text-danger bg-danger/10 border-danger/20",
          desc: "O cliente recusou os termos ou valores propostos.",
        };
      case "pdf_exported":
        return {
          label: "PDF Exportado",
          icon: Download,
          color: "text-primary bg-primary/10 border-primary/20",
          desc: "Um arquivo PDF da proposta foi gerado.",
        };
      default:
        return {
          label: action.charAt(0).toUpperCase() + action.slice(1),
          icon: History,
          color: "text-muted-foreground bg-surface-alt border-border",
          desc: "Atividade registrada.",
        };
    }
  };

  // Helper to translate detail keys for cleaner UI
  const formatDetailKey = (key: string): string => {
    const keysMap: Record<string, string> = {
      format: "Formato",
      pages_count: "Qtd. de Páginas",
      duplicated_from: "Duplicada de ID",
      title: "Título",
      status: "Status",
      ip: "Endereço IP",
      user_agent: "Navegador",
    };
    return keysMap[key] || key;
  };

  return (
    <SheetPage isOpen={isOpen} onClose={onClose} title="Histórico da Cotação" width="540px">
      <div className="mb-6">
        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Cotação Selecionada
        </span>
        <h3 className="text-sm font-bold text-foreground mt-0.5 truncate flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-brand" />
          {proposalTitle}
        </h3>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <span className="text-xs text-muted-foreground">Carregando histórico...</span>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 p-4 text-center">
          <p className="text-xs text-danger font-medium">Erro ao carregar histórico</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {(error as any)?.message || "Ocorreu um erro ao buscar o log de atividades."}
          </p>
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-[var(--radius-card)] bg-surface-alt/20">
          <History className="h-8 w-8 text-muted-foreground/60 mb-2.5" />
          <span className="text-xs font-semibold text-foreground">Sem histórico registrado</span>
          <span className="text-[11px] text-muted-foreground mt-1 max-w-[240px]">
            Nenhuma ação ou visualização foi gravada para esta cotação até o momento.
          </span>
        </div>
      ) : (
        <div className="relative pl-6 border-l border-border/80 ml-3 space-y-8 py-2">
          {history.map((entry) => {
            const config = getActionConfig(entry.action);
            const ActionIcon = config.icon;
            const formattedDate = new Date(entry.created_at).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });

            // Extract extra details
            const extraDetails = Object.entries(entry.details || {}).filter(
              ([key]) => !["agent_name", "agent_id"].includes(key),
            );

            // Determine who performed the action
            const isClientAction = ["viewed", "accepted", "rejected"].includes(entry.action);
            const actorName = isClientAction
              ? "Cliente (via link)"
              : entry.details?.agent_name || "Agente / Sistema";

            return (
              <div key={entry.id} className="relative group">
                {/* Timeline circle badge */}
                <div
                  className={`absolute -left-[37px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border text-xs shadow-none transition-transform group-hover:scale-110 ${config.color}`}
                >
                  <ActionIcon className="h-3.5 w-3.5" />
                </div>

                {/* Card header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-xs font-bold text-foreground group-hover:text-brand transition-colors">
                    {config.label}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formattedDate}
                  </span>
                </div>

                {/* Actor & Description */}
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <User className="h-3 w-3 text-muted-foreground/80" />
                  <span className="font-medium text-foreground/80">{actorName}</span>
                  <span className="text-[10px] text-muted-foreground/60">•</span>
                  <span>{config.desc}</span>
                </div>

                {/* Extra Details Box */}
                {extraDetails.length > 0 && (
                  <div className="mt-2.5 rounded-2xl border border-border/55 bg-surface-alt/30 p-2.5 text-[10px] space-y-1">
                    <span className="block font-bold text-[9px] uppercase tracking-wider text-muted-foreground/80 mb-1">
                      Detalhes do Evento
                    </span>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground font-mono">
                      {extraDetails.map(([key, val]) => (
                        <div
                          key={key}
                          className="flex justify-between items-center py-0.5 border-b border-border/20 last:border-0"
                        >
                          <span className="text-[9px] font-sans font-medium text-muted-foreground/90">
                            {formatDetailKey(key)}:
                          </span>
                          <span
                            className="text-foreground font-semibold truncate max-w-[140px]"
                            title={String(val)}
                          >
                            {typeof val === "object" ? JSON.stringify(val) : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </SheetPage>
  );
}
