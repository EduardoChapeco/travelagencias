import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { fetchPublicAgencyLayout } from "@/services/public";

export const Route = createFileRoute("/p/$agency_slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.agency_slug} · Portal` },
      { name: "description", content: "Portal público da agência" },
    ],
  }),
  component: Layout,
});

type NavLink = { label: string; url: string };

function resolveLink(url: string, agencySlug: string) {
  const cleanUrl = url.trim();

  // External links / Anchors
  if (
    cleanUrl.startsWith("http://") ||
    cleanUrl.startsWith("https://") ||
    cleanUrl.startsWith("mailto:") ||
    cleanUrl.startsWith("tel:") ||
    cleanUrl.startsWith("#")
  ) {
    return { isExternal: true, href: cleanUrl };
  }

  // Resolve relative paths
  let path = cleanUrl;
  if (path.startsWith("/")) {
    path = path.slice(1);
  }

  const prefix = `p/${agencySlug}/`;
  if (path.startsWith(prefix)) {
    path = path.slice(prefix.length);
  } else if (path.startsWith(`p/${agencySlug}`)) {
    path = "";
  }

  if (path === "" || path === "home") {
    return {
      isExternal: false,
      to: "/p/$agency_slug" as const,
      params: { agency_slug: agencySlug },
      activeOptions: { exact: true },
    };
  }

  if (path === "contact") {
    return {
      isExternal: false,
      to: "/p/$agency_slug/contact" as const,
      params: { agency_slug: agencySlug },
    };
  }

  return {
    isExternal: false,
    to: "/p/$agency_slug/$page_slug" as const,
    params: { agency_slug: agencySlug, page_slug: path },
  };
}

function Layout() {
  const { agency_slug } = Route.useParams();

  const q = useQuery({
    queryKey: ["portal-layout", agency_slug],
    queryFn: () => fetchPublicAgencyLayout(agency_slug as string),
  });

  const agency = q.data?.agency;
  const pages = q.data?.pages || [];
  const settings = q.data?.settings;

  useEffect(() => {
    if (!settings) return;

    // 1. Google Analytics
    if (settings.analytics_id && !document.getElementById("gtag-script")) {
      const script1 = document.createElement("script");
      script1.id = "gtag-script";
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${settings.analytics_id}`;
      document.head.appendChild(script1);

      const script2 = document.createElement("script");
      script2.id = "gtag-init";
      script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${settings.analytics_id}');
      `;
      document.head.appendChild(script2);
    }

    // 2. Meta Pixel
    if (settings.meta_pixel_id && !document.getElementById("meta-pixel-script")) {
      const script = document.createElement("script");
      script.id = "meta-pixel-script";
      script.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${settings.meta_pixel_id}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(script);
    }

    // 3. Custom head script
    if (settings.custom_head_script && !document.getElementById("custom-head-script")) {
      const wrapper = document.createElement("div");
      wrapper.id = "custom-head-script";
      wrapper.innerHTML = settings.custom_head_script;
      Array.from(wrapper.childNodes).forEach((node) => {
        if (node instanceof HTMLScriptElement) {
          const script = document.createElement("script");
          if (node.src) script.src = node.src;
          script.innerHTML = node.innerHTML;
          document.head.appendChild(script);
        } else {
          document.head.appendChild(node.cloneNode(true));
        }
      });
    }
  }, [settings]);

  if (q.isLoading)
    return <div className="p-10 text-center text-sm text-muted-foreground">Carregando…</div>;
  if (!agency) return <div className="p-10 text-center text-sm">Agência não encontrada</div>;

  const headerStyle = settings?.header_style || "full";

  // Build nav links
  const navLinks: NavLink[] =
    settings?.nav_links && Array.isArray(settings.nav_links) && settings.nav_links.length > 0
      ? settings.nav_links
      : [
          { label: "Home", url: `/p/${agency_slug}` },
          ...pages
            .map((p) => ({
              label: p.title,
              url: p.slug === "home" ? `/p/${agency_slug}` : `/p/${agency_slug}/${p.slug}`,
            }))
            .filter((l) => l.label !== "Home"),
        ];

  // Build footer links
  const footerLinks: NavLink[] =
    settings?.footer_links && Array.isArray(settings.footer_links) ? settings.footer_links : [];

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      style={
        {
          "--agency-brand": agency.brand_color || "#18181b",
          "--agency-brand-fg": agency.brand_color_fg || "#ffffff",
        } as React.CSSProperties
      }
    >
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          {/* Logo / Brand Name */}
          <div className={headerStyle === "minimal" ? "mx-auto" : "flex items-center gap-3"}>
            <Link to="/p/$agency_slug" params={{ agency_slug }} className="flex items-center gap-3">
              {agency.logo_url && (
                <img
                  src={agency.logo_url}
                  alt={agency.name}
                  className="h-8 w-8 rounded-md object-cover"
                />
              )}
              <span className="font-bold tracking-tight">{agency.name}</span>
            </Link>
          </div>

          {/* Navigation Links - Hidden on 'minimal' style */}
          {headerStyle !== "minimal" && (
            <nav className="flex items-center gap-6 text-sm font-medium">
              {navLinks.map((link, i) => {
                const resolved = resolveLink(link.url, agency_slug);
                if (resolved.isExternal) {
                  return (
                    <a
                      key={i}
                      href={resolved.href!}
                      className="hover:text-brand transition-colors"
                      target={resolved.href!.startsWith("#") ? undefined : "_blank"}
                      rel="noopener noreferrer"
                    >
                      {link.label}
                    </a>
                  );
                }

                return (
                  <Link
                    key={i}
                    to={resolved.to as any}
                    params={resolved.params as any}
                    className="hover:text-brand transition-colors"
                    activeProps={{ className: "text-brand" }}
                    activeOptions={resolved.activeOptions}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* CTA Button - Only visible on 'full' header style */}
          {headerStyle === "full" && settings?.header_cta_label && (
            <div className="flex items-center gap-4">
              {(() => {
                const resolvedCta = resolveLink(settings.header_cta_url || "#contact", agency_slug);
                if (resolvedCta.isExternal) {
                  return (
                    <a
                      href={resolvedCta.href!}
                      className="rounded-md bg-brand px-3.5 py-1.5 text-xs font-semibold text-brand-foreground hover:bg-brand/90 transition-colors shadow-none"
                    >
                      {settings.header_cta_label}
                    </a>
                  );
                }
                return (
                  <Link
                    to={resolvedCta.to as any}
                    params={resolvedCta.params as any}
                    className="rounded-md bg-brand px-3.5 py-1.5 text-xs font-semibold text-brand-foreground hover:bg-brand/90 transition-colors shadow-none"
                  >
                    {settings.header_cta_label}
                  </Link>
                );
              })()}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-surface py-12 mt-auto">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {settings?.footer_text ||
              `© ${new Date().getFullYear()} ${agency.name}. Todos os direitos reservados.`}
          </p>

          {footerLinks.length > 0 && (
            <div className="flex items-center gap-6 text-sm">
              {footerLinks.map((link, i) => {
                const resolved = resolveLink(link.url, agency_slug);
                if (resolved.isExternal) {
                  return (
                    <a
                      key={i}
                      href={resolved.href!}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.label}
                    </a>
                  );
                }
                return (
                  <Link
                    key={i}
                    to={resolved.to as any}
                    params={resolved.params as any}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    activeProps={{ className: "text-brand" }}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
