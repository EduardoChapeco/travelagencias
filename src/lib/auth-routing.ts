import { supabase } from "@/integrations/supabase/client";

export type SignedInAgency = {
  id: string;
  slug: string;
};

async function loadAgencyById(agencyId: string | null | undefined): Promise<SignedInAgency | null> {
  if (!agencyId) return null;

  const { data, error } = await supabase
    .from("agencies")
    .select("id, slug")
    .eq("id", agencyId)
    .maybeSingle();

  if (error) throw error;
  return data?.slug ? data : null;
}

export async function resolveSignedInAgency(userId?: string): Promise<SignedInAgency | null> {
  const { data: defaultAgencyId, error: defaultAgencyError } =
    await supabase.rpc("get_my_agency_id");

  if (!defaultAgencyError) {
    const defaultAgency = await loadAgencyById(defaultAgencyId);
    if (defaultAgency) return defaultAgency;
  }

  if (!userId) return null;

  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("agency_id")
    .eq("user_id", userId)
    .not("agency_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(1);

  if (rolesError) throw rolesError;
  return loadAgencyById(roles?.[0]?.agency_id);
}
