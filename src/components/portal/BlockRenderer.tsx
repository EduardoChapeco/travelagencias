import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import DOMPurify from "isomorphic-dompurify";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Send } from "lucide-react";
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
            <img
              src={b.bg_image_url}
              alt="Hero"
              className="absolute inset-0 h-full w-full object-cover opacity-40"
            />
          ) : (
            <div className="absolute inset-0 bg-brand/5 backdrop-blur-3xl" />
          )}
          <div className="relative z-10 flex flex-col items-center justify-center p-16 text-center lg:p-32 bg-surface/80">
            <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-foreground ">
              {b.title}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg lg:text-xl text-muted-foreground font-medium ">
              {b.subtitle}
            </p>
            {b.cta_label && b.cta_link && (
              <div className="mt-10">
                {b.cta_link.startsWith("http") ? (
                  <a
                    href={b.cta_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-14 items-center justify-center rounded-full bg-brand px-8 text-sm font-bold text-brand-foreground transition-all hover:scale-105 "
                  >
                    {b.cta_label}
                  </a>
                ) : (
                  <Link
                    to={b.cta_link}
                    className="inline-flex h-14 items-center justify-center rounded-full bg-brand px-8 text-sm font-bold text-brand-foreground transition-all hover:scale-105 "
                  >
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
        <section
          className={`mx-auto max-w-5xl flex flex-col gap-8 lg:flex-row ${b.align === "right" ? "lg:flex-row-reverse" : ""} ${b.align === "center" ? "text-center items-center justify-center" : "items-center"}`}
        >
          <div className="flex-1 space-y-4">
            <div
              className="prose prose-sm md:prose-base dark:prose-invert"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(b.content.replace(/\n/g, "<br/>")),
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

    case "gallery":
      if (!b.images || b.images.length === 0) return null;
      return (
        <section className="mx-auto max-w-6xl w-full">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {b.images.map((img, i) => (
              <div key={i} className="aspect-square overflow-hidden rounded-xl bg-surface-alt">
                <img
                  src={img}
                  alt={`Gallery ${i}`}
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-110"
                />
              </div>
            ))}
          </div>
        </section>
      );

    case "contact":
      return <ContactBlock key={b.id} block={b} agencySlug={agencySlug} />;

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
                className="flex flex-col items-start bg-surface-alt/30 p-6 rounded-2xl border border-border/50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand mb-4">
                  {/* Simplification: render a generic icon or the text if we don't have dynamic lucide imports yet */}
                  <div className="font-bold text-lg">{item.icon || "✨"}</div>
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      );

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
                {b.button_link.startsWith("http") ? (
                  <a
                    href={b.button_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-14 items-center justify-center rounded-full bg-background px-8 text-sm font-bold text-foreground transition-transform hover:scale-105"
                  >
                    {b.button_label}
                  </a>
                ) : (
                  <Link
                    to={b.button_link}
                    className="inline-flex h-14 items-center justify-center rounded-full bg-background px-8 text-sm font-bold text-foreground transition-transform hover:scale-105"
                  >
                    {b.button_label}
                  </Link>
                )}
              </div>
            )}
          </div>
        </section>
      );

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

    default:
      return null;
  }
}

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
        <p className="text-lg text-muted-foreground whitespace-pre-wrap">{block.text}</p>
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
