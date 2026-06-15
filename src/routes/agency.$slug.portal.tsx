import {
  createFileRoute,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { PageHeader } from "@/components/shell/PageHeader";

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

  return (
    <>
      <PageHeader title="Portal Público" description="CMS do portal público" />
      <div className="mb-5 flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => {
          const active = pathname === tab.path;
          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => navigate({ to: tab.path as any })}
              className={`-mb-px border-b-2 px-3 py-2 text-xs font-medium transition ${
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
      <Outlet />
    </>
  );
}
