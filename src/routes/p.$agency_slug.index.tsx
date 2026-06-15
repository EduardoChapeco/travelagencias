import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchPublicAgencyHome } from "@/services/public";
import {
  Instagram,
  Facebook,
  Youtube,
  Linkedin,
  MapPin,
  Clock,
  ExternalLink,
  Phone,
  Mail,
  MessageCircle,
  ArrowRight,
  Calendar,
  Globe,
} from "lucide-react";
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
      scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
    };
  },
  component: HomePage,
});

// ─── Social Links ──────────────────────────────────────────────────────────────
function SocialLinks({ company, className = "" }: { company: any; className?: string }) {
  const links = [
    {
      key: "instagram",
      icon: Instagram,
      href: (v: string) => `https://instagram.com/${v.replace("@", "")}`,
      color: "hover:text-pink-500",
    },
    { key: "facebook", icon: Facebook, href: (v: string) => v, color: "hover:text-blue-600" },
    { key: "youtube", icon: Youtube, href: (v: string) => v, color: "hover:text-red-500" },
    { key: "linkedin", icon: Linkedin, href: (v: string) => v, color: "hover:text-blue-700" },
  ];
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {links.map(({ key, icon: Icon, href, color }) =>
        company?.[key] ? (
          <a
            key={key}
            href={href(company[key])}
            target="_blank"
            rel="noreferrer"
            className={`text-muted-foreground transition-colors ${color}`}
          >
            <Icon className="h-5 w-5" />
          </a>
        ) : null,
      )}
    </div>
  );
}

