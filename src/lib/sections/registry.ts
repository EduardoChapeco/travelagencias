import { SectionDefinition } from "@/types/builder";

// Default styles, animations and responsive configs
export const DEFAULT_STYLES = {
  paddingTop: 'md',
  paddingBottom: 'md',
  backgroundColor: '#FFFFFF',
  textColor: 'auto',
  backgroundOverlayOpacity: 0.4
} as const;

export const DEFAULT_ANIMATION = {
  enabled: true,
  type: 'fadeInUp',
  delay: 0,
  duration: 600,
  trigger: 'onEnter'
} as const;

export const DEFAULT_RESPONSIVE = {
  hideOnMobile: false,
  hideOnTablet: false,
  mobileColumns: 1,
  tabletColumns: 2
} as const;

export const SECTION_REGISTRY: Record<string, SectionDefinition> = {
  // --- HERO SECTIONS ---
  'hero-fullscreen': {
    type: 'hero-fullscreen',
    label: 'Hero Fullscreen',
    description: 'Hero com foto de fundo em tela cheia, overlay e CTAs.',
    category: 'hero',
    thumbnail: 'hero',
    aiHint: 'Use para a seção inicial de impacto com imagem grande ao fundo.',
    fields: [
      { key: 'image', type: 'image_unsplash', label: 'Imagem de Fundo (Unsplash keyword)', required: true, defaultValue: 'travel paradise' },
      { key: 'overlayOpacity', type: 'number', label: 'Opacidade do Overlay (0 a 1)', required: true, defaultValue: 0.5 },
      { key: 'badgeText', type: 'text', label: 'Texto do Badge', required: false, defaultValue: 'Agência Premiada' },
      { key: 'badgeVisible', type: 'toggle', label: 'Exibir Badge', required: true, defaultValue: true },
      { key: 'headline', type: 'text', label: 'Título Principal (H1)', required: true, defaultValue: 'O destino dos seus sonhos está aqui' },
      { key: 'subtitle', type: 'text', label: 'Subtítulo', required: true, defaultValue: 'Os melhores pacotes e suporte personalizado para sua viagem.' },
      { key: 'cta1_text', type: 'text', label: 'Botão Principal', required: false, defaultValue: 'Fale Conosco' },
      { key: 'cta1_url', type: 'url', label: 'Link Principal', required: false, defaultValue: '#contato' },
      { key: 'cta2_text', type: 'text', label: 'Botão Secundário', required: false, defaultValue: 'Conhecer Roteiros' },
      { key: 'cta2_url', type: 'url', label: 'Link Secundário', required: false, defaultValue: '#roteiros' },
      { key: 'alignment', type: 'select', label: 'Alinhamento', required: true, defaultValue: 'center', options: [{ value: 'left', label: 'Esquerda' }, { value: 'center', label: 'Centralizado' }] }
    ],
    defaultConfig: {
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80',
      overlayOpacity: 0.5,
      badgeText: 'Agência Premiada',
      badgeVisible: true,
      headline: 'O destino dos seus sonhos está aqui',
      subtitle: 'Os melhores pacotes e suporte personalizado para sua viagem.',
      cta1_text: 'Fale Conosco',
      cta1_url: '#contato',
      cta2_text: 'Conhecer Roteiros',
      cta2_url: '#roteiros',
      alignment: 'center'
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeIn' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'hero-split': {
    type: 'hero-split',
    label: 'Hero Dividido',
    description: 'Layout 50/50 ou 60/40 com texto de um lado e imagem de outro.',
    category: 'hero',
    thumbnail: 'hero',
    aiHint: 'Use para uma apresentação moderna de hero com imagem em destaque na lateral.',
    fields: [
      { key: 'badgeText', type: 'text', label: 'Texto do Badge', required: false, defaultValue: 'Descubra o Mundo' },
      { key: 'badgeColor', type: 'color', label: 'Cor do Badge', required: false, defaultValue: '#E63946' },
      { key: 'headline', type: 'text', label: 'Título', required: true, defaultValue: 'Planeje sua próxima grande aventura' },
      { key: 'paragraph', type: 'text', label: 'Texto de Apoio', required: true, defaultValue: 'Roteiros elaborados por quem entende de viagem, com segurança e suporte completo.' },
      { key: 'cta1_text', type: 'text', label: 'Botão Principal', required: false, defaultValue: 'Começar Agora' },
      { key: 'cta1_url', type: 'url', label: 'Link Principal', required: false, defaultValue: '#contato' },
      { key: 'cta2_text', type: 'text', label: 'Botão Secundário', required: false, defaultValue: 'Ver Destinos' },
      { key: 'cta2_url', type: 'url', label: 'Link Secundário', required: false, defaultValue: '#destinos' },
      { key: 'layout', type: 'select', label: 'Posição do Texto', required: true, defaultValue: 'text-left', options: [{ value: 'text-left', label: 'Texto à Esquerda' }, { value: 'text-right', label: 'Texto à Direita' }] },
      { key: 'ratio', type: 'select', label: 'Proporção', required: true, defaultValue: '50/50', options: [{ value: '50/50', label: '50/50' }, { value: '60/40', label: '60/40' }] },
      { key: 'imageMain', type: 'image_unsplash', label: 'Imagem Principal', required: true, defaultValue: 'hotel room view' },
      { key: 'imageSecondary', type: 'image_unsplash', label: 'Imagem Secundária (Opcional)', required: false, defaultValue: 'swimming pool' },
      { key: 'imageBorderRadius', type: 'select', label: 'Arredondamento da Imagem', required: true, defaultValue: 'rounded-2xl', options: [{ value: 'rounded-none', label: 'Sem borda' }, { value: 'rounded-lg', label: 'Suave' }, { value: 'rounded-2xl', label: 'Acentuado' }, { value: 'rounded-full', label: 'Circular' }] }
    ],
    defaultConfig: {
      badgeText: 'Descubra o Mundo',
      badgeColor: '#E63946',
      headline: 'Planeje sua próxima grande aventura',
      paragraph: 'Roteiros elaborados por quem entende de viagem, com segurança e suporte completo.',
      cta1_text: 'Começar Agora',
      cta1_url: '#contato',
      cta2_text: 'Ver Destinos',
      cta2_url: '#destinos',
      layout: 'text-left',
      ratio: '50/50',
      imageMain: 'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=800&q=80',
      imageSecondary: '',
      imageBorderRadius: 'rounded-2xl'
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeInUp' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'hero-gradient': {
    type: 'hero-gradient',
    label: 'Hero Aurora Gradient',
    description: 'Background em gradiente com um mockup de dispositivo flutuando.',
    category: 'hero',
    thumbnail: 'hero',
    aiHint: 'Use para dar um visual moderno, tecnológico e clean ao site.',
    fields: [
      { key: 'color1', type: 'color', label: 'Cor Inicial do Gradiente', required: true, defaultValue: '#1E3A5F' },
      { key: 'color2', type: 'color', label: 'Cor Final do Gradiente', required: true, defaultValue: '#D4AF37' },
      { key: 'gradientDirection', type: 'select', label: 'Direção do Gradiente', required: true, defaultValue: 'to-r', options: [{ value: 'to-r', label: 'Horizontal' }, { value: 'to-b', label: 'Vertical' }, { value: 'to-br', label: 'Diagonal' }] },
      { key: 'headline', type: 'text', label: 'Título', required: true, defaultValue: 'Sua viagem completa na palma da mão' },
      { key: 'subtitle', type: 'text', label: 'Subtítulo', required: true, defaultValue: 'Acompanhe seu roteiro, passagens e suporte da nossa agência em tempo real.' },
      { key: 'cta1_text', type: 'text', label: 'Botão Principal', required: false, defaultValue: 'Acessar Painel' },
      { key: 'cta1_url', type: 'url', label: 'Link Principal', required: false, defaultValue: '#login' },
      { key: 'deviceType', type: 'select', label: 'Tipo de Mockup', required: true, defaultValue: 'phone', options: [{ value: 'phone', label: 'Celular' }, { value: 'tablet', label: 'Tablet' }, { value: 'laptop', label: 'Notebook' }, { value: 'none', label: 'Sem Mockup' }] },
      { key: 'deviceImage', type: 'image_unsplash', label: 'Imagem da Tela', required: false, defaultValue: 'travel dashboard' }
    ],
    defaultConfig: {
      color1: '#1E3A5F',
      color2: '#D4AF37',
      gradientDirection: 'to-br',
      headline: 'Sua viagem completa na palma da mão',
      subtitle: 'Acompanhe seu roteiro, passagens e suporte da nossa agência em tempo real.',
      cta1_text: 'Acessar Painel',
      cta1_url: '#login',
      deviceType: 'phone',
      deviceImage: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=600&q=80'
    },
    defaultStyles: { ...DEFAULT_STYLES, backgroundColor: 'transparent' },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeInUp' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'hero-dark': {
    type: 'hero-dark',
    label: 'Hero Dark Premium',
    description: 'Visual noturno escuro com elementos neon flutuando.',
    category: 'hero',
    thumbnail: 'hero',
    aiHint: 'Excelente para agências de turismo de luxo com paleta premium preta/dourada.',
    fields: [
      { key: 'backgroundColor', type: 'color', label: 'Cor de Fundo', required: true, defaultValue: '#0A0A0A' },
      { key: 'badgeText', type: 'text', label: 'Texto do Badge', required: false, defaultValue: 'Viagens de Luxo' },
      { key: 'badgeColor', type: 'color', label: 'Cor do Badge', required: false, defaultValue: '#D4AF37' },
      { key: 'headline', type: 'text', label: 'Título', required: true, defaultValue: 'Experiências exclusivas e sob medida' },
      { key: 'subtitle', type: 'text', label: 'Subtítulo', required: true, defaultValue: 'Roteiros privativos de alto padrão para os viajantes mais exigentes.' },
      { key: 'cta_text', type: 'text', label: 'Botão Principal', required: false, defaultValue: 'Solicitar Consultoria' },
      { key: 'cta_url', type: 'url', label: 'Link Principal', required: false, defaultValue: '#contato' },
      { key: 'centralImage', type: 'image_unsplash', label: 'Imagem Central', required: true, defaultValue: 'private yacht' },
      { key: 'floatingIcons', type: 'toggle', label: 'Ícones Flutuantes', required: true, defaultValue: true },
      { key: 'accentColor', type: 'color', label: 'Cor de Destaque', required: true, defaultValue: '#D4AF37' }
    ],
    defaultConfig: {
      backgroundColor: '#0A0A0A',
      badgeText: 'Viagens de Luxo',
      badgeColor: '#D4AF37',
      headline: 'Experiências exclusivas e sob medida',
      subtitle: 'Roteiros privativos de alto padrão para os viajantes mais exigentes.',
      cta_text: 'Solicitar Consultoria',
      cta_url: '#contato',
      centralImage: 'https://images.unsplash.com/photo-1567818735868-e71b99932e29?auto=format&fit=crop&w=800&q=80',
      floatingIcons: true,
      accentColor: '#D4AF37'
    },
    defaultStyles: { ...DEFAULT_STYLES, backgroundColor: '#0A0A0A', textColor: 'light' },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeIn' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'hero-travel': {
    type: 'hero-travel',
    label: 'Hero com Busca de Viagem',
    description: 'Fullscreen com formulário integrado para pesquisar destinos, datas e passageiros.',
    category: 'hero',
    thumbnail: 'hero',
    aiHint: 'Use como página inicial padrão para portais focados em vendas de pacotes de turismo.',
    fields: [
      { key: 'backgroundImage', type: 'image_unsplash', label: 'Imagem de Fundo', required: true, defaultValue: 'adventure mountain travel' },
      { key: 'overlayOpacity', type: 'number', label: 'Opacidade do Overlay', required: true, defaultValue: 0.4 },
      { key: 'headline', type: 'text', label: 'Título', required: true, defaultValue: 'Encontre sua próxima experiência' },
      { key: 'subtitle', type: 'text', label: 'Subtítulo', required: true, defaultValue: 'Roteiros exclusivos, cruzeiros e resorts com tarifas especiais.' },
      { key: 'searchBarVisible', type: 'toggle', label: 'Exibir Barra de Busca', required: true, defaultValue: true },
      { key: 'searchButtonText', type: 'text', label: 'Texto do Botão Buscar', required: true, defaultValue: 'Pesquisar Viagens' },
      { key: 'searchButtonActionUrl', type: 'url', label: 'URL de Ação do Botão', required: true, defaultValue: '#roteiros' }
    ],
    defaultConfig: {
      backgroundImage: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1920&q=80',
      overlayOpacity: 0.4,
      headline: 'Encontre sua próxima experiência',
      subtitle: 'Roteiros exclusivos, cruzeiros e resorts com tarifas especiais.',
      searchBarVisible: true,
      searchButtonText: 'Pesquisar Viagens',
      searchButtonActionUrl: '#roteiros'
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeIn' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'hero-bento': {
    type: 'hero-bento',
    label: 'Hero Bento Grid',
    description: 'Texto à esquerda e grid assimétrico bento de fotos e estatísticas à direita.',
    category: 'hero',
    thumbnail: 'hero',
    aiHint: 'Excelente para agências modernas que querem expor fotos de destinos e números juntos no hero.',
    fields: [
      { key: 'headline', type: 'text', label: 'Título', required: true, defaultValue: 'Viagens inesquecíveis organizadas para você' },
      { key: 'subtitle', type: 'text', label: 'Subtítulo', required: true, defaultValue: 'Escolha seu destino e nós cuidamos de toda a burocracia.' },
      { key: 'ctaText', type: 'text', label: 'Botão Principal', required: false, defaultValue: 'Falar com Consultor' },
      { key: 'ctaUrl', type: 'url', label: 'Link Principal', required: false, defaultValue: '#contato' },
      {
        key: 'metrics', type: 'list', label: 'Métricas Rápidas', required: false, defaultValue: [
          { label: 'Clientes Satisfeitos', value: '2.000+' },
          { label: 'Destinos Atendidos', value: '50+' }
        ]
      },
      {
        key: 'bentoCells', type: 'list', label: 'Células Bento (Máx 4)', required: true, defaultValue: [
          { type: 'image', value: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80' },
          { type: 'stat', value: '15+', label: 'Anos no mercado' },
          { type: 'image', value: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80' }
        ]
      }
    ],
    defaultConfig: {
      headline: 'Viagens inesquecíveis organizadas para você',
      subtitle: 'Escolha seu destino e nós cuidamos de toda a burocracia.',
      ctaText: 'Falar com Consultor',
      ctaUrl: '#contato',
      metrics: [
        { label: 'Clientes Satisfeitos', value: '2.000+' },
        { label: 'Destinos Atendidos', value: '50+' }
      ],
      bentoCells: [
        { type: 'image', value: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80' },
        { type: 'stat', value: '15+', label: 'Anos no mercado' },
        { type: 'image', value: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80' }
      ]
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeInUp' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'hero-minimal': {
    type: 'hero-minimal',
    label: 'Hero Minimalista Tipográfico',
    description: 'Design limpo focado em tipografia gigante, sem imagem de fundo.',
    category: 'hero',
    thumbnail: 'hero',
    aiHint: 'Para páginas institucionais com design elegante e minimalista.',
    fields: [
      { key: 'headline', type: 'text', label: 'Título Principal', required: true, defaultValue: 'Viaje sem preocupações.' },
      { key: 'accentWord', type: 'text', label: 'Palavra de Destaque (Brand Color)', required: false, defaultValue: 'Com segurança.' },
      { key: 'subtitle', type: 'text', label: 'Subtítulo', required: true, defaultValue: 'Nossa agência de viagens cuida de cada detalhe da sua estadia, voo e passeios.' },
      { key: 'cta1_text', type: 'text', label: 'Botão Principal', required: false, defaultValue: 'Ver Serviços' },
      { key: 'cta1_url', type: 'url', label: 'Link Principal', required: false, defaultValue: '#servicos' },
      { key: 'cta2_text', type: 'text', label: 'Botão Secundário', required: false, defaultValue: 'Contatos' },
      { key: 'cta2_url', type: 'url', label: 'Link Secundário', required: false, defaultValue: '#contato' }
    ],
    defaultConfig: {
      headline: 'Viaje sem preocupações.',
      accentWord: 'Com segurança.',
      subtitle: 'Nossa agência de viagens cuida de cada detalhe da sua estadia, voo e passeios.',
      cta1_text: 'Ver Serviços',
      cta1_url: '#servicos',
      cta2_text: 'Contatos',
      cta2_url: '#contato'
    },
    defaultStyles: { ...DEFAULT_STYLES, backgroundColor: '#FAFAFA' },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeInUp' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  // --- DESTINATION SECTIONS ---
  'destinations-grid': {
    type: 'destinations-grid',
    label: 'Grade de Destinos',
    description: 'Grid elegante de cards de destinos com zoom ao passar o mouse.',
    category: 'destinations',
    thumbnail: 'destinations',
    aiHint: 'Use para mostrar uma seleção de lugares com fotos bonitas em cards.',
    fields: [
      { key: 'sectionLabel', type: 'text', label: 'Rótulo do Cabeçalho', required: false, defaultValue: 'Nossas Recomendações' },
      { key: 'sectionTitle', type: 'text', label: 'Título da Seção', required: true, defaultValue: 'Destinos em Destaque' },
      { key: 'sectionDescription', type: 'text', label: 'Descrição da Seção', required: false, defaultValue: 'Escolha o local ideal para sua próxima viagem com tarifas promocionais.' },
      { key: 'columns', type: 'select', label: 'Colunas no Desktop', required: true, defaultValue: '3', options: [{ value: '3', label: '3 Colunas' }, { value: '4', label: '4 Colunas' }] },
      { key: 'showPrices', type: 'toggle', label: 'Exibir Preço nos Cards', required: true, defaultValue: true },
      { key: 'showRatings', type: 'toggle', label: 'Exibir Estrelas de Avaliação', required: true, defaultValue: true },
      { key: 'ctaText', type: 'text', label: 'Texto do Botão Geral', required: false, defaultValue: 'Ver Todos os Destinos' },
      { key: 'ctaUrl', type: 'url', label: 'Link do Botão Geral', required: false, defaultValue: '#todos' },
      {
        key: 'items', type: 'list', label: 'Lista de Destinos', required: true, defaultValue: [
          { image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=500&q=80', country: 'França', name: 'Paris', rating: 5, price: 'A partir de R$ 5.490', link: '#contato' },
          { image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=500&q=80', country: 'Grécia', name: 'Santorini', rating: 5, price: 'A partir de R$ 7.900', link: '#contato' },
          { image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=500&q=80', country: 'Caribe', name: 'Bahamas', rating: 4, price: 'A partir de R$ 6.200', link: '#contato' }
        ]
      }
    ],
    defaultConfig: {
      sectionLabel: 'Nossas Recomendações',
      sectionTitle: 'Destinos em Destaque',
      sectionDescription: 'Escolha o local ideal para sua próxima viagem com tarifas promocionais.',
      columns: '3',
      showPrices: true,
      showRatings: true,
      ctaText: 'Ver Todos os Destinos',
      ctaUrl: '#todos',
      items: [
        { image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=500&q=80', country: 'França', name: 'Paris', rating: 5, price: 'A partir de R$ 5.490', link: '#contato' },
        { image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=500&q=80', country: 'Grécia', name: 'Santorini', rating: 5, price: 'A partir de R$ 7.900', link: '#contato' },
        { image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=500&q=80', country: 'Caribe', name: 'Bahamas', rating: 4, price: 'A partir de R$ 6.200', link: '#contato' }
      ]
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeInUp' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'destinations-carousel': {
    type: 'destinations-carousel',
    label: 'Carrossel de Destinos',
    description: 'Slider responsivo horizontal de cards de destino com setas e autoplay.',
    category: 'destinations',
    thumbnail: 'destinations',
    aiHint: 'Ideal para mostrar uma lista longa de destinos ocupando pouco espaço vertical.',
    fields: [
      { key: 'sectionLabel', type: 'text', label: 'Rótulo', required: false, defaultValue: 'Para Onde Ir?' },
      { key: 'sectionTitle', type: 'text', label: 'Título', required: true, defaultValue: 'Roteiros Mais Procurados' },
      { key: 'autoplay', type: 'toggle', label: 'Autoplay Ativo', required: true, defaultValue: true },
      { key: 'autoplaySpeed', type: 'number', label: 'Velocidade do Autoplay (ms)', required: true, defaultValue: 3000 },
      {
        key: 'items', type: 'list', label: 'Lista de Destinos', required: true, defaultValue: [
          { image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=500&q=80', country: 'França', name: 'Paris', rating: 5, price: 'R$ 5.490', link: '#contato' },
          { image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=500&q=80', country: 'Grécia', name: 'Santorini', rating: 5, price: 'R$ 7.900', link: '#contato' },
          { image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=500&q=80', country: 'Caribe', name: 'Bahamas', rating: 5, price: 'R$ 6.200', link: '#contato' },
          { image: 'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=500&q=80', country: 'Japão', name: 'Tóquio', rating: 5, price: 'R$ 8.900', link: '#contato' }
        ]
      }
    ],
    defaultConfig: {
      sectionLabel: 'Para Onde Ir?',
      sectionTitle: 'Roteiros Mais Procurados',
      autoplay: true,
      autoplaySpeed: 3000,
      items: [
        { image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=500&q=80', country: 'França', name: 'Paris', rating: 5, price: 'R$ 5.490', link: '#contato' },
        { image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=500&q=80', country: 'Grécia', name: 'Santorini', rating: 5, price: 'R$ 7.900', link: '#contato' },
        { image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=500&q=80', country: 'Caribe', name: 'Bahamas', rating: 5, price: 'R$ 6.200', link: '#contato' },
        { image: 'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=500&q=80', country: 'Japão', name: 'Tóquio', rating: 5, price: 'R$ 8.900', link: '#contato' }
      ]
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeIn' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'destinations-slider-film': {
    type: 'destinations-slider-film',
    label: 'Slider Cinematográfico',
    description: 'Layout editorial com texto fixo à esquerda e 3 cards verticais altos em leque à direita.',
    category: 'destinations',
    thumbnail: 'destinations',
    aiHint: 'Perfeito para sites premium e agências de boutique com visual muito sofisticado.',
    fields: [
      { key: 'badgeText', type: 'text', label: 'Badge Superior', required: false, defaultValue: 'Destinos de Destaque' },
      { key: 'headline', type: 'text', label: 'Título Grande', required: true, defaultValue: 'Lugares Históricos' },
      { key: 'subtitle', type: 'text', label: 'Subtítulo', required: true, defaultValue: 'Explore destinos ricos em cultura, gastronomia e tradições seculares.' },
      { key: 'ctaText', type: 'text', label: 'Texto do Botão', required: false, defaultValue: 'Explorar' },
      { key: 'color1', type: 'color', label: 'Cor de Fundo 1', required: true, defaultValue: '#FFEBE7' },
      { key: 'color2', type: 'color', label: 'Cor de Fundo 2', required: true, defaultValue: '#FFFFFF' },
      { key: 'counterVisible', type: 'toggle', label: 'Exibir Contador numérico', required: true, defaultValue: true },
      {
        key: 'items', type: 'list', label: 'Cards de Viagem (Filmstrip)', required: true, defaultValue: [
          { image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80', city: 'Paris', country: 'França' },
          { image: 'https://images.unsplash.com/photo-1520175480921-4edfa2983e0f?auto=format&fit=crop&w=600&q=80', city: 'Roma', country: 'Itália' },
          { image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80', city: 'Kyoto', country: 'Japão' }
        ]
      }
    ],
    defaultConfig: {
      badgeText: 'Destinos de Destaque',
      headline: 'Lugares Históricos',
      subtitle: 'Explore destinos ricos em cultura, gastronomia e tradições seculares.',
      ctaText: 'Explorar',
      color1: '#FFEBE7',
      color2: '#FFFFFF',
      counterVisible: true,
      items: [
        { image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80', city: 'Paris', country: 'França' },
        { image: 'https://images.unsplash.com/photo-1520175480921-4edfa2983e0f?auto=format&fit=crop&w=600&q=80', city: 'Roma', country: 'Itália' },
        { image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80', city: 'Kyoto', country: 'Japão' }
      ]
    },
    defaultStyles: { ...DEFAULT_STYLES, backgroundColor: 'transparent' },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeInRight' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'destinations-bento': {
    type: 'destinations-bento',
    label: 'Destinos Bento Grid',
    description: 'Grid assimétrico com 1 card grande em destaque e 4 cards menores nas laterais.',
    category: 'destinations',
    thumbnail: 'destinations',
    aiHint: 'Use para mostrar um destaque principal de viagens ao lado de outros destinos menores.',
    fields: [
      { key: 'sectionTitle', type: 'text', label: 'Título da Seção', required: true, defaultValue: 'Explore Nossos Destinos' },
      { key: 'sectionDescription', type: 'text', label: 'Descrição', required: false, defaultValue: 'As melhores escolhas de viagem avaliadas pela nossa equipe.' },
      {
        key: 'items', type: 'list', label: 'Cards (Mín 3, Recomendado 5)', required: true, defaultValue: [
          { image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=700&q=80', name: 'França & Europa', details: 'Destaque especial da temporada', link: '#contato' },
          { image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=400&q=80', name: 'Grécia', details: 'A partir de R$ 7.200', link: '#contato' },
          { image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80', name: 'Bahamas', details: 'Frente ao mar', link: '#contato' },
          { image: 'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=400&q=80', name: 'Tóquio', details: 'Pacotes B2B', link: '#contato' },
          { image: 'https://images.unsplash.com/photo-1520175480921-4edfa2983e0f?auto=format&fit=crop&w=400&q=80', name: 'Roma', details: 'História e cultura', link: '#contato' }
        ]
      }
    ],
    defaultConfig: {
      sectionTitle: 'Explore Nossos Destinos',
      sectionDescription: 'As melhores escolhas de viagem avaliadas pela nossa equipe.',
      items: [
        { image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=700&q=80', name: 'França & Europa', details: 'Destaque especial da temporada', link: '#contato' },
        { image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=400&q=80', name: 'Grécia', details: 'A partir de R$ 7.200', link: '#contato' },
        { image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80', name: 'Bahamas', details: 'Frente ao mar', link: '#contato' },
        { image: 'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=400&q=80', name: 'Tóquio', details: 'Pacotes B2B', link: '#contato' },
        { image: 'https://images.unsplash.com/photo-1520175480921-4edfa2983e0f?auto=format&fit=crop&w=400&q=80', name: 'Roma', details: 'História e cultura', link: '#contato' }
      ]
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeInUp' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'package-cards': {
    type: 'package-cards',
    label: 'Cards de Pacotes Completos',
    description: 'Cards estruturados de viagem com preço, tag de inclusões (aéreo, hotel, guia) e duração.',
    category: 'destinations',
    thumbnail: 'destinations',
    aiHint: 'Use para vender pacotes comerciais de viagem que listam inclusões de serviços e preços.',
    fields: [
      { key: 'sectionTitle', type: 'text', label: 'Título', required: true, defaultValue: 'Pacotes de Viagem Recomendados' },
      { key: 'sectionDescription', type: 'text', label: 'Descrição', required: false, defaultValue: 'Viagens completas com passagens, hospedagem e passeios inclusos.' },
      { key: 'columns', type: 'select', label: 'Colunas', required: true, defaultValue: '3', options: [{ value: '2', label: '2 Colunas' }, { value: '3', label: '3 Colunas' }, { value: '4', label: '4 Colunas' }] },
      { key: 'showOriginalPrice', type: 'toggle', label: 'Exibir Preço Riscado (De)', required: true, defaultValue: true },
      {
        key: 'items', type: 'list', label: 'Lista de Pacotes', required: true, defaultValue: [
          { image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80', badge: 'Mais Vendido', title: 'Europa Clássica Especial', inclusions: 'Voo, Hotel, Guia', duration: '12 Dias / 10 Noites', priceOriginal: 'R$ 12.990', priceCurrent: 'R$ 9.990', link: '#contato' },
          { image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80', badge: 'Super Desconto', title: 'Caribe All Inclusive', inclusions: 'Voo, Hotel, Resort', duration: '7 Dias / 6 Noites', priceOriginal: 'R$ 6.900', priceCurrent: 'R$ 4.890', link: '#contato' },
          { image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=600&q=80', badge: 'Roteiro Exclusivo', title: 'Grécia Incrível & Atenas', inclusions: 'Hotel, Guia, Passeios', duration: '9 Dias / 8 Noites', priceOriginal: 'R$ 11.200', priceCurrent: 'R$ 8.900', link: '#contato' }
        ]
      }
    ],
    defaultConfig: {
      sectionTitle: 'Pacotes de Viagem Recomendados',
      sectionDescription: 'Viagens completas com passagens, hospedagem e passeios inclusos.',
      columns: '3',
      showOriginalPrice: true,
      items: [
        { image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80', badge: 'Mais Vendido', title: 'Europa Clássica Especial', inclusions: 'Voo, Hotel, Guia', duration: '12 Dias / 10 Noites', priceOriginal: 'R$ 12.990', priceCurrent: 'R$ 9.990', link: '#contato' },
        { image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80', badge: 'Super Desconto', title: 'Caribe All Inclusive', inclusions: 'Voo, Hotel, Resort', duration: '7 Dias / 6 Noites', priceOriginal: 'R$ 6.900', priceCurrent: 'R$ 4.890', link: '#contato' },
        { image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=600&q=80', badge: 'Roteiro Exclusivo', title: 'Grécia Incrível & Atenas', inclusions: 'Hotel, Guia, Passeios', duration: '9 Dias / 8 Noites', priceOriginal: 'R$ 11.200', priceCurrent: 'R$ 8.900', link: '#contato' }
      ]
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeInUp' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'travel-bento-promo': {
    type: 'travel-bento-promo',
    label: 'Bento Widget Promocional',
    description: 'Grid bento com widget de clima, widget de ofertas de até 50% e newsletter.',
    category: 'destinations',
    thumbnail: 'destinations',
    aiHint: 'Excelente para uma seção rica no meio do site que promove interação e captura leads.',
    fields: [
      { key: 'promoTitle', type: 'text', label: 'Título do Destaque', required: true, defaultValue: 'Promoções de Temporada' },
      { key: 'discountText', type: 'text', label: 'Texto de Desconto', required: true, defaultValue: 'Até 50% de Desconto' },
      { key: 'promoDestination', type: 'text', label: 'Destino em Oferta', required: true, defaultValue: 'Cruzeiros no Atlântico' },
      { key: 'promoImage', type: 'image_unsplash', label: 'Imagem de Destaque', required: true, defaultValue: 'cruise ship atlantic ocean' },
      { key: 'newsTitle', type: 'text', label: 'Título Newsletter', required: true, defaultValue: 'Quer receber alertas de preço?' }
    ],
    defaultConfig: {
      promoTitle: 'Promoções de Temporada',
      discountText: 'Até 50% de Desconto',
      promoDestination: 'Cruzeiros no Atlântico',
      promoImage: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=600&q=80',
      newsTitle: 'Quer receber alertas de preço?'
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeInUp' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  // --- CONTENT SECTIONS ---
  'features-grid': {
    type: 'features-grid',
    label: 'Diferenciais Grid',
    description: 'Lista de diferenciais da agência com ícones e títulos em grade.',
    category: 'content',
    thumbnail: 'content',
    aiHint: 'Use para a seção "Por que escolher nossa agência?".',
    fields: [
      { key: 'sectionTitle', type: 'text', label: 'Título', required: true, defaultValue: 'Nossos Diferenciais' },
      { key: 'sectionDescription', type: 'text', label: 'Descrição', required: false, defaultValue: 'Garantimos tranquilidade em cada etapa do seu roteiro.' },
      { key: 'columns', type: 'select', label: 'Colunas', required: true, defaultValue: '3', options: [{ value: '3', label: '3 Colunas' }, { value: '4', label: '4 Colunas' }] },
      { key: 'cardStyle', type: 'select', label: 'Estilo dos Cards', required: true, defaultValue: 'bordered', options: [{ value: 'bordered', label: 'Com Borda' }, { value: 'minimal', label: 'Minimalista' }, { value: 'tinted', label: 'Fundo Suave' }] },
      {
        key: 'items', type: 'list', label: 'Diferenciais', required: true, defaultValue: [
          { icon: 'vip', title: 'Consultoria Exclusiva', description: 'Consultores experientes dedicados a planejar seu roteiro de ponta a ponta.' },
          { icon: 'safe', title: 'Suporte 24h em Viagem', description: 'Atendimento de emergência em português para qualquer eventualidade.' },
          { icon: 'care', title: 'Parcerias Premium', description: 'Tarifas negociadas e upgrades exclusivos nos melhores hotéis do mundo.' }
        ]
      }
    ],
    defaultConfig: {
      sectionTitle: 'Nossos Diferenciais',
      sectionDescription: 'Garantimos tranquilidade em cada etapa do seu roteiro.',
      columns: '3',
      cardStyle: 'bordered',
      items: [
        { icon: 'vip', title: 'Consultoria Exclusiva', description: 'Consultores experientes dedicados a planejar seu roteiro de ponta a ponta.' },
        { icon: 'safe', title: 'Suporte 24h em Viagem', description: 'Atendimento de emergência em português para qualquer eventualidade.' },
        { icon: 'care', title: 'Parcerias Premium', description: 'Tarifas negociadas e upgrades exclusivos nos melhores hotéis do mundo.' }
      ]
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeInUp' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'features-bento': {
    type: 'features-bento',
    label: 'Diferenciais Bento',
    description: 'Grid bento assimétrico moderno para os diferenciais da empresa.',
    category: 'content',
    thumbnail: 'content',
    aiHint: 'Excelente para uma exibição visualmente marcante de diferenciais.',
    fields: [
      { key: 'sectionTitle', type: 'text', label: 'Título Principal', required: true, defaultValue: 'Como Cuidamos de Você' },
      {
        key: 'items', type: 'list', label: 'Lista de Features (Recomendado 4)', required: true, defaultValue: [
          { icon: 'vip', title: 'Hotéis Selecionados', description: 'Apenas hotéis inspecionados com alta pontuação de higiene e localização.' },
          { icon: 'safe', title: 'Seguro Viagem Completo', description: 'Seguro incluso nos pacotes com cobertura para bagagens, cancelamento e despesas médicas.' },
          { icon: 'care', title: 'Roteiro 100% sob medida', description: 'Fazemos tudo de acordo com suas preferências e ritmo.' },
          { icon: 'world', title: 'Guias Locais Credenciados', description: 'Passeios acompanhados de profissionais credenciados que falam seu idioma.' }
        ]
      }
    ],
    defaultConfig: {
      sectionTitle: 'Como Cuidamos de Você',
      items: [
        { icon: 'vip', title: 'Hotéis Selecionados', description: 'Apenas hotéis inspecionados com alta pontuação de higiene e localização.' },
        { icon: 'safe', title: 'Seguro Viagem Completo', description: 'Seguro incluso nos pacotes com cobertura para bagagens, cancelamento e despesas médicas.' },
        { icon: 'care', title: 'Roteiro 100% sob medida', description: 'Fazemos tudo de acordo com suas preferências e ritmo.' },
        { icon: 'world', title: 'Guias Locais Credenciados', description: 'Passeios acompanhados de profissionais credenciados que falam seu idioma.' }
      ]
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeInUp' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'features-numbered': {
    type: 'features-numbered',
    label: 'Diferenciais Numerados',
    description: 'Itens numerados (01, 02, 03) dispostos em formato editorial com opção de zebra layout (imagem alternada).',
    category: 'content',
    thumbnail: 'content',
    aiHint: 'Ótimo para explicar um passo a passo (ex: Como funciona nosso processo de consultoria).',
    fields: [
      { key: 'sectionTitle', type: 'text', label: 'Título', required: true, defaultValue: 'Passo a Passo de Criação' },
      { key: 'zebraLayout', type: 'toggle', label: 'Zebra Layout (Inverter Lados)', required: true, defaultValue: true },
      {
        key: 'items', type: 'list', label: 'Passos', required: true, defaultValue: [
          { title: 'Reunião de Diagnóstico', description: 'Conversamos sobre suas expectativas, orçamento e datas preferidas.', image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80' },
          { title: 'Primeira Versão do Roteiro', description: 'Apresentamos uma proposta digital detalhada com custos de aéreo, hotéis e passeios.', image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80' },
          { title: 'Ajustes e Emissões', description: 'Após sua aprovação, emitimos os vouchers e preparamos seu kit de viagem digital.', image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80' }
        ]
      }
    ],
    defaultConfig: {
      sectionTitle: 'Passo a Passo de Criação',
      zebraLayout: true,
      items: [
        { title: 'Reunião de Diagnóstico', description: 'Conversamos sobre suas expectativas, orçamento e datas preferidas.', image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80' },
        { title: 'Primeira Versão do Roteiro', description: 'Apresentamos uma proposta digital detalhada com custos de aéreo, hotéis e passeios.', image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80' },
        { title: 'Ajustes e Emissões', description: 'Após sua aprovação, emitimos os vouchers e preparamos seu kit de viagem digital.', image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80' }
      ]
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeInUp' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'stats-strip': {
    type: 'stats-strip',
    label: 'Faixa de Estatísticas',
    description: 'Faixa horizontal compacta exibindo números e estatísticas de conquistas.',
    category: 'content',
    thumbnail: 'content',
    aiHint: 'Excelente para validação social rápida e autoridade no mercado.',
    fields: [
      { key: 'backgroundStyle', type: 'select', label: 'Estilo do Fundo', required: true, defaultValue: 'brand', options: [{ value: 'brand', label: 'Cor da Marca' }, { value: 'dark', label: 'Escuro' }, { value: 'white', label: 'Branco' }] },
      {
        key: 'items', type: 'list', label: 'Estatísticas (3 a 5)', required: true, defaultValue: [
          { value: '500', suffix: '+', label: 'Viagens Realizadas' },
          { value: '2500', suffix: '+', label: 'Clientes Satisfeitos' },
          { value: '15', suffix: ' anos', label: 'No Mercado de Turismo' }
        ]
      }
    ],
    defaultConfig: {
      backgroundStyle: 'brand',
      items: [
        { value: '500', suffix: '+', label: 'Viagens Realizadas' },
        { value: '2500', suffix: '+', label: 'Clientes Satisfeitos' },
        { value: '15', suffix: ' anos', label: 'No Mercado de Turismo' }
      ]
    },
    defaultStyles: { ...DEFAULT_STYLES, backgroundColor: 'transparent' },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'countUp' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'brands-logos': {
    type: 'brands-logos',
    label: 'Logos de Parceiros',
    description: 'Carrossel infinito (marquee) ou grid de logos de parceiros/hotéis/companhias aéreas.',
    category: 'content',
    thumbnail: 'content',
    aiHint: 'Use para mostrar credenciais de parceiros confiáveis (ex: hotéis, companhias aéreas).',
    fields: [
      { key: 'sectionTitle', type: 'text', label: 'Título', required: false, defaultValue: 'Trabalhamos com as Melhores Marcas' },
      { key: 'mode', type: 'select', label: 'Modo de Exibição', required: true, defaultValue: 'marquee', options: [{ value: 'marquee', label: 'Carrossel Contínuo' }, { value: 'grid', label: 'Grid Estático' }] },
      { key: 'gridColumns', type: 'select', label: 'Colunas no Grid', required: true, defaultValue: '4', options: [{ value: '3', label: '3 Colunas' }, { value: '4', label: '4 Colunas' }, { value: '6', label: '6 Colunas' }] },
      {
        key: 'items', type: 'list', label: 'Logos', required: true, defaultValue: [
          { logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=150&h=80&q=80', altText: 'Marca 1' },
          { logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=150&h=80&q=80', altText: 'Marca 2' },
          { logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=150&h=80&q=80', altText: 'Marca 3' },
          { logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=150&h=80&q=80', altText: 'Marca 4' }
        ]
      }
    ],
    defaultConfig: {
      sectionTitle: 'Trabalhamos com as Melhores Marcas',
      mode: 'marquee',
      gridColumns: '4',
      items: [
        { logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=150&h=80&q=80', altText: 'Marca 1' },
        { logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=150&h=80&q=80', altText: 'Marca 2' },
        { logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=150&h=80&q=80', altText: 'Marca 3' },
        { logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=150&h=80&q=80', altText: 'Marca 4' }
      ]
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeIn' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'about-split': {
    type: 'about-split',
    label: 'Quem Somos Dividido',
    description: 'Foto com moldura decorativa de um lado e texto institucional com marcadores e botão do outro.',
    category: 'content',
    thumbnail: 'content',
    aiHint: 'Use para a biografia da agência ou história dos fundadores.',
    fields: [
      { key: 'image', type: 'image_unsplash', label: 'Foto do Sobre', required: true, defaultValue: 'travel agent smiling desk' },
      { key: 'sectionLabel', type: 'text', label: 'Rótulo', required: false, defaultValue: 'Sobre Nós' },
      { key: 'headline', type: 'text', label: 'Título', required: true, defaultValue: 'Especialistas em transformar sonhos em destinos reais' },
      { key: 'paragraph1', type: 'text', label: 'Parágrafo de Introdução', required: true, defaultValue: 'Fundada por entusiastas do turismo, nossa agência conta com uma rede global de parceiros para oferecer experiências seguras e confortáveis.' },
      { key: 'paragraph2', type: 'text', label: 'Parágrafo Secundário', required: false, defaultValue: 'Trabalhamos focados em atendimento humanizado. Cada roteiro é único e adaptado ao seu gosto.' },
      {
        key: 'bullets', type: 'list', label: 'Marcadores de Valores', required: false, defaultValue: [
          { text: 'Segurança com suporte emergencial 24h' },
          { text: 'Tarifas e upgrades exclusivos' },
          { text: 'Atendimento humanizado e personalizado' }
        ]
      },
      { key: 'ctaText', type: 'text', label: 'Texto do Botão', required: false, defaultValue: 'Falar com Diretor' },
      { key: 'ctaUrl', type: 'url', label: 'Link do Botão', required: false, defaultValue: '#contato' },
      { key: 'layout', type: 'select', label: 'Posição do Texto', required: true, defaultValue: 'text-right', options: [{ value: 'text-left', label: 'Texto à Esquerda' }, { value: 'text-right', label: 'Texto à Direita' }] }
    ],
    defaultConfig: {
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80',
      sectionLabel: 'Sobre Nós',
      headline: 'Especialistas em transformar sonhos em destinos reais',
      paragraph1: 'Fundada por entusiastas do turismo, nossa agência conta com uma rede global de parceiros para oferecer experiências seguras e confortáveis.',
      paragraph2: 'Trabalhamos focados em atendimento humanizado. Cada roteiro é único e adaptado ao seu gosto.',
      bullets: [
        { text: 'Segurança com suporte emergencial 24h' },
        { text: 'Tarifas e upgrades exclusivos' },
        { text: 'Atendimento humanizado e personalizado' }
      ],
      ctaText: 'Falar com Diretor',
      ctaUrl: '#contato',
      layout: 'text-right'
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeInUp' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'service-accordion': {
    type: 'service-accordion',
    label: 'Serviços em Accordion',
    description: 'Lista vertical de serviços com títulos clicáveis que expandem revelando a descrição.',
    category: 'content',
    thumbnail: 'content',
    aiHint: 'Excelente para explicar serviços específicos de forma compacta.',
    fields: [
      { key: 'sectionTitle', type: 'text', label: 'Título', required: true, defaultValue: 'Nossos Serviços Adicionais' },
      { key: 'allowMultiple', type: 'toggle', label: 'Permitir abrir vários ao mesmo tempo', required: true, defaultValue: false },
      {
        key: 'items', type: 'list', label: 'Lista de Serviços', required: true, defaultValue: [
          { icon: 'flight', title: 'Passagens Aéreas', description: 'Buscamos as melhores conexões e tarifas corporativas ou promocionais.', link: '#contato' },
          { icon: 'hotel', title: 'Hospedagem Selecionada', description: 'Reservas nos melhores hotéis com early check-in e café da manhã incluso.', link: '#contato' },
          { icon: 'safe', title: 'Seguros e Vistos', description: 'Providenciamos o seguro ideal e prestamos assessoria para emissão de vistos consulares.', link: '#contato' }
        ]
      }
    ],
    defaultConfig: {
      sectionTitle: 'Nossos Serviços Adicionais',
      allowMultiple: false,
      items: [
        { icon: 'flight', title: 'Passagens Aéreas', description: 'Buscamos as melhores conexões e tarifas corporativas ou promocionais.', link: '#contato' },
        { icon: 'hotel', title: 'Hospedagem Selecionada', description: 'Reservas nos melhores hotéis com early check-in e café da manhã incluso.', link: '#contato' },
        { icon: 'safe', title: 'Seguros e Vistos', description: 'Providenciamos o seguro ideal e prestamos assessoria para emissão de vistos consulares.', link: '#contato' }
      ]
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeInUp' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'service-cards': {
    type: 'service-cards',
    label: 'Cards de Serviços',
    description: 'Grid de cards com ícone ou ilustração no topo, título, descrição e link "Saiba mais".',
    category: 'content',
    thumbnail: 'content',
    aiHint: 'Use para detalhar visualmente o escopo de atuação da agência.',
    fields: [
      { key: 'sectionTitle', type: 'text', label: 'Título da Seção', required: true, defaultValue: 'O Que Oferecemos' },
      { key: 'theme', type: 'select', label: 'Tema dos Cards', required: true, defaultValue: 'light', options: [{ value: 'light', label: 'Fundo Claro' }, { value: 'dark', label: 'Fundo Escuro' }, { value: 'colored', label: 'Fundo da Marca' }] },
      {
        key: 'items', type: 'list', label: 'Serviços', required: true, defaultValue: [
          { icon: 'world', title: 'Roteiros de Lua de Mel', description: 'Destinos românticos organizados com mimos e experiências únicas.' },
          { icon: 'union', title: 'Viagens em Grupo', description: 'Grupos exclusivos com guias saindo do Brasil acompanhando a viagem.' },
          { icon: 'vip', title: 'Turismo de Luxo', description: 'Serviços VIP, traslados privativos e experiências exclusivas.' }
        ]
      }
    ],
    defaultConfig: {
      sectionTitle: 'O Que Oferecemos',
      theme: 'light',
      items: [
        { icon: 'world', title: 'Roteiros de Lua de Mel', description: 'Destinos românticos organizados com mimos e experiências únicas.' },
        { icon: 'union', title: 'Viagens em Grupo', description: 'Grupos exclusivos com guias saindo do Brasil acompanhando a viagem.' },
        { icon: 'vip', title: 'Turismo de Luxo', description: 'Serviços VIP, traslados privativos e experiências exclusivas.' }
      ]
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeInUp' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'blog-grid': {
    type: 'blog-grid',
    label: 'Feed do Blog',
    description: 'Grade de posts com imagem de capa, categoria, título, data e snippet.',
    category: 'content',
    thumbnail: 'content',
    aiHint: 'Use para exibir artigos e novidades do blog e engajar os visitantes.',
    fields: [
      { key: 'sectionTitle', type: 'text', label: 'Título', required: true, defaultValue: 'Dicas de Viagem do Nosso Blog' },
      { key: 'limit', type: 'number', label: 'Limite de Posts', required: true, defaultValue: 3 },
      { key: 'standalone', type: 'toggle', label: 'Modo Manual (Sem carregar do banco)', required: true, defaultValue: true },
      {
        key: 'items', type: 'list', label: 'Posts Manuais', required: false, defaultValue: [
          { image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=500&q=80', category: 'Dicas', title: 'O que levar na mala para a Europa no Inverno?', date: '15 Mai 2026', snippet: 'Um checklist completo das peças essenciais e regras de bagagem das companhias aéreas.' },
          { image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=500&q=80', category: 'Destinos', title: 'As praias mais bonitas do Caribe', date: '10 Mai 2026', snippet: 'Descubra praias intocadas e resorts que valem a visita na sua próxima ida ao Caribe.' }
        ]
      }
    ],
    defaultConfig: {
      sectionTitle: 'Dicas de Viagem do Nosso Blog',
      limit: 3,
      standalone: true,
      items: [
        { image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=500&q=80', category: 'Dicas', title: 'O que levar na mala para a Europa no Inverno?', date: '15 Mai 2026', snippet: 'Um checklist completo das peças essenciais e regras de bagagem das companhias aéreas.' },
        { image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=500&q=80', category: 'Destinos', title: 'As praias mais bonitas do Caribe', date: '10 Mai 2026', snippet: 'Descubra praias intocadas e resorts que valem a visita na sua próxima ida ao Caribe.' }
      ]
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeInUp' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'team-cards': {
    type: 'team-cards',
    label: 'Consultores de Viagem',
    description: 'Grid com foto de perfil dos consultores, especialidade e redes de contato.',
    category: 'content',
    thumbnail: 'content',
    aiHint: 'Excelente para humanizar a agência mostrando os rostos e contatos dos consultores.',
    fields: [
      { key: 'sectionTitle', type: 'text', label: 'Nossos Especialistas', required: true, defaultValue: 'Converse com Nossos Consultores' },
      {
        key: 'items', type: 'list', label: 'Membros da Equipe', required: true, defaultValue: [
          { image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80', name: 'Ana Souza', role: 'Especialista em Europa', bio: 'Mais de 10 anos planejando roteiros personalizados pela Europa.', whatsapp: '5549999999999' },
          { image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80', name: 'Roberto Lima', role: 'Especialista em Cruzeiros', bio: 'Conhece as melhores cabines e rotas de navios pelo mundo.', whatsapp: '5549999999999' }
        ]
      }
    ],
    defaultConfig: {
      sectionTitle: 'Converse com Nossos Consultores',
      items: [
        { image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80', name: 'Ana Souza', role: 'Especialista em Europa', bio: 'Mais de 10 anos planejando roteiros personalizados pela Europa.', whatsapp: '5549999999999' },
        { image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80', name: 'Roberto Lima', role: 'Especialista em Cruzeiros', bio: 'Conhece as melhores cabines e rotas de navios pelo mundo.', whatsapp: '5549999999999' }
      ]
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeInUp' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'timeline': {
    type: 'timeline',
    label: 'Cronograma da Viagem',
    description: 'Linha do tempo vertical ideal para mostrar etapas ou o roteiro dia-a-dia.',
    category: 'content',
    thumbnail: 'content',
    aiHint: 'Excelente para detalhar o roteiro dia-a-dia de um grupo de viagem.',
    fields: [
      { key: 'sectionTitle', type: 'text', label: 'Título', required: true, defaultValue: 'Roteiro Dia a Dia' },
      {
        key: 'items', type: 'list', label: 'Dias do Roteiro', required: true, defaultValue: [
          { time: 'Dia 01', title: 'Chegada e Check-in', description: 'Recepção no aeroporto, traslado privativo até o hotel e noite livre.' },
          { time: 'Dia 02', title: 'City Tour Histórico', description: 'Visita guiada pelos principais monumentos históricos com almoço incluso.' },
          { time: 'Dia 03', title: 'Dia de Aventura', description: 'Passeio opcional de barco ou trilha pela região com guias locais.' }
        ]
      }
    ],
    defaultConfig: {
      sectionTitle: 'Roteiro Dia a Dia',
      items: [
        { time: 'Dia 01', title: 'Chegada e Check-in', description: 'Recepção no aeroporto, traslado privativo até o hotel e noite livre.' },
        { time: 'Dia 02', title: 'City Tour Histórico', description: 'Visita guiada pelos principais monumentos históricos com almoço incluso.' },
        { time: 'Dia 03', title: 'Dia de Aventura', description: 'Passeio opcional de barco ou trilha pela região com guias locais.' }
      ]
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeInUp' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  // --- TESTIMONIALS ---
  'testimonial-single': {
    type: 'testimonial-single',
    label: 'Depoimento em Destaque',
    description: 'Card centralizado exibindo aspas gigantes e as palavras de um cliente satisfeito.',
    category: 'testimonials',
    thumbnail: 'testimonials',
    aiHint: 'Use para destacar um depoimento muito expressivo e emocionante.',
    fields: [
      { key: 'text', type: 'text', label: 'Texto do Depoimento', required: true, defaultValue: 'A consultoria foi excelente. Pensaram em cada detalhe, desde o assento do avião até surpresas no quarto do hotel. Viajamos sem nenhuma preocupação.' },
      { key: 'author', type: 'text', label: 'Nome do Cliente', required: true, defaultValue: 'Carlos Alberto' },
      { key: 'role', type: 'text', label: 'Cargo/Informação', required: false, defaultValue: 'Viajou para Itália em 2026' },
      { key: 'avatar', type: 'image_unsplash', label: 'Foto do Cliente', required: false, defaultValue: 'man portrait' },
      { key: 'stars', type: 'number', label: 'Avaliação (1 a 5)', required: true, defaultValue: 5 }
    ],
    defaultConfig: {
      text: 'A consultoria foi excelente. Pensaram em cada detalhe, desde o assento do avião até surpresas no quarto do hotel. Viajamos sem nenhuma preocupação.',
      author: 'Carlos Alberto',
      role: 'Viajou para Itália em 2026',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      stars: 5
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeInUp' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'testimonial-carousel': {
    type: 'testimonial-carousel',
    label: 'Depoimentos em Carrossel',
    description: 'Slider horizontal de depoimentos com transição suave.',
    category: 'testimonials',
    thumbnail: 'testimonials',
    aiHint: 'Ideal para mostrar depoimentos sem tomar muito espaço vertical.',
    fields: [
      { key: 'sectionTitle', type: 'text', label: 'Título', required: true, defaultValue: 'Relatos de Nossos Viajantes' },
      {
        key: 'items', type: 'list', label: 'Depoimentos', required: true, defaultValue: [
          { text: 'A melhor agência de viagens. O suporte via WhatsApp me salvou quando meu voo foi cancelado.', author: 'Marina Silva', role: 'Viajante frequente', stars: 5 },
          { text: 'Tudo perfeito. Os hotéis sugeridos eram excelentes e muito bem localizados.', author: 'Ricardo Costa', role: 'Férias em família', stars: 5 }
        ]
      }
    ],
    defaultConfig: {
      sectionTitle: 'Relatos de Nossos Viajantes',
      items: [
        { text: 'A melhor agência de viagens. O suporte via WhatsApp me salvou quando meu voo foi cancelado.', author: 'Marina Silva', role: 'Viajante frequente', stars: 5 },
        { text: 'Tudo perfeito. Os hotéis sugeridos eram excelentes e muito bem localizados.', author: 'Ricardo Costa', role: 'Férias em família', stars: 5 }
      ]
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeIn' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'testimonial-grid': {
    type: 'testimonial-grid',
    label: 'Grade de Depoimentos',
    description: 'Exibe depoimentos de clientes em uma grade de 3 colunas.',
    category: 'testimonials',
    thumbnail: 'testimonials',
    aiHint: 'Use para exibir vários depoimentos de uma só vez, criando forte prova social.',
    fields: [
      { key: 'sectionTitle', type: 'text', label: 'Título da Seção', required: true, defaultValue: 'Quem viaja com a gente, recomenda' },
      {
        key: 'items', type: 'list', label: 'Depoimentos (Recomendado 3 ou 6)', required: true, defaultValue: [
          { author: 'Juliana Pires', role: 'Casal · Viagem de Mel', text: 'Nossa lua de mel em Santorini foi impecável. A agência organizou passeios incríveis e jantares privativos.', stars: 5, avatar: '' },
          { author: 'Eduardo Santos', role: 'Viagem de Negócios', text: 'Facilidade para alterar passagens e tarifas muito competitivas. Excelente serviço corporativo.', stars: 5, avatar: '' },
          { author: 'Beatriz Costa', role: 'Mãe de Família', text: 'Viajamos com 3 crianças pequenas e a assessoria na escolha do resort all-inclusive fez toda a diferença.', stars: 5, avatar: '' }
        ]
      }
    ],
    defaultConfig: {
      sectionTitle: 'Quem viaja com a gente, recomenda',
      items: [
        { author: 'Juliana Pires', role: 'Casal · Viagem de Mel', text: 'Nossa lua de mel em Santorini foi impecável. A agência organizou passeios incríveis e jantares privativos.', stars: 5, avatar: '' },
        { author: 'Eduardo Santos', role: 'Viagem de Negócios', text: 'Facilidade para alterar passagens e tarifas muito competitivas. Excelente serviço corporativo.', stars: 5, avatar: '' },
        { author: 'Beatriz Costa', role: 'Mãe de Família', text: 'Viajamos com 3 crianças pequenas e a assessoria na escolha do resort all-inclusive fez toda a diferença.', stars: 5, avatar: '' }
      ]
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeInUp' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'testimonial-dark': {
    type: 'testimonial-dark',
    label: 'Depoimentos Premium Escuros',
    description: 'Grade de depoimentos com visual preto e dourado premium.',
    category: 'testimonials',
    thumbnail: 'testimonials',
    aiHint: 'Use em sites com temática escura ou premium para manter o padrão estético.',
    fields: [
      { key: 'sectionTitle', type: 'text', label: 'O Que Dizem os Nossos Membros VIP', required: true, defaultValue: 'Depoimentos de Alta Classe' },
      {
        key: 'items', type: 'list', label: 'Depoimentos VIP', required: true, defaultValue: [
          { author: 'Dr. Alberto Faria', role: 'Membro Platinum', text: 'O atendimento de concierge no aeroporto de Dubai foi excelente. Serviço premium indiscutível.', stars: 5 },
          { author: 'Helena Werneck', role: 'Membro Gold', text: 'A melhor experiência em cruzeiro de luxo. Quarto com mordomo e tudo reservado.', stars: 5 }
        ]
      }
    ],
    defaultConfig: {
      sectionTitle: 'Depoimentos de Alta Classe',
      items: [
        { author: 'Dr. Alberto Faria', role: 'Membro Platinum', text: 'O atendimento de concierge no aeroporto de Dubai foi excelente. Serviço premium indiscutível.', stars: 5 },
        { author: 'Helena Werneck', role: 'Membro Gold', text: 'A melhor experiência em cruzeiro de luxo. Quarto com mordomo e tudo reservado.', stars: 5 }
      ]
    },
    defaultStyles: { ...DEFAULT_STYLES, backgroundColor: '#0D0D0D', textColor: 'light' },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeIn' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'testimonial-featured': {
    type: 'testimonial-featured',
    label: 'Depoimento Amplo com Foto',
    description: 'Card largo com foto retangular grande à esquerda e depoimento em aspas gigante à direita.',
    category: 'testimonials',
    thumbnail: 'testimonials',
    aiHint: 'Ideal para um depoimento institucional detalhado com foto do cliente tirada em viagem.',
    fields: [
      { key: 'image', type: 'image_unsplash', label: 'Foto do Cliente em Viagem', required: true, defaultValue: 'couple traveling selfie' },
      { key: 'text', type: 'text', label: 'Depoimento', required: true, defaultValue: 'Nossa viagem de férias para o Japão foi espetacular. A agência montou um guia passo-a-passo detalhado de trem, hotéis e restaurantes locais. Sem dúvida, superou todas as expectativas!' },
      { key: 'author', type: 'text', label: 'Nome do Viajante', required: true, defaultValue: 'Juliana & Marcos' },
      { key: 'role', type: 'text', label: 'Cargo ou Destino', required: false, defaultValue: 'Férias de Família em Tóquio' },
      { key: 'stars', type: 'number', label: 'Estrelas', required: true, defaultValue: 5 }
    ],
    defaultConfig: {
      image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80',
      text: 'Nossa viagem de férias para o Japão foi espetacular. A agência montou um guia passo-a-passo detalhado de trem, hotéis e restaurantes locais. Sem dúvida, superou todas as expectativas!',
      author: 'Juliana & Marcos',
      role: 'Férias de Família em Tóquio',
      stars: 5
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeInLeft' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'testimonial-speech-bubble': {
    type: 'testimonial-speech-bubble',
    label: 'Depoimento Balão de Fala',
    description: 'Balão de fala arredondado com o depoimento apontando para a foto do cliente abaixo.',
    category: 'testimonials',
    thumbnail: 'testimonials',
    aiHint: 'Estilo amigável e moderno ideal para sites dinâmicos de turismo jovem.',
    fields: [
      { key: 'text', type: 'text', label: 'Texto', required: true, defaultValue: 'Super prático! Fiquei com receio de comprar online, mas a agência me mandou os vouchers e deu todo o suporte que precisei.' },
      { key: 'author', type: 'text', label: 'Nome', required: true, defaultValue: 'Fernanda Oliveira' },
      { key: 'role', type: 'text', label: 'Subtítulo', required: false, defaultValue: 'Mochilão pela América do Sul' },
      { key: 'avatar', type: 'image_unsplash', label: 'Foto', required: false, defaultValue: 'woman smile portrait' }
    ],
    defaultConfig: {
      text: 'Super prático! Fiquei com receio de comprar online, mas a agência me mandou os vouchers e deu todo o suporte que precisei.',
      author: 'Fernanda Oliveira',
      role: 'Mochilão pela América do Sul',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80'
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeInUp' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  // --- MEDIA SECTIONS ---
  'gallery-grid': {
    type: 'gallery-grid',
    label: 'Galeria em Grid',
    description: 'Galeria uniforme de imagens (3x2 ou 4x3) com hover e lightbox.',
    category: 'media',
    thumbnail: 'media',
    aiHint: 'Use para mostrar fotos reais de viajantes ou do portfólio da agência.',
    fields: [
      { key: 'sectionTitle', type: 'text', label: 'Título', required: false, defaultValue: 'Galeria de Fotos' },
      {
        key: 'images', type: 'list', label: 'Imagens da Galeria', required: true, defaultValue: [
          { url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=500&q=80' },
          { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=500&q=80' },
          { url: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=500&q=80' }
        ]
      }
    ],
    defaultConfig: {
      sectionTitle: 'Galeria de Fotos',
      images: [
        { url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=500&q=80' },
        { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=500&q=80' },
        { url: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=500&q=80' }
      ]
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeIn' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'gallery-masonry': {
    type: 'gallery-masonry',
    label: 'Galeria Masonry',
    description: 'Galeria fluida com alturas de fotos variadas para efeito editorial moderno.',
    category: 'media',
    thumbnail: 'media',
    aiHint: 'Excelente para dar uma sensação moderna de feed do Instagram/Pinterest.',
    fields: [
      { key: 'sectionTitle', type: 'text', label: 'Título', required: false, defaultValue: 'Nossas Viagens Recentes' },
      {
        key: 'images', type: 'list', label: 'Imagens Masonry', required: true, defaultValue: [
          { url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=500&q=80' },
          { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=500&h=700&q=80' }, // taller
          { url: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=500&q=80' },
          { url: 'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=500&h=650&q=80' }  // taller
        ]
      }
    ],
    defaultConfig: {
      sectionTitle: 'Nossas Viagens Recentes',
      images: [
        { url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=500&q=80' },
        { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=500&h=700&q=80' },
        { url: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=500&q=80' },
        { url: 'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=500&h=650&q=80' }
      ]
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeIn' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'video-section': {
    type: 'video-section',
    label: 'Player de Vídeo',
    description: 'Player centralizado suportando links do YouTube, Vimeo ou arquivo direto.',
    category: 'media',
    thumbnail: 'media',
    aiHint: 'Use para apresentar vídeos institucionais de alta qualidade ou depoimentos de clientes.',
    fields: [
      { key: 'sectionTitle', type: 'text', label: 'Título', required: false, defaultValue: 'Assista Como Viajamos' },
      { key: 'videoUrl', type: 'url', label: 'URL do Vídeo (YouTube/Vimeo embed)', required: true, defaultValue: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
      { key: 'thumbnailImage', type: 'image_unsplash', label: 'Thumbnail Customizada', required: false, defaultValue: 'beach sunset background' }
    ],
    defaultConfig: {
      sectionTitle: 'Assista Como Viajamos',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeInUp' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'photo-text-alternating': {
    type: 'photo-text-alternating',
    label: 'Blocos Alternados (Zebra)',
    description: 'Conteúdo em zigue-zague com foto de um lado e texto de outro alternando nas linhas.',
    category: 'media',
    thumbnail: 'media',
    aiHint: 'Use para descrever múltiplos pilares de atuação ou pacotes especiais de forma estruturada.',
    fields: [
      { key: 'sectionTitle', type: 'text', label: 'Título Principal', required: false, defaultValue: 'Nossas Linhas de Viagem' },
      {
        key: 'blocks', type: 'list', label: 'Blocos de Conteúdo', required: true, defaultValue: [
          { title: 'Viagens Terrestres Nacionais', description: 'Conheça o Brasil por terra em hotéis fazenda e resorts selecionados com toda a família.', image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80' },
          { title: 'Cruzeiros Internacionais', description: 'Cruzeiros marítimos all-inclusive saindo dos principais portos nacionais e mundiais.', image: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=600&q=80' }
        ]
      }
    ],
    defaultConfig: {
      sectionTitle: 'Nossas Linhas de Viagem',
      blocks: [
        { title: 'Viagens Terrestres Nacionais', description: 'Conheça o Brasil por terra em hotéis fazenda e resorts selecionados com toda a família.', image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80' },
        { title: 'Cruzeiros Internacionais', description: 'Cruzeiros marítimos all-inclusive saindo dos principais portos nacionais e mundiais.', image: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=600&q=80' }
      ]
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeInUp' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'parallax-section': {
    type: 'parallax-section',
    label: 'Seção Parallax',
    description: 'Efeito parallax suave no background conforme o usuário rola a página.',
    category: 'media',
    thumbnail: 'media',
    aiHint: 'Insira no meio da página para quebrar o ritmo de leitura com um visual 3D surpreendente.',
    fields: [
      { key: 'backgroundImage', type: 'image_unsplash', label: 'Foto de Fundo', required: true, defaultValue: 'mountain lake peak landscape' },
      { key: 'overlayOpacity', type: 'number', label: 'Opacidade do Overlay', required: true, defaultValue: 0.5 },
      { key: 'badgeText', type: 'text', label: 'Badge', required: false, defaultValue: 'Sinta a Liberdade' },
      { key: 'headline', type: 'text', label: 'Título', required: true, defaultValue: 'A natureza te chama para explorar' },
      { key: 'subtitle', type: 'text', label: 'Subtítulo', required: true, defaultValue: 'Roteiros de ecoturismo e aventura com guias locais altamente treinados.' },
      { key: 'ctaText', type: 'text', label: 'Botão de Ação', required: false, defaultValue: 'Ver Roteiros Ecológicos' },
      { key: 'ctaUrl', type: 'url', label: 'Link do Botão', required: false, defaultValue: '#roteiros' }
    ],
    defaultConfig: {
      backgroundImage: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1920&q=80',
      overlayOpacity: 0.5,
      badgeText: 'Sinta a Liberdade',
      headline: 'A natureza te chama para explorar',
      subtitle: 'Roteiros de ecoturismo e aventura com guias locais altamente treinados.',
      ctaText: 'Ver Roteiros Ecológicos',
      ctaUrl: '#roteiros'
    },
    defaultStyles: { ...DEFAULT_STYLES, backgroundColor: 'transparent' },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'parallax' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'map-contact': {
    type: 'map-contact',
    label: 'Mapa e Contatos',
    description: 'Layout 50/50 com Google Maps interativo de um lado e informações de endereço/WhatsApp do outro.',
    category: 'media',
    thumbnail: 'media',
    aiHint: 'Seção final para páginas institucionais que precisam divulgar a sede física.',
    fields: [
      { key: 'mapEmbedUrl', type: 'url', label: 'Embed URL do Google Maps', required: true, defaultValue: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3540.3235650177724!2d-52.6174621!3d-27.1002364!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94e539b7ea577903%3A0xe54d92cd0e4088!2sChapec%C3%B3%20-%20SC!5e0!3m2!1spt-BR!2sbr!4v1700000000000' },
      { key: 'phone', type: 'text', label: 'Telefone', required: false, defaultValue: '+55 (49) 3322-1100' },
      { key: 'email', type: 'text', label: 'E-mail', required: false, defaultValue: 'contato@agencia.com.br' },
      { key: 'address', type: 'text', label: 'Endereço', required: true, defaultValue: 'Avenida Getúlio Vargas, 1000 - Centro, Chapecó - SC' },
      { key: 'hours', type: 'text', label: 'Horário de Funcionamento', required: false, defaultValue: 'Segunda a Sexta: 08:30 às 18:00' },
      { key: 'whatsapp', type: 'text', label: 'WhatsApp de Vendas', required: false, defaultValue: '5549999999999' }
    ],
    defaultConfig: {
      mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3540.3235650177724!2d-52.6174621!3d-27.1002364!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94e539b7ea577903%3A0xe54d92cd0e4088!2sChapec%C3%B3%20-%20SC!5e0!3m2!1spt-BR!2sbr!4v1700000000000',
      phone: '+55 (49) 3322-1100',
      email: 'contato@agencia.com.br',
      address: 'Avenida Getúlio Vargas, 1000 - Centro, Chapecó - SC',
      hours: 'Segunda a Sexta: 08:30 às 18:00',
      whatsapp: '5549999999999'
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeInUp' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  // --- CTA SECTIONS ---
  'cta-banner': {
    type: 'cta-banner',
    label: 'Banner de Chamada (CTA)',
    description: 'Faixa horizontal em brand color ou fundo gradiente contendo um botão de ação destacado.',
    category: 'cta',
    thumbnail: 'cta',
    aiHint: 'Excelente para capturar a atenção com um convite à ação ao longo da página.',
    fields: [
      { key: 'title', type: 'text', label: 'Título', required: true, defaultValue: 'Pronto para planejar sua viagem?' },
      { key: 'subtitle', type: 'text', label: 'Subtítulo', required: false, defaultValue: 'Converse com um especialista agora e tire suas dúvidas.' },
      { key: 'ctaText', type: 'text', label: 'Texto do Botão', required: true, defaultValue: 'Iniciar Atendimento' },
      { key: 'ctaUrl', type: 'url', label: 'Link do Botão', required: true, defaultValue: '#contato' },
      { key: 'backgroundType', type: 'select', label: 'Tipo do Fundo', required: true, defaultValue: 'brand', options: [{ value: 'brand', label: 'Cor da Marca' }, { value: 'gradient', label: 'Gradiente da Marca' }, { value: 'dark', label: 'Escuro' }] }
    ],
    defaultConfig: {
      title: 'Pronto para planejar sua viagem?',
      subtitle: 'Converse com um especialista agora e tire suas dúvidas.',
      ctaText: 'Iniciar Atendimento',
      ctaUrl: '#contato',
      backgroundType: 'brand'
    },
    defaultStyles: { ...DEFAULT_STYLES, backgroundColor: 'transparent' },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeInUp' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'cta-newsletter': {
    type: 'cta-newsletter',
    label: 'Inscrição Newsletter',
    description: 'Caixa de email horizontal para capturar e registrar leads na tabela do banco.',
    category: 'cta',
    thumbnail: 'cta',
    aiHint: 'Perfeito para capturar leads que querem apenas receber promoções de turismo por e-mail.',
    fields: [
      { key: 'title', type: 'text', label: 'Título', required: true, defaultValue: 'Receba promoções por E-mail' },
      { key: 'subtitle', type: 'text', label: 'Subtítulo', required: false, defaultValue: 'Sem spam, apenas alertas das melhores passagens e tarifas.' },
      { key: 'placeholder', type: 'text', label: 'Placeholder do Campo', required: true, defaultValue: 'Seu melhor e-mail' },
      { key: 'buttonText', type: 'text', label: 'Botão Cadastrar', required: true, defaultValue: 'Quero Receber' }
    ],
    defaultConfig: {
      title: 'Receba promoções por E-mail',
      subtitle: 'Sem spam, apenas alertas das melhores passagens e tarifas.',
      placeholder: 'Seu melhor e-mail',
      buttonText: 'Quero Receber'
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeInUp' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'cta-contact-form': {
    type: 'cta-contact-form',
    label: 'Formulário de Contato Principal',
    description: 'Formulário completo com campos (Nome, E-mail, Fone, Assunto, Mensagem) gravando direto no banco.',
    category: 'cta',
    thumbnail: 'cta',
    aiHint: 'Mesa de conversão obrigatória nas landing pages ou no rodapé do site.',
    fields: [
      { key: 'title', type: 'text', label: 'Título do Formulário', required: true, defaultValue: 'Solicite um Orçamento Personalizado' },
      { key: 'subtitle', type: 'text', label: 'Subtítulo', required: false, defaultValue: 'Deixe seus dados e um especialista entrará em contato em até 2 horas úteis.' },
      { key: 'successMessage', type: 'text', label: 'Mensagem de Sucesso', required: true, defaultValue: 'Sua solicitação foi enviada! Em breve entraremos em contato.' }
    ],
    defaultConfig: {
      title: 'Solicite um Orçamento Personalizado',
      subtitle: 'Deixe seus dados e um especialista entrará em contato em até 2 horas úteis.',
      successMessage: 'Sua solicitação foi enviada! Em breve entraremos em contato.'
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeInUp' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'cta-whatsapp-float': {
    type: 'cta-whatsapp-float',
    label: 'Botão Flutuante WhatsApp',
    description: 'Botão flutuante fixado no canto inferior direito que abre chat direto.',
    category: 'cta',
    thumbnail: 'cta',
    aiHint: 'Adicione no final da página para que o visitante possa falar diretamente pelo WhatsApp.',
    fields: [
      { key: 'whatsapp', type: 'text', label: 'Número de WhatsApp (DDI + DDD + Número)', required: true, defaultValue: '5549999999999' },
      { key: 'message', type: 'text', label: 'Mensagem Inicial', required: true, defaultValue: 'Olá, gostaria de solicitar um orçamento de viagem!' },
      { key: 'tooltip', type: 'text', label: 'Texto do Tooltip / Alerta', required: false, defaultValue: 'Fale conosco pelo WhatsApp' }
    ],
    defaultConfig: {
      whatsapp: '5549999999999',
      message: 'Olá, gostaria de solicitar um orçamento de viagem!',
      tooltip: 'Fale conosco pelo WhatsApp'
    },
    defaultStyles: { ...DEFAULT_STYLES, backgroundColor: 'transparent' },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeIn' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'search-bar-travel': {
    type: 'search-bar-travel',
    label: 'Barra de Busca Standalone',
    description: 'Barra horizontal de busca rápida de viagens (Destino, datas, etc) posicionável isoladamente.',
    category: 'cta',
    thumbnail: 'cta',
    aiHint: 'Use no meio do site ou logo abaixo do hero para incentivar a busca rápida.',
    fields: [
      { key: 'buttonText', type: 'text', label: 'Texto do Botão Buscar', required: true, defaultValue: 'Buscar Agora' },
      { key: 'actionUrl', type: 'url', label: 'URL de Redirecionamento', required: true, defaultValue: '#roteiros' }
    ],
    defaultConfig: {
      buttonText: 'Buscar Agora',
      actionUrl: '#roteiros'
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeInUp' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  // --- NAVIGATION ---
  'nav-standard': {
    type: 'nav-standard',
    label: 'Menu Padrão (Light)',
    description: 'Menu superior com logo à esquerda, links centralizados e botão de destaque à direita.',
    category: 'navigation',
    thumbnail: 'navigation',
    aiHint: 'Cabeçalho padrão do site.',
    fields: [
      { key: 'ctaText', type: 'text', label: 'Texto do Botão', required: false, defaultValue: 'Falar com Agente' },
      { key: 'ctaUrl', type: 'url', label: 'Link do Botão', required: false, defaultValue: '#contato' },
      {
        key: 'links', type: 'list', label: 'Links do Menu', required: true, defaultValue: [
          { label: 'Início', url: '/' },
          { label: 'Destinos', url: '#destinos' },
          { label: 'Sobre Nós', url: '#sobre' },
          { label: 'Blog', url: '#blog' }
        ]
      }
    ],
    defaultConfig: {
      ctaText: 'Falar com Agente',
      ctaUrl: '#contato',
      links: [
        { label: 'Início', url: '/' },
        { label: 'Destinos', url: '#destinos' },
        { label: 'Sobre Nós', url: '#sobre' },
        { label: 'Blog', url: '#blog' }
      ]
    },
    defaultStyles: { ...DEFAULT_STYLES, paddingTop: 'none', paddingBottom: 'none' },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeIn', trigger: 'onLoad' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'nav-dark': {
    type: 'nav-dark',
    label: 'Menu Superior Escuro',
    description: 'Menu superior em tema escuro permanente para logos brancos.',
    category: 'navigation',
    thumbnail: 'navigation',
    aiHint: 'Cabeçalho escuro do site para layouts noturnos.',
    fields: [
      { key: 'ctaText', type: 'text', label: 'Texto do Botão', required: false, defaultValue: 'Fale Conosco' },
      { key: 'ctaUrl', type: 'url', label: 'Link do Botão', required: false, defaultValue: '#contato' },
      {
        key: 'links', type: 'list', label: 'Links do Menu', required: true, defaultValue: [
          { label: 'Início', url: '/' },
          { label: 'Destinos', url: '#destinos' },
          { label: 'Sobre Nós', url: '#sobre' }
        ]
      }
    ],
    defaultConfig: {
      ctaText: 'Fale Conosco',
      ctaUrl: '#contato',
      links: [
        { label: 'Início', url: '/' },
        { label: 'Destinos', url: '#destinos' },
        { label: 'Sobre Nós', url: '#sobre' }
      ]
    },
    defaultStyles: { ...DEFAULT_STYLES, backgroundColor: '#0A0A0A', textColor: 'light', paddingTop: 'none', paddingBottom: 'none' },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeIn', trigger: 'onLoad' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  // --- FOOTERS ---
  'footer-minimal': {
    type: 'footer-minimal',
    label: 'Rodapé Simples',
    description: 'Footer plano com copyright, links básicos de privacidade e redes sociais.',
    category: 'footer',
    thumbnail: 'footer',
    aiHint: 'Rodapé limpo e elegante.',
    fields: [
      { key: 'copyright', type: 'text', label: 'Copyright', required: true, defaultValue: '© 2026 TravelOS Agência. Todos os direitos reservados.' }
    ],
    defaultConfig: {
      copyright: '© 2026 TravelOS Agência. Todos os direitos reservados.'
    },
    defaultStyles: { ...DEFAULT_STYLES, paddingTop: 'sm', paddingBottom: 'sm' },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeIn' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'footer-columns': {
    type: 'footer-columns',
    label: 'Rodapé Multi-colunas',
    description: 'Rodapé corporativo com colunas de links, contato e breve descrição da empresa.',
    category: 'footer',
    thumbnail: 'footer',
    aiHint: 'Excelente para sites maiores que precisam listar vários links de navegação rápidos.',
    fields: [
      { key: 'description', type: 'text', label: 'Descrição da Empresa', required: true, defaultValue: 'Sua agência de turismo de confiança. Realizando as melhores viagens em grupo e roteiros personalizados pelo mundo.' },
      { key: 'phone', type: 'text', label: 'Telefone', required: false, defaultValue: '+55 49 99999-9999' },
      { key: 'email', type: 'text', label: 'E-mail', required: false, defaultValue: 'contato@agencia.com.br' },
      { key: 'address', type: 'text', label: 'Endereço', required: false, defaultValue: 'Chapecó, SC' }
    ],
    defaultConfig: {
      description: 'Sua agência de turismo de confiança. Realizando as melhores viagens em grupo e roteiros personalizados pelo mundo.',
      phone: '+55 49 99999-9999',
      email: 'contato@agencia.com.br',
      address: 'Chapecó, SC'
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeIn' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'footer-dark': {
    type: 'footer-dark',
    label: 'Rodapé Escuro Multi-colunas',
    description: 'Rodapé corporativo escuro para contraste estético.',
    category: 'footer',
    thumbnail: 'footer',
    aiHint: 'Rodapé escuro padrão.',
    fields: [
      { key: 'description', type: 'text', label: 'Descrição da Empresa', required: true, defaultValue: 'Experiências de luxo e passeios de aventura planejados sob medida.' },
      { key: 'phone', type: 'text', label: 'Telefone', required: false, defaultValue: '+55 49 99999-9999' },
      { key: 'email', type: 'text', label: 'E-mail', required: false, defaultValue: 'viagens@agencia.com.br' }
    ],
    defaultConfig: {
      description: 'Experiências de luxo e passeios de aventura planejados sob medida.',
      phone: '+55 49 99999-9999',
      email: 'viagens@agencia.com.br'
    },
    defaultStyles: { ...DEFAULT_STYLES, backgroundColor: '#0A0A0A', textColor: 'light' },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeIn' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'footer-cta': {
    type: 'footer-cta',
    label: 'Rodapé com Faixa de Captura',
    description: 'Rodapé com uma faixa CTA de alta conversão integrada acima das colunas.',
    category: 'footer',
    thumbnail: 'footer',
    aiHint: 'Aumente o engajamento capturando leads logo antes de saírem do site.',
    fields: [
      { key: 'ctaTitle', type: 'text', label: 'Título da Chamada', required: true, defaultValue: 'Inscreva-se e Receba Alertas' },
      { key: 'ctaButtonText', type: 'text', label: 'Botão de Inscrição', required: true, defaultValue: 'Cadastrar' },
      { key: 'description', type: 'text', label: 'Descrição Rodapé', required: true, defaultValue: 'Sua agência especialista em cruzeiros e roteiros terrestres.' }
    ],
    defaultConfig: {
      ctaTitle: 'Inscreva-se e Receba Alertas',
      ctaButtonText: 'Cadastrar',
      description: 'Sua agência especialista em cruzeiros e roteiros terrestres.'
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeIn' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  },

  'footer-with-map': {
    type: 'footer-with-map',
    label: 'Rodapé com Mapa Integrado',
    description: 'Rodapé exibindo um mapa do Google Maps na coluna esquerda e contatos na direita.',
    category: 'footer',
    thumbnail: 'footer',
    aiHint: 'Excelente para portais de agências que querem ter o mapa sempre acessível em qualquer página.',
    fields: [
      { key: 'mapEmbedUrl', type: 'url', label: 'Google Maps Embed URL', required: true, defaultValue: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3540.3235650177724!2d-52.6174621!3d-27.1002364!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94e539b7ea577903%3A0xe54d92cd0e4088!2sChapec%C3%B3%20-%20SC!5e0!3m2!1spt-BR!2sbr!4v1700000000000' },
      { key: 'description', type: 'text', label: 'Descrição da Empresa', required: true, defaultValue: 'Nossa equipe está de portas abertas para lhe atender.' }
    ],
    defaultConfig: {
      mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3540.3235650177724!2d-52.6174621!3d-27.1002364!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94e539b7ea577903%3A0xe54d92cd0e4088!2sChapec%C3%B3%20-%20SC!5e0!3m2!1spt-BR!2sbr!4v1700000000000',
      description: 'Nossa equipe está de portas abertas para lhe atender.'
    },
    defaultStyles: { ...DEFAULT_STYLES },
    defaultAnimation: { ...DEFAULT_ANIMATION, type: 'fadeIn' },
    defaultResponsive: { ...DEFAULT_RESPONSIVE }
  }
};
