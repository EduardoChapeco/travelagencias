import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import {
  fetchClientNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/services/client-area";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { GhostButton } from "@/components/ui/button";

export const Route = createFileRoute("/client/notifications")({
  head: ({ context }: any) => ({ meta: [{ title: `Notificações · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchClientNotifications(),
  });

  async function markRead(id: string) {
    await markNotificationRead(id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }
  async function markAll() {
    const ids = q.data?.filter((n) => !n.read_at).map((n) => n.id) ?? [];
    if (!ids.length) return;
    await markAllNotificationsRead(ids);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  const unread = q.data?.filter((n) => !n.read_at).length ?? 0;

  return (
    <>
      <PageHeader
        title="Notificações"
        description={unread ? `${unread} não lida${unread > 1 ? "s" : ""}` : "Tudo em dia"}
        actions={
          unread > 0 ? <GhostButton onClick={markAll}>Marcar tudo como lido</GhostButton> : null
        }
      />
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : q.data?.length === 0 ? (
        <EmptyState
          title="Nenhuma notificação"
          description="Você verá aqui atualizações sobre suas viagens."
        />
      ) : (
        <ul className="space-y-2">
          {q.data?.map((n) => (
            <li
              key={n.id}
              className={`flex items-start gap-3 rounded-[var(--radius-card)] border p-4 ${n.read_at ? "border-border glass-card border-none" : "border-primary/40 bg-primary/5"}`}
            >
              <div className="flex-1">
                <div className="font-medium">{n.title}</div>
                {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
                <div className="mt-2 text-[11px] text-muted-foreground">
                  {new Date(n.created_at).toLocaleString("pt-BR")}
                </div>
              </div>
              {!n.read_at && (
                <button
                  onClick={() => markRead(n.id)}
                  className="rounded p-1 hover:glass bg-white/5 border-white/10"
                  title="Marcar como lida"
                >
                  <Check className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
