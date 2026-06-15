import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { sanitizeHtml } from "@/lib/sanitize";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CheckCircle2,
  Send,
  Star,
  Quote,
  Play,
  Instagram,
  Facebook,
  Youtube,
  Linkedin,
  Phone,
  ChevronRight,
  Plane,
  Mail,
  AlertCircle,
  Sparkles,
  Compass,
  ShieldCheck,
  Hotel,
  Users,
  Leaf,
  Award,
  Heart,
  Globe,
  MessageSquare,
  Briefcase,
  Trees,
  Crown,
  Key,
} from "lucide-react";
import type { PortalBlock } from "@/lib/cms-types";

// Re-export so existing imports from this path continue to work
export type { PortalBlock };

export function renderIconByName(name: string, className?: string) {
  if (!name) return null;

  const iconMap: Record<string, React.ComponentType<any>> = {
    trip: Compass,
    trips: Compass,
    safe: ShieldCheck,
    hotel: Hotel,
    union: Users,
    eco: Leaf,
    award: Award,
    awards: Award,
    lux: Sparkles,
    flight: Plane,
    key: Key,
    care: Heart,
    world: Globe,
    places: Globe,
    clients: Users,
    chat: MessageSquare,
    web: Globe,
    star: Star,
    insta: Instagram,
    pack: Briefcase,
    nature: Trees,
    vip: Crown,
  };

  const IconComponent = iconMap[name.toLowerCase().trim()];
  if (IconComponent) {
    return <IconComponent className={className || "h-5 w-5"} />;
  }

  // Fallback if it's an emoji or unmapped string
  return <span className={className}>{name}</span>;
}

export function BlockStyleWrapper({ block, children }: { block: PortalBlock; children: React.ReactNode }) {
  const styles = (block as any).styles;
  if (!styles) return <div className="w-full">{children}</div>;

  const { bg_type, bg_color, bg_gradient, bg_image_url, text_color, padding_y, border_radius } = styles;

  const inlineStyles: React.CSSProperties = {};
  if (text_color) inlineStyles.color = text_color;

  if (bg_type === "color" && bg_color) {
    inlineStyles.backgroundColor = bg_color;
  } else if (bg_type === "gradient" && bg_gradient) {
    inlineStyles.background = bg_gradient;
  } else if (bg_type === "image" && bg_image_url) {
    inlineStyles.backgroundImage = `url(${bg_image_url})`;
    inlineStyles.backgroundSize = "cover";
    inlineStyles.backgroundPosition = "center";
  }

  const paddingMap = {
    none: "py-0 px-0",
    sm: "py-6 px-4 md:py-8 md:px-6",
    md: "py-12 px-6 md:py-16 md:px-10",
    lg: "py-24 px-8 md:py-32 md:px-16",
  };
  const paddingClass = paddingMap[padding_y as keyof typeof paddingMap] || "py-8 px-4";

  const radiusMap = {
    none: "rounded-none",
    md: "rounded-xl",
    lg: "rounded-3xl",
    full: "rounded-[2rem]",
  };
  const radiusClass = radiusMap[border_radius as keyof typeof radiusMap] || "";

  return (
    <div
      style={inlineStyles}
      className={`w-full transition-all overflow-hidden ${paddingClass} ${radiusClass} ${bg_type === "image" ? "relative before:absolute before:inset-0 before:bg-background/20 before:z-0" : ""}`}
    >
      <div className={bg_type === "image" ? "relative z-10 w-full" : "w-full"}>
        {children}
      </div>
    </div>
  );
}

