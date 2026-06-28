import {
  createFileRoute,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { TabsList } from "@/components/ui/tabs";

export const Route = createFileRoute("/agency/$slug/portal")({
  head: () => ({
    meta: [
      { title: "Portal Público · TravelOS" },
      { name: "description", content: "CMS do portal público" },
    ],
  }),
  component: Page,
});

function Page() {
  const { slug } = useParams({ from: "/agency/$slug/portal" });
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { path: `/agency/${slug}/portal/pages`, label: "Páginas" },
    { path: `/agency/${slug}/portal/blog`, label: "Blog" },
    { path: `/agency/${slug}/portal/settings`, label: "Configurações" },
  ];

  const isEditor = /\/portal\/pages\/[^/]+$/.test(pathname) && !pathname.endsWith("/pages/");

  if (isEditor) {
    return <Outlet />;
  }

  return (
    <div className="flex h-[calc(100vh-var(--header-h))] flex-col overflow-hidden bg-background">
      {/* ── Top Bar de Ações e Sub-Navegação ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-2 bg-[var(--surface)] border-b shrink-0 gap-2">
        <TabsList className="h-8 bg-[var(--surface-alt)] rounded-lg p-0.5 flex-wrap gap-0">
          {tabs.map((tab) => {
            const active =
              pathname === tab.path ||
              (tab.path.endsWith("/pages") && pathname.includes("/portal/pages"));
            return (
              <button
                key={tab.path}
                type="button"
                onClick={() => navigate({ to: tab.path as any })}
                className={`inline-flex items-center justify-center h-7 px-2.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                  active
                    ? "bg-[var(--surface)] text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </TabsList>
      </div>
      <div className="flex-1 overflow-hidden min-h-0">
        <Outlet />
      </div>
    </div>
  );
}
