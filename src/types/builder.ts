// Categorias de seção
export type SectionCategory =
  | 'hero'
  | 'destinations'
  | 'content'
  | 'testimonials'
  | 'media'
  | 'cta'
  | 'navigation'
  | 'footer';

// Tipos de campo editável
export type FieldType =
  | 'text'
  | 'richtext'
  | 'image'        // URL string + alt text
  | 'image_unsplash'  // busca no Unsplash por keyword
  | 'color'
  | 'select'
  | 'toggle'
  | 'number'
  | 'url'
  | 'list'         // array de items repetíveis
  | 'icon';        // seletor de ícone Lucide

// Definição de um campo editável
export interface FieldDefinition {
  key: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  defaultValue: unknown;
  options?: { value: string; label: string }[];  // para select
  min?: number;
  max?: number;
  // For repeatability lists, we define the schema of items in the list
  itemFields?: Omit<FieldDefinition, 'defaultValue' | 'required'>[];
}

// Animação de entrada da seção
export type AnimationType =
  | 'none'
  | 'fadeIn'
  | 'fadeInUp'
  | 'fadeInLeft'
  | 'fadeInRight'
  | 'scaleIn'
  | 'parallax'
  | 'countUp';  // para números/estatísticas

export interface SectionAnimation {
  enabled: boolean;
  type: AnimationType;
  delay: number;      // ms
  duration: number;   // ms
  trigger: 'onEnter' | 'onLoad';
}

// Responsividade
export interface ResponsiveConfig {
  hideOnMobile: boolean;
  hideOnTablet: boolean;
  mobileColumns?: 1 | 2;
  tabletColumns?: 1 | 2 | 3;
}

// Estilos customizáveis da seção
export interface SectionStyles {
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundOverlayOpacity?: number;  // 0-1
  paddingTop?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  paddingBottom?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  textColor?: 'auto' | 'light' | 'dark';
}

// Definição estática de um tipo de seção (o template)
export interface SectionDefinition {
  type: string;
  label: string;
  description: string;
  category: SectionCategory;
  thumbnail: string;   // SVG inline ou URL de preview
  fields: FieldDefinition[];
  defaultConfig: Record<string, any>;
  defaultStyles: SectionStyles;
  defaultAnimation: SectionAnimation;
  defaultResponsive: ResponsiveConfig;
  aiHint: string;  // dica para a IA sobre quando usar esta seção
}

// Instância de seção salva no banco (matches the PortalBlock type or used inside Page)
export interface SiteSectionRecord {
  id: string;
  site_id?: string;
  page_id?: string;
  agency_id?: string;
  type: string;
  order_index?: number;
  config: Record<string, any>;
  styles: SectionStyles;
  animation: SectionAnimation;
  responsive: ResponsiveConfig;
  created_at?: string;
  updated_at?: string;
}
