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
import { Tabs, TabsList } from "@/components/ui/tabs";

export const Route = createFileRoute("/agency/$slug/financial")({
  head: ({ context }: any) => ({ meta: [{ title: `Financeiro · ${context?.brand?.platform_name || 'Turis'}` }] }),
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
    { to: "/agency/$slug/financial/operators" as any, label: "Faturamento Operadoras" },
  ] as const;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Top Bar de Ações e Sub-Navegação ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between border-b border-border bg-surface/50 px-4 md:px-6 py-3 shrink-0 no-margin-bottom">
        <Tabs defaultValue="cash" className="w-auto">
          <TabsList className="h-8 bg-white/5 border border-white/5 rounded-full p-0.5 flex-wrap gap-0">
            {tabs.map((t) => {
              const active = activeSubTab === "route" && pathname.endsWith(t.to.split("/").pop()!);
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  params={{ slug } as any}
                  onClick={() => setActiveSubTab("route")}
                  className={`inline-flex items-center justify-center h-7 px-2.5 text-[11px] font-semibold rounded-full transition-all cursor-pointer ${
                    active
                      ? "bg-white/10 text-white border border-white/5 shadow-xs"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
            {isAgencyAdmin && (
              <button
                onClick={() => setActiveSubTab("settings")}
                className={`inline-flex items-center justify-center h-7 px-2.5 text-[11px] font-semibold rounded-full transition-all cursor-pointer ${
                  activeSubTab === "settings"
                    ? "bg-white/10 text-white border border-white/5 shadow-xs"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Configurações
              </button>
            )}
          </TabsList>
        </Tabs>
      </div>

      {activeSubTab === "route" ? (
        <div className="flex-1 overflow-hidden min-h-0">
          <Outlet />
        </div>
      ) : (
        agency && (
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
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
