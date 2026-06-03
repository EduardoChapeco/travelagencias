import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { Field, Input, Select, PrimaryButton, GhostButton, Sheet, StatusBadge, fmtDate } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/team")({
  head: () => ({ meta: [{ title: "Equipe · TravelOS" }] }),
  component: TeamPage,
});

type Member = { user_id: string; role: string; created_at: string; full_name: string | null; avatar_url: string | null };
type Invite = { id: string; email: string; role: string; token: string; accepted_at: string | null; expires_at: string; created_at: string };

function TeamPage() {
  const { agency } = useAgency();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const members = useQuery({
    enabled: !!agency,
    queryKey: ["team-members", agency?.id],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("user_id, role, created_at")
        .eq("agency_id", agency!.id)
        .order("created_at");
      if (error) throw error;
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [] as Member[];
      const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids);
      const map = new Map((profs ?? []).map((p) => [p.id, p]));
      return (roles ?? []).map((r) => ({ ...r, full_name: map.get(r.user_id)?.full_name ?? null, avatar_url: map.get(r.user_id)?.avatar_url ?? null })) as Member[];
    },
  });

  const invites = useQuery({
    enabled: !!agency,
    queryKey: ["team-invites", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("agency_invites").select("id, email, role, token, accepted_at, expires_at, created_at").eq("agency_id", agency!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Invite[];
    },
  });

  async function changeRole(userId: string, role: string) {
    if (!agency) return;
    const { error } = await supabase.from("user_roles").update({ role: role as never }).eq("agency_id", agency.id).eq("user_id", userId);
    if (error) return toast.error(error.message);
    toast.success("Papel atualizado");
    qc.invalidateQueries({ queryKey: ["team-members", agency.id] });
  }

  async function removeMember(userId: string) {
    if (!agency || !confirm("Remover este membro?")) return;
    const { error } = await supabase.from("user_roles").delete().eq("agency_id", agency.id).eq("user_id", userId);
    if (error) return toast.error(error.message);
    toast.success("Removido");
    qc.invalidateQueries({ queryKey: ["team-members", agency.id] });
  }

  async function deleteInvite(id: string) {
    const { error } = await supabase.from("agency_invites").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["team-invites", agency?.id] });
  }

  function copyInvite(token: string) {
    const url = `${window.location.origin}/m/invite/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  }

  return (
    <>
      <PageHeader
        title="Equipe"
        description="Membros, papéis e convites pendentes."
        actions={
          <button onClick={() => setOpen(true)} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground">
            <Plus className="h-3.5 w-3.5" /> Convidar
          </button>
        }
      />

      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Membros</h3>
      {members.data?.length === 0 ? (
        <EmptyState title="Sem membros" description="Convide alguém para começar." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border mb-6">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt/40 text-left text-[11px] uppercase text-muted-foreground">
              <tr><th className="px-3 py-2">Nome</th><th className="px-3 py-2">Papel</th><th className="px-3 py-2">Entrou</th><th className="px-3 py-2"></th></tr>
            </thead>
            <tbody>
              {members.data?.map((m) => (
                <tr key={m.user_id} className="border-t border-border">
                  <td className="px-3 py-2.5 font-medium">{m.full_name ?? <span className="font-mono text-xs text-muted-foreground">{m.user_id.slice(0, 8)}…</span>}</td>
                  <td className="px-3 py-2.5">
                    <Select value={m.role} onChange={(e) => changeRole(m.user_id, e.target.value)} className="h-7 text-xs">
                      <option value="agency_admin">Admin</option>
                      <option value="agent">Agente</option>
                      <option value="agent_viewer">Visualizador</option>
                    </Select>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(m.created_at)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => removeMember(m.user_id)} className="text-xs text-destructive hover:underline inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /> Remover</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Convites</h3>
      {invites.data?.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nenhum convite pendente.</div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt/40 text-left text-[11px] uppercase text-muted-foreground">
              <tr><th className="px-3 py-2">Email</th><th className="px-3 py-2">Papel</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Expira</th><th className="px-3 py-2"></th></tr>
            </thead>
            <tbody>
              {invites.data?.map((i) => (
                <tr key={i.id} className="border-t border-border">
                  <td className="px-3 py-2.5 font-medium">{i.email}</td>
                  <td className="px-3 py-2.5 text-xs">{i.role}</td>
                  <td className="px-3 py-2.5"><StatusBadge tone={i.accepted_at ? "success" : "warning"}>{i.accepted_at ? "aceito" : "pendente"}</StatusBadge></td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(i.expires_at)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {!i.accepted_at && <button onClick={() => copyInvite(i.token)} className="text-xs text-primary hover:underline inline-flex items-center gap-1"><Copy className="h-3 w-3" /> Link</button>}
                      <button onClick={() => deleteInvite(i.id)} className="text-xs text-destructive hover:underline">Cancelar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && agency && <NewInvite agencyId={agency.id} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["team-invites", agency.id] }); }} />}
    </>
  );
}

function NewInvite({ agencyId, onClose, onCreated }: { agencyId: string; onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("agent");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("agency_invites").insert({
      agency_id: agencyId, email: email.trim().toLowerCase(), role: role as never, invited_by: u.user?.id ?? null,
    }).select("token").maybeSingle();
    setSubmitting(false);
    if (error) return toast.error(error.message);
    if (data?.token) {
      const url = `${window.location.origin}/m/invite/${data.token}`;
      navigator.clipboard.writeText(url);
      toast.success("Convite criado · link copiado");
    }
    onCreated();
  }

  return (
    <Sheet onClose={onClose} title="Convidar membro">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Email *"><Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Papel">
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="agency_admin">Admin</option>
            <option value="agent">Agente</option>
            <option value="agent_viewer">Visualizador</option>
          </Select>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>{submitting ? "Criando…" : "Criar convite"}</PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
