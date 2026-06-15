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
        subtitle: "Viagens organizadas nos mínimos detalhes para você e sua família colecionarem momentos inesquecíveis.",
        bg_image_url: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80",
        cta_label: "Ver Próximas Saídas",
        cta_link: "#roteiros",
      },
      {
        id: "features-1",
        type: "features",
        title: "Por que viajar com a gente?",
        items: [
          { icon: "✈️", title: "Roteiros Exclusivos", description: "Destinos planejados por especialistas com curadoria local." },
          { icon: "🛡️", title: "Segurança & Suporte", description: "Seguro viagem premium e guia acompanhante desde o embarque." },
          { icon: "🏨", title: "Hospedagem Selecionada", description: "Hotéis de categoria superior com excelente localização." }
        ],
      },
      {
        id: "tours-grid-1",
        type: "tours_grid",
        title: "Próximas Saídas Confirmadas",
        subtitle: "Escolha seu próximo destino e garanta sua vaga nos grupos.",
        max_items: 6,
      },
      {
        id: "testimonials-1",
        type: "testimonials",
        title: "O que nossos viajantes dizem",
        items: [
          {
            author: "Juliana Mendes",
            role: "Viajou para Itália",
            text: "A viagem foi impecável. Hotéis maravilhosos, guias atenciosos e um grupo super divertido. Já estou planejando a próxima!",
            avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
            stars: 5,
          },
          {
            author: "Marcos Oliveira",
            role: "Viajou para o Jalapão",
            text: "Superou todas as minhas expectativas. O Jalapão é lindo e a agência cuidou de tudo com extrema perfeição e segurança.",
            avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
            stars: 5,
          },
        ],
      },
      {
        id: "faq-1",
        type: "faq",
        title: "Dúvidas Frequentes",
        items: [
          {
            question: "O que está incluso nos pacotes de grupo?",
            answer: "Geralmente incluem passagens aéreas, hotéis com café da manhã, passeios descritos no roteiro, seguro viagem e guia acompanhante.",
          },
          {
            question: "Posso parcelar a minha viagem?",
            answer: "Sim! Oferecemos parcelamento em até 10x sem juros no cartão de crédito, ou através de boleto bancário facilitado até a data da viagem.",
          },
        ],
      },
      {
        id: "cta-1",
        type: "cta",
        title: "Sua Próxima Aventura Começa Agora",
        subtitle: "Fale com um consultor especialista e personalize sua próxima experiência.",
        button_label: "Falar com Consultor",
        button_link: "https://wa.me/5549999999999",
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
        bg_image_url: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80",
        cta_label: "Conhecer Nossa História",
        cta_link: "#historia",
      },
      {
        id: "text-story",
        type: "text",
        content: `<h3>Nossa História</h3><p>Nascemos com a missão de transformar viagens em experiências transformadoras. Acreditamos que viajar é mais do que apenas visitar lugares; é vivenciar novas culturas, saborear novas gastronomias e colecionar lembranças para a vida toda.</p><p>Nossa equipe de consultores é apaixonada por viagens e está sempre em busca dos melhores hotéis, passeios e serviços para garantir que cada cliente tenha um roteiro sob medida e inesquecível.</p>`,
        align: "left",
        image_url: "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=600&q=80",
      },
      {
        id: "stats-2",
        type: "stats",
        title: "Nossa Trajetória em Números",
        items: [
          { value: "10k+", label: "Clientes Atendidos", icon: "😊" },
          { value: "50+", label: "Países Visitados", icon: "🌍" },
          { value: "100%", label: "Suporte Personalizado", icon: "🛡️" },
          { value: "15+", label: "Prêmios de Qualidade", icon: "🏆" },
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
        bg_image_url: "https://images.unsplash.com/photo-1534536281715-e28d76689b4d?auto=format&fit=crop&w=1200&q=80",
        cta_label: "Falar pelo WhatsApp",
        cta_link: "https://wa.me/5549999999999",
      },
      {
        id: "contact-form-block",
        type: "support_ticket_form",
        title: "Abra um Chamado de Suporte",
        subtitle: "Preencha as informações abaixo e nosso time de atendimento entrará em contato em breve.",
      },
      {
        id: "map-location",
        type: "map",
        title: "Nosso Escritório Físico",
        embed_url: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3550.9123847990146!2d-52.618608223689255!3d-27.11142580795493!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94e53e414c77c68b%3A0xc3cf33887d1955c4!2sChapec%C3%B3%2C%20SC!5e0!3m2!1spt-BR!2sbr!4v1718471847683!5m2!1spt-BR!2sbr",
        address_label: "Avenida Getúlio Vargas, 1000 — Centro, Chapecó - SC",
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
        avatar_url: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80",
        name: "Excelência Tour",
        bio: "<p>Agência de Viagens Boutique ✨</p><p>Ajudamos você a explorar o melhor do mundo.</p>",
        bg_color: "#F8FAFC",
        text_color: "#0F172A",
      },
      {
        id: "bio-clean-links",
        type: "biolink_links",
        button_style: "soft",
        button_rounded: "full",
        items: [
          { title: "💬 Falar com um Consultor (WhatsApp)", url: "https://wa.me/5549999999999", icon: "💬", highlight: true },
          { title: "✈️ Próximas Viagens Confirmadas", url: "#", icon: "✈️", highlight: false },
          { title: "🌐 Visitar Nosso Site Oficial", url: "#", icon: "🌐", highlight: false },
        ],
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
        avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
        name: "Excetur Premium",
        bio: "<p>Roteiros Exclusivos e Concierge de Luxo 💎</p><p>Experiências desenhadas sob medida.</p>",
        bg_color: "#0F172A",
        text_color: "#F1F5F9",
      },
      {
        id: "bio-dark-links",
        type: "biolink_links",
        button_style: "outline",
        button_rounded: "md",
        items: [
          { title: "⭐ Solicitar Cotação Personalizada", url: "https://wa.me/5549999999999", icon: "⭐", highlight: true },
          { title: "📸 Acompanhe Nosso Instagram", url: "https://instagram.com", icon: "📸", highlight: false },
          { title: "🏨 Hotéis e Resorts Selecionados", url: "#", icon: "🏨", highlight: false },
        ],
      },
    ],
  },
  {
    id: "hopp-vibrant",
    name: "Biolink - Hopp Vibrant",
    description: "Cores intensas, contraste chamativo e botões estilo pílula com preenchimento sólido.",
    category: "biolink",
    blocks: [
      {
        id: "bio-vibrant-header",
        type: "biolink_header",
        avatar_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
        name: "Mundo Jovem Agência",
        bio: "<p>Especialistas em Mochilões e Viagens de Aventura! 🎒🌲</p><p>Conecte-se com a natureza.</p>",
        bg_color: "#4F46E5",
        text_color: "#FFFFFF",
      },
      {
        id: "bio-vibrant-links",
        type: "biolink_links",
        button_style: "solid",
        button_rounded: "full",
        items: [
          { title: "🎒 Roteiros de Mochilão 2026", url: "#", icon: "🎒", highlight: true },
          { title: "🌲 Ecoturismo & Trekking", url: "#", icon: "🌲", highlight: false },
          { title: "💬 Grupo VIP no Telegram", url: "#", icon: "💬", highlight: false },
        ],
      },
    ],
  },
];

export function getTemplateById(id: string): PageTemplate | undefined {
  return CMS_TEMPLATES.find((t) => t.id === id);
}
