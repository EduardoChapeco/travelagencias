import {
  createFileRoute,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "@tanstack/react-router";


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

  const isEditor = /\/portal\/pages\/[^\/]+$/.test(pathname) && !pathname.endsWith("/pages/");

  if (isEditor) {
    return <Outlet />;
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col overflow-hidden bg-background">
      <div className="flex items-center gap-1 border-b border-border bg-surface/50 px-4 shrink-0 overflow-x-auto no-scrollbar flex-nowrap whitespace-nowrap">
        {tabs.map((tab) => {
          const active = pathname === tab.path || (tab.path.endsWith("/pages") && pathname.includes("/portal/pages"));
          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => navigate({ to: tab.path as any })}
              className={`-mb-px border-b-2 px-3 py-2.5 text-xs font-semibold transition shrink-0 ${
                active
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-hidden min-h-0">
        <Outlet />
      </div>
    </div>
  );
}
