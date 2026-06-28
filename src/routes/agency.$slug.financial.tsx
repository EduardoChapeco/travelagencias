import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useLocation,
  useParams,
} from "@tanstack/react-router";

import { useState } from "react";
import { useAgency } from "@/lib/agency-context";
import { ModuleAdminPanel } from "@/components/shell/ModuleAdminPanel";
import { TabsList } from "@/components/ui/tabs";

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
  const { agency, isAgencyAdmin } = useAgency();
  const [activeSubTab, setActiveSubTab] = useState<"route" | "settings">("route");

  const tabs = [
    { to: "/agency/$slug/financial/cash" as any, label: "Fluxo de caixa" },
    { to: "/agency/$slug/financial/reconciliation" as any, label: "Conciliação diária" },
    { to: "/agency/$slug/financial/dre" as any, label: "DRE" },
    { to: "/agency/$slug/financial/invoices" as any, label: "Faturas" },
    { to: "/agency/$slug/financial/groups" as any, label: "Grupos e Excursões" },
    { to: "/agency/$slug/financial/ledger" as any, label: "Livro-Razão" },
  ] as const;

  return (
    <div className="flex h-[calc(100vh-var(--header-h))] flex-col overflow-hidden bg-background">
      {/* ── Top Bar de Ações e Sub-Navegação ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-2 bg-[var(--surface)] border-b shrink-0 gap-2">
        <TabsList className="h-8 bg-[var(--surface-alt)] rounded-lg p-0.5 flex-wrap gap-0">
          {tabs.map((t) => {
            const active = activeSubTab === "route" && pathname.endsWith(t.to.split("/").pop()!);
            return (
              <Link
                key={t.to}
                to={t.to}
                params={{ slug } as any}
                onClick={() => setActiveSubTab("route")}
                className={`inline-flex items-center justify-center h-7 px-2.5 text-[11px] font-semibold rounded-md transition-all ${
                  active
                    ? "bg-[var(--surface)] text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
          {isAgencyAdmin && (
            <button
              onClick={() => setActiveSubTab("settings")}
              className={`inline-flex items-center justify-center h-7 px-2.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                activeSubTab === "settings"
                  ? "bg-[var(--surface)] text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Configurações
            </button>
          )}
        </TabsList>
      </div>

      {activeSubTab === "route" ? (
        <div className="flex-1 overflow-hidden min-h-0">
          <Outlet />
        </div>
      ) : (
        agency && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
            <ModuleAdminPanel
              moduleKey="financial"
              moduleName="Financeiro"
              agencyId={agency.id}
              isInline={true}
            />
          </div>
        )
      )}
    </div>
  );
}
