import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Eye,
  Clock,
  Tag,
  BookOpen,
  ExternalLink,
  BarChart2,
  Edit2,
  X,
  Search,
  Sparkles,
  Wand2,
  Share2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { EmptyState } from "@/components/shell/PageHeader";
import { HeaderPortal } from "@/components/shell/HeaderPortal";
import {
  Field,
  Input,
  Select,
  Textarea,
  PrimaryButton,
  GhostButton,
  StatusBadge,
  fmtDate,
} from "@/components/ui/form";
import { FileUploader } from "@/components/uploads/FileUploader";
import { RichTextEditor } from "@/components/ui/RichTextEditor";

export const Route = createFileRoute("/agency/$slug/portal/blog")({
  head: () => ({ meta: [{ title: "Blog · TravelOS" }] }),
  component: BlogPage,
});

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  status: string;
  published_at: string | null;
  views: number;
  category: string | null;
  tags: string[];
  author_id: string | null;
  seo: { meta_title?: string; meta_description?: string; og_image_url?: string } | null;
  google_posted_at: string | null;
  google_post_id: string | null;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function calcReadingTime(text: string) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  scheduled: "Agendado",
  published: "Publicado",
};
const STATUS_TONE: Record<string, "neutral" | "info" | "success" | "warning"> = {
  draft: "neutral",
  scheduled: "info",
  published: "success",
};

