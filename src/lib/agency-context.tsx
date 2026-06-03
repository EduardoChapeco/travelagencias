import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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
};

const AgencyContext = createContext<Ctx>({
  agency: null,
  loading: true,
  error: null,
  refresh: () => {},
});

export function AgencyProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);
    supabase
      .from("agencies")
      .select("id, slug, name, brand_color, brand_color_light, brand_color_fg, logo_url")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancel) return;
        if (error) setError(error.message);
        setAgency(data ?? null);
        setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [slug, tick]);

  // Apply runtime brand color tokens
  useEffect(() => {
    const el = document.documentElement;
    if (agency?.brand_color) el.style.setProperty("--agency-brand", agency.brand_color);
    if (agency?.brand_color_light)
      el.style.setProperty("--agency-brand-light", agency.brand_color_light);
    if (agency?.brand_color_fg)
      el.style.setProperty("--agency-brand-fg", agency.brand_color_fg);
    return () => {
      el.style.removeProperty("--agency-brand");
      el.style.removeProperty("--agency-brand-light");
      el.style.removeProperty("--agency-brand-fg");
    };
  }, [agency]);

  return (
    <AgencyContext.Provider value={{ agency, loading, error, refresh: () => setTick((t) => t + 1) }}>
      {children}
    </AgencyContext.Provider>
  );
}

export const useAgency = () => useContext(AgencyContext);
