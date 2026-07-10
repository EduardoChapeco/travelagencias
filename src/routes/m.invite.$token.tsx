import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PrimaryButton, GhostButton } from "@/components/ui/button";

export const Route = createFileRoute("/m/invite/$token")({
  head: ({ context }: any) => ({ meta: [{ title: `Aceitar convite · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const { token } = useParams({ from: "/m/invite/$token" });
  const navigate = useNavigate();
  const [invite, setInvite] = useState<{
    email: string;
    role: string;
    accepted_at: string | null;
    expires_at: string;
    agency_id: string;
  } | null>(null);
  const [agencyName, setAgencyName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("agency_invites")
        .select("email, role, accepted_at, expires_at, agency_id")
        .eq("token", token)
        .maybeSingle();
      setInvite(data);
      if (data) {
        const { data: a } = await supabase
          .rpc("get_public_agency_by_id", { _id: data.agency_id })
          .maybeSingle();
        setAgencyName(a?.name ?? "");
      }
      const { data: u } = await supabase.auth.getUser();
      setUserEmail(u.user?.email ?? null);
      setLoading(false);
    })();
  }, [token]);

  async function accept() {
    setSubmitting(true);
    const { data, error } = await supabase.rpc("accept_agency_invite", { _token: token });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Convite aceito");
    const { data: a } = await supabase
      .rpc("get_public_agency_by_id", { _id: data as unknown as string })
      .maybeSingle();
    if (a?.slug) navigate({ to: "/agency/$slug", params: { slug: a.slug } });
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Carregando convite…</div>;
  if (!invite)
    return <div className="p-8 text-sm text-destructive">Convite inválido ou expirado.</div>;

  const expired = new Date(invite.expires_at) < new Date();
  const emailMismatch = userEmail && userEmail.toLowerCase() !== invite.email.toLowerCase();

  return (
    <div className="mx-auto mt-16 max-w-md rounded-[var(--radius-card)] border-none glass-card border-none p-6">
      <h1 className="text-xl font-semibold">Convite para {agencyName || "a agência"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Você foi convidado para entrar como <strong>{invite.role}</strong> usando o email{" "}
        <strong>{invite.email}</strong>.
      </p>

      {invite.accepted_at && (
        <div className="mt-4 rounded bg-success/10 p-3 text-sm">Este convite já foi aceito.</div>
      )}
      {expired && (
        <div className="mt-4 rounded bg-destructive/10 p-3 text-sm">Este convite expirou.</div>
      )}

      {!userEmail && !invite.accepted_at && !expired && (
        <div className="mt-4 space-y-3">
          <div className="rounded bg-warning/10 p-3 text-sm">
            Entre ou cadastre-se com o email <strong>{invite.email}</strong> para aceitar.
          </div>
          <GhostButton onClick={() => navigate({ to: "/auth/login" })}>Entrar</GhostButton>
          <PrimaryButton onClick={() => navigate({ to: "/auth/register" })}>
            Criar conta
          </PrimaryButton>
        </div>
      )}

      {userEmail && emailMismatch && (
        <div className="mt-4 rounded bg-destructive/10 p-3 text-sm">
          Você está logado como {userEmail}. Saia e entre com {invite.email}.
        </div>
      )}

      {userEmail && !emailMismatch && !invite.accepted_at && !expired && (
        <PrimaryButton onClick={accept} disabled={submitting} className="mt-4 w-full">
          {submitting ? "Aceitando…" : "Aceitar convite"}
        </PrimaryButton>
      )}
    </div>
  );
}
