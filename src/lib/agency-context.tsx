import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

/** All CSS custom properties written by the brand kit engine. */
const BRAND_CSS_VARS = [
  "--agency-brand",
  "--agency-brand-light",
  "--agency-brand-fg",
  "--brand-primary",
  "--brand-secondary",
  "--brand-accent",
  "--brand-bg",
  "--brand-text",
  "--brand-heading-font",
  "--brand-body-font",
] as const;

/**
 * Removes all agency brand CSS variables from <html> and clears the
 * associated localStorage cache. Call this on logout or agency switch
 * to prevent cross-tenant visual bleed.
 */
export function cleanupBrandKit(agencyId?: string) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  for (const v of BRAND_CSS_VARS) {
    el.style.removeProperty(v);
  }
  // Remove injected Google Fonts link
  const linkEl = document.getElementById("google-fonts-agency-head");
  if (linkEl) linkEl.remove();
  // Clear localStorage cache for this agency (or all brand-kit caches)
  if (agencyId) {
    try { localStorage.removeItem(`brand-kit-${agencyId}`); } catch { /* noop */ }
  } else {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("brand-kit-"))
        .forEach((k) => localStorage.removeItem(k));
    } catch { /* noop */ }
  }
}

export type Agency = {
  id: string;
  slug: string;
  name: string;
  brand_color: string | null;
  brand_color_light: string | null;
  brand_color_fg: string | null;
  logo_url: string | null;
  module_names?: Record<string, string> | null;
  status?: string | null;
};

export type BrandKit = Database["public"]["Tables"]["brand_kit"]["Row"];
export type CompanyProfile = Database["public"]["Tables"]["company_profiles"]["Row"];

type Ctx = {
  agency: Agency | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  role: string | null;
  isAgencyAdmin: boolean;
  brandKit: BrandKit | null;
  companyProfile: CompanyProfile | null;
};

const AgencyContext = createContext<Ctx>({
  agency: null,
  loading: false,
  error: null,
  refresh: () => {},
  role: null,
  isAgencyAdmin: false,
  brandKit: null,
  companyProfile: null,
});

export const DEFAULT_MODULE_NAMES: Record<string, string> = {
  dashboard: "Dashboard",
  "daily-tasks": "Meu Dia (Tarefas)",
  crm: "Negociações & Leads",
  quotes: "Cotações VibeTour",
  calendar: "Agenda",
  omnichannel: "Conversas & Mensagens",
  proposals: "Orçamentos & Propostas",
  trips: "Viagens",
  "group-tours": "Roteiros em Grupo",
  clients: "Clientes",
  corporate: "Corporativo",
  suppliers: "Fornecedores",
  support: "Suporte",
  visas: "Vistos",
  "bus-layouts": "Frota & Ônibus",
  boarding: "Embarques",
  financial: "Financeiro",
  portal: "Site da Agência",
  competitors: "Monitor de Concorrentes",
  productivity: "Produtividade Master",
  company: "Minha Empresa",
  team: "Equipe",
  brand: "Identidade Visual",
  integrations: "Conexões",
  billing: "Assinatura & Planos",
  settings: "Configurações",
};

export function getModuleName(moduleKey: string, agency: Agency | null): string {
  if (agency?.module_names && agency.module_names[moduleKey]) {
    return agency.module_names[moduleKey];
  }
  return DEFAULT_MODULE_NAMES[moduleKey] || moduleKey;
}

