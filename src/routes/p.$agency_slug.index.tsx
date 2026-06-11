import { createFileRoute, Link } from "@tanstack/react-router";
import { fetchPublicAgencyHome } from "@/services/public";
import { Instagram, Facebook, Youtube, Linkedin, MapPin, Clock, ExternalLink } from "lucide-react";
import { BlockRenderer, PortalBlock } from "@/components/portal/BlockRenderer";

export const Route = createFileRoute("/p/$agency_slug/")({
  loader: async ({ params: { agency_slug } }) => {
    return fetchPublicAgencyHome(agency_slug);
  },
  head: ({ loaderData }) => {
    if (!loaderData?.agency) return { meta: [{ title: "Agência não encontrada" }] };
    const { agency, company, homePage } = loaderData;
    const desc =
      homePage?.seo?.description ||
      company?.short_description ||
      `Portal oficial da ${agency.name}`;
    const title = homePage?.seo?.title || agency.name;
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "TravelAgency",
      name: agency.name,
      image: agency.logo_url,
      description: desc,
      url: `https://travelos.com/p/${agency.slug}`,
      telephone: company?.phone || company?.whatsapp,
    };
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:image", content: agency.logo_url || company?.cover_image_url },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(jsonLd),
        },
      ],
    };
  },
  component: HomePage,
});

