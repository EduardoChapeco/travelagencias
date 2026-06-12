import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/confirm")({
  head: () => ({ meta: [{ title: "Confirmação de Conta · TravelOS" }] }),
  component: ConfirmPage,
});

function ConfirmPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "success" | "error">("checking");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function verify() {
      try {
        // Se houver hash na URL, o supabase-js client processa automaticamente.
        // Vamos checar a sessão após um tempo muito curto, ou ler a hash para saber se foi erro.
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const errorDescription = hashParams.get("error_description");

        if (errorDescription) {
          if (mounted) {
            setStatus("error");
            setErrorMessage(decodeURIComponent(errorDescription));
          }
          return;
        }

        // Aguarda caso o supabase client esteja processando o token da url
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          if (mounted) {
            setStatus("error");
            setErrorMessage(sessionError.message);
          }
          return;
        }

        if (sessionData.session) {
          // Checa se o usuário atual está realmente verificado
          const { data: userData } = await supabase.auth.getUser();

          if (userData.user?.email_confirmed_at) {
            if (mounted) setStatus("success");
          } else {
            // Se logou mas não tá verificado, estranho, mas tratamos.
            if (mounted) {
              setStatus("error");
              setErrorMessage("E-mail ainda não confirmado.");
            }
          }
        } else {
          // Se não há sessão, mas também não tem erro na URL.
          // Pode ter sido acessado sem o hash, ex: /auth/confirm
          if (mounted) {
            setStatus("error");
            setErrorMessage("Link de verificação inválido ou expirado.");
          }
        }
      } catch (err) {
        if (mounted) {
          setStatus("error");
          setErrorMessage("Ocorreu um erro ao verificar sua conta.");
        }
      }
    }

    // Delay leve para garantir que o supabase interceptou o token no #hash local
    setTimeout(() => {
      verify();
    }, 500);

    return () => {
      mounted = false;
    };
  }, []);

  function handleContinue() {
    navigate({ to: "/auth/login", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm text-center">
        {status === "checking" && (
          <>
            <div className="mx-auto mb-6 flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-muted">
              <span className="text-xl">⌛</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Verificando...</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Aguarde enquanto validamos seu link.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">E-mail confirmado!</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Sua conta foi ativada com sucesso. Agora vamos configurar a sua agência.
            </p>
            <button
              onClick={handleContinue}
              className="mt-8 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Continuar para Login
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Acesso inválido</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {errorMessage || "Este link expirou ou já foi utilizado."}
            </p>
            <div className="mt-8 space-y-3">
              <Link
                to="/auth/login"
                className="block w-full rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-surface-alt"
              >
                Voltar para o Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
