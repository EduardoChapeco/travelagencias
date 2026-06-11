import { z } from "zod";

export const HeroBlockSchema = z.object({
  id: z.string(),
  type: z.literal("hero"),
  title: z.string().max(300, "Título muito longo").default(""),
  subtitle: z.string().max(1000, "Subtítulo muito longo").default(""),
  bg_image_url: z.string().max(1000).or(z.literal("")).default(""),
  cta_label: z.string().max(100, "Label do botão muito longo").default(""),
  cta_link: z.string().max(500, "Link do botão muito longo").default(""),
});

export const TextBlockSchema = z.object({
  id: z.string(),
  type: z.literal("text"),
  content: z.string().max(20000, "Conteúdo muito longo").default(""),
  align: z.enum(["left", "right", "center"]).default("left"),
  image_url: z.string().max(1000).or(z.literal("")).default(""),
});

export const GalleryBlockSchema = z.object({
  id: z.string(),
  type: z.literal("gallery"),
  images: z.array(z.string().max(1000)).max(30, "No máximo 30 imagens").default([]),
});

export const ContactBlockSchema = z.object({
  id: z.string(),
  type: z.literal("contact"),
  title: z.string().max(200, "Título muito longo").default(""),
  text: z.string().max(2000, "Texto muito longo").default(""),
});

export const FeaturesBlockSchema = z.object({
  id: z.string(),
  type: z.literal("features"),
  title: z.string().max(200, "Título muito longo").default(""),
  items: z
    .array(
      z.object({
        icon: z.string().max(50, "Ícone muito longo").default(""),
        title: z.string().max(200, "Título do item muito longo").default(""),
        description: z.string().max(1000, "Descrição do item muito longa").default(""),
      }),
    )
    .max(20, "No máximo 20 diferenciais")
    .default([]),
});

export const CtaBlockSchema = z.object({
  id: z.string(),
  type: z.literal("cta"),
  title: z.string().max(300, "Título muito longo").default(""),
  subtitle: z.string().max(1000, "Subtítulo muito longo").default(""),
  button_label: z.string().max(100, "Label do botão muito longo").default(""),
  button_link: z.string().max(500, "Link do botão muito longo").default(""),
});

export const FaqBlockSchema = z.object({
  id: z.string(),
  type: z.literal("faq"),
  title: z.string().max(300, "Título muito longo").default(""),
  items: z
    .array(
      z.object({
        question: z.string().max(500, "Pergunta muito longa").default(""),
        answer: z.string().max(3000, "Resposta muito longa").default(""),
      }),
    )
    .max(50, "No máximo 50 perguntas")
    .default([]),
});

export const PortalBlockSchema = z.discriminatedUnion("type", [
  HeroBlockSchema,
  TextBlockSchema,
  GalleryBlockSchema,
  ContactBlockSchema,
  FeaturesBlockSchema,
  CtaBlockSchema,
  FaqBlockSchema,
]);

export const PortalBlocksArraySchema = z.array(PortalBlockSchema);

export const PortalPagePayloadSchema = z.object({
  title: z.string().min(1, "O título é obrigatório").max(200, "Título muito longo"),
  slug: z.string().min(1, "O slug é obrigatório").max(200, "Slug muito longo"),
  template: z.string().max(50).nullable().default("default"),
  blocks: PortalBlocksArraySchema,
  seo: z
    .object({
      meta_title: z.string().max(200, "Título SEO muito longo").optional().nullable(),
      meta_description: z.string().max(1000, "Descrição SEO muito longa").optional().nullable(),
    })
    .optional(),
});
