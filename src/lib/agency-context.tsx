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

  const role = roleQuery.data || null;
  const isAgencyAdmin = role === "agency_admin" || role === "super_admin";

  // Apply runtime brand color tokens
  useEffect(() => {
    const el = document.documentElement;
    if (preloadedAgency?.brand_color)
      el.style.setProperty("--agency-brand", preloadedAgency.brand_color);
    if (preloadedAgency?.brand_color_light)
      el.style.setProperty("--agency-brand-light", preloadedAgency.brand_color_light);
    if (preloadedAgency?.brand_color_fg)
      el.style.setProperty("--agency-brand-fg", preloadedAgency.brand_color_fg);
    return () => {
      el.style.removeProperty("--agency-brand");
      el.style.removeProperty("--agency-brand-light");
      el.style.removeProperty("--agency-brand-fg");
    };
  }, [preloadedAgency]);

  return (
    <AgencyContext.Provider
      value={{
        agency: preloadedAgency,
        loading: roleQuery.isLoading,
        error: null,
        refresh: () => {},
        role,
        isAgencyAdmin,
      }}
    >
      {children}
    </AgencyContext.Provider>
  );
}

export const useAgency = () => useContext(AgencyContext);
