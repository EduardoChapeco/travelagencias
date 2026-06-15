/**
 * CMS Block Types — Source of Truth (v2)
 *
 * Single canonical definition of all CMS block types.
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
    }
  | {
      id: string;
      type: "testimonials";
      title: string;
      items: { author: string; role: string; text: string; avatar_url: string; stars: number }[];
    }
  | {
      id: string;
      type: "tours_grid";
      title: string;
      subtitle: string;
      /** se vazio, busca automaticamente os roteiros publicados da agência */
      max_items: number;
    }
  | {
      id: string;
      type: "stats";
      title: string;
      items: { value: string; label: string; icon: string }[];
    }
  | {
      id: string;
      type: "video";
      title: string;
      url: string;
      /** YouTube ou Vimeo embed URL */
      caption: string;
    }
  | {
      id: string;
      type: "map";
      title: string;
      /** Embed iframe src do Google Maps */
      embed_url: string;
      address_label: string;
    }
  | {
      id: string;
      type: "blog_feed";
      title: string;
      max_items: number;
    }
  | {
      id: string;
      type: "biolink_header";
      avatar_url: string;
      name: string;
      bio: string;
      bg_color: string;
      text_color: string;
    }
  | {
      id: string;
      type: "biolink_links";
      items: { title: string; url: string; icon: string; highlight: boolean }[];
    }
  | {
      id: string;
      type: "group_tour_details";
      tour_id: string; // The UUID of the group tour to fetch and render dynamically
    }
  | {
      id: string;
      type: "support_ticket_form";
      title: string;
      subtitle: string;
    };

/** All block type literals — useful for type-guards and addBlock() */
export type PortalBlockType = PortalBlock["type"];

/** Labels legíveis por tipo de bloco */
export const BLOCK_LABELS: Record<PortalBlockType, string> = {
  hero: "Hero / Banner",
  text: "Texto com imagem",
  gallery: "Galeria de fotos",
  contact: "Formulário de contato",
  features: "Diferenciais / Features",
  cta: "Call to Action",
  faq: "FAQ / Perguntas frequentes",
  testimonials: "Depoimentos",
  tours_grid: "Grade de roteiros",
  stats: "Números em destaque",
  video: "Vídeo",
  map: "Mapa / Localização",
  blog_feed: "Feed do Blog",
  biolink_header: "Biolink: Cabeçalho",
  biolink_links: "Biolink: Lista de Links",
  group_tour_details: "Detalhes do Grupo (Dinâmico)",
  support_ticket_form: "Abertura de Ticket (Suporte)",
};

/** Default empty values for each block type */
export const BLOCK_DEFAULTS: {
  [K in PortalBlockType]: Omit<Extract<PortalBlock, { type: K }>, "id">;
} = {
  hero: {
    type: "hero",
    title: "Viagens inesquecíveis para destinos incríveis",
    subtitle: "Especialistas em criar experiências únicas para você e sua família.",
    bg_image_url: "",
    cta_label: "Conhecer roteiros",
    cta_link: "#roteiros",
  },
  text: {
    type: "text",
    content: "Escreva aqui o conteúdo desta seção...",
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
    text: "Preencha o formulário e entraremos em contato em breve.",
  },
  features: {
    type: "features",
    title: "Por que nos escolher?",
    items: [
      {
        icon: "✈️",
        title: "Destinos exclusivos",
        description: "Acesso a destinos nacionais e internacionais com preços especiais.",
      },
      {
        icon: "🛡️",
        title: "Segurança total",
        description: "Viaje com tranquilidade com suporte 24h e seguro viagem incluso.",
      },
      {
        icon: "💼",
        title: "Atendimento personalizado",
        description: "Um consultor dedicado para cada cliente.",
      },
    ],
  },
  cta: {
    type: "cta",
    title: "Pronto para sua próxima aventura?",
    subtitle: "Fale com um consultor hoje mesmo e monte o roteiro dos seus sonhos.",
    button_label: "Falar agora",
    button_link: "#contato",
  },
  faq: {
    type: "faq",
    title: "Perguntas frequentes",
    items: [
      {
        question: "Como faço para solicitar um orçamento?",
        answer:
          "Entre em contato pelo WhatsApp ou formulário e um consultor retornará em até 2 horas.",
      },
      {
        question: "Vocês trabalham com seguro viagem?",
        answer: "Sim! Trabalhamos com as melhores seguradoras do mercado.",
      },
    ],
  },
  testimonials: {
    type: "testimonials",
    title: "O que nossos clientes dizem",
    items: [
      {
        author: "Maria Silva",
        role: "Cliente há 3 anos",
        text: "A melhor experiência de viagem que já tive! O atendimento é impecável.",
        avatar_url: "",
        stars: 5,
      },
      {
        author: "João Santos",
        role: "Viagem em família",
        text: "Organizaram tudo com perfeição. Recomendo muito!",
        avatar_url: "",
        stars: 5,
      },
    ],
  },
  tours_grid: {
    type: "tours_grid",
    title: "Próximas viagens em grupo",
    subtitle: "Junte-se a outros viajantes em roteiros especialmente selecionados.",
    max_items: 6,
  },
  stats: {
    type: "stats",
    title: "Nossos números",
    items: [
      { value: "500+", label: "Viagens realizadas", icon: "✈️" },
      { value: "2.000+", label: "Clientes satisfeitos", icon: "😊" },
      { value: "50+", label: "Destinos atendidos", icon: "🌍" },
      { value: "10+", label: "Anos de experiência", icon: "⭐" },
    ],
  },
  video: {
    type: "video",
    title: "Conheça nossa história",
    url: "",
    caption: "",
  },
  map: {
    type: "map",
    title: "Nossa localização",
    embed_url: "",
    address_label: "",
  },
  blog_feed: {
    type: "blog_feed",
    title: "Últimas do blog",
    max_items: 3,
  },
  biolink_header: {
    type: "biolink_header",
    avatar_url: "",
    name: "Sua Agência",
    bio: "Especialistas em realizar sonhos",
    bg_color: "#1E293B",
    text_color: "#FFFFFF",
  },
  biolink_links: {
    type: "biolink_links",
    items: [
      { title: "Fale com um Especialista", url: "#", icon: "💬", highlight: true },
      { title: "Nossos Roteiros", url: "#", icon: "✈️", highlight: false },
      { title: "Visite nosso Site", url: "#", icon: "🌐", highlight: false },
    ],
  },
  group_tour_details: {
    type: "group_tour_details",
    tour_id: "",
  },
  support_ticket_form: {
    type: "support_ticket_form",
    title: "Como podemos ajudar?",
    subtitle: "Abra um chamado e nossa equipe de suporte responderá em breve.",
  },
};
