import { useState, useEffect } from "react";
import { SECTION_REGISTRY } from "@/lib/sections/registry";
import {
  Trash2,
  Plane,
  ShieldCheck,
  Hotel,
  Users,
  Leaf,
  Award,
  Heart,
  Globe,
  MessageSquare,
  Briefcase,
  Crown,
  Key,
  Star,
  MapPin,
  Compass,
  Ticket,
  Gift,
  Phone,
  Mail,
  CreditCard,
  Clock,
  DollarSign,
  HelpCircle,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { Field } from "@/components/ui/field";
import { FormInput as Input } from "@/components/ui/input";
import { NativeSelect as Select } from "@/components/ui/select";
import { FormTextarea as Textarea } from "@/components/ui/textarea";
import { FileUploader } from "@/components/uploads/FileUploader";
import { MultiFileUploader } from "@/components/uploads/MultiFileUploader";
import { type PortalBlock, type LegacyPortalBlock } from "@/lib/cms-types";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  block: PortalBlock;
  updateBlock: (id: string, patch: Partial<PortalBlock>) => void;
  agencyId: string;
};

// ─── ICON PICKER ─────────────────────────────────────────────────────────────
const ICON_OPTIONS: { key: string; label: string; Component: React.ComponentType<any> }[] = [
  { key: "flight", label: "Avião", Component: Plane },
  { key: "safe", label: "Segurança", Component: ShieldCheck },
  { key: "hotel", label: "Hotel", Component: Hotel },
  { key: "clients", label: "Clientes", Component: Users },
  { key: "eco", label: "Natureza", Component: Leaf },
  { key: "award", label: "Prêmio", Component: Award },
  { key: "care", label: "Cuidado", Component: Heart },
  { key: "world", label: "Mundo", Component: Globe },
  { key: "chat", label: "Chat", Component: MessageSquare },
  { key: "pack", label: "Mala", Component: Briefcase },
  { key: "vip", label: "VIP", Component: Crown },
  { key: "key", label: "Chave", Component: Key },
  { key: "star", label: "Estrela", Component: Star },
  { key: "map", label: "Mapa", Component: MapPin },
  { key: "trip", label: "Bússola", Component: Compass },
  { key: "ticket", label: "Ingresso", Component: Ticket },
  { key: "gift", label: "Presente", Component: Gift },
  { key: "phone", label: "Telefone", Component: Phone },
  { key: "mail", label: "E-mail", Component: Mail },
  { key: "card", label: "Pagamento", Component: CreditCard },
  { key: "clock", label: "Tempo", Component: Clock },
  { key: "dollar", label: "Financeiro", Component: DollarSign },
  { key: "faq", label: "Ajuda", Component: HelpCircle },
  { key: "lux", label: "Premium", Component: Sparkles },
];

function IconPicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  const [open, setOpen] = useState(false);
  const current = ICON_OPTIONS.find((o) => o.key === value.toLowerCase());
  const CurrentIcon = current?.Component;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 h-9 px-3 rounded-2xl border border-border bg-surface-alt text-xs font-medium hover:border-brand/60 transition-colors w-full"
      >
        {CurrentIcon ? (
          <CurrentIcon className="w-4 h-4 text-brand shrink-0" />
        ) : (
          <span className="w-4 h-4" />
        )}
        <span className="flex-1 text-left truncate">
          {current?.label || value || "Selecionar ícone"}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-50 top-10 left-0 w-64 p-3 rounded-3xl border border-border bg-surface shadow-none">
          <div className="grid grid-cols-6 gap-1.5">
            {ICON_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                title={opt.label}
                onClick={() => {
                  onChange(opt.key);
                  setOpen(false);
                }}
                className={`flex flex-col items-center justify-center gap-1 p-2 rounded-2xl border text-[9px] font-medium transition-all hover:border-brand hover:bg-brand/10 ${
                  value === opt.key
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-transparent bg-surface-alt text-muted-foreground"
                }`}
              >
                <opt.Component className="w-4 h-4" />
                <span className="leading-tight text-center">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GroupTourSelector({
  agencyId,
  selectedTourId,
  onChange,
}: {
  agencyId: string;
  selectedTourId: string;
  onChange: (tourId: string) => void;
}) {
  const [tours, setTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!agencyId) return;
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
    <Field
      label="Vincular a Viagem/Pacote"
      hint="Selecione um pacote para disponibilizar os campos dinâmicos"
    >
      {loading ? (
        <div className="text-xs text-muted-foreground animate-pulse">Carregando viagens...</div>
      ) : tours.length === 0 ? (
        <div className="text-xs text-muted-foreground">
          Nenhuma viagem aberta/confirmada ativa para vincular.
        </div>
      ) : (
        <Select value={selectedTourId} onChange={(e) => onChange(e.target.value)}>
          <option value="">Nenhum (Manter manual/estático)</option>
          {tours.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title} ({t.destination})
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

export function BlockFormEditor({ block: blockItem, updateBlock, agencyId }: Props) {
  const block = blockItem as LegacyPortalBlock;
  const [activeTab, setActiveTab] = useState<
    "content" | "style" | "animation" | "responsive" | "bindings"
  >("content");
  const [brandColors, setBrandColors] = useState<{
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
    legacyMain?: string;
    legacyLight?: string;
    legacyFg?: string;
  }>({});

  useEffect(() => {
    if (!agencyId) return;
    async function loadColors() {
      try {
        const { data: agencyData } = await supabase
          .from("agencies")
          .select("brand_color, brand_color_light, brand_color_fg")
          .eq("id", agencyId)
          .maybeSingle();

        const { data: brandKitData } = await supabase
          .from("brand_kit")
          .select("primary_color, secondary_color, accent_color, background_color, text_color")
          .eq("agency_id", agencyId)
          .maybeSingle();

        setBrandColors({
          primary: brandKitData?.primary_color || undefined,
          secondary: brandKitData?.secondary_color || undefined,
          accent: brandKitData?.accent_color || undefined,
          background: brandKitData?.background_color || undefined,
          text: brandKitData?.text_color || undefined,
          legacyMain: agencyData?.brand_color || undefined,
          legacyLight: agencyData?.brand_color_light || undefined,
          legacyFg: agencyData?.brand_color_fg || undefined,
        });
      } catch (err) {
        console.error("Error loading brand colors", err);
      }
    }
    loadColors();
  }, [agencyId]);

  const blockStyles = (block as any).styles || {};
  const updateStyle = (patch: any) => {
    updateBlock(block.id, {
      styles: {
        ...blockStyles,
        ...patch,
      },
    } as any);
  };

  const blockAnimation = (block as any).animation || {
    enabled: false,
    type: "none",
    delay: 0,
    duration: 600,
    trigger: "onEnter",
  };
  const updateAnimation = (patch: any) => {
    updateBlock(block.id, {
      animation: {
        ...blockAnimation,
        ...patch,
      },
    } as any);
  };

  const blockResponsive = (block as any).responsive || {
    hideOnMobile: false,
    hideOnTablet: false,
  };
  const updateResponsive = (patch: any) => {
    updateBlock(block.id, {
      responsive: {
        ...blockResponsive,
        ...patch,
      },
    } as any);
  };

  const renderForm = () => {
    switch (block.type) {
      case "hero":
        return (
          <>
            <Field label="Layout do Banner">
              <Select
                value={block.layout || "centered"}
                onChange={(e) => updateBlock(block.id, { layout: e.target.value as any })}
              >
                <option value="centered">Centralizado (Padrão)</option>
                <option value="split">Dividido (Imagem ao lado)</option>
                <option value="minimal">Minimalista (Sem imagem)</option>
              </Select>
            </Field>
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
              Este bloco puxará automaticamente as redes sociais e o formulário de lead da agência
              no portal público.
            </p>
          </>
        );

      case "features":
        return (
          <div className="space-y-4">
            <Field label="Layout dos Diferenciais">
              <Select
                value={block.layout || "grid"}
                onChange={(e) => updateBlock(block.id, { layout: e.target.value as any })}
              >
                <option value="grid">Grade Simples (Grid)</option>
                <option value="cards">Cards Premium (Efeitos/Sombra)</option>
                <option value="list">Lista Compacta (List)</option>
              </Select>
            </Field>
            <Field label="Título da Seção">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Ex: Nossos diferenciais"
              />
            </Field>
            <div className="space-y-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Itens de Diferencial
              </label>
              {(block.items || []).map((item, itemIdx) => (
                <div
                  key={itemIdx}
                  className="border border-border rounded-3xl p-4 space-y-3 bg-surface shadow-none"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      Item #{itemIdx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newItems = (block.items || []).filter((_, idx) => idx !== itemIdx);
                        updateBlock(block.id, { items: newItems });
                      }}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <Field label="Ícone">
                    <IconPicker
                      value={item.icon || ""}
                      onChange={(key) => {
                        const newItems = [...(block.items || [])];
                        newItems[itemIdx] = { ...newItems[itemIdx], icon: key };
                        updateBlock(block.id, { items: newItems });
                      }}
                    />
                  </Field>
                  <Field label="Título do Diferencial">
                    <Input
                      placeholder="Ex: Destinos exclusivos"
                      value={item.title || ""}
                      onChange={(e) => {
                        const newItems = [...(block.items || [])];
                        newItems[itemIdx] = { ...newItems[itemIdx], title: e.target.value };
                        updateBlock(block.id, { items: newItems });
                      }}
                    />
                  </Field>
                  <Field label="Descrição">
                    <Textarea
                      placeholder="Descreva este diferencial brevemente..."
                      rows={2}
                      value={item.description || ""}
                      onChange={(e) => {
                        const newItems = [...(block.items || [])];
                        newItems[itemIdx] = { ...newItems[itemIdx], description: e.target.value };
                        updateBlock(block.id, { items: newItems });
                      }}
                    />
                  </Field>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const newItems = [
                    ...(block.items || []),
                    {
                      icon: "trip",
                      title: "Novo diferencial",
                      description: "Descreva este diferencial aqui.",
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
            <Field label="Layout das Perguntas">
              <Select
                value={block.layout || "accordion"}
                onChange={(e) => updateBlock(block.id, { layout: e.target.value as any })}
              >
                <option value="accordion">Acordeão (Retrátil)</option>
                <option value="grid">Grade Estática (Grid)</option>
              </Select>
            </Field>
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
                  className="flex gap-2 items-start border border-border p-3 rounded-2xl bg-surface"
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
            <Field label="Layout dos Depoimentos">
              <Select
                value={block.layout || "grid"}
                onChange={(e) => updateBlock(block.id, { layout: e.target.value as any })}
              >
                <option value="grid">Grade Simples (Grid)</option>
                <option value="bubble">Balões de Fala (Bubble)</option>
              </Select>
            </Field>
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
                <div key={idx} className="border border-border rounded-2xl p-3 space-y-2 bg-surface">
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
            <Field label="Layout dos Roteiros">
              <Select
                value={block.layout || "grid"}
                onChange={(e) => updateBlock(block.id, { layout: e.target.value as any })}
              >
                <option value="grid">Grade (Grid)</option>
                <option value="list">Lista (List)</option>
              </Select>
            </Field>
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
                  className="grid grid-cols-[auto_1fr_2fr_auto] gap-2 items-center border border-border rounded-2xl p-2 bg-surface"
                >
                  <Input
                    className="w-12 text-center px-1"
                    placeholder="Trips"
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
                      { icon: "Trips", value: "0+", label: "Novo número" },
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
              Os posts são buscados automaticamente. Gerencie-os em{" "}
              <strong>Portal &gt; Blog</strong>.
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
                  onChange={(e) => updateBlock(block.id, { button_style: e.target.value as any })}
                >
                  <option value="solid">Sólido (Preenchido)</option>
                  <option value="outline">Contorno (Outline)</option>
                  <option value="soft">Suave (Soft)</option>
                </Select>
              </Field>
              <Field label="Arredondamento">
                <Select
                  value={block.button_rounded || "full"}
                  onChange={(e) => updateBlock(block.id, { button_rounded: e.target.value as any })}
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
              <div key={idx} className="border border-border rounded-2xl p-3 space-y-2 bg-surface">
                <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-center">
                  <Input
                    className="w-12 text-center px-1"
                    placeholder="Chat"
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
                    { icon: "Chat", title: "Novo Link", url: "", highlight: false },
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
        return (
          <GroupTourDetailsEditor block={block} updateBlock={updateBlock} agencyId={agencyId} />
        );

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

      case "featured_destinations":
        return (
          <div className="space-y-4">
            <Field label="Título da Seção">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Ex: Destinos Recomendados"
              />
            </Field>
            <Field label="Subtítulo">
              <Input
                value={block.subtitle || ""}
                onChange={(e) => updateBlock(block.id, { subtitle: e.target.value })}
                placeholder="Ex: Explore os lugares mais cobiçados..."
              />
            </Field>
            <div className="space-y-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Lista de Destinos
              </label>
              {(block.items || []).map((item, idx) => (
                <div
                  key={idx}
                  className="border border-border rounded-3xl p-3 space-y-3 bg-surface shadow-none"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-border/40">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      Destino #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateBlock(block.id, {
                          items: (block.items || []).filter((_, i) => i !== idx),
                        })
                      }
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      title="Excluir Destino"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Destino">
                      <Input
                        placeholder="Paris, França"
                        value={item.destination || ""}
                        onChange={(e) => {
                          const arr = [...(block.items || [])];
                          arr[idx] = { ...arr[idx], destination: e.target.value };
                          updateBlock(block.id, { items: arr });
                        }}
                      />
                    </Field>
                    <Field label="Preço (Ex: R$ 4.500)">
                      <Input
                        placeholder="R$ 6.900"
                        value={item.price || ""}
                        onChange={(e) => {
                          const arr = [...(block.items || [])];
                          arr[idx] = { ...arr[idx], price: e.target.value };
                          updateBlock(block.id, { items: arr });
                        }}
                      />
                    </Field>
                  </div>
                  <Field label="Descrição Curta">
                    <Textarea
                      placeholder="Descrição breve do destino..."
                      rows={2}
                      value={item.description || ""}
                      onChange={(e) => {
                        const arr = [...(block.items || [])];
                        arr[idx] = { ...arr[idx], description: e.target.value };
                        updateBlock(block.id, { items: arr });
                      }}
                    />
                  </Field>
                  <Field label="Link de Destino (CTA)">
                    <Input
                      placeholder="Ex: #contato"
                      value={item.link || ""}
                      onChange={(e) => {
                        const arr = [...(block.items || [])];
                        arr[idx] = { ...arr[idx], link: e.target.value };
                        updateBlock(block.id, { items: arr });
                      }}
                    />
                  </Field>
                  <FileUploader
                    label="Imagem do Destino"
                    value={item.image_url || ""}
                    onChange={(url) => {
                      const arr = [...(block.items || [])];
                      arr[idx] = { ...arr[idx], image_url: url ?? "" };
                      updateBlock(block.id, { items: arr });
                    }}
                    bucket="agency-logos"
                    folder={`${agencyId}/destinations`}
                    variant="image"
                    publicBucket={true}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  updateBlock(block.id, {
                    items: [
                      ...(block.items || []),
                      {
                        destination: "Novo Destino",
                        price: "Sob consulta",
                        description: "Descrição breve do destino...",
                        image_url: "",
                        link: "#contato",
                      },
                    ],
                  })
                }
                className="text-xs text-brand font-medium hover:underline mt-2 inline-block"
              >
                + Adicionar Destino
              </button>
            </div>
          </div>
        );

      case "social_links":
        return (
          <div className="space-y-4">
            <Field label="Título Principal">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Ex: Siga-nos nas redes"
              />
            </Field>
            <Field label="Instagram (Link completo)">
              <Input
                value={block.instagram || ""}
                onChange={(e) => updateBlock(block.id, { instagram: e.target.value })}
                placeholder="https://instagram.com/sua_agencia"
              />
            </Field>
            <Field label="Facebook (Link completo)">
              <Input
                value={block.facebook || ""}
                onChange={(e) => updateBlock(block.id, { facebook: e.target.value })}
                placeholder="https://facebook.com/sua_agencia"
              />
            </Field>
            <Field label="YouTube (Link completo)">
              <Input
                value={block.youtube || ""}
                onChange={(e) => updateBlock(block.id, { youtube: e.target.value })}
                placeholder="https://youtube.com/c/sua_agencia"
              />
            </Field>
            <Field label="WhatsApp (Apenas número com DDD ou link)">
              <Input
                value={block.whatsapp || ""}
                onChange={(e) => updateBlock(block.id, { whatsapp: e.target.value })}
                placeholder="Ex: 5549999999999"
              />
            </Field>
            <Field label="LinkedIn (Link completo)">
              <Input
                value={block.linkedin || ""}
                onChange={(e) => updateBlock(block.id, { linkedin: e.target.value })}
                placeholder="https://linkedin.com/company/sua_agencia"
              />
            </Field>
          </div>
        );

      case "newsletter":
        return (
          <div className="space-y-4">
            <Field label="Título Principal">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Ex: Receba Nossas Ofertas Exclusivas"
              />
            </Field>
            <Field label="Subtítulo / Descrição">
              <Input
                value={block.subtitle || ""}
                onChange={(e) => updateBlock(block.id, { subtitle: e.target.value })}
                placeholder="Ex: Inscreva seu e-mail e seja o primeiro a saber..."
              />
            </Field>
            <Field label="Placeholder do Input">
              <Input
                value={block.placeholder || ""}
                onChange={(e) => updateBlock(block.id, { placeholder: e.target.value })}
                placeholder="Ex: Seu melhor e-mail"
              />
            </Field>
            <Field label="Texto do Botão">
              <Input
                value={block.button_label || ""}
                onChange={(e) => updateBlock(block.id, { button_label: e.target.value })}
                placeholder="Ex: Cadastrar"
              />
            </Field>
          </div>
        );

      case "tours_carousel":
        return (
          <div className="space-y-4">
            <Field label="Título Principal">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
              />
            </Field>
            <Field label="Subtítulo / Descrição">
              <Input
                value={block.subtitle || ""}
                onChange={(e) => updateBlock(block.id, { subtitle: e.target.value })}
              />
            </Field>
            <Field label="Máximo de Roteiros a exibir">
              <Input
                type="number"
                value={block.max_items || 8}
                onChange={(e) =>
                  updateBlock(block.id, { max_items: parseInt(e.target.value) || 8 })
                }
              />
            </Field>
          </div>
        );

      case "featured_destination_filter":
        return (
          <div className="space-y-4">
            <Field label="Título Principal">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
              />
            </Field>
            <Field label="Subtítulo / Descrição">
              <Input
                value={block.subtitle || ""}
                onChange={(e) => updateBlock(block.id, { subtitle: e.target.value })}
              />
            </Field>
          </div>
        );

      case "team_widget":
      case "live_reviews":
        return (
          <div className="space-y-4">
            <Field label="Título Principal">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
              />
            </Field>
            <Field label="Subtítulo / Descrição">
              <Input
                value={block.subtitle || ""}
                onChange={(e) => updateBlock(block.id, { subtitle: e.target.value })}
              />
            </Field>
          </div>
        );

      case "exchange_rates":
        return (
          <div className="space-y-4">
            <Field label="Título Principal">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
              />
            </Field>
          </div>
        );

      case "countdown_tour":
        return (
          <div className="space-y-4">
            <Field label="Título Principal">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Ex: Últimas vagas!"
              />
            </Field>
            <Field label="Subtítulo / Descrição">
              <Input
                value={block.subtitle || ""}
                onChange={(e) => updateBlock(block.id, { subtitle: e.target.value })}
                placeholder="Ex: Garanta seu lugar antes..."
              />
            </Field>
            <Field label="Label do Botão">
              <Input
                value={block.button_label || ""}
                onChange={(e) => updateBlock(block.id, { button_label: e.target.value })}
                placeholder="Ex: Quero Garantir Minha Vaga"
              />
            </Field>
            <GroupTourDetailsEditor block={block} updateBlock={updateBlock} agencyId={agencyId} />
          </div>
        );

      case "dynamic_map_route":
        return (
          <div className="space-y-4">
            <Field label="Título do Mapa">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Ex: Roteiro da Viagem no Mapa"
              />
            </Field>
            <GroupTourDetailsEditor block={block} updateBlock={updateBlock} agencyId={agencyId} />
          </div>
        );

      case "social_links_row":
        return (
          <div className="space-y-4">
            <Field label="WhatsApp (apenas números com DDD)">
              <Input
                value={(block as any).whatsapp || ""}
                onChange={(e) => updateBlock(block.id, { whatsapp: e.target.value })}
                placeholder="Ex: 5549999999999"
              />
            </Field>
            <Field label="Instagram (URL completa)">
              <Input
                value={(block as any).instagram || ""}
                onChange={(e) => updateBlock(block.id, { instagram: e.target.value })}
                placeholder="https://instagram.com/..."
              />
            </Field>
            <Field label="Facebook (URL completa)">
              <Input
                value={(block as any).facebook || ""}
                onChange={(e) => updateBlock(block.id, { facebook: e.target.value })}
                placeholder="https://facebook.com/..."
              />
            </Field>
            <Field label="YouTube (URL completa)">
              <Input
                value={(block as any).youtube || ""}
                onChange={(e) => updateBlock(block.id, { youtube: e.target.value })}
                placeholder="https://youtube.com/..."
              />
            </Field>
            <Field label="LinkedIn (URL completa)">
              <Input
                value={(block as any).linkedin || ""}
                onChange={(e) => updateBlock(block.id, { linkedin: e.target.value })}
                placeholder="https://linkedin.com/..."
              />
            </Field>
            <Field label="TikTok (URL completa)">
              <Input
                value={(block as any).tiktok || ""}
                onChange={(e) => updateBlock(block.id, { tiktok: e.target.value })}
                placeholder="https://tiktok.com/..."
              />
            </Field>
          </div>
        );

      case "whatsapp_departments":
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
                Canais de Atendimento
              </label>
              {((block as any).departments || []).map((dept: any, idx: number) => (
                <div
                  key={idx}
                  className="border border-border p-3 rounded-2xl bg-surface space-y-2 relative"
                >
                  <button
                    type="button"
                    onClick={() => {
                      const newDepts = ((block as any).departments || []).filter(
                        (_: any, i: number) => i !== idx,
                      );
                      updateBlock(block.id, { departments: newDepts });
                    }}
                    className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Nome do Setor">
                      <Input
                        value={dept.name || ""}
                        onChange={(e) => {
                          const newDepts = [...((block as any).departments || [])];
                          newDepts[idx] = { ...newDepts[idx], name: e.target.value };
                          updateBlock(block.id, { departments: newDepts });
                        }}
                        placeholder="Ex: Vendas"
                      />
                    </Field>
                    <Field label="WhatsApp (com DDI/DDD)">
                      <Input
                        value={dept.phone || ""}
                        onChange={(e) => {
                          const newDepts = [...((block as any).departments || [])];
                          newDepts[idx] = { ...newDepts[idx], phone: e.target.value };
                          updateBlock(block.id, { departments: newDepts });
                        }}
                        placeholder="5549999999999"
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Ícone Lucide">
                      <Input
                        value={dept.icon || "chat"}
                        onChange={(e) => {
                          const newDepts = [...((block as any).departments || [])];
                          newDepts[idx] = { ...newDepts[idx], icon: e.target.value };
                          updateBlock(block.id, { departments: newDepts });
                        }}
                        placeholder="chat, safe, key, star"
                      />
                    </Field>
                    <Field label="Mensagem Inicial (opcional)">
                      <Input
                        value={dept.message || ""}
                        onChange={(e) => {
                          const newDepts = [...((block as any).departments || [])];
                          newDepts[idx] = { ...newDepts[idx], message: e.target.value };
                          updateBlock(block.id, { departments: newDepts });
                        }}
                        placeholder="Olá, gostaria de..."
                      />
                    </Field>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const newDepts = [
                    ...((block as any).departments || []),
                    { name: "Novo Setor", phone: "5549999999999", icon: "chat", message: "" },
                  ];
                  updateBlock(block.id, { departments: newDepts });
                }}
                className="text-xs text-brand font-medium hover:underline mt-1 inline-block"
              >
                + Adicionar Canal
              </button>
            </div>
          </div>
        );

      case "agency_vouchers":
        return (
          <div className="space-y-4">
            <Field label="Título Principal">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Ex: Seus Vouchers de Viagem"
              />
            </Field>
          </div>
        );

      case "weather_forecast":
        return (
          <div className="space-y-4">
            <Field label="Título Principal">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Ex: Previsão do Tempo"
              />
            </Field>
            <Field
              label="Cidade Alternativa (opcional)"
              hint="Se vazio, usará o destino da excursão"
            >
              <Input
                value={(block as any).city || ""}
                onChange={(e) => updateBlock(block.id, { city: e.target.value })}
                placeholder="Ex: Chapada Diamantina, BA"
              />
            </Field>
            <GroupTourDetailsEditor block={block} updateBlock={updateBlock} agencyId={agencyId} />
          </div>
        );

      case "itinerary_timeline":
        return (
          <div className="space-y-4">
            <Field label="Título Principal">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Ex: Como será a sua jornada?"
              />
            </Field>
            <GroupTourDetailsEditor block={block} updateBlock={updateBlock} agencyId={agencyId} />
          </div>
        );

      case "lead_capture_callback":
        return (
          <div className="space-y-4">
            <Field label="Título Principal">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Ex: Queremos te ligar!"
              />
            </Field>
            <Field label="Subtítulo / Descrição">
              <Input
                value={(block as any).subtitle || ""}
                onChange={(e) => updateBlock(block.id, { subtitle: e.target.value })}
                placeholder="Ex: Deixe seu telefone..."
              />
            </Field>
          </div>
        );

      case "promotional_banner":
        return (
          <div className="space-y-4">
            <Field label="Texto do Banner">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Ex: Cupom de desconto ativo!"
              />
            </Field>
            <Field label="Código do Cupom">
              <Input
                value={(block as any).discount_code || ""}
                onChange={(e) => updateBlock(block.id, { discount_code: e.target.value })}
                placeholder="Ex: EURO500"
              />
            </Field>
            <Field label="Data de Expiração (opcional)">
              <Input
                type="date"
                value={(block as any).expiration_date || ""}
                onChange={(e) => updateBlock(block.id, { expiration_date: e.target.value })}
              />
            </Field>
          </div>
        );

      case "payment_gateways_display":
        return (
          <div className="space-y-4">
            <Field label="Título Principal">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Ex: Opções de Pagamento Facilitado"
              />
            </Field>
          </div>
        );

      case "agent_profile_card":
        return (
          <div className="space-y-4">
            <Field label="Label do Botão">
              <Input
                value={(block as any).cta_label || ""}
                onChange={(e) => updateBlock(block.id, { cta_label: e.target.value })}
                placeholder="Ex: Falar com Consultor"
              />
            </Field>
            <AgentSelectEditor block={block} updateBlock={updateBlock} agencyId={agencyId} />
          </div>
        );

      case "travel_tips_faq":
        return (
          <div className="space-y-4">
            <Field label="Categoria de Dicas (opcional)">
              <Input
                value={(block as any).category || ""}
                onChange={(e) => updateBlock(block.id, { category: e.target.value })}
                placeholder="Ex: Bagagem, Vacinas, Geral"
              />
            </Field>
          </div>
        );

      case "live_tours_map":
        return (
          <div className="space-y-4">
            <Field label="Máximo de Rotas a exibir">
              <Input
                type="number"
                value={block.max_items || 4}
                onChange={(e) =>
                  updateBlock(block.id, { max_items: parseInt(e.target.value) || 4 })
                }
              />
            </Field>
          </div>
        );

      case "gift_cards_store":
        return (
          <div className="space-y-4">
            <Field label="Título Principal">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Ex: Dê Viagem de Presente"
              />
            </Field>
            <Field label="Subtítulo / Descrição">
              <Input
                value={(block as any).subtitle || ""}
                onChange={(e) => updateBlock(block.id, { subtitle: e.target.value })}
                placeholder="Ex: Adquira um vale-viagem..."
              />
            </Field>
          </div>
        );

      case "corporate_rfp_form":
        return (
          <div className="space-y-4">
            <Field label="Título Principal">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Ex: Solicitação de Viagem Corporativa (RFP)"
              />
            </Field>
            <Field label="Subtítulo / Descrição">
              <Input
                value={(block as any).subtitle || ""}
                onChange={(e) => updateBlock(block.id, { subtitle: e.target.value })}
                placeholder="Ex: Preencha a demanda..."
              />
            </Field>
          </div>
        );

      case "client_document_upload":
        return (
          <div className="space-y-4">
            <Field label="Título Principal">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Ex: Envio de Documento de Embarque"
              />
            </Field>
            <Field label="Instruções de Preenchimento">
              <Textarea
                value={(block as any).instructions || ""}
                onChange={(e) => updateBlock(block.id, { instructions: e.target.value })}
                placeholder="Ex: Faça o upload do seu passaporte..."
                rows={3}
              />
            </Field>
            <Field label="Tipo de Documento Requerido">
              <Select
                value={(block as any).document_type || "Passport"}
                onChange={(e) => updateBlock(block.id, { document_type: e.target.value })}
              >
                <option value="Passport">Passaporte</option>
                <option value="RG">RG / Identidade</option>
                <option value="CNH">CNH / Carteira de Motorista</option>
              </Select>
            </Field>
          </div>
        );

      case "biolink_newsletter_box":
        return (
          <div className="space-y-4">
            <Field label="Placeholder do Input">
              <Input
                value={(block as any).placeholder || ""}
                onChange={(e) => updateBlock(block.id, { placeholder: e.target.value })}
                placeholder="Ex: Inscreva seu e-mail..."
              />
            </Field>
            <Field label="Texto do Botão">
              <Input
                value={(block as any).button_label || ""}
                onChange={(e) => updateBlock(block.id, { button_label: e.target.value })}
                placeholder="Ex: Inscrever"
              />
            </Field>
          </div>
        );

      case "live_sales_counter":
        return (
          <div className="space-y-4">
            <Field label="Intervalo de Atualização (segundos)">
              <Input
                type="number"
                value={(block as any).duration_sec || 10}
                onChange={(e) =>
                  updateBlock(block.id, { duration_sec: parseInt(e.target.value) || 10 })
                }
              />
            </Field>
          </div>
        );

      case "visa_checker":
        return (
          <div className="space-y-4">
            <Field label="Título Principal">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Ex: Consulte Exigência de Visto"
              />
            </Field>
            <Field label="Nacionalidade Padrão">
              <Input
                value={(block as any).default_nationality || ""}
                onChange={(e) => updateBlock(block.id, { default_nationality: e.target.value })}
                placeholder="Ex: Brasil"
              />
            </Field>
          </div>
        );

      case "insurance_simulator":
        return (
          <div className="space-y-4">
            <Field label="Título Principal">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Ex: Seguro Viagem Global"
              />
            </Field>
            <Field label="Descrição">
              <Textarea
                value={(block as any).description || ""}
                onChange={(e) => updateBlock(block.id, { description: e.target.value })}
                placeholder="Ex: Faça cotações e viaje com suporte médico..."
                rows={3}
              />
            </Field>
          </div>
        );

      case "reviews_submission_form":
        return (
          <div className="space-y-4">
            <Field label="Título Principal">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Ex: Deixe sua Avaliação"
              />
            </Field>
            <Field label="Subtítulo / Descrição">
              <Input
                value={(block as any).subtitle || ""}
                onChange={(e) => updateBlock(block.id, { subtitle: e.target.value })}
                placeholder="Ex: Compartilhe sua experiência conosco..."
              />
            </Field>
          </div>
        );

      case "whatsapp_floating_bubble":
        return (
          <div className="space-y-4">
            <Field label="Posição da Bolha">
              <Select
                value={(block as any).position || "right"}
                onChange={(e) =>
                  updateBlock(block.id, { position: e.target.value as "right" | "left" })
                }
              >
                <option value="right">Canto Inferior Direito</option>
                <option value="left">Canto Inferior Esquerdo</option>
              </Select>
            </Field>
            <Field label="Mensagem Inicial no WhatsApp">
              <Input
                value={(block as any).message || ""}
                onChange={(e) => updateBlock(block.id, { message: e.target.value })}
                placeholder="Ex: Olá, preciso de ajuda."
              />
            </Field>
            <AgentSelectEditor block={block} updateBlock={updateBlock} agencyId={agencyId} />
          </div>
        );

      case "custom_package_lead_builder":
        return (
          <div className="space-y-4">
            <Field label="Título Principal">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Ex: Monte seu Pacote Personalizado"
              />
            </Field>
            <Field label="Subtítulo / Descrição">
              <Input
                value={(block as any).subtitle || ""}
                onChange={(e) => updateBlock(block.id, { subtitle: e.target.value })}
                placeholder="Ex: Planeje sua rota nos mínimos detalhes..."
              />
            </Field>
          </div>
        );

      case "news_announcements_ticker":
        return (
          <div className="space-y-4">
            <Field label="Título do Marcador">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Ex: Novidades"
              />
            </Field>
            <Field label="Limite de Notícias a exibir">
              <Input
                type="number"
                value={(block as any).limit || 5}
                onChange={(e) => updateBlock(block.id, { limit: parseInt(e.target.value) || 5 })}
              />
            </Field>
          </div>
        );

      case "faq_category_accordion":
        return (
          <div className="space-y-4">
            <Field label="Título Principal">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Ex: Dúvidas Frequentes"
              />
            </Field>
            <Field label="Categoria do FAQ">
              <Input
                value={(block as any).category || ""}
                onChange={(e) => updateBlock(block.id, { category: e.target.value })}
                placeholder="Ex: Geral, Destinos, Contratos"
              />
            </Field>
          </div>
        );

      case "agency_badges_trust":
        return (
          <div className="space-y-4">
            <Field label="Título Principal">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Ex: Garantia e Credibilidade"
              />
            </Field>
          </div>
        );

      case "currency_calculator":
        return (
          <div className="space-y-4">
            <Field label="Título Principal">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Ex: Conversor de Câmbio"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="De (Padrão)">
                <Select
                  value={(block as any).default_from || "USD"}
                  onChange={(e) => updateBlock(block.id, { default_from: e.target.value })}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="BRL">BRL</option>
                </Select>
              </Field>
              <Field label="Para (Padrão)">
                <Select
                  value={(block as any).default_to || "BRL"}
                  onChange={(e) => updateBlock(block.id, { default_to: e.target.value })}
                >
                  <option value="BRL">BRL</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </Select>
              </Field>
            </div>
          </div>
        );

      case "interactive_flight_tracker":
        return (
          <div className="space-y-4">
            <Field label="Título Principal">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Ex: Rastrear Meu Voo"
              />
            </Field>
          </div>
        );

      case "biolink_qr_code_share":
        return (
          <div className="space-y-4">
            <Field label="Título Principal">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Ex: Compartilhar Meu Link"
              />
            </Field>
          </div>
        );

      case "client_boarding_timeline":
        return (
          <div className="space-y-4">
            <Field label="Título Principal">
              <Input
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Ex: Cronograma de Voo"
              />
            </Field>
          </div>
        );

      default: {
        const def = SECTION_REGISTRY[blockItem.type];
        if (def) {
          return (
            <RegistryBlockFormEditor
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
              updateBlock={updateBlock}
              definition={def}
              agencyId={agencyId}
            />
          );
        }
        return null;
      }
    }
  };

  return (
    <div className="space-y-6 bg-white p-1">
      {/* Tab Selector */}
      <div className="flex border-b border-border bg-white shrink-0 select-none px-2 gap-3 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("content")}
          className={`py-2 text-[9px] uppercase tracking-wider font-bold transition-all border-b-2 -mb-[1px] whitespace-nowrap cursor-pointer ${
            activeTab === "content"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Conteúdo
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("style")}
          className={`py-2 text-[9px] uppercase tracking-wider font-bold transition-all border-b-2 -mb-[1px] whitespace-nowrap cursor-pointer ${
            activeTab === "style"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Estilo
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("bindings")}
          className={`py-2 text-[9px] uppercase tracking-wider font-bold transition-all border-b-2 -mb-[1px] whitespace-nowrap cursor-pointer ${
            activeTab === "bindings"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Vínculos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("animation")}
          className={`py-2 text-[9px] uppercase tracking-wider font-bold transition-all border-b-2 -mb-[1px] whitespace-nowrap cursor-pointer ${
            activeTab === "animation"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Animação
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("responsive")}
          className={`py-2 text-[9px] uppercase tracking-wider font-bold transition-all border-b-2 -mb-[1px] whitespace-nowrap cursor-pointer ${
            activeTab === "responsive"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Responsivo
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-4 bg-white">
        {activeTab === "content" && renderForm()}

        {activeTab === "bindings" && (
          <div className="space-y-4">
            <div>
              <h4 className="text-[10px] uppercase tracking-wider font-bold text-foreground">
                Vincular Dados Dinâmicos
              </h4>
              <p className="text-[10px] text-muted-foreground leading-normal mt-0.5">
                Substitua textos ou imagens estáticas por campos vindos de um Pacote / Roteiro da
                agência.
              </p>
            </div>

            <GroupTourSelector
              agencyId={agencyId}
              selectedTourId={(block as any).bindings?.packageId || ""}
              onChange={(tourId) => {
                if (!tourId) {
                  updateBlock(block.id, { bindings: undefined } as any);
                } else {
                  updateBlock(block.id, {
                    bindings: {
                      source: "package",
                      packageId: tourId,
                      fields: (block as any).bindings?.fields || {},
                    },
                  } as any);
                }
              }}
            />

            {(block as any).bindings?.packageId && (
              <div className="pt-4 border-t border-border space-y-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Mapeamento de Campos
                </span>

                {/* We can dynamically list fields of the block that the user can map */}
                {(() => {
                  // Let's identify the editable text/image fields of the block
                  const mappableKeys = Object.keys(block)
                    .filter(
                      (k) =>
                        k !== "id" &&
                        k !== "type" &&
                        k !== "styles" &&
                        k !== "animation" &&
                        k !== "responsive" &&
                        k !== "bindings" &&
                        typeof block[k as keyof typeof block] === "string",
                    )
                    .concat(
                      Object.keys((block as any).config || {}).filter(
                        (k) => typeof (block as any).config[k] === "string",
                      ),
                    );

                  const uniqueMappableKeys = Array.from(new Set(mappableKeys));

                  if (uniqueMappableKeys.length === 0) {
                    return (
                      <p className="text-xs text-muted-foreground">
                        Nenhum campo compatível com vínculos encontrado neste bloco.
                      </p>
                    );
                  }

                  return uniqueMappableKeys.map((key) => {
                    const currentMapping = (block as any).bindings?.fields?.[key] || "";

                    return (
                      <div key={key} className="space-y-1">
                        <label className="text-[11px] font-bold text-foreground capitalize">
                          {key.replace("_", " ")}
                        </label>
                        <Select
                          value={currentMapping}
                          onChange={(e) => {
                            const val = e.target.value;
                            const newFields = { ...((block as any).bindings?.fields || {}) };
                            if (!val) {
                              delete newFields[key];
                            } else {
                              newFields[key] = val;
                            }
                            updateBlock(block.id, {
                              bindings: {
                                ...(block as any).bindings!,
                                fields: newFields,
                              },
                            } as any);
                          }}
                        >
                          <option value="">-- Manter Estático --</option>
                          <option value="package.title">Título da Viagem (package.title)</option>
                          <option value="package.destination">Destino (package.destination)</option>
                          <option value="package.description">
                            Descrição / Resumo (package.description)
                          </option>
                          <option value="package.cover_image_url">
                            Imagem de Capa (package.cover_image_url)
                          </option>
                          <option value="package.price">Preço Vigorante (package.price)</option>
                          <option value="package.departure_date">
                            Data de Saída (package.departure_date)
                          </option>
                          <option value="package.return_date">
                            Data de Retorno (package.return_date)
                          </option>
                        </Select>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}

        {activeTab === "style" && (
          <div className="space-y-4">
            <Field label="Tipo de Fundo">
              <Select
                value={blockStyles.bg_type || "default"}
                onChange={(e) => updateStyle({ bg_type: e.target.value })}
              >
                <option value="default">Padrão da Página</option>
                <option value="color">Cor Sólida</option>
                <option value="gradient">Gradiente CSS</option>
                <option value="image">Imagem de Fundo</option>
              </Select>
            </Field>

            {blockStyles.bg_type === "color" && (
              <Field label="Cor de Fundo">
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    className="w-8 h-8 rounded cursor-pointer border border-border"
                    value={blockStyles.bg_color || blockStyles.backgroundColor || "#ffffff"}
                    onChange={(e) =>
                      updateStyle({ bg_color: e.target.value, backgroundColor: e.target.value })
                    }
                  />
                  <Input
                    value={blockStyles.bg_color || blockStyles.backgroundColor || ""}
                    onChange={(e) =>
                      updateStyle({ bg_color: e.target.value, backgroundColor: e.target.value })
                    }
                    placeholder="#ffffff"
                  />
                </div>
                {/* Agency Colors Swatches */}
                <div className="flex flex-wrap gap-1.5 mt-2 bg-surface-alt/40 p-2 rounded-2xl border border-border/40">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase w-full mb-1">
                    Cores da Agência:
                  </span>
                  {Object.entries(brandColors).map(([key, val]) => {
                    if (!val) return null;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => updateStyle({ bg_color: val, backgroundColor: val })}
                        className="w-5 h-5 rounded-full border border-border cursor-pointer shadow-none hover:scale-110 active:scale-95 transition-transform"
                        style={{ backgroundColor: val as string }}
                        title={`${key}: ${val}`}
                      />
                    );
                  })}
                </div>
              </Field>
            )}

            {blockStyles.bg_type === "gradient" && (
              <div className="space-y-3">
                <Field label="Gradiente CSS">
                  <Input
                    value={blockStyles.bg_gradient || ""}
                    onChange={(e) => updateStyle({ bg_gradient: e.target.value })}
                    placeholder="linear-gradient(to right, #1e3a8a, #3b82f6)"
                  />
                </Field>
                {/* Gradient Presets */}
                <div className="bg-surface-alt/45 p-2.5 rounded-3xl border border-border/40 space-y-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">
                    Presets Vibrantes:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        name: "Indigo Dreams",
                        value: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                      },
                      {
                        name: "Sunset Glow",
                        value: "linear-gradient(135deg, #f43f5e 0%, #f97316 100%)",
                      },
                      {
                        name: "Ocean Breeze",
                        value: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)",
                      },
                      {
                        name: "Emerald Mint",
                        value: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      },
                      {
                        name: "Vibrant Dark",
                        value: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
                      },
                      {
                        name: "Neon Purple",
                        value: "linear-gradient(135deg, #d946ef 0%, #4f46e5 100%)",
                      },
                    ].map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => updateStyle({ bg_gradient: p.value })}
                        className="flex items-center gap-1.5 p-1 rounded-2xl border border-border text-[9px] font-bold text-left hover:border-brand/40 bg-surface transition-all active:scale-[0.97]"
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10"
                          style={{ background: p.value }}
                        />
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {blockStyles.bg_type === "image" && (
              <div className="space-y-4">
                <label className="text-xs font-semibold text-muted-foreground">
                  Imagem de Fundo
                </label>
                <Input
                  value={blockStyles.bg_image_url || blockStyles.backgroundImage || ""}
                  onChange={(e) =>
                    updateStyle({ bg_image_url: e.target.value, backgroundImage: e.target.value })
                  }
                  placeholder="URL da imagem..."
                />
                <div className="flex items-center gap-2 pt-1">
                  <FileUploader
                    bucket="agency-media"
                    folder={`${agencyId}/media`}
                    value={blockStyles.bg_image_url || blockStyles.backgroundImage || ""}
                    onChange={(url) =>
                      updateStyle({ bg_image_url: url || "", backgroundImage: url || "" })
                    }
                  />
                  <span className="text-xs text-muted-foreground font-semibold">ou</span>
                  <UnsplashPicker
                    value={blockStyles.bg_image_url || blockStyles.backgroundImage || ""}
                    onChange={(url) => updateStyle({ bg_image_url: url, backgroundImage: url })}
                  />
                </div>
                <Field label="Opacidade do Overlay (0.0 a 1.0)">
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.1}
                    value={
                      blockStyles.backgroundOverlayOpacity !== undefined
                        ? blockStyles.backgroundOverlayOpacity
                        : 0.5
                    }
                    onChange={(e) =>
                      updateStyle({ backgroundOverlayOpacity: parseFloat(e.target.value) || 0 })
                    }
                  />
                </Field>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Espaçamento Sup. (Padding Top)">
                <Select
                  value={blockStyles.paddingTop || blockStyles.padding_y || "md"}
                  onChange={(e) =>
                    updateStyle({ paddingTop: e.target.value, padding_y: e.target.value })
                  }
                >
                  <option value="none">Nenhum</option>
                  <option value="sm">Pequeno (sm)</option>
                  <option value="md">Médio (md)</option>
                  <option value="lg">Grande (lg)</option>
                  <option value="xl">Extra Grande (xl)</option>
                </Select>
              </Field>
              <Field label="Espaçamento Inf. (Padding Bottom)">
                <Select
                  value={blockStyles.paddingBottom || blockStyles.padding_y || "md"}
                  onChange={(e) =>
                    updateStyle({ paddingBottom: e.target.value, padding_y: e.target.value })
                  }
                >
                  <option value="none">Nenhum</option>
                  <option value="sm">Pequeno (sm)</option>
                  <option value="md">Médio (md)</option>
                  <option value="lg">Grande (lg)</option>
                  <option value="xl">Extra Grande (xl)</option>
                </Select>
              </Field>
            </div>

            <Field label="Cantos Arredondados">
              <Select
                value={blockStyles.border_radius || "none"}
                onChange={(e) => updateStyle({ border_radius: e.target.value })}
              >
                <option value="none">Quadrado (none)</option>
                <option value="md">Suave (md)</option>
                <option value="lg">Arredondado (lg)</option>
                <option value="full">Pílula (full)</option>
              </Select>
            </Field>

            <Field label="Efeito de Borda">
              <Select
                value={blockStyles.border_effect || "none"}
                onChange={(e) => updateStyle({ border_effect: e.target.value })}
              >
                <option value="none">Nenhum</option>
                <option value="solid">Borda Fina Sólida</option>
                <option value="glass">Borda de Vidro (Glassmorphism)</option>
                <option value="glow">Borda Iluminada Vibrante</option>
              </Select>
            </Field>

            <Field label="Sombras do Bloco">
              <Select
                value={blockStyles.shadow_effect || "none"}
                onChange={(e) => updateStyle({ shadow_effect: e.target.value })}
              >
                <option value="none">Nenhuma</option>
                <option value="sm">Sombra Leve</option>
                <option value="md">Sombra Média</option>
                <option value="lg">Sombra Profunda</option>
                <option value="glow">Brilho Neon Indigo</option>
              </Select>
            </Field>

            <Field label="Cor do Texto" hint="Ajuste para garantir legibilidade">
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  className="w-8 h-8 rounded cursor-pointer border border-border"
                  value={blockStyles.text_color || "#000000"}
                  onChange={(e) =>
                    updateStyle({ text_color: e.target.value, textColor: e.target.value })
                  }
                />
                <Input
                  value={blockStyles.text_color || blockStyles.textColor || ""}
                  onChange={(e) =>
                    updateStyle({ text_color: e.target.value, textColor: e.target.value })
                  }
                  placeholder="#000000"
                />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2 bg-surface-alt/40 p-2 rounded-2xl border border-border/40">
                <span className="text-[9px] font-bold text-muted-foreground uppercase w-full mb-1">
                  Presets de Contraste:
                </span>
                <button
                  type="button"
                  onClick={() => updateStyle({ text_color: "#ffffff", textColor: "light" })}
                  className="w-5 h-5 rounded-full border border-border cursor-pointer shadow-none bg-white"
                  title="Branco: #ffffff"
                />
                <button
                  type="button"
                  onClick={() => updateStyle({ text_color: "#0f172a", textColor: "dark" })}
                  className="w-5 h-5 rounded-full border border-border cursor-pointer shadow-none bg-slate-900"
                  title="Escuro: #0f172a"
                />
                {Object.entries(brandColors).map(([key, val]) => {
                  if (!val) return null;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => updateStyle({ text_color: val, textColor: val })}
                      className="w-5 h-5 rounded-full border border-border cursor-pointer shadow-none hover:scale-110 active:scale-95 transition-transform"
                      style={{ backgroundColor: val as string }}
                      title={`${key}: ${val}`}
                    />
                  );
                })}
              </div>
            </Field>
          </div>
        )}

        {activeTab === "animation" && (
          <div className="space-y-4">
            <Field label="Ativar Animação">
              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  checked={!!blockAnimation.enabled}
                  onChange={(e) => {
                    updateAnimation({ enabled: e.target.checked });
                    updateStyle({
                      animation: e.target.checked
                        ? blockAnimation.type === "none"
                          ? "fade"
                          : blockAnimation.type
                        : "none",
                    });
                  }}
                  className="rounded border-border text-brand focus:ring-brand h-4 w-4"
                />
                <span className="text-xs text-muted-foreground">Animar entrada da seção</span>
              </div>
            </Field>

            {blockAnimation.enabled && (
              <div className="space-y-4">
                <Field label="Tipo de Animação">
                  <Select
                    value={blockAnimation.type || "fadeIn"}
                    onChange={(e) => {
                      updateAnimation({ type: e.target.value });
                      updateStyle({ animation: e.target.value });
                    }}
                  >
                    <option value="none">Sem Animação</option>
                    <option value="fadeIn">Fade In (Aparecer)</option>
                    <option value="fadeInUp">Fade In Up (Subir e aparecer)</option>
                    <option value="fadeInLeft">Fade In Left (Esquerda e aparecer)</option>
                    <option value="fadeInRight">Fade In Right (Direita e aparecer)</option>
                    <option value="scaleIn">Scale In (Zoom e aparecer)</option>
                    <option value="parallax">Parallax (Efeito de rolagem de fundo)</option>
                    <option value="countUp">Count Up (Contador numérico de estatísticas)</option>
                  </Select>
                </Field>

                <Field label="Atraso (Delay em ms)">
                  <div className="flex gap-2 items-center">
                    <input
                      type="range"
                      min={0}
                      max={2000}
                      step={50}
                      value={blockAnimation.delay || 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        updateAnimation({ delay: val });
                        updateStyle({ animation_delay: val });
                      }}
                      className="flex-1"
                    />
                    <span className="text-xs font-semibold w-12 text-right">
                      {blockAnimation.delay || 0}ms
                    </span>
                  </div>
                </Field>

                <Field label="Duração (Duration em ms)">
                  <div className="flex gap-2 items-center">
                    <input
                      type="range"
                      min={200}
                      max={2000}
                      step={50}
                      value={blockAnimation.duration || 600}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 600;
                        updateAnimation({ duration: val });
                        updateStyle({ animation_duration: val });
                      }}
                      className="flex-1"
                    />
                    <span className="text-xs font-semibold w-12 text-right">
                      {blockAnimation.duration || 600}ms
                    </span>
                  </div>
                </Field>

                <Field label="Gatilho da Animação">
                  <Select
                    value={blockAnimation.trigger || "onEnter"}
                    onChange={(e) => updateAnimation({ trigger: e.target.value })}
                  >
                    <option value="onEnter">Ao Entrar na Tela (onEnter)</option>
                    <option value="onLoad">Ao Carregar a Página (onLoad)</option>
                  </Select>
                </Field>
              </div>
            )}
          </div>
        )}

        {activeTab === "responsive" && (
          <div className="space-y-4">
            <Field label="Ocultar no Mobile">
              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  checked={!!blockResponsive.hideOnMobile}
                  onChange={(e) => updateResponsive({ hideOnMobile: e.target.checked })}
                  className="rounded border-border text-brand focus:ring-brand h-4 w-4"
                />
                <span className="text-xs text-muted-foreground">
                  Ocultar quando visualizado em celulares
                </span>
              </div>
            </Field>

            <Field label="Ocultar no Tablet">
              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  checked={!!blockResponsive.hideOnTablet}
                  onChange={(e) => updateResponsive({ hideOnTablet: e.target.checked })}
                  className="rounded border-border text-brand focus:ring-brand h-4 w-4"
                />
                <span className="text-xs text-muted-foreground">
                  Ocultar quando visualizado em tablets
                </span>
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Colunas no Mobile">
                <Select
                  value={String(blockResponsive.mobileColumns || 1)}
                  onChange={(e) =>
                    updateResponsive({ mobileColumns: parseInt(e.target.value) || 1 })
                  }
                >
                  <option value="1">1 Coluna</option>
                  <option value="2">2 Colunas</option>
                </Select>
              </Field>

              <Field label="Colunas no Tablet">
                <Select
                  value={String(blockResponsive.tabletColumns || 2)}
                  onChange={(e) =>
                    updateResponsive({ tabletColumns: parseInt(e.target.value) || 2 })
                  }
                >
                  <option value="1">1 Coluna</option>
                  <option value="2">2 Colunas</option>
                  <option value="3">3 Colunas</option>
                </Select>
              </Field>
            </div>
          </div>
        )}
      </div>
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
            Nenhuma viagem em grupo aberta ou confirmada encontrada. Torne uma excursão como Aberta
            ou Confirmada no painel administrativo para poder selecioná-la.
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
            <div className="flex gap-2 items-center mt-2 bg-surface-alt/40 p-2 rounded-2xl border border-border/40">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                Cores da Agência:
              </span>
              {brandColor && (
                <button
                  type="button"
                  onClick={() => updateStyle({ bg_color: brandColor })}
                  className="w-5 h-5 rounded-full border border-border cursor-pointer shadow-none hover:scale-110 active:scale-95 transition-transform"
                  style={{ backgroundColor: brandColor }}
                  title={`Cor Principal: ${brandColor}`}
                />
              )}
              {brandColorLight && (
                <button
                  type="button"
                  onClick={() => updateStyle({ bg_color: brandColorLight })}
                  className="w-5 h-5 rounded-full border border-border cursor-pointer shadow-none hover:scale-110 active:scale-95 transition-transform"
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
            <div className="flex gap-2 items-center mt-2 bg-surface-alt/40 p-2 rounded-2xl border border-border/40">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                Presets de Contraste:
              </span>
              {brandOriginalFg && (
                <button
                  type="button"
                  onClick={() => updateStyle({ text_color: brandOriginalFg })}
                  className="w-5 h-5 rounded-full border border-border cursor-pointer shadow-none hover:scale-110 active:scale-95 transition-transform"
                  style={{ backgroundColor: brandOriginalFg }}
                  title={`Texto da Marca: ${brandOriginalFg}`}
                />
              )}
              {brandColor && (
                <button
                  type="button"
                  onClick={() => updateStyle({ text_color: brandColor })}
                  className="w-5 h-5 rounded-full border border-border cursor-pointer shadow-none hover:scale-110 active:scale-95 transition-transform"
                  style={{ backgroundColor: brandColor }}
                  title={`Principal da Marca: ${brandColor}`}
                />
              )}
              <button
                type="button"
                onClick={() => updateStyle({ text_color: "#ffffff" })}
                className="w-5 h-5 rounded-full border border-border cursor-pointer shadow-none hover:scale-110 active:scale-95 transition-transform bg-white"
                title="Branco: #ffffff"
              />
              <button
                type="button"
                onClick={() => updateStyle({ text_color: "#0f172a" })}
                className="w-5 h-5 rounded-full border border-border cursor-pointer shadow-none hover:scale-110 active:scale-95 transition-transform bg-slate-900"
                title="Escuro: #0f172a"
              />
            </div>
          )}
        </Field>
      )}

      {/* ─── Animation Controls ───────────────────────────────────────── */}
      <div className="pt-4 border-t border-border/60 space-y-3">
        <label className="text-xs font-semibold text-muted-foreground uppercase">
          Animacao de Entrada
        </label>
        <Field label="Tipo de Animacao">
          <Select
            value={styles.animation || "none"}
            onChange={(e) => updateStyle({ animation: e.target.value })}
          >
            <option value="none">Sem Animacao</option>
            <option value="fade">Fade (Aparece suavemente)</option>
            <option value="slide-up">Deslizar para Cima</option>
            <option value="slide-down">Deslizar para Baixo</option>
            <option value="slide-left">Deslizar da Direita</option>
            <option value="slide-right">Deslizar da Esquerda</option>
            <option value="zoom-in">Zoom In (Aumentar)</option>
          </Select>
        </Field>
        {styles.animation && styles.animation !== "none" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duracao (ms)" hint="Ex: 600">
              <Input
                type="number"
                min={100}
                max={3000}
                step={100}
                value={styles.animation_duration ?? 600}
                onChange={(e) => updateStyle({ animation_duration: Number(e.target.value) })}
              />
            </Field>
            <Field label="Atraso (ms)" hint="Ex: 0 ou 200">
              <Input
                type="number"
                min={0}
                max={2000}
                step={100}
                value={styles.animation_delay ?? 0}
                onChange={(e) => updateStyle({ animation_delay: Number(e.target.value) })}
              />
            </Field>
          </div>
        )}
      </div>
    </div>
  );
}

function AgentSelectEditor({ block, updateBlock, agencyId }: Props) {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!agencyId) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("agency_id", agencyId);

      if (roles && roles.length > 0) {
        const userIds = roles.map((r) => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        setAgents(profiles || []);
      }
      setLoading(false);
    }
    load();
  }, [agencyId]);

  return (
    <Field label="Selecionar Especialista / Consultor">
      {loading ? (
        <div className="text-xs text-muted-foreground">Carregando consultores...</div>
      ) : agents.length === 0 ? (
        <div className="text-xs text-destructive font-medium">
          Nenhum consultor cadastrado para esta agência.
        </div>
      ) : (
        <Select
          value={(block as any).agent_id || ""}
          onChange={(e) => updateBlock(block.id, { agent_id: e.target.value })}
        >
          <option value="">Selecione um consultor...</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.full_name}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

// ─── REGISTRY DYNAMIC FORM EDITOR ───────────────────────────────────────────

interface RegistryBlockFormEditorProps {
  block: any;
  updateBlock: (id: string, patch: any) => void;
  definition: any;
  agencyId: string;
}

export function RegistryBlockFormEditor({
  block,
  updateBlock,
  definition,
  agencyId,
}: RegistryBlockFormEditorProps) {
  const config = block.config || {};
  const fields = definition.fields || [];

  const handleFieldChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    updateBlock(block.id, { config: newConfig });
  };

  return (
    <div className="space-y-4">
      {fields.map((field: any) => {
        const value = config[field.key] !== undefined ? config[field.key] : field.defaultValue;

        switch (field.type) {
          case "text":
            return (
              <Field key={field.key} label={field.label}>
                <Input
                  value={(value as string) || ""}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                />
              </Field>
            );
          case "richtext":
            return (
              <Field key={field.key} label={field.label}>
                <Textarea
                  value={(value as string) || ""}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={4}
                />
              </Field>
            );
          case "number":
            return (
              <Field key={field.key} label={field.label}>
                <Input
                  type="number"
                  value={value !== undefined ? String(value) : ""}
                  onChange={(e) => handleFieldChange(field.key, parseFloat(e.target.value) || 0)}
                  min={field.min}
                  max={field.max}
                />
              </Field>
            );
          case "url":
            return (
              <Field key={field.key} label={field.label}>
                <Input
                  type="url"
                  value={(value as string) || ""}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  placeholder="https://..."
                />
              </Field>
            );
          case "color":
            return (
              <Field key={field.key} label={field.label}>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={(value as string) || "#ffffff"}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    className="w-10 h-10 rounded-2xl border border-border cursor-pointer"
                  />
                  <Input
                    value={(value as string) || ""}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    className="flex-1"
                    placeholder="#HEX"
                  />
                </div>
              </Field>
            );
          case "select":
            return (
              <Field key={field.key} label={field.label}>
                <Select
                  value={(value as string) || ""}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                >
                  {field.options?.map((opt: any) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </Field>
            );
          case "toggle":
            return (
              <Field key={field.key} label={field.label}>
                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    checked={!!value}
                    onChange={(e) => handleFieldChange(field.key, e.target.checked)}
                    className="rounded border-border text-brand focus:ring-brand h-4 w-4"
                  />
                  <span className="text-xs text-muted-foreground">Ativo / Exibir</span>
                </div>
              </Field>
            );
          case "image_unsplash":
          case "image":
            return (
              <Field key={field.key} label={field.label}>
                <div className="space-y-2">
                  <Input
                    value={(value as string) || ""}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder="URL da imagem..."
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <FileUploader
                      bucket="agency-media"
                      folder={`${agencyId}/media`}
                      value={(value as string) || ""}
                      onChange={(url) => handleFieldChange(field.key, url || "")}
                    />
                    <span className="text-xs text-muted-foreground font-semibold">ou</span>
                    <UnsplashPicker
                      value={(value as string) || ""}
                      onChange={(url) => handleFieldChange(field.key, url)}
                    />
                  </div>
                </div>
              </Field>
            );
          case "icon":
            return (
              <Field key={field.key} label={field.label}>
                <IconPicker
                  value={(value as string) || ""}
                  onChange={(key) => handleFieldChange(field.key, key)}
                />
              </Field>
            );
          case "list":
            return (
              <div key={field.key} className="border-t border-border pt-4 mt-4 space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {field.label}
                  </span>
                </div>
                <ListFieldEditor
                  items={Array.isArray(value) ? value : []}
                  onChange={(newVal) => handleFieldChange(field.key, newVal)}
                  defaultValue={field.defaultValue}
                  agencyId={agencyId}
                />
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

// ─── UNSPLASH IMAGE PICKER ───────────────────────────────────────────────────

function UnsplashPicker({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [keyword, setKeyword] = useState("");
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const search = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    try {
      const accessKey =
        import.meta.env.VITE_UNSPLASH_ACCESS_KEY ||
        import.meta.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY ||
        "";
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keyword)}&orientation=landscape&per_page=9&client_id=${accessKey}`,
      );
      if (res.ok) {
        const data = await res.json();
        setPhotos(data.results || []);
      } else {
        toast.error(
          "Erro ao buscar no Unsplash. Verifique se a chave de acesso VITE_UNSPLASH_ACCESS_KEY está configurada.",
        );
      }
    } catch {
      toast.error("Erro na requisição ao Unsplash.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="px-3 h-9 rounded-2xl border border-border bg-surface-alt text-xs font-semibold hover:border-brand/60 transition-colors"
      >
        {value ? "Buscar no Unsplash" : "Buscar no Unsplash"}
      </button>

      {open && (
        <div className="absolute z-50 right-4 w-72 p-4 rounded-3xl border border-border bg-surface shadow-none space-y-3 mt-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ex: travel paradise, hotel, beach..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs rounded-2xl border border-border outline-none bg-surface"
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
            <button
              type="button"
              onClick={search}
              disabled={loading}
              className="px-3 py-1.5 bg-brand text-white text-xs font-bold rounded-2xl"
            >
              {loading ? "Buscando..." : "Buscar"}
            </button>
          </div>
          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {photos.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    onChange(p.urls.regular);
                    setOpen(false);
                  }}
                  className="aspect-video cursor-pointer overflow-hidden rounded-2xl hover:ring-2 hover:ring-brand"
                >
                  <img
                    src={p.urls.thumb}
                    alt={p.alt_description}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-muted-foreground text-center py-4">
              Sem resultados. Busque termos em inglês.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── REPEATABLE LIST EDITOR ──────────────────────────────────────────────────

interface ListFieldEditorProps {
  items: any[];
  onChange: (newItems: any[]) => void;
  defaultValue: any;
  agencyId?: string;
}

function ListFieldEditor({ items, onChange, defaultValue, agencyId }: ListFieldEditorProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const addItem = () => {
    // Determine the template item
    const templateItem = (defaultValue && Array.isArray(defaultValue) && defaultValue[0]) || {};
    const newItem = JSON.parse(JSON.stringify(templateItem));

    // Clear typical text fields in the duplicate
    Object.keys(newItem).forEach((k) => {
      if (typeof newItem[k] === "string" && k !== "image" && !newItem[k].startsWith("http")) {
        newItem[k] = "";
      }
    });

    const newItems = [...items, newItem];
    onChange(newItems);
    setExpandedIndex(newItems.length - 1);
  };

  const removeItem = (idx: number) => {
    const newItems = items.filter((_, i) => i !== idx);
    onChange(newItems);
    if (expandedIndex === idx) setExpandedIndex(null);
  };

  const updateItemField = (idx: number, key: string, val: any) => {
    const newItems = items.map((item, i) => {
      if (i === idx) {
        return { ...item, [key]: val };
      }
      return item;
    });
    onChange(newItems);
  };

  const moveItem = (idx: number, direction: -1 | 1) => {
    if (idx + direction < 0 || idx + direction >= items.length) return;
    const newItems = [...items];
    const temp = newItems[idx];
    newItems[idx] = newItems[idx + direction];
    newItems[idx + direction] = temp;
    onChange(newItems);
    if (expandedIndex === idx) setExpandedIndex(idx + direction);
    else if (expandedIndex === idx + direction) setExpandedIndex(idx);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {items.map((item, idx) => {
          const isExpanded = expandedIndex === idx;
          const displayLabel =
            item.name || item.title || item.city || item.label || `Item #${idx + 1}`;

          return (
            <div
              key={idx}
              className="border border-border rounded-3xl bg-surface-alt/20 overflow-hidden"
            >
              <div
                className="flex items-center justify-between px-3 py-2 cursor-pointer bg-surface-alt/45 select-none"
                onClick={() => setExpandedIndex(isExpanded ? null : idx)}
              >
                <span className="text-xs font-semibold text-foreground truncate max-w-[140px]">
                  {displayLabel}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveItem(idx, -1);
                    }}
                    disabled={idx === 0}
                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveItem(idx, 1);
                    }}
                    disabled={idx === items.length - 1}
                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItem(idx);
                    }}
                    className="p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 border-t border-border bg-surface space-y-3">
                  {Object.keys(item).map((k) => {
                    const val = item[k];

                    // Simple heuristic for field types
                    const isImage =
                      k.toLowerCase().includes("image") ||
                      k.toLowerCase().includes("avatar") ||
                      k.toLowerCase().includes("logo");
                    const isIcon = k.toLowerCase() === "icon";
                    const isRating = k.toLowerCase() === "rating" || k.toLowerCase() === "stars";
                    const isTextarea =
                      k.toLowerCase() === "description" ||
                      k.toLowerCase() === "text" ||
                      k.toLowerCase() === "bio" ||
                      k.toLowerCase() === "snippet";

                    if (isImage) {
                      return (
                        <Field key={k} label={`${k.toUpperCase()}`}>
                          <div className="space-y-1">
                            <Input
                              value={(val as string) || ""}
                              onChange={(e) => updateItemField(idx, k, e.target.value)}
                              placeholder="URL..."
                            />
                            <div className="flex gap-2">
                              <FileUploader
                                bucket="agency-media"
                                folder={`${agencyId}/media`}
                                value={(val as string) || ""}
                                onChange={(url) => updateItemField(idx, k, url || "")}
                              />
                              <UnsplashPicker
                                value={(val as string) || ""}
                                onChange={(url) => updateItemField(idx, k, url)}
                              />
                            </div>
                          </div>
                        </Field>
                      );
                    }

                    if (isIcon) {
                      return (
                        <Field key={k} label={`${k.toUpperCase()}`}>
                          <IconPicker
                            value={(val as string) || ""}
                            onChange={(key) => updateItemField(idx, k, key)}
                          />
                        </Field>
                      );
                    }

                    if (isRating) {
                      return (
                        <Field key={k} label={`${k.toUpperCase()}`}>
                          <Input
                            type="number"
                            min={1}
                            max={5}
                            value={String(val || 5)}
                            onChange={(e) => updateItemField(idx, k, parseInt(e.target.value) || 5)}
                          />
                        </Field>
                      );
                    }

                    if (isTextarea) {
                      return (
                        <Field key={k} label={`${k.toUpperCase()}`}>
                          <Textarea
                            rows={3}
                            value={(val as string) || ""}
                            onChange={(e) => updateItemField(idx, k, e.target.value)}
                            placeholder="Descreva..."
                          />
                        </Field>
                      );
                    }

                    return (
                      <Field key={k} label={`${k.toUpperCase()}`}>
                        <Input
                          value={(val as string) || ""}
                          onChange={(e) => updateItemField(idx, k, e.target.value)}
                          placeholder="..."
                        />
                      </Field>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addItem}
        className="w-full py-2 border border-dashed border-border rounded-3xl text-xs font-semibold hover:border-brand/40 hover:bg-surface-alt/25 transition-colors text-center"
      >
        + Adicionar Item
      </button>
    </div>
  );
}