// ─── Homepage ─────────────────────────────────────────────────────────────────
function HomePage() {
  const { agency_slug } = Route.useParams();
  const { agency, company, tours, posts, homePage } = Route.useLoaderData();

  if (!agency)
    return (
      <div className="flex min-h-screen items-center justify-center p-10">
        <div className="text-center">
          <Globe className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-sm font-medium text-muted-foreground">Agência não encontrada</p>
        </div>
      </div>
    );

  // Track page view event
  useEffect(() => {
    if (homePage && agency) {
      const deviceType = /iPad|iPhone|Android/i.test(navigator.userAgent) ? "mobile" : "desktop";
      supabase
        .from("portal_page_analytics")
        .insert({
          page_id: homePage.id,
          agency_id: agency.id,
          event_type: "view",
          device_type: deviceType,
        })
        .then(({ error }) => {
          if (error) console.error("Error logging home view:", error.message);
        });
    }
  }, [homePage?.id, agency?.id]);

  // CMS mode — renderiza blocos configurados
  if (homePage?.blocks && Array.isArray(homePage.blocks) && homePage.blocks.length > 0) {
    return (
      <div className="w-full px-4 sm:px-6">
        <BlockRenderer
          blocks={homePage.blocks as PortalBlock[]}
          agencySlug={agency_slug}
          pageId={homePage.id}
          agencyId={agency.id}
        />
      </div>
    );
  }

  // ── LEGACY FALLBACK: Layout premium pré-montado ─────────────────────────────
  const brandColor = agency.brand_color || "#1E293B";
  const brandLight = agency.brand_color_light || "#F8FAFC";
  const brandFg = agency.brand_color_fg || "#FFFFFF";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background */}
        {company?.cover_image_url ? (
          <>
            <img
              src={company.cover_image_url}
              alt="Cover"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/60" />
          </>
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}cc 100%)`,
              }}
            />
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 25% 25%, white 0%, transparent 50%), radial-gradient(circle at 75% 75%, white 0%, transparent 50%)",
              }}
            />
          </>
        )}

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center px-6 py-28 md:py-40 text-center text-white">
          {agency.logo_url && (
            <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <img
                src={agency.logo_url}
                alt={agency.name}
                className="mx-auto h-24 w-24 rounded-2xl object-contain border-2 border-white/20 bg-white/10 backdrop-blur-sm p-2"
              />
            </div>
          )}
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            {agency.name}
          </h1>
          {company?.short_description && (
            <p className="mx-auto max-w-xl text-lg md:text-xl text-white/80 font-medium mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              {company.short_description}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            {company?.whatsapp && (
              <a
                href={`https://wa.me/${company.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold bg-white text-foreground hover:bg-white/90 transition-all hover:scale-105"
              >
                <MessageCircle className="h-4 w-4 text-green-600" /> Fale pelo WhatsApp
              </a>
            )}
            {tours.length > 0 && (
              <a
                href="#roteiros"
                className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-bold text-white hover:bg-white/10 transition-all"
              >
                Ver roteiros <ArrowRight className="h-4 w-4" />
              </a>
            )}
          </div>

          <SocialLinks
            company={company}
            className="mt-8 [&_a]:text-white/60 [&_a]:hover:text-white"
          />
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1440 60"
            className="w-full"
            preserveAspectRatio="none"
            style={{ height: 60 }}
          >
            <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" fill="hsl(var(--background))" />
          </svg>
        </div>
      </section>

      {/* ── STATS STRIP ───────────────────────────────────────────── */}
      {tours.length > 0 && (
        <div className="border-b border-border py-6">
          <div className="mx-auto max-w-4xl px-6">
            <div className="grid grid-cols-3 divide-x divide-border text-center">
              <div className="px-4">
                <div className="text-2xl font-extrabold" style={{ color: brandColor }}>
                  {tours.length}+
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Roteiros disponíveis</div>
              </div>
              <div className="px-4">
                <div className="text-2xl font-extrabold" style={{ color: brandColor }}>
                  100%
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Satisfação garantida</div>
              </div>
              <div className="px-4">
                <div className="text-2xl font-extrabold" style={{ color: brandColor }}>
                  24h
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Suporte ao viajante</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="space-y-20 py-20">
        {/* ── TOURS GRID ──────────────────────────────────────────── */}
        {tours.length > 0 && (
          <section id="roteiros" className="mx-auto max-w-6xl px-6">
            <div className="mb-10 text-center">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-alt px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                <Calendar className="h-3 w-3" /> Próximas saídas
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                Roteiros em grupo
              </h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                Viagens organizadas com tudo incluso. Junte-se ao grupo e aproveite cada detalhe sem
                preocupações.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {tours.map((t: any) => (
                <Link
                  key={t.id}
                  to="/p/$agency_slug/tour/$id"
                  params={{ agency_slug, id: t.id }}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-brand/30"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {t.cover_image_url ? (
                      <img
                        src={t.cover_image_url}
                        alt={t.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="h-full w-full flex items-center justify-center"
                        style={{ background: `${brandColor}15` }}
                      >
                        <Globe className="h-12 w-12 opacity-20" style={{ color: brandColor }} />
                      </div>
                    )}
                    {/* Date badge */}
                    <div className="absolute top-3 right-3 rounded-lg bg-background/95 backdrop-blur-sm px-2.5 py-1 text-xs font-bold">
                      {t.departure_date
                        ? new Date(t.departure_date).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                          })
                        : "A Confirmar"}
                    </div>
                    {/* Destination badge */}
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-background/90 backdrop-blur-sm px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                      <MapPin className="h-2.5 w-2.5" style={{ color: brandColor }} />
                      {t.destination}
                    </div>
                  </div>
                  <div className="flex flex-col flex-1 p-5">
                    <h3 className="font-bold text-base leading-tight mb-3 group-hover:text-brand transition-colors line-clamp-2">
                      {t.title}
                    </h3>
                    <div className="mt-auto pt-4 border-t border-border/50 flex items-end justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                          A partir de
                        </span>
                        <div
                          className="font-mono text-2xl font-extrabold"
                          style={{ color: brandColor }}
                        >
                          {Number(t.base_price).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </div>
                      </div>
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full transition-all group-hover:scale-110"
                        style={{ background: brandColor, color: brandFg }}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Link
                to="/p/$agency_slug/contact"
                params={{ agency_slug }}
                className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-2.5 text-sm font-semibold hover:bg-surface-alt transition-colors"
              >
                Solicitar roteiro personalizado <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        )}

        {/* ── ABOUT ────────────────────────────────────────────────── */}
        {company?.description && (
          <section className="mx-auto max-w-4xl px-6">
            <div className="overflow-hidden rounded-3xl border border-border bg-surface">
              <div className="grid md:grid-cols-2">
                {/* Text */}
                <div className="p-8 md:p-12 flex flex-col justify-center">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-alt px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 w-fit">
                    Sobre nós
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight mb-4">{agency.name}</h2>
                  <p className="text-muted-foreground leading-relaxed">{company.description}</p>
                  {company?.whatsapp && (
                    <a
                      href={`https://wa.me/${company.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white transition-all hover:scale-105 w-fit"
                      style={{ background: brandColor }}
                    >
                      <MessageCircle className="h-4 w-4" /> Fale conosco
                    </a>
                  )}
                </div>
                {/* Gallery / Cover */}
                <div className="relative min-h-48 overflow-hidden">
                  {company?.cover_image_url ? (
                    <img
                      src={company.cover_image_url}
                      alt={agency.name}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : company?.gallery?.[0] ? (
                    <img
                      src={company.gallery[0]}
                      alt={agency.name}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full min-h-48 items-center justify-center"
                      style={{ background: `${brandColor}15` }}
                    >
                      {agency.logo_url && (
                        <img
                          src={agency.logo_url}
                          alt=""
                          className="h-24 w-24 object-contain opacity-30"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── GALLERY ──────────────────────────────────────────────── */}
        {company?.gallery && company.gallery.length > 1 && (
          <section className="mx-auto max-w-6xl px-6">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold tracking-tight">Galeria</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {company.gallery.slice(0, 8).map((img: string, i: number) => (
                <div
                  key={i}
                  className={`overflow-hidden rounded-2xl bg-surface-alt ${i === 0 ? "md:col-span-2 md:row-span-2" : ""}`}
                >
                  <img
                    src={img}
                    alt={`Gallery ${i + 1}`}
                    className="h-full w-full object-cover aspect-square transition-transform duration-500 hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── BLOG ─────────────────────────────────────────────────── */}
        {posts.length > 0 && (
          <section className="mx-auto max-w-5xl px-6">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-alt px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  Blog
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Últimas do blog</h2>
              </div>
              <Link
                to="/p/$agency_slug/blog/$slug"
                params={{ agency_slug, slug: posts[0]?.slug || "" }}
                className="hidden md:flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Ver todos <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {posts.slice(0, 3).map((p: any) => (
                <Link
                  key={p.id}
                  to="/p/$agency_slug/blog/$slug"
                  params={{ agency_slug, slug: p.slug }}
                  className="group overflow-hidden rounded-2xl border border-border bg-surface hover:border-brand/30 transition-all"
                >
                  {p.cover_image_url && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={p.cover_image_url}
                        alt={p.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-bold leading-tight group-hover:text-brand transition-colors line-clamp-2">
                      {p.title}
                    </h3>
                    {p.excerpt && (
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{p.excerpt}</p>
                    )}
                    <div
                      className="mt-3 flex items-center gap-1 text-xs font-medium"
                      style={{ color: brandColor }}
                    >
                      Ler mais <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── CONTACT + HOURS ───────────────────────────────────────── */}
        {company && (
          <section className="mx-auto max-w-5xl px-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Contact Card */}
              <div className="rounded-3xl border border-border bg-surface p-8">
                <h2 className="mb-6 text-xl font-bold tracking-tight flex items-center gap-2">
                  <MapPin className="h-5 w-5" style={{ color: brandColor }} /> Contato e Localização
                </h2>
                <div className="space-y-4 text-sm">
                  {company.email && (
                    <a
                      href={`mailto:${company.email}`}
                      className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors group"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border group-hover:border-brand/30 transition-colors">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          Email
                        </div>
                        <div className="font-medium">{company.email}</div>
                      </div>
                    </a>
                  )}
                  {company.phone && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border">
                        <Phone className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          Telefone
                        </div>
                        <div className="font-medium">{company.phone}</div>
                      </div>
                    </div>
                  )}
                  {company.whatsapp && (
                    <a
                      href={`https://wa.me/${company.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors group"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border group-hover:border-green-500/30 transition-colors">
                        <MessageCircle className="h-4 w-4 group-hover:text-green-500 transition-colors" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          WhatsApp
                        </div>
                        <div className="font-medium">{company.whatsapp}</div>
                      </div>
                    </a>
                  )}
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors group"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border group-hover:border-brand/30 transition-colors">
                        <Globe className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          Website
                        </div>
                        <div className="font-medium flex items-center gap-1">
                          {company.website} <ExternalLink className="h-3 w-3" />
                        </div>
                      </div>
                    </a>
                  )}
                  {(company.address as any)?.street && (
                    <div className="flex items-start gap-3 text-muted-foreground">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          Endereço
                        </div>
                        <div className="font-medium">
                          {(company.address as any).street}, {(company.address as any).number}
                          {(company.address as any).complement &&
                            ` - ${(company.address as any).complement}`}
                          <br />
                          {(company.address as any).neighborhood} — {(company.address as any).city}/
                          {(company.address as any).state}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <SocialLinks company={company} className="mt-6 pt-6 border-t border-border" />
              </div>

              {/* Hours Card */}
              {company.business_hours && (
                <div className="rounded-3xl border border-border bg-surface p-8">
                  <h2 className="mb-6 text-xl font-bold tracking-tight flex items-center gap-2">
                    <Clock className="h-5 w-5" style={{ color: brandColor }} /> Horários de
                    Atendimento
                  </h2>
                  <div className="space-y-3">
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
                      const isToday =
                        new Date().getDay() ===
                        ["dom", "seg", "ter", "qua", "qui", "sex", "sab"].indexOf(day);
                      return (
                        <div
                          key={day}
                          className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm transition-colors ${
                            isToday
                              ? "border border-brand/20 bg-brand/5"
                              : "border border-transparent"
                          }`}
                        >
                          <span
                            className={`font-medium ${isToday ? "text-foreground" : "text-muted-foreground"}`}
                          >
                            {labels[day]}
                            {isToday && (
                              <span
                                className="ml-2 text-[10px] font-bold uppercase tracking-widest"
                                style={{ color: brandColor }}
                              >
                                hoje
                              </span>
                            )}
                          </span>
                          {h.closed ? (
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">
                              Fechado
                            </span>
                          ) : (
                            <span className="font-mono font-semibold">
                              {h.open} – {h.close}
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

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer className="border-t border-border mt-20">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Brand */}
            <div className="flex items-center gap-3">
              {agency.logo_url ? (
                <img
                  src={agency.logo_url}
                  alt={agency.name}
                  className="h-8 w-8 rounded-lg object-contain"
                />
              ) : (
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
                  style={{ background: brandColor }}
                >
                  {agency.name.charAt(0)}
                </div>
              )}
              <span className="font-semibold">{agency.name}</span>
            </div>

            <SocialLinks company={company} />

            <p className="text-xs text-muted-foreground text-center md:text-right">
              © {new Date().getFullYear()} {agency.name}. Todos os direitos reservados.
              <br />
              <span className="opacity-50">Powered by TravelOS</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
