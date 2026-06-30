import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const searchSchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
});

export const Route = createFileRoute("/inbox/oauth-callback")({
  validateSearch: (search) => searchSchema.parse(search),
  component: OAuthCallbackPage,
});

function OAuthCallbackPage() {
  const { code, state, error: searchError } = Route.useSearch();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Sincronizando sua conta do Google...");

  useEffect(() => {
    async function processCallback() {
      if (searchError) {
        setStatus("error");
        setMessage("Erro na autenticação: " + searchError);
        return;
      }

      if (!code || !state) {
        setStatus("error");
        setMessage("Parâmetros de callback inválidos ou ausentes.");
        return;
      }

      try {
        // 1. Troca o código no backend
        const { data, error: exchangeError } = await supabase.functions.invoke("gmail-oauth", {
          body: { action: "callback", code, state },
        });

        if (exchangeError || !data || !data.success) {
          throw new Error(exchangeError?.message || "Falha na troca de chaves da API do Google.");
        }

        const account = data.account;

        // 2. Busca o slug da agência para poder redirecionar de volta
        const { data: agency, error: agencyError } = await supabase
          .from("agencies")
          .select("slug")
          .eq("id", account.org_id)
          .single();

        if (agencyError || !agency) {
          throw new Error("Agência vinculada ao token não foi encontrada.");
        }

        // 3. Cadastra o canal no banco de dados para a Inbox
        const { error: channelError } = await supabase.from("channels").insert({
          agency_id: account.org_id,
          type: "email",
          display_name: `Gmail (${account.email_address})`,
          external_id: `gmail-${account.email_address}`,
          is_active: true,
        });

        if (channelError) {
          console.error("Erro ao registrar canal, mas a conta de email foi salva:", channelError);
        }

        setStatus("success");
        setMessage("Gmail conectado com sucesso! Redirecionando para sua Inbox...");
        toast.success("Gmail conectado!");

        // Redireciona de volta após 2 segundos
        setTimeout(() => {
          navigate({ to: `/agency/${agency.slug}/inbox` });
        }, 2000);
      } catch (err: any) {
        console.error(err);
        setStatus("error");
        setMessage(err.message || "Erro inesperado ao conectar conta Gmail.");
        toast.error("Erro ao conectar Gmail.");
      }
    }

    processCallback();
  }, [code, state, searchError, navigate]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background px-6 text-center text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-xl flex flex-col items-center gap-4">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 text-brand animate-spin" />
            <h2 className="text-lg font-bold">Conectando ao Google</h2>
            <p className="text-sm text-muted-foreground">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="h-12 w-12 text-emerald-500 animate-bounce" />
            <h2 className="text-lg font-bold text-emerald-500">Conexão Estabelecida</h2>
            <p className="text-sm text-muted-foreground">{message}</p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 text-destructive animate-pulse" />
            <h2 className="text-lg font-bold text-destructive">Falha na Conexão</h2>
            <p className="text-sm text-muted-foreground mb-4">{message}</p>
            <button
              onClick={() => navigate({ to: "/" })}
              className="w-full h-10 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand/90 transition-all cursor-pointer"
            >
              Voltar ao Painel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