export function AgencyProvider({
  preloadedAgency,
  children,
}: {
  preloadedAgency: Agency;
  children: ReactNode;
}) {
  // Synchronously apply cached styles on initial render to prevent visual flicker
  if (typeof window !== "undefined" && preloadedAgency?.id) {
    try {
      const cached = localStorage.getItem(`brand-kit-${preloadedAgency.id}`);
      const el = document.documentElement;
      const color = preloadedAgency.brand_color;
      const light = preloadedAgency.brand_color_light;
      const fg = preloadedAgency.brand_color_fg;
      if (color) el.style.setProperty("--agency-brand", color);
      if (light) el.style.setProperty("--agency-brand-light", light);
      if (fg) el.style.setProperty("--agency-brand-fg", fg);

      if (cached) {
        const bk = JSON.parse(cached);
        const primaryColor = bk.primary_color || bk.brand_color || color || "#1E3A5F";
        const secondaryColor = bk.secondary_color || "#D4AF37";
        const accentColor = bk.accent_color || "#E63946";
        const bgColor = bk.background_color || "#FFFFFF";
        const textColor = bk.text_color || "#111827";
        const fontHeading = bk.font_heading || "Inter";
        const fontBody = bk.font_body || "Inter";

        el.style.setProperty("--brand-primary", primaryColor);
        el.style.setProperty("--brand-secondary", secondaryColor);
        el.style.setProperty("--brand-accent", accentColor);
        el.style.setProperty("--brand-bg", bgColor);
        el.style.setProperty("--brand-text", textColor);
        el.style.setProperty("--brand-heading-font", `"${fontHeading}", sans-serif`);
        el.style.setProperty("--brand-body-font", `"${fontBody}", sans-serif`);

        // Load fonts synchronously if needed
        const linkId = "google-fonts-agency-head";
        let linkEl = document.getElementById(linkId) as HTMLLinkElement;
        if (!linkEl) {
          linkEl = document.createElement("link");
          linkEl.id = linkId;
          linkEl.rel = "stylesheet";
          document.head.appendChild(linkEl);
        }
        const headingFormatted = fontHeading.replace(/\s+/g, "+");
        const bodyFormatted = fontBody.replace(/\s+/g, "+");
        const fontUrl = `https://fonts.googleapis.com/css2?family=${headingFormatted}:wght@400;600;700;800&family=${bodyFormatted}:wght@400;500;700&display=swap`;
        if (linkEl.href !== fontUrl) linkEl.href = fontUrl;
      }
    } catch (e) {
      console.warn("Failed to load cached brand kit", e);
    }
  }

  const roleQuery = useQuery({
    queryKey: ["current-user-role", preloadedAgency?.id],
    enabled: !!preloadedAgency?.id,
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("agency_id", preloadedAgency.id)
        .eq("user_id", userData.user.id)
        .maybeSingle();
      return data?.role || null;
    },
  });

  const agencyQuery = useQuery({
    queryKey: ["current-agency-live", preloadedAgency?.id],
    enabled: !!preloadedAgency?.id,
    initialData: preloadedAgency,
    queryFn: async () => {
      const res = await supabase
        .from("agencies")
        .select(
          "id, slug, name, brand_color, brand_color_light, brand_color_fg, logo_url, status, module_names" as any,
        )
        .eq("id", preloadedAgency.id)
        .maybeSingle();

      let resultData = res.data;

      if (res.error && res.error.message.includes("module_names")) {
        const fallback = await supabase
          .from("agencies")
          .select(
            "id, slug, name, brand_color, brand_color_light, brand_color_fg, logo_url, status",
          )
          .eq("id", preloadedAgency.id)
          .maybeSingle();
        resultData = fallback.data as any;
      }
      return (resultData || preloadedAgency) as Agency;
    },
  });

  const brandKitQuery = useQuery({
    queryKey: ["current-agency-brand-kit", preloadedAgency?.id],
    enabled: !!preloadedAgency?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_kit")
        .select("*")
        .eq("agency_id", preloadedAgency.id)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    },
  });

  const companyProfileQuery = useQuery({
    queryKey: ["current-agency-company-profile", preloadedAgency?.id],
    enabled: !!preloadedAgency?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_profiles")
        .select("*")
        .eq("agency_id", preloadedAgency.id)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    },
  });

  const role = roleQuery.data || null;
  const isAgencyAdmin = role === "agency_admin" || role === "super_admin";
  const agency = agencyQuery.data || preloadedAgency;
  const brandKit = brandKitQuery.data || null;
  const companyProfile = companyProfileQuery.data || null;

  // Apply live brand color and typography tokens
  useEffect(() => {
    const el = document.documentElement;

    const applyStyling = (color: string | null, light: string | null, fg: string | null, bk: any) => {
      if (color) el.style.setProperty("--agency-brand", color);
      if (light) el.style.setProperty("--agency-brand-light", light);
      if (fg) el.style.setProperty("--agency-brand-fg", fg);

      if (bk) {
        const primaryColor = bk.primary_color || bk.brand_color || color || "#1E3A5F";
        const secondaryColor = bk.secondary_color || "#D4AF37";
        const accentColor = bk.accent_color || "#E63946";
        const bgColor = bk.background_color || "#FFFFFF";
        const textColor = bk.text_color || "#111827";
        const fontHeading = bk.font_heading || "Inter";
        const fontBody = bk.font_body || "Inter";

        el.style.setProperty("--brand-primary", primaryColor);
        el.style.setProperty("--brand-secondary", secondaryColor);
        el.style.setProperty("--brand-accent", accentColor);
        el.style.setProperty("--brand-bg", bgColor);
        el.style.setProperty("--brand-text", textColor);
        el.style.setProperty("--brand-heading-font", `"${fontHeading}", sans-serif`);
        el.style.setProperty("--brand-body-font", `"${fontBody}", sans-serif`);

        // Load fonts
        const linkId = "google-fonts-agency-head";
        let linkEl = document.getElementById(linkId) as HTMLLinkElement;
        if (!linkEl) {
          linkEl = document.createElement("link");
          linkEl.id = linkId;
          linkEl.rel = "stylesheet";
          document.head.appendChild(linkEl);
        }
        const headingFormatted = fontHeading.replace(/\s+/g, "+");
        const bodyFormatted = fontBody.replace(/\s+/g, "+");
        const fontUrl = `https://fonts.googleapis.com/css2?family=${headingFormatted}:wght@400;600;700;800&family=${bodyFormatted}:wght@400;500;700&display=swap`;
        if (linkEl.href !== fontUrl) linkEl.href = fontUrl;
      } else {
        const fallbackColor = color || "#1E3A5F";
        el.style.setProperty("--brand-primary", fallbackColor);
        el.style.setProperty("--brand-secondary", "#D4AF37");
        el.style.setProperty("--brand-accent", "#E63946");
        el.style.setProperty("--brand-bg", "#FFFFFF");
        el.style.setProperty("--brand-text", "#111827");
        el.style.setProperty("--brand-heading-font", `"Inter", sans-serif`);
        el.style.setProperty("--brand-body-font", `"Inter", sans-serif`);
      }
    };

    // Apply live brandKit or fallback
    applyStyling(
      agency?.brand_color || preloadedAgency?.brand_color,
      agency?.brand_color_light || preloadedAgency?.brand_color_light,
      agency?.brand_color_fg || preloadedAgency?.brand_color_fg,
      brandKit
    );

    // Save to cache when brandKit changes
    if (brandKit && preloadedAgency?.id) {
      try {
        localStorage.setItem(`brand-kit-${preloadedAgency.id}`, JSON.stringify(brandKit));
      } catch (e) {
        console.warn("Failed to cache brand kit", e);
      }
    }

    // Cleanup: when agency changes (e.g., user switches agency or logs out),
    // remove all brand CSS vars to prevent cross-tenant visual bleed.
    return () => {
      cleanupBrandKit(preloadedAgency?.id);
    };
  }, [agency, brandKit, preloadedAgency]);

  return (
    <AgencyContext.Provider
      value={{
        agency,
        loading:
          roleQuery.isLoading ||
          agencyQuery.isLoading ||
          brandKitQuery.isLoading ||
          companyProfileQuery.isLoading,
        error: null,
        refresh: () => {
          roleQuery.refetch();
          agencyQuery.refetch();
          brandKitQuery.refetch();
          companyProfileQuery.refetch();
        },
        role,
        isAgencyAdmin,
        brandKit,
        companyProfile,
      }}
    >
      {children}
    </AgencyContext.Provider>
  );
}

export const useAgency = () => useContext(AgencyContext);
