import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { FileUploader } from "@/components/uploads/FileUploader";
import { MultiFileUploader } from "@/components/uploads/MultiFileUploader";
import { type PortalBlock } from "@/lib/cms-types";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  block: PortalBlock;
  updateBlock: (id: string, patch: Partial<PortalBlock>) => void;
  agencyId: string;
};

export function BlockFormEditor({ block, updateBlock, agencyId }: Props) {
  const renderForm = () => {
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
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Conteúdo (Texto Rico)</label>
              <RichTextEditor
                value={block.content || ""}
                onChange={(html) => updateBlock(block.id, { content: html })}
              />
            </div>
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
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Texto de introdução</label>
              <RichTextEditor
                value={block.text || ""}
                onChange={(html) => updateBlock(block.id, { text: html })}
              />
            </div>
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
                    <RichTextEditor
                      value={item.answer || ""}
                      onChange={(html) => {
                        const newItems = [...(block.items || [])];
                        newItems[itemIdx] = { ...newItems[itemIdx], answer: html };
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
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Bio (Descrição)</label>
              <RichTextEditor
                value={block.bio || ""}
                onChange={(html) => updateBlock(block.id, { bio: html })}
              />
            </div>
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

      case "biolink_links":
        return (
          <div className="space-y-4">
            <div className="flex gap-4">
              <Field label="Estilo do Botão">
                <Select
                  value={block.button_style || "solid"}
                  onChange={(e) => updateBlock(block.id, { button_style: e.target.value })}
                >
                  <option value="solid">Sólido (Preenchido)</option>
                  <option value="outline">Contorno (Outline)</option>
                  <option value="soft">Suave (Soft)</option>
                </Select>
              </Field>
              <Field label="Arredondamento">
                <Select
                  value={block.button_rounded || "full"}
                  onChange={(e) => updateBlock(block.id, { button_rounded: e.target.value })}
                >
                  <option value="none">Quadrado</option>
                  <option value="md">Arredondado</option>
                  <option value="full">Pílula</option>
                </Select>
              </Field>
            </div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mt-4 block">
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

      case "group_tour_details":
        return <GroupTourDetailsEditor block={block} updateBlock={updateBlock} agencyId={agencyId} />;

      case "support_ticket_form":
        return (
          <>
            <Field label="Título do Formulário">
              <Input
                value={(block as any).title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Ex: Como podemos ajudar?"
              />
            </Field>
            <Field label="Subtítulo">
              <Input
                value={(block as any).subtitle || ""}
                onChange={(e) => updateBlock(block.id, { subtitle: e.target.value })}
                placeholder="Ex: Abra um chamado e nossa equipe..."
              />
            </Field>
          </>
        );

      case "client_portal_access":
        return (
          <>
            <Field label="Título">
              <Input
                value={(block as any).title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Ex: Área do Passageiro"
              />
            </Field>
            <Field label="Descrição">
              <Textarea
                value={(block as any).description || ""}
                onChange={(e) => updateBlock(block.id, { description: e.target.value })}
                placeholder="Ex: Acesse seus vouchers, passagens aéreas e guias..."
                rows={3}
              />
            </Field>
            <Field label="Label do Botão">
              <Input
                value={(block as any).button_label || ""}
                onChange={(e) => updateBlock(block.id, { button_label: e.target.value })}
                placeholder="Ex: Acessar Painel"
              />
            </Field>
          </>
        );

      case "pending_contracts_widget":
        return (
          <>
            <Field label="Título">
              <Input
                value={(block as any).title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Ex: Contratos Pendentes"
              />
            </Field>
            <Field label="Descrição">
              <Textarea
                value={(block as any).description || ""}
                onChange={(e) => updateBlock(block.id, { description: e.target.value })}
                placeholder="Ex: Você possui termos ou contratos aguardando sua assinatura..."
                rows={3}
              />
            </Field>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {renderForm()}
      <SectionStyleEditor block={block} updateBlock={updateBlock} agencyId={agencyId} />
    </div>
  );
}

// ─── Sub-Editors ─────────────────────────────────────────────────────────────

function GroupTourDetailsEditor({ block, updateBlock, agencyId }: Props) {
  const [tours, setTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("group_tours")
        .select("id, title, destination")
        .eq("agency_id", agencyId)
        .in("status", ["open", "confirmed"]);
      setTours(data || []);
      setLoading(false);
    }
    load();
  }, [agencyId]);

  return (
    <div className="space-y-4">
      <Field
        label="Selecionar Viagem em Grupo"
        hint="Exibirá os detalhes da viagem selecionada de forma dinâmica"
      >
        {loading ? (
          <div className="text-xs text-muted-foreground">Carregando viagens...</div>
        ) : tours.length === 0 ? (
          <div className="text-xs text-destructive font-medium">
            Nenhuma viagem em grupo aberta ou confirmada encontrada. Torne uma excursão como Aberta ou Confirmada no painel administrativo para poder selecioná-la.
          </div>
        ) : (
          <Select
            value={(block as any).tour_id || ""}
            onChange={(e) => updateBlock(block.id, { tour_id: e.target.value })}
          >
            <option value="">Selecione uma viagem...</option>
            {tours.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.destination})
              </option>
            ))}
          </Select>
        )}
      </Field>
    </div>
  );
}

function SectionStyleEditor({ block, updateBlock, agencyId }: Props) {
  const [brandColor, setBrandColor] = useState<string | null>(null);
  const [brandColorLight, setBrandColorLight] = useState<string | null>(null);
  const [brandOriginalFg, setBrandOriginalFg] = useState<string | null>(null);

  useEffect(() => {
    if (!agencyId) return;
    async function fetchBrand() {
      try {
        const { data } = await supabase
          .from("agencies")
          .select("brand_color, brand_color_light, brand_color_fg")
          .eq("id", agencyId)
          .maybeSingle();
        if (data) {
          setBrandColor(data.brand_color);
          setBrandColorLight(data.brand_color_light);
          setBrandOriginalFg(data.brand_color_fg);
        }
      } catch (e) {
        console.error("Error fetching agency brand colors:", e);
      }
    }
    fetchBrand();
  }, [agencyId]);

  const styles = (block as any).styles || {
    bg_type: "default",
    padding_y: "md",
    border_radius: "none",
  };

  const updateStyle = (patch: Partial<any>) => {
    updateBlock(block.id, {
      styles: {
        ...styles,
        ...patch,
      },
    } as any);
  };

  return (
    <div className="pt-6 border-t border-border space-y-4">
      <label className="text-xs font-semibold text-muted-foreground uppercase">
        Estilo da Seção (Visual)
      </label>
      
      <div className="grid grid-cols-2 gap-3">
        <Field label="Espaçamento (Vertical)">
          <Select
            value={styles.padding_y || "md"}
            onChange={(e) => updateStyle({ padding_y: e.target.value })}
          >
            <option value="none">Nenhum</option>
            <option value="sm">Pequeno (sm)</option>
            <option value="md">Médio (md)</option>
            <option value="lg">Grande (lg)</option>
          </Select>
        </Field>
        
        <Field label="Cantos Arredondados">
          <Select
            value={styles.border_radius || "none"}
            onChange={(e) => updateStyle({ border_radius: e.target.value })}
          >
            <option value="none">Quadrado (none)</option>
            <option value="md">Suave (md)</option>
            <option value="lg">Arredondado (lg)</option>
            <option value="full">Pílula (full)</option>
          </Select>
        </Field>
      </div>

      <Field label="Tipo de Fundo">
        <Select
          value={styles.bg_type || "default"}
          onChange={(e) => updateStyle({ bg_type: e.target.value })}
        >
          <option value="default">Padrão da Página</option>
          <option value="color">Cor Sólida</option>
          <option value="gradient">Gradiente CSS</option>
          <option value="image">Imagem de Fundo</option>
        </Select>
      </Field>

      {styles.bg_type === "color" && (
        <Field label="Cor de Fundo">
          <div className="flex gap-2 items-center">
            <input
              type="color"
              className="w-8 h-8 rounded cursor-pointer border border-border"
              value={styles.bg_color || "#ffffff"}
              onChange={(e) => updateStyle({ bg_color: e.target.value })}
            />
            <Input
              value={styles.bg_color || ""}
              onChange={(e) => updateStyle({ bg_color: e.target.value })}
              placeholder="#ffffff ou rgb(...)"
            />
          </div>
          {(brandColor || brandColorLight) && (
            <div className="flex gap-2 items-center mt-2 bg-surface-alt/40 p-2 rounded-lg border border-border/40">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Cores da Agência:</span>
              {brandColor && (
                <button
                  type="button"
                  onClick={() => updateStyle({ bg_color: brandColor })}
                  className="w-5 h-5 rounded-full border border-border cursor-pointer shadow-sm hover:scale-110 active:scale-95 transition-transform"
                  style={{ backgroundColor: brandColor }}
                  title={`Cor Principal: ${brandColor}`}
                />
              )}
              {brandColorLight && (
                <button
                  type="button"
                  onClick={() => updateStyle({ bg_color: brandColorLight })}
                  className="w-5 h-5 rounded-full border border-border cursor-pointer shadow-sm hover:scale-110 active:scale-95 transition-transform"
                  style={{ backgroundColor: brandColorLight }}
                  title={`Cor Suave: ${brandColorLight}`}
                />
              )}
            </div>
          )}
        </Field>
      )}

      {styles.bg_type === "gradient" && (
        <Field label="Gradiente CSS" hint="Insira um gradiente CSS válido">
          <Input
            value={styles.bg_gradient || ""}
            onChange={(e) => updateStyle({ bg_gradient: e.target.value })}
            placeholder="linear-gradient(to right, #1e3a8a, #3b82f6)"
          />
        </Field>
      )}

      {styles.bg_type === "image" && (
        <FileUploader
          label="Imagem de Fundo"
          value={styles.bg_image_url || ""}
          onChange={(url) => updateStyle({ bg_image_url: url ?? "" })}
          bucket="agency-logos"
          folder={`${agencyId}/pages/bg`}
          variant="image"
          publicBucket={true}
        />
      )}

      {styles.bg_type !== "default" && (
        <Field label="Cor do Texto" hint="Ajuste para garantir legibilidade">
          <div className="flex gap-2 items-center">
            <input
              type="color"
              className="w-8 h-8 rounded cursor-pointer border border-border"
              value={styles.text_color || "#000000"}
              onChange={(e) => updateStyle({ text_color: e.target.value })}
            />
            <Input
              value={styles.text_color || ""}
              onChange={(e) => updateStyle({ text_color: e.target.value })}
              placeholder="#000000"
            />
          </div>
          {(brandColor || brandOriginalFg) && (
            <div className="flex gap-2 items-center mt-2 bg-surface-alt/40 p-2 rounded-lg border border-border/40">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Presets de Contraste:</span>
              {brandOriginalFg && (
                <button
                  type="button"
                  onClick={() => updateStyle({ text_color: brandOriginalFg })}
                  className="w-5 h-5 rounded-full border border-border cursor-pointer shadow-sm hover:scale-110 active:scale-95 transition-transform"
                  style={{ backgroundColor: brandOriginalFg }}
                  title={`Texto da Marca: ${brandOriginalFg}`}
                />
              )}
              {brandColor && (
                <button
                  type="button"
                  onClick={() => updateStyle({ text_color: brandColor })}
                  className="w-5 h-5 rounded-full border border-border cursor-pointer shadow-sm hover:scale-110 active:scale-95 transition-transform"
                  style={{ backgroundColor: brandColor }}
                  title={`Principal da Marca: ${brandColor}`}
                />
              )}
              <button
                type="button"
                onClick={() => updateStyle({ text_color: "#ffffff" })}
                className="w-5 h-5 rounded-full border border-border cursor-pointer shadow-sm hover:scale-110 active:scale-95 transition-transform bg-white"
                title="Branco: #ffffff"
              />
              <button
                type="button"
                onClick={() => updateStyle({ text_color: "#0f172a" })}
                className="w-5 h-5 rounded-full border border-border cursor-pointer shadow-sm hover:scale-110 active:scale-95 transition-transform bg-slate-900"
                title="Escuro: #0f172a"
              />
            </div>
          )}
        </Field>
      )}
    </div>
  );
}
