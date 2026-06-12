import { supabase } from "@/integrations/supabase/client";

export async function uploadProposalMedia(
  agencyId: string,
  proposalId: string,
  file: File,
  slot: "cover" | "map" | "agent_photo" | "hotel" | "tour",
  itemId?: string, // for hotels or tours specific ids
): Promise<string> {
  const extension = file.name.split(".").pop();
  const filename = itemId ? `${slot}_${itemId}.${extension}` : `${slot}_${Date.now()}.${extension}`;

  const path = `${agencyId}/proposals/${proposalId}/${filename}`;

  const { data, error } = await supabase.storage.from("agency-media").upload(path, file, {
    upsert: true,
    cacheControl: "3600",
  });

  if (error) throw error;

  const { data: publicUrlData } = supabase.storage.from("agency-media").getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}

export async function saveUnsplashImageToStorage(
  agencyId: string,
  proposalId: string,
  slot: "cover" | "map" | "hotel" | "tour",
  unsplashUrl: string,
  itemId?: string,
): Promise<string> {
  try {
    // 1. Fetch the image blob from Unsplash
    const response = await fetch(unsplashUrl);
    if (!response.ok) throw new Error("Failed to fetch image from Unsplash");
    const blob = await response.blob();
    const file = new File([blob], `unsplash_${Date.now()}.jpg`, { type: blob.type });

    // 2. Upload using existing helper
    return await uploadProposalMedia(agencyId, proposalId, file, slot, itemId);
  } catch (error) {
    console.error("Error saving Unsplash image to storage:", error);
    throw new Error("Erro ao salvar a imagem do Unsplash no storage.");
  }
}
