import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BrandInfo {
  platform_name: string;
  platform_short_name: string;
  logo_url: string;
  favicon_url: string;
  primary_color_token: string;
  support_email: string;
  legal_entity_name: string;
}

export function useBrand() {
  return useQuery({
    queryKey: ["platform_branding"],
    queryFn: async () => {
      const { data, error } = await supabase.from('platform_branding' as any)
        .select("*")
        .single();
      
      if (error) {
        console.error("Error fetching brand info", error);
        return {
          platform_name: "Turis",
          platform_short_name: "Turis OS",
          logo_url: "/logo.svg",
          favicon_url: "/favicon.ico",
          primary_color_token: "#3D6FF2",
          support_email: "suporte@turis.com",
          legal_entity_name: "Turis Tecnologia Ltda"
        } as BrandInfo;
      }
      
      return data as unknown as BrandInfo;
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}
