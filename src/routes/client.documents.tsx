import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download } from "lucide-react";
import { fetchClientDocuments } from "@/services/client-area";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { fmtDate, StatusBadge } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/client/documents")({
  head: ({ context }: any) => ({ meta: [{ title: `Documentos · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: ClientDocumentsPage,
});

function ClientDocumentsPage() {
  const q = useQuery({
    queryKey: ["client-documents"],
    queryFn: () => fetchClientDocuments(),
  });

  return (
    <div className="relative space-y-6 max-w-4xl mx-auto">
      {/* Background Radial Glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-[350px] w-[350px] sm:w-[500px] rounded-full bg-brand/5 blur-3xl" />

      <PageHeader
        title="Documentos"
        description="Contratos, vouchers e comprovantes das suas viagens de forma segura e centralizada."
      />

      <div className="space-y-6">
        {/* Contratos Section */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
              Contratos
            </h3>
          </div>

          {q.data?.contracts.length === 0 && (
            <div className="mb-6 rounded-2xl border border-dashed border-border/80 bg-surface/20 p-8 text-center text-sm text-muted-foreground backdrop-blur-sm">
              Nenhum contrato ativo ou pendente encontrado.
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            {q.data?.contracts.map((c) => (
              <div
                key={c.id}
                className="group relative flex items-center justify-between rounded-2xl border border-border/50 bg-surface/40 p-4 transition-all duration-300 hover:border-brand/35 hover:bg-surface/90 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand/5 backdrop-blur-md"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[24px] bg-brand/10 text-brand transition-transform duration-300 group-hover:scale-110">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">Contrato de Prestação de Serviços</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {c.signed_at ? `Assinado em ${fmtDate(c.signed_at)}` : "Aguardando assinatura digital"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge tone={c.status === "signed" ? "success" : "warning"}>
                    {c.status === "signed" ? "Assinado" : "Pendente"}
                  </StatusBadge>
                  {c.pdf_url && (
                    <a
                      href={
                        c.pdf_url.startsWith("http")
                          ? c.pdf_url
                          : supabase.storage.from("contract-pdfs").getPublicUrl(c.pdf_url).data.publicUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center gap-1.5 rounded-2xl border border-border bg-surface px-3 text-xs font-bold text-foreground hover:bg-accent hover:border-border-strong transition-all"
                    >
                      <Download className="h-3.5 w-3.5" /> PDF
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vouchers Section */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
              Vouchers emitidos
            </h3>
          </div>

          {q.data?.vouchers.length === 0 && (
            <EmptyState title="Sem vouchers" description="Os vouchers de hospedagem, aéreo ou passeios aparecerão aqui após emissão." />
          )}

          <div className="grid grid-cols-1 gap-3">
            {q.data?.vouchers.map((v) => (
              <div
                key={v.id}
                className="group relative flex items-center justify-between rounded-2xl border border-border/50 bg-surface/40 p-4 transition-all duration-300 hover:border-brand/35 hover:bg-surface/90 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand/5 backdrop-blur-md"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[24px] bg-brand/10 text-brand transition-transform duration-300 group-hover:scale-110">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground capitalize">{v.source_type ?? "Voucher de Serviço"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {v.generated_at ? `Emitido em ${fmtDate(v.generated_at)}` : "—"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge tone={v.pdf_url ? "success" : "warning"}>
                    {v.pdf_url ? "Emitido" : "Processando"}
                  </StatusBadge>
                  {v.pdf_url && (
                    <a
                      href={
                        v.pdf_url.startsWith("http")
                          ? v.pdf_url
                          : supabase.storage.from("voucher-pdfs").getPublicUrl(v.pdf_url).data.publicUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center gap-1.5 rounded-2xl border border-border bg-surface px-3 text-xs font-bold text-foreground hover:bg-accent hover:border-border-strong transition-all"
                    >
                      <Download className="h-3.5 w-3.5" /> PDF
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
