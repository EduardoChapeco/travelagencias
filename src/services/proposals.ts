import { supabase } from "@/integrations/supabase/client";

export type Flight = {
  id: string;
  origin: string;
  destination: string;
  date: string;
  departure_time: string;
  arrival_time: string;
  airline: string;
  flight_number: string;
  stops: number;
  baggage_rules: string;
  price: number;
};
export type HotelRoom = { type: string; qty: number };
export type Hotel = {
  id: string;
  name: string;
  city: string;
  checkin: string;
  checkout: string;
  meal_plan: string;
  rooms: HotelRoom[];
  images: string[];
  price: number;
};
export type Transfer = {
  id: string;
  description: string;
  date: string;
  type: "private" | "shared";
  vehicle: string;
  price: number;
  notes: string;
};
export type Tour = {
  id: string;
  description: string;
  date: string;
  price: number;
  image_url: string;
  notes: string;
};
export type ItineraryDay = { id: string; day: string; title: string; description: string };

export type Proposal = {
  id: string;
  number: number;
  title: string;
  status: string;
  destination: string | null;
  travel_start: string | null;
  travel_end: string | null;
  pax_adults: number;
  pax_seniors: number;
  pax_children: number;
  pax_infants: number;
  currency: string;
  subtotal: number;
  discount: number;
  total: number;
  valid_until: string | null;
  notes: string | null;
  terms: string | null;
  public_token: string;
  agency_id: string;
  flights: Flight[];
  hotels: Hotel[];
  transfers: Transfer[];
  tours: Tour[];
  itinerary: ItineraryDay[];
  includes: string[];
  excludes: string[];
  pix_discount_percent: number;
  installments_card: number;
  installments_boleto: number;
  template: string;
};

export async function fetchProposal(id: string): Promise<Proposal | null> {
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Proposal | null;
}

export async function updateProposal(id: string, patch: Partial<Proposal>) {
  const { error } = await supabase
    .from("proposals")
    .update(patch as never)
    .eq("id", id);
  if (error) throw error;
}

export async function processOcrFile(file: File) {
  return new Promise<{ flights?: Flight[], hotels?: Hotel[], transfers?: Transfer[], tours?: Tour[] }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        const { data, error } = await supabase.functions.invoke("ai-voucher-ocr", {
          body: { file_base64: base64, mime: file.type, file_name: file.name },
        });
        if (error) throw error;
        resolve(data ?? {});
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

export async function refineItineraryText(title: string, description: string): Promise<{ title: string, description: string }> {
  const { data, error } = await supabase.functions.invoke("ai-orchestrator", {
    body: {
      action: "completion",
      prompt: `Melhore este trecho de roteiro de viagem. Torne mais atrativo, luxuoso e vendedor.\n\nTítulo: ${title}\nDescrição: ${description}\n\nRetorne EXATAMENTE um JSON com as chaves "title" e "description". Sem markdown.`,
      systemPrompt: "Você é um copywriter de turismo premium. Retorne apenas JSON.",
      modelPreference: "smart"
    }
  });
  if (error) throw error;
  const text = data?.result || "";
  const match = text.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(match ? match[0] : text);
  return { title: parsed.title || title, description: parsed.description || description };
}
