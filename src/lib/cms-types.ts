/**
 * CMS Block Types — Source of Truth (v2)
 *
 * Single canonical definition of all CMS block types.
 * Import from here in BOTH the editor (portal.pages.tsx) and the renderer (BlockRenderer.tsx).
 * Never define PortalBlock locally in any route or component.
 */

export type SectionStyle = {
  bg_type: "default" | "color" | "gradient" | "image";
  bg_color?: string;
  bg_gradient?: string;
  bg_image_url?: string;
  text_color?: string;
  padding_y: "none" | "sm" | "md" | "lg";
  border_radius: "none" | "md" | "lg" | "full";
};

export type PortalBlock =
  | {
      id: string;
      type: "hero";
      title: string;
      subtitle: string;
      bg_image_url: string;
      cta_label: string;
      cta_link: string;
      layout?: "centered" | "split" | "minimal";
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "text";
      content: string;
      align: "left" | "right" | "center";
      image_url: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "gallery";
      images: string[];
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "contact";
      title: string;
      text: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "features";
      title: string;
      items: { icon: string; title: string; description: string }[];
      layout?: "grid" | "cards" | "list";
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "cta";
      title: string;
      subtitle: string;
      button_label: string;
      button_link: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "faq";
      title: string;
      items: { question: string; answer: string }[];
      layout?: "accordion" | "grid";
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "testimonials";
      title: string;
      items: { author: string; role: string; text: string; avatar_url: string; stars: number }[];
      layout?: "grid" | "bubble";
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "tours_grid";
      title: string;
      subtitle: string;
      max_items: number;
      layout?: "grid" | "list";
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "stats";
      title: string;
      items: { value: string; label: string; icon: string }[];
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "video";
      title: string;
      url: string;
      caption: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "map";
      title: string;
      embed_url: string;
      address_label: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "blog_feed";
      title: string;
      max_items: number;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "biolink_header";
      avatar_url: string;
      name: string;
      bio: string;
      bg_color: string;
      text_color: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "biolink_links";
      button_style?: "solid" | "outline" | "soft";
      button_rounded?: "none" | "md" | "full";
      items: { title: string; url: string; icon: string; highlight: boolean }[];
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "group_tour_details";
      tour_id: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "support_ticket_form";
      title: string;
      subtitle: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "client_portal_access";
      title: string;
      description: string;
      button_label: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "pending_contracts_widget";
      title: string;
      description: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "featured_destinations";
      title: string;
      subtitle: string;
      items: { image_url: string; destination: string; price?: string; description: string; link: string }[];
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "social_links";
      title: string;
      instagram?: string;
      facebook?: string;
      youtube?: string;
      whatsapp?: string;
      linkedin?: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "newsletter";
      title: string;
      subtitle: string;
      placeholder?: string;
      button_label?: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "tours_carousel";
      title: string;
      subtitle: string;
      max_items: number;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "featured_destination_filter";
      title: string;
      subtitle: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "team_widget";
      title: string;
      subtitle: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "live_reviews";
      title: string;
      subtitle: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "whatsapp_departments";
      title: string;
      departments: { name: string; phone: string; icon: string; message: string }[];
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "countdown_tour";
      tour_id: string;
      title: string;
      subtitle: string;
      button_label: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "social_links_row";
      facebook?: string;
      instagram?: string;
      youtube?: string;
      whatsapp?: string;
      linkedin?: string;
      tiktok?: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "exchange_rates";
      title: string;
      currencies: string[];
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "dynamic_map_route";
      title: string;
      tour_id?: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "agency_vouchers";
      title: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "weather_forecast";
      title?: string;
      tour_id?: string;
      city?: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "itinerary_timeline";
      title?: string;
      tour_id: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "lead_capture_callback";
      title: string;
      subtitle: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "promotional_banner";
      title: string;
      discount_code: string;
      expiration_date?: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "payment_gateways_display";
      title: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "agent_profile_card";
      agent_id: string;
      cta_label: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "travel_tips_faq";
      category?: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "live_tours_map";
      max_items: number;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "gift_cards_store";
      title: string;
      subtitle: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "corporate_rfp_form";
      title: string;
      subtitle: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "client_document_upload";
      title: string;
      instructions: string;
      document_type: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "biolink_newsletter_box";
      placeholder: string;
      button_label: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "live_sales_counter";
      duration_sec: number;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "visa_checker";
      title: string;
      default_nationality?: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "insurance_simulator";
      title: string;
      description: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "reviews_submission_form";
      title: string;
      subtitle: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "whatsapp_floating_bubble";
      agent_id: string;
      position: "left" | "right";
      message: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "custom_package_lead_builder";
      title: string;
      subtitle: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "news_announcements_ticker";
      title: string;
      limit: number;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "faq_category_accordion";
      title: string;
      category: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "agency_badges_trust";
      title: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "currency_calculator";
      title: string;
      default_from: string;
      default_to: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "interactive_flight_tracker";
      title: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "biolink_qr_code_share";
      title: string;
      qr_data_url?: string;
      styles?: SectionStyle;
    }
  | {
      id: string;
      type: "client_boarding_timeline";
      title: string;
      styles?: SectionStyle;
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
  client_portal_access: "Acesso Área do Cliente",
  pending_contracts_widget: "Contratos Pendentes",
  featured_destinations: "Destinos em Destaque",
  social_links: "Redes Sociais",
  newsletter: "Newsletter / Captura",
  tours_carousel: "Carrossel de Pacotes",
  featured_destination_filter: "Grade de Destinos Filtráveis",
  team_widget: "Nossa Equipe / Consultores",
  live_reviews: "Depoimentos Reais (DB)",
  whatsapp_departments: "Canais de WhatsApp",
  countdown_tour: "Contador Regressivo (Pacote)",
  social_links_row: "Redes Sociais (Ícones)",
  exchange_rates: "Cotações de Moedas",
  dynamic_map_route: "Mapa do Roteiro Ativo",
  agency_vouchers: "Vouchers & Bilhetes",
  weather_forecast: "Previsão do Tempo",
  itinerary_timeline: "Roteiro Dia a Dia",
  lead_capture_callback: "Solicitar Ligação",
  promotional_banner: "Banner de Cupom",
  payment_gateways_display: "Formas de Pagamento",
  agent_profile_card: "Perfil do Consultor",
  travel_tips_faq: "Dicas de Viagem (FAQ)",
  live_tours_map: "Mapa dos Grupos",
  gift_cards_store: "Cartão Presente",
  corporate_rfp_form: "RFP Corporativa (B2B)",
  client_document_upload: "Envio de Documentos",
  biolink_newsletter_box: "Newsletter Biolink",
  live_sales_counter: "Contador de Vendas",
  visa_checker: "Consultor de Vistos",
  insurance_simulator: "Simulador de Seguro Viagem",
  reviews_submission_form: "Enviar Avaliação",
  whatsapp_floating_bubble: "WhatsApp Flutuante (Consultor)",
  custom_package_lead_builder: "Montar Pacote Personalizado",
  news_announcements_ticker: "Ticker de Notícias / Novidades",
  faq_category_accordion: "FAQ por Categoria",
  agency_badges_trust: "Selos de Confiança & Garantia",
  currency_calculator: "Calculadora de Câmbio",
  interactive_flight_tracker: "Status de Voos Interativo",
  biolink_qr_code_share: "QR Code & Compartilhar",
  client_boarding_timeline: "Cronograma de Embarque",
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
    layout: "centered",
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
        icon: "Vip",
        title: "Destinos exclusivos",
        description: "Acesso a destinos nacionais e internacionais com preços especiais.",
      },
      {
        icon: "Safe",
        title: "Segurança total",
        description: "Viaje com tranquilidade com suporte 24h e seguro viagem incluso.",
      },
      {
        icon: "Care",
        title: "Atendimento personalizado",
        description: "Um consultor dedicado para cada cliente.",
      },
    ],
    layout: "grid",
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
    layout: "accordion",
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
    layout: "grid",
  },
  tours_grid: {
    type: "tours_grid",
    title: "Próximas viagens em grupo",
    subtitle: "Junte-se a outros viajantes em roteiros especialmente selecionados.",
    max_items: 6,
    layout: "grid",
  },
  stats: {
    type: "stats",
    title: "Nossos números",
    items: [
      { value: "500+", label: "Viagens realizadas", icon: "Trips" },
      { value: "2.000+", label: "Clientes satisfeitos", icon: "Clients" },
      { value: "50+", label: "Destinos atendidos", icon: "Places" },
      { value: "10+", label: "Anos de experiência", icon: "Awards" },
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
      { title: "Fale com um Especialista", url: "#", icon: "Chat", highlight: true },
      { title: "Nossos Roteiros", url: "#", icon: "Trip", highlight: false },
      { title: "Visite nosso Site", url: "#", icon: "Web", highlight: false },
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
  client_portal_access: {
    type: "client_portal_access",
    title: "Área do Passageiro",
    description: "Acesse seus vouchers, passagens aéreas e guias de embarque da sua viagem.",
    button_label: "Acessar Painel",
  },
  pending_contracts_widget: {
    type: "pending_contracts_widget",
    title: "Contratos Pendentes",
    description: "Você possui termos ou contratos aguardando sua assinatura eletrônica.",
  },
  featured_destinations: {
    type: "featured_destinations",
    title: "Destinos Recomendados",
    subtitle: "Explore os lugares mais cobiçados da temporada.",
    items: [
      {
        destination: "Paris, França",
        price: "R$ 6.900",
        description: "A cidade luz te espera com museus incríveis e gastronomia impecável.",
        image_url: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80",
        link: "#contato",
      },
      {
        destination: "Cancun, México",
        price: "R$ 4.500",
        description: "Resorts all-inclusive à beira do mar do Caribe com praias de areia branca.",
        image_url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80",
        link: "#contato",
      },
      {
        destination: "Tóquio, Japão",
        price: "R$ 9.800",
        description: "Uma fusão única entre templos milenares e tecnologia futurista.",
        image_url: "https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=400&q=80",
        link: "#contato",
      }
    ]
  },
  social_links: {
    type: "social_links",
    title: "Siga-nos nas redes",
    instagram: "",
    facebook: "",
    youtube: "",
    whatsapp: "",
    linkedin: "",
  },
  newsletter: {
    type: "newsletter",
    title: "Receba Nossas Ofertas Exclusivas",
    subtitle: "Inscreva seu e-mail e seja o primeiro a saber sobre nossos novos roteiros e cupons de desconto.",
    placeholder: "Seu melhor e-mail",
    button_label: "Cadastrar",
  },
  tours_carousel: {
    type: "tours_carousel",
    title: "Nossos Pacotes de Viagem",
    subtitle: "Deslize e conheça as próximas saídas organizadas em grupo.",
    max_items: 8,
  },
  featured_destination_filter: {
    type: "featured_destination_filter",
    title: "Destinos dos Sonhos",
    subtitle: "Filtre nossas saídas pelas regiões mais procuradas da temporada.",
  },
  team_widget: {
    type: "team_widget",
    title: "Fale com Nossos Especialistas",
    subtitle: "Nossos consultores estão prontos para planejar a sua viagem sob medida.",
  },
  live_reviews: {
    type: "live_reviews",
    title: "O que nossos viajantes dizem",
    subtitle: "Avaliações reais enviadas por quem já viajou com a Excetur.",
  },
  whatsapp_departments: {
    type: "whatsapp_departments",
    title: "Canais de Atendimento Rápido",
    departments: [
      { name: "Vendas / Orçamentos", phone: "5549999999999", icon: "chat", message: "Olá! Gostaria de fazer um orçamento de viagem." },
      { name: "Suporte Operacional", phone: "5549999999999", icon: "safe", message: "Olá! Preciso de ajuda com minha viagem contratada." },
      { name: "Financeiro", phone: "5549999999999", icon: "key", message: "Olá! Gostaria de falar sobre faturamento ou pagamentos." }
    ],
  },
  countdown_tour: {
    type: "countdown_tour",
    tour_id: "",
    title: "Últimas Vagas Disponíveis!",
    subtitle: "Garanta seu lugar antes que o cronômetro expire.",
    button_label: "Quero Garantir Minha Vaga",
  },
  social_links_row: {
    type: "social_links_row",
    instagram: "https://instagram.com",
    whatsapp: "5549999999999",
    facebook: "",
    youtube: "",
    linkedin: "",
    tiktok: "",
  },
  exchange_rates: {
    type: "exchange_rates",
    title: "Conversor & Cotações do Dia",
    currencies: ["USD", "EUR", "GBP", "ARS"],
  },
  dynamic_map_route: {
    type: "dynamic_map_route",
    title: "Roteiro da Viagem no Mapa",
    tour_id: "",
  },
  agency_vouchers: {
    type: "agency_vouchers",
    title: "Seus Vouchers de Viagem",
  },
  weather_forecast: {
    type: "weather_forecast",
    tour_id: "",
    city: "Chapecó, SC",
  },
  itinerary_timeline: {
    type: "itinerary_timeline",
    tour_id: "",
  },
  lead_capture_callback: {
    type: "lead_capture_callback",
    title: "Queremos te ligar!",
    subtitle: "Deixe seu telefone e entraremos em contato em até 15 minutos.",
  },
  promotional_banner: {
    type: "promotional_banner",
    title: "Use o cupom e ganhe 10% OFF na primeira viagem!",
    discount_code: "BEMVINDO10",
    expiration_date: "",
  },
  payment_gateways_display: {
    type: "payment_gateways_display",
    title: "Opções de Pagamento Facilitado",
  },
  agent_profile_card: {
    type: "agent_profile_card",
    agent_id: "",
    cta_label: "Agendar Horário",
  },
  travel_tips_faq: {
    type: "travel_tips_faq",
    category: "Geral",
  },
  live_tours_map: {
    type: "live_tours_map",
    max_items: 4,
  },
  gift_cards_store: {
    type: "gift_cards_store",
    title: "Dê Viagem de Presente",
    subtitle: "Adquira um vale-viagem personalizado para quem você ama.",
  },
  corporate_rfp_form: {
    type: "corporate_rfp_form",
    title: "Solicitação de Viagem Corporativa (RFP)",
    subtitle: "Envie a demanda de viagem ou evento da sua empresa.",
  },
  client_document_upload: {
    type: "client_document_upload",
    title: "Envio de Documentos de Embarque",
    instructions: "Faça o upload do seu passaporte ou RG frente e verso para podermos emitir seus vouchers.",
    document_type: "Passport",
  },
  biolink_newsletter_box: {
    type: "biolink_newsletter_box",
    placeholder: "Inscreva seu e-mail...",
    button_label: "Inscrever",
  },
  live_sales_counter: {
    type: "live_sales_counter",
    duration_sec: 10,
  },
  visa_checker: {
    type: "visa_checker",
    title: "Consulte Necessidade de Visto de Entrada",
    default_nationality: "Brasil",
  },
  insurance_simulator: {
    type: "insurance_simulator",
    title: "Simule e Contrate seu Seguro Viagem",
    description: "Viaje protegido com assistência médica global, extravio de bagagem e suporte 24h.",
  },
  reviews_submission_form: {
    type: "reviews_submission_form",
    title: "Deixe sua Avaliação",
    subtitle: "Sua opinião é muito importante para nós. Compartilhe sua experiência de viagem!",
  },
  whatsapp_floating_bubble: {
    type: "whatsapp_floating_bubble",
    agent_id: "",
    position: "right",
    message: "Olá! Como posso te ajudar hoje?",
  },
  custom_package_lead_builder: {
    type: "custom_package_lead_builder",
    title: "Monte sua Viagem Personalizada",
    subtitle: "Diga-nos para onde quer ir e nós cuidamos de todo o roteiro.",
  },
  news_announcements_ticker: {
    type: "news_announcements_ticker",
    title: "Últimas Atualizações & Avisos",
    limit: 5,
  },
  faq_category_accordion: {
    type: "faq_category_accordion",
    title: "Dúvidas Frequentes",
    category: "Geral",
  },
  agency_badges_trust: {
    type: "agency_badges_trust",
    title: "Garantia e Credibilidade Excetur",
  },
  currency_calculator: {
    type: "currency_calculator",
    title: "Calculadora de Conversão de Moedas",
    default_from: "USD",
    default_to: "BRL",
  },
  interactive_flight_tracker: {
    type: "interactive_flight_tracker",
    title: "Rastreamento & Status de Voos",
  },
  biolink_qr_code_share: {
    type: "biolink_qr_code_share",
    title: "Compartilhe este Biolink",
    qr_data_url: "",
  },
  client_boarding_timeline: {
    type: "client_boarding_timeline",
    title: "Cronograma de Voo & Embarque",
  }
};
