import { z } from "zod";

export const SectionStyleSchema = z
  .object({
    bg_type: z.enum(["default", "color", "gradient", "image"]).default("default"),
    bg_color: z.string().max(50).optional().nullable(),
    bg_gradient: z.string().max(250).optional().nullable(),
    bg_image_url: z.string().max(1000).optional().nullable(),
    text_color: z.string().max(50).optional().nullable(),
    padding_y: z.enum(["none", "sm", "md", "lg"]).default("md"),
    border_radius: z.enum(["none", "md", "lg", "full"]).default("none"),
  })
  .optional()
  .nullable();

export const HeroBlockSchema = z.object({
  id: z.string(),
  type: z.literal("hero"),
  title: z.string().max(300, "Título muito longo").default(""),
  subtitle: z.string().max(1000, "Subtítulo muito longo").default(""),
  bg_image_url: z.string().max(1000).or(z.literal("")).default(""),
  cta_label: z.string().max(100, "Label do botão muito longo").default(""),
  cta_link: z.string().max(500, "Link do botão muito longo").default(""),
  layout: z.enum(["centered", "split", "minimal"]).optional().default("centered"),
  styles: SectionStyleSchema,
});

export const TextBlockSchema = z.object({
  id: z.string(),
  type: z.literal("text"),
  content: z.string().max(20000, "Conteúdo muito longo").default(""),
  align: z.enum(["left", "right", "center"]).default("left"),
  image_url: z.string().max(1000).or(z.literal("")).default(""),
  styles: SectionStyleSchema,
});

export const GalleryBlockSchema = z.object({
  id: z.string(),
  type: z.literal("gallery"),
  images: z.array(z.string().max(1000)).max(30, "No máximo 30 imagens").default([]),
  styles: SectionStyleSchema,
});

export const ContactBlockSchema = z.object({
  id: z.string(),
  type: z.literal("contact"),
  title: z.string().max(200, "Título muito longo").default(""),
  text: z.string().max(2000, "Texto muito longo").default(""),
  styles: SectionStyleSchema,
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
  layout: z.enum(["grid", "cards", "list"]).optional().default("grid"),
  styles: SectionStyleSchema,
});

export const CtaBlockSchema = z.object({
  id: z.string(),
  type: z.literal("cta"),
  title: z.string().max(300, "Título muito longo").default(""),
  subtitle: z.string().max(1000, "Subtítulo muito longo").default(""),
  button_label: z.string().max(100, "Label do botão muito longo").default(""),
  button_link: z.string().max(500, "Link do botão muito longo").default(""),
  styles: SectionStyleSchema,
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
  layout: z.enum(["accordion", "grid"]).optional().default("accordion"),
  styles: SectionStyleSchema,
});

export const TestimonialsBlockSchema = z.object({
  id: z.string(),
  type: z.literal("testimonials"),
  title: z.string().max(300, "Título muito longo").default(""),
  items: z
    .array(
      z.object({
        author: z.string().max(200, "Autor muito longo").default(""),
        role: z.string().max(200, "Cargo/Função muito longo").default(""),
        text: z.string().max(2000, "Texto do depoimento muito longo").default(""),
        avatar_url: z.string().max(1000).or(z.literal("")).default(""),
        stars: z.number().min(1).max(5).default(5),
      }),
    )
    .max(50, "No máximo 50 depoimentos")
    .default([]),
  layout: z.enum(["grid", "bubble"]).optional().default("grid"),
  styles: SectionStyleSchema,
});

export const ToursGridBlockSchema = z.object({
  id: z.string(),
  type: z.literal("tours_grid"),
  title: z.string().max(300, "Título muito longo").default(""),
  subtitle: z.string().max(1000, "Subtítulo muito longo").default(""),
  max_items: z.number().min(1).max(100).default(6),
  layout: z.enum(["grid", "list"]).optional().default("grid"),
  styles: SectionStyleSchema,
});

export const StatsBlockSchema = z.object({
  id: z.string(),
  type: z.literal("stats"),
  title: z.string().max(300, "Título muito longo").default(""),
  items: z
    .array(
      z.object({
        value: z.string().max(100, "Valor muito longo").default(""),
        label: z.string().max(200, "Rótulo muito longo").default(""),
        icon: z.string().max(50, "Ícone muito longo").default(""),
      }),
    )
    .max(20, "No máximo 20 números")
    .default([]),
  styles: SectionStyleSchema,
});

export const VideoBlockSchema = z.object({
  id: z.string(),
  type: z.literal("video"),
  title: z.string().max(300, "Título muito longo").default(""),
  url: z.string().max(1000, "URL do vídeo muito longa").default(""),
  caption: z.string().max(1000, "Legenda muito longa").default(""),
  styles: SectionStyleSchema,
});

export const MapBlockSchema = z.object({
  id: z.string(),
  type: z.literal("map"),
  title: z.string().max(300, "Título muito longo").default(""),
  embed_url: z.string().max(1000, "URL de embed muito longa").default(""),
  address_label: z.string().max(500, "Rótulo do endereço muito longo").default(""),
  styles: SectionStyleSchema,
});

