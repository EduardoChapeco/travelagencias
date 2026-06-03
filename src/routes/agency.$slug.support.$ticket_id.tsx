import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { Select, Textarea, PrimaryButton, StatusBadge, fmtDate } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/support/$ticket_id")({
  head: () => ({ meta: [{ title: "Ticket · TravelOS" }] }),
  component: TicketDetail,
});

type Msg = { id: string; author_id: string | null; author_name?: string; body: string; created_at: string };
type Ticket = {
  id: string; code: string; title: string; description: string | null; type: string;
  priority: string; status: string; created_at: string; sla_deadline: string | null;
  messages: Msg[];
};

function TicketDetail() {
  const { slug, ticket_id } = useParams({ from: "/agency/$slug/support/$ticket_id" });
  const { agency } = useAgency();
  const qc = useQueryClient();
  const [reply, setReply] = useState("");

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["ticket", ticket_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, code, title, description, type, priority, status, created_at, sla_deadline, messages")
        .eq("id", ticket_id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Ticket | null;
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<Ticket>) => {
      const { error } = await supabase.from("support_tickets").update(patch as never).eq("id", ticket_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ticket", ticket_id] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  async function postReply() {
    if (!reply.trim() || !q.data) return;
    const { data: u } = await supabase.auth.getUser();
    const msg: Msg = {
      id: crypto.randomUUID(),
      author_id: u.user?.id ?? null,
      author_name: u.user?.email ?? "Agente",
      body: reply.trim(),
      created_at: new Date().toISOString(),
    };
    const next = [...(q.data.messages ?? []), msg];
    const { error } = await supabase.from("support_tickets").update({ messages: next as never, status: q.data.status === "open" ? "in_progress" : q.data.status }).eq("id", ticket_id);
    if (error) return toast.error(error.message);
    setReply("");
    qc.invalidateQueries({ queryKey: ["ticket", ticket_id] });
  }

  if (q.isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  if (!q.data) return <div className="text-sm text-muted-foreground">Ticket não encontrado.</div>;
  const t = q.data;

  return (
    <>
      <Link to="/agency/$slug/support" params={{ slug }} className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{t.code}</span>
            <StatusBadge tone={t.priority === "urgent" || t.priority === "high" ? "danger" : "warning"}>{t.priority}</StatusBadge>
            <StatusBadge tone={t.status === "resolved" ? "success" : t.status === "in_progress" ? "info" : "warning"}>{t.status}</StatusBadge>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{t.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">Aberto em {fmtDate(t.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={t.status} onChange={(e) => update.mutate({ status: e.target.value })} className="w-40">
            <option value="open">open</option>
            <option value="in_progress">in_progress</option>
            <option value="waiting_client">waiting_client</option>
            <option value="resolved">resolved</option>
            <option value="cancelled">cancelled</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <section className="rounded-lg border border-border bg-surface p-5">
          {t.description && (
            <div className="mb-4 rounded-md border border-border bg-surface-alt/40 p-3 text-sm">
              <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Descrição</div>
              <p className="whitespace-pre-wrap">{t.description}</p>
            </div>
          )}

          <h2 className="mb-2 text-sm font-semibold">Conversa</h2>
          <div className="space-y-3">
            {(t.messages ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">Sem mensagens ainda.</p>
            )}
            {(t.messages ?? []).map((m) => (
              <div key={m.id} className="rounded-md border border-border p-3">
                <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground">{m.author_name ?? "Agente"}</span>
                  <span>{fmtDate(m.created_at)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{m.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2 border-t border-border pt-4">
            <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Escreva uma resposta…" />
            <div className="flex justify-end">
              <PrimaryButton type="button" onClick={postReply} disabled={!reply.trim()}>
                <Send className="mr-1.5 inline h-3.5 w-3.5" /> Enviar
              </PrimaryButton>
            </div>
          </div>
        </section>

        <aside className="space-y-3 text-xs">
          <Card label="Tipo" value={t.type} />
          <Card label="SLA" value={fmtDate(t.sla_deadline)} />
        </aside>
      </div>
    </>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
