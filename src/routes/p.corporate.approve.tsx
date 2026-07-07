import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Building2, Briefcase, Calendar, MapPin, Send } from "lucide-react";
import { fetchCorporateRfp, updateCorporateRfpStatus } from "@/services/public";
import { PrimaryButton, fmtDate, Textarea, GhostButton } from "@/components/ui/form";
import { toast } from "sonner";

export const Route = createFileRoute("/p/corporate/approve")({
  head: ({ context }: any) => ({ meta: [{ title: `Aprovação Corporativa · ${context?.brand?.platform_name || 'Turis'}` }] }),
  validateSearch: (search: Record<string, unknown>) => {
    return { token: search.token as string | undefined };
  },
  component: CorporateApprovePage,
});

function CorporateApprovePage() {
  const { token } = Route.useSearch();
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const rfpQ = useQuery({
    enabled: !!token,
    queryKey: ["corporate-rfp-approve", token],
    queryFn: () => fetchCorporateRfp(token!),
  });

  const updateStatus = useMutation({
    mutationFn: ({ status, reason }: { status: string; reason?: string }) =>
      updateCorporateRfpStatus(token!, status, reason, rfpQ.data?.requester_email),
    onSuccess: () => {
      toast.success("Resposta enviada com sucesso!");
      rfpQ.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!token) return <div className="p-12 text-center text-muted-foreground">Token inválido.</div>;
  if (rfpQ.isLoading)
    return <div className="p-12 text-center text-muted-foreground">Carregando detalhes...</div>;

  const rfp = rfpQ.data;
  if (!rfp)
    return (
      <div className="p-12 text-center text-muted-foreground">
        Orçamento não encontrado ou token expirado.
      </div>
    );

  const isPending = rfp.status === "sent_for_approval";
  const isApproved = rfp.status === "approved";
  const isRejected = rfp.status === "rejected";

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="h-16 border-b border-border bg-surface flex items-center px-6">
        <div className="font-bold tracking-tight text-foreground">
          {rfp.agency?.name || "Turis"} B2B
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full p-6 md:p-12">
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="p-8 border-b border-border">
            <div className="flex items-center gap-2 text-sm text-brand font-semibold mb-3">
              <Briefcase className="h-4 w-4" /> REQUISIÇÃO CORPORATIVA
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{rfp.title}</h1>
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" /> {rfp.client?.full_name}
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> {rfp.destination}
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" /> {fmtDate(rfp.departure_date)}
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Solicitante</h3>
              <p className="text-muted-foreground">
                {rfp.requester_name} ({rfp.requester_email})
              </p>
            </div>

            {rfp.description && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Detalhes da Viagem</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{rfp.description}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Orçamento Proposto</h3>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {rfp.budget
                  ? rfp.budget.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                  : "Sob consulta"}
              </p>
            </div>

            {isPending && (
              <div className="pt-6 border-t border-border mt-8">
                {isRejecting ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                    <h3 className="font-semibold text-foreground">Motivo da Recusa</h3>
                    <Textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Por favor, informe o motivo para a agência..."
                      rows={3}
                    />
                    <div className="flex gap-3">
                      <GhostButton
                        className="text-danger hover:bg-danger/10"
                        onClick={() =>
                          updateStatus.mutate({ status: "rejected", reason: rejectReason })
                        }
                        disabled={updateStatus.isPending || !rejectReason.trim()}
                      >
                        Confirmar Recusa
                      </GhostButton>
                      <button
                        onClick={() => setIsRejecting(false)}
                        className="text-sm text-muted-foreground hover:text-foreground font-medium"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <PrimaryButton
                      className="flex-1 py-6 text-lg gap-2"
                      onClick={() => updateStatus.mutate({ status: "approved" })}
                      disabled={updateStatus.isPending}
                    >
                      <CheckCircle2 className="h-5 w-5" /> Aprovar Orçamento
                    </PrimaryButton>
                    <button
                      onClick={() => setIsRejecting(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-6 text-lg font-semibold border border-border text-foreground rounded-2xl hover:bg-surface-alt transition-colors"
                    >
                      <XCircle className="h-5 w-5" /> Recusar
                    </button>
                  </div>
                )}
              </div>
            )}

            {isApproved && (
              <div className="mt-8 p-6 bg-success/10 border border-success/20 rounded-[var(--radius-card)] flex items-start gap-4">
                <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
                <div>
                  <h3 className="font-bold text-success-foreground">Orçamento Aprovado</h3>
                  <p className="text-success-foreground/80 mt-1 text-sm">
                    Aprovado por {rfp.approved_by} em{" "}
                    {rfp.approved_at ? new Date(rfp.approved_at).toLocaleString("pt-BR") : ""}. A
                    agência já foi notificada para prosseguir com as emissões.
                  </p>
                </div>
              </div>
            )}

            {isRejected && (
              <div className="mt-8 p-6 bg-danger/10 border border-danger/20 rounded-[var(--radius-card)] flex items-start gap-4">
                <XCircle className="h-6 w-6 text-danger shrink-0" />
                <div>
                  <h3 className="font-bold text-danger-foreground">Orçamento Recusado</h3>
                  {rfp.rejection_reason && (
                    <p className="text-danger-foreground/80 mt-1 text-sm">
                      Motivo: {rfp.rejection_reason}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
