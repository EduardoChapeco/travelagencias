import { Button } from "@/components/ui/button";
/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState, useEffect } from "react";
import { useScrollAnimation, useParallax, useCountUp } from "@/hooks/use-scroll-animation";
import { renderIconByName } from "@/components/portal/BlockRenderer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FormInput as Input } from "@/components/ui/input";
import { FormTextarea as Textarea } from "@/components/ui/textarea";
import {
  Star,
  Quote,
  Play,
  Plane,
  Mail,
  Phone,
  MapPin,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Send,
  Check,
} from "lucide-react";

interface NewSectionsRendererProps {
  block: {
    id: string;
    type: string;
    config: Record<string, any>;
    styles?: any;
    animation?: any;
    responsive?: any;
  };
  agencySlug: string;
  pageId?: string;
  agencyId?: string;
  handleLinkClick: (url: string) => void;
}

export function NewSectionsRenderer({
  block,
  agencySlug,
  pageId,
  agencyId,
  handleLinkClick,
}: NewSectionsRendererProps) {
  const config = block.config || {};
  const styles = block.styles || {};
  const animation = block.animation || {
    enabled: false,
    type: "none",
    delay: 0,
    duration: 600,
    trigger: "onEnter",
  };

  const animRef = useScrollAnimation(animation);

  // Helper to get font families from CSS custom properties or fallback
  const headingStyle = { fontFamily: "var(--brand-heading-font), Montserrat, sans-serif" };
  const bodyStyle = { fontFamily: "var(--brand-body-font), Inter, sans-serif" };

  switch (block.type) {
    // ==========================================
    // HERO SECTIONS
    // ==========================================
    case "hero-fullscreen": {
      const parallaxBgRef = useParallax(animation.type === "parallax");
      return (
        <section
          ref={animRef as any}
          className={`relative min-h-[90vh] flex items-center justify-center overflow-hidden w-full${
            config.alignment === "left"
              ? "text-left justify-start px-6 md:px-16"
              : "text-center px-4"
          }`}
        >
          {/* Background image & overlay */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <img
              ref={parallaxBgRef as any}
              src={
                config.image ||
                "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80"
              }
              alt="Hero Background"
              className="w-full h-full object-cover origin-center transition-transform duration-200"
            />
            <div
              className="absolute inset-0 bg-black"
              style={{ opacity: config.overlayOpacity ?? 0.5 }}
            />
          </div>

          <div className="relative z-10 max-w-4xl w-full text-white space-y-6">
            {config.badgeVisible && config.badgeText && (
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-white/10 backdrop-blur-md text-white border border-white/20">
                {config.badgeText}
              </span>
            )}
            <h1
              style={headingStyle}
              className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight tracking-tight"
            >
              {config.headline}
            </h1>
            <p
              style={bodyStyle}
              className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto md:mx-0"
            >
              {config.subtitle}
            </p>
            <div
              className={`flex flex-wrap gap-4 pt-4${config.alignment === "center" ? "justify-center" : "justify-start"}`}
            >
              {config.cta1_text && config.cta1_url && (
                <a
                  href={config.cta1_url}
                  onClick={() => handleLinkClick(config.cta1_url)}
                  className="px-8 py-3 rounded-full text-sm font-bold transition-all transform hover:scale-105"
                  style={{
                    backgroundColor: "var(--brand-primary, #1E3A5F)",
                    color: "var(--brand-foreground, #FFFFFF)",
                  }}
                >
                  {config.cta1_text}
                </a>
              )}
              {config.cta2_text && config.cta2_url && (
                <a
                  href={config.cta2_url}
                  onClick={() => handleLinkClick(config.cta2_url)}
                  className="px-8 py-3 rounded-full text-sm font-bold transition-all transform hover:scale-105 border border-white/30 bg-white/10 backdrop-blur hover:bg-white/20"
                >
                  {config.cta2_text}
                </a>
              )}
            </div>
          </div>
        </section>
      );
    }

    case "hero-split": {
      return (
        <section ref={animRef as any} className="py-12 md:py-24 px-4 max-w-7xl mx-auto w-full">
          <div
            className={`flex flex-col lg:flex-row items-center gap-12${
              config.layout === "text-right" ? "lg:flex-row-reverse" : ""
            }`}
          >
            {/* Text column */}
            <div
              className={`w-full lg:w-1/2 space-y-6${config.ratio === "60/40" ? "lg:pr-12" : ""}`}
            >
              {config.badgeText && (
                <span
                  className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white"
                  style={{ backgroundColor: config.badgeColor || "var(--brand-primary, #1E3A5F)" }}
                >
                  {config.badgeText}
                </span>
              )}
              <h1
                style={headingStyle}
                className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight text-foreground"
              >
                {config.headline}
              </h1>
              <p
                style={bodyStyle}
                className="text-base md:text-lg text-muted-foreground leading-relaxed"
              >
                {config.paragraph}
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                {config.cta1_text && config.cta1_url && (
                  <a
                    href={config.cta1_url}
                    onClick={() => handleLinkClick(config.cta1_url)}
                    className="px-6 py-3 rounded-3xl text-sm font-bold text-white transition-all transform hover:scale-105"
                    style={{ backgroundColor: "var(--brand-primary, #1E3A5F)" }}
                  >
                    {config.cta1_text}
                  </a>
                )}
                {config.cta2_text && config.cta2_url && (
                  <a
                    href={config.cta2_url}
                    onClick={() => handleLinkClick(config.cta2_url)}
                    className="px-6 py-3 rounded-3xl text-sm font-bold border border-border hover:bg-surface-alt/50 transition-colors"
                  >
                    {config.cta2_text}
                  </a>
                )}
              </div>
            </div>

            {/* Image column */}
            <div className="w-full lg:w-1/2 relative">
              <div className="relative z-10 w-full overflow-hidden">
                <img
                  src={config.imageMain}
                  alt="Destination Preview"
                  className={`w-full h-auto object-cover${config.imageBorderRadius || "rounded-2xl"}`}
                />
              </div>
              {config.imageSecondary && (
                <div className="absolute -bottom-6 -left-6 z-20 w-1/2 overflow-hidden hidden md:block">
                  <img
                    src={config.imageSecondary}
                    alt="Secondary Preview"
                    className={`w-full h-auto object-cover border-4 border-surface${config.imageBorderRadius || "rounded-2xl"}`}
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      );
    }

    case "hero-gradient": {
      return (
        <section
          ref={animRef as any}
          className="relative py-20 md:py-32 px-4 overflow-hidden w-full text-white"
          style={{
            background: `linear-gradient(${
              config.gradientDirection === "to-b"
                ? "180deg"
                : config.gradientDirection === "to-br"
                  ? "135deg"
                  : "90deg"
            }, ${config.color1 || "#1E3A5F"}, ${config.color2 || "#D4AF37"})`,
          }}
        >
          <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
            <div className="w-full lg:w-1/2 space-y-6">
              <h1
                style={headingStyle}
                className="text-4xl md:text-6xl font-black leading-tight tracking-tight"
              >
                {config.headline}
              </h1>
              <p style={bodyStyle} className="text-lg text-white/80 leading-relaxed max-w-lg">
                {config.subtitle}
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                {config.cta1_text && config.cta1_url && (
                  <a
                    href={config.cta1_url}
                    onClick={() => handleLinkClick(config.cta1_url)}
                    className="px-8 py-3 rounded-full text-sm font-bold bg-white text-black hover:bg-white/90 transition-all transform hover:scale-105"
                  >
                    {config.cta1_text}
                  </a>
                )}
              </div>
            </div>

            {config.deviceType !== "none" && config.deviceImage && (
              <div className="w-full lg:w-1/2 flex justify-center">
                <div
                  className={`relative overflow-hidden border-8 border-white/20 bg-black${
                    config.deviceType === "phone"
                      ? "w-[280px] h-[560px] rounded-[40px]"
                      : config.deviceType === "tablet"
                        ? "w-[450px] h-[600px] rounded-3xl"
                        : "w-full aspect-video rounded-3xl"
                  }`}
                >
                  <img
                    src={config.deviceImage}
                    alt="Mockup View"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      );
    }

    case "hero-dark": {
      return (
        <section
          ref={animRef as any}
          className="py-20 md:py-32 px-4 w-full text-white overflow-hidden relative"
          style={{ backgroundColor: config.backgroundColor || "#0A0A0A" }}
        >
          {config.floatingIcons && (
            <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
              <div className="absolute top-[20%] left-[10%] animate-pulse">
                <Plane className="h-8 w-8 text-white" />
              </div>
              <div className="absolute bottom-[30%] right-[15%] animate-bounce duration-[4s]">
                <Star className="h-6 w-6 text-white fill-current" />
              </div>
            </div>
          )}

          <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
            <div className="w-full lg:w-1/2 space-y-6">
              {config.badgeText && (
                <span
                  className="inline-block px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider"
                  style={{ backgroundColor: config.badgeColor || "#D4AF37", color: "#000" }}
                >
                  {config.badgeText}
                </span>
              )}
              <h1
                style={headingStyle}
                className="text-4xl md:text-6xl font-black leading-tight tracking-tight"
              >
                {config.headline}
              </h1>
              <p style={bodyStyle} className="text-lg text-neutral-400 max-w-lg leading-relaxed">
                {config.subtitle}
              </p>
              {config.cta_text && config.cta_url && (
                <div className="pt-4">
                  <a
                    href={config.cta_url}
                    onClick={() => handleLinkClick(config.cta_url)}
                    className="px-8 py-3 rounded-full text-sm font-bold transition-all transform hover:scale-105"
                    style={{ backgroundColor: config.accentColor || "#D4AF37", color: "#000" }}
                  >
                    {config.cta_text}
                  </a>
                </div>
              )}
            </div>

            <div className="w-full lg:w-1/2 relative flex justify-center">
              <div className="relative max-w-md w-full aspect-[4/3] rounded-3xl overflow-hidden border-4 border-neutral-800">
                <img
                  src={config.centralImage}
                  alt="Exclusive Travel"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>
      );
    }

    case "hero-travel": {
      return (
        <section
          ref={animRef as any}
          className="relative min-h-[85vh] flex items-center justify-center overflow-hidden w-full text-center px-4 py-12"
        >
          <div className="absolute inset-0 z-0">
            <img
              src={
                config.backgroundImage ||
                "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1920&q=80"
              }
              alt="Travel background"
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0 bg-black"
              style={{ opacity: config.overlayOpacity ?? 0.4 }}
            />
          </div>

          <div className="relative z-10 max-w-4xl w-full text-white space-y-8">
            <div className="space-y-4">
              <h1
                style={headingStyle}
                className="text-4xl md:text-6xl font-black leading-tight tracking-tight"
              >
                {config.headline}
              </h1>
              <p style={bodyStyle} className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
                {config.subtitle}
              </p>
            </div>

            {config.searchBarVisible && (
              <div className="bg-surface p-6 rounded-3xl max-w-3xl mx-auto text-foreground">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <div className="text-left space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">DESTINO</label>
                    <div className="flex items-center gap-1.5 border border-border rounded-3xl p-2.5">
                      <MapPin className="h-4 w-4 text-brand" />
                      <Input
                        type="text"
                        placeholder="Para onde vamos?"
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="text-left space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">IDA</label>
                    <div className="flex items-center gap-1.5 border border-border rounded-3xl p-2.5">
                      <Input type="date" className="w-full" />
                    </div>
                  </div>
                  <div className="text-left space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">PASSAGEIROS</label>
                    <div className="flex items-center gap-1.5 border border-border rounded-3xl p-2.5">
                      <Input
                        type="number"
                        min={1}
                        defaultValue={1}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="pt-5 md:pt-0">
                    <Button
                      onClick={() => handleLinkClick(config.searchButtonActionUrl || "#")}
                      className="w-full h-11 rounded-3xl text-sm font-bold text-white transition-colors"
                      style={{ backgroundColor: "var(--brand-primary, #1E3A5F)" }}
                    >
                      {config.searchButtonText || "Pesquisar"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      );
    }

    case "hero-bento": {
      return (
        <section ref={animRef as any} className="py-12 md:py-24 px-4 max-w-7xl mx-auto w-full">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="w-full lg:w-1/2 space-y-6">
              <h1
                style={headingStyle}
                className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight text-foreground"
              >
                {config.headline}
              </h1>
              <p style={bodyStyle} className="text-lg text-muted-foreground">
                {config.subtitle}
              </p>
              {config.ctaText && config.ctaUrl && (
                <div className="pt-2">
                  <a
                    href={config.ctaUrl}
                    onClick={() => handleLinkClick(config.ctaUrl)}
                    className="px-6 py-3 rounded-3xl text-sm font-bold text-white transition-all transform hover:scale-105"
                    style={{ backgroundColor: "var(--brand-primary, #1E3A5F)" }}
                  >
                    {config.ctaText}
                  </a>
                </div>
              )}
              {config.metrics && Array.isArray(config.metrics) && (
                <div className="flex gap-8 pt-6 border-t border-border">
                  {config.metrics.map((m: any, i: number) => (
                    <div key={i} className="space-y-1">
                      <div className="text-2xl font-black text-brand">{m.value}</div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase">
                        {m.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="w-full lg:w-1/2">
              <div className="grid grid-cols-2 gap-4">
                {config.bentoCells &&
                  Array.isArray(config.bentoCells) &&
                  config.bentoCells.slice(0, 4).map((cell: any, i: number) => {
                    if (cell.type === "stat") {
                      return (
                        <div
                          key={i}
                          className="bg-brand/10 p-6 rounded-2xl flex flex-col justify-center text-center aspect-square border border-brand/20"
                        >
                          <div className="text-3xl font-black text-brand mb-1">{cell.value}</div>
                          <div className="text-xs font-semibold text-muted-foreground uppercase leading-relaxed">
                            {cell.label}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={i} className="rounded-2xl overflow-hidden aspect-square">
                        <img
                          src={cell.value}
                          alt="Bento Cell"
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </section>
      );
    }

    case "hero-minimal": {
      return (
        <section
          ref={animRef as any}
          className="py-24 md:py-36 px-4 text-center max-w-4xl mx-auto space-y-6"
        >
          <h1
            style={headingStyle}
            className="text-4xl md:text-7xl font-black tracking-tight text-foreground leading-tight"
          >
            {config.headline} <br />
            {config.accentWord && (
              <span style={{ color: "var(--brand-primary, #1E3A5F)" }}>{config.accentWord}</span>
            )}
          </h1>
          <p
            style={bodyStyle}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            {config.subtitle}
          </p>
          <div className="flex justify-center gap-4 pt-4">
            {config.cta1_text && config.cta1_url && (
              <a
                href={config.cta1_url}
                onClick={() => handleLinkClick(config.cta1_url)}
                className="px-6 py-3 rounded-full text-sm font-bold text-white hover:opacity-90 transition-all transform hover:scale-105"
                style={{ backgroundColor: "var(--brand-primary, #1E3A5F)" }}
              >
                {config.cta1_text}
              </a>
            )}
            {config.cta2_text && config.cta2_url && (
              <a
                href={config.cta2_url}
                onClick={() => handleLinkClick(config.cta2_url)}
                className="px-6 py-3 rounded-full text-sm font-bold border border-border hover:bg-surface-alt/50 transition-colors"
              >
                {config.cta2_text}
              </a>
            )}
          </div>
        </section>
      );
    }

    // ==========================================
    // DESTINATIONS
    // ==========================================
    case "destinations-grid": {
      const showCols = config.columns === "4" ? "lg:grid-cols-4" : "lg:grid-cols-3";
      return (
        <section ref={animRef as any} className="py-16 px-4 max-w-7xl mx-auto w-full">
          <div className="text-center space-y-3 mb-12">
            {config.sectionLabel && (
              <span
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: "var(--brand-primary, #1E3A5F)" }}
              >
                {config.sectionLabel}
              </span>
            )}
            <h2
              style={headingStyle}
              className="text-3xl md:text-4xl font-extrabold text-foreground"
            >
              {config.sectionTitle}
            </h2>
            {config.sectionDescription && (
              <p style={bodyStyle} className="text-muted-foreground max-w-2xl mx-auto">
                {config.sectionDescription}
              </p>
            )}
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2${showCols}gap-8`}>
            {config.items &&
              Array.isArray(config.items) &&
              config.items.map((item: any, i: number) => (
                <div
                  key={i}
                  className="group relative flex flex-col bg-surface rounded-2xl overflow-hidden border border-border/60 transition-all duration-300"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-alt">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-black border border-white/20">
                      {item.country}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 style={headingStyle} className="text-xl font-bold text-foreground mb-2">
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-1 mb-4">
                        {config.showRatings &&
                          Array.from({ length: item.rating || 5 }).map((_, si) => (
                            <Star key={si} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-4 mt-2">
                      {config.showPrices && item.price && (
                        <span className="text-xs font-bold text-muted-foreground">
                          {item.price}
                        </span>
                      )}
                      <a
                        href={item.link}
                        onClick={() => handleLinkClick(item.link)}
                        className="text-xs font-extrabold flex items-center gap-1 transition-transform group-hover:translate-x-1"
                        style={{ color: "var(--brand-primary, #1E3A5F)" }}
                      >
                        Explorar <ArrowRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {config.ctaText && config.ctaUrl && (
            <div className="text-center pt-12">
              <a
                href={config.ctaUrl}
                onClick={() => handleLinkClick(config.ctaUrl)}
                className="inline-flex h-11 items-center justify-center rounded-full bg-brand px-6 text-xs font-bold text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "var(--brand-primary, #1E3A5F)" }}
              >
                {config.ctaText}
              </a>
            </div>
          )}
        </section>
      );
    }

    case "destinations-carousel": {
      const [activeIndex, setActiveIndex] = useState(0);
      const items = config.items || [];

      return (
        <section
          ref={animRef as any}
          className="py-16 px-4 max-w-7xl mx-auto w-full overflow-hidden"
        >
          <div className="flex justify-between items-end mb-12">
            <div className="space-y-3">
              {config.sectionLabel && (
                <span className="text-xs font-bold uppercase tracking-widest text-brand">
                  {config.sectionLabel}
                </span>
              )}
              <h2
                style={headingStyle}
                className="text-3xl md:text-4xl font-extrabold text-foreground"
              >
                {config.sectionTitle}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
                disabled={activeIndex === 0}
                className="h-10 w-10 border border-border rounded-full flex items-center justify-center hover:bg-surface-alt disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                onClick={() => setActiveIndex((prev) => Math.min(items.length - 1, prev + 1))}
                disabled={activeIndex >= items.length - 1}
                className="h-10 w-10 border border-border rounded-full flex items-center justify-center hover:bg-surface-alt disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div
            className="flex transition-transform duration-500 ease-out gap-6 w-full"
            style={{ transform: `translateX(-${activeIndex * (300 + 24)}px)` }}
          >
            {items.map((item: any, i: number) => (
              <div
                key={i}
                className="w-[300px] shrink-0 group relative flex flex-col bg-surface rounded-2xl overflow-hidden border border-border/60"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-surface-alt">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-black">
                    {item.country}
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 style={headingStyle} className="text-lg font-bold text-foreground mb-1">
                      {item.name}
                    </h3>
                    <div className="text-xs font-semibold text-brand mb-4">{item.price}</div>
                  </div>
                  <a
                    href={item.link}
                    onClick={() => handleLinkClick(item.link)}
                    className="text-xs font-extrabold flex items-center gap-1 transition-transform group-hover:translate-x-1"
                    style={{ color: "var(--brand-primary, #1E3A5F)" }}
                  >
                    Ver Roteiro <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    }

    case "destinations-slider-film": {
      const items = config.items || [];
      return (
        <section
          ref={animRef as any}
          className="py-16 md:py-24 px-4 w-full relative"
          style={{
            background: `linear-gradient(135deg, ${config.color1 || "#FFEBE7"}, ${config.color2 || "#FFFFFF"})`,
          }}
        >
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
            <div className="w-full lg:w-2/5 space-y-6">
              {config.badgeText && (
                <span className="text-xs font-bold uppercase tracking-widest text-brand">
                  {config.badgeText}
                </span>
              )}
              <h2
                style={headingStyle}
                className="text-3xl md:text-5xl font-black text-foreground leading-tight"
              >
                {config.headline}
              </h2>
              <p style={bodyStyle} className="text-muted-foreground leading-relaxed">
                {config.subtitle}
              </p>
              {config.ctaText && (
                <div className="pt-2">
                  <Button
                    className="px-6 py-3 rounded-3xl text-sm font-bold text-white"
                    style={{ backgroundColor: "var(--brand-primary, #1E3A5F)" }}
                  >
                    {config.ctaText}
                  </Button>
                </div>
              )}
            </div>

            <div className="w-full lg:w-3/5 flex justify-center lg:justify-end gap-6 overflow-x-auto py-6">
              {items.map((item: any, i: number) => {
                // Apply a nice tilt and index-based rotation
                const rotation = i === 0 ? "-3deg" : i === 1 ? "0deg" : "3deg";
                const translation = i === 1 ? "-12px" : "0px";
                return (
                  <div
                    key={i}
                    className="w-[200px] sm:w-[240px] shrink-0 relative aspect-[2/3] rounded-3xl overflow-hidden border-4 border-white transform transition-transform hover:scale-105"
                    style={{
                      transform: `rotate(${rotation}) translateY(${translation})`,
                      transition: "all 0.3s ease-in-out",
                    }}
                  >
                    <img src={item.image} alt={item.city} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4 text-white">
                      <div className="text-lg font-bold">{item.city}</div>
                      <div className="text-xs text-white/70">{item.country}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      );
    }

    case "destinations-bento": {
      const items = config.items || [];
      return (
        <section ref={animRef as any} className="py-16 px-4 max-w-7xl mx-auto w-full">
          <div className="space-y-3 mb-12 text-center lg:text-left">
            <h2
              style={headingStyle}
              className="text-3xl md:text-4xl font-extrabold text-foreground"
            >
              {config.sectionTitle}
            </h2>
            {config.sectionDescription && (
              <p style={bodyStyle} className="text-muted-foreground max-w-2xl">
                {config.sectionDescription}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Featured (60%) */}
            {items[0] && (
              <div className="lg:col-span-2 relative aspect-[16/10] lg:aspect-auto rounded-3xl overflow-hidden group">
                <img
                  src={items[0].image}
                  alt={items[0].name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex flex-col justify-end p-8 text-white space-y-3">
                  <h3 style={headingStyle} className="text-2xl md:text-3xl font-black">
                    {items[0].name}
                  </h3>
                  <p className="text-white/80 max-w-md text-sm">{items[0].details}</p>
                  <a
                    href={items[0].link}
                    onClick={() => handleLinkClick(items[0].link)}
                    className="text-sm font-bold text-brand hover:underline pt-2 inline-flex items-center gap-1"
                    style={{ color: "var(--brand-secondary, #D4AF37)" }}
                  >
                    Ver Detalhes do Pacote <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            )}

            {/* Column 2: 2x2 Smaller Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:flex lg:flex-col lg:gap-6">
              {items.slice(1, 3).map((item: any, i: number) => (
                <div
                  key={i}
                  className="relative aspect-[16/10] lg:flex-1 rounded-3xl overflow-hidden group"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 text-white">
                    <h4 style={headingStyle} className="text-lg font-bold mb-1">
                      {item.name}
                    </h4>
                    <span className="text-xs text-white/70">{item.details}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    case "package-cards": {
      const showCols =
        config.columns === "4"
          ? "lg:grid-cols-4"
          : config.columns === "2"
            ? "lg:grid-cols-2"
            : "lg:grid-cols-3";
      return (
        <section ref={animRef as any} className="py-16 px-4 max-w-7xl mx-auto w-full">
          <div className="text-center space-y-3 mb-12">
            <h2
              style={headingStyle}
              className="text-3xl md:text-4xl font-extrabold text-foreground"
            >
              {config.sectionTitle}
            </h2>
            {config.sectionDescription && (
              <p style={bodyStyle} className="text-muted-foreground max-w-2xl mx-auto">
                {config.sectionDescription}
              </p>
            )}
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2${showCols}gap-8`}>
            {config.items &&
              Array.isArray(config.items) &&
              config.items.map((item: any, i: number) => (
                <div
                  key={i}
                  className="group flex flex-col bg-surface rounded-3xl overflow-hidden border border-border transition-all duration-300"
                >
                  <div className="relative aspect-video overflow-hidden bg-surface-alt">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {item.badge && (
                      <div
                        className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: "var(--brand-primary, #1E3A5F)" }}
                      >
                        {item.badge}
                      </div>
                    )}
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      <h3
                        style={headingStyle}
                        className="text-xl font-bold text-foreground leading-tight group-hover:text-brand transition-colors"
                      >
                        {item.title}
                      </h3>

                      {/* Inclusions / Duration */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground border-b border-border/50 pb-4">
                        <span>{item.duration}</span>
                        <span className="text-border">|</span>
                        <span>{item.inclusions}</span>
                      </div>
                    </div>

                    <div className="pt-4 flex items-end justify-between">
                      <div>
                        {config.showOriginalPrice && item.priceOriginal && (
                          <div className="text-xs text-muted-foreground line-through">
                            {item.priceOriginal}
                          </div>
                        )}
                        <div className="text-xl font-black text-brand">{item.priceCurrent}</div>
                      </div>

                      <a
                        href={item.link}
                        onClick={() => handleLinkClick(item.link)}
                        className="inline-flex h-10 items-center justify-center rounded-3xl bg-brand px-4 text-xs font-bold text-white"
                        style={{ backgroundColor: "var(--brand-primary, #1E3A5F)" }}
                      >
                        Ver Pacote
                      </a>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </section>
      );
    }

    case "travel-bento-promo": {
      return (
        <section ref={animRef as any} className="py-16 px-4 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cell 1: Large Promo */}
            <div className="md:col-span-2 relative aspect-[16/10] md:aspect-auto rounded-3xl overflow-hidden group">
              <img
                src={config.promoImage}
                alt="Promo"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-8 text-white space-y-2">
                <div
                  className="text-brand font-bold text-sm"
                  style={{ color: "var(--brand-secondary, #D4AF37)" }}
                >
                  {config.discountText}
                </div>
                <h3 style={headingStyle} className="text-3xl font-black">
                  {config.promoDestination}
                </h3>
                <p className="text-white/80 max-w-sm text-xs">{config.promoTitle}</p>
              </div>
            </div>

            {/* Cell 2: Newsletter form inside Bento */}
            <div className="bg-surface-alt/40 border border-border/60 p-8 rounded-3xl flex flex-col justify-center space-y-4">
              <h4 style={headingStyle} className="text-xl font-bold text-foreground">
                {config.newsTitle}
              </h4>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Assine nossa lista de transmissão rápida e receba alertas de tarifas promocionais.
              </p>

              {/* Form replacement div */}
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="Seu melhor e-mail"
                  className="w-full p-3"
                />
                <Button
                  onClick={() => toast.success("Inscrito com sucesso!")}
                  className="w-full py-3 rounded-3xl text-xs font-bold text-white transition-colors"
                  style={{ backgroundColor: "var(--brand-primary, #1E3A5F)" }}
                >
                  Inscrever-se
                </Button>
              </div>
            </div>
          </div>
        </section>
      );
    }

    // ==========================================
    // CONTENT SECTIONS
    // ==========================================
    case "features-grid": {
      const showCols = config.columns === "4" ? "lg:grid-cols-4" : "lg:grid-cols-3";
      const cardStyles =
        config.cardStyle === "tinted"
          ? "bg-brand/5 border-transparent shadow-none"
          : config.cardStyle === "minimal"
            ? "bg-transparent border-transparent shadow-none p-4"
            : "bg-surface border-border/80 shadow-none";

      return (
        <section ref={animRef as any} className="py-16 px-4 max-w-7xl mx-auto w-full">
          <div className="text-center space-y-3 mb-16">
            <h2
              style={headingStyle}
              className="text-3xl md:text-4xl font-extrabold text-foreground"
            >
              {config.sectionTitle}
            </h2>
            {config.sectionDescription && (
              <p style={bodyStyle} className="text-muted-foreground max-w-xl mx-auto">
                {config.sectionDescription}
              </p>
            )}
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2${showCols}gap-8`}>
            {config.items &&
              Array.isArray(config.items) &&
              config.items.map((item: any, i: number) => (
                <div
                  key={i}
                  className={`flex flex-col items-start p-8 rounded-3xl border transition-all duration-300 hover:-translate-y-1 group${cardStyles}`}
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl mb-6 bg-brand/10 text-brand"
                    style={{
                      backgroundColor: "var(--brand-light, #F1F5F9)",
                      color: "var(--brand-primary, #1E3A5F)",
                    }}
                  >
                    {renderIconByName(item.icon, "h-6 w-6")}
                  </div>
                  <h3 style={headingStyle} className="text-lg font-bold text-foreground mb-3">
                    {item.title}
                  </h3>
                  <p style={bodyStyle} className="text-muted-foreground text-xs leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
          </div>
        </section>
      );
    }

    case "features-bento": {
      return (
        <section ref={animRef as any} className="py-16 px-4 max-w-7xl mx-auto w-full">
          <div className="mb-12 text-center">
            <h2 style={headingStyle} className="text-3xl font-extrabold text-foreground">
              {config.sectionTitle}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {config.items &&
              Array.isArray(config.items) &&
              config.items.map((item: any, i: number) => {
                const span = i === 0 ? "md:col-span-2" : "";
                const bg =
                  i === 0 ? "bg-brand text-white border-transparent" : "bg-surface border-border";
                const textMuted = i === 0 ? "text-white/80" : "text-muted-foreground";
                return (
                  <div
                    key={i}
                    className={`p-8 rounded-3xl border flex flex-col justify-between${span}${bg}`}
                    style={i === 0 ? { backgroundColor: "var(--brand-primary, #1E3A5F)" } : {}}
                  >
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl mb-6 bg-brand/10 text-brand"
                      style={
                        i === 0
                          ? { backgroundColor: "rgba(255,255,255,0.15)", color: "#fff" }
                          : {
                              backgroundColor: "var(--brand-light, #F1F5F9)",
                              color: "var(--brand-primary, #1E3A5F)",
                            }
                      }
                    >
                      {renderIconByName(item.icon, "h-6 w-6")}
                    </div>
                    <div>
                      <h3 style={headingStyle} className="text-lg font-bold mb-2">
                        {item.title}
                      </h3>
                      <p style={bodyStyle} className={`text-xs leading-relaxed${textMuted}`}>
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      );
    }

    case "features-numbered": {
      return (
        <section ref={animRef as any} className="py-16 px-4 max-w-5xl mx-auto w-full space-y-16">
          <div className="text-center">
            <h2 style={headingStyle} className="text-3xl font-extrabold text-foreground">
              {config.sectionTitle}
            </h2>
          </div>

          <div className="space-y-12">
            {config.items &&
              Array.isArray(config.items) &&
              config.items.map((item: any, i: number) => {
                const isEven = i % 2 === 1;
                const flexDir =
                  isEven && config.zebraLayout ? "md:flex-row-reverse" : "md:flex-row";
                return (
                  <div key={i} className={`flex flex-col${flexDir}items-center gap-8 md:gap-16`}>
                    <div className="w-full md:w-1/2 space-y-4">
                      <div className="flex items-center gap-4">
                        <span className="text-3xl font-black text-brand/35">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <h3 style={headingStyle} className="text-xl font-bold text-foreground">
                          {item.title}
                        </h3>
                      </div>
                      <p
                        style={bodyStyle}
                        className="text-muted-foreground text-sm leading-relaxed"
                      >
                        {item.description}
                      </p>
                    </div>

                    <div className="w-full md:w-1/2 rounded-3xl overflow-hidden aspect-[4/3] bg-surface-alt">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      );
    }

    case "stats-strip": {
      const bgStyle =
        config.backgroundStyle === "dark"
          ? "bg-foreground text-background border-transparent"
          : config.backgroundStyle === "brand"
            ? "bg-brand text-brand-foreground border-transparent"
            : "bg-surface border-border";

      const textColor =
        config.backgroundStyle === "dark"
          ? "text-white"
          : config.backgroundStyle === "brand"
            ? "text-brand-foreground"
            : "text-foreground";

      const labelColor =
        config.backgroundStyle === "dark"
          ? "text-neutral-400"
          : config.backgroundStyle === "brand"
            ? "text-brand-foreground/80"
            : "text-muted-foreground";

      return (
        <section
          ref={animRef as any}
          className={`py-8 md:py-12 border w-full${bgStyle}`}
          style={
            config.backgroundStyle === "brand"
              ? { backgroundColor: "var(--brand-primary, #1E3A5F)" }
              : {}
          }
        >
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
            {config.items &&
              Array.isArray(config.items) &&
              config.items.map((item: any, i: number) => {
                // Countup reference hook
                const countRef = useCountUp(item.value, animation.type === "countUp");
                return (
                  <div key={i} className="text-center space-y-1">
                    <div
                      style={headingStyle}
                      className={`text-3xl md:text-5xl font-black tracking-tight${textColor}`}
                    >
                      <span ref={countRef as any}>{item.value}</span>
                      {item.suffix}
                    </div>
                    <div
                      style={bodyStyle}
                      className={`text-xs font-semibold uppercase${labelColor}`}
                    >
                      {item.label}
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      );
    }

    case "brands-logos": {
      const isMarquee = config.mode === "marquee";
      const colClass =
        config.gridColumns === "6" ? "grid-cols-3 md:grid-cols-6" : "grid-cols-2 md:grid-cols-4";
      return (
        <section
          ref={animRef as any}
          className="py-12 border-y border-border/40 w-full overflow-hidden"
        >
          {config.sectionTitle && (
            <h3
              style={headingStyle}
              className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-8"
            >
              {config.sectionTitle}
            </h3>
          )}

          {isMarquee ? (
            <div className="flex overflow-hidden relative w-full pointer-events-none select-none">
              <div className="flex gap-16 animate-[marquee_25s_linear_infinite] shrink-0 min-w-full justify-around items-center">
                {config.items &&
                  Array.isArray(config.items) &&
                  config.items.map((item: any, i: number) => (
                    <img
                      key={i}
                      src={item.logoUrl}
                      alt={item.altText}
                      className="h-8 md:h-10 object-contain opacity-40 hover:opacity-80 transition-opacity"
                    />
                  ))}
              </div>
              {/* Duplicate array for continuous infinite scroll */}
              <div
                className="flex gap-16 animate-[marquee_25s_linear_infinite] shrink-0 min-w-full justify-around items-center"
                aria-hidden="true"
              >
                {config.items &&
                  Array.isArray(config.items) &&
                  config.items.map((item: any, i: number) => (
                    <img
                      key={i}
                      src={item.logoUrl}
                      alt={item.altText}
                      className="h-8 md:h-10 object-contain opacity-40 hover:opacity-80 transition-opacity"
                    />
                  ))}
              </div>
            </div>
          ) : (
            <div
              className={`max-w-6xl mx-auto px-4 grid${colClass}gap-8 items-center justify-items-center`}
            >
              {config.items &&
                Array.isArray(config.items) &&
                config.items.map((item: any, i: number) => (
                  <img
                    key={i}
                    src={item.logoUrl}
                    alt={item.altText}
                    className="h-8 md:h-10 object-contain opacity-45 grayscale hover:grayscale-0 hover:opacity-90 transition-all"
                  />
                ))}
            </div>
          )}
        </section>
      );
    }

    case "about-split": {
      return (
        <section ref={animRef as any} className="py-16 px-4 max-w-7xl mx-auto w-full">
          <div
            className={`flex flex-col lg:flex-row items-center gap-12${config.layout === "text-left" ? "lg:flex-row-reverse" : ""}`}
          >
            {/* Image side */}
            <div className="w-full lg:w-1/2 relative">
              <div className="relative rounded-3xl overflow-hidden aspect-[4/3] z-10">
                <img src={config.image} alt="About Agency" className="w-full h-full object-cover" />
              </div>
              <div
                className="absolute -bottom-4 -right-4 w-full h-full rounded-3xl -z-10 hidden md:block"
                style={{ backgroundColor: "var(--brand-light, #F1F5F9)" }}
              />
            </div>

            {/* Text side */}
            <div className="w-full lg:w-1/2 space-y-6">
              {config.sectionLabel && (
                <span
                  className="text-xs font-bold uppercase tracking-widest text-brand"
                  style={{ color: "var(--brand-primary, #1E3A5F)" }}
                >
                  {config.sectionLabel}
                </span>
              )}
              <h2
                style={headingStyle}
                className="text-3xl md:text-4xl font-extrabold text-foreground leading-snug"
              >
                {config.headline}
              </h2>
              <div
                style={bodyStyle}
                className="space-y-4 text-muted-foreground text-sm leading-relaxed"
              >
                <p>{config.paragraph1}</p>
                {config.paragraph2 && <p>{config.paragraph2}</p>}
              </div>

              {config.bullets && Array.isArray(config.bullets) && (
                <ul className="space-y-3 pt-2">
                  {config.bullets.map((item: any, i: number) => (
                    <li
                      key={i}
                      className="flex items-center gap-2.5 text-xs font-semibold text-foreground"
                    >
                      <Check className="h-4 w-4 text-brand shrink-0" />
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              )}

              {config.ctaText && config.ctaUrl && (
                <div className="pt-4">
                  <a
                    href={config.ctaUrl}
                    onClick={() => handleLinkClick(config.ctaUrl)}
                    className="inline-flex h-11 items-center justify-center rounded-3xl bg-brand px-6 text-xs font-bold text-white hover:opacity-95"
                    style={{ backgroundColor: "var(--brand-primary, #1E3A5F)" }}
                  >
                    {config.ctaText}
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>
      );
    }

    case "service-accordion": {
      const [openIndex, setOpenIndex] = useState<number | null>(0);
      const items = config.items || [];
      return (
        <section ref={animRef as any} className="py-16 px-4 max-w-4xl mx-auto w-full space-y-8">
          <div className="text-center">
            <h2 style={headingStyle} className="text-3xl font-extrabold text-foreground">
              {config.sectionTitle}
            </h2>
          </div>
          <div className="border-t border-border">
            {items.map((item: any, i: number) => {
              const isOpen = openIndex === i;
              return (
                <div key={i} className="border-b border-border">
                  <div
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="flex items-center justify-between py-5 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-brand shrink-0">
                        {renderIconByName(item.icon, "h-5 w-5")}
                      </div>
                      <h3 style={headingStyle} className="text-base font-bold text-foreground">
                        {item.title}
                      </h3>
                    </div>
                    <span
                      className={`text-xl font-bold text-muted-foreground transition-transform duration-300${isOpen ? "rotate-45" : ""}`}
                    >
                      +
                    </span>
                  </div>
                  <div
                    className={`overflow-hidden transition-all duration-300${isOpen ? "max-h-40 pb-5 opacity-100" : "max-h-0 opacity-0"}`}
                  >
                    <p
                      style={bodyStyle}
                      className="text-xs text-muted-foreground leading-relaxed pl-9 mb-3"
                    >
                      {item.description}
                    </p>
                    {item.link && (
                      <a
                        href={item.link}
                        onClick={() => handleLinkClick(item.link)}
                        className="text-[11px] font-extrabold pl-9"
                        style={{ color: "var(--brand-primary, #1E3A5F)" }}
                      >
                        Contratar serviço
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      );
    }

    case "service-cards": {
      const isDark = config.theme === "dark";
      const isBrand = config.theme === "colored";

      const bgClass = isDark
        ? "bg-foreground text-background border-transparent"
        : isBrand
          ? "bg-brand text-brand-foreground border-transparent"
          : "bg-surface border-border";

      const textClass = isDark
        ? "text-white"
        : isBrand
          ? "text-brand-foreground"
          : "text-foreground";

      const descClass = isDark
        ? "text-neutral-400"
        : isBrand
          ? "text-brand-foreground/80"
          : "text-muted-foreground";

      return (
        <section ref={animRef as any} className="py-16 px-4 max-w-7xl mx-auto w-full">
          <div className="text-center mb-12">
            <h2 style={headingStyle} className="text-3xl font-extrabold text-foreground">
              {config.sectionTitle}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {config.items &&
              Array.isArray(config.items) &&
              config.items.map((item: any, i: number) => (
                <div
                  key={i}
                  className={`p-8 rounded-3xl border transition-all duration-300${bgClass}`}
                  style={isBrand ? { backgroundColor: "var(--brand-primary, #1E3A5F)" } : {}}
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl mb-6 text-brand"
                    style={
                      isBrand
                        ? { backgroundColor: "rgba(255,255,255,0.15)", color: "#fff" }
                        : {
                            backgroundColor: "var(--brand-light, #F1F5F9)",
                            color: "var(--brand-primary, #1E3A5F)",
                          }
                    }
                  >
                    {renderIconByName(item.icon, "h-6 w-6")}
                  </div>
                  <h3 style={headingStyle} className={`text-lg font-bold mb-3${textClass}`}>
                    {item.title}
                  </h3>
                  <p style={bodyStyle} className={`text-xs leading-relaxed${descClass}`}>
                    {item.description}
                  </p>
                </div>
              ))}
          </div>
        </section>
      );
    }

    case "blog-grid": {
      return (
        <section ref={animRef as any} className="py-16 px-4 max-w-7xl mx-auto w-full">
          <div className="text-center mb-12">
            <h2 style={headingStyle} className="text-3xl font-extrabold text-foreground">
              {config.sectionTitle}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {config.items &&
              Array.isArray(config.items) &&
              config.items.slice(0, config.limit || 3).map((post: any, i: number) => (
                <div
                  key={i}
                  className="group bg-surface border border-border/60 rounded-2xl overflow-hidden transition-all flex flex-col justify-between"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-surface-alt">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex justify-between text-[10px] font-bold text-brand uppercase">
                        <span>{post.category}</span>
                        <span className="text-muted-foreground">{post.date}</span>
                      </div>
                      <h3
                        style={headingStyle}
                        className="text-base font-bold text-foreground leading-snug group-hover:text-brand transition-colors"
                      >
                        {post.title}
                      </h3>
                      <p
                        style={bodyStyle}
                        className="text-xs text-muted-foreground line-clamp-3 leading-relaxed"
                      >
                        {post.snippet}
                      </p>
                    </div>
                    <div className="pt-4 border-t border-border mt-4">
                      <span
                        className="text-xs font-extrabold flex items-center gap-1"
                        style={{ color: "var(--brand-primary, #1E3A5F)" }}
                      >
                        Ler Artigo{" "}
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </section>
      );
    }

    case "team-cards": {
      return (
        <section ref={animRef as any} className="py-16 px-4 max-w-7xl mx-auto w-full">
          <div className="text-center mb-12">
            <h2 style={headingStyle} className="text-3xl font-extrabold text-foreground">
              {config.sectionTitle}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center">
            {config.items &&
              Array.isArray(config.items) &&
              config.items.map((item: any, i: number) => (
                <div
                  key={i}
                  className="bg-surface border border-border/60 p-6 rounded-3xl text-center space-y-4"
                >
                  <div className="w-24 h-24 rounded-full overflow-hidden mx-auto border-2 border-border">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-1">
                    <h3 style={headingStyle} className="text-lg font-bold text-foreground">
                      {item.name}
                    </h3>
                    <div
                      className="text-xs font-semibold text-brand"
                      style={{ color: "var(--brand-primary, #1E3A5F)" }}
                    >
                      {item.role}
                    </div>
                  </div>
                  <p
                    style={bodyStyle}
                    className="text-xs text-muted-foreground leading-relaxed px-4"
                  >
                    {item.bio}
                  </p>
                  {item.whatsapp && (
                    <div className="pt-2">
                      <a
                        href={`https://wa.me/${item.whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 items-center justify-center rounded-3xl bg-green-500 hover:bg-green-600 px-4 text-xs font-bold text-white gap-1.5 transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5 fill-current" /> Falar no WhatsApp
                      </a>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </section>
      );
    }

    case "timeline": {
      return (
        <section ref={animRef as any} className="py-16 px-4 max-w-3xl mx-auto w-full space-y-12">
          <div className="text-center">
            <h2 style={headingStyle} className="text-3xl font-extrabold text-foreground">
              {config.sectionTitle}
            </h2>
          </div>

          <div className="relative border-l-2 border-brand/20 ml-4 md:ml-32 space-y-12 pb-4">
            {config.items &&
              Array.isArray(config.items) &&
              config.items.map((item: any, i: number) => (
                <div key={i} className="relative pl-6 md:pl-8">
                  {/* Time bubble */}
                  <div
                    className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-white bg-brand"
                    style={{ backgroundColor: "var(--brand-primary, #1E3A5F)" }}
                  />

                  {/* Left side label on wide screens */}
                  <div className="absolute right-full mr-8 top-1.5 hidden md:block text-right">
                    <span
                      className="text-sm font-black text-brand"
                      style={{ color: "var(--brand-primary, #1E3A5F)" }}
                    >
                      {item.time}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span
                      className="text-xs font-bold text-brand md:hidden block mb-1"
                      style={{ color: "var(--brand-primary, #1E3A5F)" }}
                    >
                      {item.time}
                    </span>
                    <h3 style={headingStyle} className="text-base font-bold text-foreground">
                      {item.title}
                    </h3>
                    <p
                      style={bodyStyle}
                      className="text-xs text-muted-foreground leading-relaxed max-w-xl"
                    >
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </section>
      );
    }

    // ==========================================
    // TESTIMONIALS
    // ==========================================
    case "testimonial-single": {
      return (
        <section
          ref={animRef as any}
          className="py-16 px-4 max-w-3xl mx-auto text-center space-y-6"
        >
          <Quote
            className="h-10 w-10 mx-auto text-brand/25"
            style={{ color: "var(--brand-primary, #1E3A5F)", opacity: 0.25 }}
          />
          <p
            style={headingStyle}
            className="text-xl md:text-2xl font-semibold italic text-foreground leading-relaxed"
          >
            "{config.text}"
          </p>
          <div className="flex items-center justify-center gap-1">
            {Array.from({ length: config.stars || 5 }).map((_, si) => (
              <Star key={si} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <div className="flex items-center justify-center gap-3">
            {config.avatar && (
              <img
                src={config.avatar}
                alt={config.author}
                className="w-12 h-12 rounded-full object-cover border border-border"
              />
            )}
            <div className="text-left">
              <div className="font-bold text-sm text-foreground">{config.author}</div>
              {config.role && <div className="text-xs text-muted-foreground">{config.role}</div>}
            </div>
          </div>
        </section>
      );
    }

    case "testimonial-carousel": {
      const [activeIndex, setActiveIndex] = useState(0);
      const items = config.items || [];
      const activeItem = items[activeIndex];

      if (!activeItem) return null;

      return (
        <section
          ref={animRef as any}
          className="py-16 px-4 max-w-4xl mx-auto w-full text-center space-y-8"
        >
          <h2 style={headingStyle} className="text-3xl font-extrabold text-foreground mb-8">
            {config.sectionTitle}
          </h2>

          <div className="space-y-6">
            <p
              style={headingStyle}
              className="text-lg md:text-xl font-medium italic text-foreground max-w-2xl mx-auto leading-relaxed"
            >
              "{activeItem.text}"
            </p>
            <div className="flex justify-center gap-1">
              {Array.from({ length: activeItem.stars || 5 }).map((_, si) => (
                <Star key={si} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <div>
              <div className="font-bold text-sm text-foreground">{activeItem.author}</div>
              {activeItem.role && (
                <div className="text-xs text-muted-foreground">{activeItem.role}</div>
              )}
            </div>
          </div>

          <div className="flex justify-center items-center gap-2 pt-4">
            {items.map((_: any, idx: number) => (
              <Button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`h-2.5 rounded-full transition-all duration-300${activeIndex === idx ? "w-6 bg-brand" : "w-2.5 bg-border"}`}
                style={
                  activeIndex === idx ? { backgroundColor: "var(--brand-primary, #1E3A5F)" } : {}
                }
              />
            ))}
          </div>
        </section>
      );
    }

    case "testimonial-grid": {
      return (
        <section ref={animRef as any} className="py-16 px-4 max-w-7xl mx-auto w-full space-y-12">
          <div className="text-center">
            <h2 style={headingStyle} className="text-3xl font-extrabold text-foreground">
              {config.sectionTitle}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {config.items &&
              Array.isArray(config.items) &&
              config.items.map((item: any, i: number) => (
                <div
                  key={i}
                  className="bg-surface border border-border p-6 rounded-3xl flex flex-col justify-between"
                >
                  <div>
                    <Quote className="h-6 w-6 text-brand/20 mb-4" />
                    <p
                      style={bodyStyle}
                      className="text-xs text-muted-foreground leading-relaxed italic mb-6"
                    >
                      "{item.text}"
                    </p>
                  </div>
                  <div className="flex items-center gap-3 border-t border-border pt-4">
                    {item.avatar ? (
                      <img
                        src={item.avatar}
                        alt={item.author}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-sm"
                        style={{
                          backgroundColor: "var(--brand-light, #F1F5F9)",
                          color: "var(--brand-primary, #1E3A5F)",
                        }}
                      >
                        {item.author.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-xs text-foreground">{item.author}</div>
                      {item.role && (
                        <div className="text-[10px] text-muted-foreground">{item.role}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </section>
      );
    }

    case "testimonial-dark": {
      return (
        <section
          ref={animRef as any}
          className="py-16 px-4 w-full text-white"
          style={{ backgroundColor: "#0D0D0D" }}
        >
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="text-center">
              <h2 style={headingStyle} className="text-3xl font-extrabold">
                {config.sectionTitle}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {config.items &&
                Array.isArray(config.items) &&
                config.items.map((item: any, i: number) => (
                  <div
                    key={i}
                    className="bg-surface-alt dark:bg-surface-muted p-6 rounded-3xl border border-border space-y-4"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: item.stars || 5 }).map((_, si) => (
                          <Star
                            key={si}
                            className="h-4.5 w-4.5 fill-current text-brand"
                            style={{ color: "var(--brand-secondary, #D4AF37)" }}
                          />
                        ))}
                      </div>
                    </div>
                    <p style={bodyStyle} className="text-sm text-neutral-300 italic">
                      "{item.text}"
                    </p>
                    <div className="border-t border-neutral-800 pt-4 flex items-center gap-3">
                      <div className="font-bold text-xs">{item.author}</div>
                      <span className="text-neutral-600">|</span>
                      <div className="text-xs text-neutral-500">{item.role}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>
      );
    }

    case "testimonial-featured": {
      return (
        <section ref={animRef as any} className="py-16 px-4 max-w-6xl mx-auto w-full">
          <div className="bg-surface-alt/45 p-8 md:p-12 rounded-3xl border border-border flex flex-col md:flex-row gap-8 md:gap-12 items-center">
            <div className="w-full md:w-2/5 aspect-square md:aspect-auto md:h-64 rounded-2xl overflow-hidden">
              <img src={config.image} alt={config.author} className="w-full h-full object-cover" />
            </div>
            <div className="w-full md:w-3/5 space-y-4">
              <Quote className="h-8 w-8 text-brand/20" />
              <p
                style={headingStyle}
                className="text-lg md:text-xl font-medium italic text-foreground leading-relaxed"
              >
                "{config.text}"
              </p>
              <div className="flex gap-1 py-1">
                {Array.from({ length: config.stars || 5 }).map((_, si) => (
                  <Star key={si} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <div className="border-t border-border pt-4">
                <div className="font-bold text-sm text-foreground">{config.author}</div>
                <div className="text-xs text-muted-foreground">{config.role}</div>
              </div>
            </div>
          </div>
        </section>
      );
    }

    case "testimonial-speech-bubble": {
      return (
        <section ref={animRef as any} className="py-16 px-4 max-w-md mx-auto text-center space-y-6">
          <div className="relative bg-surface border border-border p-6 rounded-3xl">
            <p style={bodyStyle} className="text-xs text-muted-foreground leading-relaxed italic">
              "{config.text}"
            </p>
            {/* Seta do balão */}
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-surface border-r border-b border-border rotate-45" />
          </div>
          <div className="flex flex-col items-center space-y-2 pt-2">
            {config.avatar && (
              <img
                src={config.avatar}
                alt={config.author}
                className="w-12 h-12 rounded-full object-cover border border-border"
              />
            )}
            <div>
              <div className="font-bold text-xs text-foreground">{config.author}</div>
              <div className="text-[10px] text-muted-foreground">{config.role}</div>
            </div>
          </div>
        </section>
      );
    }

    // ==========================================
    // MEDIA SECTIONS
    // ==========================================
    case "gallery-grid": {
      const items = config.images || [];
      return (
        <section ref={animRef as any} className="py-16 px-4 max-w-7xl mx-auto w-full space-y-8">
          {config.sectionTitle && (
            <h2
              style={headingStyle}
              className="text-2xl font-extrabold text-center text-foreground"
            >
              {config.sectionTitle}
            </h2>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {items.map((item: any, i: number) => (
              <div
                key={i}
                className="relative aspect-square rounded-2xl overflow-hidden group bg-surface-alt cursor-pointer"
              >
                <img
                  src={item.url}
                  alt={`Gallery ${i}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-xs font-bold bg-white/20 backdrop-blur-md px-4 py-2 rounded-full">
                    Zoom
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    }

    case "gallery-masonry": {
      const items = config.images || [];
      return (
        <section ref={animRef as any} className="py-16 px-4 max-w-7xl mx-auto w-full space-y-8">
          {config.sectionTitle && (
            <h2
              style={headingStyle}
              className="text-2xl font-extrabold text-center text-foreground"
            >
              {config.sectionTitle}
            </h2>
          )}
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
            {items.map((item: any, i: number) => (
              <div
                key={i}
                className="break-inside-avoid relative rounded-3xl overflow-hidden group bg-surface-alt cursor-pointer"
              >
                <img
                  src={item.url}
                  alt={`Gallery Masonry ${i}`}
                  className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            ))}
          </div>
        </section>
      );
    }

    case "video-section": {
      return (
        <section
          ref={animRef as any}
          className="py-16 px-4 max-w-4xl mx-auto w-full space-y-6 text-center"
        >
          {config.sectionTitle && (
            <h2 style={headingStyle} className="text-2xl font-extrabold text-foreground">
              {config.sectionTitle}
            </h2>
          )}
          <div className="relative aspect-video rounded-3xl overflow-hidden bg-black border border-border">
            <iframe
              src={config.videoUrl}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
              title="Travel Video"
            />
          </div>
        </section>
      );
    }

    case "photo-text-alternating": {
      return (
        <section ref={animRef as any} className="py-16 px-4 max-w-5xl mx-auto w-full space-y-16">
          {config.sectionTitle && (
            <h2
              style={headingStyle}
              className="text-3xl font-extrabold text-center text-foreground"
            >
              {config.sectionTitle}
            </h2>
          )}
          <div className="space-y-16">
            {config.blocks &&
              Array.isArray(config.blocks) &&
              config.blocks.map((item: any, i: number) => {
                const isEven = i % 2 === 1;
                return (
                  <div
                    key={i}
                    className={`flex flex-col${isEven ? "md:flex-row-reverse" : "md:flex-row"}items-center gap-12`}
                  >
                    <div className="w-full md:w-1/2 rounded-3xl overflow-hidden aspect-[4/3] bg-surface-alt">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="w-full md:w-1/2 space-y-4">
                      <h3 style={headingStyle} className="text-xl font-bold text-foreground">
                        {item.title}
                      </h3>
                      <p
                        style={bodyStyle}
                        className="text-muted-foreground text-sm leading-relaxed"
                      >
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      );
    }

    case "parallax-section": {
      const parallaxBgRef = useParallax(true);
      return (
        <section
          ref={animRef as any}
          className="relative min-h-[60vh] flex items-center justify-center overflow-hidden w-full text-center px-4 py-16"
        >
          <div className="absolute inset-0 z-0">
            <img
              ref={parallaxBgRef as any}
              src={config.backgroundImage}
              alt="Parallax background"
              className="w-full h-full object-cover origin-center transition-transform duration-200"
            />
            <div
              className="absolute inset-0 bg-black"
              style={{ opacity: config.overlayOpacity ?? 0.5 }}
            />
          </div>

          <div className="relative z-10 max-w-3xl w-full text-white space-y-6">
            {config.badgeText && (
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-white/10 border border-white/20 uppercase tracking-widest">
                {config.badgeText}
              </span>
            )}
            <h2 style={headingStyle} className="text-3xl md:text-5xl font-black">
              {config.headline}
            </h2>
            <p
              style={bodyStyle}
              className="text-base md:text-lg text-white/80 leading-relaxed max-w-xl mx-auto"
            >
              {config.subtitle}
            </p>
            {config.ctaText && config.ctaUrl && (
              <div className="pt-2">
                <a
                  href={config.ctaUrl}
                  onClick={() => handleLinkClick(config.ctaUrl)}
                  className="px-6 py-3 rounded-3xl text-xs font-bold transition-all transform hover:scale-105"
                  style={{
                    backgroundColor: "var(--brand-primary, #1E3A5F)",
                    color: "var(--brand-foreground, #FFFFFF)",
                  }}
                >
                  {config.ctaText}
                </a>
              </div>
            )}
          </div>
        </section>
      );
    }

    // ==========================================
    // CTA SECTIONS
    // ==========================================
    case "cta-banner": {
      const isBrand = config.backgroundType === "brand";
      const isGrad = config.backgroundType === "gradient";

      const bgStyle = isBrand
        ? "bg-brand text-brand-foreground border-transparent"
        : isGrad
          ? "bg-gradient-to-r from-brand to-brand-light text-brand-foreground border-transparent"
          : "bg-foreground text-background border-transparent";

      return (
        <section
          ref={animRef as any}
          className={`py-12 md:py-16 px-6 max-w-6xl mx-auto rounded-3xl w-full text-center space-y-6${bgStyle}`}
          style={
            isBrand
              ? { backgroundColor: "var(--brand-primary, #1E3A5F)" }
              : isGrad
                ? {
                    background:
                      "linear-gradient(135deg, var(--brand-primary, #1E3A5F), var(--brand-secondary, #D4AF37))",
                  }
                : {}
          }
        >
          <h2 style={headingStyle} className="text-3xl md:text-4xl font-extrabold leading-tight">
            {config.title}
          </h2>
          {config.subtitle && (
            <p
              style={bodyStyle}
              className="text-sm md:text-base opacity-85 max-w-xl mx-auto leading-relaxed"
            >
              {config.subtitle}
            </p>
          )}
          <div className="pt-2">
            <a
              href={config.ctaUrl}
              onClick={() => handleLinkClick(config.ctaUrl)}
              className="inline-flex h-11 items-center justify-center rounded-3xl bg-white text-black px-6 text-xs font-bold transition-all transform hover:scale-105"
            >
              {config.ctaText}
            </a>
          </div>
        </section>
      );
    }

    case "cta-newsletter": {
      const [email, setEmail] = useState("");

      const handleSubscribe = async () => {
        if (!email.trim() || !email.includes("@")) {
          return toast.error("Por favor, digite um e-mail válido.");
        }

        try {
          const { error } = await supabase.from("public_leads").insert({
            agency_id: agencyId || "",
            site_id: pageId || null,
            name: "Inscrição Newsletter",
            email: email,
            message: "Assinou a lista de transmissão pelo formulário Newsletter.",
            subject: "Newsletter",
          });

          if (error) throw error;
          toast.success("E-mail cadastrado com sucesso!");
          setEmail("");
        } catch (err: any) {
          toast.error(`Erro: ${err.message}`);
        }
      };

      return (
        <section
          ref={animRef as any}
          className="py-16 px-4 max-w-4xl mx-auto w-full text-center space-y-6"
        >
          <div className="space-y-2">
            <h2
              style={headingStyle}
              className="text-2xl md:text-3xl font-extrabold text-foreground"
            >
              {config.title}
            </h2>
            {config.subtitle && (
              <p style={bodyStyle} className="text-muted-foreground text-sm max-w-md mx-auto">
                {config.subtitle}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input
              type="email"
              placeholder={config.placeholder || "Digite seu e-mail"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 p-3"
            />
            <Button
              onClick={handleSubscribe}
              className="px-6 py-3 rounded-3xl text-sm font-bold text-white transition-colors"
              style={{ backgroundColor: "var(--brand-primary, #1E3A5F)" }}
            >
              {config.buttonText || "Cadastrar"}
            </Button>
          </div>
        </section>
      );
    }

    case "cta-contact-form": {
      const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
      const [sending, setSending] = useState(false);
      const [success, setSuccess] = useState(false);

      const handleSubmit = async () => {
        if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
          return toast.error(
            "Por favor, preencha os campos obrigatórios (Nome, E-mail e Mensagem).",
          );
        }
        setSending(true);

        try {
          const { error } = await supabase.from("public_leads").insert({
            agency_id: agencyId || "",
            site_id: pageId || null,
            name: form.name,
            email: form.email,
            phone: form.phone || null,
            subject: form.subject || "Contato Landing Page",
            message: form.message,
          });

          if (error) throw error;
          setSuccess(true);
          toast.success("Mensagem enviada com sucesso!");
        } catch (err: any) {
          toast.error(`Erro: ${err.message}`);
        } finally {
          setSending(false);
        }
      };

      return (
        <section ref={animRef as any} className="py-16 px-4 max-w-3xl mx-auto w-full space-y-8">
          <div className="text-center space-y-3">
            <h2 style={headingStyle} className="text-3xl font-extrabold text-foreground">
              {config.title}
            </h2>
            {config.subtitle && (
              <p style={bodyStyle} className="text-muted-foreground text-sm max-w-xl mx-auto">
                {config.subtitle}
              </p>
            )}
          </div>

          {success ? (
            <div className="bg-green-500/10 border border-green-500/30 p-8 rounded-3xl text-center space-y-4">
              <Check className="h-10 w-10 text-green-500 mx-auto" />
              <h3 style={headingStyle} className="text-lg font-bold text-green-600">
                Enviado com Sucesso!
              </h3>
              <p style={bodyStyle} className="text-xs text-muted-foreground max-w-sm mx-auto">
                {config.successMessage}
              </p>
            </div>
          ) : (
            <div className="bg-surface border border-border p-8 rounded-3xl space-y-4">
              {/* Form elements using div and custom handlers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">Nome Completo *</label>
                  <Input
                    type="text"
                    placeholder="Seu nome"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full p-3"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">E-mail *</label>
                  <Input
                    type="email"
                    placeholder="Seu e-mail"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full p-3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">
                    WhatsApp / Telefone
                  </label>
                  <Input
                    type="tel"
                    placeholder="Seu fone com DDD"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full p-3"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">
                    Destino de Interesse
                  </label>
                  <Input
                    type="text"
                    placeholder="Ex: Paris, Caribe, etc"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full p-3"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">
                  Mensagem / Preferências de Viagem *
                </label>
                <Textarea
                  rows={4}
                  placeholder="Conte-nos detalhes sobre sua viagem..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full p-3 resize-none"
                />
              </div>

              <div className="pt-2 text-right">
                <Button
                  onClick={handleSubmit}
                  disabled={sending}
                  className="px-6 py-3 rounded-3xl text-xs font-bold text-white transition-colors"
                  style={{ backgroundColor: "var(--brand-primary, #1E3A5F)" }}
                >
                  {sending ? "Enviando..." : "Enviar Orçamento"}
                </Button>
              </div>
            </div>
          )}
        </section>
      );
    }

    case "cta-whatsapp-float": {
      const cleanNum = config.whatsapp ? config.whatsapp.replace(/[^\d]/g, "") : "5549999999999";
      const cleanMsg = encodeURIComponent(config.message || "Olá!");
      return (
        <div className="fixed bottom-6 right-6 z-[9999] group flex flex-col items-end pointer-events-auto">
          {config.tooltip && (
            <div className="bg-surface border border-border text-foreground text-xs font-bold px-3 py-1.5 rounded-3xl mb-2 scale-90 origin-bottom-right opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200">
              {config.tooltip}
            </div>
          )}
          <a
            href={`https://wa.me/${cleanNum}?text=${cleanMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleLinkClick(`wa.me/${cleanNum}`)}
            className="h-14 w-14 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-all transform hover:scale-115 animate-[pulse_2s_infinite] select-none"
          >
            <Phone className="h-6 w-6 fill-current" />
          </a>
        </div>
      );
    }

    // ==========================================
    // NAVIGATION
    // ==========================================
    case "nav-standard":
    case "nav-dark": {
      const isDark = block.type === "nav-dark";
      const bgStyle = isDark ? "bg-foreground text-background" : "bg-surface border-b border-border/40";
      const linkHover = isDark ? "hover:text-brand" : "hover:text-brand";

      return (
        <nav className={`w-full py-4 px-6 flex items-center justify-between${bgStyle}`}>
          {/* Logo mockup inside section */}
          <div className="flex items-center gap-3 select-none">
            <div
              className="w-8 h-8 rounded-2xl bg-brand flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: "var(--brand-primary, #1E3A5F)" }}
            >
              T
            </div>
            <span style={headingStyle} className="font-extrabold tracking-tight text-sm">
              Turis
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-wider">
            {config.links &&
              Array.isArray(config.links) &&
              config.links.map((link: any, i: number) => (
                <a key={i} href={link.url} className={`${linkHover}transition-colors`}>
                  {link.label}
                </a>
              ))}
          </div>

          {config.ctaText && config.ctaUrl && (
            <a
              href={config.ctaUrl}
              onClick={() => handleLinkClick(config.ctaUrl)}
              className="px-4 py-2 rounded-3xl text-xs font-bold text-white"
              style={{ backgroundColor: "var(--brand-primary, #1E3A5F)" }}
            >
              {config.ctaText}
            </a>
          )}
        </nav>
      );
    }

    // ==========================================
    // FOOTERS
    // ==========================================
    case "footer-minimal": {
      return (
        <footer
          ref={animRef as any}
          className="py-8 border-t border-border/60 text-center text-xs text-muted-foreground space-y-4"
        >
          <div>
            {config.copyright ||
              `© ${new Date().getFullYear()} Agência. Todos os direitos reservados.`}
          </div>
        </footer>
      );
    }

    case "footer-columns":
    case "footer-dark": {
      const isDark = block.type === "footer-dark";
      const bg = isDark
        ? "bg-foreground text-background border-transparent"
        : "bg-surface border-t border-border/40";
      const mutedText = isDark ? "text-neutral-400" : "text-muted-foreground";

      return (
        <footer ref={animRef as any} className={`py-12 px-6${bg}`}>
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <h3 style={headingStyle} className="font-bold text-sm">
                Nossa Agência
              </h3>
              <p style={bodyStyle} className={`text-xs leading-relaxed${mutedText}`}>
                {config.description}
              </p>
            </div>
            <div className="space-y-3">
              <h3 style={headingStyle} className="font-bold text-sm">
                Fale Conosco
              </h3>
              <div className={`text-xs space-y-2${mutedText}`}>
                {config.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> {config.phone}
                  </div>
                )}
                {config.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> {config.email}
                  </div>
                )}
                {config.address && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {config.address}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <h3 style={headingStyle} className="font-bold text-sm">
                Links Rápidos
              </h3>
              <div className={`text-xs flex flex-col gap-2${mutedText}`}>
                <a href="#destinos">Nossos Destinos</a>
                <a href="#sobre">Quem Somos</a>
                <a href="#contato">Solicitar Proposta</a>
              </div>
            </div>
          </div>
          <div
            className={`border-t border-border/40 mt-8 pt-6 text-center text-[10px]${mutedText}`}
          >
            © {new Date().getFullYear()} Agência de Viagens. Todos os direitos reservados.
          </div>
        </footer>
      );
    }

    case "footer-cta": {
      return (
        <footer ref={animRef as any} className="bg-surface border-t border-border/40 py-12 px-6">
          <div className="max-w-7xl mx-auto space-y-12">
            <div
              className="p-8 rounded-3xl text-white text-center space-y-4"
              style={{ backgroundColor: "var(--brand-primary, #1E3A5F)" }}
            >
              <h3 style={headingStyle} className="text-xl md:text-2xl font-black">
                {config.ctaTitle}
              </h3>
              <div className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto pt-2">
                <Input
                  type="email"
                  placeholder="Seu e-mail"
                  className="flex-1 p-2.5 border-none text-black"
                />
                <Button
                  onClick={() => toast.success("Inscrito!")}
                  className="px-5 py-2.5 bg-white text-black font-extrabold text-xs rounded-3xl"
                >
                  {config.ctaButtonText}
                </Button>
              </div>
            </div>
            <div className="text-center text-xs text-muted-foreground">{config.description}</div>
          </div>
        </footer>
      );
    }

    case "footer-with-map": {
      return (
        <footer ref={animRef as any} className="py-12 px-6 bg-surface border-t border-border/40">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-center">
            <div className="w-full lg:w-1/2 aspect-video rounded-3xl overflow-hidden border border-border">
              <iframe
                src={config.mapEmbedUrl}
                className="w-full h-full border-none"
                allowFullScreen
                loading="lazy"
              />
            </div>
            <div className="w-full lg:w-1/2 space-y-4 text-center lg:text-left">
              <h3 style={headingStyle} className="font-extrabold text-lg text-foreground">
                Sede da Agência
              </h3>
              <p style={bodyStyle} className="text-xs text-muted-foreground leading-relaxed">
                {config.description}
              </p>
            </div>
          </div>
        </footer>
      );
    }

    default:
      return null;
  }
}
