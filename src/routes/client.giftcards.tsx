import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchClientGiftCards } from "@/services/client-area";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { StatusBadge, money } from "@/components/ui/form";

export const Route = createFileRoute("/client/giftcards")({
  head: () => ({ meta: [{ title: "Gift cards · TravelOS" }] }),
  component: Page,
});

function Page() {
  const q = useQuery({
    queryKey: ["client-giftcards"],
    queryFn: () => fetchClientGiftCards(),
  });

  return (
    <>
      <PageHeader title="Gift cards" description="Comprados e resgatados por você" />
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : q.data?.length === 0 ? (
        <EmptyState
          title="Nenhum gift card"
          description="Você ainda não comprou ou resgatou gift cards."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {q.data?.map((g) => (
            <div
              key={g.id}
              className="rounded-lg border border-border bg-brand/5 p-5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs">{g.code}</span>
                <StatusBadge tone={g.status === "active" ? "success" : "neutral"}>
                  {g.status}
                </StatusBadge>
              </div>
              <div className="mt-4 text-3xl font-semibold">
                {money(Number(g.balance), g.currency)}
              </div>
              <div className="text-xs text-muted-foreground">
                de {money(Number(g.initial_value), g.currency)}
              </div>
              {g.recipient_name && <div className="mt-3 text-sm">Para: {g.recipient_name}</div>}
              {g.message && <p className="mt-2 italic text-xs">"{g.message}"</p>}
              {g.expires_at && (
                <div className="mt-3 text-[11px] text-muted-foreground">
                  Expira {new Date(g.expires_at).toLocaleDateString("pt-BR")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
