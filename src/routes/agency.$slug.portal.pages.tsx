import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, GripVertical, Trash2, Edit2, X, ExternalLink, Globe } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import {
  Field,
  Input,
  Select,
  Textarea,
  PrimaryButton,
  GhostButton,
  Sheet,
  StatusBadge,
} from "@/components/ui/form";
import { FileUploader } from "@/components/uploads/FileUploader";
import { MultiFileUploader } from "@/components/uploads/MultiFileUploader";
import { BlockRenderer } from "@/components/portal/BlockRenderer";

export const Route = createFileRoute("/agency/$slug/portal/pages")({
  head: () => ({ meta: [{ title: "Páginas do portal · TravelOS" }] }),
  component: PagesPage,
});

export type PortalBlock =
  | {
      id: string;
      type: "hero";
      title: string;
      subtitle: string;
      bg_image_url: string;
      cta_label: string;
      cta_link: string;
    }
  | {
      id: string;
      type: "text";
      content: string;
      align: "left" | "right" | "center";
      image_url: string;
    }
  | { id: string; type: "gallery"; images: string[] }
  | { id: string; type: "contact"; title: string; text: string };

type PageRow = {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
  template: string | null;
  blocks: any;
  seo: any;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function PagesPage() {
  const { agency } = useAgency();
  const qc = useQueryClient();
  const [editingPage, setEditingPage] = useState<PageRow | null | "new">(null);

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["portal-pages", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_pages")
        .select("id, slug, title, is_published, template, blocks, seo")
        .eq("agency_id", agency!.id)
        .order("created_at");
      if (error) throw error;
      return data as PageRow[];
    },
  });

  async function togglePublish(p: PageRow) {
    const { error } = await supabase
      .from("portal_pages")
      .update({ is_published: !p.is_published })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(p.is_published ? "Página despublicada" : "Página publicada");
    qc.invalidateQueries({ queryKey: ["portal-pages", agency?.id] });
  }

  async function deletePage(p: PageRow) {
    if (!confirm(`Tem certeza que deseja excluir a página "${p.title}"?`)) return;
    const { error } = await supabase.from("portal_pages").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Página excluída");
    qc.invalidateQueries({ queryKey: ["portal-pages", agency?.id] });
  }

  return (
    <>
      <PageHeader
        title="Páginas do portal"
        description="Construa páginas estáticas usando o editor de blocos dinâmicos."
        actions={
          <button
            onClick={() => setEditingPage("new")}
            className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Nova página
          </button>
        }
      />

      {q.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
      {q.data?.length === 0 && (
        <EmptyState
          title="Sem páginas"
          description="Crie páginas institucionais para o seu portal."
        />
      )}

      {q.data && q.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Título</th>
                <th className="px-3 py-2">Slug</th>
                <th className="px-3 py-2">Template</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-border hover:bg-surface-alt/30 transition-colors"
                >
                  <td
                    className="px-3 py-2.5 font-medium cursor-pointer"
                    onClick={() => setEditingPage(p)}
                  >
                    {p.title}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">/{p.slug}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground capitalize">
                    {p.template ?? "padrão"}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge tone={p.is_published ? "success" : "neutral"}>
                      {p.is_published ? "publicada" : "rascunho"}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-2.5 text-right flex justify-end items-center gap-2">
                    {p.is_published && agency && (
                      <a
                        href={`${window.location.origin}/p/${agency.slug}/${p.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-brand"
                        title="Ver no portal"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => togglePublish(p)}
                      className="text-xs text-primary hover:underline"
                    >
                      {p.is_published ? "Despublicar" : "Publicar"}
                    </button>
                    <button
                      onClick={() => deletePage(p)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingPage !== null && agency && (
        <PageEditorSheet
          agencyId={agency.id}
          initialData={editingPage === "new" ? null : editingPage}
          onClose={() => setEditingPage(null)}
          onSaved={() => {
            setEditingPage(null);
            qc.invalidateQueries({ queryKey: ["portal-pages", agency.id] });
          }}
        />
      )}
    </>
  );
}

function PageEditorSheet({
  agencyId,
  initialData,
  onClose,
  onSaved,
}: {
  agencyId: string;
  initialData: PageRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [template, setTemplate] = useState(initialData?.template ?? "default");
  const [blocks, setBlocks] = useState<PortalBlock[]>(initialData?.blocks ?? []);

  // SEO
  const [metaTitle, setMetaTitle] = useState(initialData?.seo?.meta_title ?? "");
  const [metaDesc, setMetaDesc] = useState(initialData?.seo?.meta_description ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"content" | "seo">("content");

  const addBlock = (type: PortalBlock["type"]) => {
    const id = Math.random().toString(36).slice(2, 8);
    let newBlock: PortalBlock;
    switch (type) {
      case "hero":
        newBlock = {
          id,
          type: "hero",
          title: "",
          subtitle: "",
          bg_image_url: "",
          cta_label: "",
          cta_link: "",
        };
        break;
      case "text":
        newBlock = { id, type: "text", content: "", align: "left", image_url: "" };
        break;
      case "gallery":
        newBlock = { id, type: "gallery", images: [] };
        break;
      case "contact":
        newBlock = { id, type: "contact", title: "Fale conosco", text: "" };
        break;
    }
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id: string, updates: Partial<PortalBlock>) => {
    setBlocks(blocks.map((b) => (b.id === id ? ({ ...b, ...updates } as PortalBlock) : b)));
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id));
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const newBlocks = [...blocks];
    if (index + direction < 0 || index + direction >= newBlocks.length) return;
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[index + direction];
    newBlocks[index + direction] = temp;
    setBlocks(newBlocks);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title) return toast.error("O título é obrigatório");
    setSubmitting(true);

    const finalSlug = slug || slugify(title);

    const payload = {
      agency_id: agencyId,
      title,
      slug: finalSlug,
      template,
      blocks: blocks as any,
      seo: {
        meta_title: metaTitle,
        meta_description: metaDesc,
      },
    };

    const { error } = initialData
      ? await supabase.from("portal_pages").update(payload).eq("id", initialData.id)
      : await supabase.from("portal_pages").insert(payload);

    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success(initialData ? "Página atualizada" : "Página criada");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-overlay backdrop-blur-sm p-4 md:p-8" onClick={onClose}>
      <div
        className="flex h-full w-full flex-col rounded-2xl overflow-hidden border border-border shadow-2xl bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-surface-alt shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold tracking-tight">
              {initialData ? "Editar Página" : "Nova Página"}
            </h2>
            <StatusBadge tone="primary">Live Preview</StatusBadge>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-surface-alt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* LEFT: Editor Form */}
          <div className="w-1/2 flex flex-col border-r border-border bg-surface overflow-hidden">

          <div className="flex border-b border-border px-6 shrink-0 bg-surface">
            <button
              type="button"
              onClick={() => setTab("content")}
              className={`py-3 px-2 text-xs font-medium border-b-2 ${tab === "content" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Conteúdo & Blocos
            </button>
            <button
              type="button"
              onClick={() => setTab("seo")}
              className={`py-3 px-2 text-xs font-medium border-b-2 ${tab === "seo" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              SEO
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
          <form id="page-form" onSubmit={submit} className="space-y-6">
            {tab === "seo" && (
              <div className="space-y-4">
                <Field label="Título SEO" hint="Substitui o título padrão na aba do navegador">
                  <Input
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder={title}
                  />
                </Field>
                <Field label="Descrição SEO" hint="Aparece no Google e compartilhamentos">
                  <Textarea
                    value={metaDesc}
                    onChange={(e) => setMetaDesc(e.target.value)}
                    rows={3}
                  />
                </Field>
              </div>
            )}

            {tab === "content" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Título interno *">
                    <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
                  </Field>
                  <Field label="URL (Slug)">
                    <Input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder={slugify(title)}
                    />
                  </Field>
                </div>

                <Field label="Template">
                  <Select value={template} onChange={(e) => setTemplate(e.target.value)}>
                    <option value="default">Padrão</option>
                    <option value="about">Sobre nós</option>
                    <option value="contact">Contato</option>
                  </Select>
                </Field>

                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Construtor de Blocos</h3>
                    <div className="flex gap-2">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            addBlock(e.target.value as any);
                            e.target.value = ""; // reset
                          }
                        }}
                        className="h-8 rounded-md border border-input bg-surface px-2 text-xs outline-none focus:border-border-strong"
                      >
                        <option value="">+ Adicionar bloco...</option>
                        <option value="hero">Hero (Capa principal)</option>
                        <option value="text">Texto com imagem</option>
                        <option value="gallery">Galeria de fotos</option>
                        <option value="contact">Contato (Infos)</option>
                      </select>
                    </div>
                  </div>

                  {blocks.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        Esta página ainda não tem blocos de conteúdo.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Adicione um bloco acima para começar.
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {blocks.map((block, index) => (
                      <div
                        key={block.id}
                        className="rounded-lg border border-border bg-surface-alt/20 shadow-sm overflow-hidden"
                      >
                        <div className="flex items-center justify-between bg-surface-alt/40 px-3 py-2 border-b border-border">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              {block.type === "text" ? "Texto" : block.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveBlock(index, -1)}
                              disabled={index === 0}
                              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveBlock(index, 1)}
                              disabled={index === blocks.length - 1}
                              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => removeBlock(block.id)}
                              className="p-1 ml-2 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="p-4 space-y-4">
                          {block.type === "hero" && (
                            <>
                              <Field label="Título (Headline)">
                                <Input
                                  value={block.title}
                                  onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                                />
                              </Field>
                              <Field label="Subtítulo">
                                <Input
                                  value={block.subtitle}
                                  onChange={(e) =>
                                    updateBlock(block.id, { subtitle: e.target.value })
                                  }
                                />
                              </Field>
                              <div className="grid grid-cols-2 gap-3">
                                <Field label="Botão (Label)">
                                  <Input
                                    value={block.cta_label}
                                    onChange={(e) =>
                                      updateBlock(block.id, { cta_label: e.target.value })
                                    }
                                    placeholder="Ex: Ver pacotes"
                                  />
                                </Field>
                                <Field label="Botão (Link)">
                                  <Input
                                    value={block.cta_link}
                                    onChange={(e) =>
                                      updateBlock(block.id, { cta_link: e.target.value })
                                    }
                                    placeholder="/pacotes"
                                  />
                                </Field>
                              </div>
                              <FileUploader
                                label="Imagem de fundo (Background)"
                                value={block.bg_image_url}
                                onChange={(url) =>
                                  updateBlock(block.id, { bg_image_url: url ?? "" })
                                }
                                bucket="agency-logos"
                                folder={`${agencyId}/pages`}
                                variant="image"
                                publicBucket={false}
                              />
                            </>
                          )}

                          {block.type === "text" && (
                            <>
                              <Field label="Conteúdo (Markdown)">
                                <Textarea
                                  value={block.content}
                                  onChange={(e) =>
                                    updateBlock(block.id, { content: e.target.value })
                                  }
                                  rows={5}
                                />
                              </Field>
                              <div className="grid grid-cols-2 gap-4">
                                <FileUploader
                                  label="Imagem ilustrativa (opcional)"
                                  value={block.image_url}
                                  onChange={(url) =>
                                    updateBlock(block.id, { image_url: url ?? "" })
                                  }
                                  bucket="agency-logos"
                                  folder={`${agencyId}/pages`}
                                  variant="image"
                                  publicBucket={false}
                                />
                                <Field label="Alinhamento do Texto">
                                  <Select
                                    value={block.align}
                                    onChange={(e) =>
                                      updateBlock(block.id, { align: e.target.value as any })
                                    }
                                  >
                                    <option value="left">Esquerda (Imagem à direita)</option>
                                    <option value="right">Direita (Imagem à esquerda)</option>
                                    <option value="center">Centralizado</option>
                                  </Select>
                                </Field>
                              </div>
                            </>
                          )}

                          {block.type === "gallery" && (
                            <MultiFileUploader
                              label="Fotos da galeria"
                              values={block.images}
                              onChange={(urls) => updateBlock(block.id, { images: urls })}
                              bucket="agency-logos"
                              folder={`${agencyId}/pages`}
                              max={12}
                              publicBucket={false}
                            />
                          )}

                          {block.type === "contact" && (
                            <>
                              <Field label="Título da seção">
                                <Input
                                  value={block.title}
                                  onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                                />
                              </Field>
                              <Field label="Texto de introdução">
                                <Textarea
                                  value={block.text}
                                  onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                                  rows={2}
                                />
                              </Field>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Este bloco puxará automaticamente as redes sociais e o formulário de
                                lead da agência no portal público.
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
              <div className="pt-6 border-t border-border mt-8 flex justify-end gap-3">
                <GhostButton type="button" onClick={onClose} disabled={submitting}>
                  Cancelar
                </GhostButton>
                <PrimaryButton type="submit" disabled={submitting}>
                  {submitting ? "Salvando..." : "Salvar Página"}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT: Live Preview */}
        <div className="w-1/2 bg-background flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 overflow-y-auto pointer-events-none p-4">
            <div className="border border-border/50 rounded-2xl bg-surface min-h-[800px] shadow-2xl p-4 md:p-8 overflow-hidden scale-[0.85] origin-top">
              {/* Fake header do portal */}
              <div className="h-16 flex items-center justify-center opacity-50 mb-8 border-b border-border">
                 Menu do Portal 
              </div>
              
              <BlockRenderer blocks={blocks} agencySlug="preview" />

              {blocks.length === 0 && (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  Seu portal está vazio. Adicione blocos no editor.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}
