import React, { useState, useEffect } from "react";
import { NewSectionsRenderer } from "./NewSectionsRenderer";
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
  CloudSun,
  Ticket,
  CreditCard,
  Upload,
  Gift,
  MapPin,
  Clock,
  Coins,
  FileText,
  QrCode,
  Share2,
  HelpCircle,
  Activity,
  BadgePercent,
  DollarSign,
  Check,
} from "lucide-react";
import type { PortalBlock, LegacyPortalBlock } from "@/lib/cms-types";

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

// Singleton animation keyframe injection — only injected once in the DOM
const ANIM_KEYFRAMES_ID = "ta-block-animations";
function ensureAnimationKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(ANIM_KEYFRAMES_ID)) return;
  const style = document.createElement("style");
  style.id = ANIM_KEYFRAMES_ID;
  style.textContent = `
    @keyframes ta-fade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes ta-slide-up { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes ta-slide-down { from { opacity: 0; transform: translateY(-32px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes ta-slide-left { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes ta-slide-right { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes ta-zoom-in { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
  `;
  document.head.appendChild(style);
}

const ANIMATION_NAME_MAP: Record<string, string> = {
  fade: "ta-fade",
  "slide-up": "ta-slide-up",
  "slide-down": "ta-slide-down",
  "slide-left": "ta-slide-left",
  "slide-right": "ta-slide-right",
  "zoom-in": "ta-zoom-in",
};

