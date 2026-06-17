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
import { HeaderPortal } from "@/components/shell/HeaderPortal";
import { ModuleAdminPanel } from "@/components/shell/ModuleAdminPanel";
import { Settings2 } from "lucide-react";

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
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);

  const tabs = [
    { to: "/agency/$slug/financial/cash", label: "Fluxo de caixa" },
    { to: "/agency/$slug/financial/dre", label: "DRE" },
    { to: "/agency/$slug/financial/invoices", label: "Faturas" },
  ] as const;

  return (
    <div className="flex h-[calc(100vh-var(--header-h))] flex-col overflow-hidden bg-background">
      <HeaderPortal>
        <div className="flex items-center gap-2">
          {isAgencyAdmin && (
            <button
              onClick={() => setAdminPanelOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-foreground hover:bg-surface-alt transition-colors cursor-pointer"
              title="Administrar Módulo"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </HeaderPortal>

      <ModuleAdminPanel
        isOpen={adminPanelOpen}
        onClose={() => setAdminPanelOpen(false)}
        moduleName="Financeiro"
        moduleKey="financial"
        agencyId={agency?.id || ""}
      />

      <div className="flex h-12 items-center gap-1 border-b border-border bg-surface/50 px-4 md:px-6 shrink-0 overflow-x-auto no-scrollbar flex-nowrap whitespace-nowrap">
        {tabs.map((t) => {
          const active = pathname.endsWith(t.to.split("/").pop()!);
          return (
            <Link
              key={t.to}
              to={t.to}
              params={{ slug }}
              className={`-mb-px border-b-2 px-3 py-2.5 text-xs font-semibold transition shrink-0 ${
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
      <div className="flex-1 overflow-hidden min-h-0">
        <Outlet />
      </div>
    </div>
  );
}
