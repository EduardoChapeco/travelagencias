import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { sanitizeHtml } from "@/lib/sanitize";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Send, Star, Quote, Play } from "lucide-react";
import type { PortalBlock } from "@/lib/cms-types";

// Re-export so existing imports from this path continue to work
export type { PortalBlock };

export function BlockRenderer({
  blocks,
  agencySlug,
}: {
  blocks: PortalBlock[];
  agencySlug: string;
}) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="flex flex-col gap-16 py-8">
      {blocks.map((b) => (
        <React.Fragment key={b.id}>{renderBlock(b, agencySlug)}</React.Fragment>
      ))}
    </div>
  );
}

function renderBlock(b: PortalBlock, agencySlug: string) {
  switch (b.type) {
    // ── HERO ──────────────────────────────────────────────────────
    case "hero":
      return (
        <section className="relative overflow-hidden rounded-3xl bg-surface">
          {b.bg_image_url ? (
            <img
              src={b.bg_image_url}
              alt="Hero"
              className="absolute inset-0 h-full w-full object-cover opacity-40"
            />
          ) : (
            <div className="absolute inset-0 bg-brand/5 backdrop-blur-3xl" />
          )}
          <div className="relative z-10 flex flex-col items-center justify-center p-16 text-center lg:p-32 bg-surface/80">
            <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-foreground">
              {b.title}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg lg:text-xl text-muted-foreground font-medium">
              {b.subtitle}
            </p>
            {b.cta_label && b.cta_link && (
              <div className="mt-10">
                {b.cta_link.startsWith("http") ? (
                  <a
                    href={b.cta_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-14 items-center justify-center rounded-full bg-brand px-8 text-sm font-bold text-brand-foreground transition-all hover:scale-105"
                  >
                    {b.cta_label}
                  </a>
                ) : (
                  <a
                    href={b.cta_link}
                    className="inline-flex h-14 items-center justify-center rounded-full bg-brand px-8 text-sm font-bold text-brand-foreground transition-all hover:scale-105"
                  >
                    {b.cta_label}
                  </a>
                )}
              </div>
            )}
          </div>
        </section>
      );

    // ── TEXT ──────────────────────────────────────────────────────
    case "text":
      return (
        <section
          className={`mx-auto max-w-5xl flex flex-col gap-8 lg:flex-row ${b.align === "right" ? "lg:flex-row-reverse" : ""} ${b.align === "center" ? "text-center items-center justify-center" : "items-center"}`}
        >
          <div className="flex-1 space-y-4">
            <div
              className="prose prose-sm md:prose-base dark:prose-invert"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(b.content.replace(/\n/g, "<br/>")),
              }}
            />
          </div>
          {b.image_url && (
            <div className="flex-1 w-full max-w-lg">
              <img
                src={b.image_url}
                alt="Content"
                className="rounded-2xl object-cover aspect-square lg:aspect-[4/3] w-full"
              />
            </div>
          )}
        </section>
      );

    // ── GALLERY ───────────────────────────────────────────────────
    case "gallery":
      if (!b.images || b.images.length === 0) return null;
      return (
        <section className="mx-auto max-w-6xl w-full">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {b.images.map((img, i) => (
              <div key={i} className="aspect-square overflow-hidden rounded-xl bg-surface-alt group">
                <img
                  src={img}
                  alt={`Gallery ${i}`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
            ))}
          </div>
        </section>
      );

    // ── CONTACT ───────────────────────────────────────────────────
    case "contact":
      return <ContactBlock key={b.id} block={b} agencySlug={agencySlug} />;

    // ── FEATURES ─────────────────────────────────────────────────
    case "features":
      return (
        <section className="mx-auto max-w-7xl w-full px-4">
          {b.title && (
            <h2 className="text-3xl font-bold tracking-tight text-center mb-12">{b.title}</h2>
          )}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {b.items?.map((item, i) => (
              <div
                key={i}
                className="flex flex-col items-start bg-surface-alt/30 p-6 rounded-2xl border border-border/50 transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand mb-4 text-2xl">
                  {item.icon || "✨"}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      );

    // ── CTA ───────────────────────────────────────────────────────
    case "cta":
      return (
        <section className="mx-auto max-w-5xl w-full my-8">
          <div className="relative overflow-hidden rounded-3xl bg-brand text-brand-foreground px-6 py-16 text-center">
            <div className="absolute inset-0 opacity-10 bg-white/10" />
            <h2 className="relative z-10 text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
              {b.title}
            </h2>
            {b.subtitle && (
              <p className="relative z-10 text-brand-foreground/80 text-lg md:text-xl max-w-2xl mx-auto mb-8">
                {b.subtitle}
              </p>
            )}
            {b.button_label && b.button_link && (
              <div className="relative z-10">
                <a
                  href={b.button_link}
                  target={b.button_link.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className="inline-flex h-14 items-center justify-center rounded-full bg-background px-8 text-sm font-bold text-foreground transition-transform hover:scale-105"
                >
                  {b.button_label}
                </a>
              </div>
            )}
          </div>
        </section>
      );

    // ── FAQ ───────────────────────────────────────────────────────
    case "faq":
      return (
        <section className="mx-auto max-w-3xl w-full px-4">
          {b.title && (
            <h2 className="text-3xl font-bold tracking-tight text-center mb-8">{b.title}</h2>
          )}
          <div className="space-y-4">
            {b.items?.map((item, i) => (
              <details
                key={i}
                className="group rounded-2xl border border-border bg-surface px-6 py-4 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer items-center justify-between font-semibold text-lg">
                  {item.question}
                  <span className="ml-4 flex h-6 w-6 items-center justify-center rounded-full bg-surface-alt text-muted-foreground group-open:rotate-180 transition-transform">
                    ↓
                  </span>
                </summary>
                <p className="mt-4 text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      );

    // ── TESTIMONIALS ─────────────────────────────────────────────
    case "testimonials":
      return (
        <section className="mx-auto max-w-6xl w-full px-4">
          {b.title && (
            <h2 className="text-3xl font-bold tracking-tight text-center mb-12">{b.title}</h2>
          )}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {b.items?.map((item, i) => (
              <div
                key={i}
                className="relative flex flex-col bg-surface border border-border/50 rounded-2xl p-6 shadow-sm hover:-translate-y-1 transition-transform"
              >
                <Quote className="h-8 w-8 text-brand/20 mb-4" />
                <p className="flex-1 text-muted-foreground leading-relaxed italic mb-6">"{item.text}"</p>
                <div className="flex items-center gap-3 border-t border-border pt-4">
                  {item.avatar_url ? (
                    <img src={item.avatar_url} alt={item.author} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand font-bold">
                      {item.author.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-sm">{item.author}</div>
                    {item.role && <div className="text-xs text-muted-foreground">{item.role}</div>}
                  </div>
                  <div className="ml-auto flex">
                    {Array.from({ length: item.stars || 5 }).map((_, si) => (
                      <Star key={si} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      );

    // ── TOURS GRID ────────────────────────────────────────────────
    case "tours_grid":
      return <ToursGridBlock block={b} agencySlug={agencySlug} />;

    // ── STATS ─────────────────────────────────────────────────────
    case "stats":
      return (
        <section className="mx-auto max-w-5xl w-full px-4">
          {b.title && (
            <h2 className="text-3xl font-bold tracking-tight text-center mb-12">{b.title}</h2>
          )}
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {b.items?.map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center p-6 rounded-2xl bg-surface border border-border/50">
                <div className="text-4xl mb-2">{item.icon || "📊"}</div>
                <div className="text-3xl font-extrabold text-brand mb-1">{item.value}</div>
                <div className="text-sm text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>
        </section>
      );

    // ── VIDEO ─────────────────────────────────────────────────────
    case "video":
      return (
        <section className="mx-auto max-w-4xl w-full px-4">
          {b.title && (
            <h2 className="text-3xl font-bold tracking-tight text-center mb-8">{b.title}</h2>
          )}
          {b.url ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-surface-alt">
              <iframe
                src={b.url}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={b.title || "Video"}
              />
            </div>
          ) : (
            <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-surface-alt border border-border">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Play className="h-12 w-12 opacity-30" />
                <span className="text-sm">URL do vídeo não configurada</span>
              </div>
            </div>
          )}
          {b.caption && (
            <p className="mt-4 text-center text-sm text-muted-foreground">{b.caption}</p>
          )}
        </section>
      );

    // ── MAP ───────────────────────────────────────────────────────
    case "map":
      return (
        <section className="mx-auto max-w-5xl w-full px-4">
          {b.title && (
            <h2 className="text-3xl font-bold tracking-tight text-center mb-8">{b.title}</h2>
          )}
          {b.embed_url ? (
            <div className="relative overflow-hidden rounded-2xl border border-border" style={{ height: "400px" }}>
              <iframe
                src={b.embed_url}
                className="absolute inset-0 h-full w-full"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={b.title || "Localização"}
              />
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-2xl bg-surface-alt border border-border">
              <span className="text-sm text-muted-foreground">Configure o embed do Google Maps</span>
            </div>
          )}
          {b.address_label && (
            <p className="mt-4 text-center text-sm text-muted-foreground">{b.address_label}</p>
          )}
        </section>
      );

    // ── BLOG FEED ─────────────────────────────────────────────────
    case "blog_feed":
      return <BlogFeedBlock block={b} agencySlug={agencySlug} />;

    default:
      return null;
  }
}

// ─── ToursGridBlock ────────────────────────────────────────────────────────────
function ToursGridBlock({ block, agencySlug }: { block: any; agencySlug: string }) {
  const [tours, setTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Resolve agency_id from slug first
      const { data: ag } = await supabase
        .from("agencies")
        .select("id")
        .eq("slug", agencySlug)
        .maybeSingle();
      if (!ag) { setLoading(false); return; }

      const { data } = await supabase
        .from("group_tours")
        .select("id, title, destination, departure_date, base_price, cover_image_url")
        .eq("agency_id", ag.id)
        .eq("status", "published")
        .order("departure_date", { ascending: true })
        .limit(block.max_items || 6);
      setTours(data ?? []);
      setLoading(false);
    }
    load();
  }, [agencySlug, block.max_items]);

  if (loading) return <div className="mx-auto max-w-6xl w-full px-4 h-48 animate-pulse rounded-2xl bg-surface-alt" />;
  if (tours.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl w-full px-4">
      {block.title && (
        <div className="mb-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight">{block.title}</h2>
          {block.subtitle && <p className="mt-2 text-muted-foreground">{block.subtitle}</p>}
        </div>
      )}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        {tours.map((t) => (
          <Link
            key={t.id}
            to="/p/$agency_slug/tour/$id"
            params={{ agency_slug: agencySlug, id: t.id }}
            className="group flex flex-col overflow-hidden rounded-2xl border-2 border-border/50 bg-surface transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg"
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
                <h3 className="font-bold text-lg leading-tight group-hover:text-brand transition-colors">
                  {t.title}
                </h3>
              </div>
              <div className="mt-4 pt-4 border-t border-border/50">
                <span className="text-[10px] uppercase text-muted-foreground font-bold">A partir de</span>
                <div className="font-mono text-xl font-bold text-brand">
                  {Number(t.base_price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── BlogFeedBlock ─────────────────────────────────────────────────────────────
function BlogFeedBlock({ block, agencySlug }: { block: any; agencySlug: string }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Buscar agency_id pelo slug
      const { data: agency } = await supabase
        .from("agencies")
        .select("id")
        .eq("slug", agencySlug)
        .maybeSingle();
      if (!agency) { setLoading(false); return; }

      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, cover_image_url, published_at")
        .eq("agency_id", agency.id)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(block.max_items || 3);
      setPosts(data ?? []);
      setLoading(false);
    }
    load();
  }, [agencySlug, block.max_items]);

  if (loading) return <div className="mx-auto max-w-5xl w-full px-4 h-48 animate-pulse rounded-2xl bg-surface-alt" />;
  if (posts.length === 0) return null;

  return (
    <section className="mx-auto max-w-5xl w-full px-4">
      {block.title && (
        <h2 className="text-3xl font-bold tracking-tight text-center mb-10">{block.title}</h2>
      )}
      <div className="grid gap-6 md:grid-cols-3">
        {posts.map((p) => (
          <Link
            key={p.id}
            to="/p/$agency_slug/blog/$slug"
            params={{ agency_slug: agencySlug, slug: p.slug }}
            className="group overflow-hidden rounded-2xl border border-border bg-surface hover:border-brand/40 hover:shadow-md transition-all"
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
              {p.published_at && (
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                  {new Date(p.published_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
              )}
              <h3 className="font-bold text-base group-hover:text-brand transition-colors">{p.title}</h3>
              {p.excerpt && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.excerpt}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── ContactBlock ──────────────────────────────────────────────────────────────
function ContactBlock({ block, agencySlug }: { block: any; agencySlug: string }) {
  const [f, setF] = useState({ name: "", email: "", phone: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    const { error } = await (supabase.rpc as any)("submit_public_lead", {
      _agency_slug: agencySlug,
      _name: f.name,
      _email: f.email || null,
      _phone: f.phone || null,
      _destination: null,
      _travel_start: null,
      _travel_end: null,
      _pax_count: 2,
      _estimated_value: 0,
      _source: "landing_page_block",
      _notes: f.notes || null,
    });

    setBusy(false);
    if (error) { toast.error("Erro ao enviar: " + error.message); return; }
    setSubmitted(true);
    toast.success("Mensagem enviada com sucesso!");
  }

  return (
    <section className="mx-auto max-w-4xl bg-surface-alt/50 border border-border/50 rounded-3xl p-8 lg:p-12">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold tracking-tight mb-4">{block.title}</h2>
        <p className="text-lg text-muted-foreground whitespace-pre-wrap">{block.text}</p>
      </div>

      {submitted ? (
        <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in slide-in-from-bottom-4">
          <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center text-success mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="text-2xl font-bold mb-2">Tudo certo!</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Recebemos sua mensagem. Um de nossos consultores especialistas entrará em contato em breve.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Nome completo *</label>
            <input
              required
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-brand"
              placeholder="Como quer ser chamado?"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value })}
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-brand"
                placeholder="seu@email.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">WhatsApp *</label>
              <input
                required
                value={f.phone}
                onChange={(e) => setF({ ...f, phone: e.target.value })}
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-brand"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Como podemos ajudar?</label>
            <textarea
              value={f.notes}
              onChange={(e) => setF({ ...f, notes: e.target.value })}
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-brand resize-y"
              placeholder="Descreva o que você busca..."
              rows={3}
            />
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-foreground text-background font-bold hover:bg-foreground/90 disabled:opacity-50 transition-colors"
            >
              {busy ? "Enviando..." : <><Send className="w-4 h-4" /> Enviar Mensagem</>}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