export const BlogFeedBlockSchema = z.object({
  id: z.string(),
  type: z.literal("blog_feed"),
  title: z.string().max(300, "Título muito longo").default(""),
  max_items: z.number().min(1).max(100).default(3),
  styles: SectionStyleSchema,
});

export const BiolinkHeaderBlockSchema = z.object({
  id: z.string(),
  type: z.literal("biolink_header"),
  avatar_url: z.string().max(1000).or(z.literal("")).default(""),
  name: z.string().max(200).default(""),
  bio: z.string().max(5000).default(""),
  bg_color: z.string().max(50).default("#1E293B"),
  text_color: z.string().max(50).default("#FFFFFF"),
  styles: SectionStyleSchema,
});

export const BiolinkLinksBlockSchema = z.object({
  id: z.string(),
  type: z.literal("biolink_links"),
  button_style: z.enum(["solid", "outline", "soft"]).optional().default("solid"),
  button_rounded: z.enum(["none", "md", "full"]).optional().default("full"),
  items: z
    .array(
      z.object({
        title: z.string().max(200).default(""),
        url: z.string().max(1000).default(""),
        icon: z.string().max(100).default(""),
        highlight: z.boolean().default(false),
      }),
    )
    .default([]),
  styles: SectionStyleSchema,
});

export const GroupTourDetailsBlockSchema = z.object({
  id: z.string(),
  type: z.literal("group_tour_details"),
  tour_id: z.string().max(200).default(""),
  styles: SectionStyleSchema,
});

export const SupportTicketFormBlockSchema = z.object({
  id: z.string(),
  type: z.literal("support_ticket_form"),
  title: z.string().max(300).default(""),
  subtitle: z.string().max(1000).default(""),
  styles: SectionStyleSchema,
});

export const ClientPortalAccessBlockSchema = z.object({
  id: z.string(),
  type: z.literal("client_portal_access"),
  title: z.string().max(300).default(""),
  description: z.string().max(1000).default(""),
  button_label: z.string().max(100).default(""),
  styles: SectionStyleSchema,
});

export const PendingContractsWidgetBlockSchema = z.object({
  id: z.string(),
  type: z.literal("pending_contracts_widget"),
  title: z.string().max(300).default(""),
  description: z.string().max(1000).default(""),
  styles: SectionStyleSchema,
});

export const FeaturedDestinationsBlockSchema = z.object({
  id: z.string(),
  type: z.literal("featured_destinations"),
  title: z.string().max(300).default(""),
  subtitle: z.string().max(1000).default(""),
  items: z
    .array(
      z.object({
        image_url: z.string().max(1000).default(""),
        destination: z.string().max(200).default(""),
        price: z.string().max(100).optional().nullable(),
        description: z.string().max(1000).default(""),
        link: z.string().max(500).default(""),
      }),
    )
    .default([]),
  styles: SectionStyleSchema,
});

export const SocialLinksBlockSchema = z.object({
  id: z.string(),
  type: z.literal("social_links"),
  title: z.string().max(300).default(""),
  instagram: z.string().max(1000).optional().nullable(),
  facebook: z.string().max(1000).optional().nullable(),
  youtube: z.string().max(1000).optional().nullable(),
  whatsapp: z.string().max(1000).optional().nullable(),
  linkedin: z.string().max(1000).optional().nullable(),
  styles: SectionStyleSchema,
});

export const NewsletterBlockSchema = z.object({
  id: z.string(),
  type: z.literal("newsletter"),
  title: z.string().max(300).default(""),
  subtitle: z.string().max(1000).default(""),
  placeholder: z.string().max(200).optional().nullable(),
  button_label: z.string().max(100).optional().nullable(),
  styles: SectionStyleSchema,
});

export const CustomBlockSchema = z.object({
  id: z.string(),
  type: z.string(),
  config: z.record(z.any()).optional().default({}),
  styles: z.any().optional().nullable(),
  animation: z.any().optional().nullable(),
  responsive: z.any().optional().nullable(),
});

export const PortalBlockSchema = z.union([
  z.discriminatedUnion("type", [
    HeroBlockSchema,
    TextBlockSchema,
    GalleryBlockSchema,
    ContactBlockSchema,
    FeaturesBlockSchema,
    CtaBlockSchema,
    FaqBlockSchema,
    TestimonialsBlockSchema,
    ToursGridBlockSchema,
    StatsBlockSchema,
    VideoBlockSchema,
    MapBlockSchema,
    BlogFeedBlockSchema,
    BiolinkHeaderBlockSchema,
    BiolinkLinksBlockSchema,
    GroupTourDetailsBlockSchema,
    SupportTicketFormBlockSchema,
    ClientPortalAccessBlockSchema,
    PendingContractsWidgetBlockSchema,
    FeaturedDestinationsBlockSchema,
    SocialLinksBlockSchema,
    NewsletterBlockSchema,
  ]),
  CustomBlockSchema,
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