function HomePage() {
  const { agency_slug } = Route.useParams();
  const { agency, company, tours, posts, homePage } = Route.useLoaderData();

  if (!agency) return <div className="p-10 text-center text-sm">Agência não encontrada</div>;

  // Se o CMS tem uma página "home" configurada, renderizamos os blocos!
  if (homePage?.blocks && Array.isArray(homePage.blocks) && homePage.blocks.length > 0) {
    return (
      <div className="w-full px-4 sm:px-6">
        <BlockRenderer blocks={homePage.blocks as PortalBlock[]} agencySlug={agency_slug} />
      </div>
    );
  }

  // Fallback para o layout estático "legacy"
  return (
    <>
      <header className="relative px-6 py-24 text-center bg-surface overflow-hidden border-b border-border/50">
        {company?.cover_image_url ? (
          <>
            <img
              src={company.cover_image_url}
              alt="Cover"
              className="absolute inset-0 h-full w-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-surface/80" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-brand/5 backdrop-blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand/10 rounded-full blur-[100px] pointer-events-none" />
          </>
        )}

        <div className="relative z-10 flex flex-col items-center justify-center">
          {agency.logo_url && (
            <img
              src={agency.logo_url}
              alt={agency.name}
              className="mb-6 h-28 w-28 rounded-2xl object-cover ring-4 ring-surface "
            />
          )}
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{agency.name}</h1>
          {company?.short_description && (
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground font-medium">
              {company.short_description}
            </p>
          )}

          <div className="mt-6 flex items-center justify-center gap-4">
            {company?.instagram && (
              <a
                href={`https://instagram.com/${company.instagram.replace("@", "")}`}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-brand"
              >
                <Instagram className="h-5 w-5" />
              </a>
            )}
            {company?.facebook && (
              <a
                href={company.facebook}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-brand"
              >
                <Facebook className="h-5 w-5" />
              </a>
            )}
            {company?.youtube && (
              <a
                href={company.youtube}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-brand"
              >
                <Youtube className="h-5 w-5" />
              </a>
            )}
            {company?.linkedin && (
              <a
                href={company.linkedin}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-brand"
              >
                <Linkedin className="h-5 w-5" />
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="space-y-16 px-6 py-16 text-foreground">
        {tours.length > 0 && (
          <section className="mx-auto max-w-5xl">
            <h2 className="mb-8 text-2xl font-bold tracking-tight">Próximas viagens em grupo</h2>
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
              {tours.map((t) => (
                <Link
                  key={t.id}
                  to="/p/$agency_slug/tour/$id"
                  params={{ agency_slug, id: t.id }}
                  className="group flex flex-col overflow-hidden rounded-2xl border-2 border-border/50 bg-surface transition-all hover:-translate-y-1 hover:border-brand/40"
                >
                  <div className="relative aspect-video overflow-hidden">
                    {t.cover_image_url ? (
                      <img
                        src={t.cover_image_url}
                        alt={t.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full bg-surface-alt" />
                    )}
                    <div className="absolute bottom-3 right-3 rounded-md bg-background/90 px-2 py-1 text-xs font-bold backdrop-blur-sm">
                      {t.departure_date
                        ? new Date(t.departure_date).toLocaleDateString("pt-BR")
                        : "A Confirmar"}
                    </div>
                  </div>
                  <div className="flex flex-col p-5 flex-1 justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">
                        {t.destination}
                      </div>
                      <h3 className="font-bold text-lg leading-tight mb-2 group-hover:text-brand transition-colors">
                        {t.title}
                      </h3>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <span className="text-[10px] uppercase text-muted-foreground font-bold">
                        A partir de
                      </span>
                      <div className="font-mono text-xl font-bold text-brand">
                        {Number(t.base_price).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {posts.length > 0 && (
          <section className="mx-auto max-w-5xl">
            <h2 className="mb-4 text-xl font-semibold tracking-tight">Blog</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {posts.map((p) => (
                <Link
                  key={p.id}
                  to="/p/$agency_slug/blog/$slug"
                  params={{ agency_slug, slug: p.slug }}
                  className="overflow-hidden rounded-lg border border-border bg-surface hover:border-border-strong"
                >
                  {p.cover_image_url && (
                    <img
                      src={p.cover_image_url}
                      alt={p.title}
                      className="aspect-video w-full object-cover"
                    />
                  )}
                  <div className="p-3">
                    <div className="font-medium">{p.title}</div>
                    {p.excerpt && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.excerpt}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {company?.gallery && company.gallery.length > 0 && (
          <section className="mx-auto max-w-5xl">
            <h2 className="mb-6 text-2xl font-bold tracking-tight">Galeria</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {company.gallery.map((img: string, i: number) => (
                <div key={i} className="aspect-square overflow-hidden rounded-xl bg-surface-alt">
                  <img
                    src={img}
                    alt={`Gallery ${i}`}
                    className="h-full w-full object-cover transition-transform hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {company && (
          <section className="mx-auto max-w-5xl">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-surface p-8">
                <h2 className="mb-6 text-xl font-bold tracking-tight flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-brand" /> Contato e Localização
                </h2>
                <div className="space-y-4 text-sm font-medium">
                  {company.email && (
                    <div>
                      <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-0.5">
                        Email
                      </span>
                      <a
                        href={`mailto:${company.email}`}
                        className="hover:text-brand transition-colors"
                      >
                        {company.email}
                      </a>
                    </div>
                  )}
                  {company.phone && (
                    <div>
                      <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-0.5">
                        Telefone
                      </span>
                      {company.phone}
                    </div>
                  )}
                  {company.whatsapp && (
                    <div>
                      <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-0.5">
                        WhatsApp
                      </span>
                      <a
                        href={`https://wa.me/${company.whatsapp.replace(/\D/g, "")}`}
                        className="hover:text-brand transition-colors"
                      >
                        {company.whatsapp}
                      </a>
                    </div>
                  )}
                  {company.website && (
                    <div>
                      <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-0.5">
                        Website
                      </span>
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 hover:text-brand transition-colors"
                      >
                        {company.website} <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  {company.address && (company.address as any).street && (
                    <div className="pt-2">
                      <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-0.5">
                        Endereço
                      </span>
                      {(company.address as any).street}, {(company.address as any).number}
                      {(company.address as any).complement && ` - ${(company.address as any).complement}`}
                      <br />
                      {(company.address as any).neighborhood} - {(company.address as any).city}/
                      {(company.address as any).state}
                    </div>
                  )}
                </div>
              </div>

              {company.business_hours && (
                <div className="rounded-2xl border border-border bg-surface p-8">
                  <h2 className="mb-6 text-xl font-bold tracking-tight flex items-center gap-2">
                    <Clock className="h-5 w-5 text-brand" /> Horários de Atendimento
                  </h2>
                  <div className="space-y-3 text-sm">
                    {["seg", "ter", "qua", "qui", "sex", "sab", "dom"].map((day) => {
                      const h = (company.business_hours as any)[day];
                      if (!h) return null;
                      const labels: Record<string, string> = {
                        seg: "Segunda",
                        ter: "Terça",
                        qua: "Quarta",
                        qui: "Quinta",
                        sex: "Sexta",
                        sab: "Sábado",
                        dom: "Domingo",
                      };
                      return (
                        <div
                          key={day}
                          className="flex justify-between items-center border-b border-border/40 pb-2 last:border-0 last:pb-0"
                        >
                          <span className="font-medium text-muted-foreground">{labels[day]}</span>
                          {h.closed ? (
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">
                              Fechado
                            </span>
                          ) : (
                            <span className="font-mono text-foreground font-semibold">
                              {h.open} - {h.close}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
