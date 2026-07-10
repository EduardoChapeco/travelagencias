import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, FileText, CheckCircle2, Clock, ShieldAlert, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { PrimaryButton } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/client/consents")({
  head: ({ context }: any) => ({ meta: [{ title: `Privacidade e LGPD · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: ClientConsentsPage,
});

const KIND_LABELS: Record<string, string> = {
  terms: "Termos de Uso",
  privacy: "Política de Privacidade",
  cookies: "Política de Cookies",
  lgpd: "Termo de Consentimento LGPD",
  dpa: "Acordo de Processamento de Dados (DPA)",
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
      const { data: policies } = await supabase
        .from("policy_documents")
        .select("id, kind, version, content_md, effective_at, is_published")
        .eq("is_published", true);

      // Pegar os aceites deste usuário
      const { data: acceptances } = await supabase
        .from("legal_acceptances")
        .select("id, document_id, accepted_at, ip_address, policy_documents(kind, version)")
        .eq("user_id", u.user.id);

      const accMap = new Set(
        (acceptances as { document_id: string }[] | null)?.map((a) => a.document_id),
      );

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
      const { error } = await supabase.rpc("record_legal_acceptance", {
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
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      <header className="flex flex-col gap-2 border-b border-border/50 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-card)] bg-brand/10 text-brand">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Central de Privacidade e LGPD
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Visualize, assine e gerencie todos os seus consentimentos e termos legais de forma
              segura.
            </p>
          </div>
        </div>
      </header>

      <div>
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" /> Ações Pendentes
        </h3>

        {q.isLoading && (
          <div className="text-sm text-muted-foreground">Verificando conformidade...</div>
        )}

        {q.data?.missing.length === 0 && (
          <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-success/30 bg-success/5 p-8 text-center transition-all hover:border-success/50">
            <div className="absolute inset-0 glass bg-white/5 border-white/10/10 pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success mb-4">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h4 className="text-lg font-bold text-success mb-1">Tudo em conformidade!</h4>
              <p className="text-sm text-success/80 max-w-md">
                Você não possui nenhum termo obrigatório pendente. Agradecemos por manter seu
                cadastro atualizado.
              </p>
            </div>
          </div>
        )}

        {q.data && q.data.missing.length > 0 && (
          <div className="grid gap-4">
            {q.data.missing.map((m: any) => (
              <div
                key={m.id}
                className="group relative flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-[var(--radius-card)] border border-warning/40 glass-card border-none p-6 transition-all hover:border-warning"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-warning rounded-l-2xl" />
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-card)] bg-warning/10 text-warning">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                      {KIND_LABELS[m.kind] || m.kind}
                      <span className="inline-flex items-center rounded-full glass bg-white/5 border-white/10 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground border-none">
                        v{m.version}
                      </span>
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed max-w-xl">
                      Para continuar utilizando os serviços da agência e garantirmos a melhor
                      experiência, é necessário revisar e aceitar a versão mais recente deste
                      documento.
                    </p>
                  </div>
                </div>
                <PrimaryButton
                  disabled={acceptM.isPending}
                  onClick={() => acceptM.mutate(m.id)}
                  className="w-full md:w-auto shrink-0 gap-2 h-11 px-6"
                >
                  <Check className="h-4 w-4" /> Aceitar e Assinar
                </PrimaryButton>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-border/50">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Clock className="h-4 w-4" /> Histórico de Aceites (Trilha de Auditoria)
        </h3>

        {q.data?.acceptances.length === 0 && (
          <EmptyState
            title="Sem aceites históricos"
            description="Nenhum registro de aceite encontrado na trilha de auditoria."
          />
        )}

        {q.data && q.data.acceptances.length > 0 && (
          <div className="grid gap-3">
            {q.data.acceptances.map((a: any) => (
              <div
                key={a.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between rounded-[var(--radius-card)] border-none glass-card border-none p-5 gap-4 transition-colors hover:border-brand/40"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">
                      {KIND_LABELS[a.policy_documents?.kind] || a.policy_documents?.kind}
                      <span className="text-xs font-medium text-muted-foreground ml-2">
                        Versão {a.policy_documents?.version}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2 flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> {fmtDate(a.accepted_at)}
                      </span>
                      {a.ip_address && (
                        <span className="font-mono text-[10px] glass bg-white/5 border-white/10 px-2 py-0.5 rounded border-none">
                          IP: {a.ip_address}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <StatusBadge tone="success">Assinado Eletronicamente</StatusBadge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
