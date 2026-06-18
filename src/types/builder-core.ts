export type BuilderContextMode = "site" | "package" | "biolink" | "document";

export type BuilderViewport =
  | "desktop"
  | "tablet"
  | "mobile"
  | "biolink"
  | "a4-portrait"
  | "a4-landscape"
  | "story"
  | "feed";

export interface BuilderBinding {
  source: "package" | "agency" | "destination" | "manual";
  packageId?: string;
  departureId?: string;
  fields: Record<string, string>; // e.g. { title: "package.title", price: "departure.priceFrom" }
}

export interface BuilderResponsiveConfig {
  hideOnMobile: boolean;
  hideOnTablet: boolean;
  mobileColumns?: 1 | 2;
  tabletColumns?: 1 | 2 | 3;
}

export interface BuilderSectionStyle {
  bg_type: "default" | "color" | "gradient" | "image";
  bg_color?: string;
  bg_gradient?: string;
  bg_image_url?: string;
  text_color?: string;
  padding_y?: "none" | "sm" | "md" | "lg";
  border_radius?: "none" | "md" | "lg" | "full";
}

export interface BuilderSectionAnimation {
  enabled: boolean;
  type: "none" | "fade" | "slide-up" | "slide-down" | "zoom-in" | "slide-left" | "slide-right";
  delay?: number;
  duration?: number;
  trigger?: "onEnter" | "onLoad";
}

export interface BuilderBlock {
  id: string;
  type: string;
  allowedContexts: BuilderContextMode[];
  config: Record<string, any>;
  styles?: BuilderSectionStyle;
  animation?: BuilderSectionAnimation;
  responsive?: BuilderResponsiveConfig;
  bindings?: BuilderBinding;
}
