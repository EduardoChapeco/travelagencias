import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, FileText, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { PrimaryButton, StatusBadge, fmtDate } from "@/components/ui/form";
import { toast } from "sonner";

export const Route = createFileRoute("/client/consents")({
  head: () => ({ meta: [{ title: "Privacidade e LGPD · TravelOS" }] }),
  component: ClientConsentsPage,
});

const KIND_LABELS: Record<string, string> = {
  terms: "Termos de Uso",
  privacy: "Política de Privacidade",
  cookies: "Política de Cookies",
  lgpd: "Termo de Consentimento LGPD",
  dpa: "Acordo de Processamento de Dados (DPA)"
};

function ClientConsentsPage() {
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["client-consents"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { acceptances: [], missing: [] };

      const { data: clients } = await supabase
        .from("clients")
        .select("id, agency_id")
        .eq("user_id", u.user.id);
      if (!clients || clients.length === 0) return { acceptances: [], missing: [] };
      const agencyIds = [...new Set(clients.map((c) => c.agency_id))];

      // Pegar documentos obrigatórios vigentes (publicados)
      const { data: policies } = await (supabase as any)
        .from("policy_documents")
        .select("id, kind, version, content_md, effective_at, is_published")
        .eq("is_published", true);

      // Pegar os aceites deste usuário
      const { data: acceptances } = await (supabase as any)
        .from("legal_acceptances")
        .select("id, document_id, accepted_at, ip_address, policy_documents(kind, version)")
        .eq("user_id", u.user.id);

      const accMap = new Set((acceptances as any[])?.map((a) => a.document_id));

      // Todos os publicados são obrigatórios para os clientes
      const missing = ((policies as any[]) || []).filter((p) => !accMap.has(p.id));

      return {
        acceptances: (acceptances as any[]) || [],
        missing: missing || [],
        userId: u.user.id,
      };
    },
  });

  const acceptM = useMutation({
    mutationFn: async (docId: string) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");

      // Usar a RPC que grava IP/UA forenses e funciona com a restrição de RLS
      const { error } = await (supabase as any).rpc("record_legal_acceptance", {
        _document_id: docId,
        _context: "client_portal",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Documento aceito com sucesso");
      qc.invalidateQueries({ queryKey: ["client-consents"] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  return (
    <>
      <PageHeader
        title="Privacidade e Termos"
        description="Gerencie seus consentimentos e termos legais vigentes."
      />

      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        <Shield className="h-4 w-4" /> Ações Pendentes
      </h3>

      {q.data?.missing.length === 0 && (
        <div className="mb-8 rounded-lg border border-border bg-success-bg/20 p-4 text-center">
          <CheckCircle2 className="h-6 w-6 text-success mx-auto mb-2" />
          <div className="text-sm font-medium text-success">Tudo certo!</div>
          <p className="text-xs text-muted-foreground mt-1">
            Você não possui nenhum termo obrigatório pendente de aceite.
          </p>
        </div>
      )}

      {q.data && q.data.missing.length > 0 && (
        <div className="mb-8 space-y-3">
          {q.data.missing.map((m: any) => (
            <div
              key={m.id}
              className="rounded-xl border border-warning/50 bg-warning-bg/10 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex gap-3">
                <FileText className="h-5 w-5 text-warning shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    {KIND_LABELS[m.kind] || m.kind}{" "}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      v{m.version}
                    </span>
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-lg">
                    Para continuar utilizando os serviços da agência, é necessário revisar e aceitar
                    a versão mais recente deste documento.
                  </p>
                </div>
              </div>
              <PrimaryButton
                disabled={acceptM.isPending}
                onClick={() => acceptM.mutate(m.id)}
                className="w-full md:w-auto shrink-0 bg-warning text-warning-foreground hover:bg-warning/90"
              >
                Aceitar Termos
              </PrimaryButton>
            </div>
          ))}
        </div>
      )}

      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Histórico de Aceites
      </h3>
      {q.data?.acceptances.length === 0 && (
        <EmptyState title="Sem aceites" description="Nenhum registro de aceite encontrado." />
      )}
      <div className="space-y-2">
        {q.data?.acceptances.map((a: any) => (
          <div
            key={a.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-border bg-surface p-4 gap-4"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
              <div>
                <div className="text-sm font-medium">
                  {KIND_LABELS[a.policy_documents?.kind] || a.policy_documents?.kind}{" "}
                  <span className="text-xs text-muted-foreground ml-1">
                    v{a.policy_documents?.version}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                  <Clock className="h-3 w-3" /> {fmtDate(a.accepted_at)}
                  {a.ip_address && (
                    <span className="text-[10px] font-mono bg-surface-alt px-1.5 py-0.5 rounded border border-border">
                      IP: {a.ip_address}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div>
              <StatusBadge tone="success">Vigente</StatusBadge>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