function BlogPage() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/portal/blog" });
  const qc = useQueryClient();
  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["blog", agency?.id],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("blog_posts")
        .select(
          "id, slug, title, excerpt, cover_image_url, status, published_at, views, category, tags, author_id, seo, google_posted_at, google_post_id",
        )
        .eq("agency_id", agency!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Post[];
    },
  });

  const filtered =
    filterStatus === "all"
      ? (q.data ?? [])
      : (q.data ?? []).filter((p) => p.status === filterStatus);

  const stats = {
    total: q.data?.length ?? 0,
    published: q.data?.filter((p) => p.status === "published").length ?? 0,
    drafts: q.data?.filter((p) => p.status === "draft").length ?? 0,
    views: q.data?.reduce((s, p) => s + (p.views ?? 0), 0) ?? 0,
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <HeaderPortal>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNewOpen(true)}
            className="flex h-8 items-center gap-1.5 rounded-md bg-brand px-3 text-xs font-semibold text-brand-foreground hover:bg-brand/90 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Novo artigo
          </button>
        </div>
      </HeaderPortal>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center border-b border-border bg-surface/50 px-4 md:px-6 py-3 shrink-0 justify-between">
        <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-0.5 text-xs overflow-x-auto no-scrollbar max-w-full shrink-0">
          {["all", "published", "draft", "scheduled"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`rounded px-2.5 py-1 font-semibold transition-colors shrink-0 cursor-pointer ${
                filterStatus === s
                  ? "bg-surface-alt text-foreground border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" ? "Todos" : (STATUS_LABEL[s] ?? s)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0 space-y-6">
        {/* STATS */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Total de artigos", value: stats.total, icon: BookOpen },
            { label: "Publicados", value: stats.published, icon: Eye },
            { label: "Rascunhos", value: stats.drafts, icon: Edit2 },
            {
              label: "Visualizações totais",
              value: stats.views.toLocaleString("pt-BR"),
              icon: BarChart2,
            },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <s.icon className="h-3.5 w-3.5" />
                {s.label}
              </div>
              <div className="mt-1.5 text-xl font-bold tracking-tight">{s.value}</div>
            </div>
          ))}
        </div>

        {q.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}

        {!q.isLoading && filtered.length === 0 && (
          <EmptyState
            title="Nenhum artigo"
            description={
              filterStatus === "all"
                ? "Crie seu primeiro artigo para atrair tráfego orgânico."
                : `Sem artigos com status "${filterStatus}".`
            }
          />
        )}

        {/* POST GRID */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => setEditing(p)}
                className="group rounded-xl border border-border bg-surface text-left overflow-hidden hover:border-border-strong transition-all"
              >
                {/* Cover */}
                <div className="relative aspect-video overflow-hidden bg-surface-alt">
                  {p.cover_image_url ? (
                    <img
                      src={p.cover_image_url}
                      alt=""
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground/40">
                      <BookOpen className="h-8 w-8" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <StatusBadge tone={STATUS_TONE[p.status] ?? "neutral"}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </StatusBadge>
                  </div>
                </div>
                {/* Body */}
                <div className="p-4">
                  <div className="font-semibold text-sm leading-snug group-hover:text-brand transition-colors line-clamp-2">
                    {p.title}
                  </div>
                  {p.excerpt && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{p.excerpt}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2">
                      {p.category && (
                        <span className="rounded bg-surface-alt px-1.5 py-0.5 font-medium">
                          {p.category}
                        </span>
                      )}
                      {p.tags?.slice(0, 2).map((t) => (
                        <span key={t} className="rounded bg-surface-alt px-1.5 py-0.5">
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {p.views ?? 0}
                    </div>
                  </div>
                  {p.published_at && (
                    <div className="mt-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
                      {fmtDate(p.published_at)}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {(newOpen || editing) && agency && (
          <BlogSheet
            agencyId={agency.id}
            agencySlug={slug}
            post={editing}
            onClose={() => {
              setNewOpen(false);
              setEditing(null);
            }}
            onSaved={() => {
              setNewOpen(false);
              setEditing(null);
              qc.invalidateQueries({ queryKey: ["blog", agency.id] });
            }}
          />
        )}
      </div>
    </div>
  );
}

function BlogSheet({
  agencyId,
  agencySlug,
  post,
  onClose,
  onSaved,
}: {
  agencyId: string;
  agencySlug: string;
  post: Post | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(post?.category ?? "");
  const [tagsRaw, setTagsRaw] = useState((post?.tags ?? []).join(", "));
  const [status, setStatus] = useState(post?.status ?? "draft");
  const [scheduledDate, setScheduledDate] = useState(
    post?.published_at ? post.published_at.substring(0, 16) : "",
  );
  const [coverUrl, setCoverUrl] = useState(post?.cover_image_url ?? "");
  const [metaTitle, setMetaTitle] = useState(post?.seo?.meta_title ?? "");
  const [metaDesc, setMetaDesc] = useState(post?.seo?.meta_description ?? "");
  const [seoOpen, setSeoOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gbpPosting, setGbpPosting] = useState(false);

  async function postToGoogleBusiness() {
    if (!post?.id) return;
    setGbpPosting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("google-business-post", {
        body: { post_id: post.id, agency_id: agencyId },
      });
      if (res.error) throw res.error;
      toast.success("✓ Post publicado no Google Meu Negócio!");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Erro ao publicar no Google. Verifique a configuração OAuth.");
    } finally {
      setGbpPosting(false);
    }
  }

  // Load full content if editing
  useEffect(() => {
    if (post?.id) {
      supabase
        .from("blog_posts")
        .select("content")
        .eq("id", post.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.content) setContent(data.content);
        });
    }
  }, [post?.id]);

  const readingTime = calcReadingTime(content || excerpt || title);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    setSubmitting(true);

    const slug = post?.slug ?? slugify(title) + "-" + crypto.randomUUID();
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      title: title.trim(),
      excerpt: excerpt.trim() || null,
      content: content.trim() || null,
      cover_image_url: coverUrl || null,
      category: category.trim() || null,
      tags,
      status,
      slug,
      seo: {
        meta_title: metaTitle || null,
        meta_description: metaDesc || null,
      },
      published_at:
        status === "published"
          ? (post?.published_at ?? new Date().toISOString())
          : status === "scheduled"
            ? scheduledDate
              ? new Date(scheduledDate).toISOString()
              : null
            : null,
    };

    const { error } = post
      ? await supabase.from("blog_posts").update(payload).eq("id", post.id)
      : await supabase.from("blog_posts").insert({ ...payload, agency_id: agencyId });

    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(post ? "Artigo atualizado" : "Artigo criado");
    onSaved();
  }

  const previewUrl =
    post?.status === "published"
      ? `${window.location.origin}/p/${agencySlug}/blog/${post.slug}`
      : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-overlay" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-2xl flex-col border-l border-border bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold tracking-tight">
            {post ? "Editar artigo" : "Novo artigo"}
          </h2>
          <div className="flex items-center gap-2">
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium hover:bg-surface-alt"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Ver publicado
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-surface-alt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form id="blog-form" onSubmit={submit} className="space-y-4">
            {/* COVER IMAGE */}
            <FileUploader
              label="Imagem de capa (aparece no portal e redes sociais)"
              value={coverUrl || null}
              onChange={(url) => setCoverUrl(url ?? "")}
              bucket="agency-logos"
              folder={`${agencyId}/blog-covers`}
              variant="image"
              publicBucket={true}
            />

            <Field label="Título *">
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: 5 destinos imperdíveis para o verão 2026"
              />
            </Field>

            <Field label="Resumo" hint="Aparece nas listagens e como meta description padrão">
              <Textarea
                rows={2}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Breve descrição do artigo…"
              />
            </Field>

            <div className="rounded-xl border border-border p-4 bg-surface-alt/50 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-foreground">Conteúdo do Artigo</label>
              </div>

              <RichTextEditor value={content} onChange={setContent} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Categoria">
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Destinos, Dicas, Promoções"
                />
              </Field>
              <Field label="Tags" hint="Separe por vírgula">
                <Input
                  value={tagsRaw}
                  onChange={(e) => setTagsRaw(e.target.value)}
                  placeholder="viagem, europa, férias"
                />
              </Field>
            </div>

            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-9 px-2.5 rounded-md border border-input bg-surface text-sm outline-none focus:border-border-strong"
              >
                <option value="draft">Rascunho</option>
                <option value="published">Publicado</option>
                <option value="scheduled">Agendado</option>
              </select>
            </Field>

            {status === "scheduled" && (
              <Field
                label="Data e Hora do Agendamento *"
                hint="O artigo ficará público automaticamente nesta data"
              >
                <Input
                  type="datetime-local"
                  required
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </Field>
            )}

            {/* SEO SECTION */}
            <div className="rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setSeoOpen((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-surface-alt"
              >
                <span className="flex items-center gap-2">
                  <Search className="h-3.5 w-3.5" />
                  SEO e redes sociais
                </span>
                <span className={`transition-transform ${seoOpen ? "rotate-180" : ""}`}>▾</span>
              </button>
              {seoOpen && (
                <div className="space-y-3 border-t border-border px-4 py-4">
                  <Field label="Título para SEO" hint="Padrão: título do artigo. Máx 60 caracteres">
                    <Input
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(e.target.value)}
                      maxLength={60}
                      placeholder={title}
                    />
                    <span className="mt-0.5 block text-right text-[10px] text-muted-foreground">
                      {metaTitle.length}/60
                    </span>
                  </Field>
                  <Field
                    label="Meta description"
                    hint="Padrão: resumo do artigo. Máx 160 caracteres"
                  >
                    <Textarea
                      rows={2}
                      value={metaDesc}
                      onChange={(e) => setMetaDesc(e.target.value)}
                      maxLength={160}
                      placeholder={excerpt}
                    />
                    <span className="mt-0.5 block text-right text-[10px] text-muted-foreground">
                      {metaDesc.length}/160
                    </span>
                  </Field>
                  <p className="text-[11px] text-muted-foreground">
                    A imagem de capa é usada automaticamente como OG image nas redes sociais.
                  </p>
                </div>
              )}
            </div>

            {/* Reading time info */}
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Tempo de leitura estimado: ~{readingTime} min
              {tagsRaw && (
                <>
                  <Tag className="ml-3 h-3.5 w-3.5" />
                  {tagsRaw
                    .split(",")
                    .filter(Boolean)
                    .map((t) => (
                      <span key={t} className="rounded bg-surface-alt px-1.5 py-0.5 font-medium">
                        {t.trim()}
                      </span>
                    ))}
                </>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Google Business Post button */}
            {post?.status === "published" && !post?.google_posted_at && (
              <button
                type="button"
                onClick={postToGoogleBusiness}
                disabled={gbpPosting}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-surface-alt hover:text-foreground disabled:opacity-50 transition-colors"
              >
                <Share2 className="h-3.5 w-3.5" />
                {gbpPosting ? "Publicando..." : "Publicar no Google"}
              </button>
            )}
            {post?.google_posted_at && (
              <span className="flex items-center gap-1.5 text-xs text-success font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                No Google desde {new Date(post.google_posted_at).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <GhostButton type="button" onClick={onClose}>
              Cancelar
            </GhostButton>
            <PrimaryButton type="submit" form="blog-form" disabled={submitting} className="gap-1.5">
              {submitting ? "Salvando…" : post ? "Salvar alterações" : "Criar artigo"}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
