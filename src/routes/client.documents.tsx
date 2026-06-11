import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download } from "lucide-react";
import { fetchClientDocuments } from "@/services/client-area";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { fmtDate, StatusBadge } from "@/components/ui/form";

export const Route = createFileRoute("/client/documents")({
  head: () => ({ meta: [{ title: "Documentos · TravelOS" }] }),
  component: ClientDocumentsPage,
});

function ClientDocumentsPage() {
  const q = useQuery({
    queryKey: ["client-documents"],
    queryFn: () => fetchClientDocuments(),
  });

  return (
    <>
      <PageHeader
        title="Documentos"
        description="Contratos, vouchers e comprovantes das suas viagens."
      />

      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Contratos
      </h3>
      {q.data?.contracts.length === 0 && (
        <div className="mb-6 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Sem contratos.
        </div>
      )}
      <div className="mb-6 space-y-2">
        {q.data?.contracts.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-lg border border-border bg-surface p-3"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Contrato</div>
                <div className="text-xs text-muted-foreground">
                  {c.signed_at ? `Assinado em ${fmtDate(c.signed_at)}` : "Pendente assinatura"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge tone={c.status === "signed" ? "success" : "warning"}>
                {c.status}
              </StatusBadge>
              {c.pdf_url && (
                <a
                  href={c.pdf_url}
                  className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                >
                  <Download className="h-3 w-3" /> PDF
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Vouchers
      </h3>
      {q.data?.vouchers.length === 0 && (
        <EmptyState title="Sem vouchers" description="Vouchers aparecem aqui após emissão." />
      )}
      <div className="space-y-2">
        {q.data?.vouchers.map((v) => (
          <div
            key={v.id}
            className="flex items-center justify-between rounded-lg border border-border bg-surface p-3"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium capitalize">{v.source_type ?? "Voucher"}</div>
                <div className="text-xs text-muted-foreground">
                  {v.generated_at ? `Emitido em ${fmtDate(v.generated_at)}` : "—"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge tone={v.pdf_url ? "success" : "warning"}>
                {v.pdf_url ? "Emitido" : "Pendente"}
              </StatusBadge>
              {v.pdf_url && (
                <a
                  href={v.pdf_url}
                  className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                >
                  <Download className="h-3 w-3" /> PDF
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
