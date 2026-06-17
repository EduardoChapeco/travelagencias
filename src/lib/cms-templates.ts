import { type PortalBlock } from "./cms-types";

export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  category: "site" | "biolink";
  thumbnailUrl?: string;
  blocks: PortalBlock[];
}

export const CMS_TEMPLATES: PageTemplate[] = [
  {
    id: "roteiros-landing",
    name: "Landing Page de Roteiros",
    description: "Ideal para promover saídas de viagens em grupo com depoimentos e FAQ.",
    category: "site",
    blocks: [
      {
        id: "hero-1",
        type: "hero",
        title: "Explore o Mundo com Nossos Roteiros Exclusivos",
        subtitle:
          "Viagens organizadas nos mínimos detalhes para você e sua família colecionarem momentos inesquecíveis.",
        bg_image_url:
          "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80",
        cta_label: "Ver Próximas Saídas",
        cta_link: "#roteiros",
        layout: "split",
      },
      {
        id: "features-1",
        type: "features",
        title: "Por que viajar com a gente?",
        layout: "cards",
        items: [
          {
            icon: "Trip",
            title: "Roteiros Exclusivos",
            description: "Destinos planejados por especialistas com curadoria local.",
          },
          {
            icon: "Safe",
            title: "Segurança & Suporte",
            description: "Seguro viagem premium e guia acompanhante desde o embarque.",
          },
          {
            icon: "Hotel",
            title: "Hospedagem Selecionada",
            description: "Hotéis de categoria superior com excelente localização.",
          },
        ],
      },
      {
        id: "tours-grid-1",
        type: "tours_grid",
        title: "Próximas Saídas Confirmadas",
        subtitle: "Escolha seu próximo destino e garanta sua vaga nos grupos.",
        max_items: 6,
        layout: "grid",
      },
      {
        id: "testimonials-1",
        type: "testimonials",
        title: "O que nossos viajantes dizem",
        layout: "grid",
        items: [
          {
            author: "Juliana Mendes",
            role: "Viajou para Itália",
            text: "A viagem foi impecável. Hotéis maravilhosos, guias atenciosos e um grupo super divertido. Já estou planejando a próxima!",
            avatar_url:
              "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
            stars: 5,
          },
          {
            author: "Marcos Oliveira",
            role: "Viajou para o Jalapão",
            text: "Superou todas as minhas expectativas. O Jalapão é lindo e a agência cuidou de tudo com extrema perfeição e segurança.",
            avatar_url:
              "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
            stars: 5,
          },
        ],
      },
      {
        id: "faq-1",
        type: "faq",
        title: "Dúvidas Frequentes",
        layout: "accordion",
        items: [
          {
            question: "O que está incluso nos pacotes de grupo?",
            answer:
              "Geralmente incluem passagens aéreas, hotéis com café da manhã, passeios descritos no roteiro, seguro viagem e guia acompanhante.",
          },
          {
            question: "Posso parcelar a minha viagem?",
            answer:
              "Sim! Oferecemos parcelamento em até 10x sem juros no cartão de crédito, ou através de boleto bancário facilitado até a data da viagem.",
          },
        ],
      },
      {
        id: "newsletter-landing",
        type: "newsletter",
        title: "Receba Novas Saídas no Seu E-mail",
        subtitle:
          "Cadastre-se para receber em primeira mão o lançamento de novos grupos e condições de early booking.",
        placeholder: "Seu melhor e-mail",
        button_label: "Quero Receber",
      },
      {
        id: "social-landing",
        type: "social_links",
        title: "Siga nossa agência nas redes",
        instagram: "https://instagram.com",
        whatsapp: "5549999999999",
        facebook: "https://facebook.com",
      },
    ],
  },
  {
    id: "sobre-nos",
    name: "Página Sobre Nós",
    description: "Conte a história da sua agência de viagens e destaque seus diferenciais.",
    category: "site",
    blocks: [
      {
        id: "hero-2",
        type: "hero",
        title: "Criamos Viagens, Realizamos Sonhos",
        subtitle: "Há mais de 10 anos conectando pessoas aos destinos mais incríveis do planeta.",
        bg_image_url:
          "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80",
        cta_label: "Conhecer Nossa História",
        cta_link: "#historia",
        layout: "centered",
      },
      {
        id: "text-story",
        type: "text",
        content: `<h3>Nossa História</h3><p>Nascemos com a missão de transformar viagens em experiências transformadoras. Acreditamos que viajar é mais do que apenas visitar lugares; é vivenciar novas culturas, saborear novas gastronomias e colecionar lembranças para a vida toda.</p><p>Nossa equipe de consultores é apaixonada por viagens e está sempre em busca dos melhores hotéis, passeios e serviços para garantir que cada cliente tenha um roteiro sob medida e inesquecível.</p>`,
        align: "left",
        image_url:
          "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=600&q=80",
      },
      {
        id: "stats-2",
        type: "stats",
        title: "Nossa Trajetória em Números",
        items: [
          { value: "10k+", label: "Clientes Atendidos", icon: "Care" },
          { value: "50+", label: "Países Visitados", icon: "World" },
          { value: "100%", label: "Suporte Personalizado", icon: "Safe" },
          { value: "15+", label: "Prêmios de Qualidade", icon: "Award" },
        ],
      },
      {
        id: "sobre-features",
        type: "features",
        title: "Nossos Valores Fundamentais",
        layout: "list",
        items: [
          {
            icon: "Union",
            title: "Compromisso com o Cliente",
            description: "Colocamos o viajante no centro de todas as nossas decisões.",
          },
          {
            icon: "Eco",
            title: "Turismo Responsável",
            description: "Apoiamos comunidades locais e promovemos práticas sustentáveis.",
          },
          {
            icon: "Award",
            title: "Qualidade Impecável",
            description: "Buscamos constantemente a excelência em todos os serviços.",
          },
        ],
      },
      {
        id: "gallery-story",
        type: "gallery",
        images: [
          "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80",
          "https://images.unsplash.com/photo-1522083165195-3427502977a1?auto=format&fit=crop&w=400&q=80",
          "https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=400&q=80",
          "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=400&q=80",
        ],
      },
      {
        id: "social-sobre",
        type: "social_links",
        title: "Acompanhe nossos bastidores",
        instagram: "https://instagram.com",
        youtube: "https://youtube.com",
      },
    ],
  },
  {
    id: "contato-suporte",
    name: "Contato & Suporte",
    description: "Página de contato integrada com formulário de suporte e mapa físico.",
    category: "site",
    blocks: [
      {
        id: "hero-3",
        type: "hero",
        title: "Estamos Prontos para Te Ouvir",
        subtitle: "Tire dúvidas, envie sugestões ou solicite suporte para a sua viagem.",
        bg_image_url:
          "https://images.unsplash.com/photo-1534536281715-e28d76689b4d?auto=format&fit=crop&w=1200&q=80",
        cta_label: "Falar pelo WhatsApp",
        cta_link: "https://wa.me/5549999999999",
        layout: "minimal",
      },
      {
        id: "contact-form-block",
        type: "support_ticket_form",
        title: "Abra um Chamado de Suporte",
        subtitle:
          "Preencha as informações abaixo e nosso time de atendimento entrará em contato em breve.",
      },
      {
        id: "support-faq",
        type: "faq",
        title: "Dúvidas e Respostas Rápidas",
        layout: "grid",
        items: [
          {
            question: "Como funciona o suporte 24h durante a viagem?",
            answer:
              "Você receberá um número exclusivo de plantão no WhatsApp para falar com nossa equipe a qualquer momento em caso de imprevistos.",
          },
          {
            question: "Como faço para alterar ou cancelar minha viagem?",
            answer:
              "Entre em contato através do formulário acima ou fale diretamente com seu consultor para verificarmos as regras de cancelamento da sua tarifa.",
          },
        ],
      },
      {
        id: "map-location",
        type: "map",
        title: "Nosso Escritório Físico",
        embed_url:
          "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3550.9123847990146!2d-52.618608223689255!3d-27.11142580795493!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94e53e414c77c68b%3A0xc3cf33887d1955c4!2sChapec%C3%B3%2C%20SC!5e0!3m2!1spt-BR!2sbr!4v1718471847683!5m2!1spt-BR!2sbr",
        address_label: "Avenida Getúlio Vargas, 1000 — Centro, Chapecó - SC",
      },
      {
        id: "social-suporte",
        type: "social_links",
        title: "Fale conosco pelos canais oficiais",
        instagram: "https://instagram.com",
        whatsapp: "5549999999999",
      },
    ],
  },
  {
    id: "luxury-travel",
    name: "Luxury Boutique Travel",
    description: "Design minimalista e refinado para consultorias de viagem premium e de luxo.",
    category: "site",
    blocks: [
      {
        id: "lux-hero",
        type: "hero",
        title: "A Arte de Viajar com Exclusividade",
        subtitle:
          "Curadoria de viagens extraordinárias, hotéis de prestígio e experiências sob medida projetadas por especialistas de luxo.",
        bg_image_url:
          "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80",
        cta_label: "Solicitar Consulta Particular",
        cta_link: "#contato",
        layout: "split",
      },
      {
        id: "lux-destinations",
        type: "featured_destinations",
        title: "Nossa Seleção de Prestígio",
        subtitle:
          "Destinos icônicos e refúgios exclusivos escolhidos a dedo para sua próxima jornada extraordinária.",
        items: [
          {
            destination: "Maldivas (Resort Privado)",
            price: "Sob Consulta",
            description:
              "Villas sobre as águas cristalinas, mordomo 24h e total isolamento paradisíaco.",
            image_url:
              "https://images.unsplash.com/photo-1439066615861-d1af74d74000?auto=format&fit=crop&w=400&q=80",
            link: "#contato",
          },
          {
            destination: "Amalfi Coast, Itália",
            price: "Sob Consulta",
            description:
              "Passeios de iate privativo, hotéis palacianos nas falésias e alta gastronomia italiana.",
            image_url:
              "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=400&q=80",
            link: "#contato",
          },
          {
            destination: "Safari em Botsuana",
            price: "Sob Consulta",
            description:
              "Lodges ultra-luxuosos no coração do Delta do Okavango com safáris fotográficos privativos.",
            image_url:
              "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=400&q=80",
            link: "#contato",
          },
        ],
      },
      {
        id: "lux-features",
        type: "features",
        title: "O Padrão de Serviço Excetur",
        layout: "cards",
        items: [
          {
            icon: "Lux",
            title: "Atendimento Ultra-Privado",
            description:
              "Um concierge de luxo dedicado 24/7 para planejar e acompanhar toda a sua jornada.",
          },
          {
            icon: "Flight",
            title: "Aviação Privativa & Fast-Track",
            description:
              "Parcerias de fretamento aéreo e recepção VIP nos aeroportos para embarques sem atritos.",
          },
          {
            icon: "Key",
            title: "Acesso Exclusivo",
            description:
              "Reservas preferenciais em restaurantes com estrelas Michelin e acesso a experiências fechadas ao público.",
          },
        ],
      },
      {
        id: "lux-testimonials",
        type: "testimonials",
        title: "Relatos de Experiências Extraordinárias",
        layout: "bubble",
        items: [
          {
            author: "Roberto Albuquerque",
            role: "Membro Excetur Black",
            text: "O nível de atenção aos detalhes é incomparável. Desde o jato privado até o acesso exclusivo a museus fechados, tudo foi impecavelmente executado.",
            avatar_url:
              "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
            stars: 5,
          },
          {
            author: "Heloísa Brandão",
            role: "Cliente desde 2021",
            text: "Eles entendem exatamente o que significa luxo: tempo livre de preocupações e vivências genuínas. A melhor assessoria de viagens do Brasil.",
            avatar_url:
              "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
            stars: 5,
          },
        ],
      },
      {
        id: "lux-newsletter",
        type: "newsletter",
        title: "Assine a Gazeta de Viagens Excetur",
        subtitle:
          "Artigos mensais de curadoria, lançamentos de novos lodges de luxo e relatos exclusivos de exploração.",
        placeholder: "Seu e-mail corporativo",
        button_label: "Assinar Boletim",
      },
      {
        id: "lux-social",
        type: "social_links",
        title: "Conecte-se com nossa curadoria",
        instagram: "https://instagram.com",
        whatsapp: "5549999999999",
        youtube: "https://youtube.com",
      },
    ],
  },
  {
    id: "hopp-clean",
    name: "Biolink - Hopp Clean",
    description: "Design moderno, leve e minimalista, perfeito para uso corporativo diário.",
    category: "biolink",
    blocks: [
      {
        id: "bio-clean-header",
        type: "biolink_header",
        avatar_url:
          "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80",
        name: "Excelência Tour",
        bio: "<p>Agência de Viagens Boutique</p><p>Ajudamos você a explorar o melhor do mundo.</p>",
        bg_color: "#F8FAFC",
        text_color: "#0F172A",
      },
      {
        id: "bio-clean-links",
        type: "biolink_links",
        button_style: "soft",
        button_rounded: "full",
        items: [
          {
            title: "Falar com um Consultor (WhatsApp)",
            url: "https://wa.me/5549999999999",
            icon: "Chat",
            highlight: true,
          },
          { title: "Próximas Viagens Confirmadas", url: "#", icon: "Trip", highlight: false },
          { title: "Visitar Nosso Site Oficial", url: "#", icon: "Web", highlight: false },
        ],
      },
      {
        id: "bio-clean-social",
        type: "social_links",
        title: "Nossos Canais",
        instagram: "https://instagram.com",
        whatsapp: "5549999999999",
        linkedin: "https://linkedin.com",
      },
    ],
  },
  {
    id: "hopp-dark",
    name: "Biolink - Hopp Dark Premium",
    description: "Estilo elegante com tons escuros, glassmorphism e botões com bordas destacadas.",
    category: "biolink",
    blocks: [
      {
        id: "bio-dark-header",
        type: "biolink_header",
        avatar_url:
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
        name: "Excetur Premium",
        bio: "<p>Roteiros Exclusivos e Concierge de Luxo</p><p>Experiências desenhadas sob medida.</p>",
        bg_color: "#0F172A",
        text_color: "#F1F5F9",
      },
      {
        id: "bio-dark-links",
        type: "biolink_links",
        button_style: "outline",
        button_rounded: "md",
        items: [
          {
            title: "Solicitar Cotação Personalizada",
            url: "https://wa.me/5549999999999",
            icon: "Star",
            highlight: true,
          },
          {
            title: "Acompanhe Nosso Instagram",
            url: "https://instagram.com",
            icon: "Insta",
            highlight: false,
          },
          { title: "Hotéis e Resorts Selecionados", url: "#", icon: "Hotel", highlight: false },
        ],
      },
      {
        id: "bio-dark-social",
        type: "social_links",
        title: "Conecte-se",
        instagram: "https://instagram.com",
        whatsapp: "5549999999999",
        youtube: "https://youtube.com",
      },
    ],
  },
  {
    id: "hopp-vibrant",
    name: "Biolink - Hopp Vibrant",
    description:
      "Cores intensas, contraste chamativo e botões estilo pílula com preenchimento sólido.",
    category: "biolink",
    blocks: [
      {
        id: "bio-vibrant-header",
        type: "biolink_header",
        avatar_url:
          "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
        name: "Mundo Jovem Agência",
        bio: "<p>Especialistas em Mochilões e Viagens de Aventura!</p><p>Conecte-se com a natureza.</p>",
        bg_color: "#4F46E5",
        text_color: "#FFFFFF",
      },
      {
        id: "bio-vibrant-links",
        type: "biolink_links",
        button_style: "solid",
        button_rounded: "full",
        items: [
          { title: "Roteiros de Mochilão 2026", url: "#", icon: "Pack", highlight: true },
          { title: "Ecoturismo & Trekking", url: "#", icon: "Nature", highlight: false },
          { title: "Grupo VIP no Telegram", url: "#", icon: "Chat", highlight: false },
        ],
      },
      {
        id: "bio-vibrant-social",
        type: "social_links",
        title: "Siga o Mochilão",
        instagram: "https://instagram.com",
        whatsapp: "5549999999999",
      },
    ],
  },
  {
    id: "bio-dark-glow",
    name: "Biolink - Vibrant Dark Glow",
    description:
      "Visual moderno e futurista com fundo escuro, contatos por WhatsApp estruturados e feed de blog.",
    category: "biolink",
    blocks: [
      {
        id: "glow-hdr",
        type: "biolink_header",
        avatar_url:
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
        name: "Excetur Connect",
        bio: "<p>Sua Viagem Planejada por Especialistas</p><p>Links rápidos e suporte online 24h.</p>",
        bg_color: "#0B0F19",
        text_color: "#F3F4F6",
      },
      {
        id: "glow-socials",
        type: "social_links_row",
        instagram: "https://instagram.com",
        whatsapp: "5549999999999",
        youtube: "https://youtube.com",
      },
      {
        id: "glow-depts",
        type: "whatsapp_departments",
        title: "Fale Conosco no WhatsApp",
        departments: [
          {
            name: "Consultor de Vendas",
            phone: "5549999999999",
            icon: "chat",
            message: "Olá! Gostaria de cotar um roteiro.",
          },
          {
            name: "Plantão Operacional 24h",
            phone: "5549999999999",
            icon: "safe",
            message: "Olá! Preciso de suporte urgente com minha viagem.",
          },
        ],
      },
      {
        id: "glow-exchange",
        type: "exchange_rates",
        title: "Moedas Turismo Hoje",
        currencies: ["USD", "EUR", "ARS"],
      },
      {
        id: "glow-blog",
        type: "blog_feed",
        title: "Bastidores & Dicas de Viagem",
        max_items: 2,
      },
    ],
  },
  {
    id: "bio-clean-pro",
    name: "Biolink - Clean Agent Pro",
    description:
      "Ideal para consultores autônomos, focado em agendamentos de reuniões e Área do Passageiro.",
    category: "biolink",
    blocks: [
      {
        id: "clean-pro-hdr",
        type: "biolink_header",
        avatar_url:
          "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80",
        name: "Alexandre Silva",
        bio: "<p>Consultor de Viagens Personalizadas</p>",
        bg_color: "#FFFFFF",
        text_color: "#1E293B",
      },
      {
        id: "clean-pro-access",
        type: "client_portal_access",
        title: "Área do Cliente",
        description:
          "Acesse seus vouchers de embarque, passagens e assine seus contratos pendentes.",
        button_label: "Entrar no Painel",
      },
      {
        id: "clean-pro-links",
        type: "biolink_links",
        button_style: "soft",
        button_rounded: "md",
        items: [
          { title: "Agendar Reunião de Roteiro", url: "#contato", icon: "Chat", highlight: true },
          { title: "Ver Catálogo de Roteiros", url: "#", icon: "Trip", highlight: false },
        ],
      },
      {
        id: "clean-pro-social",
        type: "social_links_row",
        instagram: "https://instagram.com",
        whatsapp: "5549999999999",
      },
    ],
  },
  {
    id: "site-promo-hub",
    name: "Landing Page - Promo Hub",
    description:
      "Página de conversão focada em campanhas promocionais, com cronômetro de escassez.",
    category: "site",
    blocks: [
      {
        id: "promo-hero",
        type: "hero",
        title: "A Oportunidade que Você Esperava",
        subtitle:
          "Garanta seu lugar no nosso grupo confirmado com condições incríveis de pagamento.",
        bg_image_url:
          "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80",
        cta_label: "Aproveitar Desconto",
        cta_link: "#escassez",
        layout: "centered",
      },
      {
        id: "promo-countdown",
        type: "countdown_tour",
        tour_id: "",
        title: "As Inscrições Encerram Em:",
        subtitle: "Lote promocional limitado ao preenchimento de vagas.",
        button_label: "Quero Garantir Minha Viagem",
      },
      {
        id: "promo-carousel",
        type: "tours_carousel",
        title: "Outros Roteiros Recomendados",
        subtitle: "Conheça nossas próximas saídas promocionais da temporada.",
        max_items: 4,
      },
      {
        id: "promo-reviews",
        type: "live_reviews",
        title: "Depoimentos Reais de Quem Já Viajou",
        subtitle: "Veja o relato sincero dos nossos passageiros de grupos.",
      },
      {
        id: "promo-newsletter",
        type: "newsletter",
        title: "Seja Avisado de Novas Promoções",
        subtitle: "Cadastre-se na nossa lista VIP de e-mails.",
        placeholder: "Seu melhor e-mail",
        button_label: "Inscrever-me",
      },
    ],
  },
  {
    id: "site-corporate",
    name: "Portal Corporativo",
    description: "Layout limpo focado em atendimento a empresas, suporte e termos contratuais.",
    category: "site",
    blocks: [
      {
        id: "corp-hero",
        type: "hero",
        title: "Gestão de Viagens Corporativas",
        subtitle: "Eficiência, economia e suporte completo para os deslocamentos da sua empresa.",
        bg_image_url:
          "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80",
        cta_label: "Falar com Consultor B2B",
        cta_link: "https://wa.me/5549999999999",
        layout: "split",
      },
      {
        id: "corp-contracts",
        type: "pending_contracts_widget",
        title: "Contratos de Prestação de Serviço",
        description:
          "Assine digitalmente seus termos e aditivos contratuais pendentes de assinatura.",
      },
      {
        id: "corp-support",
        type: "support_ticket_form",
        title: "Suporte & Solicitação de Viagem",
        subtitle:
          "Preencha a RFP ou abra um ticket de atendimento e responderemos em até 15 minutos.",
      },
      {
        id: "corp-map",
        type: "map",
        title: "Nosso Escritório Central",
        embed_url:
          "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3550.9123847990146!2d-52.618608223689255!3d-27.11142580795493!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94e53e414c77c68b%3A0xc3cf33887d1955c4!2sChapec%C3%B3%2C%20SC!5e0!3m2!1spt-BR!2sbr!4v1718471847683!5m2!1spt-BR!2sbr",
        address_label: "Avenida Getúlio Vargas, 1000 — Chapecó, SC",
      },
    ],
  },
  {
    id: "premium-adventure",
    name: "Aventura LP Premium",
    description:
      "Ideal para promover saídas de ecoturismo e aventura com cronograma e previsão do tempo.",
    category: "site",
    blocks: [
      {
        id: "adv-hero",
        type: "hero",
        title: "Sua Próxima Grande Aventura Começa Aqui",
        subtitle: "Roteiros de ecoturismo e trekking com guias especializados e suporte completo.",
        bg_image_url:
          "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80",
        cta_label: "Explorar Roteiros",
        cta_link: "#roteiros",
        layout: "centered",
      },
      {
        id: "adv-features",
        type: "features",
        title: "Por que nos escolher?",
        layout: "cards",
        items: [
          {
            icon: "nature",
            title: "Contato com a Natureza",
            description: "Destinos preservados e experiências genuínas ao ar livre.",
          },
          {
            icon: "safe",
            title: "Aventura Segura",
            description: "Seguro viagem premium e guias certificados inclusos.",
          },
          {
            icon: "vip",
            title: "Grupos Reduzidos",
            description: "Turmas pequenas para maior segurança e aproveitamento.",
          },
        ],
      },
      {
        id: "adv-carousel",
        type: "tours_carousel",
        title: "Nossos Próximos Destinos",
        subtitle: "Confira as saídas confirmadas para os próximos meses.",
        max_items: 4,
      },
      {
        id: "adv-weather",
        type: "weather_forecast",
        title: "Previsão do Tempo no Destino",
        city: "Chapada Diamantina, BA",
      },
      {
        id: "adv-timeline",
        type: "itinerary_timeline",
        title: "Como será a sua jornada?",
        tour_id: "",
      },
      {
        id: "adv-testimonials",
        type: "testimonials",
        title: "O que dizem os aventureiros",
        layout: "bubble",
        items: [
          {
            author: "Bruno G.",
            role: "Trilha da Patagônia",
            text: "Excelente organização. O suporte foi essencial nas trilhas mais difíceis. Indico a todos!",
            avatar_url: "",
            stars: 5,
          },
        ],
      },
      {
        id: "adv-contact",
        type: "contact",
        title: "Fale com o Guia Líder",
        text: "Tire suas dúvidas diretamente com quem coordena as expedições.",
      },
    ],
  },
  {
    id: "luxury-corp",
    name: "Luxury Corporate Hub",
    description:
      "Portal corporativo avançado B2B focado em RFPs, assinaturas de contratos e suporte rápido.",
    category: "site",
    blocks: [
      {
        id: "lux-corp-hero",
        type: "hero",
        title: "Gestão Inteligente de Viagens de Negócios",
        subtitle:
          "Tecnologia e atendimento exclusivo para otimizar os deslocamentos da sua empresa.",
        bg_image_url:
          "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80",
        cta_label: "Falar com Consultor B2B",
        cta_link: "https://wa.me/5549999999999",
        layout: "split",
      },
      {
        id: "lux-corp-rfp",
        type: "corporate_rfp_form",
        title: "Solicitação de Viagem Corporativa (RFP)",
        subtitle: "Preencha a demanda para cotação rápida de passagens, hotéis e eventos.",
      },
      {
        id: "lux-corp-contracts",
        type: "pending_contracts_widget",
        title: "Contratos e Aditivos Pendentes",
        description:
          "Assine digitalmente seus acordos corporativos com validade jurídica instantânea.",
      },
      {
        id: "lux-corp-portal",
        type: "client_portal_access",
        title: "Área do Gestor & Passageiro",
        description: "Acesse relatórios de gastos, vouchers emitidos e faturas mensais.",
        button_label: "Acessar Portal",
      },
      {
        id: "lux-corp-support",
        type: "support_ticket_form",
        title: "Suporte Operacional B2B",
        subtitle: "Abra um ticket para alterações de voo ou cancelamentos urgentes.",
      },
    ],
  },
  {
    id: "full-services",
    name: "Portal Completo de Serviços",
    description:
      "Layout abrangente para agências físicas completas com equipe, cupons e facilidades de pagamento.",
    category: "site",
    blocks: [
      {
        id: "fs-hero",
        type: "hero",
        title: "Sua Agência de Viagens Completa",
        subtitle:
          "Lazer, corporativo, intercâmbio e cruzeiros. Cuidamos de tudo para você só se preocupar em viajar.",
        bg_image_url:
          "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80",
        cta_label: "Ver Serviços",
        cta_link: "#servicos",
        layout: "centered",
      },
      {
        id: "fs-filter",
        type: "featured_destination_filter",
        title: "Nossos Destinos Recomendados",
        subtitle: "Filtre por região ou estilo de viagem e encontre o pacote perfeito.",
      },
      {
        id: "fs-promo",
        type: "promotional_banner",
        title: "Aproveite! Desconto especial de boas-vindas",
        discount_code: "VIAGEM10",
      },
      {
        id: "fs-team",
        type: "team_widget",
        title: "Fale com Nossos Consultores",
        subtitle: "Especialistas qualificados prontos para planejar a sua viagem sob medida.",
      },
      {
        id: "fs-payments",
        type: "payment_gateways_display",
        title: "Pague Parcelado no Boleto ou Cartão",
      },
      {
        id: "fs-newsletter",
        type: "newsletter",
        title: "Assine Nossas Ofertas",
        subtitle: "Receba em primeira mão tarifas aéreas promocionais exclusivas.",
      },
    ],
  },
  {
    id: "agent-biolink",
    name: "Biolink - Consultor Autônomo",
    description:
      "Layout de link-in-bio focado no perfil individual do agente de viagem com redes sociais e canais.",
    category: "biolink",
    blocks: [
      {
        id: "ab-header",
        type: "biolink_header",
        avatar_url:
          "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80",
        name: "Marcio Reis",
        bio: "<p>Consultor de Viagens de Lazer & Cruzeiros</p><p>Te ajudo a planejar as férias perfeitas!</p>",
        bg_color: "#1E293B",
        text_color: "#FFFFFF",
      },
      {
        id: "ab-agent",
        type: "agent_profile_card",
        agent_id: "",
        cta_label: "Agendar Reunião Particular",
      },
      {
        id: "ab-social",
        type: "social_links_row",
        instagram: "https://instagram.com",
        whatsapp: "5549999999999",
      },
      {
        id: "ab-depts",
        type: "whatsapp_departments",
        title: "Canais de Atendimento",
        departments: [
          {
            name: "Orçamentos Personalizados",
            phone: "5549999999999",
            icon: "chat",
            message: "Olá! Gostaria de um orçamento.",
          },
          {
            name: "Suporte 24h (Passageiros)",
            phone: "5549999999999",
            icon: "safe",
            message: "Olá! Preciso de suporte em viagem.",
          },
        ],
      },
      {
        id: "ab-links",
        type: "biolink_links",
        button_style: "solid",
        button_rounded: "full",
        items: [
          { title: "Ver Roteiros Ativos", url: "#", icon: "Trip", highlight: true },
          {
            title: "Acessar Portal do Passageiro",
            url: "/auth/login",
            icon: "Web",
            highlight: false,
          },
        ],
      },
    ],
  },
  {
    id: "launch-biolink",
    name: "Biolink - Lançamento de Grupo",
    description:
      "Template de biolink para campanhas rápidas do Instagram com cronômetro de escassez e cupons.",
    category: "biolink",
    blocks: [
      {
        id: "lb-header",
        type: "biolink_header",
        avatar_url:
          "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
        name: "EuroTour 2026",
        bio: "<p>Grupo Confirmado: Itália & Suíça</p><p>Últimas vagas com desconto especial!</p>",
        bg_color: "#0F172A",
        text_color: "#FFFFFF",
      },
      {
        id: "lb-countdown",
        type: "countdown_tour",
        tour_id: "",
        title: "Tempo Restante para Garantir a Vaga:",
        subtitle: "Lote promocional com taxas inclusas.",
        button_label: "Quero Reservar Minha Vaga",
      },
      {
        id: "lb-promo",
        type: "promotional_banner",
        title: "Cupom de R$ 500 OFF exclusivo no Instagram:",
        discount_code: "EURO500",
      },
      {
        id: "lb-links",
        type: "biolink_links",
        button_style: "outline",
        button_rounded: "md",
        items: [
          { title: "Ver Detalhes do Roteiro Completo", url: "#", icon: "Trip", highlight: true },
          {
            title: "Falar com Guia no WhatsApp",
            url: "https://wa.me/5549999999999",
            icon: "Chat",
            highlight: false,
          },
        ],
      },
      {
        id: "lb-news",
        type: "biolink_newsletter_box",
        placeholder: "Seu melhor e-mail...",
        button_label: "Entrar na Lista de Espera",
      },
    ],
  },
  {
    id: "support-biolink",
    name: "Biolink - Suporte & Vouchers",
    description:
      "Focado em passageiros em trânsito. Acesso rápido a vouchers, contratos e suporte 24h.",
    category: "biolink",
    blocks: [
      {
        id: "sb-header",
        type: "biolink_header",
        avatar_url:
          "https://images.unsplash.com/photo-1534536281715-e28d76689b4d?auto=format&fit=crop&w=150&q=80",
        name: "Central do Viajante",
        bio: "<p>Suporte operacional e documentos de embarque.</p>",
        bg_color: "#F8FAFC",
        text_color: "#0F172A",
      },
      {
        id: "sb-vouchers",
        type: "agency_vouchers",
        title: "Meus Bilhetes e Vouchers",
      },
      {
        id: "sb-contracts",
        type: "pending_contracts_widget",
        title: "Assinatura de Contratos",
        description: "Assine seus termos pendentes para liberar seus vouchers de embarque.",
      },
      {
        id: "sb-depts",
        type: "whatsapp_departments",
        title: "Canais Oficiais de Suporte",
        departments: [
          {
            name: "Plantão Operacional 24h",
            phone: "5549999999999",
            icon: "safe",
            message: "Olá! Estou em viagem e preciso de suporte.",
          },
          {
            name: "Setor de Emissões & Vouchers",
            phone: "5549999999999",
            icon: "key",
            message: "Olá! Gostaria de falar sobre meus vouchers.",
          },
        ],
      },
      {
        id: "sb-upload",
        type: "client_document_upload",
        title: "Envio Seguro de Documentos",
        instructions: "Envie fotos legíveis de seus documentos de identidade.",
        document_type: "RG",
      },
      {
        id: "sb-ticket",
        type: "support_ticket_form",
        title: "Abrir Chamado / Ocorrência",
        subtitle: "Registre problemas com voos ou hotéis.",
      },
    ],
  },
  {
    id: "eco-nature-safari",
    name: "Safáris & Ecoturismo LP",
    description:
      "Ideal para promover ecoturismo, safáris e turismo ecológico com formulários, avaliações e clima.",
    category: "site",
    blocks: [
      {
        id: "eco-hero",
        type: "hero",
        title: "Aventura Ecoturismo & Safáris Selvagens",
        subtitle:
          "Explore a natureza intocada com guias qualificados e acomodação ecológica premium.",
        bg_image_url:
          "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80",
        cta_label: "Ver Saídas do Safári",
        cta_link: "#saidas",
        layout: "centered",
      },
      {
        id: "eco-features",
        type: "features",
        title: "Diferenciais de Nossos Roteiros",
        layout: "cards",
        items: [
          {
            icon: "nature",
            title: "Turismo 100% Ecológico",
            description: "Preservação da vida selvagem e suporte a comunidades locais.",
          },
          {
            icon: "vip",
            title: "Lodges Exclusivos",
            description: "Acomodações integradas à natureza com conforto absoluto.",
          },
        ],
      },
      {
        id: "eco-carousel",
        type: "tours_carousel",
        title: "Saídas de Grupo Disponíveis",
        subtitle: "Garanta seu lugar em uma de nossas datas exclusivas.",
        max_items: 4,
      },
      {
        id: "eco-weather",
        type: "weather_forecast",
        title: "Condições Climáticas Atuais",
        city: "Pantanal, MT",
      },
      {
        id: "eco-timeline",
        type: "itinerary_timeline",
        title: "Roteiro de 5 Dias no Pantanal",
        tour_id: "",
      },
      {
        id: "eco-builder",
        type: "custom_package_lead_builder",
        title: "Solicite um Roteiro Personalizado",
        subtitle:
          "Selecione suas preferências e nossos especialistas desenharão sua viagem sob medida.",
      },
      {
        id: "eco-feedback",
        type: "reviews_submission_form",
        title: "Deixe seu depoimento",
        subtitle: "Sua avaliação nos ajuda a criar momentos ainda melhores.",
      },
    ],
  },
  {
    id: "b2c-promo-packages",
    name: "B2C Festival de Ofertas LP",
    description:
      "Template dinâmico focado em vendas rápidas de pacotes turísticos com câmbio e contadores.",
    category: "site",
    blocks: [
      {
        id: "promo-fest-hero",
        type: "hero",
        title: "Festival de Viagens TravelOS",
        subtitle:
          "Os destinos mais desejados do mundo com tarifas aéreas promocionais imperdíveis.",
        bg_image_url:
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
        cta_label: "Aproveitar Cupom",
        cta_link: "#cupom",
        layout: "split",
      },
      {
        id: "promo-coupon",
        type: "promotional_banner",
        title: "Use o cupom exclusivo para obter R$ 300 OFF adicional:",
        discount_code: "FESTIVAL300",
      },
      {
        id: "promo-grid",
        type: "tours_grid",
        title: "Próximos Grupos com Vagas Promocionais",
        subtitle: "Valores válidos por tempo limitado.",
        max_items: 6,
      },
      {
        id: "promo-counter",
        type: "live_sales_counter",
        duration_sec: 12,
      },
      {
        id: "promo-currencies",
        type: "currency_calculator",
        title: "Calcule os Gastos no Exterior",
        default_from: "USD",
        default_to: "BRL",
      },
      {
        id: "promo-gateways",
        type: "payment_gateways_display",
        title: "Opções de Parcelamento Sem Juros",
      },
      {
        id: "promo-news-ticker",
        type: "news_announcements_ticker",
        title: "Avisos e Lançamentos Recentes",
        limit: 4,
      },
      {
        id: "promo-newsletter-box",
        type: "biolink_newsletter_box",
        placeholder: "Seu melhor e-mail para receber cupons...",
        button_label: "Garantir Vantagens",
      },
    ],
  },
  {
    id: "travel-agent-digital-card",
    name: "Biolink - Cartão de Consultor Pro",
    description:
      "Biolink focado no consultor de viagens, com dados de perfil, QR Code e WhatsApp flutuante.",
    category: "biolink",
    blocks: [
      {
        id: "ag-card-hdr",
        type: "biolink_header",
        avatar_url:
          "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80",
        name: "Mariana Costa",
        bio: "<p>Sua Especialista em Cruzeiros e Viagens de Luxo</p><p>Mais de 8 anos criando memórias perfeitas.</p>",
        bg_color: "#0F172A",
        text_color: "#FFFFFF",
      },
      {
        id: "ag-card-profile",
        type: "agent_profile_card",
        agent_id: "",
        cta_label: "Agendar Minha Cotação",
      },
      {
        id: "ag-card-bubble",
        type: "whatsapp_floating_bubble",
        agent_id: "",
        position: "right",
        message: "Olá, gostaria de falar sobre roteiros de cruzeiros!",
      },
      {
        id: "ag-card-links",
        type: "biolink_links",
        button_style: "outline",
        button_rounded: "full",
        items: [
          { title: "Ver Próximos Cruzeiros de Grupo", url: "#", icon: "Trip", highlight: true },
          {
            title: "Visitar Nosso Instagram @marianacostatravel",
            url: "https://instagram.com",
            icon: "Insta",
            highlight: false,
          },
        ],
      },
      {
        id: "ag-card-share",
        type: "biolink_qr_code_share",
        title: "Salve ou Compartilhe meu Contato",
      },
    ],
  },
  {
    id: "trip-assistance-hub",
    name: "Biolink - Assistência & Embarque Mobile",
    description:
      "Canal mobile de autoatendimento para passageiros com verificação de vistos, status de voos e upload de documentos.",
    category: "biolink",
    blocks: [
      {
        id: "assist-hdr",
        type: "biolink_header",
        avatar_url:
          "https://images.unsplash.com/photo-1534536281715-e28d76689b4d?auto=format&fit=crop&w=150&q=80",
        name: "Assistência ao Passageiro",
        bio: "<p>Links úteis e consultas rápidas durante o embarque e voo.</p>",
        bg_color: "#F8FAFC",
        text_color: "#0F172A",
      },
      {
        id: "assist-docs",
        type: "client_document_upload",
        title: "Envio de Foto de Documento de Identidade",
        instructions: "Faça upload legível do seu RG ou Passaporte para emissão final de apólices.",
        document_type: "RG",
      },
      {
        id: "assist-visas",
        type: "visa_checker",
        title: "Verificar Regras de Visto por Destino",
        default_nationality: "Brasil",
      },
      {
        id: "assist-flight",
        type: "interactive_flight_tracker",
        title: "Rastrear Status de Voo",
      },
      {
        id: "assist-timeline",
        type: "client_boarding_timeline",
        title: "Cronograma de Embarque Operacional",
      },
      {
        id: "assist-tickets",
        type: "support_ticket_form",
        title: "Abrir Chamado / Reportar Imprevisto",
        subtitle: "Canal direto para atrasos de voo, perdas de conexão ou problemas com hotel.",
      },
    ],
  },
];

export function getTemplateById(id: string): PageTemplate | undefined {
  return CMS_TEMPLATES.find((t) => t.id === id);
}
