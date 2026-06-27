import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchPublicDynamicPage, fetchPublicDynamicPageSeo } from "@/services/public";
import { BlockRenderer, PortalBlock } from "@/components/portal/BlockRenderer";
import { GhostButton } from "@/components/ui/form";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AILandingAgent } from "@/components/portal/AILandingAgent";

export const Route = createFileRoute("/p/$agency_slug/$page_slug")({
  head: ({ params, context }: any) => {
    const seo = context?.pageSeo as { meta_title?: string; meta_description?: string } | null;
    return {
      meta: [
        {
          title: seo?.meta_title ? `${seo.meta_title} · Portal` : `${params.page_slug} · Portal`,
        },
        ...(seo?.meta_description ? [{ name: "description", content: seo.meta_description }] : []),
      ],
    };
  },
  loader: async ({ params }: any) => {
    return { pageSeo: await fetchPublicDynamicPageSeo(params.agency_slug, params.page_slug) };
  },
  component: DynamicPage,
});

function DynamicPage() {
  const { agency_slug, page_slug } = Route.useParams();

  const q = useQuery({
    queryKey: ["portal-page", agency_slug, page_slug],
    queryFn: () => fetchPublicDynamicPage(agency_slug as string, page_slug as string),
  });

  const page = q.data?.page;
  const agency = q.data?.agency;

  // Track page view event
  useEffect(() => {
    if (page && agency) {
      const deviceType = /iPad|iPhone|Android/i.test(navigator.userAgent) ? "mobile" : "desktop";
      supabase
        .from("portal_page_analytics")
        .insert({
          page_id: page.id,
          agency_id: agency.id,
          event_type: "view",
          device_type: deviceType,
        })
        .then(({ error }) => {
          if (error) console.error("Error logging page view:", error.message);
        });
    }
  }, [page?.id, agency?.id]);

  // Page-level Tracking & Scripts injection
  useEffect(() => {
    if (!page) return;

    const pageSeo = page.seo as any;
    if (!pageSeo) return;

    const scriptElements: HTMLScriptElement[] = [];
    const divElements: HTMLDivElement[] = [];

    // 1. Page-level Google Analytics
    if (pageSeo.google_analytics_id) {
      const gaId = pageSeo.google_analytics_id.trim();
      const scriptSrcId = `page-gtag-src-${page.id}`;
      const scriptInitId = `page-gtag-init-${page.id}`;

      // Clean up previous elements if they exist (prevents state-sync issues)
      const oldSrc = document.getElementById(scriptSrcId);
      if (oldSrc && oldSrc.parentNode) oldSrc.parentNode.removeChild(oldSrc);
      const oldInit = document.getElementById(scriptInitId);
      if (oldInit && oldInit.parentNode) oldInit.parentNode.removeChild(oldInit);

      const script1 = document.createElement("script");
      script1.id = scriptSrcId;
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      document.head.appendChild(script1);
      scriptElements.push(script1);

      const script2 = document.createElement("script");
      script2.id = scriptInitId;
      script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${gaId}');
      `;
      document.head.appendChild(script2);
      scriptElements.push(script2);
    }

    // 2. Page-level Meta Pixel
    if (pageSeo.fb_pixel_id) {
      const pixelId = pageSeo.fb_pixel_id.trim();
      const pixelScriptId = `page-pixel-script-${page.id}`;

      // Clean up previous elements if they exist (prevents state-sync/hot-reload issues)
      const oldPixel = document.getElementById(pixelScriptId);
      if (oldPixel && oldPixel.parentNode) oldPixel.parentNode.removeChild(oldPixel);

      const script = document.createElement("script");
      script.id = pixelScriptId;
      script.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${pixelId}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(script);
      scriptElements.push(script);
    }

    // 3. Page-level Custom scripts
    if (pageSeo.custom_scripts) {
      const customScriptsId = `page-custom-scripts-${page.id}`;

      // Clean up previous elements if they exist (prevents state-sync/hot-reload issues)
      const oldCustom = document.getElementById(customScriptsId);
      if (oldCustom && oldCustom.parentNode) oldCustom.parentNode.removeChild(oldCustom);

      const wrapper = document.createElement("div");
      wrapper.id = customScriptsId;
      wrapper.innerHTML = pageSeo.custom_scripts;
      document.body.appendChild(wrapper);
      divElements.push(wrapper);

      // Execute any script tags nested within the custom_scripts markup
      Array.from(wrapper.getElementsByTagName("script")).forEach((oldScript) => {
        const newScript = document.createElement("script");
        Array.from(oldScript.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });
        newScript.innerHTML = oldScript.innerHTML;
        document.body.appendChild(newScript);
        scriptElements.push(newScript);
      });
    }

    // Cleanup scripts on unmount or page change
    return () => {
      scriptElements.forEach((el) => {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
      divElements.forEach((el) => {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
    };
  }, [page?.id, page?.seo]);

  if (q.isLoading)
    return <div className="p-10 text-center text-sm text-muted-foreground">Carregando página…</div>;
  if (!agency) return <div className="p-10 text-center text-sm">Agência não encontrada</div>;
  if (!page) {
    return (
      <div className="p-20 text-center flex flex-col items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Página não encontrada</h1>
        <p className="text-muted-foreground">Esta página não existe ou foi despublicada.</p>
        <Link to="/p/$agency_slug" params={{ agency_slug }}>
          <GhostButton>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao início
          </GhostButton>
        </Link>
      </div>
    );
  }

  const isBiolink = page.template === "biolink" || page.template?.startsWith("hopp-");

  return (
    <div
      className={`w-full relative ${isBiolink ? "max-w-md mx-auto px-4 py-8 flex-1" : "px-4 sm:px-6"}`}
    >
      {/* Page title from CMS (published_title), rendered for screen readers & SEO */}
      {page.title && <h1 className="sr-only">{page.title}</h1>}
      <BlockRenderer
        blocks={(page.blocks || []) as PortalBlock[]}
        agencySlug={agency_slug}
        pageId={page.id}
        agencyId={agency.id}
      />

      {/* AI Sales Agent */}
      {!isBiolink && <AILandingAgent agencySlug={agency_slug} blocks={page.blocks || []} />}
    </div>
  );
}
