import { supabase } from "@/integrations/supabase/client";
import { PortalPagePayloadSchema } from "@/lib/cms-schemas";
import { PortalBlock } from "@/lib/cms-types";

export type PageRow = {
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
  };
  created_at?: string;
};

export type PageVersionRow = {
  id: string;
  page_id: string;
  title: string;
  slug: string | null;
  template: string | null;
  blocks: PortalBlock[];
  seo: any;
  created_at: string;
};

export async function fetchPortalPage(pageId: string): Promise<PageRow> {
  const { data, error } = await supabase.from("portal_pages").select("*").eq("id", pageId).single();
  if (error) throw new Error(error.message);
  return data as unknown as PageRow;
}

export async function fetchPortalPageVersions(pageId: string): Promise<PageVersionRow[]> {
  const { data, error } = await (supabase as any)
    .from("portal_page_versions")
    .select("*")
    .eq("page_id", pageId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as PageVersionRow[];
}

export async function savePortalPageDraft(
  agencyId: string,
  pageId: string | null,
  isNew: boolean,
  title: string,
  slug: string,
  template: string,
  blocks: PortalBlock[],
  seo: {
    meta_title?: string | null;
    meta_description?: string | null;
    fb_pixel_id?: string | null;
    google_analytics_id?: string | null;
    custom_scripts?: string | null;
  },
): Promise<string> {
  if (!title) throw new Error("O título é obrigatório");
  if (blocks.length > 50) {
    throw new Error(
      "A página não pode exceder 50 blocos (proteção de segurança / render bombing). Divida o conteúdo em sub-páginas.",
    );
  }

  const payload = {
    agency_id: agencyId,
    title,
    slug,
    template,
    blocks: blocks as any,
    seo,
  };

  const validation = PortalPagePayloadSchema.safeParse(payload);
  if (!validation.success) {
    const errorMsg = validation.error.errors
      .map((e) => `${e.path.join(" -> ")}: ${e.message}`)
      .join(" | ");
    throw new Error(`Validação falhou: ${errorMsg}`);
  }

  let finalPageId = isNew ? null : pageId;

  if (!isNew && finalPageId) {
    const { error } = await supabase
      .from("portal_pages")
      .update(payload as any)
      .eq("id", finalPageId);
    if (error) throw new Error(error.message);
  } else {
    const { data: newPage, error } = await supabase
      .from("portal_pages")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    finalPageId = newPage?.id;
  }

  if (!finalPageId) {
    throw new Error("Falha ao recuperar o ID da página salva");
  }

  return finalPageId;
}

export async function publishPortalPage(pageId: string): Promise<void> {
  const { error } = await (supabase as any).rpc("publish_portal_page", { p_page_id: pageId });
  if (error) throw new Error(error.message);
}

export async function revertPortalPageVersion(pageId: string, versionId: string): Promise<void> {
  const { error } = await (supabase as any).rpc("revert_portal_page", {
    p_page_id: pageId,
    p_version_id: versionId,
  });
  if (error) throw new Error(error.message);
}
