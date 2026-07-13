import { UserCheck, Clock, FileText, FileCheck, History, Eye, Check } from "lucide-react";

type Signature = {
  signer_name: string;
  signer_document: string;
  signed_at: string;
  ip: string;
  user_agent?: string;
  signature_image?: string;
  selfie_image?: string;
  doc_front?: string;
  doc_back?: string;
  video_kyc?: string;
};

type Contract = {
  id: string;
  status: string;
  client_data?: any;
  signatures?: Signature[];
};

type AuditLog = {
  id: number;
  action: string;
  created_at: string;
  row_hash?: string | null;
  prev_hash?: string | null;
  metadata?: any;
};

export function ContractSignatureControl({
  contract,
  auditChain = [],
  isLoadingAudit,
}: {
  contract: Contract;
  auditChain?: AuditLog[];
  isLoadingAudit?: boolean;
}) {
  // Extract customer behavioral tracking metadata from the audit chain
  const viewLogs = auditChain?.filter((a) => a.action === "CONTRACT_VIEWED") || [];
  const readLogs = auditChain?.filter((a) => a.action === "CONTRACT_READ") || [];
  const viewCount = viewLogs.length;
  const hasBeenOpened = viewCount > 0;
  const hasBeenRead = readLogs.length > 0;
  const lastViewEvent = viewLogs[viewLogs.length - 1];

  return (
    <div className="space-y-4">
      {/* Controle de Assinaturas */}
      <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <UserCheck className="h-4 w-4" /> Controle de Assinaturas
        </h3>
        <div className="rounded-[var(--radius-card)] border border-border/50 bg-surface-alt/30 p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-foreground">
                {Array.isArray(contract.client_data)
                  ? contract.client_data
                      .map((c: any) => c.name)
                      .filter(Boolean)
                      .join(", ")
                  : (contract.client_data as any)?.name || "Cliente Contratante"}
              </div>
              <div className="ds-meta text-muted-foreground font-mono">
                {Array.isArray(contract.client_data)
                  ? contract.client_data
                      .map((c: any) => c.cpf || c.document)
                      .filter(Boolean)
                      .join(" / ")
                  : (contract.client_data as any)?.document ||
                    (contract.client_data as any)?.cpf ||
                    "Sem doc informado"}
              </div>
            </div>
            <div>
              {contract.status === "signed" ? (
                <span className="inline-flex items-center gap-1 rounded bg-success/15 px-2 py-0.5 ds-meta font-bold text-success">
                  Assinado
                </span>
              ) : contract.status === "cancelled" ? (
                <span className="inline-flex items-center gap-1 rounded bg-danger/15 px-2 py-0.5 ds-meta font-bold text-danger">
                  Cancelado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded bg-warning/15 px-2 py-0.5 ds-meta font-bold text-warning animate-pulse">
                  Aguardando
                </span>
              )}
            </div>
          </div>

          {/* Rastreamento Comportamental do Cliente */}
          <div className="mt-4 border-t border-border/40 pt-3 space-y-2.5 ds-meta text-muted-foreground">
            <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Engajamento do Cliente
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-muted-foreground/75" /> Acesso ao Link:
              </span>
              {hasBeenOpened ? (
                <span className="font-bold text-info bg-info/10 border border-info/20 px-1.5 py-0.5 rounded">
                  Visualizado ({viewCount} {viewCount === 1 ? "vez" : "vezes"})
                </span>
              ) : (
                <span className="font-bold text-muted-foreground bg-surface-alt px-1.5 py-0.5 rounded border border-border/40">
                  Pendente de Acesso
                </span>
              )}
            </div>
            {hasBeenOpened && lastViewEvent && (
              <div className="text-[9px] text-muted-foreground/80 pl-5 space-y-0.5 bg-surface-alt/10 p-1.5 rounded border border-border/30">
                <div className="flex justify-between">
                  <span>Último acesso:</span>
                  <span className="font-medium text-foreground">
                    {new Date(lastViewEvent.created_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {lastViewEvent.metadata?.ip && (
                  <div className="flex justify-between font-mono text-[8.5px]">
                    <span>Endereço IP:</span>
                    <span className="text-foreground">{lastViewEvent.metadata.ip}</span>
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileCheck className="h-3.5 w-3.5 text-muted-foreground/75" /> Leitura dos Termos:
              </span>
              {hasBeenRead ? (
                <span className="font-bold text-success bg-success/10 border border-success/20 px-1.5 py-0.5 rounded">
                  Lido até o Fim
                </span>
              ) : (
                <span className="font-bold text-warning bg-warning/10 border border-warning/20 px-1.5 py-0.5 rounded animate-pulse">
                  Pendente
                </span>
              )}
            </div>
          </div>

          {contract.signatures &&
            contract.signatures.map((sig, i) => (
              <div
                key={i}
                className="mt-3 border-t border-border/40 pt-2.5 space-y-2 ds-meta text-muted-foreground"
              >
                <div className="flex items-center justify-between">
                  <span>
                    IP: <strong className="font-mono text-foreground/80">{sig.ip}</strong>
                  </span>
                  <span>
                    {new Date(sig.signed_at).toLocaleDateString("pt-BR")}{" "}
                    {new Date(sig.signed_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="truncate text-[9.5px]" title={sig.user_agent}>
                  UA: {sig.user_agent || "Desconhecido"}
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {sig.selfie_image && (
                    <span className="inline-flex items-center gap-0.5 rounded border border-success/30 bg-success/5 px-1.5 py-0.5 text-[9px] font-semibold text-success">
                      ✓ Selfie KYC
                    </span>
                  )}
                  {sig.doc_front && (
                    <span className="inline-flex items-center gap-0.5 rounded border border-success/30 bg-success/5 px-1.5 py-0.5 text-[9px] font-semibold text-success">
                      ✓ Doc (Frente)
                    </span>
                  )}
                  {sig.doc_back && (
                    <span className="inline-flex items-center gap-0.5 rounded border border-success/30 bg-success/5 px-1.5 py-0.5 text-[9px] font-semibold text-success">
                      ✓ Doc (Verso)
                    </span>
                  )}
                  {sig.video_kyc && (
                    <span className="inline-flex items-center gap-0.5 rounded border border-success/30 bg-success/5 px-1.5 py-0.5 text-[9px] font-semibold text-success">
                      ✓ Vídeo KYC
                    </span>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Cadeia de Auditoria Criptográfica (Ledger) */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <History className="h-4 w-4 text-muted-foreground" /> Cadeia de Auditoria (Ledger)
        </h3>

        {isLoadingAudit && (
          <p className="ds-meta text-muted-foreground">Carregando auditoria...</p>
        )}

        {auditChain && auditChain.length > 0 ? (
          <div className="relative border-l border-border/60 pl-3.5 space-y-4 ml-1">
            {auditChain.map((audit) => {
              let icon = <Clock className="h-3 w-3 text-muted-foreground" />;
              let actionLabel = audit.action;

              if (audit.action === "CONTRACT_SIGNED") {
                icon = <UserCheck className="h-3 w-3 text-success" />;
                actionLabel = "Contrato Assinado";
              } else if (audit.action === "ADDENDUM_CREATED") {
                icon = <FileText className="h-3 w-3 text-info" />;
                actionLabel = "Aditivo Registrado";
              } else if (audit.action === "ADDENDUM_SIGNED") {
                icon = <FileCheck className="h-3 w-3 text-success" />;
                actionLabel = "Aditivo Assinado";
              } else if (audit.action === "CONTRACT_CREATED") {
                actionLabel = "Contrato Inicial";
              } else if (audit.action === "CONTRACT_VIEWED") {
                icon = <Eye className="h-3 w-3 text-info" />;
                actionLabel = "Link Acessado pelo Cliente";
              } else if (audit.action === "CONTRACT_READ") {
                icon = <Check className="h-3 w-3 text-success" />;
                actionLabel = "Leitura Completa Confirmada";
              }

              return (
                <div key={audit.id} className="relative ds-meta text-foreground font-medium">
                  {/* Bullet */}
                  <div className="absolute -left-[22px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-surface ring-2 ring-border/50">
                    {icon}
                  </div>
                  <div className="font-bold text-foreground">{actionLabel}</div>
                  <div className="text-muted-foreground font-mono text-[9px] mt-0.5">
                    Block #{audit.id} · {audit.row_hash?.slice(0, 8)}...
                  </div>
                  <div className="text-[9px] text-muted-foreground">
                    {new Date(audit.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          !isLoadingAudit && (
            <p className="ds-meta text-muted-foreground">
              Nenhum evento registrado no livro razão.
            </p>
          )
        )}
      </div>
    </div>
  );
}
