import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

type Ctx = {
  agency: Agency | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  role: string | null;
  isAgencyAdmin: boolean;
};

const AgencyContext = createContext<Ctx>({
  agency: null,
  loading: false,
  error: null,
  refresh: () => {},
  role: null,
  isAgencyAdmin: false,
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

  const role = roleQuery.data || null;
  const isAgencyAdmin = role === "agency_admin" || role === "super_admin";
  const agency = agencyQuery.data || preloadedAgency;

  // Apply runtime brand color tokens
  useEffect(() => {
    const el = document.documentElement;
    if (agency?.brand_color) el.style.setProperty("--agency-brand", agency.brand_color);
    if (agency?.brand_color_light)
      el.style.setProperty("--agency-brand-light", agency.brand_color_light);
    if (agency?.brand_color_fg) el.style.setProperty("--agency-brand-fg", agency.brand_color_fg);
    return () => {
      el.style.removeProperty("--agency-brand");
      el.style.removeProperty("--agency-brand-light");
      el.style.removeProperty("--agency-brand-fg");
    };
  }, [agency]);

  return (
    <AgencyContext.Provider
      value={{
        agency,
        loading: roleQuery.isLoading || agencyQuery.isLoading,
        error: null,
        refresh: () => {
          roleQuery.refetch();
          agencyQuery.refetch();
        },
        role,
        isAgencyAdmin,
      }}
    >
      {children}
    </AgencyContext.Provider>
  );
}

export const useAgency = () => useContext(AgencyContext);
