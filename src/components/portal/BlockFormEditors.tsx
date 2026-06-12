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
            Este bloco puxará automaticamente as redes sociais e o
            formulário de lead da agência no portal público.
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
                    const newItems = (block.items || []).filter(
                      (_, idx) => idx !== itemIdx,
                    );
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
                    const newItems = (block.items || []).filter(
                      (_, idx) => idx !== itemIdx,
                    );
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

    default:
      return null;
  }
}