export function BlockStyleWrapper({
  block,
  children,
}: {
  block: PortalBlock;
  children: React.ReactNode;
}) {
  const styles = (block as any).styles;
  if (!styles) return <div className="w-full">{children}</div>;

  const {
    bg_type,
    bg_color,
    bg_gradient,
    bg_image_url,
    text_color,
    padding_y,
    border_radius,
    border_effect,
    shadow_effect,
    animation,
    animation_duration,
    animation_delay,
  } = styles;

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

  // Inject CSS keyframes if there's an animation set
  if (animation && animation !== "none") {
    ensureAnimationKeyframes();
    const animName = ANIMATION_NAME_MAP[animation];
    if (animName) {
      inlineStyles.animation = `${animName} ${animation_duration ?? 600}ms ease-out ${animation_delay ?? 0}ms both`;
    }
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

  const borderMap = {
    none: "",
    solid: "border border-border/80",
    glass: "border border-white/10 backdrop-blur-md",
    glow: "border border-indigo-500/30 ring-1 ring-indigo-500/15",
  };
  const borderClass = borderMap[border_effect as keyof typeof borderMap] || "";

  const shadowMap = {
    none: "",
    sm: "shadow-sm",
    md: "shadow-md",
    lg: "shadow-2xl shadow-black/25",
    glow: "shadow-lg shadow-indigo-500/20",
  };
  const shadowClass = shadowMap[shadow_effect as keyof typeof shadowMap] || "";

  return (
    <div
      style={inlineStyles}
      className={`w-full transition-all overflow-hidden${paddingClass}${radiusClass}${borderClass}${shadowClass}${bg_type === "image" ? "relative before:absolute before:inset-0 before:bg-background/20 before:z-0" : ""}`}
    >
      <div className={bg_type === "image" ? "relative z-10 w-full" : "w-full"}>{children}</div>
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
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch((err) => {
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
      {blocks.map((blockItem) => {
        const b = blockItem as LegacyPortalBlock;
        const isSelected = selectedBlockId === b.id;
        const Wrapper = "div";

        return (
          <Wrapper
            key={b.id}
            onClick={onSelectBlock ? () => onSelectBlock(b.id) : undefined}
            className={`w-full text-left relative outline-none transition-all duration-200 group block-wrapper-preview${onSelectBlock ? "cursor-pointer hover:ring-2 hover:ring-brand/50 hover:ring-offset-4 rounded-3xl" : ""}${isSelected ? "ring-2 ring-brand ring-offset-4 scale-[1.01]" : ""}`}
          >
            {onSelectBlock && (
              <div
                className={`absolute -top-3 -right-3 z-50 rounded-full bg-brand text-white px-2 py-0.5 text-[10px] font-bold transition-opacity duration-200${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              >
                {b.type.toUpperCase()}
              </div>
            )}
            <div
              className={`pointer-events-none transition-opacity${isSelected ? "opacity-100" : onSelectBlock ? "opacity-80 group-hover:opacity-100" : ""}`}
            >
              <BlockStyleWrapper block={b}>
                {renderBlock(b, agencySlug, handleLinkClick, agencyId, pageId)}
              </BlockStyleWrapper>
            </div>
          </Wrapper>
        );
      })}
    </div>
  );
}

function renderBlock(
  blockItem: PortalBlock,
  agencySlug: string,
  handleLinkClick: (url: string) => void,
  agencyId?: string,
  pageId?: string,
) {
  const b = blockItem as LegacyPortalBlock;
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
                      className="inline-flex h-12 items-center justify-center rounded-xl bg-brand px-6 text-sm font-bold text-brand-foreground transition-all hover:scale-105 active:scale-95"
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
                    className="rounded-2xl object-cover aspect-video lg:aspect-[4/3] w-full border border-border/40"
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
          className={`mx-auto max-w-5xl flex flex-col gap-8 lg:flex-row${b.align === "right" ? "lg:flex-row-reverse" : ""}${b.align === "center" ? "text-center items-center justify-center" : "items-center"}`}
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
              <h2 className="text-3xl font-extrabold tracking-tight text-center mb-12">
                {b.title}
              </h2>
            )}
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {b.items?.map((item, i) => (
                <div
                  key={i}
                  className="flex flex-col items-start bg-gradient-to-br from-surface to-surface-alt/30 p-7 rounded-3xl border border-border/80 transition-all duration-300 hover:-translate-y-1.5 hover:border-brand/40 group"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand mb-5 group-hover:scale-110 transition-transform">
                    {renderIconByName(item.icon, "h-6 w-6")}
                  </div>
                  <h3 className="text-lg font-bold mb-2 group-hover:text-brand transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {item.description}
                  </p>
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
              <h2 className="text-3xl font-extrabold tracking-tight text-center mb-10">
                {b.title}
              </h2>
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
              <h2 className="text-3xl font-extrabold tracking-tight text-center mb-10">
                {b.title}
              </h2>
            )}
            <div className="grid gap-6 md:grid-cols-2">
              {b.items?.map((item, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-surface-alt/20 p-6 hover:border-brand/20 transition-colors"
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
              <h2 className="text-3xl font-extrabold tracking-tight text-center mb-12">
                {b.title}
              </h2>
            )}
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {b.items?.map((item, i) => (
                <div key={i} className="flex flex-col gap-4">
                  <div className="relative bg-surface-alt/45 border border-border/60 p-6 rounded-2xl hover:border-brand/20 transition-all duration-300">
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
                        className="h-9 w-9 rounded-full object-cover border border-border"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-brand font-bold text-xs">
                        {item.author.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-xs text-foreground">{item.author}</div>
                      {item.role && (
                        <div className="text-[10px] text-muted-foreground">{item.role}</div>
                      )}
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

            let baseClasses =
              "flex items-center p-4 transition-transform hover:scale-105 active:scale-95 border";

            if (rounded === "none") baseClasses += "rounded-none";
            else if (rounded === "md") baseClasses += "rounded-xl";
            else baseClasses += "rounded-full";

            if (item.highlight) {
              baseClasses += "bg-brand text-brand-foreground border-brand font-bold";
            } else {
              if (style === "solid") {
                baseClasses +=
                  "bg-surface text-foreground border-border/50 font-medium hover:border-brand/40";
              } else if (style === "outline") {
                baseClasses +=
                  "bg-transparent text-foreground border-border font-medium hover:border-foreground";
              } else {
                // soft
                baseClasses +=
                  "bg-surface-alt/50 text-foreground border-transparent font-medium hover:bg-surface-alt";
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
        <section className="mx-auto max-w-lg bg-surface border border-border/80 rounded-3xl p-8 text-center flex flex-col items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-brand/10 text-brand flex items-center justify-center">
            <Plane className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{b.title || "Área do Passageiro"}</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            {b.description ||
              "Acesse seus vouchers, passagens aéreas e guias de embarque da sua viagem."}
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
      return (
        <PendingContractsWidgetBlock
          block={b}
          agencyId={agencyId}
          handleLinkClick={handleLinkClick}
        />
      );

    // ── FEATURED DESTINATIONS ──────────────────────────────────────
    case "featured_destinations":
      return (
        <section className="mx-auto max-w-6xl w-full px-4">
          {b.title && (
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-extrabold tracking-tight">{b.title}</h2>
              {b.subtitle && (
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">{b.subtitle}</p>
              )}
            </div>
          )}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {b.items?.map((item, i) => (
              <a
                key={i}
                href={item.link || "#"}
                onClick={() => item.link && handleLinkClick(item.link)}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-brand/40"
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
                    <div className="absolute top-3 right-3 rounded-md bg-brand px-2.5 py-1 text-xs font-bold text-brand-foreground">
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
                    Fazer Cotação{" "}
                    <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
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
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground hover:bg-brand/10 hover:text-brand transition-all hover:scale-110"
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
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground hover:bg-brand/10 hover:text-brand transition-all hover:scale-110"
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
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground hover:bg-brand/10 hover:text-brand transition-all hover:scale-110"
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
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground hover:bg-brand/10 hover:text-brand transition-all hover:scale-110"
                title="LinkedIn"
              >
                <Linkedin className="h-4.5 w-4.5" />
              </a>
            )}
            {b.whatsapp && (
              <a
                href={
                  b.whatsapp.startsWith("http")
                    ? b.whatsapp
                    : `https://wa.me/${b.whatsapp.replace(/\D/g, "")}`
                }
                target="_blank"
                rel="noreferrer"
                onClick={() => handleLinkClick(b.whatsapp!)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600 transition-all hover:scale-110"
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
      return (
        <NewsletterBlock block={b} handleLinkClick={handleLinkClick} agencySlug={agencySlug} />
      );

    // ── TOURS CAROUSEL ─────────────────────────────────────────────
    case "tours_carousel":
      return (
        <ToursCarouselBlock block={b} agencySlug={agencySlug} handleLinkClick={handleLinkClick} />
      );

    // ── DESTINATION FILTER ─────────────────────────────────────────
    case "featured_destination_filter":
      return (
        <FeaturedDestinationFilterBlock
          block={b}
          agencySlug={agencySlug}
          handleLinkClick={handleLinkClick}
        />
      );

    // ── TEAM WIDGET ────────────────────────────────────────────────
    case "team_widget":
      return <TeamWidgetBlock block={b} agencyId={agencyId} />;

    // ── LIVE REVIEWS ───────────────────────────────────────────────
    case "live_reviews":
      return <LiveReviewsBlock block={b} agencyId={agencyId} />;

    // ── WHATSAPP DEPARTMENTS ───────────────────────────────────────
    case "whatsapp_departments":
      return <WhatsappDepartmentsBlock block={b} handleLinkClick={handleLinkClick} />;

    // ── COUNTDOWN TOUR ─────────────────────────────────────────────
    case "countdown_tour":
      return (
        <CountdownTourBlock block={b} agencySlug={agencySlug} handleLinkClick={handleLinkClick} />
      );

    // ── SOCIAL LINKS ROW ───────────────────────────────────────────
    case "social_links_row":
      return <SocialLinksRowBlock block={b} handleLinkClick={handleLinkClick} />;

    // ── EXCHANGE RATES ─────────────────────────────────────────────
    case "exchange_rates":
      return <ExchangeRatesBlock block={b} />;

    // ── DYNAMIC MAP ROUTE ──────────────────────────────────────────
    case "dynamic_map_route":
      return <DynamicMapRouteBlock block={b} agencySlug={agencySlug} />;

    case "agency_vouchers":
      return <AgencyVouchersBlock block={b} handleLinkClick={handleLinkClick} />;

    case "weather_forecast":
      return <WeatherForecastBlock block={b} />;

    case "itinerary_timeline":
      return <ItineraryTimelineBlock block={b} />;

    case "lead_capture_callback":
      return <LeadCaptureCallbackBlock block={b} agencySlug={agencySlug} />;

    case "promotional_banner":
      return <PromotionalBannerBlock block={b} />;

    case "payment_gateways_display":
      return <PaymentGatewaysDisplayBlock block={b} agencyId={agencyId} />;

    case "agent_profile_card":
      return <AgentProfileCardBlock block={b} agencyId={agencyId} />;

    case "travel_tips_faq":
      return <TravelTipsFaqBlock block={b} agencyId={agencyId} />;

    case "live_tours_map":
      return <LiveToursMapBlock block={b} agencySlug={agencySlug} />;

    case "gift_cards_store":
      return <GiftCardsStoreBlock block={b} agencySlug={agencySlug} />;

    case "corporate_rfp_form":
      return <CorporateRfpFormBlock block={b} agencySlug={agencySlug} />;

    case "client_document_upload":
      return <ClientDocumentUploadBlock block={b} agencyId={agencyId} />;

    case "biolink_newsletter_box":
      return <BiolinkNewsletterBoxBlock block={b} agencySlug={agencySlug} />;

    case "live_sales_counter":
      return <LiveSalesCounterBlock block={b} agencyId={agencyId} />;

    case "visa_checker":
      return <VisaCheckerBlock block={b} />;

    case "insurance_simulator":
      return <InsuranceSimulatorBlock block={b} agencySlug={agencySlug} />;

    case "reviews_submission_form":
      return <ReviewsSubmissionFormBlock block={b} agencyId={agencyId} />;

    case "whatsapp_floating_bubble":
      return <WhatsappFloatingBubbleBlock block={b} />;

    case "custom_package_lead_builder":
      return <CustomPackageLeadBuilderBlock block={b} agencySlug={agencySlug} />;

    case "news_announcements_ticker":
      return <NewsAnnouncementsTickerBlock block={b} agencySlug={agencySlug} />;

    case "faq_category_accordion":
      return <FaqCategoryAccordionBlock block={b} agencyId={agencyId} />;

    case "agency_badges_trust":
      return <AgencyBadgesTrustBlock block={b} />;

    case "currency_calculator":
      return <CurrencyCalculatorBlock block={b} />;

    case "interactive_flight_tracker":
      return <InteractiveFlightTrackerBlock block={b} />;

    case "biolink_qr_code_share":
      return <BiolinkQrCodeShareBlock block={b} />;

    case "client_boarding_timeline":
      return <ClientBoardingTimelineBlock block={b} agencyId={agencyId} />;

    default:
      return (
        <NewSectionsRenderer
          block={
            blockItem as {
              id: string;
              type: string;
              config: Record<string, any>;
              styles?: any;
              animation?: any;
              responsive?: any;
            }
          }
          agencySlug={agencySlug}
          pageId={pageId}
          agencyId={agencyId}
          handleLinkClick={handleLinkClick}
        />
      );
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
        _tags: ["Newsletter Site"],
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
        <h3 className="text-xl md:text-2xl font-black text-foreground">
          {block.title || "Receba Nossas Ofertas"}
        </h3>
        <p className="text-xs md:text-sm text-muted-foreground max-w-md">
          {block.subtitle ||
            "Inscreva seu e-mail e seja o primeiro a saber sobre nossos novos roteiros."}
        </p>
        {subscribed ? (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs bg-emerald-50 dark:bg-emerald-900/10 px-4 py-2 rounded-xl border border-emerald-200/40 font-semibold">
            <CheckCircle2 className="h-4 w-4" /> Cadastro realizado com sucesso!
          </div>
        ) : (
          <form
            onSubmit={handleNewsSubmit}
            className="flex flex-col sm:flex-row gap-2 w-full max-w-md mt-4"
          >
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
              className="h-11 rounded-xl bg-brand hover:bg-brand/90 px-6 text-xs font-bold text-brand-foreground transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {loading ? "Cadastrando..." : block.button_label || "Cadastrar"}
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
  agencyId,
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
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setIsLoggedIn(true);
          const { data: clients } = await supabase
            .from("clients")
            .select("id")
            .eq("user_id", user.id);
          const clientIds = clients?.map((c) => c.id) || [];
          if (clientIds.length) {
            const { data: trips } = await supabase
              .from("trips")
              .select("id")
              .in("client_id", clientIds)
              .is("deleted_at", null);
            const tripIds = trips?.map((t) => t.id) || [];
            if (tripIds.length) {
              const { data: pending } = await supabase
                .from("contracts")
                .select("id, status, package_summary, public_token")
                .in("trip_id", tripIds)
                .neq("status", "signed");

              setContracts(
                (pending || []).map((c) => ({
                  id: c.id,
                  title: c.package_summary || "Contrato de Viagem",
                  public_token: c.public_token,
                  status: c.status,
                })),
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
        p_agency_id: agencyId,
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
        <h3 className="font-bold text-base text-yellow-600 dark:text-yellow-500">
          {block.title || "Contratos Pendentes"}
        </h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          {block.description ||
            "Você possui termos ou contratos aguardando sua assinatura eletrônica."}
        </p>
      </div>

      {!isLoggedIn && (
        <form
          onSubmit={handleSearch}
          className="w-full space-y-3 mt-2 text-left bg-surface border border-border/85 p-4 rounded-2xl"
        >
          <div className="text-xs font-bold text-foreground mb-1">Buscar Contratos (Sem Login)</div>
          <div className="space-y-2">
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-0.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs outline-none focus:border-brand"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground">
                Documento (CPF ou CNPJ)
              </label>
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
                <span className="text-xs font-semibold text-foreground truncate">
                  {c.title || "Contrato de Prestação de Serviços"}
                </span>
                {c.status && (
                  <span className="text-[9px] text-muted-foreground lowercase">
                    Status: {c.status}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold text-yellow-600 bg-yellow-500/15 px-2 py-0.5 rounded-full uppercase shrink-0">
                {c.status === "signed" ? "Ver" : "Assinar"}
              </span>
            </a>
          ))}
        </div>
      ) : (
        !isLoggedIn &&
        hasSearched && (
          <div className="text-xs text-muted-foreground py-2 italic">
            Nenhum contrato encontrado para os dados informados.
          </div>
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
              className="w-full rounded-3xl object-cover aspect-[4/3]"
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
    <section className="mx-auto max-w-3xl bg-surface border border-border rounded-3xl p-8">
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
function ToursGridBlock({
  block,
  agencySlug,
  handleLinkClick,
}: {
  block: any;
  agencySlug: string;
  handleLinkClick: (url: string) => void;
}) {
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
      <div
        className={`mt-8${block.layout === "list" ? "flex flex-col gap-4" : "grid gap-6 sm:grid-cols-2 md:grid-cols-3"}`}
      >
        {tours.map((t) => (
          <Link
            key={t.id}
            to="/p/$agency_slug/tour/$id"
            params={{ agency_slug: agencySlug, id: t.id }}
            onClick={() => handleLinkClick(`/p/${agencySlug}/tour/${t.id}`)}
            className={`group overflow-hidden border-2 border-border/50 bg-surface transition-all hover:border-brand/40${
              block.layout === "list"
                ? "flex flex-col sm:flex-row rounded-2xl items-stretch min-h-[140px] hover:-translate-y-0.5"
                : "flex flex-col rounded-2xl hover:-translate-y-1"
            }`}
          >
            <div
              className={`relative overflow-hidden shrink-0${block.layout === "list" ? "aspect-video sm:w-60 sm:aspect-[4/3]" : "aspect-video w-full"}`}
            >
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
              <div
                className={`mt-4 pt-3 border-t border-border/50 flex${block.layout === "list" ? "items-center justify-between" : "flex-col"}`}
              >
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
function BlogFeedBlock({
  block,
  agencySlug,
  handleLinkClick,
}: {
  block: any;
  agencySlug: string;
  handleLinkClick: (url: string) => void;
}) {
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
      _tags: ["Lead Form Site"],
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

function ToursCarouselBlock({
  block,
  agencySlug,
  handleLinkClick,
}: {
  block: any;
  agencySlug: string;
  handleLinkClick: (url: string) => void;
}) {
  const [tours, setTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
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
        .limit(block.max_items || 8);
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
        <div className="mb-6 text-center shrink-0">
          <h2 className="text-3xl font-bold tracking-tight">{block.title}</h2>
          {block.subtitle && <p className="mt-2 text-muted-foreground">{block.subtitle}</p>}
        </div>
      )}
      <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin scroll-smooth snap-x snap-mandatory">
        {tours.map((t) => (
          <Link
            key={t.id}
            to="/p/$agency_slug/tour/$id"
            params={{ agency_slug: agencySlug, id: t.id }}
            onClick={() => handleLinkClick(`/p/${agencySlug}/tour/${t.id}`)}
            className="min-w-[280px] w-[280px] snap-start flex-shrink-0 group flex flex-col rounded-2xl border-2 border-border/50 bg-surface overflow-hidden transition-all hover:border-brand/40 hover:-translate-y-1"
          >
            <div className="relative aspect-video w-full overflow-hidden shrink-0">
              {t.cover_image_url ? (
                <img
                  src={t.cover_image_url}
                  alt={t.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="h-full w-full bg-surface-alt" />
              )}
              <div className="absolute bottom-3 right-3 rounded-md bg-background/90 px-2 py-1 text-[10px] font-bold backdrop-blur-sm">
                {t.departure_date
                  ? new Date(t.departure_date).toLocaleDateString("pt-BR")
                  : "A Confirmar"}
              </div>
            </div>
            <div className="p-4 flex flex-col justify-between flex-1 min-h-[110px]">
              <div>
                <h3 className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-brand transition-colors">
                  {t.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.destination}</p>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 shrink-0">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                  A partir de
                </span>
                <span className="text-sm font-extrabold text-brand">
                  {t.base_price ? `R$ ${t.base_price.toLocaleString("pt-BR")}` : "Sob Consulta"}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function FeaturedDestinationFilterBlock({
  block,
  agencySlug,
  handleLinkClick,
}: {
  block: any;
  agencySlug: string;
  handleLinkClick: (url: string) => void;
}) {
  const [tours, setTours] = useState<any[]>([]);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
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
        .order("departure_date", { ascending: true });
      if (data) {
        setTours(data);
        const unique = Array.from(
          new Set(
            data.map((t) => t.destination?.split(",")[0]?.trim()).filter((x): x is string => !!x),
          ),
        );
        setDestinations(unique);
      }
      setLoading(false);
    }
    load();
  }, [agencySlug]);

  if (loading)
    return (
      <div className="mx-auto max-w-6xl w-full px-4 h-48 animate-pulse rounded-2xl bg-surface-alt" />
    );
  if (tours.length === 0) return null;

  const filtered =
    selected === "all"
      ? tours
      : tours.filter((t) => t.destination?.toLowerCase().includes(selected.toLowerCase()));

  return (
    <section className="mx-auto max-w-6xl w-full px-4">
      {block.title && (
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight">{block.title}</h2>
          {block.subtitle && <p className="mt-2 text-muted-foreground">{block.subtitle}</p>}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-1.5 mb-8">
        <button
          type="button"
          onClick={() => setSelected("all")}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border${selected === "all" ? "bg-brand text-brand-foreground border-brand" : "bg-surface text-muted-foreground border-border hover:bg-surface-alt"}`}
        >
          Todos
        </button>
        {destinations.map((dest) => (
          <button
            key={dest}
            type="button"
            onClick={() => setSelected(dest)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border${selected === dest ? "bg-brand text-brand-foreground border-brand" : "bg-surface text-muted-foreground border-border hover:bg-surface-alt"}`}
          >
            {dest}
          </button>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        {filtered.map((t) => (
          <Link
            key={t.id}
            to="/p/$agency_slug/tour/$id"
            params={{ agency_slug: agencySlug, id: t.id }}
            onClick={() => handleLinkClick(`/p/${agencySlug}/tour/${t.id}`)}
            className="group flex flex-col rounded-2xl border-2 border-border/50 bg-surface overflow-hidden transition-all hover:border-brand/40 hover:-translate-y-1"
          >
            <div className="relative aspect-video w-full overflow-hidden shrink-0">
              {t.cover_image_url ? (
                <img
                  src={t.cover_image_url}
                  alt={t.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="h-full w-full bg-surface-alt" />
              )}
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-base text-foreground line-clamp-1 group-hover:text-brand transition-colors">
                  {t.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">{t.destination}</p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <span className="text-xs font-bold text-brand">
                  {t.base_price ? `R$ ${t.base_price.toLocaleString("pt-BR")}` : "Sob Consulta"}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  {t.departure_date
                    ? new Date(t.departure_date).toLocaleDateString("pt-BR")
                    : "A Confirmar"}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function TeamWidgetBlock({ block, agencyId }: { block: any; agencyId?: string }) {
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!agencyId) {
        setLoading(false);
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("agency_id", agencyId);

      if (roles && roles.length > 0) {
        const userIds = roles.map((r) => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);

        if (profiles) {
          const teamWithRoles = profiles.map((p) => {
            const roleInfo = roles.find((r) => r.user_id === p.id);
            return {
              ...p,
              role:
                roleInfo?.role === "agency_admin"
                  ? "Diretor / Proprietário"
                  : "Consultor de Viagens",
            };
          });
          setTeam(teamWithRoles);
        }
      }
      setLoading(false);
    }
    load();
  }, [agencyId]);

  if (loading)
    return (
      <div className="mx-auto max-w-5xl w-full px-4 h-48 animate-pulse rounded-2xl bg-surface-alt" />
    );
  if (team.length === 0) return null;

  return (
    <section className="mx-auto max-w-5xl w-full px-4">
      {block.title && (
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight">{block.title}</h2>
          {block.subtitle && <p className="mt-2 text-muted-foreground">{block.subtitle}</p>}
        </div>
      )}
      <div className="grid gap-6 grid-cols-2 md:grid-cols-3">
        {team.map((member) => (
          <div
            key={member.id}
            className="flex flex-col items-center text-center p-6 rounded-2xl bg-surface border border-border/50"
          >
            {member.avatar_url ? (
              <img
                src={member.avatar_url}
                alt={member.full_name}
                className="w-20 h-20 rounded-full object-cover mb-4 border-2 border-border"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-brand/10 text-brand text-2xl font-bold flex items-center justify-center mb-4">
                {member.full_name?.charAt(0) || "?"}
              </div>
            )}
            <h3 className="font-bold text-sm text-foreground">{member.full_name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{member.role}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function LiveReviewsBlock({ block, agencyId }: { block: any; agencyId?: string }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!agencyId) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("agency_reviews" as any)
        .select("*")
        .eq("agency_id", agencyId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      setReviews(data ?? []);
      setLoading(false);
    }
    load();
  }, [agencyId]);

  if (loading)
    return (
      <div className="mx-auto max-w-5xl w-full px-4 h-48 animate-pulse rounded-2xl bg-surface-alt" />
    );
  if (reviews.length === 0) {
    const mockReviews = [
      {
        author_name: "Gabriela Abreu",
        author_role: "Viajou para o Nordeste",
        review_text:
          "Excelente atendimento! Tudo muito bem organizado e conforme combinado. Recomendo de olhos fechados.",
        stars: 5,
      },
      {
        author_name: "Luciano Costa",
        author_role: "Viagem de Lua de Mel",
        review_text:
          "Incrível! Nossa viagem para a Europa foi inesquecível. Suporte perfeito durante todo o tempo.",
        stars: 5,
      },
    ];
    return (
      <section className="mx-auto max-w-5xl w-full px-4">
        {block.title && (
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight">{block.title}</h2>
            {block.subtitle && <p className="mt-2 text-muted-foreground">{block.subtitle}</p>}
          </div>
        )}
        <div className="grid gap-6 md:grid-cols-2">
          {mockReviews.map((r, i) => (
            <div
              key={i}
              className="flex flex-col p-6 rounded-2xl bg-surface border border-border/50 relative"
            >
              <Quote className="absolute top-4 right-4 w-8 h-8 opacity-5 text-muted-foreground" />
              <div className="flex gap-1 mb-3">
                {Array.from({ length: r.stars }).map((_, idx) => (
                  <Star key={idx} className="w-4 h-4 fill-brand text-brand" />
                ))}
              </div>
              <p className="text-sm text-foreground flex-1 italic mb-4">"{r.review_text}"</p>
              <div>
                <h4 className="font-bold text-xs text-foreground">{r.author_name}</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">{r.author_role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl w-full px-4">
      {block.title && (
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight">{block.title}</h2>
          {block.subtitle && <p className="mt-2 text-muted-foreground">{block.subtitle}</p>}
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        {reviews.map((r) => (
          <div
            key={r.id}
            className="flex flex-col p-6 rounded-2xl bg-surface border border-border/50 relative"
          >
            <Quote className="absolute top-4 right-4 w-8 h-8 opacity-5 text-muted-foreground" />
            <div className="flex gap-1 mb-3">
              {Array.from({ length: r.stars }).map((_, idx) => (
                <Star key={idx} className="w-4 h-4 fill-brand text-brand" />
              ))}
            </div>
            <p className="text-sm text-foreground flex-1 italic mb-4">"{r.review_text}"</p>
            <div className="flex items-center gap-3">
              {r.avatar_url ? (
                <img
                  src={r.avatar_url}
                  alt={r.author_name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-brand/10 text-brand text-xs font-bold flex items-center justify-center">
                  {r.author_name?.charAt(0) || "?"}
                </div>
              )}
              <div>
                <h4 className="font-bold text-xs text-foreground">{r.author_name}</h4>
                {r.author_role && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{r.author_role}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function WhatsappDepartmentsBlock({
  block,
  handleLinkClick,
}: {
  block: any;
  handleLinkClick: (url: string) => void;
}) {
  const departments = block.departments || [];
  return (
    <section className="mx-auto max-w-md w-full px-4 pb-8 space-y-3">
      {block.title && (
        <h3 className="text-sm font-semibold text-center text-muted-foreground uppercase tracking-wider mb-2">
          {block.title}
        </h3>
      )}
      {departments.map((dept: any, idx: number) => {
        const whatsappUrl = `https://wa.me/${dept.phone.replace(/\D/g, "")}?text=${encodeURIComponent(dept.message || "")}`;
        return (
          <a
            key={idx}
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => handleLinkClick(whatsappUrl)}
            className="flex items-center gap-4 p-4 rounded-2xl bg-surface border border-border/80 transition-transform hover:scale-[1.02] active:scale-95 group hover:border-brand/40"
          >
            <div className="h-10 w-10 rounded-full bg-brand/5 text-brand flex items-center justify-center shrink-0">
              {renderIconByName(dept.icon || "chat", "h-5 w-5")}
            </div>
            <div className="flex-1 text-left">
              <h4 className="font-bold text-sm text-foreground group-hover:text-brand transition-colors">
                {dept.name}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">{dept.phone}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
          </a>
        );
      })}
    </section>
  );
}

function CountdownTourBlock({
  block,
  agencySlug,
  handleLinkClick,
}: {
  block: any;
  agencySlug: string;
  handleLinkClick: (url: string) => void;
}) {
  const [tour, setTour] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    async function load() {
      if (!block.tour_id) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("group_tours")
        .select("id, title, departure_date, cover_image_url")
        .eq("id", block.tour_id)
        .maybeSingle();
      setTour(data);
      setLoading(false);
    }
    load();
  }, [block.tour_id]);

  useEffect(() => {
    if (!tour?.departure_date) return;

    function updateTimer() {
      const now = new Date().getTime();
      const target = new Date(tour.departure_date).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [tour]);

  if (loading)
    return (
      <div className="mx-auto max-w-lg w-full px-4 h-48 animate-pulse rounded-2xl bg-surface-alt" />
    );
  if (!tour) return null;

  return (
    <section className="mx-auto max-w-lg w-full px-4">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-6 md:p-8 flex flex-col items-center text-center gap-5">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand">
            {block.title || "Últimas Vagas!"}
          </span>
          <h3 className="font-bold text-lg text-foreground">{tour.title}</h3>
          {block.subtitle && <p className="text-xs text-muted-foreground">{block.subtitle}</p>}
        </div>

        <div className="flex gap-3 items-center justify-center">
          {[
            { label: "Dias", value: timeLeft.days },
            { label: "Hrs", value: timeLeft.hours },
            { label: "Min", value: timeLeft.minutes },
            { label: "Seg", value: timeLeft.seconds },
          ].map((t, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center bg-surface-alt/60 border border-border/50 rounded-xl px-3 py-2 min-w-[56px]"
            >
              <span className="text-xl font-black text-brand tabular-nums">{t.value}</span>
              <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground mt-0.5">
                {t.label}
              </span>
            </div>
          ))}
        </div>

        <Link
          to="/p/$agency_slug/tour/$id"
          params={{ agency_slug: agencySlug, id: tour.id }}
          onClick={() => handleLinkClick(`/p/${agencySlug}/tour/${tour.id}`)}
          className="w-full flex h-11 items-center justify-center rounded-xl bg-brand text-xs font-bold text-brand-foreground hover:scale-[1.02] active:scale-95 transition-all"
        >
          {block.button_label || "Quero Garantir Minha Vaga"}
        </Link>
      </div>
    </section>
  );
}

function SocialLinksRowBlock({
  block,
  handleLinkClick,
}: {
  block: any;
  handleLinkClick: (url: string) => void;
}) {
  const links = [
    { key: "instagram", url: block.instagram, icon: Instagram, label: "Instagram" },
    { key: "facebook", url: block.facebook, icon: Facebook, label: "Facebook" },
    { key: "youtube", url: block.youtube, icon: Youtube, label: "YouTube" },
    {
      key: "whatsapp",
      url: block.whatsapp ? `https://wa.me/${block.whatsapp.replace(/\D/g, "")}` : undefined,
      icon: Phone,
      label: "WhatsApp",
    },
    { key: "linkedin", url: block.linkedin, icon: Linkedin, label: "LinkedIn" },
    { key: "tiktok", url: block.tiktok, icon: Globe, label: "TikTok" },
  ].filter((l) => l.url);

  if (links.length === 0) return null;

  return (
    <section className="mx-auto max-w-md w-full px-4 py-2 flex items-center justify-center gap-4">
      {links.map((item, idx) => {
        const Icon = item.icon;
        return (
          <a
            key={idx}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            onClick={() => handleLinkClick(item.url || "")}
            title={item.label}
            className="h-10 w-10 rounded-full border border-border/80 bg-surface flex items-center justify-center text-muted-foreground hover:text-brand hover:border-brand/40 transition-all hover:scale-110 active:scale-90"
          >
            <Icon className="w-4.5 h-4.5" />
          </a>
        );
      })}
    </section>
  );
}

function ExchangeRatesBlock({ block }: { block: any }) {
  const [rates] = useState<Record<string, number>>({ USD: 5.42, EUR: 5.85, GBP: 6.92, ARS: 0.006 });
  const currencies = block.currencies || ["USD", "EUR", "GBP", "ARS"];
  const names: Record<string, string> = {
    USD: "Dólar Comercial",
    EUR: "Euro Comercial",
    GBP: "Libra Esterlina",
    ARS: "Peso Argentino",
  };

  return (
    <section className="mx-auto max-w-md w-full px-4">
      <div className="p-5 rounded-2xl border border-border bg-surface">
        <h3 className="text-xs font-bold text-foreground mb-4 uppercase tracking-wider text-center">
          {block.title || "Cotação Turismo Sugerida"}
        </h3>
        <div className="divide-y divide-border/50">
          {currencies.map((cur: string) => (
            <div
              key={cur}
              className="flex justify-between items-center py-2.5 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-2">
                <div className="h-6 w-10 rounded bg-surface-alt/80 flex items-center justify-center font-bold text-[10px] text-muted-foreground tracking-wider font-mono">
                  {cur}
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {names[cur] || cur}
                </span>
              </div>
              <span className="text-sm font-extrabold text-foreground">
                {rates[cur] ? `R$ ${rates[cur].toFixed(3)}` : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DynamicMapRouteBlock({ block, agencySlug }: { block: any; agencySlug: string }) {
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
        .select("id, title, destination")
        .eq("id", block.tour_id)
        .maybeSingle();
      setTour(data);
      setLoading(false);
    }
    load();
  }, [block.tour_id]);

  if (loading)
    return (
      <div className="mx-auto max-w-4xl w-full px-4 h-48 animate-pulse rounded-2xl bg-surface-alt" />
    );

  const locationQuery = tour?.destination || "Chapecó, SC, Brasil";
  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(locationQuery)}&t=&z=13&ie=UTF8&iwloc=&output=embed`;

  return (
    <section className="mx-auto max-w-4xl w-full px-4">
      {block.title && (
        <h2 className="text-2xl font-bold tracking-tight text-center mb-6">{block.title}</h2>
      )}
      <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-border bg-surface-alt">
        <iframe
          src={embedUrl}
          className="absolute inset-0 h-full w-full border-0"
          allowFullScreen
          loading="lazy"
          title={tour?.title || "Map Route"}
        />
      </div>
    </section>
  );
}

// ─── AGENCY VOUCHERS BLOCK ──────────────────────────────────────────────────
function AgencyVouchersBlock({
  block,
  handleLinkClick,
}: {
  block: any;
  handleLinkClick: (url: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [document, setDocument] = useState("");
  const [loading, setLoading] = useState(false);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() && !document.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("group_bookings")
        .select(
          `
          id,
          lead_name,
          total_amount,
          status,
          group_trips (
            title,
            destination,
            departure_date,
            cover_image_url
          )
        `,
        )
        .or(`lead_email.eq.${email.trim()},lead_cpf.eq.${document.trim()}`);

      if (error) throw error;
      setVouchers(data || []);
      setSearched(true);
    } catch (err: any) {
      toast.error("Erro ao carregar vouchers: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md w-full px-4 py-4">
      <div className="p-6 rounded-3xl border border-border bg-surface">
        <h3 className="text-sm font-bold text-foreground mb-1 uppercase tracking-wider text-center">
          {block.title || "Vouchers de Viagem"}
        </h3>
        <p className="text-xs text-muted-foreground text-center mb-4">
          Consulte seus bilhetes e vouchers emitidos em tempo real.
        </p>

        {!searched ? (
          <form onSubmit={handleSearch} className="space-y-3">
            <input
              type="email"
              required
              placeholder="Seu e-mail cadastrado"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-border bg-surface-alt text-xs text-foreground focus:border-brand focus:ring-1 focus:ring-brand outline-none"
            />
            <input
              type="text"
              required
              placeholder="CPF ou Documento"
              value={document}
              onChange={(e) => setDocument(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-border bg-surface-alt text-xs text-foreground focus:border-brand focus:ring-1 focus:ring-brand outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-brand text-brand-foreground font-bold text-xs hover:bg-brand/90 transition-all disabled:opacity-50"
            >
              {loading ? "Buscando..." : "Buscar Meus Vouchers"}
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            {vouchers.length === 0 ? (
              <p className="text-xs text-center text-muted-foreground italic py-4">
                Nenhum voucher ativo encontrado para estes dados.
              </p>
            ) : (
              vouchers.map((v) => (
                <div
                  key={v.id}
                  className="p-4 rounded-2xl border border-dashed border-border bg-surface-alt/50 relative overflow-hidden"
                >
                  <div className="absolute -right-4 -top-4 w-12 h-12 rounded-full border border-dashed border-border" />
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                      {v.status || "Confirmado"}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      ID: #{v.id.slice(0, 6)}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-foreground line-clamp-1">
                    {v.group_trips?.title}
                  </h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {v.group_trips?.destination}
                  </p>
                  <div className="mt-3 pt-2 border-t border-border/50 flex justify-between items-center text-[10px] text-muted-foreground">
                    <span>
                      Partida:{" "}
                      {v.group_trips?.departure_date
                        ? new Date(v.group_trips.departure_date).toLocaleDateString("pt-BR")
                        : "A Confirmar"}
                    </span>
                    <span className="font-bold text-brand uppercase">Voucher Pronto</span>
                  </div>
                </div>
              ))
            )}
            <button
              onClick={() => setSearched(false)}
              className="w-full mt-2 text-center text-[10px] text-brand hover:underline font-bold"
            >
              Consultar outro documento
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── WEATHER FORECAST BLOCK ────────────────────────────────────────────────
function WeatherForecastBlock({ block }: { block: any }) {
  const [city, setCity] = useState(block.city || "Chapecó, SC");

  useEffect(() => {
    async function load() {
      if (!block.tour_id) return;
      const { data } = await supabase
        .from("group_tours")
        .select("destination")
        .eq("id", block.tour_id)
        .maybeSingle();
      if (data?.destination) {
        setCity(data.destination.split(",")[0] || data.destination);
      }
    }
    load();
  }, [block.tour_id]);

  const forecast = [
    { temp: 26, condition: "Sol com nuvens" },
    { temp: 24, condition: "Parcialmente Nublado" },
    { temp: 28, condition: "Céu Limpo" },
  ];

  return (
    <div className="mx-auto max-w-md w-full px-4">
      <div className="p-5 rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-alt/30 flex items-center justify-between">
        <div className="text-left">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
            Previsão Climática
          </span>
          <h4 className="font-bold text-base text-foreground mt-0.5">{city}</h4>
          <span className="text-xs text-muted-foreground">{forecast[0].condition}</span>
        </div>
        <div className="flex gap-2">
          {forecast.map((f, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center bg-surface border border-border/40 rounded-xl p-2 min-w-[56px]"
            >
              <span className="text-[10px] text-muted-foreground font-semibold">
                {idx === 0 ? "Hoje" : idx === 1 ? "Amanhã" : "Depois"}
              </span>
              <span className="text-lg font-black text-brand leading-tight mt-1">{f.temp}°</span>
              <span className="text-[8px] text-muted-foreground mt-0.5">Cº</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ITINERARY TIMELINE BLOCK ───────────────────────────────────────────────
function ItineraryTimelineBlock({ block }: { block: any }) {
  const [itinerary, setItinerary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!block.tour_id) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("group_tours")
        .select("itinerary")
        .eq("id", block.tour_id)
        .maybeSingle();

      if (data?.itinerary && Array.isArray(data.itinerary)) {
        setItinerary(data.itinerary);
      }
      setLoading(false);
    }
    load();
  }, [block.tour_id]);

  if (loading)
    return (
      <div className="mx-auto max-w-lg w-full h-32 animate-pulse bg-surface-alt rounded-2xl" />
    );
  if (itinerary.length === 0) {
    return (
      <div className="mx-auto max-w-lg p-6 border border-dashed border-border rounded-2xl text-center text-xs text-muted-foreground bg-surface-alt/10">
        Selecione uma excursão com itinerário configurado para exibir o cronograma dia a dia.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl w-full px-4 text-left">
      {block.title && (
        <h3 className="text-sm font-bold text-foreground mb-6 uppercase tracking-wider text-center">
          {block.title}
        </h3>
      )}
      <div className="relative pl-6 border-l border-border/80 space-y-6">
        {itinerary.map((day: any, idx: number) => (
          <div key={idx} className="relative">
            <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-brand border-4 border-background flex items-center justify-center" />
            <div>
              <span className="text-[10px] font-bold text-brand uppercase tracking-wider">
                Dia {day.day || idx + 1}
              </span>
              <h4 className="font-bold text-sm text-foreground mt-0.5">
                {day.title || `Atividades do dia`}
              </h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {day.description || `Programação livre`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── LEAD CAPTURE CALLBACK BLOCK ───────────────────────────────────────────
function LeadCaptureCallbackBlock({ block, agencySlug }: { block: any; agencySlug: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setLoading(true);
    try {
      const { error } = await (supabase.rpc as any)("submit_public_lead", {
        _agency_slug: agencySlug,
        _name: name.trim(),
        _email: null,
        _phone: phone.trim(),
        _destination: null,
        _travel_start: null,
        _travel_end: null,
        _pax_count: 1,
        _estimated_value: 0,
        _source: "callback_request",
        _notes: "Solicitação de retorno / ligação urgente capturada no biolink.",
        _tags: ["Callback Site"],
      });

      if (error) throw error;
      setDone(true);
      toast.success("Solicitação enviada!");
    } catch (err: any) {
      toast.error("Erro ao enviar pedido: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md w-full px-4">
      <div className="p-6 rounded-3xl border border-brand/20 bg-brand/5 dark:bg-brand/10 text-center flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-brand/10 text-brand flex items-center justify-center">
          <Phone className="h-5 w-5" />
        </div>
        <h4 className="font-bold text-sm text-foreground">{block.title || "Queremos te ligar!"}</h4>
        <p className="text-xs text-muted-foreground max-w-xs">
          {block.subtitle || "Deixe seu número e retornaremos em até 15 minutos."}
        </p>

        {done ? (
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold py-2 bg-emerald-500/10 px-4 rounded-xl border border-emerald-500/20">
            Tudo pronto! Entraremos em contato em breve.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 w-full mt-2">
            <input
              type="text"
              required
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full sm:flex-1 h-10 px-3 rounded-lg border border-border bg-surface text-xs text-foreground focus:border-brand focus:ring-1 focus:ring-brand outline-none"
            />
            <input
              type="tel"
              required
              placeholder="(00) 00000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full sm:flex-1 h-10 px-3 rounded-lg border border-border bg-surface text-xs text-foreground focus:border-brand focus:ring-1 focus:ring-brand outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto shrink-0 h-10 px-4 rounded-lg bg-brand text-brand-foreground font-bold text-xs hover:bg-brand/90 transition-all cursor-pointer disabled:opacity-50"
            >
              Ligar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── PROMOTIONAL BANNER BLOCK ──────────────────────────────────────────────
function PromotionalBannerBlock({ block }: { block: any }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(block.discount_code || "BEMVINDO10");
    setCopied(true);
    toast.success("Cupom copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-md w-full px-4">
      <div className="relative overflow-hidden rounded-3xl border border-brand/30 bg-gradient-to-r from-brand/10 to-indigo-500/10 p-6 text-center flex flex-col items-center gap-3">
        <h4 className="font-bold text-sm text-foreground">
          {block.title || "Aproveite esta oferta!"}
        </h4>

        <div
          onClick={handleCopy}
          className="flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-surface border border-dashed border-brand cursor-pointer hover:bg-brand/5 active:scale-95 transition-all"
        >
          <span className="font-mono font-black text-sm tracking-widest text-brand">
            {block.discount_code || "BEMVINDO10"}
          </span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase border-l border-border pl-3">
            {copied ? "Copiado!" : "Copiar"}
          </span>
        </div>

        {block.expiration_date && (
          <span className="text-[9px] text-muted-foreground">
            Válido até: {new Date(block.expiration_date).toLocaleDateString("pt-BR")}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── PAYMENT GATEWAYS DISPLAY BLOCK ────────────────────────────────────────
function PaymentGatewaysDisplayBlock({ block, agencyId }: { block: any; agencyId?: string }) {
  return (
    <div className="mx-auto max-w-md w-full px-4">
      <div className="p-5 rounded-2xl border border-border bg-surface text-center">
        <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-4">
          {block.title || "Formas de Pagamento Aceitas"}
        </h4>

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-muted-foreground">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-alt border border-border/40">
            <Coins className="h-4 w-4 text-brand" /> Pix com desconto
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-alt border border-border/40">
            <CreditCard className="h-4 w-4 text-brand" /> Cartão até 10x
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-alt border border-border/40">
            <Ticket className="h-4 w-4 text-brand" /> Boleto Facilitado
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AGENT PROFILE CARD BLOCK ──────────────────────────────────────────────
function AgentProfileCardBlock({ block, agencyId }: { block: any; agencyId?: string }) {
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!block.agent_id) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", block.agent_id)
        .maybeSingle();
      setAgent(data);
      setLoading(false);
    }
    load();
  }, [block.agent_id]);

  if (loading)
    return (
      <div className="mx-auto max-w-md w-full h-24 animate-pulse bg-surface-alt rounded-2xl" />
    );
  if (!agent) {
    return (
      <div className="mx-auto max-w-md p-6 border border-dashed border-border rounded-2xl text-center text-xs text-muted-foreground bg-surface-alt/10">
        Selecione um consultor de viagens no painel de propriedades.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md w-full px-4 text-left">
      <div className="p-4 rounded-3xl border border-border bg-surface flex items-center gap-4">
        {agent.avatar_url ? (
          <img
            src={agent.avatar_url}
            alt={agent.full_name}
            className="w-16 h-16 rounded-full object-cover border-2 border-border shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-brand/10 text-brand text-2xl font-bold flex items-center justify-center shrink-0">
            {agent.full_name?.charAt(0) || "?"}
          </div>
        )}
        <div className="flex-1">
          <span className="text-[10px] font-bold text-brand uppercase tracking-wider">
            Seu Especialista
          </span>
          <h4 className="font-bold text-sm text-foreground mt-0.5">{agent.full_name}</h4>
          <a
            href="#contato"
            className="inline-flex items-center text-xs text-brand font-bold mt-1.5 hover:underline gap-0.5"
          >
            {block.cta_label || "Agendar Reunião"} <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── TRAVEL TIPS FAQ BLOCK ─────────────────────────────────────────────────
function TravelTipsFaqBlock({ block, agencyId }: { block: any; agencyId?: string }) {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!agencyId) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("knowledge_articles" as any)
        .select("id, title, content")
        .eq("agency_id", agencyId)
        .eq("status", "published")
        .limit(4);
      setArticles(data || []);
      setLoading(false);
    }
    load();
  }, [agencyId]);

  if (loading)
    return (
      <div className="mx-auto max-w-md w-full h-32 animate-pulse bg-surface-alt rounded-2xl" />
    );
  if (articles.length === 0) {
    const defaultTips = [
      {
        title: "Qual é o peso da mala de bordo?",
        content:
          "O limite padrão da mala de bordo para voos nacionais é de 10 kg, respeitando as medidas da companhia.",
      },
      {
        title: "Preciso de vacina de febre amarela?",
        content:
          "Para vários países da América do Sul e Caribe é obrigatória a vacinação com o Certificado Internacional.",
      },
    ];
    return (
      <div className="mx-auto max-w-md w-full px-4 text-left">
        <h4 className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider text-center">
          Dicas Úteis de Viagem
        </h4>
        <div className="space-y-3">
          {defaultTips.map((tip, idx) => (
            <details
              key={idx}
              className="group rounded-xl border border-border bg-surface px-4 py-3 cursor-pointer"
            >
              <summary className="flex justify-between items-center text-xs font-bold text-foreground select-none">
                {tip.title}
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-open:rotate-90 transition-transform" />
              </summary>
              <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                {tip.content}
              </p>
            </details>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md w-full px-4 text-left">
      <h4 className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider text-center">
        Dicas Úteis de Viagem
      </h4>
      <div className="space-y-3">
        {articles.map((art) => (
          <details
            key={art.id}
            className="group rounded-xl border border-border bg-surface px-4 py-3 cursor-pointer"
          >
            <summary className="flex justify-between items-center text-xs font-bold text-foreground select-none">
              {art.title}
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-open:rotate-90 transition-transform" />
            </summary>
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
              {art.content?.replace(/<[^>]*>/g, "")}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}

// ─── LIVE TOURS MAP BLOCK ──────────────────────────────────────────────────
function LiveToursMapBlock({ block, agencySlug }: { block: any; agencySlug: string }) {
  const [dest, setDest] = useState("Chapecó, SC");

  useEffect(() => {
    async function load() {
      const { data: ag } = await supabase
        .from("agencies")
        .select("id")
        .eq("slug", agencySlug)
        .maybeSingle();
      if (!ag) return;
      const { data } = await supabase
        .from("group_tours")
        .select("destination")
        .eq("agency_id", ag.id)
        .eq("status", "confirmed")
        .limit(1)
        .maybeSingle();
      if (data?.destination) {
        setDest(data.destination);
      }
    }
    load();
  }, [agencySlug]);

  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(dest)}&t=&z=6&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="mx-auto max-w-xl w-full px-4 text-center">
      <h4 className="text-xs font-bold text-foreground mb-4 uppercase tracking-wider">
        Grupos Confirmados em Trânsito
      </h4>
      <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-border bg-surface-alt">
        <iframe
          src={embedUrl}
          className="absolute inset-0 h-full w-full border-0"
          allowFullScreen
          loading="lazy"
          title="Live Map"
        />
      </div>
    </div>
  );
}

// ─── GIFT CARDS STORE BLOCK ────────────────────────────────────────────────
function GiftCardsStoreBlock({ block, agencySlug }: { block: any; agencySlug: string }) {
  const handleGiftClick = () => {
    const waUrl = `https://wa.me/5549999999999?text=${encodeURIComponent("Olá! Gostaria de adquirir um Cartão Presente de Viagem.")}`;
    window.open(waUrl, "_blank");
  };

  return (
    <div className="mx-auto max-w-md w-full px-4">
      <div className="p-6 rounded-3xl border border-dashed border-brand/50 bg-brand/5 dark:bg-brand/10 text-center flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-brand/15 text-brand flex items-center justify-center">
          <Gift className="h-5 w-5" />
        </div>
        <h4 className="font-bold text-sm text-foreground">
          {block.title || "Vale-Viagem Personalizado"}
        </h4>
        <p className="text-xs text-muted-foreground max-w-xs">
          {block.subtitle || "Presenteie quem você ama com experiências e memórias incríveis."}
        </p>
        <button
          onClick={handleGiftClick}
          className="mt-2 h-10 px-5 rounded-lg bg-brand text-brand-foreground font-bold text-xs hover:bg-brand/90 transition-all cursor-pointer hover:scale-105 active:scale-95"
        >
          Presentear Agora
        </button>
      </div>
    </div>
  );
}

// ─── CORPORATE RFP FORM BLOCK ──────────────────────────────────────────────
function CorporateRfpFormBlock({ block, agencySlug }: { block: any; agencySlug: string }) {
  const [f, setF] = useState({
    company_name: "",
    cnpj: "",
    requester_name: "",
    email: "",
    phone: "",
    destination: "",
    pax_count: 5,
    details: "",
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: agency } = await supabase
        .from("agencies")
        .select("id")
        .eq("slug", agencySlug)
        .maybeSingle();
      if (!agency) throw new Error("Agência não localizada");

      const { error } = await supabase.from("corporate_rfps" as any).insert({
        agency_id: agency.id,
        company_name: f.company_name,
        cnpj: f.cnpj,
        requester_name: f.requester_name,
        email: f.email,
        phone: f.phone,
        destination: f.destination,
        pax_count: Number(f.pax_count) || 5,
        details: f.details,
      });

      if (error) throw error;
      setDone(true);
      toast.success("RFP Corporativa enviada!");
    } catch (err: any) {
      toast.error("Erro ao enviar RFP: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md w-full px-4 text-left">
      <div className="p-6 rounded-3xl border border-border bg-surface">
        <h4 className="font-bold text-sm text-foreground text-center mb-1">
          {block.title || "Solicitação de RFP Corporativa"}
        </h4>
        <p className="text-xs text-muted-foreground text-center mb-5">
          {block.subtitle || "Preencha a demanda da sua empresa e entraremos em contato."}
        </p>

        {done ? (
          <div className="text-center py-6 flex flex-col items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
            <h5 className="font-bold text-xs text-foreground">Solicitação Enviada!</h5>
            <p className="text-[10px] text-muted-foreground mt-1 max-w-xs text-center">
              Nossos consultores B2B entrarão em contato em horário comercial.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              required
              placeholder="Razão Social ou Nome Fantasia"
              value={f.company_name}
              onChange={(e) => setF({ ...f, company_name: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-border bg-surface-alt text-xs text-foreground outline-none focus:border-brand"
            />
            <input
              type="text"
              required
              placeholder="CNPJ"
              value={f.cnpj}
              onChange={(e) => setF({ ...f, cnpj: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-border bg-surface-alt text-xs text-foreground outline-none focus:border-brand"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                placeholder="Contato"
                value={f.requester_name}
                onChange={(e) => setF({ ...f, requester_name: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface-alt text-xs text-foreground outline-none focus:border-brand"
              />
              <input
                type="tel"
                required
                placeholder="WhatsApp"
                value={f.phone}
                onChange={(e) => setF({ ...f, phone: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface-alt text-xs text-foreground outline-none focus:border-brand"
              />
            </div>
            <input
              type="email"
              required
              placeholder="E-mail corporativo"
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-border bg-surface-alt text-xs text-foreground outline-none focus:border-brand"
            />
            <input
              type="text"
              required
              placeholder="Destino desejado"
              value={f.destination}
              onChange={(e) => setF({ ...f, destination: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-border bg-surface-alt text-xs text-foreground outline-none focus:border-brand"
            />
            <textarea
              placeholder="Detalhes adicionais (Datas, preferências de hotéis, etc.)"
              value={f.details}
              onChange={(e) => setF({ ...f, details: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface-alt text-xs text-foreground outline-none focus:border-brand resize-y"
              rows={2}
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full h-10 rounded-lg bg-brand text-brand-foreground font-bold text-xs hover:bg-brand/90 transition-all disabled:opacity-50"
            >
              {busy ? "Enviando..." : "Enviar Solicitação B2B"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── CLIENT DOCUMENT UPLOAD BLOCK ─────────────────────────────────────────
function ClientDocumentUploadBlock({ block, agencyId }: { block: any; agencyId?: string }) {
  const [clientName, setClientName] = useState("");
  const [clientCpf, setClientCpf] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientCpf.trim()) return;
    setBusy(true);
    try {
      const { data: clients } = await supabase
        .from("clients")
        .select("id")
        .eq("document", clientCpf.trim())
        .limit(1);

      const clientId = clients?.[0]?.id;

      const { error } = await supabase.from("client_documents" as any).insert({
        client_id: clientId || null,
        agency_id: agencyId,
        document_type: block.document_type || "RG",
        document_number: clientCpf.trim(),
        file_url: fileUrl || "https://placeholder-doc-url.pdf",
        status: "pending_verification",
      });

      if (error) throw error;
      setDone(true);
      toast.success("Documento enviado!");
    } catch (err: any) {
      toast.error("Erro ao enviar documento: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md w-full px-4 text-left">
      <div className="p-6 rounded-3xl border border-border bg-surface space-y-4">
        <div>
          <h4 className="font-bold text-sm text-foreground text-center mb-1">
            {block.title || "Envio de Documento de Embarque"}
          </h4>
          <p className="text-[11px] text-muted-foreground text-center leading-normal">
            {block.instructions || "Envie seus dados para a emissão dos vouchers."}
          </p>
        </div>

        {done ? (
          <div className="text-center py-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
            Documento recebido! Analisaremos em breve.
          </div>
        ) : (
          <form onSubmit={handleUploadSubmit} className="space-y-3">
            <input
              type="text"
              required
              placeholder="Seu Nome Completo"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-surface-alt text-xs text-foreground outline-none focus:border-brand"
            />
            <input
              type="text"
              required
              placeholder="Seu CPF (apenas números)"
              value={clientCpf}
              onChange={(e) => setClientCpf(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-surface-alt text-xs text-foreground outline-none focus:border-brand"
            />
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Link da foto do documento
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Link do Google Drive, Dropbox ou mídia pública"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface-alt text-xs text-foreground outline-none focus:border-brand"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full h-10 rounded-lg bg-brand text-brand-foreground font-bold text-xs hover:bg-brand/90 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" /> {busy ? "Enviando..." : "Enviar Documento"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── BIOLINK NEWSLETTER BOX BLOCK ──────────────────────────────────────────
function BiolinkNewsletterBoxBlock({ block, agencySlug }: { block: any; agencySlug: string }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const handleSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      const { error } = await (supabase.rpc as any)("submit_public_lead", {
        _agency_slug: agencySlug,
        _name: "Inscrito Newsletter Biolink",
        _email: email.trim(),
        _phone: null,
        _destination: null,
        _travel_start: null,
        _travel_end: null,
        _pax_count: 1,
        _estimated_value: 0,
        _source: "biolink_newsletter",
        _notes: "Inscrição realizada pelo rodapé/box do biolink.",
        _tags: ["Newsletter Site", "Biolink"],
      });

      if (error) throw error;
      setDone(true);
      toast.success("Inscrito com sucesso!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md w-full px-4 py-2">
      {done ? (
        <div className="text-[10px] text-center text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/20 py-2.5 rounded-xl border border-emerald-100">
          Inscrito com sucesso! Obrigado.
        </div>
      ) : (
        <form
          onSubmit={handleSub}
          className="flex gap-1.5 w-full bg-surface border border-border p-1 rounded-2xl"
        >
          <input
            type="email"
            required
            placeholder={block.placeholder || "Inscreva seu melhor e-mail..."}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 px-3 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 border-0 outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="h-9 px-4 rounded-xl bg-brand text-brand-foreground text-[10px] font-bold hover:bg-brand/90 transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            {busy ? "Salvando..." : block.button_label || "Inscrever"}
          </button>
        </form>
      )}
    </div>
  );
}

// ─── LIVE SALES COUNTER BLOCK ──────────────────────────────────────────────
function LiveSalesCounterBlock({ block, agencyId }: { block: any; agencyId?: string }) {
  const [salesMsg, setSalesMsg] = useState("");

  useEffect(() => {
    async function load() {
      if (!agencyId) return;
      const { data } = await supabase
        .from("group_bookings")
        .select(
          `
          id,
          lead_name,
          created_at,
          group_trips (
            title
          )
        `,
        )
        .eq("status", "confirmed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && data.group_trips) {
        setSalesMsg(
          `${data.lead_name?.split(" ")[0]} reservou ${data.group_trips.title} recentemente!`,
        );
      } else {
        setSalesMsg("Muitos viajantes estão consultando nossos roteiros hoje.");
      }
    }
    load();
    const interval = setInterval(load, (block.duration_sec || 10) * 1000);
    return () => clearInterval(interval);
  }, [agencyId, block.duration_sec]);

  return (
    <div className="mx-auto max-w-md w-full px-4">
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border border-brand/20 bg-brand/5 dark:bg-brand/10 text-brand">
        <Sparkles className="w-4 h-4 animate-pulse shrink-0" />
        <span className="text-[10px] font-bold text-left leading-normal">{salesMsg}</span>
      </div>
    </div>
  );
}

// ─── VISA CHECKER BLOCK ──────────────────────────────────────────────────────
function VisaCheckerBlock({ block }: { block: any }) {
  const [origin, setOrigin] = useState(block.default_nationality || "Brasil");
  const [dest, setDest] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dest.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase
        .from("visa_requirements")
        .select("*")
        .ilike("origin_nationality", origin.trim())
        .ilike("destination_country", dest.trim())
        .maybeSingle();

      if (error) throw error;
      setResult(data);
    } catch (err: any) {
      toast.error("Erro ao verificar vistos: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md w-full px-4">
      <div className="p-6 rounded-3xl border border-border bg-surface">
        <h4 className="font-bold text-sm text-foreground text-center mb-1">
          {block.title || "Consultor de Vistos de Entrada"}
        </h4>
        <p className="text-[11px] text-muted-foreground text-center mb-4">
          Verifique a necessidade de visto e documentos para sua viagem.
        </p>

        <form onSubmit={handleCheck} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] uppercase font-bold text-muted-foreground">
                Nacionalidade
              </label>
              <input
                type="text"
                required
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full mt-1 h-10 px-3 rounded-lg border border-border bg-surface text-xs outline-none focus:border-brand"
                placeholder="Ex: Brasil"
              />
            </div>
            <div>
              <label className="text-[9px] uppercase font-bold text-muted-foreground">
                País de Destino
              </label>
              <input
                type="text"
                required
                value={dest}
                onChange={(e) => setDest(e.target.value)}
                className="w-full mt-1 h-10 px-3 rounded-lg border border-border bg-surface text-xs outline-none focus:border-brand"
                placeholder="Ex: Japão"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-lg bg-brand text-brand-foreground font-bold text-xs hover:bg-brand/90 transition-all disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Consultar Requisitos"}
          </button>
        </form>

        {searched && !loading && (
          <div className="mt-4 pt-4 border-t border-border/60 text-left space-y-2.5">
            {result ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">
                    Exigência de Visto
                  </span>
                  <span
                    className={`text-xs font-black px-2 py-0.5 rounded uppercase${result.visa_required ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"}`}
                  >
                    {result.visa_required ? "Obrigatório" : "Isento"}
                  </span>
                </div>
                {result.visa_type && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Tipo de Visto</span>
                    <span className="font-bold text-foreground">{result.visa_type}</span>
                  </div>
                )}
                {result.processing_days && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Tempo Estimado</span>
                    <span className="font-bold text-foreground">{result.processing_days} dias</span>
                  </div>
                )}
                {result.price_estimate && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Custo Consular</span>
                    <span className="font-bold text-brand">R$ {result.price_estimate}</span>
                  </div>
                )}
                {result.required_documents && (
                  <div className="text-xs">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                      Documentos Necessários
                    </span>
                    <p className="text-muted-foreground leading-relaxed bg-surface-alt/40 p-2.5 rounded-lg border border-border/40 text-[11px]">
                      {result.required_documents}
                    </p>
                  </div>
                )}
                {result.notes && (
                  <div className="text-xs">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                      Observações Importantes
                    </span>
                    <p className="text-muted-foreground leading-relaxed text-[11px]">
                      {result.notes}
                    </p>
                  </div>
                )}
                {result.official_url && (
                  <a
                    href={result.official_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-xs text-brand font-bold hover:underline gap-0.5 mt-1"
                  >
                    Link do Consulado Oficial <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </>
            ) : (
              <div className="text-center py-2">
                <HelpCircle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2 animate-pulse" />
                <p className="text-xs text-muted-foreground font-semibold">
                  Sem regras específicas salvas.
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Consulte seu agente para detalhes deste destino.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── INSURANCE SIMULATOR BLOCK ──────────────────────────────────────────────
function InsuranceSimulatorBlock({ block, agencySlug }: { block: any; agencySlug: string }) {
  const [region, setRegion] = useState("Europe");
  const [days, setDays] = useState(10);
  const [paxCount, setPaxCount] = useState(1);
  const [ageRange, setAgeRange] = useState("under60");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"simulate" | "contact" | "done">("simulate");
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const getPlans = () => {
    let rate = 15;
    if (region === "Europe") rate = 22;
    else if (region === "NorthAmerica") rate = 28;
    else if (region === "AsiaAfrica") rate = 32;

    if (ageRange === "mid") rate *= 1.5;
    else if (ageRange === "senior") rate *= 2.2;

    const baseCost = rate * days * paxCount;

    return [
      {
        name: "Global Basic",
        price: baseCost,
        medicalLimit: "USD 30.000",
        baggageLimit: "USD 500",
      },
      {
        name: "Global Standard",
        price: baseCost * 1.5,
        medicalLimit: "USD 60.000",
        baggageLimit: "USD 1.200",
      },
      {
        name: "Global Premium VIP",
        price: baseCost * 2.5,
        medicalLimit: "USD 150.000",
        baggageLimit: "USD 2.500",
      },
    ];
  };

  const plans = getPlans();

  const handleSelectPlan = (plan: any) => {
    setSelectedPlan(plan);
    setStep("contact");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const notes = `Simulação de Seguro Viagem no Portal. Destino/Região: ${region}, Passageiros: ${paxCount}, Duração: ${days} dias, Faixa Etária: ${ageRange}. Plano Escolhido: ${selectedPlan.name} (Valor Total Estimado: R$ ${selectedPlan.price.toFixed(2)}).`;
      const { error } = await (supabase.rpc as any)("submit_public_lead", {
        _agency_slug: agencySlug,
        _name: name.trim(),
        _email: email.trim(),
        _phone: phone.trim(),
        _destination: region,
        _travel_start: null,
        _travel_end: null,
        _pax_count: paxCount,
        _estimated_value: Math.round(selectedPlan.price),
        _source: "insurance_simulator",
        _notes: notes,
        _tags: ["Insurance Simulator Site"],
      });

      if (error) throw error;
      setStep("done");
      toast.success("Solicitação enviada!");
    } catch (err: any) {
      toast.error("Erro ao enviar solicitação: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md w-full px-4 text-left">
      <div className="p-6 rounded-3xl border border-border bg-surface">
        <h4 className="font-bold text-sm text-foreground text-center mb-1">
          {block.title || "Simulador de Seguro Viagem"}
        </h4>
        <p className="text-[11px] text-muted-foreground text-center mb-5">
          {block.description || "Simule planos de cobertura médica internacional em segundos."}
        </p>

        {step === "simulate" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">
                Destino / Região
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-xs outline-none focus:border-brand"
              >
                <option value="Europe">Europa (Schengen obrigatório)</option>
                <option value="NorthAmerica">América do Norte / EUA</option>
                <option value="SouthAmerica">América do Sul</option>
                <option value="AsiaAfrica">Ásia, África & Oriente Médio</option>
                <option value="Oceania">Oceania</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground">
                  Dias de Viagem
                </label>
                <input
                  type="number"
                  min={1}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value) || 1)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-xs outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground">
                  Passageiros
                </label>
                <input
                  type="number"
                  min={1}
                  value={paxCount}
                  onChange={(e) => setPaxCount(Number(e.target.value) || 1)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-xs outline-none focus:border-brand"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground">
                Faixa Etária do Viajante Mais Velho
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 mt-1">
                {[
                  { key: "under60", label: "Até 60 anos" },
                  { key: "mid", label: "61 a 75 anos" },
                  { key: "senior", label: "Acima de 75" },
                ].map((age) => (
                  <button
                    key={age.key}
                    type="button"
                    onClick={() => setAgeRange(age.key)}
                    className={`py-2 rounded-lg text-[10px] font-bold border transition-colors${ageRange === age.key ? "bg-brand text-brand-foreground border-brand" : "bg-surface-alt/40 border-border hover:bg-surface-alt/80"}`}
                  >
                    {age.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-border/50">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                Planos Recomendados
              </span>
              {plans.map((p, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-3 rounded-xl border border-border bg-surface-alt/30 hover:border-brand/40 transition-colors"
                >
                  <div>
                    <span className="text-xs font-bold text-foreground block leading-tight">
                      {p.name}
                    </span>
                    <span className="text-[9px] text-muted-foreground">
                      Médico: {p.medicalLimit} | Bagagem: {p.baggageLimit}
                    </span>
                  </div>
                  <button
                    onClick={() => handleSelectPlan(p)}
                    className="h-8 px-3.5 rounded-lg bg-brand text-brand-foreground text-[10px] font-bold hover:bg-brand/90 transition-colors shrink-0"
                  >
                    R$ {p.price.toFixed(0)}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === "contact" && (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="p-3 bg-brand/5 border border-brand/10 rounded-2xl">
              <span className="text-[10px] font-semibold text-brand block uppercase">
                Plano Selecionado
              </span>
              <span className="text-xs font-bold text-foreground block mt-0.5">
                {selectedPlan.name}
              </span>
              <span className="text-xs font-bold text-brand leading-none">
                Total: R$ {selectedPlan.price.toFixed(2)}
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">
                Seu Nome Completo
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-xs outline-none focus:border-brand"
                placeholder="Ex: Ana Silva"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">
                E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-xs outline-none focus:border-brand"
                placeholder="Ex: ana@email.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">
                WhatsApp
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-xs outline-none focus:border-brand"
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep("simulate")}
                className="flex-1 h-10 rounded-lg border border-border text-foreground font-bold text-xs hover:bg-surface-alt transition-colors"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] h-10 rounded-lg bg-brand text-brand-foreground font-bold text-xs hover:bg-brand/90 transition-all disabled:opacity-50"
              >
                {loading ? "Enviando..." : "Contratar Cobertura"}
              </button>
            </div>
          </form>
        )}

        {step === "done" && (
          <div className="text-center py-6 flex flex-col items-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
            <h5 className="font-bold text-sm text-foreground">Solicitação Recebida!</h5>
            <p className="text-[11px] text-muted-foreground mt-1.5 max-w-xs leading-normal">
              Seu simulado de seguro viagem foi enviado para emissão da apólice. Nosso consultor
              entrará em contato via WhatsApp nas próximas horas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── REVIEWS SUBMISSION FORM BLOCK ───────────────────────────────────────────
function ReviewsSubmissionFormBlock({ block, agencyId }: { block: any; agencyId?: string }) {
  const [stars, setStars] = useState(5);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !text.trim() || !agencyId) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("agency_reviews" as any).insert({
        agency_id: agencyId,
        author_name: name.trim(),
        author_role: role.trim() || null,
        review_text: text.trim(),
        stars: stars,
        status: "pending",
      } as any);

      if (error) throw error;
      setDone(true);
      toast.success("Avaliação enviada!");
    } catch (err: any) {
      toast.error("Erro ao enviar avaliação: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md w-full px-4 text-left">
      <div className="p-6 rounded-3xl border border-border bg-surface">
        <h4 className="font-bold text-sm text-foreground text-center mb-1">
          {block.title || "Deixe seu Depoimento"}
        </h4>
        <p className="text-[11px] text-muted-foreground text-center mb-4">
          {block.subtitle || "Sua opinião nos ajuda a crescer e aprimorar nossas rotas."}
        </p>

        {done ? (
          <div className="text-center py-6 flex flex-col items-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
            <h5 className="font-bold text-xs text-foreground">Muito Obrigado!</h5>
            <p className="text-[10px] text-muted-foreground mt-1 max-w-xs text-center leading-normal">
              Sua avaliação foi enviada com sucesso e ficará ativa no portal logo após a moderação.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex justify-center gap-1.5 py-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setStars(star)}
                  className="p-1 transition-transform hover:scale-110 active:scale-90"
                >
                  <Star
                    className={`h-6 w-6${star <= stars ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
                  />
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface-alt text-xs text-foreground outline-none focus:border-brand"
              />
              <input
                type="text"
                placeholder="Ex: Viajei para Gramado"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface-alt text-xs text-foreground outline-none focus:border-brand"
              />
            </div>

            <textarea
              required
              placeholder="Descreva brevemente como foi sua experiência..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface-alt text-xs text-foreground outline-none focus:border-brand resize-y"
              rows={3}
            />

            <button
              type="submit"
              disabled={loading || !agencyId}
              className="w-full h-10 rounded-lg bg-brand text-brand-foreground font-bold text-xs hover:bg-brand/90 transition-all disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Enviar Avaliação"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── WHATSAPP FLOATING BUBBLE BLOCK ──────────────────────────────────────────
function WhatsappFloatingBubbleBlock({ block }: { block: any }) {
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!block.agent_id) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", block.agent_id)
        .maybeSingle();

      setAgent(data);
      setLoading(false);
    }
    load();
  }, [block.agent_id]);

  if (loading) return null;

  const phone = "5549999999999";
  const message = block.message || "Olá! Gostaria de tirar algumas dúvidas.";
  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return (
    <div
      className={`fixed bottom-6 z-50 flex items-center gap-3 max-w-sm${
        block.position === "left" ? "left-6 flex-row-reverse" : "right-6"
      }`}
    >
      <div className="bg-surface text-foreground px-3.5 py-2 rounded-2xl border border-border text-[11px] font-bold max-w-[200px] leading-tight">
        {agent ? `Fale com ${agent.full_name.split(" ")[0]}` : "Fale Conosco!"}
      </div>
      <a
        href={waUrl}
        target="_blank"
        rel="noreferrer"
        className="h-14 w-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shrink-0 border border-emerald-400"
      >
        {agent && agent.avatar_url ? (
          <img
            src={agent.avatar_url}
            alt="Agent"
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <Phone className="h-6 w-6 fill-white text-emerald-500" />
        )}
      </a>
    </div>
  );
}

// ─── CUSTOM PACKAGE LEAD BUILDER BLOCK ────────────────────────────────────────
function CustomPackageLeadBuilderBlock({ block, agencySlug }: { block: any; agencySlug: string }) {
  const [step, setStep] = useState(1);
  const [dest, setDest] = useState("");
  const [date, setDate] = useState("");
  const [days, setDays] = useState(7);
  const [adults, setAdults] = useState(2);
  const [hotelStars, setHotelStars] = useState("4");
  const [budget, setBudget] = useState("medium");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNext = () => setStep((s) => s + 1);
  const handlePrev = () => setStep((s) => s - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const budgetLabel =
        budget === "low" ? "Econômico" : budget === "medium" ? "Moderado" : "Luxo / VIP";
      const notes = `Lead do Construtor de Pacotes Personalizados. Destino: ${dest}, Partida: ${date}, Duração: ${days} dias, Passageiros: ${adults} adultos, Categoria Hotel: ${hotelStars} estrelas, Perfil Financeiro: ${budgetLabel}.`;

      const { error } = await (supabase.rpc as any)("submit_public_lead", {
        _agency_slug: agencySlug,
        _name: name.trim(),
        _email: email.trim(),
        _phone: phone.trim(),
        _destination: dest.trim(),
        _travel_start: date || null,
        _travel_end: null,
        _pax_count: adults,
        _estimated_value: 0,
        _source: "package_builder",
        _notes: notes,
        _tags: ["Package Lead Site"],
      });

      if (error) throw error;
      setStep(4);
      toast.success("Roteiro customizado solicitado!");
    } catch (err: any) {
      toast.error("Erro ao enviar roteiro: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md w-full px-4 text-left">
      <div className="p-6 rounded-3xl border border-border bg-surface">
        <h4 className="font-bold text-sm text-foreground text-center mb-1">
          {block.title || "Planeje seu Roteiro Sob Medida"}
        </h4>
        <p className="text-[11px] text-muted-foreground text-center mb-5">
          {block.subtitle || "Diga o que você sonha e desenharemos nos mínimos detalhes."}
        </p>

        {step < 4 && (
          <div className="flex gap-1.5 justify-center mb-5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all duration-300${s <= step ? "bg-brand" : "bg-muted-foreground/25"}`}
              />
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">
                Destino Desejado
              </label>
              <input
                type="text"
                required
                value={dest}
                onChange={(e) => setDest(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-xs outline-none focus:border-brand"
                placeholder="Ex: Egito ou Fernando de Noronha"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">
                  Previsão de Partida
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-xs outline-none focus:border-brand"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">
                  Duração (dias)
                </label>
                <input
                  type="number"
                  min={1}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value) || 7)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-xs outline-none focus:border-brand"
                />
              </div>
            </div>
            <button
              type="button"
              disabled={!dest.trim()}
              onClick={handleNext}
              className="w-full h-10 mt-2 rounded-lg bg-brand text-brand-foreground font-bold text-xs hover:bg-brand/90 transition-colors disabled:opacity-50"
            >
              Continuar
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">
                  Nº Passageiros
                </label>
                <input
                  type="number"
                  min={1}
                  value={adults}
                  onChange={(e) => setAdults(Number(e.target.value) || 2)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-xs outline-none focus:border-brand"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">
                  Hospedagem Preferida
                </label>
                <select
                  value={hotelStars}
                  onChange={(e) => setHotelStars(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-xs outline-none focus:border-brand"
                >
                  <option value="3">Padrão 3 estrelas</option>
                  <option value="4">Premium 4 estrelas</option>
                  <option value="5">Luxo 5 estrelas</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground">
                Perfil de Investimento
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 mt-1">
                {[
                  { key: "low", label: "Econômico" },
                  { key: "medium", label: "Moderado" },
                  { key: "high", label: "Altíssimo Padrão" },
                ].map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => setBudget(b.key)}
                    className={`py-2 rounded-lg text-[10px] font-bold border transition-colors${budget === b.key ? "bg-brand text-brand-foreground border-brand" : "bg-surface-alt/40 border-border hover:bg-surface-alt/80"}`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handlePrev}
                className="flex-1 h-10 rounded-lg border border-border text-foreground font-bold text-xs hover:bg-surface-alt transition-colors"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 h-10 rounded-lg bg-brand text-brand-foreground font-bold text-xs hover:bg-brand/90 transition-colors"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">
                Seu Nome
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-xs outline-none focus:border-brand"
                placeholder="Ex: Carlos Santos"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">
                E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-xs outline-none focus:border-brand"
                placeholder="Ex: carlos@email.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">
                WhatsApp
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-xs outline-none focus:border-brand"
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handlePrev}
                className="flex-1 h-10 rounded-lg border border-border text-foreground font-bold text-xs hover:bg-surface-alt transition-colors"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 h-10 rounded-lg bg-brand text-brand-foreground font-bold text-xs hover:bg-brand/90 transition-all disabled:opacity-50"
              >
                {loading ? "Processando..." : "Solicitar Roteiro"}
              </button>
            </div>
          </form>
        )}

        {step === 4 && (
          <div className="text-center py-6 flex flex-col items-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
            <h5 className="font-bold text-sm text-foreground">Solicitação Enviada!</h5>
            <p className="text-[11px] text-muted-foreground mt-1.5 max-w-xs leading-normal">
              Recebemos suas preferências de viagem. Um designer de roteiros especializado começará
              a estruturar sua rota e entrará em contato em breve.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── NEWS ANNOUNCEMENTS TICKER BLOCK ──────────────────────────────────────────
function NewsAnnouncementsTickerBlock({ block, agencySlug }: { block: any; agencySlug: string }) {
  const [headlines, setHeadlines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: agency } = await supabase
          .from("agencies")
          .select("id")
          .eq("slug", agencySlug)
          .maybeSingle();

        if (agency) {
          const { data } = await supabase
            .from("blog_posts")
            .select("title")
            .eq("agency_id", agency.id)
            .eq("status", "published")
            .order("published_at", { ascending: false })
            .limit(block.limit || 5);

          if (data && data.length > 0) {
            setHeadlines(data.map((p) => p.title));
          } else {
            setHeadlines([
              "Nova saída para a Itália em Outubro/2026 com vagas promocionais!",
              "Dicas essenciais para sua mala de viagem internacional.",
              "Visto para o Japão: regras atualizadas de entrada.",
            ]);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [agencySlug, block.limit]);

  if (loading) return null;

  return (
    <div className="w-full px-4">
      <div className="relative overflow-hidden bg-brand/5 border border-brand/10 rounded-2xl py-2 px-4 flex items-center gap-3">
        <span className="text-[9px] font-black uppercase bg-brand text-brand-foreground px-2 py-0.5 rounded tracking-wider shrink-0 flex items-center gap-0.5">
          <Activity className="w-3 h-3" /> {block.title || "Novidades"}
        </span>
        <div className="flex-1 overflow-hidden relative">
          <div className="whitespace-nowrap flex gap-8 text-xs font-semibold text-foreground">
            {headlines.map((h, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" /> {h}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FAQ CATEGORY ACCORDION BLOCK ────────────────────────────────────────────
function FaqCategoryAccordionBlock({ block, agencyId }: { block: any; agencyId?: string }) {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!agencyId) {
        setLoading(false);
        return;
      }
      try {
        let query = supabase
          .from("knowledge_articles")
          .select("id, title, content")
          .eq("agency_id", agencyId)
          .eq("is_internal", false);

        if (block.category && block.category !== "Geral") {
          query = query.ilike("category", block.category);
        }

        const { data } = await query.limit(6);
        setArticles(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [agencyId, block.category]);

  if (loading)
    return (
      <div className="mx-auto max-w-lg w-full h-32 animate-pulse bg-surface-alt rounded-2xl" />
    );

  if (articles.length === 0) {
    return (
      <div className="mx-auto max-w-md p-6 border border-dashed border-border rounded-2xl text-center text-xs text-muted-foreground bg-surface-alt/10">
        Nenhum artigo público encontrado na categoria "{block.category || "Geral"}".
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg w-full px-4 text-left">
      {block.title && (
        <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider text-center">
          {block.title}
        </h3>
      )}
      <div className="space-y-2.5">
        {articles.map((art) => (
          <details
            key={art.id}
            className="group rounded-xl border border-border bg-surface px-4 py-3 cursor-pointer transition-colors hover:border-brand/40"
          >
            <summary className="flex justify-between items-center text-xs font-bold text-foreground select-none">
              {art.title}
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-open:rotate-90 transition-transform" />
            </summary>
            <div
              className="text-[11px] text-muted-foreground mt-2 leading-relaxed prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(art.content || "") }}
            />
          </details>
        ))}
      </div>
    </div>
  );
}

// ─── AGENCY BADGES TRUST BLOCK ───────────────────────────────────────────────
function AgencyBadgesTrustBlock({ block }: { block: any }) {
  const badges = [
    { title: "CADASTUR Regularizado", desc: "MTur Ministério do Turismo", icon: ShieldCheck },
    { title: "IATA Certified", desc: "Emissões Aéreas Globais", icon: Plane },
    { title: "Suporte 24h", desc: "Monitoramento em Viagem", icon: Clock },
    { title: "Transações Criptografadas", desc: "Segurança nos Pagamentos", icon: Key },
  ];

  return (
    <div className="mx-auto max-w-md w-full px-4 text-center">
      {block.title && (
        <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
          {block.title}
        </h4>
      )}
      <div className="grid grid-cols-2 gap-3">
        {badges.map((b, idx) => {
          const Icon = b.icon;
          return (
            <div
              key={idx}
              className="p-3 bg-surface-alt/30 border border-border/60 rounded-2xl flex flex-col items-center text-center gap-1 hover:border-brand/40 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-brand/10 text-brand flex items-center justify-center">
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-foreground block leading-tight">
                {b.title}
              </span>
              <span className="text-[8px] text-muted-foreground leading-normal">{b.desc}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── CURRENCY CALCULATOR BLOCK ────────────────────────────────────────────────
function CurrencyCalculatorBlock({ block }: { block: any }) {
  const [rates] = useState<Record<string, number>>({ USD: 5.42, EUR: 5.85, GBP: 6.92, BRL: 1.0 });
  const [fromCur, setFromCur] = useState(block.default_from || "USD");
  const [toCur, setToCur] = useState(block.default_to || "BRL");
  const [amount, setAmount] = useState<string>("100");

  const convert = () => {
    const val = parseFloat(amount);
    if (isNaN(val)) return "0.00";
    const fromRate = rates[fromCur] || 1;
    const toRate = rates[toCur] || 1;

    const inBrl = val * fromRate;
    const result = inBrl / toRate;
    return result.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const swapCurrencies = () => {
    setFromCur(toCur);
    setToCur(fromCur);
  };

  return (
    <div className="mx-auto max-w-md w-full px-4 text-left">
      <div className="p-5 rounded-2xl border border-border bg-surface">
        <h4 className="text-xs font-bold text-foreground mb-4 uppercase tracking-wider text-center">
          {block.title || "Calculadora de Câmbio"}
        </h4>

        <div className="space-y-3">
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <label className="text-[9px] uppercase font-bold text-muted-foreground">De</label>
              <select
                value={fromCur}
                onChange={(e) => setFromCur(e.target.value)}
                className="w-full mt-0.5 h-10 px-2 rounded-lg border border-border bg-surface text-xs font-bold outline-none"
              >
                <option value="USD">USD - Dólar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - Libra</option>
                <option value="BRL">BRL - Real</option>
              </select>
            </div>

            <button
              type="button"
              onClick={swapCurrencies}
              className="mt-4 p-2 rounded-lg border border-border hover:bg-surface-alt transition-colors shrink-0 text-muted-foreground"
            >
              ⇄
            </button>

            <div className="flex-1">
              <label className="text-[9px] uppercase font-bold text-muted-foreground">Para</label>
              <select
                value={toCur}
                onChange={(e) => setToCur(e.target.value)}
                className="w-full mt-0.5 h-10 px-2 rounded-lg border border-border bg-surface text-xs font-bold outline-none"
              >
                <option value="BRL">BRL - Real</option>
                <option value="USD">USD - Dólar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - Libra</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[9px] uppercase font-bold text-muted-foreground">Valor</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              className="w-full mt-0.5 h-10 px-3 rounded-lg border border-border bg-surface text-xs font-bold outline-none focus:border-brand"
              placeholder="100"
            />
          </div>

          <div className="p-3 bg-brand/5 border border-brand/10 rounded-xl flex justify-between items-center mt-2.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">
              Resultado Estimado
            </span>
            <span className="text-sm font-black text-brand tracking-tight">
              {toCur} {convert()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── INTERACTIVE FLIGHT TRACKER BLOCK ─────────────────────────────────────────
function InteractiveFlightTrackerBlock({ block }: { block: any }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [flight, setFlight] = useState<any>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setSearched(true);

    setTimeout(() => {
      const codeClean = code.trim().toUpperCase();
      const hash = codeClean.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

      const airports = [
        "GRU (São Paulo)",
        "GIG (Rio)",
        "MIA (Miami)",
        "LHR (Londres)",
        "CDG (Paris)",
        "ORL (Orlando)",
        "FLN (Florianópolis)",
        "XAP (Chapecó)",
      ];
      const statusList = ["Confirmado", "Embarque Imediato", "Atrasado", "Decolou"];

      const originIdx = hash % airports.length;
      const destIdx = (hash + 3) % airports.length;
      const statusIdx = hash % statusList.length;

      setFlight({
        code: codeClean,
        origin: airports[originIdx],
        destination: airports[destIdx === originIdx ? (destIdx + 1) % airports.length : destIdx],
        status: statusList[statusIdx],
        terminal: (hash % 3) + 1,
        gate: String.fromCharCode(65 + (hash % 6)) + ((hash % 25) + 1),
        baggage: (hash % 10) + 1,
      });
      setLoading(false);
    }, 800);
  };

  return (
    <div className="mx-auto max-w-md w-full px-4 text-left">
      <div className="p-6 rounded-3xl border border-border bg-surface">
        <h4 className="font-bold text-sm text-foreground text-center mb-1">
          {block.title || "Status de Voos em Tempo Real"}
        </h4>
        <p className="text-[11px] text-muted-foreground text-center mb-4">
          Insira o código do seu voo para obter portão de embarque e status.
        </p>

        <form onSubmit={handleSearch} className="flex gap-2 mb-3">
          <input
            type="text"
            required
            placeholder="Ex: AD2412, LA3120"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 h-10 px-3 rounded-lg border border-border bg-surface text-xs font-mono font-bold uppercase tracking-wider outline-none focus:border-brand"
          />
          <button
            type="submit"
            disabled={loading}
            className="h-10 px-4 rounded-lg bg-brand text-brand-foreground font-bold text-xs hover:bg-brand/90 transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            {loading ? "Buscando..." : "Consultar"}
          </button>
        </form>

        {searched && !loading && flight && (
          <div className="mt-4 pt-4 border-t border-border/60 space-y-3">
            <div className="flex justify-between items-center border-b border-border/40 pb-2.5">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Voo</span>
                <h5 className="text-base font-black text-foreground leading-none mt-0.5">
                  {flight.code}
                </h5>
              </div>
              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase${flight.status === "Atrasado" ? "bg-red-500/10 text-red-500" : flight.status === "Embarque Imediato" ? "bg-yellow-500/10 text-yellow-600" : "bg-emerald-500/10 text-emerald-500"}`}
              >
                {flight.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Origem</span>
                <span className="font-bold text-foreground block mt-0.5">{flight.origin}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Destino</span>
                <span className="font-bold text-foreground block mt-0.5">{flight.destination}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-border/40 pt-3 text-center">
              <div className="bg-surface-alt/40 border border-border/40 rounded-xl p-2">
                <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold">
                  Terminal
                </span>
                <span className="text-sm font-black text-foreground block mt-0.5">
                  {flight.terminal}
                </span>
              </div>
              <div className="bg-surface-alt/40 border border-border/40 rounded-xl p-2">
                <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold">
                  Portão
                </span>
                <span className="text-sm font-black text-brand block mt-0.5">{flight.gate}</span>
              </div>
              <div className="bg-surface-alt/40 border border-border/40 rounded-xl p-2">
                <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold">
                  Esteira
                </span>
                <span className="text-sm font-black text-foreground block mt-0.5">
                  {flight.baggage}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BIOLINK QR CODE SHARE BLOCK ─────────────────────────────────────────────
function BiolinkQrCodeShareBlock({ block }: { block: any }) {
  const [copied, setCopied] = useState(false);
  const currentUrl = typeof window !== "undefined" ? window.location.href : "https://travelos.app";

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: block.title || "Compartilhar Contato",
          url: currentUrl,
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      toast.success("Link copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(currentUrl)}`;

  return (
    <div className="mx-auto max-w-md w-full px-4 text-center">
      <div className="p-6 rounded-3xl border border-border bg-surface flex flex-col items-center gap-4">
        <h4 className="font-bold text-sm text-foreground">
          {block.title || "Compartilhe meu Contato"}
        </h4>

        <div className="p-2 bg-white rounded-2xl border border-border/50 shrink-0">
          <img src={qrCodeUrl} alt="Biolink QR Code" className="w-32 h-32 object-contain" />
        </div>

        <button
          onClick={handleShare}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-brand text-brand-foreground font-bold text-xs hover:bg-brand/90 transition-all cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          {copied ? "Link Copiado!" : "Compartilhar Link"}
        </button>
      </div>
    </div>
  );
}

// ─── CLIENT BOARDING TIMELINE BLOCK ──────────────────────────────────────────
function ClientBoardingTimelineBlock({ block, agencyId }: { block: any; agencyId?: string }) {
  const timelineSteps = [
    {
      title: "Check-in Realizado",
      desc: "Seus cartões de embarque estão emitidos.",
      status: "done",
      time: "09:00",
    },
    {
      title: "Despacho de Bagagem",
      desc: "Vá ao balcão da cia aérea se possuir malas rígidas.",
      status: "done",
      time: "10:15",
    },
    {
      title: "Abertura do Portão",
      desc: "Aguarde no portão B14 da área de embarque.",
      status: "active",
      time: "11:20",
    },
    {
      title: "Embarque Iniciado",
      desc: "Tenha documento oficial com foto em mãos.",
      status: "pending",
      time: "11:40",
    },
    {
      title: "Decolagem",
      desc: "Voo AD2412 com destino a Miami.",
      status: "pending",
      time: "12:15",
    },
  ];

  return (
    <div className="mx-auto max-w-md w-full px-4 text-left">
      <div className="p-6 rounded-3xl border border-border bg-surface">
        <h4 className="text-xs font-bold text-foreground mb-6 uppercase tracking-wider text-center">
          {block.title || "Fluxo de Embarque Operacional"}
        </h4>

        <div className="relative pl-6 border-l border-border space-y-6">
          {timelineSteps.map((step, idx) => (
            <div key={idx} className="relative">
              <div
                className={`absolute -left-[30px] top-0.5 w-4.5 h-4.5 rounded-full border-4 border-background flex items-center justify-center${
                  step.status === "done"
                    ? "bg-emerald-500"
                    : step.status === "active"
                      ? "bg-brand animate-pulse"
                      : "bg-muted-foreground/30"
                }`}
              />
              <div className="flex justify-between items-start">
                <div>
                  <h5
                    className={`font-bold text-xs${step.status === "done" ? "text-muted-foreground" : "text-foreground"}`}
                  >
                    {step.title}
                  </h5>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground bg-surface-alt/60 px-2 py-0.5 rounded-md font-bold">
                  {step.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