export function BlockRenderer({
  blocks,
  agencySlug,
  pageId,
  agencyId,
  onSelectBlock,
  selectedBlockId,
}: {
  blocks: PortalBlock[];
  agencySlug: string;
  pageId?: string;
  agencyId?: string;
  onSelectBlock?: (id: string) => void;
  selectedBlockId?: string | null;
}) {
  if (!blocks || blocks.length === 0) return null;

  const handleLinkClick = (url: string) => {
    if (!pageId || !agencyId) return;
    const deviceType = /iPad|iPhone|Android/i.test(navigator.userAgent) ? "mobile" : "desktop";
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    if (supabaseUrl && supabaseKey) {
      const payload = {
        page_id: pageId,
        agency_id: agencyId,
        event_type: "click",
        link_url: url,
        device_type: deviceType,
      };

      fetch(`${supabaseUrl}/rest/v1/portal_page_analytics`, {
        method: "POST",
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(err => {
        console.error("Error logging click keepalive:", err);
      });
    } else {
      // Fallback a supabase standard insert se as variáveis de ambiente não estiverem prontas
      (supabase as any)
        .from("portal_page_analytics")
        .insert({
          page_id: pageId,
          agency_id: agencyId,
          event_type: "click",
          link_url: url,
          device_type: deviceType,
        })
        .then(({ error }: any) => {
          if (error) console.error("Error logging click fallback:", error.message);
        });
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-20">
      {blocks.map((b) => {
        const isSelected = selectedBlockId === b.id;
        const Wrapper = "div";

        return (
          <Wrapper
            key={b.id}
            onClick={onSelectBlock ? () => onSelectBlock(b.id) : undefined}
            className={`w-full text-left relative outline-none transition-all duration-200 group block-wrapper-preview
              ${onSelectBlock ? "cursor-pointer hover:ring-2 hover:ring-brand/50 hover:ring-offset-4 rounded-3xl" : ""}
              ${isSelected ? "ring-2 ring-brand ring-offset-4 scale-[1.01]" : ""}
            `}
          >
            {onSelectBlock && (
              <div
                className={`absolute -top-3 -right-3 z-50 rounded-full bg-brand text-white px-2 py-0.5 text-[10px] font-bold transition-opacity duration-200 ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              >
                {b.type.toUpperCase()}
              </div>
            )}
            <div
              className={`pointer-events-none transition-opacity ${isSelected ? "opacity-100" : onSelectBlock ? "opacity-80 group-hover:opacity-100" : ""}`}
            >
              <BlockStyleWrapper block={b}>
                {renderBlock(b, agencySlug, handleLinkClick, agencyId)}
              </BlockStyleWrapper>
            </div>
          </Wrapper>
        );
      })}
    </div>
  );
}

function renderBlock(b: PortalBlock, agencySlug: string, handleLinkClick: (url: string) => void, agencyId?: string) {
  switch (b.type) {
    // ── HERO ──────────────────────────────────────────────────────
    case "hero": {
      const layout = b.layout || "centered";

      if (layout === "split") {
        return (
          <section className="relative overflow-hidden rounded-3xl bg-surface">
            <div className="absolute inset-0 bg-brand/5 backdrop-blur-3xl opacity-30" />
            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8 lg:gap-16 p-8 lg:p-20">
              <div className="flex-1 text-left space-y-6">
                <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
                  {b.title}
                </h1>
                <p className="text-base lg:text-lg text-muted-foreground font-medium leading-relaxed">
                  {b.subtitle}
                </p>
                {b.cta_label && b.cta_link && (
                  <div className="pt-2">
                    <a
                      href={b.cta_link}
                      target={b.cta_link.startsWith("http") ? "_blank" : undefined}
                      rel="noreferrer"
                      onClick={() => handleLinkClick(b.cta_link)}
                      className="inline-flex h-12 items-center justify-center rounded-xl bg-brand px-6 text-sm font-bold text-brand-foreground transition-all hover:scale-105 shadow hover:shadow-lg active:scale-95"
                    >
                      {b.cta_label}
                    </a>
                  </div>
                )}
              </div>
              <div className="flex-1 w-full shrink-0">
                {b.bg_image_url ? (
                  <img
                    src={b.bg_image_url}
                    alt="Hero Split"
                    className="rounded-2xl object-cover aspect-video lg:aspect-[4/3] w-full shadow-lg border border-border/40"
                  />
                ) : (
                  <div className="rounded-2xl bg-surface-alt aspect-video w-full flex items-center justify-center border border-dashed border-border text-muted-foreground text-xs">
                    Sem imagem de fundo
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      }

      if (layout === "minimal") {
        return (
          <section className="relative overflow-hidden rounded-3xl bg-surface-alt/40 border border-border/40">
            <div className="relative z-10 flex flex-col items-center justify-center p-12 lg:p-20 text-center space-y-4 max-w-2xl mx-auto">
              <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-foreground">
                {b.title}
              </h1>
              <p className="text-sm lg:text-base text-muted-foreground leading-relaxed">
                {b.subtitle}
              </p>
              {b.cta_label && b.cta_link && (
                <div className="pt-4">
                  <a
                    href={b.cta_link}
                    target={b.cta_link.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    onClick={() => handleLinkClick(b.cta_link)}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-xs font-bold text-brand-foreground transition-all hover:scale-105 active:scale-95"
                  >
                    {b.cta_label}
                  </a>
                </div>
              )}
            </div>
          </section>
        );
      }

      // Default: centered
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
                <a
                  href={b.cta_link}
                  target={b.cta_link.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  onClick={() => handleLinkClick(b.cta_link)}
                  className="inline-flex h-14 items-center justify-center rounded-full bg-brand px-8 text-sm font-bold text-brand-foreground transition-all hover:scale-105"
                >
                  {b.cta_label}
                </a>
              </div>
            )}
          </div>
        </section>
      );
    }

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
                __html: sanitizeHtml(b.content || ""),
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
              <div
                key={i}
                className="aspect-square overflow-hidden rounded-xl bg-surface-alt group"
              >
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
    case "features": {
      const layout = b.layout || "grid";

      if (layout === "cards") {
        return (
          <section className="mx-auto max-w-7xl w-full px-4">
            {b.title && (
              <h2 className="text-3xl font-extrabold tracking-tight text-center mb-12">{b.title}</h2>
            )}
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {b.items?.map((item, i) => (
                <div
                  key={i}
                  className="flex flex-col items-start bg-gradient-to-br from-surface to-surface-alt/30 p-7 rounded-3xl border border-border/80 shadow transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg hover:border-brand/40 group"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand mb-5 group-hover:scale-110 transition-transform">
                    {renderIconByName(item.icon, "h-6 w-6")}
                  </div>
                  <h3 className="text-lg font-bold mb-2 group-hover:text-brand transition-colors">{item.title}</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </section>
        );
      }

      if (layout === "list") {
        return (
          <section className="mx-auto max-w-4xl w-full px-4">
            {b.title && (
              <h2 className="text-3xl font-extrabold tracking-tight text-center mb-10">{b.title}</h2>
            )}
            <div className="flex flex-col gap-4">
              {b.items?.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-5 bg-surface-alt/15 p-5 rounded-2xl border border-border/40 hover:bg-surface-alt/25 transition-colors"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    {renderIconByName(item.icon, "h-5 w-5")}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                    <p className="text-muted-foreground text-xs mt-0.5">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      }

      // Default: grid
      return (
        <section className="mx-auto max-w-7xl w-full px-4">
          {b.title && (
            <h2 className="text-3xl font-bold tracking-tight text-center mb-12">{b.title}</h2>
          )}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {b.items?.map((item, i) => (
              <div
                key={i}
                className="flex flex-col items-start bg-surface-alt/30 p-6 rounded-2xl border border-border/50 transition-all hover:-translate-y-1"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand mb-4">
                  {renderIconByName(item.icon, "h-6 w-6")}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      );
    }

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
                  onClick={() => handleLinkClick(b.button_link)}
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
    case "faq": {
      const layout = b.layout || "accordion";

      if (layout === "grid") {
        return (
          <section className="mx-auto max-w-5xl w-full px-4">
            {b.title && (
              <h2 className="text-3xl font-extrabold tracking-tight text-center mb-10">{b.title}</h2>
            )}
            <div className="grid gap-6 md:grid-cols-2">
              {b.items?.map((item, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-surface-alt/20 p-6 shadow-sm hover:border-brand/20 transition-colors"
                >
                  <h3 className="font-bold text-base text-foreground mb-2">{item.question}</h3>
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground text-xs leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.answer || "") }}
                  />
                </div>
              ))}
            </div>
          </section>
        );
      }

      // Default: accordion
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
                <div
                  className="mt-4 prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.answer || "") }}
                />
              </details>
            ))}
          </div>
        </section>
      );
    }

    // ── TESTIMONIALS ─────────────────────────────────────────────
    case "testimonials": {
      const layout = b.layout || "grid";

      if (layout === "bubble") {
        return (
          <section className="mx-auto max-w-6xl w-full px-4">
            {b.title && (
              <h2 className="text-3xl font-extrabold tracking-tight text-center mb-12">{b.title}</h2>
            )}
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {b.items?.map((item, i) => (
                <div key={i} className="flex flex-col gap-4">
                  <div className="relative bg-surface-alt/45 border border-border/60 p-6 rounded-2xl shadow-sm hover:border-brand/20 transition-all duration-300">
                    <Quote className="h-6 w-6 text-brand/20 mb-3" />
                    <p className="text-muted-foreground text-xs leading-relaxed italic">
                      "{item.text}"
                    </p>
                    {/* Speech bubble tail pointer */}
                    <div
                      className="absolute -bottom-2.5 left-8 w-5 h-5 bg-surface border-r border-b border-border/60 rotate-45"
                      style={{ clipPath: "polygon(100% 100%, 0 100%, 100% 0)" }}
                    ></div>
                  </div>
                  <div className="flex items-center gap-3 pl-4 mt-1">
                    {item.avatar_url ? (
                      <img
                        src={item.avatar_url}
                        alt={item.author}
                        className="h-9 w-9 rounded-full object-cover shadow-sm border border-border"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-brand font-bold text-xs">
                        {item.author.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-xs text-foreground">{item.author}</div>
                      {item.role && <div className="text-[10px] text-muted-foreground">{item.role}</div>}
                    </div>
                    <div className="ml-auto flex shrink-0">
                      {Array.from({ length: item.stars || 5 }).map((_, si) => (
                        <Star key={si} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      }

      // Default: grid
      return (
        <section className="mx-auto max-w-6xl w-full px-4">
          {b.title && (
            <h2 className="text-3xl font-bold tracking-tight text-center mb-12">{b.title}</h2>
          )}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {b.items?.map((item, i) => (
              <div
                key={i}
                className="relative flex flex-col bg-surface border border-border/50 rounded-2xl p-6 hover:-translate-y-1 transition-transform"
              >
                <Quote className="h-8 w-8 text-brand/20 mb-4" />
                <p className="flex-1 text-muted-foreground leading-relaxed italic mb-6">
                  "{item.text}"
                </p>
                <div className="flex items-center gap-3 border-t border-border pt-4">
                  {item.avatar_url ? (
                    <img
                      src={item.avatar_url}
                      alt={item.author}
                      className="h-10 w-10 rounded-full object-cover"
                    />
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
    }

    // ── TOURS GRID ────────────────────────────────────────────────
    case "tours_grid":
      return <ToursGridBlock block={b} agencySlug={agencySlug} handleLinkClick={handleLinkClick} />;

    // ── STATS ─────────────────────────────────────────────────────
    case "stats":
      return (
        <section className="mx-auto max-w-5xl w-full px-4">
          {b.title && (
            <h2 className="text-3xl font-bold tracking-tight text-center mb-12">{b.title}</h2>
          )}
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {b.items?.map((item, i) => (
              <div
                key={i}
                className="flex flex-col items-center text-center p-6 rounded-2xl bg-surface border border-border/50"
              >
                <div className="text-brand mb-2">{renderIconByName(item.icon, "h-6 w-6")}</div>
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
            <div
              className="relative overflow-hidden rounded-2xl border border-border"
              style={{ height: "400px" }}
            >
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
              <span className="text-sm text-muted-foreground">
                Configure o embed do Google Maps
              </span>
            </div>
          )}
          {b.address_label && (
            <p className="mt-4 text-center text-sm text-muted-foreground">{b.address_label}</p>
          )}
        </section>
      );

    // ── BLOG FEED ─────────────────────────────────────────────────
    case "blog_feed":
      return <BlogFeedBlock block={b} agencySlug={agencySlug} handleLinkClick={handleLinkClick} />;

    // ── BIOLINK HEADER ────────────────────────────────────────────
    case "biolink_header":
      return (
        <section
          className="mx-auto max-w-md w-full px-4 text-center pb-8 pt-12 rounded-t-3xl"
          style={{ backgroundColor: b.bg_color, color: b.text_color }}
        >
          {b.avatar_url ? (
            <img
              src={b.avatar_url}
              alt={b.name}
              className="w-24 h-24 mx-auto rounded-full object-cover border-4 border-background/20 mb-4"
            />
          ) : (
            <div className="w-24 h-24 mx-auto rounded-full bg-surface-alt/30 border-4 border-background/20 mb-4 flex items-center justify-center text-3xl">
              {b.name?.charAt(0) || "?"}
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-tight mb-2">{b.name}</h1>
          <div
            className="opacity-90 max-w-sm mx-auto prose prose-sm dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(b.bio || "") }}
          />
        </section>
      );

    // ── BIOLINK LINKS ─────────────────────────────────────────────
    case "biolink_links":
      return (
        <section className="mx-auto max-w-md w-full px-4 pb-12 space-y-3">
          {(b.items || []).map((item, idx) => {
            const style = b.button_style || "solid";
            const rounded = b.button_rounded || "full";
            
            let baseClasses = "flex items-center p-4 transition-transform hover:scale-105 active:scale-95 border ";
            
            if (rounded === "none") baseClasses += "rounded-none ";
            else if (rounded === "md") baseClasses += "rounded-xl ";
            else baseClasses += "rounded-full ";

            if (item.highlight) {
              baseClasses += "bg-brand text-brand-foreground border-brand font-bold shadow-lg shadow-brand/20 ";
            } else {
              if (style === "solid") {
                 baseClasses += "bg-surface text-foreground border-border/50 font-medium hover:border-brand/40 shadow-sm ";
              } else if (style === "outline") {
                 baseClasses += "bg-transparent text-foreground border-border font-medium hover:border-foreground ";
              } else {
                 // soft
                 baseClasses += "bg-surface-alt/50 text-foreground border-transparent font-medium hover:bg-surface-alt ";
              }
            }

            return (
              <a
                key={idx}
                href={item.url}
                target={item.url?.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                onClick={() => handleLinkClick(item.url)}
                className={baseClasses}
              >
                <span className="mr-3 shrink-0 flex items-center justify-center">
                  {renderIconByName(item.icon, "h-5 w-5")}
                </span>
                <span className="flex-1 text-center pr-8">{item.title}</span>
              </a>
            );
          })}
        </section>
      );

    // ── SUPPORT TICKET FORM ───────────────────────────────────────
    case "support_ticket_form":
      return <SupportTicketBlock key={b.id} block={b} agencySlug={agencySlug} />;

    // ── GROUP TOUR DETAILS ────────────────────────────────────────
    case "group_tour_details":
      return <GroupTourDetailsBlock key={b.id} block={b} agencySlug={agencySlug} />;

    // ── CLIENT PORTAL ACCESS ──────────────────────────────────────
    case "client_portal_access":
      return (
        <section className="mx-auto max-w-lg bg-surface border border-border/80 rounded-3xl p-8 shadow-lg text-center flex flex-col items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-brand/10 text-brand flex items-center justify-center">
            <Plane className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{b.title || "Área do Passageiro"}</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            {b.description || "Acesse seus vouchers, passagens aéreas e guias de embarque da sua viagem."}
          </p>
          <Link
            to={"/auth/login" as any}
            onClick={() => handleLinkClick("/auth/login")}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-6 text-sm font-bold text-brand-foreground transition-all hover:scale-105"
          >
            {b.button_label || "Acessar Painel"}
          </Link>
        </section>
      );

    // ── PENDING CONTRACTS WIDGET ──────────────────────────────────
    case "pending_contracts_widget":
      return <PendingContractsWidgetBlock block={b} agencyId={agencyId} handleLinkClick={handleLinkClick} />;

    // ── FEATURED DESTINATIONS ──────────────────────────────────────
    case "featured_destinations":
      return (
        <section className="mx-auto max-w-6xl w-full px-4">
          {b.title && (
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-extrabold tracking-tight">{b.title}</h2>
              {b.subtitle && <p className="mt-2 text-muted-foreground text-sm leading-relaxed">{b.subtitle}</p>}
            </div>
          )}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {b.items?.map((item, i) => (
              <a
                key={i}
                href={item.link || "#"}
                onClick={() => item.link && handleLinkClick(item.link)}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-surface transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-brand/40"
              >
                <div className="relative aspect-video overflow-hidden">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.destination}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full bg-surface-alt" />
                  )}
                  {item.price && (
                    <div className="absolute top-3 right-3 rounded-md bg-brand px-2.5 py-1 text-xs font-bold text-brand-foreground shadow">
                      {item.price}
                    </div>
                  )}
                </div>
                <div className="flex flex-col p-5 flex-1 justify-between">
                  <div>
                    <h3 className="font-bold text-base leading-tight group-hover:text-brand transition-colors mb-2">
                      {item.destination}
                    </h3>
                    <p className="text-muted-foreground text-[11px] leading-relaxed line-clamp-3">
                      {item.description}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/40 text-xs font-bold text-brand flex items-center gap-1 group-hover:underline">
                    Fazer Cotação <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      );

    // ── SOCIAL LINKS ───────────────────────────────────────────────
    case "social_links":
      return (
        <section className="mx-auto max-w-xl w-full text-center px-4">
          {b.title && (
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
              {b.title}
            </h3>
          )}
          <div className="flex justify-center items-center gap-3.5">
            {b.instagram && (
              <a
                href={b.instagram}
                target="_blank"
                rel="noreferrer"
                onClick={() => handleLinkClick(b.instagram!)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground hover:bg-brand/10 hover:text-brand transition-all hover:scale-110 shadow-sm"
                title="Instagram"
              >
                <Instagram className="h-4.5 w-4.5" />
              </a>
            )}
            {b.facebook && (
              <a
                href={b.facebook}
                target="_blank"
                rel="noreferrer"
                onClick={() => handleLinkClick(b.facebook!)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground hover:bg-brand/10 hover:text-brand transition-all hover:scale-110 shadow-sm"
                title="Facebook"
              >
                <Facebook className="h-4.5 w-4.5" />
              </a>
            )}
            {b.youtube && (
              <a
                href={b.youtube}
                target="_blank"
                rel="noreferrer"
                onClick={() => handleLinkClick(b.youtube!)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground hover:bg-brand/10 hover:text-brand transition-all hover:scale-110 shadow-sm"
                title="YouTube"
              >
                <Youtube className="h-4.5 w-4.5" />
              </a>
            )}
            {b.linkedin && (
              <a
                href={b.linkedin}
                target="_blank"
                rel="noreferrer"
                onClick={() => handleLinkClick(b.linkedin!)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground hover:bg-brand/10 hover:text-brand transition-all hover:scale-110 shadow-sm"
                title="LinkedIn"
              >
                <Linkedin className="h-4.5 w-4.5" />
              </a>
            )}
            {b.whatsapp && (
              <a
                href={b.whatsapp.startsWith("http") ? b.whatsapp : `https://wa.me/${b.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => handleLinkClick(b.whatsapp!)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600 transition-all hover:scale-110 shadow-sm"
                title="WhatsApp"
              >
                <Phone className="h-4.5 w-4.5" />
              </a>
            )}
          </div>
        </section>
      );

    // ── NEWSLETTER ─────────────────────────────────────────────────
    case "newsletter":
      return <NewsletterBlock block={b} handleLinkClick={handleLinkClick} agencySlug={agencySlug} />;

    default:
      return null;
  }
}

function NewsletterBlock({
  block,
  handleLinkClick,
  agencySlug,
}: {
  block: any;
  handleLinkClick: (url: string) => void;
  agencySlug: string;
}) {
  const [emailInput, setEmailInput] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleNewsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setLoading(true);
    try {
      const { error } = await (supabase.rpc as any)("submit_public_lead", {
        _agency_slug: agencySlug,
        _name: "Inscrito Newsletter",
        _email: emailInput.trim(),
        _phone: null,
        _destination: null,
        _travel_start: null,
        _travel_end: null,
        _pax_count: 1,
        _estimated_value: 0,
        _source: "newsletter",
        _notes: "Inscrição de newsletter capturada pelo portal da agência",
      });
      if (error) {
        toast.error("Erro ao se inscrever: " + error.message);
      } else {
        toast.success("E-mail cadastrado com sucesso! Obrigado por se inscrever.");
        setEmailInput("");
        setSubscribed(true);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro inesperado ao cadastrar e-mail");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl w-full px-4 py-4">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand/10 to-indigo-50 dark:from-brand/5 dark:to-slate-800/20 border border-brand/20 p-8 md:p-12 text-center flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-brand/15 text-brand flex items-center justify-center mb-2">
          <Mail className="h-5 w-5" />
        </div>
        <h3 className="text-xl md:text-2xl font-black text-foreground">{block.title || "Receba Nossas Ofertas"}</h3>
        <p className="text-xs md:text-sm text-muted-foreground max-w-md">
          {block.subtitle || "Inscreva seu e-mail e seja o primeiro a saber sobre nossos novos roteiros."}
        </p>
        {subscribed ? (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs bg-emerald-50 dark:bg-emerald-900/10 px-4 py-2 rounded-xl border border-emerald-200/40 font-semibold">
            <CheckCircle2 className="h-4 w-4" /> Cadastro realizado com sucesso!
          </div>
        ) : (
          <form onSubmit={handleNewsSubmit} className="flex flex-col sm:flex-row gap-2 w-full max-w-md mt-4">
            <input
              type="email"
              required
              disabled={loading}
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder={block.placeholder || "Seu melhor e-mail"}
              className="flex-1 h-11 px-4 rounded-xl border border-border bg-surface text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-brand/60 focus:ring-1 focus:ring-brand/60 outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={loading}
              className="h-11 rounded-xl bg-brand hover:bg-brand/90 px-6 text-xs font-bold text-brand-foreground transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {loading ? "Cadastrando..." : (block.button_label || "Cadastrar")}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

// ─── PendingContractsWidgetBlock ──────────────────────────────────────────────
function PendingContractsWidgetBlock({ 
  block, 
  handleLinkClick,
  agencyId 
}: { 
  block: any; 
  handleLinkClick: (url: string) => void;
  agencyId?: string;
}) {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Estados do formulário de busca para convidados/pagantes sem login
  const [email, setEmail] = useState("");
  const [document, setDocument] = useState("");
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setIsLoggedIn(true);
          const { data: clients } = await supabase.from("clients").select("id").eq("user_id", user.id);
          const clientIds = clients?.map((c) => c.id) || [];
          if (clientIds.length) {
            const { data: trips } = await supabase.from("trips").select("id").in("client_id", clientIds).is("deleted_at", null);
            const tripIds = trips?.map((t) => t.id) || [];
            if (tripIds.length) {
              const { data: pending } = await supabase
                .from("contracts")
                .select("id, status, package_summary, public_token")
                .in("trip_id", tripIds)
                .neq("status", "signed");
              
              setContracts(
                (pending || []).map(c => ({
                  id: c.id,
                  title: c.package_summary || "Contrato de Viagem",
                  public_token: c.public_token,
                  status: c.status
                }))
              );
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() && !document.trim()) {
      toast.error("Por favor, preencha pelo menos um campo (E-mail ou Documento)");
      return;
    }
    if (!agencyId) {
      toast.error("Identificador da agência não disponível");
      return;
    }
    setSearching(true);
    try {
      const { data, error } = await (supabase as any).rpc("get_contracts_by_payer_info", {
        p_email: email.trim() || null,
        p_document: document.trim() || null,
        p_agency_id: agencyId
      });
      if (error) {
        toast.error("Erro ao buscar contratos: " + error.message);
      } else {
        setContracts(data || []);
        setHasSearched(true);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao consultar os contratos");
    } finally {
      setSearching(false);
    }
  };

  if (loading) return <div className="h-24 w-full animate-pulse rounded-2xl bg-surface-alt/40" />;

  // Se o usuário estiver logado e não possuir contratos pendentes, não exibe o widget
  if (isLoggedIn && contracts.length === 0) return null;

  return (
    <section className="mx-auto max-w-lg bg-yellow-500/10 border border-yellow-500/25 rounded-3xl p-6 flex flex-col items-center gap-4 text-center">
      <div className="h-10 w-10 rounded-full bg-yellow-500/15 text-yellow-500 flex items-center justify-center">
        <AlertCircle className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-bold text-base text-yellow-600 dark:text-yellow-500">{block.title || "Contratos Pendentes"}</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          {block.description || "Você possui termos ou contratos aguardando sua assinatura eletrônica."}
        </p>
      </div>

      {!isLoggedIn && (
        <form onSubmit={handleSearch} className="w-full space-y-3 mt-2 text-left bg-surface border border-border/85 p-4 rounded-2xl">
          <div className="text-xs font-bold text-foreground mb-1">Buscar Contratos (Sem Login)</div>
          <div className="space-y-2">
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-0.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs outline-none focus:border-brand"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Documento (CPF ou CNPJ)</label>
              <input
                type="text"
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                className="w-full mt-0.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs outline-none focus:border-brand"
                placeholder="000.000.000-00"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={searching}
            className="w-full mt-2 h-9 rounded-lg bg-brand text-brand-foreground font-bold text-xs hover:bg-brand/90 transition-colors disabled:opacity-50"
          >
            {searching ? "Buscando..." : "Consultar Contratos"}
          </button>
        </form>
      )}

      {contracts.length > 0 ? (
        <div className="w-full space-y-2 mt-2">
          {contracts.map((c) => (
            <a
              key={c.id}
              href={`/m/contract/${c.public_token}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => handleLinkClick(`/m/contract/${c.public_token}`)}
              className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border/80 hover:border-yellow-500/50 transition-colors text-left"
            >
              <div className="flex flex-col truncate max-w-[220px]">
                <span className="text-xs font-semibold text-foreground truncate">{c.title || "Contrato de Prestação de Serviços"}</span>
                {c.status && (
                  <span className="text-[9px] text-muted-foreground lowercase">Status: {c.status}</span>
                )}
              </div>
              <span className="text-[10px] font-bold text-yellow-600 bg-yellow-500/15 px-2 py-0.5 rounded-full uppercase shrink-0">
                {c.status === "signed" ? "Ver" : "Assinar"}
              </span>
            </a>
          ))}
        </div>
      ) : (
        !isLoggedIn && hasSearched && (
          <div className="text-xs text-muted-foreground py-2 italic">Nenhum contrato encontrado para os dados informados.</div>
        )
      )}
    </section>
  );
}

// ─── GroupTourDetailsBlock ───────────────────────────────────────────────────
function GroupTourDetailsBlock({ block, agencySlug }: { block: any; agencySlug: string }) {
  const [tour, setTour] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!block.tour_id) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("group_tours")
        .select("*")
        .eq("id", block.tour_id)
        .maybeSingle();
      setTour(data);
      setLoading(false);
    }
    load();
  }, [block.tour_id]);

  if (loading)
    return (
      <div className="mx-auto max-w-4xl w-full px-4 h-64 animate-pulse rounded-2xl bg-surface-alt" />
    );
  if (!tour)
    return (
      <div className="mx-auto max-w-4xl p-8 border border-dashed border-border rounded-xl text-center bg-surface-alt/30 text-muted-foreground">
        <p className="font-semibold text-sm">Tour não encontrado</p>
        <p className="text-xs mt-1">Configure o ID do roteiro no painel lateral.</p>
      </div>
    );

  return (
    <section className="mx-auto max-w-5xl w-full px-4 py-8">
      <div className="grid lg:grid-cols-2 gap-10">
        <div>
          {tour.cover_image_url ? (
            <img
              src={tour.cover_image_url}
              alt={tour.title}
              className="w-full rounded-3xl object-cover aspect-[4/3] shadow-lg"
            />
          ) : (
            <div className="w-full rounded-3xl aspect-[4/3] bg-surface-alt flex items-center justify-center border border-border" />
          )}
        </div>
        <div className="flex flex-col justify-center space-y-6">
          <div className="inline-flex px-3 py-1 bg-brand/10 text-brand font-bold text-xs rounded-full uppercase tracking-widest w-fit">
            {tour.destination}
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">{tour.title}</h2>
          <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {tour.description}
          </p>

          <div className="flex flex-col space-y-4 pt-6 border-t border-border">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Data de Partida</span>
              <span className="font-bold">
                {tour.departure_date
                  ? new Date(tour.departure_date).toLocaleDateString("pt-BR")
                  : "A Confirmar"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Preço Base</span>
              <span className="text-2xl font-black text-brand">
                {Number(tour.base_price).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Vagas Disponíveis</span>
              <span className="font-bold">{tour.available_seats || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── SupportTicketBlock ────────────────────────────────────────────────────────
function SupportTicketBlock({ block, agencySlug }: { block: any; agencySlug: string }) {
  const [f, setF] = useState({ subject: "", description: "", email: "" });
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    const { error } = await (supabase.rpc as any)("submit_public_ticket", {
      _agency_slug: agencySlug,
      _email: f.email,
      _subject: f.subject,
      _description: f.description,
    });

    if (error) {
      toast.error("Erro ao enviar: " + error.message);
      setBusy(false);
      return;
    }

    setBusy(false);
    setSubmitted(true);
    toast.success("Ticket aberto com sucesso!");
  }

  return (
    <section className="mx-auto max-w-3xl bg-surface border border-border rounded-3xl p-8 shadow-sm">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-2">{block.title}</h2>
        <p className="text-muted-foreground">{block.subtitle}</p>
      </div>

      {submitted ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-success mb-4" />
          <h3 className="text-xl font-bold mb-2">Chamado Aberto!</h3>
          <p className="text-muted-foreground text-sm">
            Recebemos sua solicitação. Responderemos em seu email brevemente.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Email para Contato *</label>
            <input
              required
              type="email"
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
              className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm focus:border-brand outline-none"
              placeholder="seu@email.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Assunto *</label>
            <input
              required
              value={f.subject}
              onChange={(e) => setF({ ...f, subject: e.target.value })}
              className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm focus:border-brand outline-none"
              placeholder="Ex: Dúvida sobre reserva"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Descrição *</label>
            <textarea
              required
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
              className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm focus:border-brand outline-none resize-y"
              placeholder="Descreva o problema com detalhes..."
              rows={4}
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full h-12 rounded-xl bg-brand text-brand-foreground font-bold hover:bg-brand/90 disabled:opacity-50 transition-colors"
          >
            {busy ? "Enviando..." : "Abrir Chamado"}
          </button>
        </form>
      )}
    </section>
  );
}

// ─── ToursGridBlock ────────────────────────────────────────────────────────────
function ToursGridBlock({ block, agencySlug, handleLinkClick }: { block: any; agencySlug: string; handleLinkClick: (url: string) => void }) {
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
      if (!ag) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("group_tours")
        .select("id, title, destination, departure_date, base_price, cover_image_url")
        .eq("agency_id", ag.id)
        .in("status", ["open", "confirmed"])
        .order("departure_date", { ascending: true })
        .limit(block.max_items || 6);
      setTours(data ?? []);
      setLoading(false);
    }
    load();
  }, [agencySlug, block.max_items]);

  if (loading)
    return (
      <div className="mx-auto max-w-6xl w-full px-4 h-48 animate-pulse rounded-2xl bg-surface-alt" />
    );
  if (tours.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl w-full px-4">
      {block.title && (
        <div className="mb-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight">{block.title}</h2>
          {block.subtitle && <p className="mt-2 text-muted-foreground">{block.subtitle}</p>}
        </div>
      )}
      <div className={`mt-8 ${block.layout === "list" ? "flex flex-col gap-4" : "grid gap-6 sm:grid-cols-2 md:grid-cols-3"}`}>
        {tours.map((t) => (
          <Link
            key={t.id}
            to="/p/$agency_slug/tour/$id"
            params={{ agency_slug: agencySlug, id: t.id }}
            onClick={() => handleLinkClick(`/p/${agencySlug}/tour/${t.id}`)}
            className={`group overflow-hidden border-2 border-border/50 bg-surface transition-all hover:border-brand/40 ${
              block.layout === "list"
                ? "flex flex-col sm:flex-row rounded-2xl items-stretch min-h-[140px] hover:-translate-y-0.5"
                : "flex flex-col rounded-2xl hover:-translate-y-1"
            }`}
          >
            <div className={`relative overflow-hidden shrink-0 ${block.layout === "list" ? "aspect-video sm:w-60 sm:aspect-[4/3]" : "aspect-video w-full"}`}>
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
                <h3 className="font-bold text-base md:text-lg leading-tight group-hover:text-brand transition-colors">
                  {t.title}
                </h3>
              </div>
              <div className={`mt-4 pt-3 border-t border-border/50 flex ${block.layout === "list" ? "items-center justify-between" : "flex-col"}`}>
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground font-bold block">
                    A partir de
                  </span>
                  <div className="font-mono text-lg font-bold text-brand leading-none">
                    {Number(t.base_price).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </div>
                </div>
                {block.layout === "list" && (
                  <span className="text-xs font-bold text-brand hover:underline flex items-center gap-0.5">
                    Ver detalhes <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── BlogFeedBlock ─────────────────────────────────────────────────────────────
function BlogFeedBlock({ block, agencySlug, handleLinkClick }: { block: any; agencySlug: string; handleLinkClick: (url: string) => void }) {
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
      if (!agency) {
        setLoading(false);
        return;
      }

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

  if (loading)
    return (
      <div className="mx-auto max-w-5xl w-full px-4 h-48 animate-pulse rounded-2xl bg-surface-alt" />
    );
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
            onClick={() => handleLinkClick(`/p/${agencySlug}/blog/${p.slug}`)}
            className="group overflow-hidden rounded-2xl border border-border bg-surface hover:border-brand/40 transition-all"
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
                  {new Date(p.published_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              )}
              <h3 className="font-bold text-base group-hover:text-brand transition-colors">
                {p.title}
              </h3>
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
    if (error) {
      toast.error("Erro ao enviar: " + error.message);
      return;
    }
    setSubmitted(true);
    toast.success("Mensagem enviada com sucesso!");
  }

  return (
    <section className="mx-auto max-w-4xl bg-surface-alt/50 border border-border/50 rounded-3xl p-8 lg:p-12">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold tracking-tight mb-4">{block.title}</h2>
        <div
          className="text-lg text-muted-foreground max-w-none prose prose-sm dark:prose-invert mx-auto"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.text || "") }}
        />
      </div>

      {submitted ? (
        <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in slide-in-from-bottom-4">
          <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center text-success mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="text-2xl font-bold mb-2">Tudo certo!</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Recebemos sua mensagem. Um de nossos consultores especialistas entrará em contato em
            breve.
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
              {busy ? (
                "Enviando..."
              ) : (
                <>
                  <Send className="w-4 h-4" /> Enviar Mensagem
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
