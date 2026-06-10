import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useLocation,
  useParams,
} from "@tanstack/react-router";
import { PageHeader } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/financial")({
  head: () => ({ meta: [{ title: "Financeiro · TravelOS" }] }),
  beforeLoad: ({ location, params }) => {
    const p = location.pathname.replace(/\/$/, "");
    if (p.endsWith("/financial")) {
      throw redirect({ to: "/agency/$slug/financial/cash", params: { slug: params.slug } });
    }
  },
  component: FinancialLayout,
});

function FinancialLayout() {
  const { slug } = useParams({ from: "/agency/$slug/financial" });
  const { pathname } = useLocation();

  const tabs = [
    { to: "/agency/$slug/financial/cash", label: "Fluxo de caixa" },
    { to: "/agency/$slug/financial/dre", label: "DRE" },
    { to: "/agency/$slug/financial/invoices", label: "Faturas" },
  ] as const;

  return (
    <>
      <PageHeader
        title="Financeiro"
        description="Entradas, saídas, faturas e demonstrativo de resultados."
      />
      <div className="mb-5 flex items-center gap-1 border-b border-border">
        {tabs.map((t) => {
          const active = pathname.endsWith(t.to.split("/").pop()!);
          return (
            <Link
              key={t.to}
              to={t.to}
              params={{ slug }}
              className={`-mb-px border-b-2 px-3 py-2 text-xs font-medium transition ${
                active
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </>
  );
}
