import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

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

  // Apply runtime brand color and typography tokens
  useEffect(() => {
    const el = document.documentElement;
    if (agency?.brand_color) el.style.setProperty("--agency-brand", agency.brand_color);
    if (agency?.brand_color_light)
      el.style.setProperty("--agency-brand-light", agency.brand_color_light);
    if (agency?.brand_color_fg) el.style.setProperty("--agency-brand-fg", agency.brand_color_fg);

    // Dynamic Visual Identity from brand_kit
    if (brandKit) {
      const primaryColor = brandKit.primary_color || brandKit.brand_color || agency?.brand_color || "#1E3A5F";
      const secondaryColor = brandKit.secondary_color || "#D4AF37";
      const accentColor = brandKit.accent_color || "#E63946";
      const bgColor = brandKit.background_color || "#FFFFFF";
      const textColor = brandKit.text_color || "#111827";
      const fontHeading = brandKit.font_heading || "Inter";
      const fontBody = brandKit.font_body || "Inter";

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
      linkEl.href = `https://fonts.googleapis.com/css2?family=${headingFormatted}:wght@400;600;700;800&family=${bodyFormatted}:wght@400;500;700&display=swap`;
    } else {
      // Fallback defaults
      const fallbackColor = agency?.brand_color || "#1E3A5F";
      el.style.setProperty("--brand-primary", fallbackColor);
      el.style.setProperty("--brand-secondary", "#D4AF37");
      el.style.setProperty("--brand-accent", "#E63946");
      el.style.setProperty("--brand-bg", "#FFFFFF");
      el.style.setProperty("--brand-text", "#111827");
      el.style.setProperty("--brand-heading-font", `"Inter", sans-serif`);
      el.style.setProperty("--brand-body-font", `"Inter", sans-serif`);
    }

    return () => {
      el.style.removeProperty("--agency-brand");
      el.style.removeProperty("--agency-brand-light");
      el.style.removeProperty("--agency-brand-fg");
      el.style.removeProperty("--brand-primary");
      el.style.removeProperty("--brand-secondary");
      el.style.removeProperty("--brand-accent");
      el.style.removeProperty("--brand-bg");
      el.style.removeProperty("--brand-text");
      el.style.removeProperty("--brand-heading-font");
      el.style.removeProperty("--brand-body-font");
      const linkEl = document.getElementById("google-fonts-agency-head");
      if (linkEl) linkEl.remove();
    };
  }, [agency, brandKit]);

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
