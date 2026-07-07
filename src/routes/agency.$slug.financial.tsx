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

import { useSidebarStore } from "@/lib/sidebar-store";
import { DollarSign, FileText, Settings, Target, Users, BookOpen } from "lucide-react";
import { useEffect } from "react";

function FinancialLayout() {
  const { slug } = useParams({ from: "/agency/$slug/financial" });
  const { pathname } = useLocation();
  const { agency, isAgencyAdmin } = useAgency();
  const [activeSubTab, setActiveSubTab] = useState<"route" | "settings">("route");
  const { setContext, clearContext } = useSidebarStore();

  const tabs = [
    { to: "/agency/$slug/financial/cash" as any, label: "Fluxo de caixa" },
    { to: "/agency/$slug/financial/reconciliation" as any, label: "Conciliação" },
    { to: "/agency/$slug/financial/dre" as any, label: "DRE" },
    { to: "/agency/$slug/financial/invoices" as any, label: "Faturas" },
    { to: "/agency/$slug/financial/groups" as any, label: "Grupos e Excursões" },
    { to: "/agency/$slug/financial/ledger" as any, label: "Livro-Razão" },
    { to: "/agency/$slug/financial/operators" as any, label: "Faturamento" },
  ] as const;

  useEffect(() => {
    const items = [
      { label: "Caixa", to: `/agency/${slug}/financial/cash`, icon: DollarSign },
      { label: "DRE", to: `/agency/${slug}/financial/dre`, icon: Target },
      { label: "Faturas", to: `/agency/${slug}/financial/invoices`, icon: FileText },
      { label: "Grupos", to: `/agency/${slug}/financial/groups`, icon: Users },
      { label: "Livro-Razão", to: `/agency/${slug}/financial/ledger`, icon: BookOpen },
    ];
    setContext("Financeiro", items);
    return () => clearContext();
  }, [slug, setContext, clearContext]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Sub-Navegação movida para o Sidebar Contextual ── */}

      {activeSubTab === "route" ? (
        <div className="flex-1 overflow-hidden min-h-0">
          <Outlet />
        </div>
      ) : (
        agency && (
          <div className="flex-1 overflow-y-auto px-4 md:pl-[64px] md:pr-6 py-4">
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
