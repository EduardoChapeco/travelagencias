import { supabase } from "@/integrations/supabase/client";
import { type PortalBlock } from "@/lib/cms-types";

export type PortalPage = {
  id: string;
  agency_id: string;
  slug: string;
  title: string;
  is_published: boolean;
  template: string | null;
  blocks: PortalBlock[];
  seo: {
    meta_title?: string;
    meta_description?: string;
    fb_pixel_id?: string | null;
    google_analytics_id?: string | null;
    custom_scripts?: string | null;
  } | null;
  description?: string | null;
  cover_image_url?: string | null;
  category?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

export async function fetchPortalPagesList(agencyId: string): Promise<PortalPage[]> {
  const { data, error } = await supabase
    .from("portal_pages")
    .select("id, slug, title, is_published, template, blocks, seo")
    .eq("agency_id", agencyId)
    .order("created_at");

  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}

export async function deletePortalPage(id: string): Promise<void> {
  const { error } = await supabase.from("portal_pages").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export {
  fetchPortalPage,
  fetchPortalPageVersions,
  savePortalPageDraft,
  publishPortalPage,
} from "./portal";
