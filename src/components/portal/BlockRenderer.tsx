import React from "react";
import { Link } from "@tanstack/react-router";
import DOMPurify from "isomorphic-dompurify";

export type PortalBlock =
  | { id: string; type: "hero"; title: string; subtitle: string; bg_image_url: string; cta_label: string; cta_link: string }
  | { id: string; type: "text"; content: string; align: "left" | "right" | "center"; image_url: string }
  | { id: string; type: "gallery"; images: string[] }
  | { id: string; type: "contact"; title: string; text: string };

export function BlockRenderer({ blocks, agencySlug }: { blocks: PortalBlock[]; agencySlug: string }) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="flex flex-col gap-12 py-8">
      {blocks.map((b) => (
        <React.Fragment key={b.id}>{renderBlock(b, agencySlug)}</React.Fragment>
      ))}
    </div>
  );
}

function renderBlock(b: PortalBlock, agencySlug: string) {
  switch (b.type) {
    case "hero":
      return (
        <section className="relative overflow-hidden rounded-3xl bg-surface">
          {b.bg_image_url ? (
            <img src={b.bg_image_url} alt="Hero" className="absolute inset-0 h-full w-full object-cover opacity-40" />
          ) : (
            <div className="absolute inset-0 bg-brand/5 backdrop-blur-3xl" />
          )}
          <div className="relative z-10 flex flex-col items-center justify-center p-16 text-center lg:p-32 bg-gradient-to-t from-surface/80 via-transparent to-transparent">
            <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-foreground drop-shadow-md">{b.title}</h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg lg:text-xl text-muted-foreground font-medium drop-shadow-sm">{b.subtitle}</p>
            {b.cta_label && b.cta_link && (
              <div className="mt-10">
                {b.cta_link.startsWith("http") ? (
                  <a href={b.cta_link} target="_blank" rel="noreferrer" className="inline-flex h-14 items-center justify-center rounded-full bg-brand px-8 text-sm font-bold text-brand-foreground transition-all hover:scale-105 hover:shadow-xl hover:shadow-brand/20">
                    {b.cta_label}
                  </a>
                ) : (
                  <Link to={b.cta_link} className="inline-flex h-14 items-center justify-center rounded-full bg-brand px-8 text-sm font-bold text-brand-foreground transition-all hover:scale-105 hover:shadow-xl hover:shadow-brand/20">
                    {b.cta_label}
                  </Link>
                )}
              </div>
            )}
          </div>
        </section>
      );

    case "text":
      return (
        <section className={`mx-auto max-w-5xl flex flex-col gap-8 lg:flex-row ${b.align === 'right' ? 'lg:flex-row-reverse' : ''} ${b.align === 'center' ? 'text-center items-center justify-center' : 'items-center'}`}>
          <div className="flex-1 space-y-4">
            <div className="prose prose-sm md:prose-base dark:prose-invert" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(b.content.replace(/\n/g, "<br/>")) }} />
          </div>
          {b.image_url && (
            <div className="flex-1 w-full max-w-lg">
              <img src={b.image_url} alt="Content" className="rounded-2xl object-cover shadow-xl aspect-square lg:aspect-[4/3] w-full" />
            </div>
          )}
        </section>
      );

    case "gallery":
      if (!b.images || b.images.length === 0) return null;
      return (
        <section className="mx-auto max-w-6xl w-full">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {b.images.map((img, i) => (
              <div key={i} className="aspect-square overflow-hidden rounded-xl bg-surface-alt">
                <img src={img} alt={`Gallery ${i}`} className="h-full w-full object-cover transition-transform duration-500 hover:scale-110" />
              </div>
            ))}
          </div>
        </section>
      );

    case "contact":
      return (
        <section className="mx-auto max-w-4xl text-center bg-surface-alt/50 border border-border/50 rounded-3xl p-12 lg:p-16">
          <h2 className="text-3xl font-bold tracking-tight mb-4">{b.title}</h2>
          <p className="text-lg text-muted-foreground whitespace-pre-wrap mb-8">{b.text}</p>
          <a href={`/p/${agencySlug}`} className="inline-flex h-12 items-center justify-center rounded-full bg-foreground px-8 text-sm font-bold text-background transition-colors hover:bg-foreground/90">
            Falar com a agência
          </a>
        </section>
      );

    default:
      return null;
  }
}
