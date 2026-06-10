import { createFileRoute, Link, Outlet, useLocation, useParams } from "@tanstack/react-router";
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
  const tabs = [
    { to: "/agency/$slug/portal/pages", label: "Páginas" },
    { to: "/agency/$slug/portal/blog", label: "Blog" },
  ] as const;

  return (
    <>
      <PageHeader title="Portal Público" description="CMS do portal público" />
      <div className="mb-5 flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => {
          const active = pathname === tab.to.replace("$slug", slug);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              params={{ slug }}
              className={`-mb-px border-b-2 px-3 py-2 text-xs font-medium transition ${
                active
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </>
  );
}
