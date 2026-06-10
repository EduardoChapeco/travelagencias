import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveSignedInAgency } from "@/lib/auth-routing";

export const Route = createFileRoute("/auth/verify")({
  head: () => ({ meta: [{ title: "Verificação de e-mail · TravelOS" }] }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "verified" | "pending">("checking");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setStatus("pending");
        return;
      }
      setEmail(data.user.email ?? null);
      if (data.user.email_confirmed_at) {
        setStatus("verified");
        const agency = await resolveSignedInAgency(data.user.id);
        setTimeout(() => {
          if (agency)
            navigate({ to: "/agency/$slug", params: { slug: agency.slug }, replace: true });
          else navigate({ to: "/auth/onboarding", replace: true });
        }, 1200);
      } else setStatus("pending");
    })();
  }, [navigate]);

  async function resend() {
    if (!email) return;
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) alert(error.message);
    else alert("E-mail reenviado");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8 text-center">
        {status === "checking" && <p className="text-sm text-muted-foreground">Verificando…</p>}
        {status === "verified" && (
          <>
            <h1 className="text-xl font-semibold">✓ E-mail confirmado</h1>
            <p className="mt-2 text-sm text-muted-foreground">Redirecionando…</p>
          </>
        )}
        {status === "pending" && (
          <>
            <h1 className="text-xl font-semibold tracking-tight">Confirme seu e-mail</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Enviamos um link de confirmação para <strong>{email ?? "seu e-mail"}</strong>. Clique
              nele para ativar sua conta.
            </p>
            <button
              onClick={resend}
              className="mt-6 w-full rounded-md border border-border px-4 py-2 text-sm hover:bg-surface-alt"
            >
              Reenviar e-mail
            </button>
            <Link to="/auth/login" className="mt-3 block text-xs text-muted-foreground underline">
              Voltar para o login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
