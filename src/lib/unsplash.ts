import { supabase } from "@/integrations/supabase/client";

export async function searchUnsplashPhoto(keyword: string): Promise<string | null> {
  try {
    // 1. Try VITE_UNSPLASH_ACCESS_KEY first (client-side)
    const accessKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY || import.meta.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || "";
    if (accessKey) {
      const res = await fetch(
        `https://api.unsplash.com/photos/random?query=${encodeURIComponent(keyword)}&orientation=landscape&client_id=${accessKey}`
      );
      if (res.ok) {
        const photo = await res.json();
        return photo.urls.regular;
      }
    }

    // 2. Fallback to edge function if client-side key isn't present
    const { data, error } = await supabase.functions.invoke("search-unsplash", {
      body: { query: keyword, per_page: 1 }
    });
    if (!error && data?.photos && data.photos.length > 0) {
      return data.photos[0].url_regular;
    }
  } catch (err) {
    console.error("Error searching Unsplash photo:", err);
  }
  return null;
}
