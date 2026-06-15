import { Trash2 } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { FileUploader } from "@/components/uploads/FileUploader";
import { MultiFileUploader } from "@/components/uploads/MultiFileUploader";
import { type PortalBlock } from "@/lib/cms-types";

type Props = {
  block: PortalBlock;
  updateBlock: (id: string, patch: Partial<PortalBlock>) => void;
  agencyId: string;
};

export function BlockFormEditor({ block, updateBlock, agencyId }: Props) {
  switch (block.type) {
    case "hero":
      return (
        <>
          <Field label="Título (Headline)">
            <Input
              value={block.title || ""}
              onChange={(e) => updateBlock(block.id, { title: e.target.value })}
            />
          </Field>
          <Field label="Subtítulo">
            <Input
              value={block.subtitle || ""}
              onChange={(e) => updateBlock(block.id, { subtitle: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Botão (Label)">
              <Input
                value={block.cta_label || ""}
                onChange={(e) => updateBlock(block.id, { cta_label: e.target.value })}
                placeholder="Ex: Ver pacotes"
              />
            </Field>
            <Field label="Botão (Link)">
              <Input
                value={block.cta_link || ""}
                onChange={(e) => updateBlock(block.id, { cta_link: e.target.value })}
                placeholder="/pacotes"
              />
            </Field>
          </div>
          <FileUploader
            label="Imagem de fundo (Background)"
            value={block.bg_image_url || ""}
            onChange={(url) => updateBlock(block.id, { bg_image_url: url ?? "" })}
            bucket="agency-logos"
            folder={`${agencyId}/pages`}
            variant="image"
            publicBucket={true}
          />
        </>
      );

    case "text":
      return (
        <>
          <Field label="Conteúdo (Markdown)">
            <Textarea
              value={block.content || ""}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              rows={5}
            />
          </Field>
          <div className="space-y-4">
            <FileUploader
              label="Imagem ilustrativa (opcional)"
              value={block.image_url || ""}
              onChange={(url) => updateBlock(block.id, { image_url: url ?? "" })}
              bucket="agency-logos"
              folder={`${agencyId}/pages`}
              variant="image"
              publicBucket={true}
            />
            <Field label="Alinhamento do Texto">
              <Select
                value={block.align || "left"}
                onChange={(e) => updateBlock(block.id, { align: e.target.value as any })}
              >
                <option value="left">Esquerda (Imagem à direita)</option>
                <option value="right">Direita (Imagem à esquerda)</option>
                <option value="center">Centralizado</option>
              </Select>
            </Field>
          </div>
        </>
      );

    case "gallery":
      return (
        <MultiFileUploader
          label="Fotos da galeria"
          values={block.images || []}
          onChange={(urls) => updateBlock(block.id, { images: urls })}
          bucket="agency-logos"
          folder={`${agencyId}/pages`}
          max={12}
          publicBucket={true}
        />
      );

    case "contact":
      return (
        <>
          <Field label="Título da seção">
            <Input
              value={block.title || ""}
              onChange={(e) => updateBlock(block.id, { title: e.target.value })}
            />
          </Field>
          <Field label="Texto de introdução">
            <Textarea
              value={block.text || ""}
              onChange={(e) => updateBlock(block.id, { text: e.target.value })}
              rows={2}
            />
          </Field>
          <p className="text-[10px] text-muted-foreground mt-1">
            Este bloco puxará automaticamente as redes sociais e o formulário de lead da agência no
            portal público.
          </p>
        </>
      );

    case "features":
      return (
        <div className="space-y-4">
          <Field label="Título da Seção">
            <Input
              value={block.title || ""}
              onChange={(e) => updateBlock(block.id, { title: e.target.value })}
              placeholder="Ex: Nossos diferenciais"
            />
          </Field>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Itens da Grade
            </label>
            {(block.items || []).map((item, itemIdx) => (
              <div
                key={itemIdx}
                className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-start border border-border p-2 rounded-lg bg-surface"
              >
                <Input
                  className="w-12 text-center px-1"
                  placeholder="Icon"
                  value={item.icon || ""}
                  onChange={(e) => {
                    const newItems = [...(block.items || [])];
                    newItems[itemIdx] = { ...newItems[itemIdx], icon: e.target.value };
                    updateBlock(block.id, { items: newItems });
                  }}
                />
                <Input
                  placeholder="Título"
                  value={item.title || ""}
                  onChange={(e) => {
                    const newItems = [...(block.items || [])];
                    newItems[itemIdx] = { ...newItems[itemIdx], title: e.target.value };
                    updateBlock(block.id, { items: newItems });
                  }}
                />
                <Input
                  placeholder="Descrição breve"
                  value={item.description || ""}
                  onChange={(e) => {
                    const newItems = [...(block.items || [])];
                    newItems[itemIdx] = { ...newItems[itemIdx], description: e.target.value };
                    updateBlock(block.id, { items: newItems });
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const newItems = (block.items || []).filter((_, idx) => idx !== itemIdx);
                    updateBlock(block.id, { items: newItems });
                  }}
                  className="p-2 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const newItems = [
                  ...(block.items || []),
                  {
                    icon: "✨",
                    title: "Novo item",
                    description: "Descrição",
                  },
                ];
                updateBlock(block.id, { items: newItems });
              }}
              className="text-xs text-brand font-medium hover:underline mt-2 inline-block"
            >
              + Adicionar Item
            </button>
          </div>
        </div>
      );

    case "cta":
      return (
        <div className="space-y-4">
          <Field label="Título de Impacto (Headline)">
            <Input
              value={block.title || ""}
              onChange={(e) => updateBlock(block.id, { title: e.target.value })}
            />
          </Field>
          <Field label="Subtítulo">
            <Input
              value={block.subtitle || ""}
              onChange={(e) => updateBlock(block.id, { subtitle: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Botão (Label)">
              <Input
                value={block.button_label || ""}
                onChange={(e) => updateBlock(block.id, { button_label: e.target.value })}
              />
            </Field>
            <Field label="Botão (Link)">
              <Input
                value={block.button_link || ""}
                onChange={(e) => updateBlock(block.id, { button_link: e.target.value })}
              />
            </Field>
          </div>
        </div>
      );

    case "faq":
      return (
        <div className="space-y-4">
          <Field label="Título Principal">
            <Input
              value={block.title || ""}
              onChange={(e) => updateBlock(block.id, { title: e.target.value })}
            />
          </Field>
          <div className="space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Perguntas e Respostas
            </label>
            {(block.items || []).map((item, itemIdx) => (
              <div
                key={itemIdx}
                className="flex gap-2 items-start border border-border p-3 rounded-lg bg-surface"
              >
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Pergunta"
                    className="font-medium"
                    value={item.question || ""}
                    onChange={(e) => {
                      const newItems = [...(block.items || [])];
                      newItems[itemIdx] = { ...newItems[itemIdx], question: e.target.value };
                      updateBlock(block.id, { items: newItems });
                    }}
                  />
                  <Textarea
                    placeholder="Resposta"
                    rows={2}
                    value={item.answer || ""}
                    onChange={(e) => {
                      const newItems = [...(block.items || [])];
                      newItems[itemIdx] = { ...newItems[itemIdx], answer: e.target.value };
                      updateBlock(block.id, { items: newItems });
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newItems = (block.items || []).filter((_, idx) => idx !== itemIdx);
                    updateBlock(block.id, { items: newItems });
                  }}
                  className="p-2 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const newItems = [
                  ...(block.items || []),
                  { question: "Nova Pergunta?", answer: "Sua resposta aqui" },
                ];
                updateBlock(block.id, { items: newItems });
              }}
              className="text-xs text-brand font-medium hover:underline mt-2 inline-block"
            >
              + Adicionar Pergunta
            </button>
          </div>
        </div>
      );

    // ── TESTIMONIALS ──────────────────────────────────────────────
    case "testimonials":
      return (
        <div className="space-y-4">
          <Field label="Título da seção">
            <Input
              value={block.title || ""}
              onChange={(e) => updateBlock(block.id, { title: e.target.value })}
            />
          </Field>
          <div className="space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Depoimentos
            </label>
            {(block.items || []).map((item: any, idx: number) => (
              <div key={idx} className="border border-border rounded-lg p-3 space-y-2 bg-surface">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Nome do cliente"
                    value={item.author || ""}
                    onChange={(e) => {
                      const arr = [...(block.items || [])];
                      arr[idx] = { ...arr[idx], author: e.target.value };
                      updateBlock(block.id, { items: arr });
                    }}
                  />
                  <Input
                    placeholder="Cargo / Contexto (ex: Viagem em família)"
                    value={item.role || ""}
                    onChange={(e) => {
                      const arr = [...(block.items || [])];
                      arr[idx] = { ...arr[idx], role: e.target.value };
                      updateBlock(block.id, { items: arr });
                    }}
                  />
                </div>
                <Textarea
                  placeholder="Depoimento..."
                  rows={2}
                  value={item.text || ""}
                  onChange={(e) => {
                    const arr = [...(block.items || [])];
                    arr[idx] = { ...arr[idx], text: e.target.value };
                    updateBlock(block.id, { items: arr });
                  }}
                />
                <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                  <Input
                    placeholder="URL da foto do cliente (opcional)"
                    value={item.avatar_url || ""}
                    onChange={(e) => {
                      const arr = [...(block.items || [])];
                      arr[idx] = { ...arr[idx], avatar_url: e.target.value };
                      updateBlock(block.id, { items: arr });
                    }}
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Estrelas:</span>
                    <Select
                      value={String(item.stars || 5)}
                      onChange={(e) => {
                        const arr = [...(block.items || [])];
                        arr[idx] = { ...arr[idx], stars: Number(e.target.value) };
                        updateBlock(block.id, { items: arr });
                      }}
                    >
                      {[5, 4, 3, 2, 1].map((s) => (
                        <option key={s} value={s}>
                          {s}★
                        </option>
                      ))}
                    </Select>
                    <button
                      type="button"
                      onClick={() =>
                        updateBlock(block.id, {
                          items: (block.items || []).filter((_: any, i: number) => i !== idx),
                        })
                      }
                      className="p-1.5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                updateBlock(block.id, {
                  items: [
                    ...(block.items || []),
                    {
                      author: "Nome do Cliente",
                      role: "",
                      text: "Depoimento aqui...",
                      avatar_url: "",
                      stars: 5,
                    },
                  ],
                })
              }
              className="text-xs text-brand font-medium hover:underline"
            >
              + Adicionar depoimento
            </button>
          </div>
        </div>
      );

    // ── TOURS GRID ────────────────────────────────────────────────
    case "tours_grid":
      return (
        <div className="space-y-4">
          <Field label="Título da seção">
            <Input
              value={block.title || ""}
              onChange={(e) => updateBlock(block.id, { title: e.target.value })}
            />
          </Field>
          <Field label="Subtítulo">
            <Input
              value={block.subtitle || ""}
              onChange={(e) => updateBlock(block.id, { subtitle: e.target.value })}
            />
          </Field>
          <Field
            label="Máximo de roteiros exibidos"
            hint="Os roteiros publicados mais próximos serão exibidos automaticamente"
          >
            <Select
              value={String(block.max_items || 6)}
              onChange={(e) => updateBlock(block.id, { max_items: Number(e.target.value) })}
            >
              {[3, 4, 6, 8, 12].map((n) => (
                <option key={n} value={n}>
                  {n} roteiros
                </option>
              ))}
            </Select>
          </Field>
          <p className="text-[10px] text-muted-foreground">
            Os roteiros são buscados automaticamente. Gerencie-os em{" "}
            <strong>Roteiros em Grupo</strong>.
          </p>
        </div>
      );

    // ── STATS ─────────────────────────────────────────────────────
    case "stats":
      return (
        <div className="space-y-4">
          <Field label="Título da seção">
            <Input
              value={block.title || ""}
              onChange={(e) => updateBlock(block.id, { title: e.target.value })}
            />
          </Field>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Números em destaque
            </label>
            {(block.items || []).map((item: any, idx: number) => (
              <div
                key={idx}
                className="grid grid-cols-[auto_1fr_2fr_auto] gap-2 items-center border border-border rounded-lg p-2 bg-surface"
              >
                <Input
                  className="w-12 text-center px-1"
                  placeholder="🌍"
                  value={item.icon || ""}
                  onChange={(e) => {
                    const arr = [...(block.items || [])];
                    arr[idx] = { ...arr[idx], icon: e.target.value };
                    updateBlock(block.id, { items: arr });
                  }}
                />
                <Input
                  placeholder="500+"
                  value={item.value || ""}
                  onChange={(e) => {
                    const arr = [...(block.items || [])];
                    arr[idx] = { ...arr[idx], value: e.target.value };
                    updateBlock(block.id, { items: arr });
                  }}
                />
                <Input
                  placeholder="Viagens realizadas"
                  value={item.label || ""}
                  onChange={(e) => {
                    const arr = [...(block.items || [])];
                    arr[idx] = { ...arr[idx], label: e.target.value };
                    updateBlock(block.id, { items: arr });
                  }}
                />
                <button
                  type="button"
                  onClick={() =>
                    updateBlock(block.id, {
                      items: (block.items || []).filter((_: any, i: number) => i !== idx),
                    })
                  }
                  className="p-1.5 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                updateBlock(block.id, {
                  items: [
                    ...(block.items || []),
                    { icon: "📊", value: "0+", label: "Novo número" },
                  ],
                })
              }
              className="text-xs text-brand font-medium hover:underline"
            >
              + Adicionar número
            </button>
          </div>
        </div>
      );

    // ── VIDEO ─────────────────────────────────────────────────────
    case "video":
      return (
        <div className="space-y-4">
          <Field label="Título da seção">
            <Input
              value={block.title || ""}
              onChange={(e) => updateBlock(block.id, { title: e.target.value })}
            />
          </Field>
          <Field
            label="URL do vídeo (embed)"
            hint="Use a URL de incorporação do YouTube (youtube.com/embed/ID) ou Vimeo"
          >
            <Input
              value={block.url || ""}
              onChange={(e) => updateBlock(block.id, { url: e.target.value })}
              placeholder="https://www.youtube.com/embed/dQw4w9WgXcQ"
            />
          </Field>
          <Field label="Legenda do vídeo (opcional)">
            <Input
              value={block.caption || ""}
              onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
            />
          </Field>
        </div>
      );

    // ── MAP ───────────────────────────────────────────────────────
    case "map":
      return (
        <div className="space-y-4">
          <Field label="Título da seção">
            <Input
              value={block.title || ""}
              onChange={(e) => updateBlock(block.id, { title: e.target.value })}
            />
          </Field>
          <Field
            label="URL de embed do Google Maps"
            hint="No Google Maps: Compartilhar > Incorporar um mapa > Copiar o src do iframe"
          >
            <Input
              value={block.embed_url || ""}
              onChange={(e) => updateBlock(block.id, { embed_url: e.target.value })}
              placeholder="https://www.google.com/maps/embed?pb=..."
            />
          </Field>
          <Field label="Endereço por extenso (texto abaixo do mapa)">
            <Input
              value={block.address_label || ""}
              onChange={(e) => updateBlock(block.id, { address_label: e.target.value })}
              placeholder="Rua das Flores, 100 — Chapecó/SC"
            />
          </Field>
        </div>
      );

    // ── BLOG FEED ─────────────────────────────────────────────────
    case "blog_feed":
      return (
        <div className="space-y-4">
          <Field label="Título da seção">
            <Input
              value={block.title || ""}
              onChange={(e) => updateBlock(block.id, { title: e.target.value })}
            />
          </Field>
          <Field
            label="Quantidade de posts exibidos"
            hint="Os posts mais recentes publicados serão buscados automaticamente"
          >
            <Select
              value={String(block.max_items || 3)}
              onChange={(e) => updateBlock(block.id, { max_items: Number(e.target.value) })}
            >
              {[3, 4, 6].map((n) => (
                <option key={n} value={n}>
                  {n} posts
                </option>
              ))}
            </Select>
          </Field>
          <p className="text-[10px] text-muted-foreground">
            Os posts são buscados automaticamente. Gerencie-os em <strong>Portal &gt; Blog</strong>.
          </p>
        </div>
      );

    // ── BIOLINK HEADER ────────────────────────────────────────────
    case "biolink_header":
      return (
        <div className="space-y-4">
          <FileUploader
            label="Foto de Perfil (Avatar)"
            value={block.avatar_url || ""}
            onChange={(url) => updateBlock(block.id, { avatar_url: url ?? "" })}
            bucket="agency-logos"
            folder={`${agencyId}/biolinks`}
            variant="image"
            publicBucket={true}
          />
          <Field label="Nome da Agência ou Perfil">
            <Input
              value={block.name || ""}
              onChange={(e) => updateBlock(block.id, { name: e.target.value })}
            />
          </Field>
          <Field label="Bio curta (Descrição)">
            <Textarea
              value={block.bio || ""}
              onChange={(e) => updateBlock(block.id, { bio: e.target.value })}
              rows={2}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Cor de Fundo">
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  className="w-8 h-8 rounded cursor-pointer"
                  value={block.bg_color || "#1E293B"}
                  onChange={(e) => updateBlock(block.id, { bg_color: e.target.value })}
                />
                <Input
                  value={block.bg_color || "#1E293B"}
                  onChange={(e) => updateBlock(block.id, { bg_color: e.target.value })}
                />
              </div>
            </Field>
            <Field label="Cor do Texto">
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  className="w-8 h-8 rounded cursor-pointer"
                  value={block.text_color || "#FFFFFF"}
                  onChange={(e) => updateBlock(block.id, { text_color: e.target.value })}
                />
                <Input
                  value={block.text_color || "#FFFFFF"}
                  onChange={(e) => updateBlock(block.id, { text_color: e.target.value })}
                />
              </div>
            </Field>
          </div>
        </div>
      );

    // ── BIOLINK LINKS ─────────────────────────────────────────────
    case "biolink_links":
      return (
        <div className="space-y-4">
          <label className="text-xs font-semibold text-muted-foreground uppercase">
            Links do Biolink
          </label>
          {(block.items || []).map((item: any, idx: number) => (
            <div key={idx} className="border border-border rounded-lg p-3 space-y-2 bg-surface">
              <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-center">
                <Input
                  className="w-12 text-center px-1"
                  placeholder="💬"
                  value={item.icon || ""}
                  onChange={(e) => {
                    const arr = [...(block.items || [])];
                    arr[idx] = { ...arr[idx], icon: e.target.value };
                    updateBlock(block.id, { items: arr });
                  }}
                />
                <Input
                  placeholder="Título do Botão"
                  value={item.title || ""}
                  onChange={(e) => {
                    const arr = [...(block.items || [])];
                    arr[idx] = { ...arr[idx], title: e.target.value };
                    updateBlock(block.id, { items: arr });
                  }}
                />
                <button
                  type="button"
                  onClick={() =>
                    updateBlock(block.id, {
                      items: (block.items || []).filter((_: any, i: number) => i !== idx),
                    })
                  }
                  className="p-1.5 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2 items-center mt-2">
                <Input
                  className="flex-1 text-sm"
                  placeholder="URL do link"
                  value={item.url || ""}
                  onChange={(e) => {
                    const arr = [...(block.items || [])];
                    arr[idx] = { ...arr[idx], url: e.target.value };
                    updateBlock(block.id, { items: arr });
                  }}
                />
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={item.highlight || false}
                    onChange={(e) => {
                      const arr = [...(block.items || [])];
                      arr[idx] = { ...arr[idx], highlight: e.target.checked };
                      updateBlock(block.id, { items: arr });
                    }}
                  />
                  Destaque
                </label>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              updateBlock(block.id, {
                items: [
                  ...(block.items || []),
                  { icon: "🔗", title: "Novo Link", url: "", highlight: false },
                ],
              })
            }
            className="text-xs text-brand font-medium hover:underline"
          >
            + Adicionar link
          </button>
        </div>
      );

    default:
      return null;
  }
}
