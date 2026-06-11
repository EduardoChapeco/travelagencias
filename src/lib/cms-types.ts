/**
 * CMS Block Types — Source of Truth
 *
 * This is the single canonical definition of all CMS block types.
 * Import from here in BOTH the editor (portal.pages.tsx) and the renderer (BlockRenderer.tsx).
 * Never define PortalBlock locally in any route or component.
 */

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
  | {
      id: string;
      type: "gallery";
      images: string[];
    }
  | {
      id: string;
      type: "contact";
      title: string;
      text: string;
    }
  | {
      id: string;
      type: "features";
      title: string;
      items: { icon: string; title: string; description: string }[];
    }
  | {
      id: string;
      type: "cta";
      title: string;
      subtitle: string;
      button_label: string;
      button_link: string;
    }
  | {
      id: string;
      type: "faq";
      title: string;
      items: { question: string; answer: string }[];
    };

/** All block type literals — useful for type-guards and addBlock() */
export type PortalBlockType = PortalBlock["type"];

/** Default empty values for each block type */
export const BLOCK_DEFAULTS: {
  [K in PortalBlockType]: Omit<Extract<PortalBlock, { type: K }>, "id">;
} = {
  hero: {
    type: "hero",
    title: "",
    subtitle: "",
    bg_image_url: "",
    cta_label: "",
    cta_link: "",
  },
  text: {
    type: "text",
    content: "",
    align: "left",
    image_url: "",
  },
  gallery: {
    type: "gallery",
    images: [],
  },
  contact: {
    type: "contact",
    title: "Fale conosco",
    text: "",
  },
  features: {
    type: "features",
    title: "Nossos diferenciais",
    items: [{ icon: "✨", title: "Exemplo", description: "Descrição aqui" }],
  },
  cta: {
    type: "cta",
    title: "Pronto para viajar?",
    subtitle: "Fale com um consultor hoje mesmo",
    button_label: "Falar agora",
    button_link: "/contato",
  },
  faq: {
    type: "faq",
    title: "Dúvidas frequentes",
    items: [{ question: "Como funciona?", answer: "..." }],
  },
};
