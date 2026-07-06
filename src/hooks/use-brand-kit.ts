import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BrandKit = {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  brand_color_fg: string;
  font_heading: string;
  font_body: string;
  logo_url: string | null;
  logo_white_url: string | null;
  favicon_url: string | null;
};

const DEFAULTS: BrandKit = {
  primary_color: "#1E3A5F",
  secondary_color: "#D4AF37",
  accent_color: "#E63946",
  background_color: "#FFFFFF",
  text_color: "#111827",
  brand_color_fg: "#FFFFFF",
  font_heading: "Inter",
  font_body: "Inter",
  logo_url: null,
  logo_white_url: null,
  favicon_url: null,
};

/**
 * useBrandKit — hook centralizado para consumir o brand_kit da agência.
 * Usado por templates de proposta, voucher, portal do cliente e contrato.
 * Retorna sempre um objeto resolvido com fallbacks seguros.
 */
export function useBrandKit(agencyId: string | undefined) {
  const q = useQuery({
    enabled: !!agencyId,
    queryKey: ["brand_kit", agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_kit")
        .select(
          "primary_color, secondary_color, accent_color, background_color, text_color, brand_color_fg, font_heading, font_body, logo_url, logo_white_url, favicon_url"
        )
        .eq("agency_id", agencyId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 min — brand kit muda raramente
  });

  const kit: BrandKit = {
    primary_color: q.data?.primary_color || DEFAULTS.primary_color,
    secondary_color: q.data?.secondary_color || DEFAULTS.secondary_color,
    accent_color: q.data?.accent_color || DEFAULTS.accent_color,
    background_color: q.data?.background_color || DEFAULTS.background_color,
    text_color: q.data?.text_color || DEFAULTS.text_color,
    brand_color_fg: q.data?.brand_color_fg || DEFAULTS.brand_color_fg,
    font_heading: q.data?.font_heading || DEFAULTS.font_heading,
    font_body: q.data?.font_body || DEFAULTS.font_body,
    logo_url: q.data?.logo_url || null,
    logo_white_url: q.data?.logo_white_url || null,
    favicon_url: q.data?.favicon_url || null,
  };

  /**
   * cssVars — objeto de CSS custom properties para usar em style={{ ...kit.cssVars }}
   * Aplica as cores da agência como variáveis CSS no componente raiz do template.
   */
  const cssVars = {
    "--brand-primary": kit.primary_color,
    "--brand-secondary": kit.secondary_color,
    "--brand-accent": kit.accent_color,
    "--brand-bg": kit.background_color,
    "--brand-text": kit.text_color,
    "--brand-fg": kit.brand_color_fg,
    "--brand-heading-font": `"${kit.font_heading}", sans-serif`,
    "--brand-body-font": `"${kit.font_body}", sans-serif`,
  } as React.CSSProperties;

  return { kit, cssVars, isLoading: q.isLoading };
}
