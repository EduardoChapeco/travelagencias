import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchClientCoupons } from "@/services/client-area";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { StatusBadge } from "@/components/ui/form";

export const Route = createFileRoute("/client/coupons")({
  head: ({ context }: any) => ({ meta: [{ title: `Cupons · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: Page,
});

function Page() {
  const q = useQuery({
    queryKey: ["client-coupons"],
    queryFn: () => fetchClientCoupons(),
  });

  return (
    <>
      <PageHeader
        title="Cupons disponíveis"
        description="Códigos promocionais ativos da sua agência"
      />
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : q.data?.length === 0 ? (
        <EmptyState
          title="Nenhum cupom disponível"
          description="Quando sua agência criar promoções, elas aparecerão aqui."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {q.data?.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-dashed border-border bg-surface p-4"
            >
              <div className="flex items-center justify-between">
                <span className="rounded bg-primary/10 px-3 py-1 font-mono text-sm font-semibold text-primary">
                  {c.code}
                </span>
                <StatusBadge tone="success">Ativo</StatusBadge>
              </div>
              <div className="mt-3 text-2xl font-semibold">
                {c.kind === "percent"
                  ? `${c.value}% OFF`
                  : Number(c.value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </div>
              {c.description && (
                <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>
              )}
              {c.min_purchase && (
                <div className="mt-2 text-[11px] text-muted-foreground">
                  Mínimo{" "}
                  {Number(c.min_purchase).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </div>
              )}
              {c.expires_at && (
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Válido até {new Date(c.expires_at).toLocaleDateString("pt-BR")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
