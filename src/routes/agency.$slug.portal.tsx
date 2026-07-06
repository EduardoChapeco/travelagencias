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
      { title: "Portal Público · Turis" },
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
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Top Bar de Ações e Sub-Navegação ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 md:pl-[64px] md:pr-6 py-3 bg-transparent shrink-0 gap-2 no-margin-bottom">
        <TabsList className="flex glass-pill p-0.5 text-xs gap-0.5 shrink-0 flex-nowrap">
          {tabs.map((tab) => {
            const active =
              pathname === tab.path ||
              (tab.path.endsWith("/pages") && pathname.includes("/portal/pages"));
            return (
              <button
                key={tab.path}
                type="button"
                onClick={() => navigate({ to: tab.path as any })}
                className={`inline-flex items-center justify-center h-7 px-3 text-[11px] font-semibold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? "bg-white/10 text-white border border-white/5 shadow-xs"
                    : "text-white/60 hover:text-white"
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
