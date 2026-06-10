import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

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
};

const AgencyContext = createContext<Ctx>({
  agency: null,
  loading: false,
  error: null,
  refresh: () => {},
});

export function AgencyProvider({
  preloadedAgency,
  children,
}: {
  preloadedAgency: Agency;
  children: ReactNode;
}) {
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
      value={{ agency: preloadedAgency, loading: false, error: null, refresh: () => {} }}
    >
      {children}
    </AgencyContext.Provider>
  );
}

export const useAgency = () => useContext(AgencyContext);
