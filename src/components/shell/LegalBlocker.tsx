import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

export function LegalBlocker({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["legal-compliance"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return { requireAcceptance: false, doc: null };

      // Get the latest terms
      const { data: terms } = await supabase
        .from("policy_documents")
        .select("*")
        .eq("kind", "terms")
        .order("effective_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!terms) return { requireAcceptance: false, doc: null };

      // Check if user has accepted this document
      const { data: acceptance } = await supabase
        .from("legal_acceptances")
        .select("id")
        .eq("document_id", terms.id)
        .eq("user_id", user.user.id)
        .maybeSingle();

      return {
        requireAcceptance: !acceptance,
        doc: terms,
      };
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase.rpc("record_legal_acceptance", {
        _document_id: docId,
        _context: "app_login",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal-compliance"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-sm">Verificando conformidade legal...</div>
      </div>
    );
  }

  if (data?.requireAcceptance && data.doc) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background p-4 sm:p-6 md:p-12">
        <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-surface ">
          <div className="border-b border-border bg-surface-alt/50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">
                  Atualização dos Termos de Uso (LGPD)
                </h2>
                <p className="text-xs text-muted-foreground">
                  Versão: {data.doc.version} · Efetivo a partir de{" "}
                  {new Date(data.doc.effective_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
          </div>

          <div
            className="flex-1 overflow-y-auto p-6"
            onScroll={(e) => {
              const target = e.target as HTMLDivElement;
              if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
                setScrolledToBottom(true);
              }
            }}
          >
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{data.doc.content_md}</ReactMarkdown>
            </div>
          </div>

          <div className="border-t border-border bg-surface-alt/30 p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground flex-1">
                Ao clicar em "Eu Aceito", você concorda com a Política de Privacidade e os Termos de
                Uso do sistema, garantindo conformidade com a LGPD. Seu aceite será registrado com
                trilha de auditoria inviolável.
              </p>
              <button
                onClick={() => acceptMutation.mutate(data.doc.id)}
                disabled={
                  acceptMutation.isPending ||
                  (!scrolledToBottom && data.doc.content_md.length > 500)
                }
                className="inline-flex h-10 w-full sm:w-auto items-center justify-center rounded-md bg-brand px-8 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90 disabled:opacity-50"
              >
                {acceptMutation.isPending ? "Registrando..." : "Eu Li e Aceito"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
